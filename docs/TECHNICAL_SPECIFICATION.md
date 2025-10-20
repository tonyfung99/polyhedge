# Technical Specification: PolyHedge Strategy System

## 🎯 System Overview

PolyHedge is a strategy-based arbitrage platform that allows users to buy pre-constructed hedging strategies instead of manually managing complex cross-chain strategies.

## 🏗️ Architecture Components

### **1. Setup Bot** 🤖

#### **Core Responsibilities:**
- Market scanning and opportunity identification
- Strategy construction and validation
- Smart contract interaction
- Private key management

#### **Technical Stack:**
```python
# strategys/python/bot/
├── setup_bot.py           # Main bot orchestrator
├── market_scanner.py      # Polymarket scanning
├── strategy_builder.py     # Strategy construction
├── contract_manager.py    # Smart contract interaction
├── key_manager.py         # Private key management
└── config.py              # Configuration
```

#### **Implementation Details:**

**Market Scanner:**
```python
class MarketScanner:
    def __init__(self):
        self.polymarket_api = PolymarketClient()
        self.pricing_engine = TheoreticalPricingEngine()
    
    async def scan_opportunities(self) -> List[Opportunity]:
        """Scan for arbitrage opportunities"""
        markets = await self.polymarket_api.get_active_markets()
        opportunities = []
        
        for market in markets:
            theoretical_price = self.pricing_engine.calculate_fair_price(
                market.current_price,
                market.target_price,
                market.time_to_expiry,
                market.volatility
            )
            
            edge = self.calculate_edge(market.price, theoretical_price)
            if abs(edge) > 0.1:  # 10% minimum edge
                opportunities.append(Opportunity(market, edge))
        
        return opportunities
```

**Strategy Builder:**
```python
class StrategyBuilder:
    def __init__(self):
        self.position_sizer = KellyPositionSizer()
        self.risk_manager = RiskManager()
    
    def create_strategys(self, opportunities: List[Opportunity]) -> List[Strategy]:
        """Create hedging strategys from opportunities"""
        strategys = []
        
        # Group opportunities by asset and expiry
        grouped = self.group_opportunities(opportunities)
        
        for group in grouped:
            strategy = self.build_hedged_strategy(group)
            if self.validate_strategy(strategy):
                strategys.append(strategy)
        
        return strategys
```

**Contract Manager:**
```python
class ContractManager:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(POLYGON_RPC))
        self.contract = self.w3.eth.contract(
            address=PACKAGE_MANAGER_ADDRESS,
            abi=PACKAGE_MANAGER_ABI
        )
        self.private_key = self.load_private_key()
    
    async def deploy_strategy(self, strategy: Strategy):
        """Deploy strategy to smart contract"""
        tx = self.contract.functions.createStrategy(
            strategy.id,
            strategy.name,
            strategy.expected_return,
            strategy.fee,
            strategy.maturity_date,
            strategy.details
        ).build_transaction({
            'from': self.account.address,
            'gas': 500000,
            'gasPrice': self.w3.eth.gas_price
        })
        
        signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        return tx_hash
```

### **2. Smart Contract** 📜

#### **Contract Architecture:**
```solidity
// strategys/hardhat/contracts/
├── StrategyManager.sol      # Main strategy management
├── StrategyFactory.sol      # Strategy creation factory
├── OrderExecutor.sol       # Order execution logic
├── PositionTracker.sol     # Position tracking
├── FeeManager.sol          # Fee management
└── SecurityManager.sol     # Security and validation
```

#### **Core Contract Implementation:**

