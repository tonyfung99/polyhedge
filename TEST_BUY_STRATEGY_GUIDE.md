# Test Buying Strategies on Arbitrum Sepolia

This guide explains how to test buying strategies on the deployed Arbitrum Sepolia testnet contracts.

## Prerequisites

### 1. Get Testnet ETH

You need Arbitrum Sepolia ETH for gas fees.

**Faucet:** https://www.alchemy.com/faucets/arbitrum-sepolia

### 2. Get Testnet USDC

You need testnet USDC to buy strategies.

**Option 1: Bridge from Sepolia**

1. Get Sepolia ETH from https://www.alchemy.com/faucets/ethereum-sepolia
2. Get Sepolia USDC from Circle faucet or Aave faucet
3. Bridge to Arbitrum Sepolia: https://bridge.arbitrum.io/?destinationChain=arbitrum-sepolia

**Option 2: Testnet USDC Faucet**
Check for Arbitrum Sepolia USDC faucets

**USDC Contract Address (Arbitrum Sepolia):**

```
0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
```

### 3. Environment Setup

Make sure your `.env` file is configured:

```bash
# Required
PRIVATE_KEY=your_private_key_here

# Optional (defaults provided)
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
STRATEGY_MANAGER_ADDRESS=0xc707d360BEc8048760F028f852cF1E244d155710
USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
```

---

## Method 1: Python Script (Recommended)

### Run the Test

```bash
cd packages/python/scripts
python test_buy_strategy.py
```

### What the Script Does

1. ✅ Connects to Arbitrum Sepolia
2. ✅ Checks your ETH and USDC balances
3. ✅ Lists all available strategies
4. ✅ Selects the first active strategy
5. ✅ Approves USDC spending (if needed)
6. ✅ Buys the strategy with 100 USDC
7. ✅ Displays transaction hash and events
8. ✅ Shows updated balances

### Expected Output

```
================================================================================
🚀 STRATEGY PURCHASE TEST - ARBITRUM SEPOLIA
================================================================================

✅ Connected to Arbitrum Sepolia
   Account: 0x1234...
   StrategyManager: 0xc707d360BEc8048760F028f852cF1E244d155710
   USDC: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d

================================================================================
💳 CHECKING BALANCES
================================================================================
ETH Balance: 0.500000 ETH
USDC Balance: 1000.00 USDC
USDC Allowance: 0.00 USDC

================================================================================
📋 FETCHING AVAILABLE STRATEGIES
================================================================================
Next Strategy ID: 6

Strategy #1: BTC Price Strategy - YES
  Status: ✅ ACTIVE
  Fee: 2.0%
  Maturity: 1735689600
  Settled: False

Strategy #2: BTC Price Strategy - YES
  Status: ✅ ACTIVE
  Fee: 2.0%
  Maturity: 1735689600
  Settled: False

✅ Found 2 strategies

================================================================================
🎯 SELECTED STRATEGY: #1 - BTC Price Strategy - YES
================================================================================

================================================================================
💰 APPROVING USDC SPENDING
================================================================================
Approving 200.0 USDC for StrategyManager...
Transaction sent: 0xabc123...
Waiting for confirmation...
✅ Approval successful!
   Block: 208675200
   Gas used: 46234

================================================================================
🛒 BUYING STRATEGY
================================================================================
Strategy ID: 1
Amount: 100.0 USDC
Transaction sent: 0xdef456...
Waiting for confirmation...
✅ Strategy purchase successful!
   Block: 208675205
   Gas used: 234567

📡 EVENTS EMITTED:

  ✅ StrategyPurchased:
     Strategy ID: 1
     User: 0x1234...
     Gross Amount: 100.0 USDC
     Net Amount: 98.0 USDC

================================================================================
✅ TEST COMPLETED SUCCESSFULLY!
================================================================================

Transaction Hash: 0xdef456...
View on Arbiscan:
https://sepolia.arbiscan.io/tx/0xdef456...

================================================================================
💳 UPDATED BALANCES
================================================================================
ETH Balance: 0.499500 ETH (used 0.000500 for gas)
USDC Balance: 900.00 USDC (invested 100.00)
```

---

## Method 2: TypeScript/Hardhat Script

### Run the Test

```bash
cd packages/hardhat
yarn hardhat run scripts/testBuyStrategy.ts --network arbitrumSepolia
```

### What the Script Does

Same as Python script, but using TypeScript and ethers.js.

---

## Troubleshooting

### Error: "Insufficient USDC balance"

**Solution:** Get testnet USDC from faucets or bridge from Sepolia

### Error: "Low ETH balance"

**Solution:** Get Arbitrum Sepolia ETH from https://www.alchemy.com/faucets/arbitrum-sepolia

### Error: "No strategies found"

**Solution:** Run the scanner to create strategies first:

```bash
cd packages/python/scanner
python run_strategy_scanner.py
```

### Error: "Strategy inactive"

**Solution:** The selected strategy is no longer active. Run the scanner again to create new strategies.

### Transaction Reverts

**Check:**

1. You have enough USDC balance
2. You've approved USDC spending
3. The strategy is still active and not settled
4. The strategy hasn't reached maturity yet

---

## What Happens When You Buy a Strategy?

1. **USDC Transfer:** Your USDC is transferred to the StrategyManager contract
2. **Fee Calculation:** Platform fee is deducted (e.g., 2% = 200 bps)
3. **Position Created:** A UserPosition is recorded for you
4. **Events Emitted:**
   - `StrategyPurchased` - Records your purchase
   - `HedgeOrderCreated` - GMX hedge orders are triggered
   - `HedgeOrderExecuted` - Hedge orders are executed
5. **Bridge Service:** Off-chain bridge service will detect the event and execute Polymarket orders

---

## View Your Transaction

After buying a strategy, view your transaction on Arbiscan:

```
https://sepolia.arbiscan.io/tx/YOUR_TX_HASH
```

You should see:

- ✅ USDC transfer to StrategyManager
- ✅ StrategyPurchased event
- ✅ Calls to HedgeExecutor contract

---

## Next Steps

After buying a strategy:

1. **Monitor:** Watch your transaction on Arbiscan
2. **Wait:** Wait for the strategy to mature
3. **Settle:** Admin will settle the strategy after maturity
4. **Claim:** Call `claimStrategy()` to get your payout

---

## Contract Addresses (Arbitrum Sepolia)

```
StrategyManager: 0xc707d360BEc8048760F028f852cF1E244d155710
HedgeExecutor: 0x2E36c4c99eE4F94EaF765cD3d030F0a1Ca2d49C6
USDC: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
```

View on Arbiscan:

- StrategyManager: https://sepolia.arbiscan.io/address/0xc707d360BEc8048760F028f852cF1E244d155710
- HedgeExecutor: https://sepolia.arbiscan.io/address/0x2E36c4c99eE4F94EaF765cD3d030F0a1Ca2d49C6

---

## Advanced: Manual Testing with Ethers/Web3

You can also test manually using the contract ABIs and your preferred library:

```typescript
// 1. Approve USDC
await usdc.approve(strategyManagerAddress, amount);

// 2. Buy strategy
await strategyManager.buyStrategy(strategyId, amount);

// 3. Check your position
const positions = await strategyManager.userPositions(yourAddress, 0);
```

---

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify your balances (ETH & USDC)
3. Check that strategies exist and are active
4. Review transaction on Arbiscan for revert reasons
