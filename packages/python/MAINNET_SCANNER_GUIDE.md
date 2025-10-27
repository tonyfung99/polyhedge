# PolyHedge Strategy Scanner - Mainnet Deployment Guide

## Overview

The Python scanner has been configured to work with **Arbitrum Mainnet** and your deployed contracts.

## Deployed Contracts (Arbitrum Mainnet)

```
StrategyManager: 0x2E0DBaC1cE2356aca580F89AbAb94032d36E0579
HedgeExecutor:   0x3aC4b6c3cA4EbE90142CDBBa66326A137f196886
```

**Block Explorer:**
- https://arbiscan.io/address/0x2E0DBaC1cE2356aca580F89AbAb94032d36E0579
- https://arbiscan.io/address/0x3aC4b6c3cA4EbE90142CDBBa66326A137f196886

---

## Quick Start

### 1. Setup Environment

```bash
cd packages/python

# Create .env file from example
cp env.example .env

# Edit .env and add your deployer private key
# NETWORK=arbitrum (default)
# DEPLOYER_PRIVATE_KEY=your_key_here
```

### 2. Activate Virtual Environment

```bash
# If you haven't created the virtual environment yet
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Run the Scanner

```bash
# Run on Arbitrum Mainnet (default)
python scanner/run_strategy_scanner.py

# Or explicitly set the network
NETWORK=arbitrum python scanner/run_strategy_scanner.py
```

### 4. Run on Testnet (Optional)

```bash
# Switch to Arbitrum Sepolia
NETWORK=arbitrumSepolia python scanner/run_strategy_scanner.py
```

---

## Configuration Options

### Environment Variables

The scanner uses the following environment variables (all configurable in `.env`):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NETWORK` | No | `arbitrum` | Network to use: `arbitrum` or `arbitrumSepolia` |
| `DEPLOYER_PRIVATE_KEY` | **Yes** | - | Private key for deploying strategies |
| `ARBITRUM_RPC_URL` | No | Auto-set | Arbitrum RPC endpoint |
| `STRATEGY_MANAGER_ADDRESS` | No | Auto-loaded | Override StrategyManager address |
| `POLYMARKET_API_KEY` | No | - | Optional (uses public API by default) |
| `POLYMARKET_API_SECRET` | No | - | Optional (uses public API by default) |

### Network Defaults

**Arbitrum Mainnet** (default):
```
RPC: https://arb1.arbitrum.io/rpc
StrategyManager: 0x2E0DBaC1cE2356aca580F89AbAb94032d36E0579
```

**Arbitrum Sepolia** (testnet):
```
RPC: https://sepolia-rollup.arbitrum.io/rpc
StrategyManager: 0xc707d360BEc8048760F028f852cF1E244d155710
```

---

## How the Scanner Works

### 1. **Fetch Markets**
- Connects to Polymarket Gamma API (public, no auth required)
- Fetches monthly crypto price prediction markets
- Currently supports: BTC, ETH

### 2. **Calculate Theoretical Prices**
- Uses Black-Scholes model with barrier options
- Fetches current asset prices from CoinGecko
- Calculates theoretical probabilities for each market

### 3. **Identify Inefficiencies**
- Compares theoretical prices to market prices
- Identifies overpriced and underpriced markets
- Calculates edge percentage

### 4. **Calculate Hedges**
- Determines GMX perpetual positions needed to hedge risk
- Uses Kelly Criterion for position sizing
- Ensures delta neutrality

### 5. **Group Strategies**
- Groups complementary opportunities
- Ensures same maturity date within each strategy
- Combines Polymarket bets with GMX hedges

### 6. **Deploy to Contract**
- Constructs strategy parameters
- Calls `createStrategy()` on StrategyManager
- Broadcasts transaction to Arbitrum
- Returns transaction hash

---

## Expected Output

