import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createLogger } from './utils/logger.js';

const log = createLogger('api-server');

export async function createServer() {
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
            },
        };
    });

    return fastify;
}

export async function startServer(port: number = 3001, host: string = '0.0.0.0') {
    const server = await createServer();

    try {
        await server.listen({ port, host });
        log.info(`API server listening on http://${host}:${port}`);
        return server;
    } catch (err) {
        log.error('Failed to start server', err);
        throw err;
    }
}

