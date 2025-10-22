import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PositionCloser } from '../services/position-closer.js';
import { AppConfig } from '../config/env.js';
import { PolymarketClient } from '../polymarket/client.js';
import { Contract } from 'ethers';

// Mock dependencies
vi.mock('../polymarket/client.js');
vi.mock('ethers', () => ({
    Wallet: vi.fn().mockImplementation(() => ({})),
    JsonRpcProvider: vi.fn().mockImplementation(() => ({})),
    Contract: vi.fn().mockImplementation(() => ({
        strategies: vi.fn().mockResolvedValue([
            1n, // id
            'Test Strategy', // name
            500n, // feeBps
            BigInt(Math.floor(Date.now() / 1000) - 1000), // maturityTs (past)
            true, // active
            false, // settled
            0n, // payoutPerUSDC
        ]),
        settleStrategy: vi.fn().mockResolvedValue({
            wait: vi.fn().mockResolvedValue({
                hash: '0xtxhash123',
            }),
        }),
    })),
}));

describe('PositionCloser', () => {
    let closer: PositionCloser;
    let mockConfig: AppConfig;
    let mockPolymarketClient: any;
    let mockContract: any;

    beforeEach(() => {
        vi.clearAllMocks();

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
                            {
                                marketId: 'market-2',
                                isYes: false,
                                priority: 2,
                                notionalBps: 5000,
                                maxPriceBps: 6000,
                            },
                        ],
                        totalNotionalBps: 10000,
                    },
                ],
            ]),
        } as AppConfig;

        closer = new PositionCloser(mockConfig);

        // Get mocked instances
        const PolymarketClientMock = PolymarketClient as any;
        mockPolymarketClient =
            PolymarketClientMock.mock.results[PolymarketClientMock.mock.results.length - 1].value;
        mockPolymarketClient.closePosition = vi.fn().mockResolvedValue({
            tokenId: 'market-1',
            size: 100,
            side: 'YES',
        });

        const ContractMock = Contract as any;
        mockContract = ContractMock.mock.results[ContractMock.mock.results.length - 1].value;
    });

    describe('closePosition', () => {
        it('should close all Polymarket positions', async () => {
            const result = await closer.closePosition({
                strategyId: 1n,
            });

            expect(mockPolymarketClient.closePosition).toHaveBeenCalledTimes(2);
            expect(mockPolymarketClient.closePosition).toHaveBeenCalledWith({
                tokenId: 'market-1',
                side: 'YES',
            });
            expect(mockPolymarketClient.closePosition).toHaveBeenCalledWith({
                tokenId: 'market-2',
                side: 'NO',
            });
        });

        it('should call settleStrategy on contract', async () => {
            const result = await closer.closePosition({
                strategyId: 1n,
            });

            expect(mockContract.settleStrategy).toHaveBeenCalledWith(
                1n,
                expect.any(BigInt),
            );
        });

        it('should return settlement result', async () => {
            const result = await closer.closePosition({
                strategyId: 1n,
            });

            expect(result).toMatchObject({
                strategyId: 1n,
                totalPayout: expect.any(BigInt),
                payoutPerUSDC: expect.any(BigInt),
                transactionHash: '0xtxhash123',
            });
            expect(result.polymarketPositions).toHaveLength(2);
        });

        it('should throw error for unknown strategy', async () => {
            await expect(
                closer.closePosition({
                    strategyId: 999n,
                }),
            ).rejects.toThrow('Strategy 999 not found');
        });

        it('should throw error if already settled', async () => {
            mockContract.strategies.mockResolvedValueOnce([
                1n,
                'Test Strategy',
                500n,
                BigInt(Math.floor(Date.now() / 1000) - 1000),
                true,
                true, // settled = true
                1000000n,
            ]);

            await expect(
                closer.closePosition({
                    strategyId: 1n,
                }),
            ).rejects.toThrow('already settled');
        });

        it('should handle Polymarket closing errors', async () => {
            mockPolymarketClient.closePosition.mockRejectedValueOnce(
                new Error('Market closed'),
            );

            await expect(
                closer.closePosition({
                    strategyId: 1n,
                }),
            ).rejects.toThrow('Market closed');
        });

        it('should log warning when closing before maturity', async () => {
            mockContract.strategies.mockResolvedValueOnce([
                1n,
                'Test Strategy',
                500n,
                BigInt(Math.floor(Date.now() / 1000) + 10000), // future maturity
                true,
                false,
                0n,
            ]);

            const result = await closer.closePosition({
                strategyId: 1n,
            });

            expect(result).toBeDefined();
            // Should complete despite warning
        });
    });
});

