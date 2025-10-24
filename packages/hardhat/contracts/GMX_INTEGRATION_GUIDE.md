# GMX Integration Guide

## Overview

PolyHedge integrates with GMX V2 on Arbitrum to automatically execute delta-neutral hedging orders. When a user buys a strategy on the `StrategyManager` contract (Arbitrum), the corresponding hedge orders are automatically created on GMX through the `HedgeExecutor` contract.

## Architecture Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     Frontend (User)                          │
│              1. User buys strategy with USDC                │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
    ┌────────────────────────────────────────────┐
    │  StrategyManager (Arbitrum)               │
    │  • Receives USDC payment                  │
    │  • Deducts 2% fee                         │
    │  • Emits StrategyPurchased event          │
    │  • Calls HedgeExecutor.createHedgeOrder  │
    └────────┬───────────────────────────────────┘
             │
             ▼
    ┌────────────────────────────────────────────┐
    │  HedgeExecutor (Arbitrum)                 │
    │  • Receives hedge order parameters        │
    │  • Approves GMX to spend USDC            │
    │  • Constructs GMX order parameters       │
    │  • Calls GMX ExchangeRouter.createOrder  │
    │  • Stores GMX order key for tracking     │
    └────────┬───────────────────────────────────┘
             │
             ▼
    ┌────────────────────────────────────────────┐
    │  GMX ExchangeRouter (Arbitrum)            │
    │  • Creates perpetual order                │
    │  • Executes market order (no slippage)   │
    │  • Returns order key (bytes32)           │
    └────────────────────────────────────────────┘
```

## Smart Contracts

### 1. StrategyManager (Unchanged for hedge flow)

**File**: `packages/hardhat/contracts/StrategyManager.sol`

**Key Function**: `buyStrategy(strategyId, grossAmount)`

```solidity
function buyStrategy(uint256 strategyId, uint256 grossAmount) external nonReentrant {
  // ... USDC transfer and fee calculation ...

  // NEW: Trigger hedge orders on HedgeExecutor (same chain)
  for (uint256 i = 0; i < s.details.hedgeOrders.length; i++) {
    HedgeOrder storage ho = s.details.hedgeOrders[i];
    hedgeExecutor.createHedgeOrder(
      strategyId,
      msg.sender,
      ho.asset, // "BTC", "ETH", etc.
      ho.isLong, // true for long, false for short
      ho.amount, // USDC amount
      ho.maxSlippageBps // max slippage in basis points
    );
  }
}
```

**When user calls `buyStrategy`**:

1. ✅ USDC transferred from user to StrategyManager
2. ✅ 2% fee deducted
3. ✅ User position recorded
4. ✅ **NEW: HedgeExecutor.createHedgeOrder called for each hedge order**

### 2. HedgeExecutor (NEW: GMX Integration)

**File**: `packages/hardhat/contracts/HedgeExecutor.sol`

**Key Features**:

#### Constructor

```solidity
constructor(
    address _gmxExchangeRouter,  // GMX ExchangeRouter address
    address _gmxRouter,           // GMX Router address
    address _usdc                 // USDC token address
)
```

**Arbitrum Mainnet Addresses**:

- GMX ExchangeRouter: `0x7C68C7E1CDBdD30B08C1c5433f385E814fAc2b9E`
- GMX Router: `0x549352201EB5eba6cdc235D127cAe56d2145DAAF`
- USDC: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`

#### Main Function: `createHedgeOrder`

```solidity
function createHedgeOrder(
    uint256 strategyId,
    address user,
    string calldata asset,       // "BTC", "ETH"
    bool isLong,                 // true = long, false = short
    uint256 amount,              // USDC amount (6 decimals)
    uint256 maxSlippageBps       // max slippage in basis points
) external nonReentrant
```

**What it does**:

1. Validates the asset has a configured market address
2. Checks HedgeExecutor has sufficient USDC balance
3. Approves GMX to spend USDC from HedgeExecutor
4. Constructs GMX order parameters
5. Calls `GMXExchangeRouter.createOrder()`
6. Stores hedge order details and GMX order key
7. Emits events for tracking

#### Internal Function: `_executeGMXOrder`

```solidity
function _executeGMXOrder(
    string calldata asset,
    bool isLong,
    uint256 amount,
    uint256 maxSlippageBps
) internal returns (bytes32 orderKey)
```

**GMX Order Parameters**:

- **addressItems[0]**: Market address (e.g., BTC/USD)
- **addressItems[1]**: Receiver (StrategyManager)
- **addressItems[2]**: Initial collateral token (USDC)
- **addressItems[3]**: Swap path (empty for direct orders)

