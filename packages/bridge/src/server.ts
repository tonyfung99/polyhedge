import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createLogger } from './utils/logger.js';
import { EventMonitorWorker } from './workers/event-monitor.js';
import { MarketMaturityMonitor } from './workers/market-maturity-monitor.js';
import { PolymarketClient } from './polymarket/client.js';
import { z } from 'zod';

const log = createLogger('api-server');

// Request schemas for validation
const placeBetSchema = z.object({
    tokenId: z.string().min(1, 'Token ID is required'),
    side: z.enum(['BUY', 'SELL'], { required_error: 'Side must be BUY or SELL' }),
    quoteAmount: z.string().regex(/^\d+$/, 'Quote amount must be a numeric string'),
    limitPriceBps: z.number().int().min(0).max(10000, 'Limit price must be between 0 and 10000 bps'),
    maxPriceBps: z.number().int().min(0).max(10000, 'Max price must be between 0 and 10000 bps'),
});

const closeBetSchema = z.object({
    tokenId: z.string().min(1, 'Token ID is required'),
    side: z.enum(['YES', 'NO'], { required_error: 'Side must be YES or NO' }),
});

export async function createServer(
    eventMonitor?: EventMonitorWorker,
    maturityMonitor?: MarketMaturityMonitor,
    polymarketClient?: PolymarketClient
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
                testPlaceBet: '/api/test/place-bet',
                testCloseBet: '/api/test/close-bet',
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

    // Test endpoint: Place a bet on Polymarket
    fastify.post('/api/test/place-bet', async (request, reply) => {
        if (!polymarketClient) {
            return reply.code(503).send({
                error: 'Polymarket client not initialized',
                message: 'The Polymarket client must be configured to use this endpoint',
            });
        }

        try {
            // Validate request body
            const body = placeBetSchema.parse(request.body);

            log.info('Test API: Placing bet on Polymarket', {
                tokenId: body.tokenId,
                side: body.side,
                quoteAmount: body.quoteAmount,
            });

            // Convert to PolymarketOrderIntent format
            const intent = {
                tokenId: body.tokenId,
                side: body.side,
                quoteAmount: BigInt(body.quoteAmount),
                limitPriceBps: body.limitPriceBps,
                maxPriceBps: body.maxPriceBps,
            };

            // Execute the order
            await polymarketClient.executeOrder(intent);

            log.info('Test API: Bet placed successfully', {
                tokenId: body.tokenId,
            });

            return reply.code(200).send({
                success: true,
                message: 'Bet placed successfully',
                data: {
                    tokenId: body.tokenId,
                    side: body.side,
                    quoteAmount: body.quoteAmount,
                },
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            log.error('Test API: Failed to place bet', error);

            if (error instanceof z.ZodError) {
                return reply.code(400).send({
                    success: false,
                    error: 'Invalid request body',
                    details: error.errors,
                });
            }

            return reply.code(500).send({
                success: false,
                error: 'Failed to place bet',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Test endpoint: Close a bet position on Polymarket
    fastify.post('/api/test/close-bet', async (request, reply) => {
        if (!polymarketClient) {
            return reply.code(503).send({
                error: 'Polymarket client not initialized',
                message: 'The Polymarket client must be configured to use this endpoint',
            });
        }

        try {
            // Validate request body
            const body = closeBetSchema.parse(request.body);

            log.info('Test API: Closing bet position on Polymarket', {
                tokenId: body.tokenId,
                side: body.side,
            });

            // Close the position
            const result = await polymarketClient.closePosition({
                tokenId: body.tokenId,
                side: body.side,
            });

            log.info('Test API: Position closed successfully', {
                tokenId: body.tokenId,
                size: result.size,
            });

            return reply.code(200).send({
                success: true,
                message: 'Position closed successfully',
                data: result,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            log.error('Test API: Failed to close position', error);

            if (error instanceof z.ZodError) {
                return reply.code(400).send({
                    success: false,
                    error: 'Invalid request body',
                    details: error.errors,
                });
            }

            return reply.code(500).send({
                success: false,
                error: 'Failed to close position',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    return fastify;
}

export async function startServer(
    port: number = 3001,
    host: string = '0.0.0.0',
    eventMonitor?: EventMonitorWorker,
    maturityMonitor?: MarketMaturityMonitor,
    polymarketClient?: PolymarketClient
) {
    const server = await createServer(eventMonitor, maturityMonitor, polymarketClient);

    try {
        await server.listen({ port, host });
        log.info(`API server listening on http://${host}:${port}`);
        return server;
    } catch (err) {
        log.error('Failed to start server', err);
        throw err;
    }
}
