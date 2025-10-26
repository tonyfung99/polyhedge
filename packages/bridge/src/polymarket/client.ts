/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClobClient, OrderType, Side } from '@polymarket/clob-client';
import { JsonRpcProvider } from 'ethers';
import { Wallet } from "@ethersproject/wallet";
import { AppConfig } from '../config/env.js';
import { PolymarketOrderIntent, PolymarketPosition } from '../types.js';
import { createLogger } from '../utils/logger.js';
import { createLimiter, retry } from '../utils/promise.js';
import { VincentService } from '../services/vincent-service.js';

const log = createLogger('polymarket-client');

export class PolymarketClient {
    private client!: ClobClient; // Will be initialized in initialize()
    private readonly runWithLimit: ReturnType<typeof createLimiter>['run'];
    private readonly config: AppConfig;
    private readonly vincentService?: VincentService;
    private readonly useVincent: boolean;
    private initialized = false;
    private readonly provider: JsonRpcProvider;

    constructor(config: AppConfig, vincentService?: VincentService) {
        this.config = config;
        this.vincentService = vincentService;
        this.useVincent = config.useVincent;
        this.provider = new JsonRpcProvider(config.polygonRpcUrl);

        if (this.useVincent && !vincentService) {
            throw new Error('Vincent service required when USE_VINCENT=true');
        }

        this.runWithLimit = createLimiter(config.maxOrderConcurrency).run;
    }

