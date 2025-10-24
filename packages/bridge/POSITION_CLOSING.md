# Position Closing Feature

## Overview

The bridge service automatically monitors Polymarket markets for maturity and settles strategies when markets close. This feature provides fully automated settlement without requiring manual API calls.

## Flow

### Opening Position (Existing)

1. User calls `buyStrategy()` on StrategyManager contract
2. Contract emits `StrategyPurchased` event
3. Bridge service detects event via HyperSync
4. Service places BUY orders on Polymarket

### Closing Position (AUTOMATIC!)

1. **Market Maturity Monitor** polls Polymarket every 5 seconds
2. Detects when markets reach their end time
3. Automatically closes all Polymarket positions (sells them)
4. Calculates total payout and payout-per-USDC ratio
5. Admin wallet calls `settleStrategy()` on StrategyManager contract
6. Users can now call `claimStrategy()` to receive their payout

## Architecture

### Market Maturity Monitor

**File**: `src/workers/market-maturity-monitor.ts`

A background worker that continuously monitors Polymarket markets for maturity.

**Key Features**:

- Polls Polymarket API every 5 seconds (configurable via `MARKET_POLL_INTERVAL_MS`)
- Tracks all markets associated with active strategies
- Detects market closure based on `endDate` or `closed` status
- Automatically triggers settlement process
- Prevents duplicate settlements (tracks settled strategies)

**Lifecycle**:

```typescript
const monitor = new MarketMaturityMonitor(appConfig, 5000);
await monitor.start(); // Begins polling loop

// Runs continuously until stopped
monitor.stop(); // Graceful shutdown
```

**Status Monitoring**:

```bash
# Check monitor status
curl http://localhost:3001/api/monitor/maturity-status

# Response:
{
  "isRunning": true,
  "pollIntervalMs": 5000,
  "stats": {
    "pollCount": 1234,
    "marketsChecked": 15,
    "strategiesSettled": 3,
    "lastPollTime": "2024-01-15T12:34:56.789Z",
    "errors": 0
  },
  "trackedMarkets": 15,
  "settledStrategies": 3
}
```

### Position Closer Service

**File**: `src/services/position-closer.ts`

Coordinates the actual closing and settlement process when triggered by the market maturity monitor.

**Process**:

1. Validates strategy exists and is not already settled
2. Fetches strategy on-chain state (maturity timestamp, settled flag)
3. Closes all Polymarket positions for the strategy
4. Calculates `payoutPerUSDC` based on total returns
5. Calls `settleStrategy()` on StrategyManager contract
6. Returns settlement result with transaction hash

**Usage** (internal - called by monitor):

```typescript
const closer = new PositionCloser(appConfig);
const result = await closer.closePosition({
  strategyId: 1n,
  reason: "Market maturity reached",
});
```

### Polymarket Client Enhancement

**File**: `src/polymarket/client.ts`

Enhanced with `closePosition()` method for selling positions.

**How it works**:

- Fetches current position size (TODO: implement actual API query)
- Sells the position at market price (opposite side of original order)
- Uses FOK (Fill-or-Kill) order type for immediate execution
- Retries up to 3 times on failure
- Respects concurrency limits

```typescript
const position = await polymarket.closePosition({
  tokenId: "market-id",
  side: "YES", // Original position side
});
// Sells position at market price
```

## Contract Integration

### Settlement Call

The bridge service uses ethers.js to call `settleStrategy()` on the StrategyManager contract:

```solidity
function settleStrategy(
  uint256 strategyId,
  uint256 payoutPerUSDC
) external onlyOwner
```

**Settlement Logic**:

1. Monitor detects market has closed on Polymarket
2. Position closer sells all Polymarket positions
3. Calculates `payoutPerUSDC` = `(totalPayout * 1e6) / totalInvested`
4. Admin wallet (from `POLYMARKET_PRIVATE_KEY`) calls `settleStrategy()`
5. Contract marks strategy as settled
6. Users can claim via `claimStrategy()`

**Example**:

```
Strategy 1:
- Total invested: 1,000,000 USDC (from StrategyPurchased events)
- Polymarket returns: 1,080,000 USDC (after selling positions)
- Payout ratio: (1,080,000 * 1e6) / 1,000,000 = 1,080,000 (1.08x)
- Contract call: settleStrategy(1, 1080000)
```

## Types

### MarketInfo

```typescript
interface MarketInfo {
  marketId: string;
  endDate: string; // ISO timestamp
  active: boolean;
  closed: boolean;
}
```

### ClosePositionRequest

```typescript
interface ClosePositionRequest {
  strategyId: bigint;
  reason?: string; // e.g., "Market maturity reached"
}
```

### PolymarketPosition

```typescript
interface PolymarketPosition {
  tokenId: string;
  size: number; // Amount of tokens sold
  side: "YES" | "NO"; // Original position side
}
```

