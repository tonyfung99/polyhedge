# Strategy Scanner & Creator System

Complete end-to-end system that automatically scans Polymarket for inefficient opportunities, calculates optimal GMX hedges, groups them into coherent strategies, and deploys to the smart contract.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ StrategyScanner (Main Orchestrator)                         │
└─────────────┬───────────────────────────────────────────────┘
              │
     ┌────────┼────────┬──────────────┬─────────────┐
     ↓        ↓        ↓              ↓             ↓
  Polymarket  Pricing  Inefficiency   Position     Hedge
  Market Data Engine   Detector       Sizer        Calculator
  Fetcher
     ↓        ↓        ↓              ↓             ↓
     └────────┼────────┴──────────────┴─────────────┘
              │
     Strategy Grouper → Constructs StrategyGroups
              ↓
     Strategy Constructor → Creates strategy definitions
              ↓
     Smart Contract Deployer → Deploys via createStrategy()
              ↓
     Arbitrum Chain (StrategyManager)
```

## 📦 Components

### 1. PolymarketMarketData
**Responsibility**: Fetch real market data from Polymarket

```python
market_fetcher = PolymarketMarketData(api_client)
markets = await market_fetcher.fetch_active_markets("BTC")
# Returns: List of markets like BTC >$110k, >$120k, >$150k, etc.
```

### 2. HedgeCalculator
**Responsibility**: Determine optimal GMX hedges based on Polymarket bets

**Logic**:
- For YES bets (bullish): SHORT the asset (hedges upside risk)
- For NO bets (bearish): LONG the asset (hedges downside risk)
- Hedge allocation: 50-60% of Polymarket position

```python
hedge_calc = HedgeCalculator()
hedge = hedge_calc.calculate_hedge(opportunity, polymarket_allocation)
# Returns: SHORT/LONG order with amount, slippage, rationale
```

### 3. StrategyGrouper
**Responsibility**: Group opportunities into coherent strategies

**Grouping Rules**:
- Same asset (BTC, ETH, etc.)
- Same maturity date (±1 day tolerance)
- Prefer mixed YES/NO for hedging effectiveness
- Max 4 opportunities per strategy
- Min 1 opportunity per strategy

```python
grouper = StrategyGrouper(min_opportunities=1, max_opportunities=4)
groups = grouper.group_opportunities(opportunities_df)
# Returns: List[List[opportunities]] - each list is one strategy
```

### 4. StrategyConstructor
**Responsibility**: Build complete strategy definitions for smart contract

**Output Structure**:
```python
{
    'id': 1,
    'name': 'BTC Price Hedge - 110k vs 150k',
    'feeBps': 200,              # 2% platform fee
    'maturityTs': 1730000000,   # Unix timestamp
    'polymarketOrders': [       # Polymarket positions
        {
            'marketId': 'token_id',
            'isYes': True,      # YES/NO bet
            'notionalBps': 5000,  # 50% allocation
            'maxPriceBps': 7500,  # 75% max price
            'priority': 1
        }
    ],
    'hedgeOrders': [            # GMX hedge positions
        {
            'asset': 'BTC',
            'isLong': False,    # SHORT to hedge
            'amount': 245000000, # 245 USDC (6 decimals)
            'maxSlippageBps': 500  # 5% max slippage
        }
    ],
    'expectedProfitBps': 1800   # Expected 18% profit
}
```

### 5. SmartContractDeployer
**Responsibility**: Deploy strategies to StrategyManager via Web3.py

```python
deployer = SmartContractDeployer(
    rpc_url="https://arbitrum-rpc",
    private_key="0x...",
    strategy_manager_abi=abi,
    strategy_manager_address="0x..."
)
tx_hash = await deployer.deploy_strategy(strategy_def)
# Calls: manager.createStrategy(name, fee, maturity, pm_orders, hedge_orders, expected_profit)
```

### 6. StrategyScanner (Main)
**Responsibility**: Orchestrate entire pipeline

```python
scanner = StrategyScanner(
    polymarket_api_key="...",
    polymarket_api_secret="...",
    arbitrum_rpc="https://...",
    strategy_manager_address="0x...",
    strategy_manager_abi=abi,
    private_key="0x..."
)

# Run with mock data for testing
strategies = await scanner.scan_and_deploy(assets=['BTC'], mock_data=True)

# Run with real Polymarket data
strategies = await scanner.scan_and_deploy(assets=['BTC', 'ETH'], mock_data=False)
```

## 🚀 Usage

### Quick Start (Mock Data)

```python
import asyncio
from strategy_scanner import StrategyScanner, MockPolymarketAPIClient

async def main():
    # Initialize with mock client
    scanner = StrategyScanner(
        polymarket_api_key="",
        polymarket_api_secret="",
        arbitrum_rpc="http://localhost:8545",
        strategy_manager_address="0x...",
        strategy_manager_abi=[],  # Load from typechain
        private_key="0x..."
    )
    
    # Scan BTC markets with mock data
    strategies = await scanner.scan_and_deploy(
        assets=['BTC'],
        mock_data=True
    )
    
    print(f"Deployed {len(strategies)} strategies")
    for s in strategies:
        print(f"- {s['name']}: {s['expectedProfitBps']/100:.1f}% expected profit")

