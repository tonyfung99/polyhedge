# PolyHedge Strategy Scanner - Quick Reference

## 🎯 What is the Scanner?

The Python scanner is an **automated bot** that:

1. **Scans Polymarket** for crypto price prediction markets
2. **Analyzes** for pricing inefficiencies using Black-Scholes math
3. **Calculates hedges** on GMX to neutralize directional risk
4. **Groups opportunities** into coherent strategies
5. **Deploys strategies** to the `StrategyManager` smart contract

**Result**: Real strategies that users can buy to capture arbitrage edges!

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Activate Python Environment

```bash
source /Users/tonyfung/polyhedge/venv/bin/activate
```

### Step 2: Run Scanner with Mock Data

```bash
cd /Users/tonyfung/polyhedge/packages/python/scanner
python run_strategy_scanner.py
```

### Step 3: Watch It Scan & Deploy

```
🚀 PolyHedge Strategy Scanner - Starting
📝 Configuration: Arbitrum Sepolia
🔍 Starting market scan...

📈 Scanning BTC markets...
✓ Fetched 3 markets
Analyzing 3 BTC markets for inefficiencies...

Opportunity Summary:
  BET_YES: 1 opportunities, avg edge: 358.0%
  BET_NO: 2 opportunities, avg edge: 45.5%

Formed 1 strategy groups
Constructing strategy 1...
Deploying strategy 1 to smart contract...
✅ Strategy deployment confirmed in block 12345

✅ Scan Complete: 1 strategies deployed
```

---

## 🔄 The Scanner Flow

```
INPUT (from Polymarket)
    ↓
[Fetch Markets] → Get active BTC, ETH, SOL price bets
    ↓
[Detect Edge] → Find inefficiencies (market vs theoretical price)
    ↓
[Group Opportunities] → Combine into coherent strategies
    ↓
[Calculate Hedges] → Determine GMX SHORT/LONG positions
    ↓
[Construct Strategy] → Build complete strategy definition
    ↓
[Deploy to Contract] → Call createStrategy() on Arbitrum
    ↓
OUTPUT (strategies available to users)
```

---

## 📊 What Gets Deployed

Each strategy has:

### Polymarket Orders (What to Bet)

- Market ID from Polymarket
- YES or NO bet
- 50-100% of capital
- Maximum acceptable price

### GMX Hedge Orders (Risk Protection)

- Asset to hedge (BTC, ETH, etc.)
- Direction (LONG or SHORT)
- Amount to hedge
- Max slippage 5%

### Strategy Metadata

- 2% fee to keeper
- 30-day maturity
- Expected profit (16-25%)

---

## 📝 Setup Required

### 1. Environment Variables (.env)

```bash
# REQUIRED
DEPLOYER_PRIVATE_KEY=0x...
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
STRATEGY_MANAGER_ADDRESS=0xc707d360BEc8048760F028f852cF1E244d155710

# OPTIONAL (for real Polymarket data)
POLYMARKET_API_KEY=your_key
POLYMARKET_API_SECRET=your_secret
```

### 2. Deployed Contracts

```
✅ StrategyManager: 0xc707d360BEc8048760F028f852cF1E244d155710
✅ HedgeExecutor:  0x67b059F3f838Ce25896635AcEd41a2ba5f175446
```

### 3. Gas Requirements

- Deployer account needs ~0.1 ETH on Arbitrum Sepolia
- Each strategy costs ~50,000 gas (~$0.01 at testnet rates)

---

## 🎮 Usage Modes

### Mode 1: Test with Mock Data (Recommended First)

```bash
python run_strategy_scanner.py
```

- Uses predefined BTC/ETH market data
- No API keys needed
- Quick 30-second run
- Deploy to testnet

### Mode 2: Live Polymarket Scanning

```bash
export POLYMARKET_API_KEY="your_key"
python run_strategy_scanner.py
```

- Connects to real Polymarket CLOB
- Finds real inefficiencies
- May find 0+ strategies depending on market

---

## 📂 File Structure

```
packages/python/scanner/
├── run_strategy_scanner.py        ← Main entry point (run this!)
├── strategy_scanner.py             ← Core scanner orchestrator
├── polymarket_client.py      ← Polymarket API client
├── inefficiency_detector.py        ← Edge calculation
├── requirements.txt                ← Python dependencies
└── README_STRATEGY_SCANNER.md      ← Detailed documentation
```

---

## 🔍 Components Explained

