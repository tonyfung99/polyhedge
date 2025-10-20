# Technical Specification: PolyHedge Package System

## 🎯 System Overview

PolyHedge is a package-based arbitrage platform that allows users to buy pre-constructed hedging packages instead of manually managing complex cross-chain strategies.

## 🏗️ Architecture Components

### **1. Setup Bot** 🤖

#### **Core Responsibilities:**
- Market scanning and opportunity identification
- Package construction and validation
- Smart contract interaction
- Private key management

#### **Technical Stack:**
```python
# packages/python/bot/
├── setup_bot.py           # Main bot orchestrator
├── market_scanner.py      # Polymarket scanning
├── package_builder.py     # Package construction
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

**Package Builder:**
```python
class PackageBuilder:
    def __init__(self):
        self.position_sizer = KellyPositionSizer()
        self.risk_manager = RiskManager()
    
    def create_packages(self, opportunities: List[Opportunity]) -> List[Package]:
        """Create hedging packages from opportunities"""
        packages = []
        
        # Group opportunities by asset and expiry
        grouped = self.group_opportunities(opportunities)
        
        for group in grouped:
            package = self.build_hedged_package(group)
            if self.validate_package(package):
                packages.append(package)
        
        return packages
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
    
    async def deploy_package(self, package: Package):
        """Deploy package to smart contract"""
        tx = self.contract.functions.createPackage(
            package.id,
            package.name,
            package.expected_return,
            package.fee,
            package.maturity_date,
            package.details
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
// packages/hardhat/contracts/
├── PackageManager.sol      # Main package management
├── PackageFactory.sol      # Package creation factory
├── OrderExecutor.sol       # Order execution logic
├── PositionTracker.sol     # Position tracking
├── FeeManager.sol          # Fee management
└── SecurityManager.sol     # Security and validation
```

#### **Core Contract Implementation:**

**PackageManager.sol:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PackageManager is ReentrancyGuard, Ownable {
    struct Package {
        uint256 id;
        string name;
        uint256 expectedReturn; // in basis points (1000 = 10%)
        uint256 fee; // in basis points (200 = 2%)
        bool active;
        uint256 maturityDate;
        uint256 totalValue;
        uint256 soldValue;
        PackageDetails details;
    }
    
    struct PackageDetails {
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
        uint256 packageId;
        uint256 amount;
        uint256 purchaseTime;
        bool claimed;
    }
    
    // State variables
    mapping(uint256 => Package) public packages;
    mapping(address => UserPosition[]) public userPositions;
    mapping(uint256 => uint256) public packageSoldValue;
    
    IERC20 public immutable usdc;
    uint256 public nextPackageId = 1;
    
    // Events
    event PackageCreated(uint256 indexed packageId, string name, uint256 expectedReturn);
    event PackagePurchased(uint256 indexed packageId, address indexed user, uint256 amount);
    event OrdersExecuted(uint256 indexed packageId, address indexed user, bool success);
    event PackageClaimed(uint256 indexed packageId, address indexed user, uint256 profit);
    
    constructor(address _usdc) {
        usdc = IERC20(_usdc);
    }
    
    // Bot-only functions
    function createPackage(
        string memory name,
        uint256 expectedReturn,
        uint256 fee,
        uint256 maturityDate,
        PackageDetails memory details
    ) external onlyOwner returns (uint256) {
        uint256 packageId = nextPackageId++;
        
        packages[packageId] = Package({
            id: packageId,
            name: name,
            expectedReturn: expectedReturn,
            fee: fee,
            active: true,
            maturityDate: maturityDate,
            totalValue: 0,
            soldValue: 0,
            details: details
        });
        
        emit PackageCreated(packageId, name, expectedReturn);
        return packageId;
    }
    
    // User functions
    function buyPackage(uint256 packageId, uint256 amount) 
        external 
        nonReentrant 
    {
        Package storage package = packages[packageId];
        require(package.active, "Package not active");
        require(amount > 0, "Amount must be positive");
        require(block.timestamp < package.maturityDate, "Package expired");
        
        // Transfer USDC from user
        usdc.transferFrom(msg.sender, address(this), amount);
        
        // Calculate fee
        uint256 feeAmount = (amount * package.fee) / 10000;
        uint256 netAmount = amount - feeAmount;
        
        // Update package sold value
        package.soldValue += netAmount;
        
        // Create user position
        userPositions[msg.sender].push(UserPosition({
            packageId: packageId,
            amount: netAmount,
            purchaseTime: block.timestamp,
            claimed: false
        }));
        
        emit PackagePurchased(packageId, msg.sender, amount);
    }
    
    function claimPackage(uint256 packageId) external nonReentrant {
        Package storage package = packages[packageId];
        require(block.timestamp >= package.maturityDate, "Package not mature");
        
        // Find user position
        UserPosition[] storage positions = userPositions[msg.sender];
        UserPosition storage position;
        bool found = false;
        
        for (uint256 i = 0; i < positions.length; i++) {
            if (positions[i].packageId == packageId && !positions[i].claimed) {
                position = positions[i];
                found = true;
                break;
            }
        }
        
        require(found, "Position not found or already claimed");
        
        // Calculate profit (simplified - in reality would be based on actual results)
        uint256 profit = (position.amount * package.expectedReturn) / 10000;
        uint256 totalAmount = position.amount + profit;
        
        // Mark as claimed
        position.claimed = true;
        
        // Transfer funds to user
        usdc.transfer(msg.sender, totalAmount);
        
        emit PackageClaimed(packageId, msg.sender, profit);
    }
    
    // Bridge functions
    function reportExecutionStatus(
        uint256 packageId,
        address user,
        bool success
    ) external onlyOwner {
        emit OrdersExecuted(packageId, user, success);
    }
}
```

### **3. Bridge System** 🌉

#### **Architecture:**
```typescript
// packages/bridge/
├── event-listener.ts       # Smart contract event monitoring
├── order-executor.ts       # Order execution logic
├── cross-chain-bridge.ts   # Cross-chain bridging
├── status-reporter.ts      # Status reporting
└── config.ts              # Configuration
```

#### **Implementation Details:**

**Event Listener:**
```typescript
// packages/bridge/event-listener.ts
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
        
        // Listen for PackagePurchased events
        this.contract.on('PackagePurchased', async (packageId, user, amount, event) => {
            console.log(`Package ${packageId} purchased by ${user} for ${amount}`);
            await this.handlePackagePurchase(packageId, user, amount);
        });
        
        // Listen for package creation events
        this.contract.on('PackageCreated', async (packageId, name, expectedReturn) => {
            console.log(`New package created: ${packageId} - ${name}`);
            await this.updatePackageCache(packageId);
        });
    }
    
    private async handlePackagePurchase(
        packageId: number,
        user: string,
        amount: bigint
    ) {
        try {
            // Get package details
            const packageDetails = await this.getPackageDetails(packageId);
            
            // Execute orders
            const executor = new OrderExecutor();
            const success = await executor.executeOrders(packageDetails, user, amount);
            
            // Report status back to contract
            const reporter = new StatusReporter();
            await reporter.reportExecutionStatus(packageId, user, success);
            
        } catch (error) {
            console.error(`Error handling package purchase: ${error}`);
            // Report failure
            const reporter = new StatusReporter();
            await reporter.reportExecutionStatus(packageId, user, false);
        }
    }
}
```

**Order Executor:**
```typescript
// packages/bridge/order-executor.ts
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
        packageDetails: PackageDetails,
        user: string,
        amount: bigint
    ): Promise<boolean> {
        try {
            // 1. Execute Polymarket orders
            const polymarketSuccess = await this.executePolymarketOrders(
                packageDetails.polymarketOrders,
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
                packageDetails.hedgeOrders,
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
// packages/bridge/cross-chain-bridge.ts
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
// packages/nextjs/app/
├── packages/
│   ├── page.tsx           # Package marketplace
│   ├── [id]/
│   │   ├── page.tsx       # Package details
│   │   └── buy/
│   │       └── page.tsx   # Purchase flow
├── dashboard/
│   ├── page.tsx           # User dashboard
│   └── positions/
│       └── page.tsx       # Position management
└── api/
    ├── packages/
    │   └── route.ts       # Package API
    └── positions/
        └── route.ts       # Position API
```

#### **Key Components:**

**Package Marketplace:**
```typescript
// packages/nextjs/app/packages/page.tsx
'use client';

import { usePackages } from '@/hooks/usePackages';
import { PackageCard } from '@/components/PackageCard';
import { PackageFilters } from '@/components/PackageFilters';

export default function PackagesPage() {
    const { packages, loading, error } = usePackages();
    
    if (loading) return <div>Loading packages...</div>;
    if (error) return <div>Error loading packages: {error.message}</div>;
    
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Available Packages</h1>
            
            <PackageFilters />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((package) => (
                    <PackageCard key={package.id} package={package} />
                ))}
            </div>
        </div>
    );
}
```

**Package Card Component:**
```typescript
// packages/nextjs/components/PackageCard.tsx
'use client';

import { useState } from 'react';
import { useBuyPackage } from '@/hooks/useBuyPackage';

interface PackageCardProps {
    package: Package;
}

export function PackageCard({ package: pkg }: PackageCardProps) {
    const [isBuying, setIsBuying] = useState(false);
    const { buyPackage } = useBuyPackage();
    
    const handleBuy = async () => {
        setIsBuying(true);
        try {
            await buyPackage(pkg.id, 1000); // 1000 USDC
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
                {isBuying ? 'Processing...' : 'Buy Package'}
            </button>
        </div>
    );
}
```

**User Dashboard:**
```typescript
// packages/nextjs/app/dashboard/page.tsx
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
cd packages/python
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start development
yarn dev
```

## 🚀 Deployment

### **Smart Contracts:**
```bash
# Deploy to Polygon
yarn hardhat deploy --network polygon

# Verify contracts
yarn hardhat verify --network polygon
```

### **Bridge System:**
```bash
# Deploy bridge service
cd packages/bridge
npm run build
npm run start
```

### **Frontend:**
```bash
# Deploy to Vercel
yarn vercel
```

---

**This technical specification provides the complete implementation details for the PolyHedge package system. Each component is designed to work independently while integrating seamlessly with the others.**