- **uintItems[0]**: Size delta USD (in USDC value)
- **uintItems[1]**: Initial collateral delta amount
- **uintItems[2]**: Trigger price (0 for market orders)
- **uintItems[3]**: Max slippage in basis points
- **uintItems[4]**: Execution fee (0 for contract)
- **uintItems[5]**: Order type (1 = MarketIncrease)

#### Supporting Functions

```solidity
// Configure market addresses for assets
function setAssetMarket(string calldata asset, address marketAddress) external onlyOwner

// Get hedge order details
function getHedgeOrder(uint256 strategyId) external view returns (HedgeOrder memory)

// Get strategy ID from GMX order key
function getStrategyIdFromGMXOrder(bytes32 gmxOrderKey) external view returns (uint256)

// Check if hedge order was executed
function isOrderExecuted(uint256 strategyId) external view returns (bool)

// Emergency USDC withdrawal
function withdrawUSDC(uint256 amount) external onlyOwner

// Close hedge order at maturity
function closeHedgeOrder(uint256 strategyId, int256 realizedPnL) external onlyOwner
```

## Data Structures

### HedgeOrder Struct

```solidity
struct HedgeOrder {
  uint256 strategyId; // Reference to strategy
  address user; // User who bought strategy
  string asset; // "BTC", "ETH", etc.
  bool isLong; // true = long, false = short
  uint256 amount; // USDC amount (6 decimals)
  uint256 maxSlippageBps; // Max slippage in bps
  bool executed; // Whether GMX order was created
  bytes32 gmxOrderKey; // GMX order key for tracking
}
```

## Events

```solidity
event HedgeOrderCreated(
  uint256 indexed strategyId,
  address indexed user,
  string asset,
  bool isLong,
  uint256 amount,
  bytes32 gmxOrderKey // NEW: GMX order key
);

event HedgeOrderExecuted(
  uint256 indexed strategyId,
  bytes32 gmxOrderKey // NEW: For tracking GMX orders
);

event HedgeOrderClosed(
  uint256 indexed strategyId,
  uint256 realizedPnL // Profit/loss from hedge
);
```

## Deployment

### Development (Local Hardhat)

```bash
yarn hardhat:compile
yarn deploy
```

The deploy script (`02_deploy_hedge_executor.ts`) will:

1. Deploy HedgeExecutor with placeholder GMX addresses
2. Deploy StrategyManager with HedgeExecutor address

### Testnet (Arbitrum Sepolia)

Configure testnet GMX addresses in `deploy/02_deploy_hedge_executor.ts`:

```solidity
arbitrumSepolia: {
    exchangeRouter: "0x...",
    router: "0x...",
    usdc: "0x...",
}
```

### Mainnet (Arbitrum)

Deploy script automatically uses:

- GMX ExchangeRouter: `0x7C68C7E1CDBdD30B08C1c5433f385E814fAc2b9E`
- GMX Router: `0x549352201EB5eba6cdc235D127cAe56d2145DAAF`
- USDC: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`

## Setup Steps

### 1. Configure Asset Markets

After deployment, configure which assets are available:

```solidity
// BTC/USD market on GMX
hedgeExecutor.setAssetMarket("BTC", "0x47c031236e19Ce8B56b471839CFCa3B40D8e44DF");

// ETH/USD market on GMX
hedgeExecutor.setAssetMarket("ETH", "0x70d95587D40A2caf56bd97485aB3Ee5E6a7080a");

// SOL/USD market on GMX
hedgeExecutor.setAssetMarket("SOL", "0x09635F8b8b3Ee330A6f2dEA937EADC0B4CFd112B");
```

### 2. Fund HedgeExecutor with USDC

Transfer USDC to HedgeExecutor contract to pay for hedge orders:

```bash
# Transfer 1000 USDC to HedgeExecutor
usdc.transfer(hedgeExecutorAddress, 1000_000_000);
```

### 3. Set StrategyManager Address

StrategyManager must be set after deployment:

```solidity
hedgeExecutor.setStrategyManager(strategyManagerAddress);
```

## Testing

Run the comprehensive test suite:

```bash
yarn hardhat:test
```

**Test Coverage**:

- ✅ Strategy creation with hedge orders
- ✅ User purchases strategy with USDC
- ✅ Hedge order execution on purchase
- ✅ Hedge order closure at maturity
- ✅ Strategy settlement and payout
- ✅ User claims profits

## Usage Example

### User Perspective

1. **Frontend displays opportunities**:
   - BTC undervalued by 200%
   - Recommended hedge: short 0.5 BTC on GMX

2. **User clicks "Buy Strategy"**:
   - Approves StrategyManager to spend USDC
   - Sends transaction: `buyStrategy(strategyId, 1000_000_000)` (1000 USDC)

3. **What happens on-chain**:
   - ✅ StrategyManager receives 1000 USDC
   - ✅ 2% fee (20 USDC) deducted
   - ✅ 980 USDC recorded as user position
   - ✅ 500 USDC (50% of net) sent to hedge order creation
   - ✅ HedgeExecutor creates short 0.5 BTC position on GMX
   - ✅ User now has:
     - Long arbitrage position (Polymarket)
     - Short hedge position (GMX)
     - Delta-neutral exposure (protected from BTC volatility)

4. **At maturity**:
   - Bridge service closes Polymarket positions
   - Backend calls `closeHedgeOrder()` on HedgeExecutor
   - GMX closes short position
   - Settlement computed and reported
   - User claims profit via `claimStrategy()`

## GMX Order Details

### Order Parameters

**Example: Short 0.5 BTC with $5000 USDC**

```javascript
// Market: BTC/USD (long or short)
addressItems[0] = "0x47c031236e19Ce8B56b471839CFCa3B40D8e44DF";