```
================================================================================
🚀 PolyHedge Strategy Scanner - Starting
================================================================================

📝 Configuration:
  Network: Arbitrum Mainnet
  RPC URL: https://arb1.arbitrum.io/rpc
  StrategyManager: 0x2E0DBaC1cE2356aca580F89AbAb94032d36E0579
  Polymarket API: Public Gamma API (no auth needed)
  Deployer Key: ✓ Loaded

📋 Loading StrategyManager ABI...
   ✓ ABI loaded (XX functions)

🔧 Initializing Strategy Scanner...
   ✓ Scanner initialized

📡 Using REAL Polymarket Gamma API
   Endpoint: https://gamma-api.polymarket.com/events
   No authentication required - public endpoint

🔍 Starting market scan...

... (scanning output) ...

================================================================================
✅ Scan Complete: 3 strategies deployed
================================================================================

📊 Deployed Strategies:

  Strategy 1:
    Name: BTC-Overvalue-110000-2025-01
    Fee: 2.0%
    Expected Profit: 12.5%
    Polymarket Orders: 2
    Hedge Orders: 1
    TX Hash: 0x...

  ... (more strategies) ...

================================================================================
✨ Strategy Scanner Session Complete
================================================================================
```

---

## Important Notes

### 🔒 Security

- **Never commit** your `.env` file with real private keys
- The scanner requires **mainnet ETH** for gas fees
- The deployer wallet must have **ETH on Arbitrum** (not L1 Ethereum)
- Test thoroughly on Sepolia before running on mainnet

### 💰 Gas Considerations

- Each `createStrategy` call costs gas (estimate: ~0.0005 ETH)
- The scanner caps at 3 strategies per asset to limit gas costs
- Ensure your deployer wallet has sufficient ETH balance

### 🎯 Strategy Limits

The scanner automatically:
- Sorts opportunities by edge percentage (best first)
- Deduplicates by target price (keeps best for each target)
- Caps at maximum 3 strategies per asset (BTC/ETH)

### 📊 Market Data

- Uses **public Polymarket Gamma API** (no authentication needed)
- Fetches **monthly crypto price markets** only
- Gets **live asset prices** from CoinGecko API
- All market data is real-time

---

## Troubleshooting

### "DEPLOYER_PRIVATE_KEY not found"
```bash
# Make sure .env file exists in packages/python/
# Add your private key:
echo "DEPLOYER_PRIVATE_KEY=0x..." >> .env
```

### "Deployment file not found"
```bash
# Make sure contracts are deployed first:
cd packages/hardhat
yarn hardhat deploy --network arbitrum

# Or set STRATEGY_MANAGER_ADDRESS explicitly in .env
```

### "Insufficient funds for gas"
```bash
# Fund your deployer wallet with ETH on Arbitrum
# Check balance: https://arbiscan.io/address/YOUR_ADDRESS
```

### Connection Issues
```bash
# Try using Alchemy RPC instead:
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY python scanner/run_strategy_scanner.py
```

---

## Development vs Production

### Test on Sepolia First

```bash
# Test with small amounts on testnet
NETWORK=arbitrumSepolia python scanner/run_strategy_scanner.py
```

### Run on Mainnet

```bash
# Production deployment
NETWORK=arbitrum python scanner/run_strategy_scanner.py
```

---

## Monitoring

After deployment, you can:

1. **View transactions on Arbiscan:**
   - https://arbiscan.io/address/0x2E0DBaC1cE2356aca580F89AbAb94032d36E0579

2. **Check strategies via contract read:**
   - Call `getActiveStrategies()` on StrategyManager
   - Call `getStrategyDetails(strategyId)` for specific strategies

3. **Monitor via frontend:**
   - The Next.js frontend can display active strategies
   - Connect to Arbitrum mainnet in your wallet

---

## Next Steps

1. **Test the scanner** on testnet with small amounts
2. **Verify strategies** are created correctly on-chain
3. **Monitor gas costs** and adjust strategy limits if needed
4. **Set up automated scanning** using cron or systemd timer
5. **Build frontend UI** to display scanner-created strategies

---

## Support

For issues or questions:
- Check logs for detailed error messages
- Verify contract addresses on Arbiscan
- Ensure deployer wallet has sufficient ETH
- Test on Sepolia first before mainnet deployment

