# Project Structure

## 📁 Directory Overview

```
polyhedge/
├── 📁 docs/                          # Documentation
│   ├── PROJECT_OVERVIEW.md           # Complete project explanation
│   ├── MATHEMATICAL_ANALYSIS.md      # Black-Scholes theory and verification
│   ├── STRATEGY_GUIDE.md             # How arbitrage + hedging works
│   ├── IMPLEMENTATION_PLAN.md        # Development roadmap
│   ├── PROJECT_STRUCTURE.md          # This file
│   ├── EXECUTIVE_SUMMARY.md          # Key findings and recommendations
│   ├── ARBITRAGE_STRATEGY_DETAILED.md # Complete mathematical breakdown
│   ├── EXAMPLE_WALKTHROUGH.md        # Real $10k portfolio example
│   ├── refined_product_ideas.md      # 4 product alternatives
│   ├── SYSTEM_FLOW.md                # End-to-end system flow
│   └── VERDICT.md                    # Direct answers to questions
├── 📁 packages/                      # Monorepo packages
│   ├── 📁 hardhat/                   # Smart contracts package
│   │   ├── contracts/                # Solidity contracts
│   │   ├── deploy/                   # Deployment scripts
│   │   ├── test/                     # Contract tests
│   │   ├── scripts/                  # Utility scripts
│   │   ├── package.json              # Package configuration
│   │   └── hardhat.config.ts         # Hardhat configuration
│   ├── 📁 nextjs/                    # Frontend application package
│   │   ├── app/                      # Next.js app router
│   │   ├── components/               # React components
│   │   ├── hooks/                    # Custom hooks
│   │   ├── contracts/                # Contract ABIs
│   │   ├── services/                 # External services
│   │   ├── utils/                    # Utility functions
│   │   ├── styles/                   # CSS styles
│   │   ├── package.json              # Package configuration
│   │   └── next.config.ts            # Next.js configuration
│   └── 📁 python/                    # Python analysis package
│       ├── analysis/                 # Mathematical analysis
│       │   ├── __init__.py
│       │   └── verify_math.py        # Complete mathematical verification
│       ├── pricing/                  # Theoretical pricing engine
│       │   ├── __init__.py
│       │   └── theoretical_engine.py # Black-Scholes barrier options
│       ├── scanner/                  # Market scanning
│       │   ├── __init__.py
│       │   └── inefficiency_detector.py # Inefficiency detection
│       ├── portfolio/                # Portfolio management
│       │   ├── __init__.py
│       │   └── position_sizer.py     # Kelly Criterion sizing
│       ├── execution/                # Cross-chain execution (future)
│       ├── markets/                  # Market integrations (future)
│       ├── hedging/                  # Risk hedging (future)
│       ├── tests/                    # Test suite
│       │   ├── __init__.py
│       │   └── test_pricing.py       # Pricing engine tests
│       ├── package.json              # Package metadata
│       ├── requirements.txt          # Python dependencies
│       └── README.md                 # Package documentation
├── 📁 scripts/                       # Utility scripts
│   └── __init__.py
├── 📄 README.md                      # Main project documentation
├── 📄 (no root requirements.txt)     # Python deps in packages/python/requirements.txt
├── 📄 package.json                   # Root package configuration
├── 📄 yarn.lock                      # Dependency lock file
├── 📄 setup.sh                       # Automated setup script
├── 📄 .gitignore                     # Git ignore rules
├── 📄 CONTRIBUTING.md                # Contribution guidelines
└── 📄 LICENSE                        # MIT License
```

## 🎯 Key Components

### 📚 Documentation (`docs/`)

**Core Documentation:**

- `PROJECT_OVERVIEW.md` - Complete project explanation and mission
- `MATHEMATICAL_ANALYSIS.md` - Black-Scholes theory and verification
- `STRATEGY_GUIDE.md` - How the arbitrage + hedging strategy works
- `IMPLEMENTATION_PLAN.md` - Development roadmap from MVP to production

**Analysis Results:**

- `EXECUTIVE_SUMMARY.md` - Key findings and recommendations
- `VERDICT.md` - Direct answers to mathematical questions
- `ARBITRAGE_STRATEGY_DETAILED.md` - Complete mathematical breakdown
- `EXAMPLE_WALKTHROUGH.md` - Real $10k portfolio example

**Product Planning:**

- `refined_product_ideas.md` - 4 viable product alternatives
- `SYSTEM_FLOW.md` - End-to-end system flow documentation

### 🐍 Python Package (`packages/python/`)

**Analysis Module (`packages/python/analysis/`):**