// Receiver (StrategyManager for cross-chain support)
addressItems[1] = strategyManagerAddress;

// Collateral token (USDC)
addressItems[2] = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

// No swap path needed
addressItems[3] = address(0);

// Order size: $5000 USDC
uintItems[0] = 5_000_000_000; // 5000 * 1e6

// Collateral: same as size for 1x leverage
uintItems[1] = 5_000_000_000;

// Market order (no trigger price)
uintItems[2] = 0;

// Max slippage: 100 bps (1%)
uintItems[3] = 100;

// Execution fee (contract pays)
uintItems[4] = 0;

// Order type: MarketIncrease (1)
uintItems[5] = 1; // or 0 for short
```

## Monitoring

### Events to Watch

```solidity
// When hedge order created
event HedgeOrderCreated(uint256 strategyId, address user, string asset, bool isLong, uint256 amount, bytes32 gmxOrderKey)

// When GMX order executed
event HedgeOrderExecuted(uint256 strategyId, bytes32 gmxOrderKey)

// When hedge order closed
event HedgeOrderClosed(uint256 strategyId, uint256 realizedPnL)
```

## Bridge Service Integration

The bridge service (`packages/bridge/`) listens for `StrategyPurchased` events and:

1. **On StrategyPurchased**:
   - Detects hedge order was created via `HedgeOrderCreated` event
   - Waits for GMX order execution
   - Tracks order via `gmxOrderKey`

2. **On Strategy Maturity**:
   - Calls `HedgeExecutor.closeHedgeOrder(strategyId, realizedPnL)`
   - Retrieves PnL from GMX
   - Reports to StrategyManager for settlement

3. **On Settlement**:
   - Calls `StrategyManager.settleStrategy()` with final payout
   - User can then claim profits

## Troubleshooting

### 1. Hedge Order Fails to Execute

**Error**: `asset not supported`

**Solution**: Configure asset market address:

```solidity
hedgeExecutor.setAssetMarket("BTC", marketAddress);
```

### 2. Insufficient USDC Balance

**Error**: `insufficient USDC balance`

**Solution**: Fund HedgeExecutor with USDC:

```bash
usdc.transfer(hedgeExecutor, amount);
```

### 3. GMX Approval Fails

**Error**: Reverted in `_executeGMXOrder`

**Solution**: Ensure USDC.approve() succeeds:

```solidity
usdc.approve(gmxRouter, amount);
```

### 4. Order Not Tracked

**Error**: Can't find order via `gmxKeyToStrategyId`

**Solution**: Check event logs for `HedgeOrderExecuted`:

```javascript
// Query logs: HedgeOrderExecuted(strategyId, gmxOrderKey)
// Look for HedgeOrderCreated event to confirm execution
```

## Future Enhancements

- [ ] Support for different DEX backends (Hyperliquid, Gains, etc.)
- [ ] Dynamic leverage calculation based on volatility
- [ ] Stop-loss orders for hedge protection
- [ ] Automated rebalancing on volatility changes
- [ ] Multi-asset hedge orders in single transaction
- [ ] Limit orders instead of just market orders
- [ ] Options strategies for tail risk protection

## References

- [GMX V2 Documentation](https://gmx.io/)
- [GMX ExchangeRouter Contract](https://arbiscan.io/address/0x7C68C7E1CDBdD30B08C1c5433f385E814fAc2b9E)
- [Arbitrum RPC Endpoints](https://docs.arbitrum.io/public-chains)
