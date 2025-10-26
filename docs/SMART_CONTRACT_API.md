# Smart Contract API Documentation

Complete reference for all smart contracts in the Polyhedge system and their interactive functions.

## Table of Contents

- [Contract Overview](#contract-overview)
- [StrategyManager](#strategymanager)
- [HedgeExecutor](#hedgeexecutor)
- [PolygonReceiver](#polygonreceiver)
- [Architecture Flow](#architecture-flow)
- [Integration Examples](#integration-examples)

---

## Contract Overview

### Deployment Architecture

| Contract | Chain | Purpose |
|----------|-------|---------|
| `StrategyManager` | Arbitrum | Main user entry point - create/buy/claim strategies |
| `HedgeExecutor` | Arbitrum | Execute GMX perpetual hedges |
| `PolygonReceiver` | Polygon | Manage Polymarket positions via bridge |

### Contract Locations

- **StrategyManager**: `packages/hardhat/contracts/StrategyManager.sol`
- **HedgeExecutor**: `packages/hardhat/contracts/HedgeExecutor.sol`
- **PolygonReceiver**: `packages/hardhat/contracts/PolygonReceiver.sol`

---

## StrategyManager

**Contract**: `StrategyManager.sol`
**Chain**: Arbitrum
**Purpose**: Core strategy management - creation, purchasing, and settlement

### Data Structures

```solidity
struct PolymarketOrder {
    string marketId;        // External market ID reference
    bool isYes;            // YES/NO side
    uint256 amount;        // USDC amount (6 decimals)
    uint256 maxPriceBps;   // Max price in basis points (e.g. 500 = 5%)
}

struct HedgeOrder {
    string dex;            // e.g. "GMX", "Hyperliquid"
    string asset;          // e.g. "BTC", "ETH"
    bool isLong;           // Long/Short direction
    uint256 amount;        // USDC amount (6 decimals)
    uint256 maxSlippageBps; // Slippage tolerance in bps
}

struct Strategy {
    uint256 id;
    string name;
    uint256 feeBps;              // Platform fee in basis points
    uint256 maturityTs;          // Unix timestamp for maturity
    bool active;
    StrategyDetails details;
    bool settled;
    uint256 payoutPerUSDC;       // Settlement payout (6 decimals)
}

struct UserPosition {
    uint256 strategyId;
    uint256 amount;              // Net principal in USDC (post-fee)
    uint256 purchaseTs;
    bool claimed;
}
```

### User Functions

#### `buyStrategy`
Purchase a hedging strategy with USDC.

**Location**: Line 140-166

```solidity
function buyStrategy(uint256 strategyId, uint256 grossAmount) external nonReentrant
```

**Parameters**:
- `strategyId`: ID of the strategy to purchase
- `grossAmount`: Total USDC amount (including fees)

**Requirements**:
- Strategy must be active
- Strategy not settled
- Current time < maturity time
- User must approve USDC transfer first
- Amount > 0

**Behavior**:
1. Transfers USDC from user to contract
2. Deducts platform fee (feeBps)
3. Records user position with net amount
4. Triggers hedge orders via HedgeExecutor
5. Emits `StrategyPurchased` event (bridge listens for Polymarket execution)

**Events Emitted**:
```solidity
event StrategyPurchased(
    uint256 indexed strategyId,
    address indexed user,
    uint256 grossAmount,
    uint256 netAmount
)
```

**Frontend Integration**:
```typescript
// 1. Approve USDC
await usdcContract.approve(strategyManagerAddress, grossAmount);

// 2. Buy strategy
await strategyManager.buyStrategy(strategyId, grossAmount);
```

---

#### `claimStrategy`
Claim payout after strategy matures and settles.

**Location**: Line 168-193

```solidity
function claimStrategy(uint256 strategyId) external nonReentrant
```

**Parameters**:
- `strategyId`: ID of the matured strategy

**Requirements**:
- Current time >= maturity time
- Strategy has been settled
- Payout ratio is set
- User has unclaimed position

**Behavior**:
1. Finds user's position for this strategy
2. Marks position as claimed
3. Calculates payout = `(netAmount * payoutPerUSDC) / 1_000_000`
4. Transfers USDC to user
5. Emits `StrategyClaimed` event

**Events Emitted**:
```solidity
event StrategyClaimed(
    uint256 indexed strategyId,
    address indexed user,
    uint256 payoutAmount
)
```

**Frontend Integration**:
```typescript
await strategyManager.claimStrategy(strategyId);
```

---

### Admin Functions

#### `createStrategy`
Create a new hedging strategy (owner only).

**Location**: Line 102-134

```solidity
function createStrategy(
    string calldata name,
    uint256 feeBps,
    uint256 maturityTs,
    PolymarketOrder[] calldata pmOrders,
    HedgeOrder[] calldata hedgeOrders,
    uint256 expectedProfitBps
) external onlyOwner returns (uint256 strategyId)
```

**Parameters**:
- `name`: Strategy name
- `feeBps`: Platform fee in basis points (max 2000 = 20%)
- `maturityTs`: Maturity timestamp (must be future)
- `pmOrders`: Array of Polymarket orders
- `hedgeOrders`: Array of hedge orders (GMX, etc.)
- `expectedProfitBps`: Expected profit in basis points

**Returns**: New strategy ID

**Events Emitted**:
```solidity
event StrategyCreated(uint256 indexed strategyId, string name, uint256 maturityTs)
```

---

#### `settleStrategy`
Settle a matured strategy with final payout ratio (owner only).

**Location**: Line 203-213

```solidity
function settleStrategy(uint256 strategyId, uint256 payoutPerUSDC) external onlyOwner
```

**Parameters**:
- `strategyId`: Strategy to settle
- `payoutPerUSDC`: Payout per USDC (6 decimals, e.g., 1.08e6 = 1.08 USDC per 1 USDC)

**Requirements**:
- Current time >= maturity
- Not already settled
- Valid payout ratio

**Events Emitted**:
```solidity
event StrategySettled(uint256 indexed strategyId, uint256 payoutPerUSDC)
```

---

#### `reportExecutionStatus`
Report execution status (owner only, used by bridge).

**Location**: Line 198-200

```solidity
function reportExecutionStatus(uint256 strategyId, address user, bool success) external onlyOwner
```

**Events Emitted**:
```solidity
event OrdersExecuted(uint256 indexed strategyId, address indexed user, bool success)
```

---

### View Functions

```solidity
// Get strategy details
function strategies(uint256 strategyId) external view returns (Strategy memory)

// Get user positions
function userPositions(address user) external view returns (UserPosition[] memory)

// Get USDC token address
function usdc() external view returns (IERC20)

// Get HedgeExecutor address
function hedgeExecutor() external view returns (IHedgeExecutor)

// Get next strategy ID
function nextStrategyId() external view returns (uint256)
```

---

## HedgeExecutor

**Contract**: `HedgeExecutor.sol`
**Chain**: Arbitrum
**Purpose**: Execute perpetual hedge positions on GMX

### Data Structures

```solidity
struct HedgeOrder {
    uint256 strategyId;
    address user;
    string asset;           // e.g., "BTC", "ETH"
    bool isLong;
    uint256 amount;         // USDC amount
    uint256 maxSlippageBps;
    bool executed;
    bytes32 gmxOrderKey;    // GMX order reference
}
```

### Core Functions

#### `createHedgeOrder`
Create a hedge position on GMX (called by StrategyManager).

**Location**: Line 106-142

```solidity
function createHedgeOrder(
    uint256 strategyId,
    address user,
    string calldata asset,
    bool isLong,
    uint256 amount,
    uint256 maxSlippageBps
) external nonReentrant
```

**Parameters**:
- `strategyId`: Strategy ID
- `user`: User address
- `asset`: Asset symbol ("BTC", "ETH")
- `isLong`: True for long, false for short
- `amount`: USDC collateral amount
- `maxSlippageBps`: Maximum slippage in basis points

**Requirements**:
- Only callable by StrategyManager
- Amount > 0
- Asset market configured
- Sufficient USDC balance

**Behavior**:
1. Validates caller is StrategyManager
2. Approves USDC for GMX router
3. Constructs GMX V2 order parameters
4. Calls GMX ExchangeRouter to create order
5. Stores hedge order with GMX key
6. Maps GMX order key to strategy ID

**Events Emitted**:
```solidity
event HedgeOrderCreated(
    uint256 indexed strategyId,
    address indexed user,
    string asset,
    bool isLong,
    uint256 amount,
    bytes32 gmxOrderKey
)
event MessageReceived(uint256 indexed strategyId, address indexed user)
event HedgeOrderExecuted(uint256 indexed strategyId, bytes32 gmxOrderKey)
```

---

#### `closeHedgeOrder`
Close a hedge position at maturity (owner only).

**Location**: Line 188-198

```solidity
function closeHedgeOrder(uint256 strategyId, int256 realizedPnL) external nonReentrant onlyOwner
```

**Parameters**:
- `strategyId`: Strategy to close
- `realizedPnL`: Realized profit/loss

**Requirements**:
- Not already closed
- Order exists

**Events Emitted**:
```solidity
event HedgeOrderClosed(uint256 indexed strategyId, uint256 realizedPnL)
```

---

### Admin Functions

#### `setStrategyManager`
Set StrategyManager address (one-time setup, owner only).

**Location**: Line 87-91

```solidity
function setStrategyManager(address _strategyManager) external onlyOwner
```

**Requirements**:
- Valid address
- Can only be set once

---

#### `setAssetMarket`
Configure GMX market address for an asset (owner only).

**Location**: Line 97-100

```solidity
function setAssetMarket(string calldata asset, address marketAddress) external onlyOwner
```

**Parameters**:
- `asset`: Asset symbol (e.g., "BTC", "ETH")
- `marketAddress`: GMX market contract address

**Example**:
```solidity
hedgeExecutor.setAssetMarket("BTC", 0x47c031236e19d024b42f8AE6780E44A573170703);
hedgeExecutor.setAssetMarket("ETH", 0x70d95587d40A2caf56bd97485aB3Eec10Bee6336);
```

---

#### `withdrawUSDC`
Emergency USDC withdrawal (owner only).

**Location**: Line 224-226

```solidity
function withdrawUSDC(uint256 amount) external onlyOwner
```

---

### View Functions

```solidity
// Get hedge order details
function getHedgeOrder(uint256 strategyId) external view returns (HedgeOrder memory)

// Get strategy ID from GMX order key
function getStrategyIdFromGMXOrder(bytes32 gmxOrderKey) external view returns (uint256)

// Check if order executed
function isOrderExecuted(uint256 strategyId) external view returns (bool)

// Get hedge orders mapping
function hedgeOrders(uint256 strategyId) external view returns (HedgeOrder memory)

// Check if order closed
function ordersClosed(uint256 strategyId) external view returns (bool)

// Get GMX key to strategy mapping
function gmxKeyToStrategyId(bytes32 gmxKey) external view returns (uint256)

// Get asset market addresses
function assetMarkets(string calldata asset) external view returns (address)

// Get contract addresses
function strategyManager() external view returns (address)
function gmxExchangeRouter() external view returns (IGMXExchangeRouter)
function gmxRouter() external view returns (IGMXRouter)
function usdc() external view returns (IERC20)
```

---

## PolygonReceiver

**Contract**: `PolygonReceiver.sol`
**Chain**: Polygon
**Purpose**: Manage Polymarket positions via bridge coordination

### Data Structures

```solidity
struct PolymarketPosition {
    uint256 marketId;
    string side;           // "BUY" or "SELL"
    uint256 shares;        // Amount of shares held
    uint256 entryPrice;    // Price at entry
}
```

### Bridge Functions (Owner Only)

All functions are owner-only and called by the bridge service.

#### `receiveUSDC`
Record USDC receipt from bridge.

**Location**: Line 56-68

```solidity
function receiveUSDC(uint256 strategyId, address user, uint256 amount)
    external
    onlyOwner
    nonReentrant
```

**Parameters**:
- `strategyId`: Strategy ID
- `user`: User address
- `amount`: USDC amount received

**Events Emitted**:
```solidity
event USDCReceived(uint256 indexed strategyId, address indexed user, uint256 amount)
```

---

#### `recordPolymarketOrder`
Record Polymarket position placement.

**Location**: Line 74-89

```solidity
function recordPolymarketOrder(
    uint256 strategyId,
    uint256 marketId,
    string calldata side,
    uint256 shares,
    uint256 entryPrice
) external onlyOwner
```

**Parameters**:
- `strategyId`: Strategy ID
- `marketId`: Polymarket market ID
- `side`: "BUY" or "SELL"
- `shares`: Number of shares
- `entryPrice`: Entry price

**Events Emitted**:
```solidity
event PolymarketOrderPlaced(
    uint256 indexed strategyId,
    uint256 marketId,
    string side,
    uint256 shares
)
```

---

#### `closePolymarketPosition`
Close a Polymarket position.

**Location**: Line 95-108

```solidity
function closePolymarketPosition(
    uint256 strategyId,
    uint256 positionIndex,
    uint256 finalValue
) external onlyOwner
```

**Parameters**:
- `strategyId`: Strategy ID
- `positionIndex`: Index in positions array
- `finalValue`: Final position value

**Events Emitted**:
```solidity
event PolymarketOrderClosed(
    uint256 indexed strategyId,
    uint256 marketId,
    uint256 finalValue
)
```

---

#### `settleStrategy`
Settle strategy and calculate PnL.

**Location**: Line 114-126

```solidity
function settleStrategy(
    uint256 strategyId,
    uint256 totalBalance
) external onlyOwner
```

**Parameters**:
- `strategyId`: Strategy to settle
- `totalBalance`: Final USDC balance

**Behavior**:
Calculates `realizedPnL = totalBalance - initialBalance`

**Events Emitted**:
```solidity
event StrategySettled(
    uint256 indexed strategyId,
    uint256 realizedPnL,
    uint256 finalBalance
)
```

---

#### `withdrawFunds`
Withdraw settled funds to bridge back to Arbitrum.

**Location**: Line 132-145

```solidity
function withdrawFunds(
    uint256 strategyId,
    address recipient,
    uint256 amount
) external onlyOwner nonReentrant
```

**Requirements**:
- Strategy must be settled
- Sufficient balance

**Events Emitted**:
```solidity
event FundsWithdrawn(
    uint256 indexed strategyId,
    address indexed recipient,
    uint256 amount
)
```

---

### View Functions

```solidity
// View all positions for a strategy
function getPositions(uint256 strategyId)
    external
    view
    returns (PolymarketPosition[] memory)

// Check settlement status
function isSettled(uint256 strategyId) external view returns (bool)

// Get user funds for strategy
function userFunds(uint256 strategyId, address user) external view returns (uint256)

// Get total strategy funds
function strategyFunds(uint256 strategyId) external view returns (uint256)

// Get positions array
function positions(uint256 strategyId) external view returns (PolymarketPosition[] memory)

// Get settlement status
function settlementStatus(uint256 strategyId) external view returns (bool)

// Get USDC address
function usdc() external view returns (IERC20)
```

---

## Architecture Flow

### Strategy Purchase Flow

```
User (Frontend)
    |
    | 1. approve USDC
    v
StrategyManager.buyStrategy()
    |
    | 2. transfers USDC
    | 3. records position
    | 4. emits StrategyPurchased
    |
    +---> 5. calls HedgeExecutor.createHedgeOrder()
    |           |
    |           | 6. creates GMX position
    |           | 7. emits HedgeOrderCreated
    |           v
    |        GMX Protocol
    |
    | (Bridge listens to StrategyPurchased event)
    |
    v
Bridge Service
    |
    | 8. bridges USDC to Polygon
    | 9. executes Polymarket order (off-chain)
    | 10. calls PolygonReceiver.recordPolymarketOrder()
    v
Polymarket API
```

### Settlement Flow

```
Strategy Matures
    |
    v
Bridge Service (Monitor)
    |
    +---> 1. Close GMX Position
    |          |
    |          | calls HedgeExecutor.closeHedgeOrder()
    |          | gets GMX PnL
    |          v
    |     GMX Protocol
    |
    +---> 2. Close Polymarket Position
    |          |
    |          | executes via API
    |          | calls PolygonReceiver.closePolymarketPosition()
    |          | calls PolygonReceiver.settleStrategy()
    |          v
    |     Polymarket API
    |
    | 3. Calculate total PnL
    | 4. calls StrategyManager.settleStrategy(payoutPerUSDC)
    v
StrategyManager (settled)
    |
    | User calls claimStrategy()
    v
User receives USDC payout
```

---

## Integration Examples

### Frontend: Buy Strategy

```typescript
import { ethers } from 'ethers';

// Contract ABIs and addresses
const STRATEGY_MANAGER_ADDRESS = "0x...";
const USDC_ADDRESS = "0x...";

// 1. Connect wallet
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// 2. Get contracts
const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
const strategyManager = new ethers.Contract(
  STRATEGY_MANAGER_ADDRESS,
  STRATEGY_MANAGER_ABI,
  signer
);

// 3. Approve USDC
const grossAmount = ethers.parseUnits("100", 6); // 100 USDC
const approveTx = await usdcContract.approve(
  STRATEGY_MANAGER_ADDRESS,
  grossAmount
);
await approveTx.wait();

// 4. Buy strategy
const buyTx = await strategyManager.buyStrategy(strategyId, grossAmount);
await buyTx.wait();

console.log("Strategy purchased!");
```

### Frontend: View Strategy Details

```typescript
// Get strategy info
const strategy = await strategyManager.strategies(strategyId);

console.log({
  name: strategy.name,
  feeBps: strategy.feeBps,
  maturityDate: new Date(strategy.maturityTs * 1000),
  active: strategy.active,
  settled: strategy.settled,
  payoutPerUSDC: strategy.payoutPerUSDC
});

// Get user positions
const positions = await strategyManager.userPositions(userAddress);
console.log("User positions:", positions);
```

### Frontend: Claim Strategy

```typescript
// Check if strategy is settled
const strategy = await strategyManager.strategies(strategyId);

if (!strategy.settled) {
  console.log("Strategy not yet settled");
  return;
}

if (Date.now() / 1000 < strategy.maturityTs) {
  console.log("Strategy not yet matured");
  return;
}

// Claim payout
const claimTx = await strategyManager.claimStrategy(strategyId);
await claimTx.wait();

console.log("Payout claimed!");
```

### Frontend: Listen to Events

```typescript
// Listen for strategy purchases
strategyManager.on("StrategyPurchased", (strategyId, user, grossAmount, netAmount) => {
  console.log(`Strategy ${strategyId} purchased by ${user}`);
  console.log(`Gross: ${ethers.formatUnits(grossAmount, 6)} USDC`);
  console.log(`Net: ${ethers.formatUnits(netAmount, 6)} USDC`);
});

// Listen for settlements
strategyManager.on("StrategySettled", (strategyId, payoutPerUSDC) => {
  console.log(`Strategy ${strategyId} settled`);
  console.log(`Payout rate: ${ethers.formatUnits(payoutPerUSDC, 6)} per USDC`);
});

// Listen for claims
strategyManager.on("StrategyClaimed", (strategyId, user, payoutAmount) => {
  console.log(`User ${user} claimed ${ethers.formatUnits(payoutAmount, 6)} USDC`);
});
```

### Backend: Monitor GMX Orders

```typescript
// Get hedge order details
const hedgeOrder = await hedgeExecutor.getHedgeOrder(strategyId);

console.log({
  asset: hedgeOrder.asset,
  isLong: hedgeOrder.isLong,
  amount: ethers.formatUnits(hedgeOrder.amount, 6),
  executed: hedgeOrder.executed,
  gmxOrderKey: hedgeOrder.gmxOrderKey
});

// Check if executed
const isExecuted = await hedgeExecutor.isOrderExecuted(strategyId);
console.log("Order executed:", isExecuted);

// Get strategy ID from GMX order key
const gmxKey = "0x...";
const linkedStrategyId = await hedgeExecutor.getStrategyIdFromGMXOrder(gmxKey);
console.log("Strategy ID:", linkedStrategyId);
```

### Backend: Settlement Process

```typescript
// 1. Close GMX position
const closeTx = await hedgeExecutor.closeHedgeOrder(strategyId, realizedPnL);
await closeTx.wait();

// 2. Close Polymarket position (via bridge)
const closePolyTx = await polygonReceiver.closePolymarketPosition(
  strategyId,
  positionIndex,
  finalValue
);
await closePolyTx.wait();

// 3. Settle on Polygon
const settleTx = await polygonReceiver.settleStrategy(strategyId, totalBalance);
await settleTx.wait();

// 4. Calculate payout ratio
const totalPnL = gmxPnL + polymarketPnL;
const payoutPerUSDC = ethers.parseUnits(
  ((initialAmount + totalPnL) / initialAmount).toString(),
  6
);

// 5. Settle on Arbitrum
const settleStrategyTx = await strategyManager.settleStrategy(
  strategyId,
  payoutPerUSDC
);
await settleStrategyTx.wait();

console.log("Strategy settled successfully!");
```

---

## Quick Reference

### Essential Functions for Frontend

| Function | Contract | Purpose |
|----------|----------|---------|
| `buyStrategy(strategyId, amount)` | StrategyManager | Purchase strategy |
| `claimStrategy(strategyId)` | StrategyManager | Claim payout |
| `strategies(strategyId)` | StrategyManager | Get strategy details |
| `userPositions(address)` | StrategyManager | Get user positions |

### Essential Functions for Backend/Bridge

| Function | Contract | Purpose |
|----------|----------|---------|
| `createHedgeOrder(...)` | HedgeExecutor | Execute GMX hedge |
| `closeHedgeOrder(...)` | HedgeExecutor | Close GMX position |
| `recordPolymarketOrder(...)` | PolygonReceiver | Record PM position |
| `closePolymarketPosition(...)` | PolygonReceiver | Close PM position |
| `settleStrategy(...)` | StrategyManager | Final settlement |

### Key Events to Listen

| Event | Contract | Use Case |
|-------|----------|----------|
| `StrategyPurchased` | StrategyManager | Trigger Polymarket order |
| `HedgeOrderCreated` | HedgeExecutor | Track GMX execution |
| `StrategySettled` | StrategyManager | Enable claims |
| `StrategyClaimed` | StrategyManager | Track payouts |

---

## Notes

- All USDC amounts use 6 decimals
- Basis points: 10000 = 100%, 500 = 5%
- Strategy IDs start from 1
- Events are critical for bridge coordination
- Owner functions require deployer/admin key
- Use `nonReentrant` protection for all state-changing functions

