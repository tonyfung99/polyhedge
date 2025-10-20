import { StrategyPurchasedEvent, StrategyDefinition } from '../types.js';
import { AppConfig } from '../config/env.js';
import { PolymarketOrderIntent } from '../types.js';
import { createLogger } from '../utils/logger.js';
import { PolymarketClient } from '../polymarket/client.js';

const log = createLogger('strategy-executor');

export class StrategyPurchaseExecutor {
    private readonly config: AppConfig;
    private readonly polymarket: PolymarketClient;

    constructor(config: AppConfig) {
        this.config = config;
        this.polymarket = new PolymarketClient(config);
    }

    async handleStrategyPurchase(event: StrategyPurchasedEvent) {
        const strategy = this.config.strategies.get(event.strategyId);
        if (!strategy) {
            log.warn('No strategy definition found for purchased event', {
                strategyId: event.strategyId.toString(),
            });
            return;
        }

        log.debug('Executing strategy purchase', {
            strategyId: event.strategyId.toString(),
            netAmount: event.netAmount.toString(),
            user: event.user,
        });

        const intents = this.buildPolymarketOrderIntents(strategy, event.netAmount);

        for (const intent of intents) {
            try {
                await this.polymarket.executeOrder(intent);
            } catch (error) {
                log.error('Polymarket order execution failed', {
                    error: (error as Error).message,
                    tokenId: intent.tokenId,
                });
                throw error;
            }
        }
    }

    private buildPolymarketOrderIntents(strategy: StrategyDefinition, netAmount: bigint): PolymarketOrderIntent[] {
        const intents: PolymarketOrderIntent[] = [];

        for (const order of strategy.polymarketOrders) {
            if (order.notionalBps === 0) continue;

            const quoteAmount = (netAmount * BigInt(order.notionalBps)) / 10_000n;

            intents.push({
                tokenId: order.marketId,
                side: order.isYes ? 'BUY' : 'SELL',
                quoteAmount,
                limitPriceBps: order.maxPriceBps,
                maxPriceBps: order.maxPriceBps,
            });
        }

        return intents;
    }
}