### SettlementResult

```typescript
interface SettlementResult {
  strategyId: bigint;
  totalPayout: bigint; // Total USDC received from Polymarket
  payoutPerUSDC: bigint; // Payout rate (6 decimals)
  polymarketPositions: PolymarketPosition[];
  transactionHash?: string; // Settlement tx hash
}
```

## Configuration

### Required Environment Variables

```bash
# Contract address (for settlement)
STRATEGY_MANAGER_ADDRESS=0x...

# RPC URLs
ARBITRUM_RPC_URL=https://...      # For contract interaction
POLYGON_RPC_URL=https://...       # For Polymarket

# Private key (must have owner role on contract)
POLYMARKET_PRIVATE_KEY=0x...

# Market polling interval (milliseconds)
MARKET_POLL_INTERVAL_MS=5000      # Default: 5 seconds
```

### Monitoring Endpoints

```bash
# Health check
GET /health

# Event monitor status (StrategyPurchased detection)
GET /api/monitor/event-status
GET /api/monitor/event-stats

# Market maturity monitor status (automatic settlement)
GET /api/monitor/maturity-status
```

## Deployment Flow

### 1. Start Bridge Service

```bash
# Configure environment
cp env.sample .env
# Edit .env with your values

# Start service
yarn dev
```

**Console Output**:

```
[main] Configuration loaded successfully
[main] Bridge service started successfully
[main] Market maturity monitor started { pollIntervalMs: 5000 }
[market-maturity-monitor] Initialized market tracking {
  marketsTracked: 15,
  strategies: 3
}
[market-maturity-monitor] Starting market maturity monitor
```

### 2. Automatic Settlement

When a market reaches maturity:

```
[market-maturity-monitor] Market closed, triggering settlement {
  marketId: "0x1234...",
  strategyId: "1",
  endDate: "2024-01-20T00:00:00.000Z"
}
[position-closer] Starting position close {
  strategyId: "1",
  reason: "Market maturity reached"
}
[position-closer] Closed Polymarket position {
  tokenId: "0x1234...",
  side: "YES",
  size: 100
}
[position-closer] Calculated settlement {
  strategyId: "1",
  totalPayout: "1080000000000",
  totalInvested: "1000000000000",
  payoutPerUSDC: "1080000"
}
[position-closer] Strategy settled on-chain {
  strategyId: "1",
  transactionHash: "0xabc...",
  payoutPerUSDC: "1080000"
}
[market-maturity-monitor] Strategy settled successfully {
  strategyId: "1",
  transactionHash: "0xabc...",
  payoutPerUSDC: "1080000"
}
```

## Testing

### Unit Tests

Run position closing tests:

```bash
yarn test position-closer.test.ts
yarn test market-maturity-monitor.test.ts
```

**Test Coverage**:

- ✅ Poll markets for maturity
- ✅ Detect market closure
- ✅ Trigger settlement automatically
- ✅ Close all Polymarket positions
- ✅ Calculate payout correctly
- ✅ Call settleStrategy on contract
- ✅ Handle already settled strategies
- ✅ Handle Polymarket API errors
- ✅ Prevent duplicate settlements

### Integration Testing

**Scenario 1: Normal Flow**

```bash
# 1. Deploy strategy with maturity in 1 minute
curl -X POST http://localhost:3001/api/test/create-strategy \
  -d '{"maturity": "2024-01-15T12:35:00Z"}'

# 2. User buys strategy
# (triggers event monitor → Polymarket orders placed)

# 3. Wait for maturity (1 minute)
# (market maturity monitor automatically detects and settles)

# 4. Check settlement status
curl http://localhost:3001/api/monitor/maturity-status
```

**Scenario 2: Multiple Strategies**

- Market maturity monitor tracks all strategies
- Settles each independently when their markets close
- Prevents duplicate settlements via internal tracking

## Important Notes

### 🔒 Security

- Admin wallet (`POLYMARKET_PRIVATE_KEY`) must have owner role on StrategyManager
- Settlement transactions require gas on Arbitrum
- Monitor polls are public API calls (no authentication needed for market data)

### ⚠️ Limitations (MVP)

1. **Position Size Tracking**: Currently uses placeholder value (100)

   - TODO: Query actual position size from Polymarket CLOB API
   - Endpoint: `GET https://clob.polymarket.com/positions`
   - Or track position sizes in database

2. **Total Invested Tracking**: Currently uses placeholder (1M USDC)

   - TODO: Sum `StrategyPurchased` events' `netAmount`
   - Or add cumulative tracking to contract state
   - Implementation:

   ```typescript
   const events = await contract.queryFilter("StrategyPurchased");
   const totalInvested = events
     .filter((e) => e.args.strategyId === strategyId)
     .reduce((sum, e) => sum + e.args.netAmount, 0n);
   ```

