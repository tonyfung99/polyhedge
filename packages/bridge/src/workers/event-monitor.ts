import { Decoder, HypersyncClient } from '@envio-dev/hypersync-client';
import { createMonitoringConfig } from '../monitoring/config.js';
import { decodeStrategyPurchasedLog } from '../monitoring/decoder.js';
import { createLogger } from '../utils/logger.js';
import { StrategyPurchaseExecutor } from '../services/executor.js';
import { AppConfig } from '../config/env.js';
import { StrategyPurchasedEvent } from '../types.js';

const log = createLogger('event-monitor');

interface MonitorStats {
    eventsProcessed: number;
    eventsDetected: number;
    errorCount: number;
    lastEventTime?: Date;
    lastErrorTime?: Date;
    currentBlock: number;
    startTime: Date;
}

export class EventMonitorWorker {
    private client: HypersyncClient;
    private decoder: Decoder;
    private executor: StrategyPurchaseExecutor;
    private config: AppConfig;
    private monitoringConfig: ReturnType<typeof createMonitoringConfig>;
    private isRunning: boolean = false;
    private shouldStop: boolean = false;
    private testMode: boolean = false;
    private testModeInterval?: NodeJS.Timeout;

    // Statistics tracking
    private stats: MonitorStats = {
        eventsProcessed: 0,
        eventsDetected: 0,
        errorCount: 0,
        currentBlock: 0,
        startTime: new Date(),
    };

    constructor(appConfig: AppConfig) {
        this.config = appConfig;
        this.monitoringConfig = createMonitoringConfig(appConfig);
        this.client = HypersyncClient.new(this.monitoringConfig.clientConfig);
        this.decoder = Decoder.fromSignatures([
            'StrategyPurchased(uint256 indexed strategyId, address indexed user, uint256 grossAmount, uint256 netAmount)',
        ]);
        this.executor = new StrategyPurchaseExecutor(appConfig);
        this.stats.currentBlock = this.monitoringConfig.startBlock;
    }

    async start() {
        if (this.isRunning) {
            log.warn('Event monitor is already running');
            return;
        }

        this.isRunning = true;
        this.shouldStop = false;
        this.stats.startTime = new Date();

        log.info('Starting event monitor worker', {
            strategyManager: this.monitoringConfig.strategyManagerAddress,
            fromBlock: this.monitoringConfig.startBlock,
            testMode: this.testMode,
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

                    this.stats.eventsDetected++;
                    this.stats.lastEventTime = new Date();

                    log.info('StrategyPurchased event detected', {
                        strategyId: event.strategyId.toString(),
                        user: event.user,
                        netAmount: event.netAmount.toString(),
                        blockNumber: event.blockNumber,
                    });

                    try {
                        await this.executor.handleStrategyPurchase(event);
                        this.stats.eventsProcessed++;
                    } catch (error) {
                        this.stats.errorCount++;
                        this.stats.lastErrorTime = new Date();
                        log.error('Failed to execute strategy orders', {
                            error: (error as Error).message,
                            strategyId: event.strategyId.toString(),
                            user: event.user,
                        });
                    }
                }

                nextBlock = response.nextBlock;
                this.stats.currentBlock = nextBlock;

                await new Promise((resolve) => setTimeout(resolve, this.monitoringConfig.pollIntervalMs));
            } catch (error) {
                this.stats.errorCount++;
                this.stats.lastErrorTime = new Date();
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
        if (this.testModeInterval) {
            clearInterval(this.testModeInterval);
            this.testModeInterval = undefined;
            // In test mode, set isRunning to false immediately since there's no loop
            if (this.testMode) {
                this.isRunning = false;
            }
        }
    }

    getStatus() {
        const uptime = Date.now() - this.stats.startTime.getTime();
        return {
            isRunning: this.isRunning,
            shouldStop: this.shouldStop,
            testMode: this.testMode,
            stats: {
                ...this.stats,
                uptime: Math.floor(uptime / 1000), // seconds
                uptimeFormatted: this.formatUptime(uptime),
            },
            config: {
                strategyManager: this.monitoringConfig.strategyManagerAddress,
                startBlock: this.monitoringConfig.startBlock,
                pollIntervalMs: this.monitoringConfig.pollIntervalMs,
            },
        };
    }

    private formatUptime(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    enableTestMode() {
        this.testMode = true;
    }

    async startTestMode() {
        if (this.isRunning) {
            log.warn('Event monitor is already running');
            return;
        }

        this.isRunning = true;
        this.shouldStop = false;
        this.testMode = true;
        this.stats.startTime = new Date();

        log.info('Starting event monitor in TEST MODE', {
            interval: '10 seconds',
        });

        const simulateEvent = async () => {
            if (this.shouldStop) {
                if (this.testModeInterval) {
                    clearInterval(this.testModeInterval);
                }
                this.isRunning = false;
                return;
            }

            const mockEvent: StrategyPurchasedEvent = {
                strategyId: 1n,
                user: '0x1234567890123456789012345678901234567890',
                grossAmount: 1000000n,
                netAmount: 950000n,
                blockNumber: this.stats.currentBlock++,
                transactionHash: `0xtest${Date.now()}`,
                logIndex: 0,
            };

            this.stats.eventsDetected++;
            this.stats.lastEventTime = new Date();

            log.info('🧪 MOCK StrategyPurchased event detected', {
                strategyId: mockEvent.strategyId.toString(),
                user: mockEvent.user,
                netAmount: mockEvent.netAmount.toString(),
                blockNumber: mockEvent.blockNumber,
            });

            try {
                await this.executor.handleStrategyPurchase(mockEvent);
                this.stats.eventsProcessed++;
            } catch (error) {
                this.stats.errorCount++;
                this.stats.lastErrorTime = new Date();
                log.error('Failed to execute mock strategy orders', {
                    error: (error as Error).message,
                    strategyId: mockEvent.strategyId.toString(),
                });
            }
        };

        // Simulate first event immediately
        await simulateEvent();

        // Then continue every 10 seconds if not stopped
        if (!this.shouldStop) {
            this.testModeInterval = setInterval(simulateEvent, 10000);
        }
    }
}
