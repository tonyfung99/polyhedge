export const USDC_DECIMALS = 6n;
export const USDC_UNIT = 10n ** USDC_DECIMALS;

export type HexAddress = `0x${string}`;

export interface StrategyPolymarketOrder {
    marketId: string;
    isYes: boolean;
    priority: number;
    notionalBps: number;
    maxPriceBps: number;
}

export interface StrategyDefinition {
    id: bigint;
    name: string;
    conditionId?: string; // Polymarket condition ID (hex format) for market maturity checks
    polymarketOrders: StrategyPolymarketOrder[];
    totalNotionalBps: number;
}

export interface StrategyPurchasedEvent {
    strategyId: bigint;
    user: HexAddress;
    grossAmount: bigint;
    netAmount: bigint;
    logIndex?: number;
    blockNumber?: number;
    transactionHash?: string;
}

export interface PolymarketOrderIntent {
    tokenId: string;
    side: 'BUY' | 'SELL';
    quoteAmount: bigint;
    limitPriceBps: number;
    maxPriceBps: number;
}

export interface PolymarketExecutionResult {
    intent: PolymarketOrderIntent;
    status: 'fulfilled' | 'skipped' | 'failed';
    reason?: string;
    orderId?: string;
}

export interface ClosePositionRequest {
    strategyId: bigint;
    reason?: string;
}

export interface PolymarketPosition {
    tokenId: string;
    size: number; // Amount of tokens held
    side: 'YES' | 'NO';
}

export interface SettlementResult {
    strategyId: bigint;
    totalPayout: bigint;
    payoutPerUSDC: bigint;
    polymarketPositions: PolymarketPosition[];
    transactionHash?: string;
}


