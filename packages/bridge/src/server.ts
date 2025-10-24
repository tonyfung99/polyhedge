import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createLogger } from './utils/logger.js';
import { EventMonitorWorker } from './workers/event-monitor.js';
import { MarketMaturityMonitor } from './workers/market-maturity-monitor.js';

const log = createLogger('api-server');

export async function createServer(
    eventMonitor?: EventMonitorWorker,
    maturityMonitor?: MarketMaturityMonitor
) {
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
                eventMonitorStatus: '/api/monitor/event-status',
                eventMonitorStats: '/api/monitor/event-stats',
                maturityMonitorStatus: '/api/monitor/maturity-status',
            },
        };
    });

    // Event monitor status endpoint
    fastify.get('/api/monitor/event-status', async (request, reply) => {
        if (!eventMonitor) {
            return reply.code(503).send({
                error: 'Event monitor not initialized',
            });
        }

        return eventMonitor.getStatus();
    });

    // Event monitor stats only (lightweight)
    fastify.get('/api/monitor/event-stats', async (request, reply) => {
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

    // Market maturity monitor status endpoint
    fastify.get('/api/monitor/maturity-status', async (request, reply) => {
        if (!maturityMonitor) {
            return reply.code(503).send({
                error: 'Market maturity monitor not initialized',
            });
        }

        return maturityMonitor.getStatus();
    });

    return fastify;
}

export async function startServer(
    port: number = 3001,
    host: string = '0.0.0.0',
    eventMonitor?: EventMonitorWorker,
    maturityMonitor?: MarketMaturityMonitor
) {
    const server = await createServer(eventMonitor, maturityMonitor);

    try {
        await server.listen({ port, host });
        log.info(`API server listening on http://${host}:${port}`);
        return server;
    } catch (err) {
        log.error('Failed to start server', err);
        throw err;
    }
}
