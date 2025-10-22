import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventMonitorWorker } from '../workers/event-monitor.js';
import { AppConfig } from '../config/env.js';

// Mock dependencies
vi.mock('@envio-dev/hypersync-client');
vi.mock('../polymarket/client.js');

describe('EventMonitorWorker', () => {
    let mockConfig: AppConfig;
    let worker: EventMonitorWorker;

    beforeEach(() => {
        mockConfig = {
            hypersyncEndpoint: 'https://test.hypersync.xyz',
            hypersyncFromBlock: 0,
            hypersyncBatchSize: 100,
            hypersyncPollIntervalMs: 1000,
            strategyManagerAddress: '0x0000000000000000000000000000000000000001',
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
                                marketId: 'test-market-1',
                                isYes: true,
                                priority: 1,
                                notionalBps: 5000,
                                maxPriceBps: 7500,
                            },
                        ],
                        totalNotionalBps: 5000,
                    },
                ],
            ]),
        } as AppConfig;

        worker = new EventMonitorWorker(mockConfig);
    });

    afterEach(() => {
        worker.stop();
    });

    describe('initialization', () => {
        it('should initialize with correct config', () => {
            expect(worker).toBeDefined();
            const status = worker.getStatus();
            expect(status.isRunning).toBe(false);
            expect(status.testMode).toBe(false);
        });

        it('should track initial stats', () => {
            const status = worker.getStatus();
            expect(status.stats.eventsDetected).toBe(0);
            expect(status.stats.eventsProcessed).toBe(0);
            expect(status.stats.errorCount).toBe(0);
        });
    });

    describe('status reporting', () => {
        it('should return comprehensive status', () => {
            const status = worker.getStatus();

            expect(status).toHaveProperty('isRunning');
            expect(status).toHaveProperty('shouldStop');
            expect(status).toHaveProperty('testMode');
            expect(status).toHaveProperty('stats');
            expect(status).toHaveProperty('config');
        });

        it('should calculate uptime', () => {
            const status = worker.getStatus();
            expect(status.stats.uptime).toBeGreaterThanOrEqual(0);
            expect(status.stats.uptimeFormatted).toBeDefined();
        });
    });

    describe('test mode', () => {
        it('should enable test mode', () => {
            worker.enableTestMode();
            const status = worker.getStatus();
            expect(status.testMode).toBe(true);
        });

        it('should start in test mode', async () => {
            worker.enableTestMode();

            // Start test mode (non-blocking)
            const promise = worker.startTestMode();

            // Wait a bit
            await new Promise((resolve) => setTimeout(resolve, 100));

            const status = worker.getStatus();
            expect(status.isRunning).toBe(true);
            expect(status.testMode).toBe(true);

            worker.stop();
            await promise;
        });
    });

    describe('lifecycle', () => {
        it('should prevent double start', async () => {
            worker.enableTestMode();
            const promise1 = worker.startTestMode();

            // Try to start again
            const promise2 = worker.startTestMode();

            await new Promise((resolve) => setTimeout(resolve, 100));

            worker.stop();

            // Wait for worker to fully stop
            await new Promise((resolve) => setTimeout(resolve, 200));

            // Should still work correctly
            const status = worker.getStatus();
            expect(status.isRunning).toBe(false);
        });

        it('should stop cleanly', async () => {
            worker.enableTestMode();
            const promise = worker.startTestMode();

            await new Promise((resolve) => setTimeout(resolve, 100));

            worker.stop();

            // Wait for worker to fully stop
            await new Promise((resolve) => setTimeout(resolve, 200));

            const status = worker.getStatus();
            expect(status.isRunning).toBe(false);
            expect(status.shouldStop).toBe(true);
        });
    });
});

