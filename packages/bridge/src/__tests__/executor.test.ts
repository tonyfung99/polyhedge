import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StrategyPurchaseExecutor } from '../services/executor.js';
import { AppConfig } from '../config/env.js';
import { StrategyPurchasedEvent } from '../types.js';
import { PolymarketClient } from '../polymarket/client.js';

// Mock the Polymarket client
vi.mock('../polymarket/client.js', () => ({
    PolymarketClient: vi.fn().mockImplementation(() => ({
        executeOrder: vi.fn().mockResolvedValue(undefined),
    })),
}));

describe('StrategyPurchaseExecutor', () => {
    let executor: StrategyPurchaseExecutor;
    let mockConfig: AppConfig;
    let mockPolymarketClient: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockConfig = {
            strategies: new Map([
                [
                    1n,
                    {
                        id: 1n,
                        name: 'Test Strategy',
                        polymarketOrders: [
                            {
                                marketId: 'market-1',
                                isYes: true,
                                priority: 1,
                                notionalBps: 5000, // 50%
                                maxPriceBps: 7500, // 75%
                            },
                            {
                                marketId: 'market-2',
                                isYes: false,
                                priority: 2,
                                notionalBps: 5000, // 50%
                                maxPriceBps: 6000, // 60%
                            },
                        ],
                        totalNotionalBps: 10000,
                    },
                ],
                [
                    2n,
                    {
                        id: 2n,
                        name: 'Single Market Strategy',
                        polymarketOrders: [
                            {
                                marketId: 'market-3',
                                isYes: true,
                                priority: 1,
                                notionalBps: 10000, // 100%
                                maxPriceBps: 8000, // 80%
                            },
                        ],
                        totalNotionalBps: 10000,
                    },
                ],
            ]),
        } as AppConfig;

        executor = new StrategyPurchaseExecutor(mockConfig);

        // Get the mock Polymarket client instance
        const PolymarketClientMock = PolymarketClient as any;
        mockPolymarketClient =
            PolymarketClientMock.mock.results[PolymarketClientMock.mock.results.length - 1].value;
    });

    describe('handleStrategyPurchase', () => {
        it('should execute all orders for a strategy', async () => {
            const event: StrategyPurchasedEvent = {
                strategyId: 1n,
                user: '0x1234567890123456789012345678901234567890',
                grossAmount: 1000000n,
                netAmount: 1000000n, // 1 USDC
                blockNumber: 12345,
            };

            await executor.handleStrategyPurchase(event);

            // Should execute 2 orders (50% + 50%)
            expect(mockPolymarketClient.executeOrder).toHaveBeenCalledTimes(2);
        });

        it('should calculate notional amounts correctly', async () => {
            const event: StrategyPurchasedEvent = {
                strategyId: 1n,
                user: '0x1234567890123456789012345678901234567890',
                grossAmount: 1000000n,
                netAmount: 1000000n, // 1 USDC
                blockNumber: 12345,
            };

            await executor.handleStrategyPurchase(event);

            // First order: 50% of 1 USDC = 0.5 USDC = 500000
            expect(mockPolymarketClient.executeOrder).toHaveBeenCalledWith(
                expect.objectContaining({
                    tokenId: 'market-1',
                    side: 'BUY',
                    quoteAmount: 500000n,
                    limitPriceBps: 7500,
                }),
            );

            // Second order: 50% of 1 USDC = 0.5 USDC = 500000
            expect(mockPolymarketClient.executeOrder).toHaveBeenCalledWith(
                expect.objectContaining({
                    tokenId: 'market-2',
                    side: 'SELL',
                    quoteAmount: 500000n,
                    limitPriceBps: 6000,
                }),
            );
        });

        it('should handle large purchase amounts', async () => {
            const event: StrategyPurchasedEvent = {
                strategyId: 2n,
                user: '0x1234567890123456789012345678901234567890',
                grossAmount: 10000000000n,
                netAmount: 10000000000n, // 10,000 USDC
                blockNumber: 12345,
            };

            await executor.handleStrategyPurchase(event);

            // 100% of 10,000 USDC = 10,000 USDC
            expect(mockPolymarketClient.executeOrder).toHaveBeenCalledWith(
                expect.objectContaining({
                    quoteAmount: 10000000000n,
                }),
            );
        });

        it('should handle fractional allocations', async () => {
            // Strategy with 33.33% / 33.33% / 33.34% split
            mockConfig.strategies.set(3n, {
                id: 3n,
                name: 'Three-Way Split',
                polymarketOrders: [
                    {
                        marketId: 'market-4',
                        isYes: true,
                        priority: 1,
                        notionalBps: 3333,
                        maxPriceBps: 7000,
                    },
                    {
                        marketId: 'market-5',
                        isYes: true,
                        priority: 2,
                        notionalBps: 3333,
                        maxPriceBps: 7000,
                    },
                    {
                        marketId: 'market-6',
                        isYes: false,
                        priority: 3,
                        notionalBps: 3334,
                        maxPriceBps: 7000,
                    },
                ],
                totalNotionalBps: 10000,
            });

            const event: StrategyPurchasedEvent = {
                strategyId: 3n,
                user: '0x1234567890123456789012345678901234567890',
                grossAmount: 1000000n,
                netAmount: 1000000n, // 1 USDC
                blockNumber: 12345,
            };

            await executor.handleStrategyPurchase(event);

            expect(mockPolymarketClient.executeOrder).toHaveBeenCalledTimes(3);

            // First two orders: 33.33% each
            expect(mockPolymarketClient.executeOrder).toHaveBeenCalledWith(
                expect.objectContaining({
                    quoteAmount: 333300n, // 0.3333 USDC
                }),
            );

            // Last order: 33.34%
            expect(mockPolymarketClient.executeOrder).toHaveBeenCalledWith(
                expect.objectContaining({
                    quoteAmount: 333400n, // 0.3334 USDC
                }),
            );
        });

        it('should skip orders with zero notional', async () => {
            mockConfig.strategies.set(4n, {
                id: 4n,
                name: 'Strategy with Zero',
                polymarketOrders: [
                    {
                        marketId: 'market-7',
                        isYes: true,
                        priority: 1,
                        notionalBps: 0, // Skip this
                        maxPriceBps: 7000,
                    },
                    {
                        marketId: 'market-8',
                        isYes: true,
                        priority: 2,
                        notionalBps: 10000, // Only execute this
                        maxPriceBps: 7000,
                    },
                ],
                totalNotionalBps: 10000,
            });

            const event: StrategyPurchasedEvent = {
                strategyId: 4n,
                user: '0x1234567890123456789012345678901234567890',
                grossAmount: 1000000n,
                netAmount: 1000000n,
                blockNumber: 12345,
            };

            await executor.handleStrategyPurchase(event);

            // Should only execute 1 order
            expect(mockPolymarketClient.executeOrder).toHaveBeenCalledTimes(1);
            expect(mockPolymarketClient.executeOrder).toHaveBeenCalledWith(
                expect.objectContaining({
                    tokenId: 'market-8',
                }),
            );
        });

        it('should handle unknown strategy ID', async () => {
            const event: StrategyPurchasedEvent = {
                strategyId: 999n, // Non-existent
                user: '0x1234567890123456789012345678901234567890',
                grossAmount: 1000000n,
                netAmount: 1000000n,
                blockNumber: 12345,
            };

            // Should not throw, just log warning
            await expect(executor.handleStrategyPurchase(event)).resolves.toBeUndefined();

            // Should not execute any orders
            expect(mockPolymarketClient.executeOrder).not.toHaveBeenCalled();
        });

        it('should map isYes correctly to BUY/SELL', async () => {
            const event: StrategyPurchasedEvent = {
                strategyId: 1n,
                user: '0x1234567890123456789012345678901234567890',
                grossAmount: 1000000n,
                netAmount: 1000000n,
                blockNumber: 12345,
            };

            await executor.handleStrategyPurchase(event);

            // First order: isYes=true should be BUY
            expect(mockPolymarketClient.executeOrder).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({
                    side: 'BUY',
                }),
            );

            // Second order: isYes=false should be SELL
            expect(mockPolymarketClient.executeOrder).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    side: 'SELL',
                }),
            );
        });

        it('should propagate order execution errors', async () => {
            mockPolymarketClient.executeOrder.mockRejectedValue(
                new Error('Order execution failed'),
            );

            const event: StrategyPurchasedEvent = {
                strategyId: 1n,
                user: '0x1234567890123456789012345678901234567890',
                grossAmount: 1000000n,
                netAmount: 1000000n,
                blockNumber: 12345,
            };

            await expect(executor.handleStrategyPurchase(event)).rejects.toThrow(
                'Order execution failed',
            );
        });

        it('should stop execution on first order failure', async () => {
            mockPolymarketClient.executeOrder
                .mockRejectedValueOnce(new Error('First order failed'))
                .mockResolvedValueOnce(undefined);

            const event: StrategyPurchasedEvent = {
                strategyId: 1n,
                user: '0x1234567890123456789012345678901234567890',
                grossAmount: 1000000n,
                netAmount: 1000000n,
                blockNumber: 12345,
            };

            await expect(executor.handleStrategyPurchase(event)).rejects.toThrow(
                'First order failed',
            );

            // Should only attempt first order
            expect(mockPolymarketClient.executeOrder).toHaveBeenCalledTimes(1);
        });
    });
});

