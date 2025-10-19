# PolyHedge Analysis - Hedging Strategy Evaluation

## Summary of the Discussion

The Grok conversation explored building a **hedging system for Polymarket bets** by combining prediction market positions with DEX perpetual futures. The goal was to create a delta-neutral strategy that reduces risk.

## Key Findings

### 1. **The Core Strategy**

- **Buy "Yes" shares** on Polymarket crypto price events (e.g., "BTC > $130k by Oct 2025")
- **Hedge by shorting** equivalent delta-adjusted amount of the underlying asset on DEX perpetuals (GMX, Hyperliquid)
- Use **Black-Scholes-inspired delta calculation** for binary barrier options

### 2. **Critical Issue: NEGATIVE Expected PNL**

The analysis correctly identifies that **simple hedging produces NEGATIVE PNL**:

- **Static Hedge**: Mean PNL ≈ -0.28 to -0.42 (on $100 bet scale)
- **Dynamic Hedge**: Mean PNL ≈ -0.35 to -0.42
- **Dynamic + Resale**: Mean PNL ≈ -0.32 to -0.38

**Root Causes:**

1. **Transaction fees** (0.1-0.5% per trade)
2. **Slippage costs**
3. **Risk-neutral assumption** (EV = 0 in fair markets)
4. **Model mismatch** between Polymarket resolution and continuous hedging

### 3. **Is This a "Failed Product"? NO - But Needs Refinement**

The analysis correctly notes this is **NOT a failure** because:

✅ **Risk reduction works**: Variance drops 40-65% (from std ~12 to ~3-4)
✅ **Individual paths can profit**: Especially in "price down" scenarios
✅ **Comparable to TradFi options hedging**: EV near 0, utility in volatility reduction

❌ **BUT**: Cannot build a **"passive yield earning product"** with negative expected returns

### 4. **Path to Positive PNL: Exploit Market Inefficiencies**

The discussion identifies the solution: **Arbitrage mispriced positions**

**Identified Inefficiencies:**

- **Tail strikes OVERVALUED** (hype-driven)
  - BTC >$200k Oct: Market 0.7%, Theoretical ~0.0001% → **700x overvalued**
  - BTC >$150k Oct: Market 2.5%, Theoretical ~0.8% → **3x overvalued**
- **Mid strikes closer to fair**
  - BTC >$130k Oct: Market 7%, Theoretical ~7.5% → **Fair/slightly undervalued**

**Strategy for +EV:**

1. Bet **"No" on overvalued tails** (e.g., >$150k, >$200k)
2. Bet **"Yes" on undervalued mids** (e.g., >$110k, >$130k)
3. Create **spreads** (range betting)
4. Hedge net delta on DEX

**Expected Results:**

- Mean PNL: **+0.5 to +2.0** (with 10-20% edge from mispricings)
- Positive in **70% of paths**
- ROI: **15-25% per epoch**

## Mathematical Validation

### Black-Scholes Binary Barrier Option Formula

For a "Yes" bet on BTC > K at time T:

```
Theoretical Price (p) = probability of hitting barrier

p = Φ(-b/√T + ν√T) + e^(-2νb) Φ(-b/√T - ν√T)

where:
  b = ln(H/S₀) / σ√T
  ν = μ / σ - σ/2
  H = barrier ($130k)
  S₀ = current price ($107k)
  σ = volatility (50-55%)
  T = time to expiry (13.5 days / 365)
```

### Delta Calculation

```
Delta = ∂p/∂S₀ (computed numerically)

Hedge Size = N × Delta × S₀
where N = number of shares bought
```

### Example Calculation (BTC >$130k, Oct 2025)

**Inputs:**

- Current BTC: $107,127
- Target: $130,000
- Time: 13.5 days (0.037 years)
- Volatility: 55%
- Market "Yes" Price: $0.07

**Results:**

- Theoretical Price: $0.0758 (7.58%)
- Market implies ~54-55% vol → **FAIR PRICING**
- Delta per share: 0.00001437
- For 100 shares ($7 cost): Short 0.001437 BTC (~$154)

**PNL Scenarios:**

1. **Price rises, hits target**: +$93 bet, -$33 hedge = **+$60 net** (hedge reduces upside)
2. **Price down, no hit**: -$7 bet, +$10 hedge = **+$3 net** (hedge saves you)
3. **Price up but misses**: -$7 bet, -$31 hedge = **-$38 net** (worst case)

**Average across all scenarios: -$0.35** (slightly negative due to fees)

## Liquidity Concerns

### Polymarket Liquidity Reality

**From the analysis:**

- Top BTC markets: $100k-$1M total depth
- **Concentrated near current price** (80% within 5-10% spread)
- Spreads: 1-5% in active markets
- **Efficient trade size: $1k-$5k max** without significant slippage
- Protocol-scale ($100k+ AUM) would **exhaust depth**

**Verdict:** Liquidity is a **scaling hurdle** but not a blocker for MVP

## Evaluation: Is the Math Correct?

### ✅ Correct Elements

