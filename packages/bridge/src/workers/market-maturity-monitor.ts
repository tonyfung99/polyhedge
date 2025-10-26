import { AppConfig } from '../config/env.js';
import { PositionCloser } from '../services/position-closer.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('market-maturity-monitor');

interface MarketInfo {
    marketId: string;
    endDate: string; // ISO timestamp
    active: boolean;
    closed: boolean;
}

/**
 * Monitors Polymarket markets for maturity/end time
 * Automatically triggers settlement when markets close
 */
export class MarketMaturityMonitor {
    private readonly config: AppConfig;
    private readonly positionCloser: PositionCloser;
    private readonly pollIntervalMs: number;
    private shouldStop: boolean = false;
    private isRunning: boolean = false;
    private trackedMarkets: Map<string, { strategyId: bigint; endDate: Date }> = new Map();
    private settledStrategies: Set<bigint> = new Set();

    // Stats
    private stats = {
        pollCount: 0,
        marketsChecked: 0,
        strategiesSettled: 0,
        lastPollTime: new Date(),
        errors: 0,
    };

    constructor(config: AppConfig, pollIntervalMs: number = 5000) {
        this.config = config;
        this.positionCloser = new PositionCloser(config);
        this.pollIntervalMs = pollIntervalMs;

        // Initialize tracked markets from strategy definitions
        this.initializeTrackedMarkets();
    }

    /**
     * Initialize tracked markets from strategy definitions
     */
    private initializeTrackedMarkets(): void {
        for (const [strategyId, strategy] of this.config.strategies.entries()) {
            // Use conditionId if available, otherwise fall back to first order's marketId (token ID)
            const marketId = strategy.conditionId || strategy.polymarketOrders[0]?.marketId;
            
            if (marketId && !this.trackedMarkets.has(marketId)) {
                // We'll fetch the actual end date from Polymarket API
                this.trackedMarkets.set(marketId, {
                    strategyId,
                    endDate: new Date(0), // Placeholder, will be updated on first poll
                });
                
                if (!strategy.conditionId) {
                    log.warn('Strategy missing conditionId, using token ID as fallback', {
                        strategyId,
                        strategyName: strategy.name,
                        marketId,
                    });
                }
            }
        }

        log.info('Initialized market tracking', {
            marketsTracked: this.trackedMarkets.size,
            strategies: this.config.strategies.size,
        });
    }

    /**
     * Start monitoring market maturity
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            log.warn('Market maturity monitor already running');
            return;
        }

        this.isRunning = true;
        this.shouldStop = false;

        log.info('Starting market maturity monitor', {
            pollIntervalMs: this.pollIntervalMs,
            marketsTracked: this.trackedMarkets.size,
        });

        while (!this.shouldStop) {
            try {
                await this.pollMarkets();
                this.stats.pollCount++;
                this.stats.lastPollTime = new Date();
            } catch (error) {
                log.error('Error polling markets', {
                    error: (error as Error).message,
                    stack: (error as Error).stack,
                });
                this.stats.errors++;
            }

            // Wait for next poll interval
            if (!this.shouldStop) {
                await this.sleep(this.pollIntervalMs);
            }
        }

        this.isRunning = false;
        log.info('Market maturity monitor stopped');
    }

    /**
     * Poll Polymarket markets for maturity status
     */
    private async pollMarkets(): Promise<void> {
        const now = new Date();
        let marketsChecked = 0;

        for (const [marketId, trackingInfo] of this.trackedMarkets.entries()) {
            try {
                // Skip if strategy already settled
                if (this.settledStrategies.has(trackingInfo.strategyId)) {
                    continue;
                }

                marketsChecked++;

                // Fetch market info from Polymarket
                const marketInfo = await this.fetchMarketInfo(marketId);

                // Update end date if we got it from API
                if (marketInfo && marketInfo.endDate) {
                    trackingInfo.endDate = new Date(marketInfo.endDate);
                }

                // Check if market has closed
                if (marketInfo && marketInfo.closed) {
                    log.info('Market closed, triggering settlement', {
                        marketId,
                        strategyId: trackingInfo.strategyId.toString(),
                        endDate: trackingInfo.endDate.toISOString(),
                    });

                    await this.settleStrategy(trackingInfo.strategyId);
                } else if (trackingInfo.endDate > new Date(0) && now >= trackingInfo.endDate) {
                    // End date has passed, check if really closed
                    log.info('Market end date reached, checking status', {
                        marketId,
                        strategyId: trackingInfo.strategyId.toString(),
                        endDate: trackingInfo.endDate.toISOString(),
                    });

                    // Market should be closed, trigger settlement
                    await this.settleStrategy(trackingInfo.strategyId);
                }
            } catch (error) {
                log.error('Error checking market', {
                    marketId,
                    error: (error as Error).message,
                });
            }
        }

        this.stats.marketsChecked = marketsChecked;
    }