    /**
     * Initialize Polymarket API credentials
     * This must be called before placing any orders
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return; // Already initialized
        }

        try {
            const signer = new Wallet(this.config.polymarketPrivateKey!);
            console.log('----------[PolymarketClient] signer', signer);
            
            // Create ethers v5 compatible wrapper for CLOB client
            // const signerCompat = {
            //     ...wallet,
            //     _signTypedData: wallet.signTypedData.bind(wallet),
            //     getAddress: () => Promise.resolve(wallet.address),
            // };

            if (!this.useVincent) {
                log.info('Deriving Polymarket API credentials from wallet', {
                    signatureType: this.config.polymarketSignatureType,
                    funderAddress: this.config.polymarketFunderAddress,
                    signerAddress: signer.address,
                });
                
                // Step 1: Create a temporary client to derive credentials
                // const tempClient = new ClobClient(
                //     this.config.polymarketHost,
                //     this.config.polymarketChainId,
                //     signerCompat as any,
                //     undefined, // No creds yet
                //     this.config.polymarketSignatureType,
                //     this.config.polymarketFunderAddress,
                // );
                
                // Step 2: Derive API credentials from wallet signature
                // const creds = await tempClient.createOrDeriveApiKey();
                const creds = await new ClobClient(this.config.polymarketHost, 137, signer).createOrDeriveApiKey();

                log.info('Polymarket API credentials derived', {
                    key: creds.key.substring(0, 8) + '...',
                    passphrase: creds.passphrase.substring(0, 8) + '...',
                });
                
                // Step 3: Create the final client WITH credentials
                this.client = new ClobClient(this.config.polymarketHost, 137, signer, creds, this.config.polymarketSignatureType, this.config.polymarketFunderAddress);

                
                log.info('Polymarket client initialized with API credentials');
            } else {
                // Vincent mode: create dummy client (won't be used for trades)
                log.info('Vincent mode: creating placeholder client');
                const dummyWallet = new Wallet(Wallet.createRandom().privateKey);
                const dummySignerCompat = {
                    ...dummyWallet,
                    _signTypedData: dummyWallet.signTypedData.bind(dummyWallet),
                    getAddress: () => Promise.resolve(dummyWallet.address),
                };
                
                this.client = new ClobClient(
                    this.config.polymarketHost,
                    this.config.polymarketChainId,
                    dummySignerCompat as any,
                    undefined,
                    this.config.polymarketSignatureType,
                    this.config.polymarketFunderAddress,
                );
            }
            
            this.initialized = true;
        } catch (error) {
            log.error('Failed to initialize Polymarket client', error);
            throw error;
        }
    }

    async executeOrder(intent: PolymarketOrderIntent): Promise<void> {
        // Ensure client is initialized before placing orders
        if (!this.initialized && !this.useVincent) {
            await this.initialize();
        }

        const side = intent.side === 'BUY' ? Side.BUY : Side.SELL;
        const amount = Number(intent.quoteAmount) / 1_000_000;

        await this.runWithLimit(() =>
            retry(
                async () => {
                    try {
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
                        log.info('Calling Polymarket CLOB API', {
                            tokenId: intent.tokenId,
                            amount,
                            side,
                            orderType: 'FOK',
                        });
                        
                        // Follow the official docs pattern for FOK market orders:
                        // Step 1: Create the market order
                        const marketOrder = await this.client.createMarketOrder({
                            side,
                            tokenID: intent.tokenId,
                            amount, // For BUY: $$$, For SELL: shares
                            feeRateBps: 0,
                            nonce: 0,
                            price: intent.limitPriceBps / 10000, // Convert BPS to decimal (3000 BPS = 0.3)
                        });
                        
                        log.info('Market order created', {
                            order: marketOrder,
                        });
                        
                        // Step 2: Post the order to the server as FOK
                        const response = await this.client.postOrder(marketOrder, OrderType.FOK);
                        
                        log.info('Polymarket order response', {
                            response: JSON.stringify(response, null, 2),
                        });
                        
                        // Check if response contains an error
                        if (response && typeof response === 'object') {
                            const errorMsg = (response as any).error;
                            const status = (response as any).status;
                            
                            if (errorMsg || (status && status >= 400)) {
                                // Provide helpful error message for common issues
                                let helpfulMsg = `Polymarket API error: ${errorMsg || 'Unknown error'} (HTTP ${status || 'unknown'})`;
                                
                                const signerAddress = await this.client.signer?.getAddress();
                                if (errorMsg === 'invalid signature') {
                                    helpfulMsg += '\n\n' +
                                        '⚠️  Your wallet needs to be onboarded on Polymarket first!\n\n' +
                                        'Steps to fix:\n' +
                                        '1. Visit https://polymarket.com\n' +
                                        `2. Connect wallet: ${signerAddress}\n` +
                                        '3. Complete the onboarding process\n' +
                                        '4. Try your order again\n\n' +
                                        'See packages/bridge/POLYMARKET_SETUP.md for detailed instructions.';
                                }
                                
                                const error = new Error(helpfulMsg);
                                (error as any).apiError = errorMsg;
                                (error as any).statusCode = status;
                                (error as any).response = { data: response };
                                throw error;
                            }
                        }
                        
                        log.info('Order placed successfully', {
                            orderDetails: response,
                        });
                    }
                } catch (error: any) {
                    // Extract detailed error from Polymarket API response
                    const apiError = error?.apiError || error?.response?.data?.error || error?.message || String(error);
                    const statusCode = error?.statusCode || error?.response?.status;
                    
                    log.error('Polymarket order failed', {
                        error: apiError,
                        statusCode,
                        fullError: JSON.stringify(error?.response?.data || error, null, 2),
                        tokenId: intent.tokenId,
                        side,
                        amount,
                    });
                    
                    // Attach error details for API response
                    if (!error.apiError) {
                        error.apiError = apiError;
                    }
                    if (!error.statusCode) {
                        error.statusCode = statusCode;
                    }
                    
                    throw error;
                }
                },
                1, // Don't retry - signature errors need wallet onboarding
                1_000,
            ),
        );
    }

    async closePosition(params: { tokenId: string; side: 'YES' | 'NO' }): Promise<PolymarketPosition> {
        // Ensure client is initialized before closing positions
        if (!this.initialized && !this.useVincent) {
            await this.initialize();
        }

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
