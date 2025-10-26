
# PolyHedge: Crypto Price Prediction Strategies

## 📌 Overview

PolyHedge focuses exclusively on **crypto price prediction arbitrage**. All strategies are based on cryptocurrency price targets (BTC, ETH, etc.) rather than news events or external facts.

## 🎯 Strategy Types

### 1. BTC Price Hedge - 110k vs 150k

**Strategy ID**: 1  
**Type**: Balanced Price Range Hedge

**Purpose**:
- Bet YES on BTC reaching $110k (undervalued market)
- Bet NO on BTC reaching $150k (overvalued market)
- Hedge directional moves with GMX SHORT position

**Allocation**:
- 50% YES on BTC >$110k @ 75% max price
- 50% NO on BTC >$150k @ 60% max price

**Rationale**:
- BTC >$110k is undervalued (Market: 18%, Theoretical: 82.4%)
- BTC >$150k is overvalued (Market: 2.5%, Theoretical: 0.22%)
- Captures spread inefficiency while hedging tail risk

**Example Trade (100 USDC)**:
```
Fee: 2 USDC
Net: 98 USDC

Polymarket:
- 49 USDC YES on BTC >$110k
- 49 USDC NO on BTC >$150k

GMX Hedge:
- SHORT 49 USDC of BTC (protection)

If BTC goes to $120k:
- BTC >$110k: WIN (+40 USDC)
- BTC >$150k: WIN (+40 USDC) 
- GMX SHORT: LOSE (-10 USDC)
- Net: +70 USDC ✅
```

---

### 2. ETH Price Strategy - 5k Target

**Strategy ID**: 2  
**Type**: Simple Price Target Bet

**Purpose**:
- Bet YES on ETH reaching $5k
- Capitalize on undervalued bullish scenario

**Allocation**:
- 100% YES on ETH >$5000 @ 80% max price

**Rationale**:
- Single target bet for directional bullish exposure
- Lower complexity, higher single-outcome risk
- Useful for strong conviction directional trades

**Example Trade (100 USDC)**:
```
Fee: 2 USDC
Net: 98 USDC

Polymarket:
- 98 USDC YES on ETH >$5k

If ETH goes to $5500:
- ETH >$5k: WIN (+50 USDC)
- Net: +50 USDC ✅
```

---

### 3. BTC Range Hedge - 120k Level

**Strategy ID**: 3  
**Type**: Advanced Range Hedge

**Purpose**:
- Focus on $120k resistance level
- Bet YES on $120k, NO on $110k for range-bound positioning
- Capture mid-range inefficiency

**Allocation**:
- 60% YES on BTC >$120k @ 78% max price
- 40% NO on BTC >$110k @ 65% max price

**Rationale**:
- BTC >$120k shows positive edge (Market: 12%, Theoretical: 31.9%)
- Create partially hedged exposure
- Higher allocation to undervalued YES bet

**Example Trade (100 USDC)**:
```
Fee: 2 USDC
Net: 98 USDC

Polymarket:
- 58.8 USDC YES on BTC >$120k
- 39.2 USDC NO on BTC >$110k

If BTC goes to $125k:
- BTC >$120k: WIN (+25 USDC)
- BTC >$110k: LOSE (-15 USDC)
- Net: +10 USDC ✅
```

---

## 📊 Black-Scholes Pricing Model

All strategies use Black-Scholes barrier option pricing to identify inefficiencies:

```
Call Spread = European Call(K1) - European Call(K2)

For BTC >$110k vs BTC >$150k:
- K1 = $110,000 (undervalued)
- K2 = $150,000 (overvalued)
- Theoretical value captures edge
```

### Key Parameters

| Parameter | Value | Impact |
|-----------|-------|--------|
| Spot Price (S) | $107,127 | Starting BTC price |
| Time to Expiry (T) | 13.5 days | Time decay |
| Volatility (σ) | 0.55 (55%) | Risk level |
| Risk-free Rate (r) | 0.05 (5%) | Discount factor |

### Efficiency Calculation

```
Edge % = ((Theoretical - Market) / Market) × 100

Example:
BTC >$110k: Edge = ((82.4% - 18%) / 18%) × 100 = +358%
BTC >$150k: Edge = ((0.22% - 2.5%) / 2.5%) × 100 = -91.1%
```

---

## 🛡️ Hedging Mechanism

### GMX Perpetual Hedging

Each strategy includes automatic GMX hedging:

```
Hedge = SHORT perpetual future
Purpose = Neutralize directional market moves
Amount = Allocated % of net position
Execution = On-chain immediately upon purchase
```

**Example: BTC >$110k vs >$150k**