**StrategyManager.sol:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StrategyManager is ReentrancyGuard, Ownable {
    struct Strategy {
        uint256 id;
        string name;
        uint256 expectedReturn; // in basis points (1000 = 10%)
        uint256 fee; // in basis points (200 = 2%)
        bool active;
        uint256 maturityDate;
        uint256 totalValue;
        uint256 soldValue;
        StrategyDetails details;
    }
    
    struct StrategyDetails {
        PolymarketOrder[] polymarketOrders;
        HedgeOrder[] hedgeOrders;
        uint256 expectedProfit;
        uint256 maxSlippage;
    }
    
    struct PolymarketOrder {
        string marketId;
        bool isYes;
        uint256 amount;
        uint256 maxPrice;
    }
    
    struct HedgeOrder {
        string dex;
        string asset;
        bool isLong;
        uint256 amount;
        uint256 maxSlippage;
    }
    
    struct UserPosition {
        uint256 strategyId;
        uint256 amount;
        uint256 purchaseTime;
        bool claimed;
    }
    
    // State variables
    mapping(uint256 => Strategy) public strategys;
    mapping(address => UserPosition[]) public userPositions;
    mapping(uint256 => uint256) public strategySoldValue;
    
    IERC20 public immutable usdc;
    uint256 public nextStrategyId = 1;
    
    // Events
    event StrategyCreated(uint256 indexed strategyId, string name, uint256 expectedReturn);
    event StrategyPurchased(uint256 indexed strategyId, address indexed user, uint256 amount);
    event OrdersExecuted(uint256 indexed strategyId, address indexed user, bool success);
    event StrategyClaimed(uint256 indexed strategyId, address indexed user, uint256 profit);
    
    constructor(address _usdc) {
        usdc = IERC20(_usdc);
    }
    
    // Bot-only functions
    function createStrategy(
        string memory name,
        uint256 expectedReturn,
        uint256 fee,
        uint256 maturityDate,
        StrategyDetails memory details
    ) external onlyOwner returns (uint256) {
        uint256 strategyId = nextStrategyId++;
        
        strategys[strategyId] = Strategy({
            id: strategyId,
            name: name,
            expectedReturn: expectedReturn,
            fee: fee,
            active: true,
            maturityDate: maturityDate,
            totalValue: 0,
            soldValue: 0,
            details: details
        });
        
        emit StrategyCreated(strategyId, name, expectedReturn);
        return strategyId;
    }
    
    // User functions
    function buyStrategy(uint256 strategyId, uint256 amount) 
        external 
        nonReentrant 
    {
        Strategy storage strategy = strategys[strategyId];
        require(strategy.active, "Strategy not active");
        require(amount > 0, "Amount must be positive");
        require(block.timestamp < strategy.maturityDate, "Strategy expired");
        
        // Transfer USDC from user
        usdc.transferFrom(msg.sender, address(this), amount);
        
        // Calculate fee
        uint256 feeAmount = (amount * strategy.fee) / 10000;
        uint256 netAmount = amount - feeAmount;
        
        // Update strategy sold value
        strategy.soldValue += netAmount;
        
        // Create user position
        userPositions[msg.sender].push(UserPosition({
            strategyId: strategyId,
            amount: netAmount,
            purchaseTime: block.timestamp,
            claimed: false
        }));
        
        emit StrategyPurchased(strategyId, msg.sender, amount);
    }
    
    function claimStrategy(uint256 strategyId) external nonReentrant {
        Strategy storage strategy = strategys[strategyId];
        require(block.timestamp >= strategy.maturityDate, "Strategy not mature");
        
        // Find user position
        UserPosition[] storage positions = userPositions[msg.sender];
        UserPosition storage position;
        bool found = false;
        
        for (uint256 i = 0; i < positions.length; i++) {
            if (positions[i].strategyId == strategyId && !positions[i].claimed) {
                position = positions[i];
                found = true;
                break;
            }
        }
        
        require(found, "Position not found or already claimed");
        
        // Calculate profit (simplified - in reality would be based on actual results)
        uint256 profit = (position.amount * strategy.expectedReturn) / 10000;
        uint256 totalAmount = position.amount + profit;
        
        // Mark as claimed
        position.claimed = true;
        
        // Transfer funds to user
        usdc.transfer(msg.sender, totalAmount);
        
        emit StrategyClaimed(strategyId, msg.sender, profit);
    }
    
    // Bridge functions
    function reportExecutionStatus(
        uint256 strategyId,
        address user,
        bool success
    ) external onlyOwner {
        emit OrdersExecuted(strategyId, user, success);
    }
}
```

### **3. Bridge/Executor System** 🌉

#### **Architecture:**
```typescript
// strategies/bridge/
├── event-listener.ts       # Smart contract event monitoring
├── order-executor.ts       # Order execution logic (Polymarket + DEX)
├── cross-chain-bridge.ts   # Cross-chain bridging (LayerZero/Stargate)
├── settlement.ts           # Compute payout factor & settleStrategy
├── status-reporter.ts      # Status reporting
└── config.ts               # Configuration
```

#### **Implementation Details:**

**Event Listener:**
```typescript
// strategys/bridge/event-listener.ts
import { ethers } from 'ethers';
import { BlockscoutClient } from './blockscout-client';

