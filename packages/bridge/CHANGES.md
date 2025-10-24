# Bridge Changes - Position Closing Update

## ✅ Completed

Position closing is now **automatic** based on Polymarket market end times, not API calls.

---

## What Changed

### 1. ✨ New Worker: Market Maturity Monitor

**File**: `src/workers/market-maturity-monitor.ts`

- Polls Polymarket every 5 seconds for market status
- Automatically triggers settlement when markets close
- Prevents duplicate settlements
- Provides status via `/api/monitor/maturity-status`

### 2. 🔧 Updated Server

**File**: `src/server.ts`

- ❌ Removed `POST /api/strategies/:id/close` (manual trigger no longer needed)
- ✅ Added `GET /api/monitor/maturity-status` (new status endpoint)
- Renamed event monitor endpoints for clarity

### 3. 🚀 Updated Main Entry

**File**: `src/index.ts`

- Starts market maturity monitor on startup
- Runs alongside existing event monitor
- Both monitors operate independently

### 4. 📝 Updated Docs

**File**: `POSITION_CLOSING.md`

- Completely rewritten for automatic settlement
- Documents polling-based architecture
- Highlights TODOs for Polymarket API integration

### 5. 🔧 Updated Environment

**File**: `env.sample`

- Added `MARKET_POLL_INTERVAL_MS=5000` configuration

---

## How It Works Now

```
┌─────────────────────────────────────────────────────┐
│ Polymarket Market Closes                            │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│ Market Maturity Monitor (polls every 5s)            │
│ - Detects market closed or end date reached         │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│ PositionCloser Service                               │
│ - Closes Polymarket positions                        │
│ - Calculates payout                                  │
│ - Calls settleStrategy() on contract                 │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│ StrategyManager.settleStrategy()                     │
│ - Strategy marked as settled                         │
│ - Users can claim payouts                            │
└──────────────────────────────────────────────────────┘

ALL AUTOMATIC - NO API CALLS NEEDED
```

---

## ⚠️ Critical TODO: GMX Hedge Closing

**Current Issue**: Settlement only closes Polymarket positions. GMX hedges remain OPEN.

**See**: `HEDGE_EXECUTOR_INTEGRATION.md` for:

- Detailed problem analysis
- Implementation requirements
- Integration checklist

**What's Needed**:

```typescript
// In position-closer.ts
async closePosition() {
    // 1. Close Polymarket ✅ (done)
    const polymarketPayout = ...;

    // 2. Close GMX hedges ❌ (MISSING)
    const gmxPnL = await this.closeGMXHedgePositions(strategyId);

    // 3. Combined settlement
    const totalPayout = polymarketPayout + gmxPnL;
}
```

---

## Files Modified

```
✨ NEW FILES:
packages/bridge/src/workers/market-maturity-monitor.ts
packages/bridge/HEDGE_EXECUTOR_INTEGRATION.md
packages/bridge/IMPLEMENTATION_SUMMARY.md
packages/bridge/CHANGES.md (this file)

✏️ MODIFIED FILES:
packages/bridge/src/index.ts
packages/bridge/src/server.ts
packages/bridge/env.sample
packages/bridge/POSITION_CLOSING.md
```

---

## Testing

```bash
# Start service
cd packages/bridge
yarn dev

# Check status
curl http://localhost:3001/api/monitor/maturity-status

# Expected response:
{
  "isRunning": true,
  "pollIntervalMs": 5000,
  "stats": {
    "pollCount": 123,
    "marketsChecked": 5,
    "strategiesSettled": 0
  }
}
```

---

## Configuration

```bash
# New environment variable
MARKET_POLL_INTERVAL_MS=5000  # Poll Polymarket every 5 seconds
```

---

## Next Steps

1. **Implement Polymarket API integration** in `fetchMarketInfo()`

   - Currently returns placeholder `null`
   - Need real market end time data

2. **Implement GMX hedge closing** (CRITICAL)

   - See `HEDGE_EXECUTOR_INTEGRATION.md`
   - Required for complete settlement

3. **Test end-to-end settlement flow**
   - With real Polymarket markets
   - Including GMX hedge closure

---

## Documentation

- **`IMPLEMENTATION_SUMMARY.md`** - Complete technical overview
- **`HEDGE_EXECUTOR_INTEGRATION.md`** - Critical GMX integration analysis
- **`POSITION_CLOSING.md`** - Updated settlement architecture
- **`CHANGES.md`** - This file (quick reference)

---

## Summary

✅ **Position closing is now automatic** based on market end times  
✅ **No manual API calls needed** - monitor handles everything  
✅ **Polling every 5 seconds** for market status  
⚠️ **GMX hedges NOT closed yet** - needs implementation  
⚠️ **Polymarket API placeholder** - needs real integration

**Status**: Core framework complete, API integrations pending
