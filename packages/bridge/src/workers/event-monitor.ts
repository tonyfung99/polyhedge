import { Decoder, HypersyncClient } from '@envio-dev/hypersync-client';
import { createMonitoringConfig } from '../monitoring/config.js';
import { decodeStrategyPurchasedLog } from '../monitoring/decoder.js';
import { createLogger } from '../utils/logger.js';
import { StrategyPurchaseExecutor } from '../services/executor.js';
import { AppConfig } from '../config/env.js';

const log = createLogger('event-monitor');

export class EventMonitorWorker {
    private client: HypersyncClient;
    private decoder: Decoder;
    private executor: StrategyPurchaseExecutor;
    private config: AppConfig;
    private monitoringConfig: ReturnType<typeof createMonitoringConfig>;
    private isRunning: boolean = false;
    private shouldStop: boolean = false;

    constructor(appConfig: AppConfig) {
        this.config = appConfig;
        this.monitoringConfig = createMonitoringConfig(appConfig);
        this.client = HypersyncClient.new(this.monitoringConfig.clientConfig);
        this.decoder = Decoder.fromSignatures([
            'StrategyPurchased(uint256 indexed strategyId, address indexed user, uint256 grossAmount, uint256 netAmount)',
        ]);
        this.executor = new StrategyPurchaseExecutor(appConfig);
    }

    async start() {
        if (this.isRunning) {
            log.warn('Event monitor is already running');
            return;
        }

        this.isRunning = true;
        this.shouldStop = false;

        log.info('Starting event monitor worker', {
            strategyManager: this.monitoringConfig.strategyManagerAddress,
            fromBlock: this.monitoringConfig.startBlock,
        });

        let nextBlock = this.monitoringConfig.startBlock;

        while (!this.shouldStop) {
            try {
                const query = {
                    fromBlock: nextBlock,
                    toBlock: nextBlock + this.monitoringConfig.batchSize,
                    logs: [
                        {
                            address: [this.monitoringConfig.strategyManagerAddress],
                            topics: [
                                [this.monitoringConfig.topicStrategyPurchased],
                                [],
                                [],
                            ],
                        },
                    ],
                    fieldSelection: {
                        log: this.monitoringConfig.fields,
                    },
                };

                const response = await this.client.get(query);
                const decodedLogs = await this.decoder.decodeLogs(response.data.logs);

                for (let i = 0; i < response.data.logs.length; i++) {
                    const logEntry = response.data.logs[i];
                    const decoded = decodedLogs[i];
                    const event = decodeStrategyPurchasedLog(logEntry, decoded);
                    if (!event) continue;

                    log.info('StrategyPurchased event detected', {
                        strategyId: event.strategyId.toString(),
                        user: event.user,
                        netAmount: event.netAmount.toString(),
                        blockNumber: event.blockNumber,
                    });

                    try {
                        await this.executor.handleStrategyPurchase(event);
                    } catch (error) {
                        log.error('Failed to execute strategy orders', {
                            error: (error as Error).message,
                            strategyId: event.strategyId.toString(),
                            user: event.user,
                        });
                    }
                }

                nextBlock = response.nextBlock;

                await new Promise((resolve) => setTimeout(resolve, this.monitoringConfig.pollIntervalMs));
            } catch (error) {
                log.error('Error in event monitor loop', {
                    error: (error as Error).message,
                    nextBlock,
                });
                // Wait before retrying to avoid tight error loops
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }
        }

        this.isRunning = false;
        log.info('Event monitor worker stopped');
    }

    stop() {
        log.info('Stopping event monitor worker...');
        this.shouldStop = true;
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            shouldStop: this.shouldStop,
        };
    }
}