export class EventListener {
    private provider: ethers.providers.JsonRpcProvider;
    private contract: ethers.Contract;
    private blockscout: BlockscoutClient;
    
    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC);
        this.contract = new ethers.Contract(
            PACKAGE_MANAGER_ADDRESS,
            PACKAGE_MANAGER_ABI,
            this.provider
        );
        this.blockscout = new BlockscoutClient();
    }
    
    async startListening() {
        console.log('Starting event listener...');
        
        // Listen for StrategyPurchased events
        this.contract.on('StrategyPurchased', async (strategyId, user, amount, event) => {
            console.log(`Strategy ${strategyId} purchased by ${user} for ${amount}`);
            await this.handleStrategyPurchase(strategyId, user, amount);
        });
        
        // Listen for strategy creation events
        this.contract.on('StrategyCreated', async (strategyId, name, expectedReturn) => {
            console.log(`New strategy created: ${strategyId} - ${name}`);
            await this.updateStrategyCache(strategyId);
        });
    }
    
    private async handleStrategyPurchase(
        strategyId: number,
        user: string,
        amount: bigint
    ) {
        try {
            // Get strategy details
            const strategyDetails = await this.getStrategyDetails(strategyId);
            
            // Execute orders
            const executor = new OrderExecutor();
            const success = await executor.executeOrders(strategyDetails, user, amount);
            
            // Report status back to contract
            const reporter = new StatusReporter();
            await reporter.reportExecutionStatus(strategyId, user, success);
            
        } catch (error) {
            console.error(`Error handling strategy purchase: ${error}`);
            // Report failure
            const reporter = new StatusReporter();
            await reporter.reportExecutionStatus(strategyId, user, false);
        }
    }
}
```

**Order Executor:**
```typescript
// strategys/bridge/order-executor.ts
import { PolymarketClient } from './polymarket-client';
import { GMXClient } from './gmx-client';
import { CrossChainBridge } from './cross-chain-bridge';

export class OrderExecutor {
    private polymarket: PolymarketClient;
    private gmx: GMXClient;
    private bridge: CrossChainBridge;
    
    constructor() {
        this.polymarket = new PolymarketClient();
        this.gmx = new GMXClient();
        this.bridge = new CrossChainBridge();
    }
    
    async executeOrders(
        strategyDetails: StrategyDetails,
        user: string,
        amount: bigint
    ): Promise<boolean> {
        try {
            // 1. Execute Polymarket orders
            const polymarketSuccess = await this.executePolymarketOrders(
                strategyDetails.polymarketOrders,
                user,
                amount
            );
            
            if (!polymarketSuccess) {
                throw new Error('Polymarket order execution failed');
            }
            
            // 2. Bridge funds to Arbitrum for hedging
            const bridgeSuccess = await this.bridge.bridgeToArbitrum(
                user,
                amount / 2n // Bridge half for hedging
            );
            
            if (!bridgeSuccess) {
                throw new Error('Cross-chain bridge failed');
            }
            
            // 3. Execute hedge orders on GMX
            const hedgeSuccess = await this.executeHedgeOrders(
                strategyDetails.hedgeOrders,
                user
            );
            
            return polymarketSuccess && bridgeSuccess && hedgeSuccess;
            
        } catch (error) {
            console.error(`Order execution failed: ${error}`);
            return false;
        }
    }
    
    private async executePolymarketOrders(
        orders: PolymarketOrder[],
        user: string,
        amount: bigint
    ): Promise<boolean> {
        for (const order of orders) {
            const success = await this.polymarket.placeOrder({
                marketId: order.marketId,
                side: order.isYes ? 'YES' : 'NO',
                amount: order.amount,
                maxPrice: order.maxPrice,
                user: user
            });
            
            if (!success) {
                return false;
            }
        }
        return true;
    }
    
    private async executeHedgeOrders(
        orders: HedgeOrder[],
        user: string
    ): Promise<boolean> {
        for (const order of orders) {
            const success = await this.gmx.openPosition({
                asset: order.asset,
                side: order.isLong ? 'LONG' : 'SHORT',
                amount: order.amount,
                maxSlippage: order.maxSlippage,
                user: user
            });
            
            if (!success) {
                return false;
            }
        }
        return true;
    }
}
```

**Cross-Chain Bridge:**
```typescript
// strategys/bridge/cross-chain-bridge.ts
import { StargateClient } from '@layerzerolabs/stargate-sdk';

export class CrossChainBridge {
    private stargate: StargateClient;
    
    constructor() {
        this.stargate = new StargateClient({
            rpcUrl: ARBITRUM_RPC,
            chainId: 42161
        });
    }
    
    async bridgeToArbitrum(user: string, amount: bigint): Promise<boolean> {
        try {
            const tx = await this.stargate.swap({
                srcChainId: 137, // Polygon
                dstChainId: 42161, // Arbitrum
                srcToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC on Polygon
                dstToken: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC on Arbitrum
                amount: amount.toString(),
                recipient: user
            });
            
            // Wait for transaction confirmation
            await tx.wait();
            return true;
            
        } catch (error) {
            console.error(`Bridge failed: ${error}`);
            return false;
        }
    }
}
```

### **4. Frontend** 🖥️

#### **Architecture:**
```typescript
// strategys/nextjs/app/
├── strategys/
│   ├── page.tsx           # Strategy marketplace
│   ├── [id]/
│   │   ├── page.tsx       # Strategy details
│   │   └── buy/
│   │       └── page.tsx   # Purchase flow
├── dashboard/
│   ├── page.tsx           # User dashboard
│   └── positions/
│       └── page.tsx       # Position management
└── api/
    ├── strategys/
    │   └── route.ts       # Strategy API
    └── positions/
        └── route.ts       # Position API
