# Token Bridge Architecture: Polymarket USDC Settlement

## 🔴 Critical Discovery: Polymarket On-Chain Settlement

### The Problem

While Polymarket's **API is off-chain** (no direct on-chain interaction needed for order placement), **all settlements occur on-chain on the Polygon network**. This creates a critical requirement:

- **Order Placement**: Via API (off-chain) ✅
- **Position Custody**: On-chain USDC on Polygon ⚠️
- **Order Settlement**: On-chain on Polygon ⚠️
- **Profit Realization**: On-chain on Polygon ⚠️

### Why This Matters

Even though we place orders via Polymarket API, we **must have USDC custody on Polygon** to:
1. Ensure orders are properly collateralized
2. Settle positions when they close
3. Receive payout to USDC contract on Polygon
4. Enable profit extraction

**Without Polygon USDC custody, Polymarket orders cannot settle.**

---

## 🏗️ Solution: Dual-Chain Architecture with USDC Bridge

### Network Role Separation

| Chain | Purpose | Contracts | Token |
|-------|---------|-----------|-------|
| **Arbitrum** | User interaction & GMX hedging | StrategyManager, HedgeExecutor | USDC (collection) |
| **Polygon** | Polymarket settlement | PolygonReceiver | USDC (custody) |
| **Bridge** | Cross-chain coordination | Off-chain service | LayerZero/Stargate |

### Why This Design

1. **Arbitrum as primary chain**: Users interact here, lower fees, GMX available
2. **Polygon for Polymarket**: Required for on-chain settlement
3. **Bridge orchestrates flow**: Transfers USDC between chains at purchase/settlement

---

## 🔄 Complete User Flow with Token Bridge

### Step 1: Strategy Purchase on Arbitrum

```
User → StrategyManager (Arbitrum)
  1. Approves USDC spending
  2. Calls buyStrategy(strategyId, amount)
  3. Transfers USDC to contract
  4. Receives position proof
  5. StrategyPurchased event emitted (with netAmount)
```

**Net Amount Formula:**
```
grossAmount = user payment (e.g., 100 USDC)
fee = 2% of gross (e.g., 2 USDC)
netAmount = grossAmount - fee = 98 USDC (sent to Polymarket)
```

---

### Step 2: Cross-Chain USDC Transfer (Bridge Phase)

```
Bridge Service (listening on Arbitrum):
  1. Detects StrategyPurchased event
  2. Reads netAmount from event (98 USDC)
  3. Initiates LayerZero/Stargate bridge transfer
  4. Sends 98 USDC from Arbitrum → Polygon
  5. Bridge confirms USDC received on Polygon
  6. PolygonReceiver receives 98 USDC
  7. Records funds: userFunds[strategyId][user] = 98 USDC
```

**Bridge Technology Options:**
- **LayerZero**: Lightweight cross-chain messaging
- **Stargate**: Stable coin bridge (USDC → USDC)
- **Recommended**: Stargate for native USDC transfer (safest)

---

### Step 3: GMX Hedge Execution (Arbitrum)

```
HedgeExecutor (Arbitrum):
  1. Receives hedge order data from StrategyManager
  2. Executes GMX v2 orders on-chain
  3. Creates perpetual short/long positions
  4. Tracking begins immediately
```

**Parallel execution:** While GMX orders execute on Arbitrum, Polymarket orders execute via API on Polygon

---

### Step 4: Polymarket Order Execution (Polygon via API)

```
Bridge Service (Polygon leg):
  1. Receives 98 USDC via bridge transfer
  2. Executes Polymarket orders via API:
     - Market: "Will ETH price > $2000 by Jan 15?"
     - Side: YES (buy) or NO (sell)
     - Amount: 98 shares
  3. Polymarket processes order against USDC custody
  4. Position now held in user's Polymarket account
  5. Bridge records: recordPolymarketOrder(strategyId, position)
```

**Why USDC custody on Polygon is needed:**
- Polymarket smart contracts on Polygon hold USDC
- Settlement requires on-chain USDC transfer
- No way around it - Polymarket is Polygon-native

---

## 💰 Strategy Maturity & Payout Settlement

### At Maturity (Day N)

```
Bridge Service Dual-Chain Settlement:

On Arbitrum (GMX Closing):
  1. HedgeExecutor closes all GMX perpetual positions
  2. Calculates realized PnL on GMX
  3. Transfers PnL to StrategyManager
  
On Polygon (Polymarket Closing):
  1. Close all Polymarket positions via API
  2. Receive USDC payout from Polymarket
  3. Calculate realized PnL on Polymarket
  4. Records both balances
```