asyncio.run(main())
```

### Production (Real Polymarket API)

```python
async def main():
    scanner = StrategyScanner(
        polymarket_api_key=os.getenv("POLYMARKET_API_KEY"),
        polymarket_api_secret=os.getenv("POLYMARKET_API_SECRET"),
        arbitrum_rpc=os.getenv("ARBITRUM_RPC_URL"),
        strategy_manager_address=os.getenv("STRATEGY_MANAGER_ADDRESS"),
        strategy_manager_abi=load_abi_from_typechain(),
        private_key=os.getenv("PRIVATE_KEY")
    )
    
    # Continuous scanning loop
    while True:
        strategies = await scanner.scan_and_deploy(
            assets=['BTC', 'ETH'],
            mock_data=False
        )
        
        if strategies:
            logger.info(f"Deployed {len(strategies)} new strategies")
        
        # Wait 1 hour before next scan
        await asyncio.sleep(3600)

asyncio.run(main())
```

## 🔄 Complete Flow Example

```
1. MARKET SCANNING
   └─ Polymarket API returns: BTC markets with prices
      - BTC >$200k @ 0.7% (market price)
      - BTC >$150k @ 2.5% (market price)
      - BTC >$110k @ 18% (market price)

2. INEFFICIENCY DETECTION
   └─ Black-Scholes pricing: BTC >$110k should be 82.4% theoretically
      - Edge: (82.4 - 18) / 18 = +358% (UNDERVALUED - BET YES)
      - Edge: (0.22 - 2.5) / 2.5 = -91% (OVERVALUED - BET NO)

3. HEDGE CALCULATION
   └─ For YES on $110k: SHORT BTC to hedge bullish risk
      For NO on $150k: LONG BTC to hedge bearish risk
      Combined: Both SHORT for spread capture

4. STRATEGY GROUPING
   └─ Group $110k YES + $150k NO into one strategy
      (same asset, same maturity, mixed YES/NO)

5. STRATEGY CONSTRUCTION
   └─ Build strategy definition:
      - 50% allocation to YES $110k (Polymarket)
      - 50% allocation to NO $150k (Polymarket)
      - SHORT 50% of net capital (GMX hedge)
      - Expected profit: ~160% (avg of edges)

6. SMART CONTRACT DEPLOYMENT
   └─ Call: manager.createStrategy(
        "BTC Price Hedge - 110k vs 150k",
        200,        // 2% fee
        maturityTs,
        polymarketOrders,
        hedgeOrders,
        16000       // 160% expected profit
      )
   └─ Returns: Strategy now available for user purchase
```

## 🧪 Testing

### Mock Data Testing
```bash
python -m scanner.strategy_scanner
# Runs with mock BTC/ETH markets for testing
```

### With Real Polymarket Data
```bash
export POLYMARKET_API_KEY="your_key"
export POLYMARKET_API_SECRET="your_secret"
python -m scanner.strategy_scanner
```

### Unit Tests
```bash
pytest scanner/test_strategy_scanner.py -v
```

## 📊 Output Example

```
Starting strategy scanning for assets: ['BTC']
============================================================
Scanning BTC markets...
============================================================
Fetched 4 BTC price markets
Analyzing 4 BTC markets for inefficiencies...

Opportunity Summary:
  all: 4 opportunities, avg edge: 96.2%
  undervalued: 1 opportunities, avg edge: 358.0%
  overvalued: 2 opportunities, avg edge: -91.1%
  high_confidence: 3 opportunities, avg edge: 196.0%

Formed 1 strategy groups

Constructing strategy 1...
Constructed strategy 'BTC Price Hedge - Mixed': 2 Polymarket orders, 1 hedge orders, Expected profit: 133.3%

Deploying strategy 1 to smart contract...
Deployed strategy: 0x1234...abcd
Strategy deployment confirmed in block 12345678

============================================================
Scanning complete. Deployed 1 strategies
============================================================
```

## ⚙️ Configuration

Environment variables:
```bash
# Polymarket
POLYMARKET_API_KEY=your_key
POLYMARKET_API_SECRET=your_secret

# Arbitrum
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/...
STRATEGY_MANAGER_ADDRESS=0x...

# Execution
PRIVATE_KEY=0x...
```

## 🔧 Customization

### Adjust Scanner Thresholds

```python
# Minimum edge to consider an opportunity
detector = InefficiencyDetector(min_edge_threshold=0.15)  # 15% instead of 10%

# Position sizing
sizer = KellyPositionSizer(
    kelly_fraction=0.25,    # More conservative
    max_position_size=0.30  # 30% max instead of 40%
)

# Strategy grouping
grouper = StrategyGrouper(
    min_opportunities=2,    # Need at least 2 opportunities
    max_opportunities=3     # Max 3 instead of 4
)
```

### Custom Hedge Strategy

```python
class CustomHedgeCalculator(HedgeCalculator):
    def calculate_hedge(self, opportunity, polymarket_allocation):
        # Override to implement different hedge logic
        # Example: Full hedge (100%) instead of partial (60%)
        hedge = super().calculate_hedge(opportunity, polymarket_allocation)
        hedge['allocation_pct'] = 1.0  # Full hedge
        return hedge
```

## 📝 Notes

- **Mock Data**: For development, uses hardcoded BTC/ETH markets
- **Real API**: Fetches from Polymarket CLOB API (requires credentials)
- **Hedging**: Always SHORT for YES bets, LONG for NO bets
- **Deployment**: Requires valid Arbitrum RPC and StrategyManager contract
- **Private Key**: Should be loaded from environment, never hardcoded

## 🚨 Common Issues

**Issue**: "No markets found"
- **Cause**: Polymarket API down or invalid credentials
- **Fix**: Use mock_data=True or check API status

**Issue**: "Strategy deployment failed"
- **Cause**: Invalid contract ABI or insufficient gas
- **Fix**: Verify StrategyManager ABI and RPC connection

**Issue**: "Edge threshold too high, no strategies found"
- **Cause**: Min edge threshold set too high
- **Fix**: Lower min_edge_threshold in InefficiencyDetector

