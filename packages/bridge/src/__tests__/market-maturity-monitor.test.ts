import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MarketMaturityMonitor } from '../workers/market-maturity-monitor.js';
import { AppConfig } from '../config/env.js';
import { PositionCloser } from '../services/position-closer.js';

// Mock dependencies
vi.mock('../services/position-closer.js');
vi.mock('../utils/logger.js', () => ({
    createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    }),
}));

describe('MarketMaturityMonitor', () => {
    let monitor: MarketMaturityMonitor;
    let mockConfig: AppConfig;
    let mockPositionCloser: any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        mockConfig = {
            arbitrumRpcUrl: 'https://arb1.arbitrum.io/rpc',
            polygonRpcUrl: 'https://polygon-rpc.com',
            polymarketPrivateKey: '0x0000000000000000000000000000000000000000000000000000000000000001',
            polymarketHost: 'https://clob.polymarket.com',
            polymarketChainId: 137,
            maxOrderConcurrency: 2,
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
                                notionalBps: 5000,
                                maxPriceBps: 7500,
                            },
                        ],
                        totalNotionalBps: 10000,
                    },
                ],
            ]),
        } as AppConfig;

        monitor = new MarketMaturityMonitor(mockConfig, 100); // 100ms for testing

        // Get mocked PositionCloser
        const PositionCloserMock = PositionCloser as any;
        mockPositionCloser =
            PositionCloserMock.mock.results[PositionCloserMock.mock.results.length - 1]?.value;
        if (mockPositionCloser) {
            mockPositionCloser.closePosition = vi.fn().mockResolvedValue({
                strategyId: 1n,
                totalPayout: 1080000000000n,
                payoutPerUSDC: 1080000n,
                polymarketPositions: [],
                transactionHash: '0xtxhash123',
            });
        }
    });

    afterEach(() => {
        monitor.stop();
        vi.useRealTimers();
    });

    describe('initialization', () => {
        it('should initialize with tracked markets from strategies', () => {
            const status = monitor.getStatus();
            expect(status.trackedMarkets).toBe(1); // Only 1 market now
            expect(status.isRunning).toBe(false);
        });

        it('should set poll interval correctly', () => {
            const customMonitor = new MarketMaturityMonitor(mockConfig, 5000);
            const status = customMonitor.getStatus();
            expect(status.pollIntervalMs).toBe(5000);
            customMonitor.stop();
        });
    });

    describe('getStatus', () => {
        it('should return monitor status', () => {
            const status = monitor.getStatus();

            expect(status).toMatchObject({
                isRunning: false,
                pollIntervalMs: 100,
                trackedMarkets: 1,
                settledStrategies: 0,
                stats: {
                    pollCount: 0,
                    marketsChecked: 0,
                    strategiesSettled: 0,
                    errors: 0,
                },
            });
        });
    });

    describe('start and stop', () => {
        it('should start monitoring', async () => {
            // Don't await start() as it runs forever
            monitor.start();

            // Let it run for a bit
            await vi.advanceTimersByTimeAsync(50);

            expect(monitor.getStatus().isRunning).toBe(true);

            monitor.stop();
        });

        it('should not start if already running', async () => {
            // Don't await start() as it runs forever
            monitor.start();
            await vi.advanceTimersByTimeAsync(50);

            // Try to start again
            await monitor.start();

            expect(monitor.getStatus().isRunning).toBe(true);

            monitor.stop();
        });

        it('should stop monitoring', async () => {
            // Don't await start() as it runs forever
            monitor.start();
            await vi.advanceTimersByTimeAsync(50);

            monitor.stop();
            await vi.advanceTimersByTimeAsync(50);

            expect(monitor.getStatus().isRunning).toBe(false);
        });
    });

    describe('polling', () => {
        it('should increment poll count on each poll', async () => {
            // Don't await start()
            monitor.start();

            // Wait for 2 poll intervals
            await vi.advanceTimersByTimeAsync(250);

            const status = monitor.getStatus();
            expect(status.stats.pollCount).toBeGreaterThan(0);

            monitor.stop();
        });

        it('should check all tracked markets', async () => {
            // Don't await start()
            monitor.start();

            await vi.advanceTimersByTimeAsync(150);

            const status = monitor.getStatus();
            expect(status.stats.marketsChecked).toBeGreaterThan(0);

            monitor.stop();
        });
    });

    describe('settlement', () => {
        it('should not settle the same strategy twice', async () => {
            // Mock fetchMarketInfo to return closed market
            vi.spyOn(monitor as any, 'fetchMarketInfo').mockResolvedValue({
                marketId: 'market-1',
                endDate: new Date().toISOString(),
                active: false,
                closed: true,
            });

            // Don't await start()
            monitor.start();

            // Wait for multiple polls
            await vi.advanceTimersByTimeAsync(350);

            // Should only settle once even after multiple polls
            if (mockPositionCloser?.closePosition) {
                // Exactly 1 time because we only have 1 strategy now
                expect(mockPositionCloser.closePosition).toHaveBeenCalledTimes(1);
            }

            const status = monitor.getStatus();
            expect(status.settledStrategies).toBe(1);

            monitor.stop();
        });

        it('should handle settlement errors gracefully', async () => {
            if (mockPositionCloser?.closePosition) {
                // Use mockRejectedValue (not Once) to reject all calls
                mockPositionCloser.closePosition.mockRejectedValue(
                    new Error('Settlement failed'),
                );
            }

            // Mock fetchMarketInfo to return closed market
            vi.spyOn(monitor as any, 'fetchMarketInfo').mockResolvedValue({
                marketId: 'market-1',
                endDate: new Date().toISOString(),
                active: false,
                closed: true,
            });

            // Spy on settleStrategy to catch the error
            const settleSpy = vi.spyOn(monitor as any, 'settleStrategy');

            // Don't await start()
            monitor.start();

            await vi.advanceTimersByTimeAsync(150);

            // Verify settleStrategy was called
            expect(settleSpy).toHaveBeenCalled();
            
            const status = monitor.getStatus();
            // When settlement fails, the strategy should NOT be marked as settled
            // So settledStrategies should still be 0
            expect(status.settledStrategies).toBe(0);

            monitor.stop();
        });
    });

    describe('fetchMarketInfo', () => {
        it('should return null for placeholder implementation', async () => {
            const marketInfo = await (monitor as any).fetchMarketInfo('market-1');
            expect(marketInfo).toBeNull();
        });

        it('should handle fetch errors gracefully', async () => {
            // This test ensures the method doesn't throw
            const marketInfo = await (monitor as any).fetchMarketInfo('invalid-market');
            expect(marketInfo).toBeNull();
        });
    });

    describe('error handling', () => {
        it('should continue polling after errors', async () => {
            // Make fetchMarketInfo throw an error once
            let callCount = 0;
            vi.spyOn(monitor as any, 'fetchMarketInfo').mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    throw new Error('Network error');
                }
                return Promise.resolve(null);
            });

            // Don't await start()
            monitor.start();

            await vi.advanceTimersByTimeAsync(250);

            const status = monitor.getStatus();
            expect(status.isRunning).toBe(true);
            // Should have multiple polls despite error
            expect(status.stats.pollCount).toBeGreaterThan(1);

            monitor.stop();
        });
    });

    describe('market maturity detection', () => {
        it('should trigger settlement when market closed flag is true', async () => {
            vi.spyOn(monitor as any, 'fetchMarketInfo').mockResolvedValue({
                marketId: 'market-1',
                endDate: new Date(Date.now() + 10000).toISOString(), // Future
                active: false,
                closed: true, // Market is closed
            });

            // Don't await start()
            monitor.start();

            await vi.advanceTimersByTimeAsync(150);

            if (mockPositionCloser?.closePosition) {
                expect(mockPositionCloser.closePosition).toHaveBeenCalled();
            }

            monitor.stop();
        });

        it('should trigger settlement when end date reached', async () => {
            const pastDate = new Date(Date.now() - 10000).toISOString();

            vi.spyOn(monitor as any, 'fetchMarketInfo').mockResolvedValue({
                marketId: 'market-1',
                endDate: pastDate,
                active: true,
                closed: false, // Not closed yet but past end date
            });

            // Don't await start()
            monitor.start();

            await vi.advanceTimersByTimeAsync(150);

            if (mockPositionCloser?.closePosition) {
                expect(mockPositionCloser.closePosition).toHaveBeenCalled();
            }

            monitor.stop();
        });

        it('should not trigger settlement for active markets', async () => {
            vi.spyOn(monitor as any, 'fetchMarketInfo').mockResolvedValue({
                marketId: 'market-1',
                endDate: new Date(Date.now() + 10000).toISOString(), // Future
                active: true,
                closed: false,
            });

            // Don't await start()
            monitor.start();

            await vi.advanceTimersByTimeAsync(150);

            if (mockPositionCloser?.closePosition) {
                expect(mockPositionCloser.closePosition).not.toHaveBeenCalled();
            }

            monitor.stop();
        });
    });
});