### Payout Calculation

```
Initial Investment (Arbitrum): 100 USDC
Fee (2%): 2 USDC (keeper)
Net Invested: 98 USDC

PnL Breakdown:
  GMX Hedge PnL: +2 USDC
  Polymarket PnL: +8 USDC
  Total PnL: +10 USDC

Final Balance: 98 + 10 = 108 USDC

Payout per USDC invested:
  payoutPerUSDC = 108 / 98 = 1.102 (10.2% return)
  
User receives: 100 * 1.102 = 110.2 USDC
  (Gross recovery including fee recovery via payout)
```

### Settlement Flow

```
1. Bridge closes all positions on both chains
2. Collects final balances from both contracts
3. Bridges remaining USDC from Polygon → Arbitrum
4. Calls settleStrategy(strategyId, payoutPerUSDC) on StrategyManager
5. User claims via claimStrategy(strategyId)
6. StrategyManager transfers payout USDC to user
```

---

## 📊 USDC Flow Diagram

```
                    ARBITRUM                          POLYGON
                    
User USDC ──────→ StrategyManager              PolygonReceiver ←────── USDC Bridge
                      │                               │
                      │ (2% fee to keeper)            │
                      │                               │
                      ├─→ 98 USDC (netAmount)         │
                      │     ↓ via Stargate Bridge     │
                      │                               ▼
                      │                           Polymarket API
                      │                           (on-chain settlement)
                      │                               │
              HedgeExecutor ◄────────────────────────┘
              (GMX Orders)              (USDC custody + settlement)
                      │
                      ▼
              Profits/Losses
                      │
                      └──→ Settlement ←────────── Final USDC + PnL
                          StrategyManager          (from Polygon)
```

---

## 🚀 Bridge Service Responsibilities

### Event Monitoring
- **Chain**: Arbitrum (HyperSync client)
- **Listen for**: StrategyPurchased events
- **Extract**: strategyId, user, netAmount

### Token Transfer
- **Initiate**: Stargate bridge transfer
- **Source**: StrategyManager on Arbitrum
- **Destination**: PolygonReceiver on Polygon
- **Amount**: netAmount (USDC)
- **Confirm**: Monitor bridge completion on Polygon

### Polymarket Execution
- **Connect**: Polymarket API client
- **Execute**: Order intents built from strategy definition
- **Record**: orderHash and position data
- **Monitor**: Live position tracking

### Settlement Coordination
- **GMX Closing**: Listen to HedgeExecutor events on Arbitrum
- **Polymarket Closing**: Execute close orders via API
- **PnL Calculation**: Aggregate across both chains
- **Bridge PnL Back**: Transfer profits from Polygon → Arbitrum
- **Settle Contract**: Call settleStrategy on Arbitrum

---

## ⚠️ Key Design Considerations

### Fee Distribution
- **User pays**: 2% fee (on gross amount)
- **Fee receiver**: Strategy keeper (setup bot owner)
- **Goes to**: Arbitrum StrategyManager (no bridging)

### Gas Optimization
- **Batch processing**: Group multiple strategy settlements
- **Minimize bridge calls**: Combine USDC transfers when possible
- **Cache strategy data**: Reduce on-chain lookups

### Security Measures
- **Bridge validation**: Only relayer (keeper) can initiate transfers
- **Multi-sig settlement**: Consider multi-signature for settleStrategy
- **Position tracking**: Record all positions on both chains
- **Audit trail**: Emit events for all state changes

---

## 🔧 Implementation Checklist

- [ ] Deploy StrategyManager on Arbitrum
- [ ] Deploy HedgeExecutor on Arbitrum  
- [ ] Deploy PolygonReceiver on Polygon
- [ ] Set up Stargate bridge configuration
- [ ] Implement bridge service event monitoring (HyperSync)
- [ ] Implement Stargate transfer logic
- [ ] Implement Polymarket order placement/closure via API
- [ ] Test full flow on testnet (Arbitrum Sepolia + Polygon Mumbai)
- [ ] Deploy to mainnet (Arbitrum + Polygon)
- [ ] Launch with limited TVL initially
- [ ] Monitor and iterate based on real data

---

## 📚 References

- [Polymarket Documentation](https://docs.polymarket.com)
- [Stargate Bridge](https://stargate.finance)
- [LayerZero Messaging](https://layerzero.network)
- [GMX v2 Docs](https://docs.gmx.io)
- [Arbitrum Docs](https://docs.arbitrum.io)
