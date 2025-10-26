/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClobClient, OrderType, Side } from '@polymarket/clob-client';
import { Wallet, JsonRpcProvider } from 'ethers';
import { AppConfig } from '../config/env.js';
import { PolymarketOrderIntent, PolymarketPosition } from '../types.js';
import { createLogger } from '../utils/logger.js';
import { createLimiter, retry } from '../utils/promise.js';
import { VincentService } from '../services/vincent-service.js';

const log = createLogger('polymarket-client');

export class PolymarketClient {
    private readonly client: ClobClient;
    private readonly runWithLimit: ReturnType<typeof createLimiter>['run'];
    private readonly config: AppConfig;
    private readonly vincentService?: VincentService;
    private readonly useVincent: boolean;

    constructor(config: AppConfig, vincentService?: VincentService) {
        this.config = config;
        this.vincentService = vincentService;
        this.useVincent = config.useVincent;

        if (this.useVincent && !vincentService) {
            throw new Error('Vincent service required when USE_VINCENT=true');
        }

        // Initialize CLOB client only if not using Vincent
        // When using Vincent, trades are executed via Lit Actions
        const provider = new JsonRpcProvider(config.polygonRpcUrl);
        
        if (!this.useVincent) {
            log.info('Using direct private key signing for Polymarket');
            const signer = new Wallet(config.polymarketPrivateKey!, provider);
            this.client = new ClobClient(
                config.polymarketHost,
                config.polymarketChainId,
                signer as any, // CLOB client has older ethers type definitions
                undefined,
                config.polymarketSignatureType,
                config.polymarketFunderAddress,
            );
        } else {
            log.info('Using Vincent PKP signing for Polymarket');
            // When using Vincent, we'll execute trades via Lit Actions
            // CLOB client initialization is deferred or not needed
            // We'll use the Vincent service directly
            
            // For now, create a dummy client (won't be used)
            // In production, you might implement a custom signer that uses Vincent
            const dummySigner = new Wallet(Wallet.createRandom().privateKey, provider);
            this.client = new ClobClient(
                config.polymarketHost,
                config.polymarketChainId,
                dummySigner as any,
                undefined,
                config.polymarketSignatureType,
                config.polymarketFunderAddress,
            );
        }

        this.runWithLimit = createLimiter(config.maxOrderConcurrency).run;
    }

    async executeOrder(intent: PolymarketOrderIntent): Promise<void> {
        const side = intent.side === 'BUY' ? Side.BUY : Side.SELL;
        const amount = Number(intent.quoteAmount) / 1_000_000;

        await this.runWithLimit(() =>
            retry(
                async () => {
                    log.info('Submitting order to Polymarket', {
                        tokenId: intent.tokenId,
                        quoteAmount: intent.quoteAmount.toString(),
                        side,
                        limitPriceBps: intent.limitPriceBps,
                        mode: this.useVincent ? 'Vincent PKP' : 'Direct',
                    });

                    if (this.useVincent) {
                        // Execute trade via custom Vincent Ability with PKP signing
                        // This uses our @polyhedge/vincent-ability-polymarket-bet
                        const result = await this.vincentService!.executePolymarketTrade({
                            tokenId: intent.tokenId,
                            side: intent.side,
                            amount,
                            price: intent.limitPriceBps / 10000,
                        });
                        
                        log.info('Trade executed via Vincent Ability', {
                            success: result.success,
                            orderId: result.orderId,
                            status: result.status,
                        });
                    } else {
                        // Execute directly with private key
                        await this.client.createAndPostMarketOrder(
                            {
                                tokenID: intent.tokenId,
                                amount,
                                side,
                            },
                            {
                                negRisk: false,
                                tickSize: '0.001',
                            },
                            OrderType.FOK,
                            true,
                        );
                    }
                },
                3,
                1_000,
            ),
        );
    }

    async closePosition(params: { tokenId: string; side: 'YES' | 'NO' }): Promise<PolymarketPosition> {
        const { tokenId, side } = params;

        return await this.runWithLimit(() =>
            retry(
                async () => {
                    log.info('Closing Polymarket position', {
                        tokenId,
                        side,
                    });

                    // Get current position
                    // Note: CLOB client doesn't expose position queries directly
                    // In production, you'd query the CLOB API or track positions
                    // For now, we'll sell at market price

                    // Sell the position (opposite side)
                    const sellSide = side === 'YES' ? Side.SELL : Side.BUY;

                    // For MVP, assume fixed position size
                    // In production, query actual position size
                    const positionSize = 100; // Placeholder

                    await this.client.createAndPostMarketOrder(
                        {
                            tokenID: tokenId,
                            amount: positionSize,
                            side: sellSide,
                        },
                        {
                            negRisk: false,
                            tickSize: '0.001',
                        },
                        OrderType.FOK,
                        true,
                    );

                    log.info('Position closed successfully', {
                        tokenId,
                        side,
                        size: positionSize,
                    });

                    return {
                        tokenId,
                        size: positionSize,
                        side,
                    };
                },
                3,
                1_000,
            ),
        );
    }
}
