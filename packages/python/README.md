# @polyhedge/python

> **PolyHedge Python Analysis Package** - Mathematical models and market analysis for prediction market arbitrage

## 🎯 Overview

This package contains the core mathematical models and analysis tools for PolyHedge, including:

- **Theoretical Pricing Engine** - Black-Scholes barrier option pricing
- **Market Scanner** - Real-time inefficiency detection
- **Portfolio Builder** - Kelly Criterion position sizing
- **Risk Management** - Hedging and risk analysis
- **Mathematical Verification** - Monte Carlo simulations and validation

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- pip

### Installation

```bash
# From project root
cd packages/python
pip install -r requirements.txt
```

### Run Mathematical Verification

```bash
python analysis/verify_math.py
```

## 📁 Package Structure

```
packages/python/
├── analysis/          # Mathematical analysis and verification
│   ├── __init__.py
│   └── verify_math.py
├── pricing/           # Theoretical pricing engine
│   ├── __init__.py
│   └── theoretical_engine.py
├── scanner/           # Market scanning and inefficiency detection
│   ├── __init__.py
│   └── inefficiency_detector.py
├── portfolio/         # Portfolio management and position sizing
│   ├── __init__.py
│   └── position_sizer.py
├── execution/         # Cross-chain execution (future)
├── markets/           # Market integrations (future)
├── hedging/           # Risk hedging (future)
├── package.json       # Package metadata
├── requirements.txt   # Python dependencies
└── README.md          # This file
```

## 🧮 Core Modules

### Theoretical Pricing Engine

```python
from pricing import TheoreticalPricingEngine

engine = TheoreticalPricingEngine()
fair_price = engine.calculate_fair_price(
    current_price=95000,
    target_price=130000,
    time_to_expiry=0.25,
    volatility=0.8
)
```

### Market Scanner

```python
from scanner import InefficiencyDetector

detector = InefficiencyDetector()
opportunities = detector.find_opportunities(
    markets=polymarket_data,
    min_edge=0.1
)
```

### Portfolio Builder

```python
from portfolio import KellyPositionSizer

sizer = KellyPositionSizer()
position_size = sizer.calculate_position_size(
    win_probability=0.7,
    edge=0.2,
    capital=10000
)
```

## 🧪 Testing

```bash
# Run all tests
pytest tests/ -v

# Run specific test
pytest tests/test_pricing.py -v

# Run with coverage
pytest tests/ --cov=. --cov-report=html
```

## 🛠️ Development

### Code Quality

```bash
# Format code
black .

# Lint code
flake8 .

# Type checking
mypy .
```

### Mathematical Verification

```bash
# Run complete mathematical verification
python analysis/verify_math.py
```

## 📊 Key Features

### Black-Scholes Barrier Options

- Implements barrier hit probability calculations
- Delta calculations for hedging
- Risk-neutral pricing assumptions

### Market Inefficiency Detection

- Real-time theoretical vs market price comparison
- Edge calculation and ranking
- Opportunity identification

### Kelly Criterion Position Sizing

- Optimal position sizing based on edge and probability
- Risk management rules
- Portfolio diversification constraints

### Monte Carlo Simulations

- 10,000+ path simulations
- Multiple market scenarios
- Statistical validation

## 🎯 Expected Performance

- **Returns**: 15-25% per epoch (1-4 weeks)
- **Win Rate**: 70%+ of scenarios
- **Sharpe Ratio**: 2-3 (excellent risk-adjusted)
- **Max Drawdown**: -20% (rare edge compression)

## ⚠️ Risk Factors

- **Edge Compression**: Inefficiencies may disappear as markets mature
- **Liquidity Constraints**: Thin order books limit position sizes
- **Execution Risk**: Cross-chain complexity and oracle dependencies
- **Market Risk**: Extreme volatility events and correlation breakdown

## 📚 Documentation

- [Mathematical Analysis](../../docs/MATHEMATICAL_ANALYSIS.md)
- [Strategy Guide](../../docs/STRATEGY_GUIDE.md)
- [Implementation Plan](../../docs/IMPLEMENTATION_PLAN.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](../../LICENSE) file for details.

---

**Part of the PolyHedge ecosystem** - Building the future of prediction market arbitrage! 🚀
