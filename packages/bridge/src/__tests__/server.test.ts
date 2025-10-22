import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from '../server.js';
import { FastifyInstance } from 'fastify';

describe('API Server', () => {
    let server: FastifyInstance;

    afterEach(async () => {
        if (server) {
            await server.close();
        }
    });

    describe('endpoints', () => {
        beforeEach(async () => {
            server = await createServer();
        });

        it('should respond to health check', async () => {
            const response = await server.inject({
                method: 'GET',
                url: '/health',
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.status).toBe('healthy');
            expect(body.service).toBe('polyhedge-bridge');
        });

        it('should respond to root endpoint', async () => {
            const response = await server.inject({
                method: 'GET',
                url: '/',
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.service).toBe('polyhedge-bridge');
            expect(body.endpoints).toBeDefined();
        });

        it('should return 503 for monitor status without worker', async () => {
            const response = await server.inject({
                method: 'GET',
                url: '/api/monitor/status',
            });

            expect(response.statusCode).toBe(503);
            const body = JSON.parse(response.body);
            expect(body.error).toContain('not initialized');
        });
    });
});

