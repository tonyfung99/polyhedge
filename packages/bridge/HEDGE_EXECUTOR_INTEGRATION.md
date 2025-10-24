# HedgeExecutor Integration Analysis

## Status: ⚠️ PARTIAL INTEGRATION - Action Required

The bridge service currently **only closes Polymarket positions** during settlement. It does **NOT** close GMX hedge positions, which creates an incomplete settlement process.

---

## Current Integration Status

### ✅ What's Working

1. **Event Detection**

   - Bridge listens for `StrategyPurchased` events from StrategyManager
   - When user buys strategy, StrategyManager automatically calls HedgeExecutor
   - HedgeExecutor creates GMX orders on-chain (same transaction)

2. **Hedge Order Creation**
   - StrategyManager's `buyStrategy()` triggers hedge orders via:
   ```solidity
   for (uint256 i = 0; i < s.details.hedgeOrders.length; i++) {
       hedgeExecutor.createHedgeOrder(
           strategyId,
           msg.sender,
           ho.asset,
           ho.isLong,
           ho.amount,
           ho.maxSlippageBps
       );
   }
   ```
   - HedgeExecutor places GMX perpetual orders automatically
   - Events emitted: `HedgeOrderCreated`, `HedgeOrderExecuted`

### ❌ What's Missing

1. **GMX Hedge Position Closing**

   - Market maturity monitor only closes Polymarket positions
   - GMX hedge positions remain OPEN after settlement
   - This leaves strategies unhedged and exposes users to risk

2. **Combined PnL Calculation**

   - Settlement only considers Polymarket returns
   - GMX hedge PnL is IGNORED in settlement calculation
   - `payoutPerUSDC` is incomplete

3. **HedgeExecutor Event Monitoring**
   - Bridge does NOT listen to HedgeExecutor events
   - No tracking of hedge order execution status
   - No monitoring of hedge order closure

---

## Required Architecture

### Complete Settlement Flow

```
Market Closes
    │
    ▼
Market Maturity Monitor Detects
    │
    ├─> Close Polymarket Positions ✅ (implemented)
    │   └─> Get Polymarket PnL
    │
    └─> Close GMX Hedge Positions ❌ (MISSING)
        └─> Get GMX PnL
    │
    ▼
Calculate Combined PnL
    totalPnL = polymarketPnL + gmxPnL
    │
    ▼
Settle Strategy on StrategyManager
    payoutPerUSDC = (totalPnL * 1e6) / totalInvested
    │
    ▼
Users Claim Payouts
```

---

## HedgeExecutor Contract Interface

### closeHedgeOrder Function

```solidity
/**
 * @notice Close hedge order at maturity
 * @param strategyId Strategy ID to close
 * @param realizedPnL Realized profit/loss from GMX position
 */
function closeHedgeOrder(
    uint256 strategyId,
    int256 realizedPnL
) external nonReentrant onlyOwner
```

**Current Implementation** (line 188 of HedgeExecutor.sol):

```solidity
function closeHedgeOrder(uint256 strategyId, int256 realizedPnL) external nonReentrant onlyOwner {
    require(!ordersClosed[strategyId], "already closed");

    HedgeOrder storage hedge = hedgeOrders[strategyId];
    require(hedge.amount > 0, "order not found");

    // TODO: Call GMX.closePosition() via ExchangeRouter
    // For now, mark as closed
    ordersClosed[strategyId] = true;
    emit HedgeOrderClosed(strategyId, uint256(realizedPnL));
}
```

**Issues**:

1. Commented TODO - doesn't actually close GMX position
2. Requires manual PnL input (should query from GMX)
3. Only callable by owner (bridge wallet)

---

## Required Bridge Changes

### 1. Extend PositionCloser Service

**File**: `src/services/position-closer.ts`

**Current**:

```typescript
async closePosition(request: ClosePositionRequest): Promise<SettlementResult> {
    // 1. Close Polymarket positions ✅
    const polymarketPayout = await this.closePolymarketPositions(strategyId);

    // 2. Calculate payout
    const payoutPerUSDC = (totalPayout * 1e6) / totalInvested;

    // 3. Settle on StrategyManager
    await this.contract.settleStrategy(strategyId, payoutPerUSDC);
}
```

**Required**:

```typescript
async closePosition(request: ClosePositionRequest): Promise<SettlementResult> {
    // 1. Close Polymarket positions ✅
    const polymarketPayout = await this.closePolymarketPositions(strategyId);

    // 2. Close GMX hedge positions ❌ NEW
    const gmxPnL = await this.closeGMXHedgePositions(strategyId);

    // 3. Calculate combined payout
    const totalPayout = polymarketPayout + gmxPnL;
    const payoutPerUSDC = (totalPayout * 1e6) / totalInvested;

    // 4. Settle on StrategyManager
    await this.contract.settleStrategy(strategyId, payoutPerUSDC);
}
```

### 2. Add GMX Hedge Closing Logic

**New Method**:

```typescript
private async closeGMXHedgePositions(strategyId: bigint): Promise<bigint> {
    const strategy = this.config.strategies.get(strategyId);
    if (!strategy) {
        throw new Error(`Strategy ${strategyId} not found`);
    }

    let totalGMXPnL = 0n;

    // Get HedgeExecutor contract
    const hedgeExecutorAddress = process.env.HEDGE_EXECUTOR_ADDRESS || '';
    const hedgeExecutor = new Contract(
        hedgeExecutorAddress,
        HEDGE_EXECUTOR_ABI,
        this.wallet
    );

    // Get hedge order details
    const hedgeOrder = await hedgeExecutor.getHedgeOrder(strategyId);

    if (hedgeOrder.amount > 0) {
        // Query GMX for position PnL
        const gmxPnL = await this.queryGMXPositionPnL(
            hedgeOrder.gmxOrderKey
        );

        // Close position on HedgeExecutor
        const tx = await hedgeExecutor.closeHedgeOrder(
            strategyId,
            gmxPnL
        );
        await tx.wait();

        totalGMXPnL = gmxPnL;

        log.info('Closed GMX hedge position', {
            strategyId: strategyId.toString(),
            gmxOrderKey: hedgeOrder.gmxOrderKey,
            realizedPnL: gmxPnL.toString(),
        });
    }

    return totalGMXPnL;
}
```

### 3. Add HedgeExecutor ABI

```typescript
const HEDGE_EXECUTOR_ABI = [
  "function getHedgeOrder(uint256 strategyId) view returns (uint256 strategyId, address user, string asset, bool isLong, uint256 amount, uint256 maxSlippageBps, bool executed, bytes32 gmxOrderKey)",
  "function closeHedgeOrder(uint256 strategyId, int256 realizedPnL) external",
  "function isOrderExecuted(uint256 strategyId) view returns (bool)",
  "function ordersClosed(uint256 strategyId) view returns (bool)",
];
```

### 4. Add GMX Position Query

```typescript
private async queryGMXPositionPnL(gmxOrderKey: bytes32): Promise<bigint> {
    // TODO: Query GMX contracts for position PnL
    // Options:
    // 1. Query GMX Reader contract
    // 2. Query GMX Datastore
    // 3. Use GMX SDK

    // Example (simplified):
    // const gmxReader = new Contract(GMX_READER_ADDRESS, GMX_READER_ABI, provider);
    // const position = await gmxReader.getPositionInfo(
    //     market,
    //     user,
    //     collateralToken,
    //     isLong
    // );
    // return position.pnl;

    log.warn('GMX PnL query not implemented, using placeholder');
    return 0n; // Placeholder
}
```

---

## Environment Variables Required

Add to `env.sample`:

```bash
# HedgeExecutor contract address (Arbitrum)
HEDGE_EXECUTOR_ADDRESS=0x...

# GMX contract addresses (for PnL queries)
GMX_READER_ADDRESS=0x...
GMX_DATASTORE_ADDRESS=0x...
```

---

## Event Monitoring (Optional Enhancement)

The bridge could optionally monitor HedgeExecutor events for better tracking:

### Add to Event Monitor

```typescript
// In event-monitor.ts
this.decoder = Decoder.fromSignatures([
  "StrategyPurchased(uint256 indexed strategyId, address indexed user, uint256 grossAmount, uint256 netAmount)",
  // Add HedgeExecutor events:
  "HedgeOrderCreated(uint256 indexed strategyId, address indexed user, string asset, bool isLong, uint256 amount, bytes32 gmxOrderKey)",
  "HedgeOrderExecuted(uint256 indexed strategyId, bytes32 gmxOrderKey)",
  "HedgeOrderClosed(uint256 indexed strategyId, uint256 realizedPnL)",
]);
```

**Use Cases**:

- Track hedge execution confirmation
- Monitor hedge closure for dashboard updates
- Verify both Polymarket and GMX orders executed
- Alert on hedge execution failures