- `verify_math.py` - Complete mathematical verification with Monte Carlo simulations

**Pricing Module (`packages/python/pricing/`):**

- `theoretical_engine.py` - Black-Scholes barrier option pricing engine

**Scanner Module (`packages/python/scanner/`):**

- `inefficiency_detector.py` - Real-time market inefficiency detection

**Portfolio Module (`packages/python/portfolio/`):**

- `position_sizer.py` - Kelly Criterion position sizing and risk management

**Execution Module (`packages/python/execution/`):**

- Future: Lit Protocol integration and cross-chain execution

**Markets Module (`packages/python/markets/`):**

- Future: Polymarket, GMX, Hyperliquid integrations

**Hedging Module (`packages/python/hedging/`):**

- Future: DEX perpetual hedging and risk management

### 🏗️ Scaffold-ETH 2 (`packages/`)

**Hardhat Package (`packages/hardhat/`):**

- Smart contract development and deployment
- Contract testing and verification
- Deployment scripts and utilities

**Next.js Package (`packages/nextjs/`):**

- Frontend application with React and Next.js
- Wallet integration with RainbowKit
- Contract interaction hooks and components

### 🧪 Testing (`tests/`)

**Test Suite:**

- `test_pricing.py` - Tests for theoretical pricing engine
- Future: Integration tests, end-to-end tests, contract tests

## 🚀 Development Workflow

### 1. Mathematical Analysis

```bash
# Run mathematical verification
cd packages/python
python analysis/verify_math.py
```

### 2. Smart Contract Development

```bash
# Start local blockchain
yarn chain

# Deploy contracts
yarn deploy

# Run tests
yarn hardhat:test
```

### 3. Frontend Development

```bash
# Start development server
yarn start

# Visit http://localhost:3000
```

### 4. Full Stack Integration

```bash
# Terminal 1: Start blockchain
yarn chain

# Terminal 2: Deploy contracts
yarn deploy

# Terminal 3: Start frontend
yarn start

# Terminal 4: Run Python analysis
cd packages/python
python analysis/verify_math.py
```

## 📦 Dependencies

### Python Dependencies (`packages/python/requirements.txt`)

- `numpy` - Numerical computations
- `scipy` - Scientific computing
- `pandas` - Data manipulation
- `matplotlib` - Plotting and visualization
- `pytest` - Testing framework

### Node.js Dependencies (`package.json`)

- `@se-2/hardhat` - Smart contract development
- `@se-2/nextjs` - Frontend application
- `yarn` - Package manager

## 🎯 File Naming Conventions

### Python Files

- `snake_case.py` - Module and function names
- `PascalCase` - Class names
- `UPPER_CASE` - Constants

### JavaScript/TypeScript Files

- `camelCase.tsx` - Component files
- `kebab-case.ts` - Utility files
- `PascalCase` - Component names

### Documentation Files

- `UPPER_CASE.md` - Main documentation
- `lower_case.md` - Supporting documentation
- `kebab-case.md` - Specific topics

## 🔧 Configuration Files

### Git Configuration

- `.gitignore` - Files to ignore in version control
- `.github/` - GitHub workflows and templates

### Development Configuration

- `yarn.lock` - Dependency lock file
- `package.json` - Node.js project configuration
- `requirements.txt` - Python dependencies

### Code Quality

- `eslint.config.mjs` - JavaScript linting rules
- `.lintstagedrc.js` - Pre-commit hooks
- `tsconfig.json` - TypeScript configuration

## 📊 Data Flow

### 1. Market Data

```
Polymarket API → Market Scanner → Inefficiency Detector → Opportunities
```

### 2. Pricing Engine

```
Pyth Oracle → Theoretical Pricing → Fair Value Calculation → Edge Detection
```

### 3. Portfolio Construction

```
Opportunities → Kelly Criterion → Position Sizing → Risk Management
```

### 4. Execution

```
Positions → Lit Protocol → Cross-Chain Execution → Settlement
```

## 🎯 Future Structure

### Planned Additions

- `src/execution/` - Cross-chain execution engine
- `src/markets/` - Market integrations (Polymarket, GMX, etc.)
- `src/hedging/` - Risk hedging and management
- `src/api/` - REST API for external integrations
- `src/database/` - Data persistence and caching

### Scalability Considerations

- Microservices architecture for production
- Database layer for historical data
- Caching layer for real-time data
- Monitoring and logging infrastructure
- Security and compliance modules

---

This structure provides a solid foundation for building PolyHedge from hackathon MVP to production platform. The modular design allows for incremental development and easy testing of individual components.