1. **GBM barrier-hitting formula** is appropriate for this use case
2. **Delta hedging methodology** follows standard derivatives theory
3. **Risk-neutral pricing assumption** is correct for fair value calculation
4. **Identification of negative PNL** in fair markets is accurate
5. **Inefficiency exploitation strategy** is sound (arbitrage theory)

### ⚠️ Potential Issues

1. **Discrete candles vs continuous**: Polymarket resolves on 1-min Binance candles, slightly reduces hit probability (~5-10%)
2. **Funding rates ignored**: DEX perps have funding (typically 0-0.1% daily)
3. **Oracle mismatch risk**: Polymarket uses UMA, hedging uses spot/perp prices
4. **Correlation assumptions**: Multi-bet strategies need proper covariance modeling
5. **Slippage modeling**: Simplified in simulations

### 📊 Verification Needed

The simulations show means of -0.28 to -0.42, but these need to be verified with:

- Larger sample sizes (10,000+ paths)
- Sensitivity analysis on volatility estimates
- Real historical mispricing data
- Transaction cost modeling (gas + fees)

## Refined Product Ideas

Given that **simple hedging produces negative PNL**, here are viable alternatives:

### Option 1: **Market-Making + Inefficiency Arbitrage** ⭐ RECOMMENDED

**Concept:**

- Users stake funds in epochs (1-4 weeks)
- Protocol scans for mispriced positions (theory vs market)
- Creates spread positions (buy undervalued, sell overvalued)
- Hedges net delta on DEX
- Exits early when prices converge

**Expected Returns:** +15-25% per epoch (from 10-20% edges)

**Key Features:**

- Focus on **overvalued tail strikes** (No bets on $200k, $150k)
- **Bull/bear spreads** to cap risk
- **Limit position sizes** to $1k-$5k per market
- **Dynamic rebalancing** via Lit Protocol

**Challenges:**

- Requires sophisticated mispricing detection
- Limited by liquidity
- Edge may disappear as market matures

### Option 2: **Cross-Platform Arbitrage**

**Concept:**

- Scan mispricings across **multiple platforms** (Polymarket, Azuro, Kalshi)
- Exploit cross-platform odds differences
- Hedge net exposure on high-liquidity DEXes

**Advantages:**

- Deeper aggregate liquidity
- More arbitrage opportunities
- Diversified risk

### Option 3: **Synthetic Options Vault**

**Concept:**

- Create **internal synthetic binary options** using Pyth/UMA oracles
- No dependence on Polymarket liquidity
- Users stake passively
- Protocol manages hedged positions

**Advantages:**

- Unlimited "depth" (protocol-managed pool)
- No external liquidity constraints
- Full control over pricing and execution

**Disadvantages:**

- Oracle dependency
- Complex smart contract logic
- Regulatory considerations

### Option 4: **Liquidity Provider Strategy**

**Concept:**

- Protocol acts as LP on Polymarket
- Posts limit orders on mispriced sides
- Earns market-making rewards (4%+ annualized)
- Hedges net exposure

**Advantages:**

- Leverages LP rewards
- Improves ecosystem depth
- Lower execution risk (limit orders)

## Recommendations

### For Hackathon/MVP:

1. **Focus on Option 1** (Market-Making + Arbitrage)

   - Simplest to demonstrate
   - Clear value proposition
   - Fits sponsor requirements (Lit, Pyth)

2. **Target specific inefficiencies**:

   - Bet "No" on BTC >$200k, >$150k (overvalued)
   - Bet "Yes" on BTC >$130k, >$110k (fair/undervalued)
   - Create spreads for range plays

3. **Keep position sizes small**: $1k-$5k per market

4. **Implement dynamic rebalancing**: Use Lit Protocol for automated adjustments

5. **Build dashboard showing**:
   - Theoretical vs Market prices
   - Edge/inefficiency metrics
   - Risk-adjusted returns
   - Live position PNL

### For Production:

1. **Validate with backtesting**: Use historical Polymarket data
2. **Monitor edge degradation**: As markets mature, inefficiencies shrink
3. **Consider cross-platform**: Don't rely only on Polymarket
4. **Build liquidity partnerships**: Market-make to improve depth
5. **Regulatory compliance**: Binary options may face scrutiny

## Conclusion

### Is the current hedging strategy viable?

**For Risk Management:** YES ✅

- Reduces variance by 40-65%
- Suitable for risk-averse traders
- Works like traditional options hedging

**For Passive Yield Product:** NO ❌

- Expected PNL is negative (-0.3% to -0.4%)
- Cannot promise positive returns without additional alpha

**For Arbitrage-Based Product:** YES ✅

- Exploiting 10-20% mispricings can yield +15-25% per epoch
- Requires sophisticated scanning and execution
- Limited by liquidity (~$100k AUM max initially)

### Key Insight

The fundamental strategy is sound, but **you cannot build a passive yield product on fair-market hedging alone**. You MUST add an **alpha generation layer** through:

- Inefficiency arbitrage
- Market making
- Cross-platform opportunities
- Synthetic position creation

The discussion correctly identifies this problem and proposes valid solutions.