```
Without hedge (risky):
- BTC $100k → Lose everything
- BTC $200k → Win everything
- Result: 100% directional exposure

With GMX SHORT hedge:
- BTC $100k → SHORT profit offsets
- BTC $200k → SHORT loss offsets
- Result: Spread profit capture only
```

---

## 💡 Strategy Selection Guide

### Use BTC Hedge (110k vs 150k) When:
- You want balanced exposure
- You believe BTC will stay $110k-$150k range
- You want directional hedging protection
- Lower risk tolerance

### Use ETH Price (5k) When:
- You have strong bullish conviction
- You want pure directional play
- You're comfortable with higher risk
- You want simpler execution

### Use BTC Range (120k) When:
- You want focused $120k level bet
- You want asymmetric exposure (60/40 split)
- You believe $120k is key resistance
- Medium risk tolerance

---

## 📈 Expected Outcomes

### Base Case: Neutral Market

```
BTC stays at $107k for strategy duration

Strategy 1 (110k vs 150k):
- BTC >$110k: LOSE (didn't reach)
- BTC >$150k: WIN (didn't reach, bet was NO)
- GMX SHORT: Break-even
- Total: Small net loss (realized market spread)

Strategy 2 (ETH 5k):
- ETH >$5k: LOSE (didn't reach)
- Total: Loss of full position

Strategy 3 (120k Range):
- BTC >$120k: LOSE
- BTC >$110k: WIN (didn't reach, bet was NO)
- Combined: 40% loss, 60% loss = net loss
```

### Bull Case: BTC to $150k

```
BTC reaches $150k

Strategy 1 (110k vs 150k):
- BTC >$110k: WIN (+98 USDC)
- BTC >$150k: LOSE (-98 USDC)
- Polymarket net: 0
- GMX SHORT: Loses (-50 USDC)
- Total: -50 USDC (pure hedge cost)

Strategy 2 (ETH 5k):
- ETH >$5k: Depends on ETH action
- Independent of BTC

Strategy 3 (120k Range):
- BTC >$120k: WIN (+58.8 USDC)
- BTC >$110k: LOSE (-39.2 USDC)
- Combined: +19.6 USDC WIN ✅
```

---

## 🔄 Order Execution

### On-Chain (Immediate)
1. User purchases strategy
2. StrategyManager receives USDC
3. Fee deducted (2%)
4. HedgeExecutor creates GMX SHORT
5. StrategyPurchased event emitted

### Off-Chain (HyperSync Poll)
1. Bridge service detects event
2. Loads strategy from strategies.json
3. Calculates Polymarket allocations
4. Submits YES/NO orders to Polymarket CLOB
5. Positions confirmed

### Result
✅ GMX hedge: Active on Arbitrum  
✅ Polymarket positions: Active on Polygon  
✅ User position: Recorded in contract

---

## ⚠️ Important Notes

### Market IDs Need Real Values
Current strategies use placeholder market IDs:
- `POLY_BTC_110K_MARKET_ID` → Real Polymarket token ID
- `POLY_BTC_150K_MARKET_ID` → Real Polymarket token ID
- `POLY_ETH_5K_MARKET_ID` → Real Polymarket token ID

### Crypto Only
- ✅ Only crypto price predictions
- ❌ No news events
- ❌ No political outcomes
- ❌ No external events
- ✅ Pure asset price mechanics

### Risk Management
- Positions automatically hedged via GMX
- Maximum 2% fee per strategy
- Liquidation protection via GMX
- Settlement at maturity date

---

## 🚀 Creating New Strategies

To create a new crypto price strategy:

1. **Define Price Targets**
   ```json
   "marketId": "POLY_BTC_[PRICE]K_MARKET_ID",
   "outcome": "YES" or "NO"
   ```

2. **Set Allocations**
   ```
   notionalBps: allocation in basis points
   5000 = 50%, 10000 = 100%, 2500 = 25%
   ```

3. **Add to strategies.json**
   ```json
   {
     "id": 4,
     "name": "New BTC Strategy - [Description]",
     "polymarketOrders": [...]
   }
   ```

4. **Deploy via StrategyManager**
   ```solidity
   manager.createStrategy(
     "New BTC Strategy - [Description]",
     200,  // 2% fee
     maturityTs,
     pmOrders,
     hedgeOrders,
     800   // 8% expected profit
   )
   ```

---

## 📚 References

- [Black-Scholes Model](https://en.wikipedia.org/wiki/Black–Scholes_model)
- [Polymarket Documentation](https://docs.polymarket.com)
- [GMX Perpetuals](https://docs.gmx.io)
- [Barrier Options Theory](https://www.investopedia.com/terms/b/barrieroption.asp)

