/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClobClient, OrderType, Side } from '@polymarket/clob-client';
import { Wallet } from 'ethers';
import { AppConfig } from '../config/env.js';
import { PolymarketOrderIntent } from '../types.js';
import { createLogger } from '../utils/logger.js';
import { createLimiter, retry } from '../utils/promise.js';

const log = createLogger('polymarket-client');

export class PolymarketClient {
    private readonly client: ClobClient;
    private readonly runWithLimit: ReturnType<typeof createLimiter>['run'];

    constructor(config: AppConfig) {
        const signer = new Wallet(config.polymarketPrivateKey);
        this.client = new ClobClient(
            config.polymarketHost,
            config.polymarketChainId,
            signer,
            undefined,
            config.polymarketSignatureType,
            config.polymarketFunderAddress,
        );
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
                    });

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
                },
                3,
                1_000,
            ),
        );
    }
}
