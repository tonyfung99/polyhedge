import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startServer } from '../server.js';
import { EventMonitorWorker } from '../workers/event-monitor.js';
import { AppConfig } from '../config/env.js';
import { FastifyInstance } from 'fastify';

describe('Integration Tests', () => {
    let server: FastifyInstance | undefined;
    let worker: EventMonitorWorker;
    let mockConfig: AppConfig;

    beforeAll(async () => {
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
        worker.enableTestMode();

        // Use port 0 to let OS assign a free port automatically
        server = await startServer(0, '127.0.0.1', worker);

        // Start worker
        worker.startTestMode();

        // Wait for first mock event
        await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    afterAll(async () => {
        worker.stop();
        if (server) {
            await server.close();
        }
    });

    it('should serve health endpoint', async () => {
        expect(server).toBeDefined();
        if (!server) return;

        const response = await server.inject({
            method: 'GET',
            url: '/health',
        });

        expect(response.statusCode).toBe(200);
    });

    it('should show worker status', async () => {
        expect(server).toBeDefined();
        if (!server) return;

        const response = await server.inject({
            method: 'GET',
            url: '/api/monitor/event-status',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);

        expect(body.isRunning).toBe(true);
        expect(body.testMode).toBe(true);
        expect(body.stats.eventsDetected).toBeGreaterThan(0);
    });

    it('should track event statistics', async () => {
        expect(server).toBeDefined();
        if (!server) return;

        const response = await server.inject({
            method: 'GET',
            url: '/api/monitor/event-stats',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);

        expect(body.stats.eventsDetected).toBeGreaterThan(0);
        expect(body.stats.startTime).toBeDefined();
        expect(body.stats.uptime).toBeGreaterThan(0);
    });
});