| Component                    | Purpose               | Input                  | Output          |
| ---------------------------- | --------------------- | ---------------------- | --------------- |
| **PolymarketMarketData**     | Fetch markets         | Asset (BTC, ETH)       | List of markets |
| **TheoreticalPricingEngine** | Calculate fair price  | Market data            | Fair price      |
| **InefficiencyDetector**     | Find mispricings      | Markets + prices       | Opportunities   |
| **StrategyGrouper**          | Combine opportunities | Opportunities          | Groups          |
| **HedgeCalculator**          | Determine hedges      | Polymarket bets        | Hedge orders    |
| **StrategyConstructor**      | Build definition      | Opportunities + hedges | Strategy        |
| **SmartContractDeployer**    | Deploy on-chain       | Strategy               | TX hash         |

---

## ✅ Verification

### Check Strategies on Arbitrum Sepolia

```
https://sepolia.arbiscan.io/address/0xc707d360BEc8048760F028f852cF1E244d155710#readContract

Call these functions:
- nextStrategyId() → See how many created
- strategies(0) → View strategy 0
- getStrategyDetails(0) → Full info
```

### Check Deployment Transaction

```bash
# From scanner output, grab the TX hash:
# ⏳ Waiting for transaction: 0x...

# View on Arbiscan:
# https://sepolia.arbiscan.io/tx/0x...
```

---

## 🐛 Troubleshooting

| Error                                         | Fix                                                       |
| --------------------------------------------- | --------------------------------------------------------- |
| `ModuleNotFoundError: No module named 'web3'` | `pip install -r packages/python/scanner/requirements.txt` |
| `DEPLOYER_PRIVATE_KEY not found`              | Add to `.env` file                                        |
| `Connection refused` (RPC)                    | Check `ARBITRUM_RPC_URL` in `.env`                        |
| `Transaction reverted`                        | Ensure deployer has ETH for gas                           |
| `No inefficient opportunities found`          | Lower `min_edge_threshold` in config                      |

---

## 📚 Full Documentation

For detailed information, see:

- **Setup Guide**: `STRATEGY_SCANNER_GUIDE.md`
- **Scanner Code**: `packages/python/scanner/strategy_scanner.py`
- **Smart Contract**: `packages/hardhat/contracts/StrategyManager.sol`
- **Math Details**: `docs/CRYPTO_PRICE_STRATEGIES.md`

---

## 🎯 Next Steps

### For Testing:

1. ✅ Run with mock data: `python run_strategy_scanner.py`
2. ✅ Check deployed strategies on block explorer
3. ✅ Review STRATEGY_SCANNER_GUIDE.md for details

### For Production:

1. Get Polymarket API keys
2. Update `.env` with real keys
3. Run: `python run_strategy_scanner.py`
4. Set up cron job for continuous scanning
5. Monitor deployed strategies

---

## 🚀 Key Features

✅ **Automated Discovery** - No manual market hunting  
✅ **Real Math** - Black-Scholes pricing model  
✅ **Smart Grouping** - Combines opportunities into strategies  
✅ **Risk Hedging** - Calculates GMX hedges automatically  
✅ **On-Chain Deployment** - Direct smart contract integration  
✅ **Test Mode** - Works with mock data, no API needed  
✅ **Production Ready** - Connects to real Polymarket API

---

## 💡 Example Output

```
Strategy 1: "BTC Price Hedge - 110k vs 150k"
  Fee: 2%
  Polymarket Orders: 2
    - BET YES on BTC >$110k (50% allocation)
    - BET NO on BTC >$150k (50% allocation)
  Hedge Order: 1
    - SHORT 0.25 BTC on GMX
  Expected Profit: 68%
  TX Hash: 0xabc123...
```

**What this means:**

- Bet is undervalued at $110k (358% edge!)
- Overvalued at $150k (91% edge!)
- Hedge SHORT protects if BTC moves down
- 68% expected profit if thesis is correct

---

## 🎓 Understanding the Math

**Edge Calculation:**

```
edge = (theoretical_price - market_price) / market_price

If theoretical = 82%, market = 18%:
edge = (82 - 18) / 18 = 358% ✅ BET YES!

If theoretical = 1%, market = 25%:
edge = (1 - 25) / 25 = -96% ✅ BET NO!
```

**Only strategies with >10% edge are deployed**

---

**Ready to discover profitable strategies?** 🚀

Start with: `python run_strategy_scanner.py`
