import { AppConfig } from '../config/env.js';
import { PolymarketClient } from '../polymarket/client.js';
import { createLogger } from '../utils/logger.js';
import { ClosePositionRequest, SettlementResult, PolymarketPosition } from '../types.js';
import { Contract, Wallet, JsonRpcProvider } from 'ethers';

const log = createLogger('position-closer');

// StrategyManager ABI (minimal - just what we need)
const STRATEGY_MANAGER_ABI = [
    'function settleStrategy(uint256 strategyId, uint256 payoutPerUSDC) external',
    'function strategies(uint256) view returns (uint256 id, string name, uint256 feeBps, uint256 maturityTs, bool active, bool settled, uint256 payoutPerUSDC)',
];

export class PositionCloser {
    private readonly config: AppConfig;
    private readonly polymarket: PolymarketClient;
    private readonly contract: Contract;
    private readonly wallet: Wallet;

    constructor(config: AppConfig) {
        this.config = config;
        this.polymarket = new PolymarketClient(config);

        // Setup contract interaction
        const provider = new JsonRpcProvider(config.arbitrumRpcUrl);
        this.wallet = new Wallet(config.polymarketPrivateKey, provider);

        // We need the strategy manager address from config
        const strategyManagerAddress = process.env.STRATEGY_MANAGER_ADDRESS || '';
        this.contract = new Contract(strategyManagerAddress, STRATEGY_MANAGER_ABI, this.wallet);
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

        // 2. Check if strategy is mature (can be closed)
        const strategyData = await this.contract.strategies(strategyId);
        const maturityTs = Number(strategyData[3]);
        const settled = strategyData[5];

        if (settled) {
            throw new Error(`Strategy ${strategyId} already settled`);
        }

        if (Date.now() / 1000 < maturityTs) {
            log.warn('Closing position before maturity', {
                strategyId: strategyId.toString(),
                maturityTs,
                currentTs: Math.floor(Date.now() / 1000),
            });
        }

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
                totalPayout += BigInt(Math.floor(position.size * 1_000_000));

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

        // 4. Calculate payout per USDC (6 decimals)
        // This is simplified - in production you'd track total invested amount
        // For now, assume we track it or calculate from events
        const totalInvested = await this.getTotalInvested(strategyId);
        const payoutPerUSDC = totalInvested > 0n
            ? (totalPayout * 1_000_000n) / totalInvested
            : 1_000_000n; // Default to 1:1 if no data

        log.info('Calculated settlement', {
            strategyId: strategyId.toString(),
            totalPayout: totalPayout.toString(),
            totalInvested: totalInvested.toString(),
            payoutPerUSDC: payoutPerUSDC.toString(),
        });

        // 5. Call contract to settle
        const tx = await this.contract.settleStrategy(strategyId, payoutPerUSDC);
        const receipt = await tx.wait();

        log.info('Strategy settled on-chain', {
            strategyId: strategyId.toString(),
            transactionHash: receipt.hash,
            payoutPerUSDC: payoutPerUSDC.toString(),
        });

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
        return 1_000_000n * 1_000_000n; // 1M USDC
    }
}

