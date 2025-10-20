# 🎯 PolyHedge - Prediction Market Arbitrage Platform

> **Hackathon Project**: Exploiting Polymarket inefficiencies with automated arbitrage and risk hedging

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Scaffold-ETH 2](https://img.shields.io/badge/Built%20with-Scaffold--ETH%202-blue)](https://github.com/scaffold-eth/scaffold-eth-2)

## 🚀 Project Overview

PolyHedge is an automated arbitrage platform that exploits pricing inefficiencies in Polymarket prediction markets while hedging directional risk through DEX perpetuals. Built for the hackathon, it combines sophisticated mathematical models with cross-chain DeFi automation.

### 🎯 Core Concept

**Problem**: Polymarket has $2B+ daily volume but significant pricing inefficiencies

- Tail strikes (extreme prices) are **91-700% overvalued** due to hype
- Mid strikes are **166-358% undervalued** due to fear
- Manual arbitrage is complex and risky

**Solution**: Automated scanner + execution platform

- Real-time theoretical pricing using Black-Scholes barrier options
- One-click arbitrage position creation
- Delta-neutral hedging via DEX perpetuals
- Cross-chain automation with Lit Protocol

### 📊 Expected Performance

- **Returns**: 15-25% per epoch (1-4 weeks)
- **Win Rate**: 70%+ of scenarios
- **Risk**: Hedge-protected but not risk-free
- **Capacity**: ~$100k AUM initially

## 🏗️ Tech Stack

### Core Technologies

- **Frontend**: Next.js (Scaffold-ETH 2) - `packages/nextjs/`
- **Smart Contracts**: Solidity (Hardhat) - `packages/hardhat/`
- **Python Analysis**: Mathematical models - `packages/python/`
- **Cross-Chain**: Lit Protocol Vincent
- **Oracles**: Pyth Network
- **Markets**: Polymarket CLOB API
- **Hedging**: GMX/Hyperliquid SDK

### Hackathon Integrations

- ✅ **Lit Protocol** ($1,666) - Cross-chain automation
- ✅ **Pyth Network** ($1,500) - Real-time price feeds
- 🔄 **Avail** ($1,000) - Cross-chain intents (optional)
- 🔄 **Blockscout** ($500) - Market data scanning
- 🔄 **Hardhat** ($500) - Smart contract development

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.18.3
- Yarn
- Python 3.8+ (for analysis scripts)

### 1. Clone and Install

```bash
git clone <repository-url>
cd polyhedge
yarn install
```

### 2. Set Up Python Environment (for analysis)

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r packages/python/requirements.txt
```

### 3. Run Mathematical Verification

```bash
python packages/python/analysis/verify_math.py
```

### 4. Start Development

```bash
# Terminal 1: Start local blockchain
yarn chain

# Terminal 2: Deploy contracts
yarn deploy

# Terminal 3: Start frontend
yarn start
```

Visit `http://localhost:3000` to see the application.

## 📚 Documentation

### 🎯 Start Here

1. **[Project Overview](docs/PROJECT_OVERVIEW.md)** - Complete project explanation
2. **[Mathematical Analysis](docs/MATHEMATICAL_ANALYSIS.md)** - Black-Scholes theory and verification
3. **[Strategy Guide](docs/STRATEGY_GUIDE.md)** - How arbitrage + hedging works
4. **[Implementation Plan](docs/IMPLEMENTATION_PLAN.md)** - Development roadmap

### 📊 Analysis Results

- **[Executive Summary](docs/EXECUTIVE_SUMMARY.md)** - Key findings and recommendations
- **[Arbitrage Strategy](docs/ARBITRAGE_STRATEGY_DETAILED.md)** - Complete mathematical breakdown
- **[Example Walkthrough](docs/EXAMPLE_WALKTHROUGH.md)** - Real $10k portfolio example
- **[Product Ideas](docs/refined_product_ideas.md)** - 4 viable product alternatives

### 🛠️ Technical Docs

- **[Project Structure](docs/PROJECT_STRUCTURE.md)** - Detailed project organization
- **[System Flow](docs/SYSTEM_FLOW.md)** - End-to-end system design

## 🎯 Key Features

### 1. Market Scanner

- Real-time theoretical pricing for all Polymarket crypto markets
- Inefficiency detection (theory vs market price)
- Opportunity ranking by edge percentage
- Historical tracking and alerts

### 2. Arbitrage Engine

- Automated spread position creation
- Kelly Criterion position sizing
- Risk management and diversification
- Early exit when prices converge

### 3. Cross-Chain Execution

- Lit Protocol Vincent for transaction bundling
- One-click execution across Polygon ↔ Arbitrum
- Automated hedging via DEX perpetuals
- Gas optimization and retry logic

### 4. Dashboard

- Live market scanner with opportunities
- Portfolio visualization and PNL tracking
- Position monitoring and alerts
- Performance analytics

## 📊 Mathematical Foundation

### Black-Scholes Barrier Options

Polymarket bets are modeled as digital barrier options:

```
Theoretical Price = P(max(S_t) ≥ H)

where:
- S_t = asset price at time t
- H = barrier (target price)
- P = probability under risk-neutral measure
```

### Current Market Inefficiencies

| Market     | Market Price | Theoretical | Edge       | Action         |
| ---------- | ------------ | ----------- | ---------- | -------------- |
| BTC >$200k | 0.7%         | 0.0001%     | **-99.9%** | ⭐ BET NO      |
| BTC >$150k | 2.5%         | 0.22%       | **-91.1%** | ⭐ BET NO      |
| BTC >$110k | 18.0%        | 82.4%       | **+358%**  | ⭐⭐⭐ BET YES |
| BTC >$120k | 12.0%        | 31.9%       | **+166%**  | ⭐⭐ BET YES   |

## 🎯 Hackathon Demo Flow

### 5-Minute Demo Script

1. **Problem Statement** (30s)

   - "Polymarket has massive inefficiencies"
   - "Manual arbitrage is complex and risky"

2. **Show Opportunities** (60s)

   - Scanner reveals BTC >$150k is 91% overvalued
   - Scanner reveals BTC >$110k is 358% undervalued
   - "These are real arbitrage opportunities!"

3. **Execute Strategy** (90s)

   - Build spread: NO on $150k + YES on $110k
   - System calculates expected profit: +$18 on $100
   - System calculates hedge: Short 0.03 BTC on GMX
   - Click "Execute" → Lit bundles everything

4. **Show Results** (60s)

   - Dashboard shows positions
   - Price simulator: move BTC up/down
   - PNL stays stable (hedged)
   - "Capturing arbitrage edge, protected from volatility"

5. **Vision** (30s)
   - "Automated arbitrage vault for passive stakers"
   - "Target 15-25% returns per epoch"
   - "Powered by Lit, Pyth, and cross-chain DeFi"

## ⚠️ Important Disclaimers

### What This IS:

- ✅ Statistical arbitrage (not gambling)
- ✅ Math-backed strategy with proven edge
- ✅ Risk-managed approach with hedging
- ✅ Viable hackathon project

### What This IS NOT:

- ❌ Risk-free yield (still has 5% loss scenarios)
- ❌ Passive income (requires active inefficiency detection)
- ❌ Guaranteed returns (depends on market inefficiencies)
- ❌ Simple hedging (that approach fails)

### Risk Factors:

- Liquidity constraints (thin order books)
- Edge compression (inefficiencies may disappear)
- Execution failures (cross-chain complexity)
- Oracle mismatches (UMA vs Pyth)
- Regulatory uncertainty (prediction markets)

## 🛠️ Development Status

### ✅ Completed

- [x] Mathematical analysis and verification
- [x] Black-Scholes barrier option implementation
- [x] Market inefficiency detection
- [x] Portfolio construction algorithms
- [x] Risk analysis and hedging strategies

### 🚧 In Progress

- [ ] Polymarket API integration
- [ ] Lit Protocol Vincent setup
- [ ] Smart contract development
- [ ] Frontend dashboard
- [ ] Cross-chain execution

### 📋 Next Steps

- [ ] Market scanner implementation
- [ ] Position execution engine
- [ ] Dynamic rebalancing
- [ ] Demo preparation
- [ ] Testing and deployment

## 🤝 Contributing

This is a hackathon project. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built on [Scaffold-ETH 2](https://github.com/scaffold-eth/scaffold-eth-2)
- Mathematical foundation from Black-Scholes options theory
- Inspired by prediction market inefficiencies research
- Powered by Lit Protocol, Pyth Network, and the broader DeFi ecosystem

---

**Ready to build the future of prediction market arbitrage?** Let's go! 🚀

For questions or support, please open an issue or reach out to the team.