    /**
     * Fetch market information from Polymarket CLOB API
     * Based on: packages/python/scanner/bridge_polymarket_client.py
     */
    private async fetchMarketInfo(marketId: string): Promise<MarketInfo | null> {
        try {
            log.debug('Fetching market info', { marketId });

            // Query Polymarket CLOB API for market data
            // Reference: https://docs.polymarket.com/#get-market
            const url = `${this.config.polymarketHost}/markets/${marketId}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                log.warn('Failed to fetch market info from Polymarket', {
                    marketId,
                    status: response.status,
                    statusText: response.statusText,
                });
                return null;
            }

            const data = await response.json();
            
            // Parse market data
            // The API returns market info with endTime (unix timestamp), active, closed status
            const endTime = data.endTime || data.end_time || data.end_date_iso;
            
            // Convert endTime to ISO string
            let endDate: string;
            if (typeof endTime === 'number') {
                // Unix timestamp (seconds)
                endDate = new Date(endTime * 1000).toISOString();
            } else if (typeof endTime === 'string') {
                // Already ISO string
                endDate = endTime;
            } else {
                log.warn('Market endTime not found', { marketId, data });
                return null;
            }

            const marketInfo: MarketInfo = {
                marketId: data.id || data.tokenId || marketId,
                endDate: endDate,
                active: data.active !== undefined ? data.active : true,
                closed: data.closed !== undefined ? data.closed : false,
            };

            log.debug('Market info fetched successfully', {
                marketId,
                endDate: marketInfo.endDate,
                active: marketInfo.active,
                closed: marketInfo.closed,
            });

            return marketInfo;
        } catch (error) {
            log.error('Failed to fetch market info from Polymarket', {
                marketId,
                error: (error as Error).message,
                stack: (error as Error).stack,
            });
            return null;
        }
    }

    /**
     * Settle a strategy by calling position closer
     */
    private async settleStrategy(strategyId: bigint): Promise<void> {
        // Check if already settled
        if (this.settledStrategies.has(strategyId)) {
            log.debug('Strategy already settled, skipping', {
                strategyId: strategyId.toString(),
            });
            return;
        }

        try {
            log.info('Settling strategy', {
                strategyId: strategyId.toString(),
            });

            // Use PositionCloser to close positions and settle on-chain
            const result = await this.positionCloser.closePosition({
                strategyId,
                reason: 'Market maturity reached',
            });

            // Mark as settled
            this.settledStrategies.add(strategyId);
            this.stats.strategiesSettled++;

            log.info('Strategy settled successfully', {
                strategyId: strategyId.toString(),
                transactionHash: result.transactionHash,
                payoutPerUSDC: result.payoutPerUSDC.toString(),
                totalPayout: result.totalPayout.toString(),
            });
        } catch (error) {
            log.error('Failed to settle strategy', {
                strategyId: strategyId.toString(),
                error: (error as Error).message,
                stack: (error as Error).stack,
            });
            throw error;
        }
    }

    /**
     * Stop monitoring
     */
    stop(): void {
        log.info('Stopping market maturity monitor...');
        this.shouldStop = true;
    }

    /**
     * Get monitor status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            pollIntervalMs: this.pollIntervalMs,
            stats: {
                ...this.stats,
                lastPollTime: this.stats.lastPollTime.toISOString(),
            },
            trackedMarkets: this.trackedMarkets.size,
            settledStrategies: this.settledStrategies.size,
        };
    }

    /**
     * Sleep helper
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