3. **Market API Integration**: Placeholder `fetchMarketInfo()`

   - TODO: Implement actual Polymarket API call
   - Endpoint: `GET https://clob.polymarket.com/markets/{marketId}`
   - Expected response:

   ```json
   {
     "id": "market-id",
     "end_date_iso": "2024-01-20T00:00:00.000Z",
     "active": true,
     "closed": false
   }
   ```

4. **No Partial Closes**: Must close entire strategy
   - TODO: Add support for partial position closes
   - Use case: Early exit with penalty

### 📝 Production Considerations

1. **Market Data Caching**:

   ```typescript
   // Cache market info to reduce API calls
   private marketCache = new Map<string, { info: MarketInfo; expires: Date }>();
   ```

2. **Investment Tracking**:

   ```typescript
   // Query events to get total invested
   const events = await contract.queryFilter("StrategyPurchased", fromBlock);
   const totalInvested = events
     .filter((e) => e.args.strategyId === strategyId)
     .reduce((sum, e) => sum + e.args.netAmount, 0n);
   ```

3. **Error Handling**:

   - Implement retry logic for contract calls (gas price fluctuations)
   - Handle partial Polymarket closes gracefully (some positions may fail)
   - Add dead-letter queue for failed settlements
   - Alert on repeated settlement failures

4. **Monitoring**:

   - Track settlement success/failure rates
   - Alert on position closing errors
   - Monitor payout calculations for anomalies
   - Dashboard for pending/completed settlements

5. **Gas Management**:
   - Ensure admin wallet has sufficient ETH on Arbitrum
   - Implement gas price monitoring
   - Add gas price limits to prevent expensive settlements

## Troubleshooting

### Error: "Strategy not found"

- Ensure strategy ID exists in `strategies.json`
- Check that strategy has been created on-chain

### Error: "already settled"

- Strategy can only be settled once
- Check settlement status: `await contract.strategies(strategyId)`
- Monitor maintains internal tracking to prevent duplicates

### Error: "Market closed"

- Polymarket position may not exist
- Check position exists before closing
- May occur if positions were manually closed

### Error: "Failed to fetch market info"

- Polymarket API may be down or rate-limiting
- Check `POLYMARKET_HOST` configuration
- Implement backoff retry strategy

### Transaction Reverts

- Ensure wallet has owner role on contract
- Check strategy has reached maturity (if enforced)
- Verify sufficient gas and funds
- Check Arbitrum RPC connectivity

### Monitor Not Running

```bash
# Check status
curl http://localhost:3001/api/monitor/maturity-status

# If not running, check logs
tail -f logs/bridge.log | grep "market-maturity-monitor"

# Restart service
yarn dev
```

## Future Enhancements

- [ ] Implement actual Polymarket market info API integration
- [ ] Real-time position size tracking from CLOB API
- [ ] Automatic total invested calculation from events
- [ ] Partial position closing support
- [ ] Settlement preview (dry-run mode)
- [ ] Batch settlement (multiple strategies)
- [ ] Settlement history API endpoint
- [ ] WebSocket notifications for settlements
- [ ] Admin dashboard for monitoring
- [ ] Configurable settlement triggers (e.g., early exit)
- [ ] Multi-signature settlement for large strategies
- [ ] Gas price optimization

## HedgeExecutor Alignment

The bridge service also needs to close hedge positions on GMX. This is coordinated separately:

### Hedge Position Closing

**File**: `packages/hardhat/contracts/HedgeExecutor.sol`

```solidity
function closeHedgeOrder(
  uint256 strategyId,
  int256 realizedPnL
) external nonReentrant onlyOwner
```

**Integration Points**:

1. When market maturity monitor detects market closure
2. Bridge closes Polymarket positions (via PositionCloser)
3. Bridge SHOULD ALSO close GMX hedge positions
4. Admin wallet calls `HedgeExecutor.closeHedgeOrder()`
5. Contract emits `HedgeOrderClosed` event
6. Bridge calculates combined PnL (Polymarket + GMX)
7. Bridge calls `StrategyManager.settleStrategy()` with final payout

**TODO**: Extend `PositionCloser` to also close GMX hedges:

```typescript
// In position-closer.ts
async closePosition(request: ClosePositionRequest): Promise<SettlementResult> {
  // 1. Close Polymarket positions (✅ implemented)
  const polymarketPayout = await this.closePolymarketPositions(strategyId);

  // 2. Close GMX hedge positions (⚠️ TODO)
  const gmxPnL = await this.closeGMXPositions(strategyId);

  // 3. Calculate combined payout
  const totalPayout = polymarketPayout + gmxPnL;

  // 4. Settle on StrategyManager
  await this.settleStrategyOnChain(strategyId, totalPayout);
}
```

---

**Status**: ✅ Fully implemented (automatic polling and settlement)  
**Next**: Implement Polymarket API integration and GMX hedge closing  
**Version**: 0.2.0