---

## Integration Checklist

### Required (Critical)

- [ ] Add `closeGMXHedgePositions()` to PositionCloser
- [ ] Add HedgeExecutor ABI constants
- [ ] Implement GMX position PnL query
- [ ] Call `HedgeExecutor.closeHedgeOrder()` during settlement
- [ ] Combine Polymarket + GMX PnL in settlement calculation
- [ ] Add `HEDGE_EXECUTOR_ADDRESS` to environment config
- [ ] Test end-to-end settlement with both legs

### Optional (Enhancement)

- [ ] Monitor HedgeExecutor events for tracking
- [ ] Add hedge execution status to dashboard
- [ ] Implement retry logic for hedge closure
- [ ] Add hedge closure preview (dry-run)
- [ ] Track hedge PnL history

---

## HedgeExecutor Contract TODO

**File**: `packages/hardhat/contracts/HedgeExecutor.sol`

The contract itself also needs completion:

```solidity
function closeHedgeOrder(uint256 strategyId, int256 realizedPnL) external nonReentrant onlyOwner {
    require(!ordersClosed[strategyId], "already closed");

    HedgeOrder storage hedge = hedgeOrders[strategyId];
    require(hedge.amount > 0, "order not found");

    // TODO: Call GMX.closePosition() via ExchangeRouter ⚠️
    // Example:
    // bytes32 closeOrderKey = gmxExchangeRouter.createOrder(
    //     address(this),
    //     [market, receiver, collateral, swapPath],
    //     [sizeDelta, 0, 0, 0, 0, OrderType.MarketDecrease],
    //     [],
    //     ""
    // );

    ordersClosed[strategyId] = true;
    emit HedgeOrderClosed(strategyId, uint256(realizedPnL));
}
```

**This is OUTSIDE the bridge directory but critical for settlement.**

---

## Risk Analysis

### Current Risk (Without GMX Closure)

1. **Incomplete Settlement**

   - Users receive payout based only on Polymarket results
   - GMX hedge PnL is not included
   - Incorrect payouts (could be higher OR lower than actual)

2. **Unhedged Positions**

   - GMX positions remain open after "settlement"
   - Protocol remains exposed to market risk
   - Requires manual intervention to close hedges

3. **Capital Inefficiency**
   - GMX collateral locked in open positions
   - Cannot reuse capital for new strategies
   - Increases operational overhead

### Recommended Timeline

1. **Immediate** (Before Testnet):

   - Implement basic GMX position closing
   - Even if PnL calculation is placeholder
   - Ensures hedges are actually closed

2. **Phase 2** (Before Mainnet):

   - Implement accurate GMX PnL queries
   - Add HedgeExecutor event monitoring
   - Full end-to-end testing

3. **Production**:
   - Automated monitoring and alerting
   - Dashboard showing both legs
   - Historical PnL tracking

---

## Alignment with Documentation

### Existing Docs Say

From `BRIDGE_EVENT_INTEGRATION.md`:

> ✅ **HedgeOrderCreated** - For GMX tracking
> ✅ **HedgeOrderClosed** - For PnL calculation

**Status**: Events exist but bridge doesn't use them yet

From `BRIDGE_CONTRACT_INTEGRATION_CHECKLIST.md`:

> - [x] **HedgeOrderClosed** - Settlement support
>   - [x] Indexed strategyId
>   - [x] Includes realizedPnL
>   - [x] Bridge can track profits

**Status**: Capability exists but not implemented in bridge

### Updated Reality

- Events are emitted ✅
- Bridge is NOT listening ❌
- Bridge is NOT closing hedge positions ❌
- Settlement is incomplete ❌

---

## Summary

### What's Aligned ✅

- Contract emits all necessary events
- HedgeExecutor has `closeHedgeOrder()` function
- Bridge has position closing framework
- Market maturity monitoring works

### What's NOT Aligned ❌

- Bridge doesn't close GMX hedges
- Bridge doesn't query GMX PnL
- Settlement calculation is incomplete
- Bridge doesn't monitor HedgeExecutor events

### Priority Actions

1. **Critical**: Extend `PositionCloser` to close GMX hedges
2. **Critical**: Add GMX PnL to settlement calculation
3. **High**: Implement GMX position PnL query
4. **Medium**: Add HedgeExecutor event monitoring
5. **Low**: Add hedge tracking dashboard

---

**Last Updated**: 2024-01-15  
**Status**: Action Required Before Testnet Deployment
