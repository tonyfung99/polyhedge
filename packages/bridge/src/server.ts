import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createLogger } from './utils/logger.js';
import { EventMonitorWorker } from './workers/event-monitor.js';
import { PositionCloser } from './services/position-closer.js';
import { AppConfig } from './config/env.js';

const log = createLogger('api-server');

export async function createServer(eventMonitor?: EventMonitorWorker, appConfig?: AppConfig) {
    const fastify = Fastify({
        logger: false, // We're using our custom logger
        disableRequestLogging: true,
    });

    // Register CORS
    await fastify.register(cors, {
        origin: true, // Allow all origins in development, configure for production
    });

    // Health check endpoint
    fastify.get('/health', async (request, reply) => {
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'polyhedge-bridge',
            version: '0.1.0',
        };
    });

    // Root endpoint
    fastify.get('/', async (request, reply) => {
        return {
            service: 'polyhedge-bridge',
            version: '0.1.0',
            endpoints: {
                health: '/health',
                monitorStatus: '/api/monitor/status',
                monitorStats: '/api/monitor/stats',
                closePosition: 'POST /api/strategies/:id/close',
            },
        };
    });

    // Monitor status endpoint
    fastify.get('/api/monitor/status', async (request, reply) => {
        if (!eventMonitor) {
            return reply.code(503).send({
                error: 'Event monitor not initialized',
            });
        }

        return eventMonitor.getStatus();
    });

    // Monitor stats only (lightweight)
    fastify.get('/api/monitor/stats', async (request, reply) => {
        if (!eventMonitor) {
            return reply.code(503).send({
                error: 'Event monitor not initialized',
            });
        }

        const status = eventMonitor.getStatus();
        return {
            isRunning: status.isRunning,
            testMode: status.testMode,
            stats: status.stats,
            timestamp: new Date().toISOString(),
        };
    });

    // Close position endpoint
    fastify.post<{
        Params: { id: string };
        Body: { reason?: string };
    }>('/api/strategies/:id/close', async (request, reply) => {
        if (!appConfig) {
            return reply.code(503).send({
                error: 'Service not initialized',
            });
        }

        const strategyId = BigInt(request.params.id);
        const { reason } = request.body || {};

        try {
            log.info('Received close position request', {
                strategyId: strategyId.toString(),
                reason,
            });

            const closer = new PositionCloser(appConfig);
            const result = await closer.closePosition({
                strategyId,
                reason,
            });

            return {
                success: true,
                strategyId: result.strategyId.toString(),
                totalPayout: result.totalPayout.toString(),
                payoutPerUSDC: result.payoutPerUSDC.toString(),
                transactionHash: result.transactionHash,
                positions: result.polymarketPositions.map(p => ({
                    tokenId: p.tokenId,
                    side: p.side,
                    size: p.size,
                })),
            };
        } catch (error) {
            log.error('Failed to close position', {
                error: (error as Error).message,
                strategyId: strategyId.toString(),
            });

            return reply.code(500).send({
                error: 'Failed to close position',
                message: (error as Error).message,
            });
        }
    });

    return fastify;
}

export async function startServer(
    port: number = 3001,
    host: string = '0.0.0.0',
    eventMonitor?: EventMonitorWorker,
    appConfig?: AppConfig
) {
    const server = await createServer(eventMonitor, appConfig);

    try {
        await server.listen({ port, host });
        log.info(`API server listening on http://${host}:${port}`);
        return server;
    } catch (err) {
        log.error('Failed to start server', err);
        throw err;
    }
}
