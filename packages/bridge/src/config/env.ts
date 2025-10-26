import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { StrategyDefinition, StrategyPolymarketOrder } from '../types.js';

const polymarketOrderSchema = z.object({
    marketId: z.string(),
    outcome: z.enum(['YES', 'NO']).default('YES'),
    notionalBps: z.coerce.number().int().min(0).max(10_000),
    maxPriceBps: z.coerce.number().int().min(1).max(10_000).default(9_500),
    priority: z.coerce.number().int().min(0).default(0),
});

const strategySchema = z.object({
    id: z.coerce.bigint(),
    name: z.string().min(1),
    conditionId: z.string().optional(), // Polymarket condition ID for market maturity checks
    polymarketOrders: z.array(polymarketOrderSchema).min(1),
});

const strategiesFileSchema = z.object({
    strategies: z.array(strategySchema),
});

const appConfigSchema = z.object({
    logLevel: z.string().optional(),
    hypersyncEndpoint: z.string().url(),
    hypersyncFromBlock: z.coerce.number().int().nonnegative().default(0),
    hypersyncPollIntervalMs: z.coerce.number().int().positive().default(5_000),
    hypersyncBatchSize: z.coerce.number().int().positive().default(500),
    strategyManagerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    arbitrumRpcUrl: z.string().url(),
    polygonRpcUrl: z.string().url(),
    maxOrderConcurrency: z.coerce.number().int().positive().default(2),
    strategiesPath: z.string().optional(),
    polymarketHost: z.string().url().default('https://clob.polymarket.com'),
    polymarketChainId: z.coerce.number().int().default(137),
    // Vincent SDK configuration (preferred for hackathon)
    useVincent: z.coerce.boolean().default(false),
    vincentAppId: z.string().optional(),
    litNetwork: z.enum(['datil', 'datil-dev', 'datil-test']).default('datil-dev'),
    // Fallback: direct private key (kept for backward compatibility)
    polymarketPrivateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
    polymarketSignatureType: z.coerce.number().int().nonnegative().optional(),
    polymarketFunderAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

export type AppConfig = z.infer<typeof appConfigSchema> & {
    strategies: Map<bigint, StrategyDefinition>;
};

export function loadAppConfig(): AppConfig {
    const parsed = appConfigSchema.parse({
        logLevel: process.env.LOG_LEVEL,
        hypersyncEndpoint: requireEnv('HYPERSYNC_ENDPOINT'),
        hypersyncFromBlock: process.env.HYPERSYNC_FROM_BLOCK,
        hypersyncPollIntervalMs: process.env.HYPERSYNC_POLL_INTERVAL_MS,
        strategyManagerAddress: requireEnv('STRATEGY_MANAGER_ADDRESS'),
        arbitrumRpcUrl: requireEnv('ARBITRUM_RPC_URL'),
        polygonRpcUrl: requireEnv('POLYGON_RPC_URL'),
        maxOrderConcurrency: process.env.MAX_ORDER_CONCURRENCY,
        strategiesPath: process.env.STRATEGY_DEFINITIONS_PATH,
        hypersyncBatchSize: process.env.HYPERSYNC_BATCH_SIZE,
        polymarketHost: process.env.POLYMARKET_HOST,
        polymarketChainId: process.env.POLYMARKET_CHAIN_ID,
        // Vincent configuration
        useVincent: process.env.USE_VINCENT,
        vincentAppId: process.env.VINCENT_APP_ID,
        litNetwork: process.env.LIT_NETWORK,
        // Fallback to private key
        polymarketPrivateKey: process.env.POLYMARKET_PRIVATE_KEY,
        polymarketSignatureType: process.env.POLYMARKET_SIGNATURE_TYPE,
        polymarketFunderAddress: process.env.POLYMARKET_FUNDER_ADDRESS,
    });

    // Validate: Must have either Vincent enabled or private key
    if (parsed.useVincent) {
        if (!parsed.vincentAppId) {
            throw new Error('VINCENT_APP_ID is required when USE_VINCENT=true');
        }
    } else {
        if (!parsed.polymarketPrivateKey) {
            throw new Error('POLYMARKET_PRIVATE_KEY is required when USE_VINCENT=false');
        }
    }

    const strategies = loadStrategies(parsed.strategiesPath);

    return {
        ...parsed,
        strategies,
    };
}

function loadStrategies(pathOverride?: string): Map<bigint, StrategyDefinition> {
    const filePath = resolve(process.cwd(), pathOverride ?? 'strategies.json');
    const raw = readFile(filePath);
    const parsed = strategiesFileSchema.parse(JSON.parse(raw));

    const entries = parsed.strategies.map((strategy) => {
        const orders: StrategyPolymarketOrder[] = strategy.polymarketOrders
            .sort((a, b) => a.priority - b.priority)
            .map((order) => ({
                marketId: order.marketId,
                isYes: order.outcome === 'YES',
                notionalBps: order.notionalBps,
                maxPriceBps: order.maxPriceBps,
                priority: order.priority,
            }));

        const totalBps = orders.reduce((acc, order) => acc + order.notionalBps, 0);
        if (totalBps > 10_000) {
            throw new Error(`Strategy ${strategy.id.toString()} exceeds 100% notional allocation (sum ${totalBps})`);
        }

        const definition: StrategyDefinition = {
            id: strategy.id,
            name: strategy.name,
            conditionId: strategy.conditionId,
            polymarketOrders: orders,
            totalNotionalBps: totalBps,
        };

        return [definition.id, definition] as const;
    });

    return new Map(entries);
}

function readFile(filePath: string): string {
    try {
        return readFileSync(filePath, 'utf8');
    } catch (error) {
        throw new Error(`Unable to read strategies file at ${filePath}: ${(error as Error).message}`);
    }
}

function requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Environment variable ${key} is required`);
    }
    return value;
}
