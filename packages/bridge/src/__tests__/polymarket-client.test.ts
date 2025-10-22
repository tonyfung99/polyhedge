import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PolymarketClient } from '../polymarket/client.js';
import { AppConfig } from '../config/env.js';
import { PolymarketOrderIntent } from '../types.js';
import { ClobClient, Side, OrderType } from '@polymarket/clob-client';

// Mock the CLOB client
vi.mock('@polymarket/clob-client', () => ({
    ClobClient: vi.fn().mockImplementation(() => ({
        createAndPostMarketOrder: vi.fn().mockResolvedValue({ success: true }),
    })),
    Side: {
        BUY: 'BUY',
        SELL: 'SELL',
    },
    OrderType: {
        FOK: 'FOK',
        GTC: 'GTC',
    },
}));

// Mock ethers
vi.mock('ethers', () => ({
    Wallet: vi.fn().mockImplementation(() => ({})),
    JsonRpcProvider: vi.fn().mockImplementation(() => ({})),
}));

describe('PolymarketClient', () => {
    let client: PolymarketClient;
    let mockConfig: AppConfig;
    let mockClobClient: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockConfig = {
            polygonRpcUrl: 'https://polygon-rpc.com',
            polymarketPrivateKey: '0x0000000000000000000000000000000000000000000000000000000000000001',
            polymarketHost: 'https://clob.polymarket.com',
            polymarketChainId: 137,
            maxOrderConcurrency: 2,
            polymarketSignatureType: 1,
            polymarketFunderAddress: '0x0000000000000000000000000000000000000002',
        } as AppConfig;

        client = new PolymarketClient(mockConfig);

        // Get the mock CLOB client instance
        const ClobClientMock = ClobClient as any;
        mockClobClient = ClobClientMock.mock.results[ClobClientMock.mock.results.length - 1].value;
    });

    describe('executeOrder', () => {
        it('should convert BUY order intent correctly', async () => {
            const intent: PolymarketOrderIntent = {
                tokenId: 'market-123',
                side: 'BUY',
                quoteAmount: 1000000n, // 1 USDC (6 decimals)
                limitPriceBps: 7500, // 75%
                maxPriceBps: 7500,
            };

            await client.executeOrder(intent);

            expect(mockClobClient.createAndPostMarketOrder).toHaveBeenCalledWith(
                {
                    tokenID: 'market-123',
                    amount: 1, // Converted from 1000000 (6 decimals)
                    side: 'BUY',
                },
                {
                    negRisk: false,
                    tickSize: '0.001',
                },
                'FOK',
                true,
            );
        });

        it('should convert SELL order intent correctly', async () => {
            const intent: PolymarketOrderIntent = {
                tokenId: 'market-456',
                side: 'SELL',
                quoteAmount: 500000n, // 0.5 USDC
                limitPriceBps: 6000,
                maxPriceBps: 6000,
            };

            await client.executeOrder(intent);

            expect(mockClobClient.createAndPostMarketOrder).toHaveBeenCalledWith(
                {
                    tokenID: 'market-456',
                    amount: 0.5,
                    side: 'SELL',
                },
                {
                    negRisk: false,
                    tickSize: '0.001',
                },
                'FOK',
                true,
            );
        });

        it('should handle large amounts correctly', async () => {
            const intent: PolymarketOrderIntent = {
                tokenId: 'market-789',
                side: 'BUY',
                quoteAmount: 10000000000n, // 10,000 USDC
                limitPriceBps: 5000,
                maxPriceBps: 5000,
            };

            await client.executeOrder(intent);

            expect(mockClobClient.createAndPostMarketOrder).toHaveBeenCalledWith(
                expect.objectContaining({
                    amount: 10000,
                }),
                expect.any(Object),
                expect.any(String),
                expect.any(Boolean),
            );
        });

        it('should handle small amounts correctly', async () => {
            const intent: PolymarketOrderIntent = {
                tokenId: 'market-small',
                side: 'BUY',
                quoteAmount: 1n, // 0.000001 USDC (smallest unit)
                limitPriceBps: 9000,
                maxPriceBps: 9000,
            };

            await client.executeOrder(intent);

            expect(mockClobClient.createAndPostMarketOrder).toHaveBeenCalledWith(
                expect.objectContaining({
                    amount: 0.000001,
                }),
                expect.any(Object),
                expect.any(String),
                expect.any(Boolean),
            );
        });

        it('should retry on failure', async () => {
            mockClobClient.createAndPostMarketOrder
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({ success: true });

            const intent: PolymarketOrderIntent = {
                tokenId: 'market-retry',
                side: 'BUY',
                quoteAmount: 1000000n,
                limitPriceBps: 7000,
                maxPriceBps: 7000,
            };

            await client.executeOrder(intent);

            // Should have been called 3 times (2 failures + 1 success)
            expect(mockClobClient.createAndPostMarketOrder).toHaveBeenCalledTimes(3);
        });

        it('should fail after max retries', async () => {
            mockClobClient.createAndPostMarketOrder.mockRejectedValue(
                new Error('Persistent error'),
            );

            const intent: PolymarketOrderIntent = {
                tokenId: 'market-fail',
                side: 'BUY',
                quoteAmount: 1000000n,
                limitPriceBps: 7000,
                maxPriceBps: 7000,
            };

            await expect(client.executeOrder(intent)).rejects.toThrow('Persistent error');

            // Should have retried 3 times
            expect(mockClobClient.createAndPostMarketOrder).toHaveBeenCalledTimes(3);
        });

        it('should respect concurrency limits', async () => {
            // Mock a slow operation
            mockClobClient.createAndPostMarketOrder.mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 100)),
            );

            const intent: PolymarketOrderIntent = {
                tokenId: 'market-concurrent',
                side: 'BUY',
                quoteAmount: 1000000n,
                limitPriceBps: 7000,
                maxPriceBps: 7000,
            };

            // Start 3 orders concurrently
            const promises = [
                client.executeOrder(intent),
                client.executeOrder(intent),
                client.executeOrder(intent),
            ];

            await Promise.all(promises);

            // All should complete
            expect(mockClobClient.createAndPostMarketOrder).toHaveBeenCalledTimes(3);
        });
    });

    describe('order parameters', () => {
        it('should use correct order type (FOK)', async () => {
            const intent: PolymarketOrderIntent = {
                tokenId: 'market-type',
                side: 'BUY',
                quoteAmount: 1000000n,
                limitPriceBps: 7000,
                maxPriceBps: 7000,
            };

            await client.executeOrder(intent);

            expect(mockClobClient.createAndPostMarketOrder).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(Object),
                'FOK', // Fill-or-Kill
                true,
            );
        });

        it('should set negRisk to false', async () => {
            const intent: PolymarketOrderIntent = {
                tokenId: 'market-risk',
                side: 'BUY',
                quoteAmount: 1000000n,
                limitPriceBps: 7000,
                maxPriceBps: 7000,
            };

            await client.executeOrder(intent);

            expect(mockClobClient.createAndPostMarketOrder).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    negRisk: false,
                    tickSize: '0.001',
                }),
                expect.any(String),
                expect.any(Boolean),
            );
        });
    });

    describe('amount conversion', () => {
        it('should handle zero amounts', async () => {
            const intent: PolymarketOrderIntent = {
                tokenId: 'market-zero',
                side: 'BUY',
                quoteAmount: 0n,
                limitPriceBps: 7000,
                maxPriceBps: 7000,
            };

            await client.executeOrder(intent);

            expect(mockClobClient.createAndPostMarketOrder).toHaveBeenCalledWith(
                expect.objectContaining({
                    amount: 0,
                }),
                expect.any(Object),
                expect.any(String),
                expect.any(Boolean),
            );
        });

        it('should maintain precision for decimal amounts', async () => {
            const intent: PolymarketOrderIntent = {
                tokenId: 'market-decimal',
                side: 'BUY',
                quoteAmount: 1234567n, // 1.234567 USDC
                limitPriceBps: 7000,
                maxPriceBps: 7000,
            };

            await client.executeOrder(intent);

            expect(mockClobClient.createAndPostMarketOrder).toHaveBeenCalledWith(
                expect.objectContaining({
                    amount: 1.234567,
                }),
                expect.any(Object),
                expect.any(String),
                expect.any(Boolean),
            );
        });
    });

    describe('error scenarios', () => {
        it('should handle API errors gracefully', async () => {
            mockClobClient.createAndPostMarketOrder.mockRejectedValue({
                status: 400,
                message: 'Invalid order parameters',
            });

            const intent: PolymarketOrderIntent = {
                tokenId: 'market-error',
                side: 'BUY',
                quoteAmount: 1000000n,
                limitPriceBps: 7000,
                maxPriceBps: 7000,
            };

            await expect(client.executeOrder(intent)).rejects.toBeTruthy();
        });

        it('should handle network timeouts', async () => {
            mockClobClient.createAndPostMarketOrder.mockRejectedValue(
                new Error('ETIMEDOUT'),
            );

            const intent: PolymarketOrderIntent = {
                tokenId: 'market-timeout',
                side: 'BUY',
                quoteAmount: 1000000n,
                limitPriceBps: 7000,
                maxPriceBps: 7000,
            };

            await expect(client.executeOrder(intent)).rejects.toThrow('ETIMEDOUT');
        });
    });
});