```

#### **Key Components:**

**Strategy Marketplace:**
```typescript
// strategys/nextjs/app/strategys/page.tsx
'use client';

import { useStrategys } from '@/hooks/useStrategys';
import { StrategyCard } from '@/components/StrategyCard';
import { StrategyFilters } from '@/components/StrategyFilters';

export default function StrategysPage() {
    const { strategys, loading, error } = useStrategys();
    
    if (loading) return <div>Loading strategys...</div>;
    if (error) return <div>Error loading strategys: {error.message}</div>;
    
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Available Strategys</h1>
            
            <StrategyFilters />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {strategys.map((strategy) => (
                    <StrategyCard key={strategy.id} strategy={strategy} />
                ))}
            </div>
        </div>
    );
}
```

**Strategy Card Component:**
```typescript
// strategys/nextjs/components/StrategyCard.tsx
'use client';

import { useState } from 'react';
import { useBuyStrategy } from '@/hooks/useBuyStrategy';

interface StrategyCardProps {
    strategy: Strategy;
}

export function StrategyCard({ strategy: pkg }: StrategyCardProps) {
    const [isBuying, setIsBuying] = useState(false);
    const { buyStrategy } = useBuyStrategy();
    
    const handleBuy = async () => {
        setIsBuying(true);
        try {
            await buyStrategy(pkg.id, 1000); // 1000 USDC
        } catch (error) {
            console.error('Purchase failed:', error);
        } finally {
            setIsBuying(false);
        }
    };
    
    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">{pkg.name}</h3>
            <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                    <span>Expected Return:</span>
                    <span className="font-semibold text-green-600">
                        {(pkg.expectedReturn / 100).toFixed(1)}%
                    </span>
                </div>
                <div className="flex justify-between">
                    <span>Fee:</span>
                    <span>{(pkg.fee / 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                    <span>Maturity:</span>
                    <span>{new Date(pkg.maturityDate * 1000).toLocaleDateString()}</span>
                </div>
            </div>
            
            <button
                onClick={handleBuy}
                disabled={isBuying || !pkg.active}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
                {isBuying ? 'Processing...' : 'Buy Strategy'}
            </button>
        </div>
    );
}
```

**User Dashboard:**
```typescript
// strategys/nextjs/app/dashboard/page.tsx
'use client';

import { useUserPositions } from '@/hooks/useUserPositions';
import { PositionCard } from '@/components/PositionCard';
import { PNLChart } from '@/components/PNLChart';

export default function DashboardPage() {
    const { positions, loading, error } = useUserPositions();
    
    if (loading) return <div>Loading positions...</div>;
    if (error) return <div>Error loading positions: {error.message}</div>;
    
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">My Dashboard</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-xl font-semibold mb-4">Active Positions</h2>
                    <div className="space-y-4">
                        {positions.map((position) => (
                            <PositionCard key={position.id} position={position} />
                        ))}
                    </div>
                </div>
                
                <div>
                    <h2 className="text-xl font-semibold mb-4">Performance</h2>
                    <PNLChart positions={positions} />
                </div>
            </div>
        </div>
    );
}
```

## 🔧 Development Setup

### **Environment Variables:**
```bash
# .env.local
POLYGON_RPC_URL=https://polygon-rpc.com
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
PACKAGE_MANAGER_ADDRESS=0x...
USDC_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
POLYMARKET_API_KEY=your_api_key
GMX_API_KEY=your_api_key
LAYERZERO_API_KEY=your_api_key
```

### **Installation:**
```bash
# Install dependencies
yarn install

# Set up Python environment
cd strategys/python
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start development
yarn dev
```

## 🚀 Deployment (3-Day Timeline)

### **Day 1: Smart Contracts**
```bash
# Deploy to Polygon testnet
yarn hardhat deploy --network polygon-mumbai

# Test contracts
yarn hardhat test
```

### **Day 2: Bridge System**
```bash
# Deploy bridge service
cd strategys/bridge
npm run build
npm run start:dev
```

### **Day 3: Frontend & Demo**
```bash
# Deploy to Vercel
yarn vercel

# Prepare demo
yarn build
yarn start
```

---

**This technical specification provides the complete implementation details for the PolyHedge strategy system. Each component is designed to work independently while integrating seamlessly with the others.**
