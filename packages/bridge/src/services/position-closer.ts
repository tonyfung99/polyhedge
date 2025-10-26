import { AppConfig } from '../config/env.js';
import { PolymarketClient } from '../polymarket/client.js';
import { createLogger } from '../utils/logger.js';
import { ClosePositionRequest, SettlementResult, PolymarketPosition } from '../types.js';
import { Contract, Wallet, JsonRpcProvider } from 'ethers';
import { parseUnits } from 'viem';

const log = createLogger('position-closer');

// HedgeExecutor ABI (minimal - just what we need)
const HEDGE_EXECUTOR_ABI = [
    'function closeHedgeOrder(uint256 strategyId, int256 realizedPnL) external',
    'function getHedgeOrder(uint256 strategyId) view returns (uint256 strategyId, address user, string asset, bool isLong, uint256 amount, uint256 maxSlippageBps, bool executed, bytes32 gmxOrderKey)',
    'function isOrderExecuted(uint256 strategyId) view returns (bool)',
];

export class PositionCloser {
    private readonly config: AppConfig;
    private readonly polymarket: PolymarketClient;
    private readonly contract: Contract;
    private readonly wallet: Wallet;

    constructor(config: AppConfig) {
        this.config = config;
        this.polymarket = new PolymarketClient(config);

        // Setup contract interaction on Arbitrum (where HedgeExecutor is deployed)
        const provider = new JsonRpcProvider(config.arbitrumRpcUrl);
        this.wallet = new Wallet(config.polymarketPrivateKey!, provider);

        // Get HedgeExecutor contract address from environment
        const hedgeExecutorAddress = process.env.HEDGE_EXECUTOR_ADDRESS || process.env.STRATEGY_MANAGER_ADDRESS || '';
        this.contract = new Contract(hedgeExecutorAddress, HEDGE_EXECUTOR_ABI, this.wallet);
    }

    async closePosition(request: ClosePositionRequest): Promise<SettlementResult> {
        const { strategyId } = request;

        log.info('Starting position close', {
            strategyId: strategyId.toString(),
            reason: request.reason,
        });

        // 1. Get strategy definition
        const strategy = this.config.strategies.get(strategyId);
        if (!strategy) {
            throw new Error(`Strategy ${strategyId} not found`);
        }

        // 2. Check if hedge order exists and is executed
        const hedgeOrder = await this.contract.getHedgeOrder(strategyId);
        const isExecuted = await this.contract.isOrderExecuted(strategyId);

        if (!isExecuted) {
            throw new Error(`Hedge order ${strategyId} not executed yet`);
        }

        log.info('Hedge order found', {
            strategyId: strategyId.toString(),
            asset: hedgeOrder.asset,
            isLong: hedgeOrder.isLong,
            amount: hedgeOrder.amount.toString(),
        });

        // 3. Close all Polymarket positions (sell them)
        const positions: PolymarketPosition[] = [];
        let totalPayout = 0n;

        for (const order of strategy.polymarketOrders) {
            try {
                const position = await this.polymarket.closePosition({
                    tokenId: order.marketId,
                    side: order.isYes ? 'YES' : 'NO',
                });

                positions.push(position);
                // Convert position payout to USDC (6 decimals)
                totalPayout += parseUnits(position.size.toString(), 6);

                log.info('Closed Polymarket position', {
                    tokenId: order.marketId,
                    side: position.side,
                    size: position.size,
                });
            } catch (error) {
                log.error('Failed to close Polymarket position', {
                    error: (error as Error).message,
                    tokenId: order.marketId,
                });
                throw error;
            }
        }

        // 4. Calculate realized PnL from Polymarket positions
        // PnL = Total payout - Initial investment
        const initialInvestment = BigInt(hedgeOrder.amount.toString());
        const realizedPnL = BigInt(totalPayout) - initialInvestment;

        log.info('Calculated PnL', {
            strategyId: strategyId.toString(),
            totalPayout: totalPayout.toString(),
            initialInvestment: initialInvestment.toString(),
            realizedPnL: realizedPnL.toString(),
        });

        // 5. Call HedgeExecutor to close the hedge order
        // Convert to int256 for Solidity
        const tx = await this.contract.closeHedgeOrder(strategyId, realizedPnL);
        const receipt = await tx.wait();

        log.info('Hedge order closed on-chain', {
            strategyId: strategyId.toString(),
            transactionHash: receipt.hash,
            realizedPnL: realizedPnL.toString(),
        });

        // For compatibility, calculate payoutPerUSDC
        const totalInvested = await this.getTotalInvested(strategyId);
        const payoutPerUSDC = totalInvested > 0n
            ? (totalPayout * parseUnits('1', 6)) / totalInvested
            : parseUnits('1', 6); // 1.0 = 100% payout

        return {
            strategyId,
            totalPayout,
            payoutPerUSDC,
            polymarketPositions: positions,
            transactionHash: receipt.hash,
        };
    }

    /**
     * Get total invested amount for a strategy
     * In production, this should query the contract or track via events
     */
    private async getTotalInvested(strategyId: bigint): Promise<bigint> {
        // TODO: Implement proper tracking of total invested amount
        // Options:
        // 1. Query StrategyPurchased events and sum netAmount
        // 2. Add to contract state
        // 3. Maintain in database

        // For MVP, return 1 million USDC as placeholder
        log.warn('Using placeholder total invested amount', {
            strategyId: strategyId.toString(),
        });
        return parseUnits('1000000', 6); // 1M USDC
    }
}

