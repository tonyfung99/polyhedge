# Testnet Configuration Guide

## ✅ Testnet Availability

### GMX V2

- ✅ **Available on Arbitrum Sepolia** - Testnet environment available
- ✅ **Available on Avalanche Fuji** - Alternative testnet
- ✅ **Frontend**: https://test.gmx-interface.pages.dev/

### Polymarket

- ⚠️ **Mainnet Only** - No dedicated public testnet
- 📝 **On-Chain contracts** deployed on Polygon Mainnet
- 🔄 **CLOB API** available for staging/development

---

## 🔗 Current Configuration

### Arbitrum Mainnet (Production)

```typescript
// packages/hardhat/deploy/02_deploy_hedge_executor.ts
arbitrum: {
  exchangeRouter: "0x7C68C7E1CDBdD30B08C1c5433f385E814fAc2b9E",
  router: "0x549352201EB5eba6cdc235D127cAe56d2145DAAF",
  usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
}
```

### Arbitrum Sepolia (Testnet - To be Configured)

```typescript
arbitrumSepolia: {
  exchangeRouter: "0x657F9215FA1e839FbA15cF44B1C00D95cF71ed10",
  router: "0x72F13a44C8ba16a678CAD549F17bc9e06d2B8bD2",
  usdc: "0x0000000000000000000000000000000000000000",           // ⚠️ NEEDS UPDATE
}
```

---

## 📋 Testnet Setup Requirements

### 1. GMX on Arbitrum Sepolia

**Network Details:**

- Chain ID: 421614
- RPC: `https://sepolia-rollup.arbitrum.io/rpc`
- Block Explorer: https://sepolia.arbiscan.io/

**Required Configuration:**

- [ ] Find GMX ExchangeRouter contract address on Arbitrum Sepolia
- [ ] Find GMX Router contract address on Arbitrum Sepolia
- [ ] Find USDC token address on Arbitrum Sepolia
- [ ] Find GMX asset markets (BTC/USD, ETH/USD, etc.)
- [ ] Get testnet ETH for gas fees
- [ ] Get testnet USDC tokens

**GMX Testnet Frontend:**

- URL: https://test.gmx-interface.pages.dev/
- Use this to verify contracts are live and trading works

**Search Resources:**

- GMX GitHub: https://github.com/gmx-io/gmx-contracts
- GMX Docs: https://docs.gmx.io/
- Arbitrum Sepolia Faucet: https://faucet.arbitrum.io/

### 2. Polymarket on Polygon Mainnet

**Network Details:**

- Polymarket CLOB API: https://clob.polymarket.com
- On-chain Contracts: Deployed on Polygon Mainnet
- No public testnet available

**Development Options:**

Option A: Use Mainnet with Small Test Amounts

```bash
# Requires:
- Polygon RPC endpoint
- USDC tokens on Polygon (real tokens)
- Private key for signing orders
```

Option B: Fork Polygon Mainnet Locally

```bash
# Hardhat fork setup
yarn fork polygon
```

Option C: Use Polymarket Staging Environment

```bash
# Contact Polymarket for staging API access
# Staging endpoints may be available for verified developers
```

**Polymarket Documentation:**

- Docs: https://docs.polymarket.com/
- CLOB API: https://api.polymarket.com/
- Developer Quickstart: https://docs.polymarket.com/quickstart

---

## 🔍 Finding Testnet Addresses

### For GMX Arbitrum Sepolia

**Option 1: Check GMX GitHub Deployments**

```bash
# Clone GMX repo
git clone https://github.com/gmx-io/gmx-contracts.git
cd gmx-contracts

# Check deployments directory for Arbitrum Sepolia addresses
cat deployments/arbitrumSepolia.json
```

**Option 2: Use Block Explorer**

1. Go to https://sepolia.arbiscan.io/
2. Search for known GMX contracts
3. Verify with GMX documentation

**Option 3: Check GMX Subgraph**

- GMX uses The Graph for data indexing
- Subgraph may have deployment info
- https://thegraph.com/hosted-service/subgraph/gmx-io/gmx-stats

**Option 4: Contact GMX Community**

- Discord: https://discord.gg/gmx-io
- GitHub Discussions
- GMX Protocol forums

### For Polymarket

**Option 1: Check On-Chain Contracts**

```bash
# Polymarket CTF on Polygon Mainnet
curl https://api.polymarket.com/
```

**Option 2: Review Developer Docs**

- CTF Deployment: https://docs.polymarket.com/developers/CTF/deployment-resources
- May show testnet availability

**Option 3: CLOB API**

```bash
# Test with Polymarket CLOB API
curl https://clob.polymarket.com/
```

---

## 📍 Hardhat Network Configuration

### Add Arbitrum Sepolia to `hardhat.config.ts`

Already configured:

```typescript
arbitrumSepolia: {
  url: `https://arb-sepolia.g.alchemy.com/v2/${providerApiKey}`,
  accounts: [deployerPrivateKey],
}
```

### Add Polygon Amoy (New Testnet)

```typescript
polygonAmoy: {
  url: `https://polygon-amoy.g.alchemy.com/v2/${providerApiKey}`,
  accounts: [deployerPrivateKey],
}
```

---

## 🚀 Deployment Strategy

### Phase 1: Local Testing (Current)

✅ Using Mock contracts
✅ Running on local Hardhat
✅ All tests passing

### Phase 2: Arbitrum Sepolia Testing

```bash
# After finding GMX testnet addresses:
yarn deploy --network arbitrumSepolia

# Verify:
yarn hardhat:verify --network arbitrumSepolia
```

### Phase 3: Polygon Amoy Testing (for Polymarket prep)

```bash
yarn deploy:polygon --network polygonAmoy
```

### Phase 4: Mainnet Deployment

```bash
yarn deploy --network arbitrum
yarn deploy:polygon --network polygon
```

---

## 📝 Updated Deployment Configuration

### File to Update: `packages/hardhat/deploy/02_deploy_hedge_executor.ts`

```typescript
const GMX_ADDRESSES = {
  arbitrum: {
    exchangeRouter: "0x7C68C7E1CDBdD30B08C1c5433f385E814fAc2b9E", // ✅ LIVE
    router: "0x549352201EB5eba6cdc235D127cAe56d2145DAAF", // ✅ LIVE
    usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // ✅ LIVE
  },
  arbitrumSepolia: {
    // ⚠️ TO BE FILLED IN
    exchangeRouter: "0x...", // Search GMX GitHub/docs
    router: "0x...", // Search GMX GitHub/docs
    usdc: "0x...", // Check Arbitrum Sepolia tokens
  },
  avalancheFuji: {
    // Alternative testnet
    exchangeRouter: "0x...",
    router: "0x...",
    usdc: "0x...",
  },
};
```

---

## ⚙️ Setup Checklist

### For GMX Testnet

- [ ] Search GMX GitHub for Arbitrum Sepolia deployment addresses
- [ ] Verify contracts exist on Arbitrum Sepolia block explorer
- [ ] Test access to GMX testnet frontend
- [ ] Get testnet ETH from Arbitrum faucet
- [ ] Get testnet USDC from faucet or factory contract
- [ ] Configure addresses in deploy script
- [ ] Deploy HedgeExecutor to Arbitrum Sepolia
- [ ] Verify contract on block explorer
- [ ] Test GMX order creation functionality

### For Polymarket

- [ ] Check if Polymarket has staging API endpoint
- [ ] If not, plan to use Polygon mainnet with small amounts
- [ ] Set up Polymarket API credentials
- [ ] Test CLOB API connectivity
- [ ] Prepare for bridge integration testing

### For Bridge Service

- [ ] Update bridge config for testnet
- [ ] Point to Arbitrum Sepolia RPC
- [ ] Configure Polymarket testnet API
- [ ] Test event monitoring on testnet
- [ ] Test order execution flow

---

## 🔗 Useful Links

### GMX

- Docs: https://docs.gmx.io/
- GitHub: https://github.com/gmx-io/gmx-contracts
- Testnet Frontend: https://test.gmx-interface.pages.dev/
- Discord: https://discord.gg/gmx-io

### Polymarket

- Docs: https://docs.polymarket.com/
- CLOB API: https://clob.polymarket.com/
- GitHub: https://github.com/polymarket
- Discord: https://discord.gg/polymarket

### Arbitrum

- Sepolia Faucet: https://faucet.arbitrum.io/
- Block Explorer: https://sepolia.arbiscan.io/
- RPC Docs: https://docs.arbitrum.io/build-decentralized-apps/noderelated/node-providers

### Polygon

- Amoy Faucet: https://faucet.polygon.technology/
- Block Explorer: https://amoy.polygonscan.com/

---

## 📊 Summary

| Service         | Mainnet              | Testnet               | Status              |
| --------------- | -------------------- | --------------------- | ------------------- |
| **GMX**         | Arbitrum             | Arbitrum Sepolia      | ⚠️ Addresses needed |
| **Polymarket**  | Polygon              | None (mainnet only)   | ⚠️ No testnet       |
| **USDC Bridge** | Stargate (LayerZero) | ⚠️ Test bridge needed | 🔄 TBD              |

### Recommended Approach

1. **Get GMX testnet addresses** from GitHub/documentation
2. **Test on Arbitrum Sepolia** before mainnet
3. **For Polymarket**: Use mainnet or ask for staging access
4. **Deploy bridge service** to testnet after contracts verified
5. **Run end-to-end tests** before production deployment

---

## 🎯 Next Action Items

1. Search GMX GitHub for Arbitrum Sepolia contract addresses
2. Update `deploy/02_deploy_hedge_executor.ts` with testnet addresses
3. Deploy to Arbitrum Sepolia and verify
4. Contact Polymarket for testnet/staging API access
5. Update bridge service configuration for testnet
6. Run integration tests on testnet

Once you gather the addresses, I can help update the deployment script! 🚀

## ⚠️ GMX Repository Status

After scanning the GMX Synthetics repository at [https://github.com/gmx-io/gmx-synthetics/tree/main/deployments](https://github.com/gmx-io/gmx-synthetics/tree/main/deployments):

**Finding**: The `deployments` directory appears to be **empty or not publicly populated** with testnet addresses.

**Implication**: Arbitrum Sepolia deployment addresses are **not yet published** in the main repository.

---

## 🔧 Alternative Solutions

### Solution 1: Check GMX Testnet Frontend (RECOMMENDED)

Visit https://test.gmx-interface.pages.dev/ and:

1. Connect wallet to Arbitrum Sepolia
2. Inspect browser network requests to find contract addresses
3. Check browser console for contract configuration
4. Use browser DevTools to find contract interactions

### Solution 2: Contact GMX Discord Community

- **Discord**: https://discord.gg/gmx-io
- Ask in #development or #general channel
- They can provide the exact testnet addresses
- Usually very responsive to developer questions

### Solution 3: Check GMX v2 Documentation

- Visit https://docs.gmx.io/
- Look for "Contracts" or "API" section
- May have testnet deployment info

### Solution 4: Use GMX Subgraph

- GMX indexes contracts via The Graph
- Visit https://thegraph.com/hosted-service/subgraph/gmx-io/gmx-stats
- May expose contract addresses through queries

### Solution 5: Monitor GMX Transactions

1. Go to https://sepolia.arbiscan.io/
2. Search for known GMX protocol interactions
3. Trace back to find deployed contracts
4. Verify with multiple transactions

---

## 📍 Known GMX Networks on Arbitrum

### Mainnet (Confirmed - Lines 5-10)

```json
{
  "exchangeRouter": "0x7C68C7E1CDBdD30B08C1c5433f385E814fAc2b9E",
  "router": "0x549352201EB5eba6cdc235D127cAe56d2145DAAF",
  "usdc": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
}
```

### Sepolia Testnet (To Be Discovered)

```json
{
  "exchangeRouter": "0x...", // UNKNOWN - Need to find
  "router": "0x...", // UNKNOWN - Need to find
  "usdc": "0x..." // UNKNOWN - Need to find
}
```

---

## 🚀 Recommended Next Steps

### Option 1: Direct Contact (Fastest)

```
1. Go to GMX Discord: https://discord.gg/gmx-io
2. Message in #development channel
3. Ask: "What are the GMX V2 ExchangeRouter and Router addresses on Arbitrum Sepolia?"
4. Expected response time: < 1 hour
```

### Option 2: Reverse Engineer from Frontend

```bash
# 1. Open GMX testnet frontend in browser
# 2. Open DevTools (F12)
# 3. Go to Network tab
# 4. Look for XHR requests to contract addresses
# 5. Check Application/Storage for config data
# 6. Search contract interactions for 0x addresses
```

### Option 3: Check Arbitrum Sepolia Explorer

```bash
# 1. Visit https://sepolia.arbiscan.io/
# 2. Search for "GMX" or "ExchangeRouter"
# 3. Filter by verified contracts
# 4. Look for recent deployments
# 5. Cross-reference with GMX documentation
```

---

## 📋 Immediate Action Plan

```bash
# Step 1: Ask GMX Community (5 mins)
# Go to Discord and ask

# Step 2: While waiting, prepare script
# Create the function to accept parameters

# Step 3: Test with testnet addresses
# Once you have addresses, run:
yarn deploy --network arbitrumSepolia

# Step 4: Verify on block explorer
# Check contracts are deployed correctly
```

---

## 🔗 Updated Resources

### GMX Support Channels

- **Discord**: https://discord.gg/gmx-io (Best for quick answers)
- **GitHub Issues**: https://github.com/gmx-io/gmx-synthetics/issues
- **Docs**: https://docs.gmx.io/
- **Testnet Frontend**: https://test.gmx-interface.pages.dev/

### Arbitrum Resources

- **Sepolia Explorer**: https://sepolia.arbiscan.io/
- **Sepolia Faucet**: https://faucet.arbitrum.io/
- **RPC**: https://sepolia-rollup.arbitrum.io/rpc

---

## ⏱️ Timeline Estimate

| Task                  | Time         | Status     |
| --------------------- | ------------ | ---------- |
| Get testnet addresses | 5-30 mins    | ⏳ Pending |
| Update deploy script  | 5 mins       | Ready      |
| Deploy to Sepolia     | 5 mins       | Ready      |
| Verify on explorer    | 2 mins       | Ready      |
| **Total**             | **~20 mins** | ⏳         |

---

## 📊 Updated Summary

| Component             | Mainnet  | Testnet    | Status       |
| --------------------- | -------- | ---------- | ------------ |
| **ExchangeRouter**    | ✅ Found | ❌ Finding | Ask Discord  |
| **Router**            | ✅ Found | ❌ Finding | Ask Discord  |
| **USDC**              | ✅ Found | ❌ Finding | Ask Discord  |
| **Deployment Script** | ✅ Ready | ✅ Ready   | Ready to use |
| **Hardhat Config**    | ✅ Ready | ✅ Ready   | Ready to use |

---

## 🎯 Next: Get GMX Testnet Addresses

**Quickest path**: Ask GMX Discord community

- Link: https://discord.gg/gmx-io
- Question: "What are GMX V2 ExchangeRouter and Router addresses on Arbitrum Sepolia?"
- Expected: Direct answer with addresses

Once you have the addresses, I'll update the deployment script immediately! 🚀

## 🪙 Finding USDC Token Address on Arbitrum Sepolia

### Current Status

**Mainnet (Confirmed)**:

```
USDC Address: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
Network: Arbitrum Mainnet
```

**Testnet (To Find)**:

```
USDC Address: 0x?????????????????????????  // NEED TO FIND
Network: Arbitrum Sepolia
```

---

### ✅ 5 Ways to Find USDC on Arbitrum Sepolia

#### **Method 1: Arbitrum Sepolia Block Explorer** (Most Reliable)

1. Go to: https://sepolia.arbiscan.io/
2. Search box → Type: `USDC`
3. Filter results for **Token** contracts
4. Look for:
   - Name: "USD Coin" or "USDC"
   - Decimals: 6 (important!)
   - High transaction count
   - Recently deployed contract
5. Copy the contract address (0x...)

**Why this works**: USDC on testnet is deployed as an ERC-20 contract and verified on the block explorer.

---

#### **Method 2: GMX Testnet Frontend** (Check Configuration)

1. Go to: https://test.gmx-interface.pages.dev/
2. Open **DevTools** (F12)
3. Go to **Console** tab
4. Type or look for USDC configuration:
   ```javascript
   // Look for window.CONFIG or similar
   // Should show token addresses
   ```
5. Or check **Network** tab for API calls containing USDC address

**Why this works**: GMX frontend has USDC configured for testnet interactions.

---

#### **Method 3: Check Known Testnet Faucets**

Common USDC addresses on Arbitrum Sepolia (check if valid):

**Option A: USDC Factory/Bridge**

- Search for official USDC bridge contracts
- Arbitrum may have a native USDC
- URL: https://sepolia.arbiscan.io/ → Search "USDC"

**Option B: Testnet Faucets**

- Visit: https://faucet.arbitrum.io/
- Check if they provide USDC faucet link
- May show the token address

---

#### **Method 4: GMX Discord Community**

Ask in GMX Discord: https://discord.gg/gmx-io

```
Question: "What is the USDC token address on Arbitrum Sepolia for GMX V2?"
```

They can confirm:

- Exact USDC address
- Whether it's a native or bridged USDC
- Faucet link to get testnet USDC

---

#### **Method 5: Arbitrum Official Documentation**

Check:

- https://docs.arbitrum.io/ → Token addresses section
- Arbitrum may maintain list of testnet tokens
- Look for "testnet tokens" or "Sepolia tokens"

---

### 🔍 How to Verify USDC is Correct

Once you find a candidate USDC address, verify it:

```bash
# On https://sepolia.arbiscan.io/:
# 1. Check token details:
#    - Name: "USD Coin" or similar
#    - Symbol: USDC
#    - Decimals: 6 (NOT 18!)
#    - Total Supply: Should be > 0

# 2. Check recent transfers:
#    - Should have activity
#    - Multiple token transfers
#    - Recent activity (not old/abandoned)

# 3. Verify contract:
#    - Should be verified (green checkmark)
#    - Can read source code
#    - Should follow ERC-20 standard
```

---

### 🎯 Typical USDC Characteristics

Real USDC has these markers:

| Attribute           | Value           |
| ------------------- | --------------- |
| **Name**            | USD Coin        |
| **Symbol**          | USDC            |
| **Decimals**        | **6** (NOT 18!) |
| **Verified**        | ✅ Yes          |
| **Transactions**    | Hundreds+       |
| **Recent Activity** | Last 24 hours   |
| **Contract Type**   | ERC-20 Token    |

---

### ⚠️ Common Mistakes

❌ **Don't use**:

- Contracts with 0 balance or transfers
- Unverified contracts
- Contracts with 18 decimals (that's ETH decimal, not USDC)
- Very old contracts with no recent activity
- Contracts not named "USD Coin" or "USDC"

✅ **Do use**:

- Verified USDC with name "USD Coin"
- With 6 decimals
- With active recent transfers
- From official/recognized sources

---

### 📋 Quick Lookup Steps

**Fastest way to find USDC on Arbitrum Sepolia**:

```
1. Go to: https://sepolia.arbiscan.io/
2. In search box, type: USDC
3. Filter by "Token" type
4. Look for USD Coin with 6 decimals
5. Copy address (0x...)
6. Verify recent transactions exist
```

**Expected result**: Single USDC token address (most testnets have one official USDC)

---

### 📝 Update Config Once Found

Once you find the USDC address:

```typescript
// packages/hardhat/deploy/02_deploy_hedge_executor.ts

arbitrumSepolia: {
  exchangeRouter: "0x657F9215FA1e839FbA15cF44B1C00D95cF71ed10",
  router: "0x72F13a44C8ba16a678CAD549F17bc9e06d2B8bD2",
  usdc: "0x...",  // ← INSERT USDC ADDRESS HERE
}
```

---

### 🔗 Direct Resources

| Resource            | Link                                  | Use Case                        |
| ------------------- | ------------------------------------- | ------------------------------- |
| **Block Explorer**  | https://sepolia.arbiscan.io/          | **[BEST] Search USDC directly** |
| **Arbitrum Faucet** | https://faucet.arbitrum.io/           | Get testnet ETH + USDC          |
| **GMX Testnet**     | https://test.gmx-interface.pages.dev/ | Verify USDC works               |
| **Arbitrum Docs**   | https://docs.arbitrum.io/             | Official token list             |
| **GMX Discord**     | https://discord.gg/gmx-io             | Ask developers                  |

---

### ✨ Recommended Approach

1. **First**: Search on Arbitrum Sepolia block explorer (https://sepolia.arbiscan.io/)
2. **Verify**: Check it has 6 decimals and name is "USD Coin"
3. **Confirm**: Look for recent transactions
4. **Update**: Add to deploy script
5. **Ask**: If unsure, ask GMX Discord

**Time to find**: 2-5 minutes

---

### 🎯 Next Steps

- [ ] Go to https://sepolia.arbiscan.io/
- [ ] Search for "USDC"
- [ ] Find token with 6 decimals
- [ ] Copy address (0x...)
- [ ] Update TESTNET_CONFIGURATION.md
- [ ] Update deploy/02_deploy_hedge_executor.ts
- [ ] Ready to deploy!

---

## 📚 GMX V2 USDC Protocol Integration Guide

### 🎯 How GMX Uses USDC

GMX V2 is a decentralized perpetual exchange on Arbitrum that uses USDC in several critical ways:

#### 1. **USDC as Collateral for Perpetual Positions**

```
Order Flow:
┌─────────────────────────────────────────────────────────┐
│ HedgeExecutor calls: gmxExchangeRouter.createOrder()    │
├─────────────────────────────────────────────────────────┤
│ USDC Role:                                              │
│  • Provides initial collateral for position             │
│  • Amount: Denominated in USDC (6 decimals)             │
│  • Example: 1,000,000 = 1 USDC                          │
│                                                         │
│ Position:                                               │
│  • Long: Profits when asset price ↑                     │
│  • Short: Profits when asset price ↓                    │
│  • Settled in USDC (gains/losses in USDC)               │
└─────────────────────────────────────────────────────────┘
```

**Key Point**: When PolyHedge creates a GMX order, the USDC amount acts as both:

1. Initial collateral size
2. Settlement currency

#### 2. **USDC Requirements for GMX Orders**

When calling `gmxExchangeRouter.createOrder()`, the following USDC-related parameters are critical:

```solidity
// From HedgeExecutor._executeGMXOrder():
address[] memory addressItems = new address[](4);
addressItems[0] = marketAddress;           // BTC/USD market, ETH/USD, etc.
addressItems[1] = msg.sender;              // Receiver (HedgeExecutor)
addressItems[2] = address(usdc);           // ✅ KEY: USDC token address
addressItems[3] = address(0);              // Swap path (not used)

uint256[] memory uintItems = new uint256[](6);
uintItems[0] = amount;                     // ✅ USDC amount (6 decimals)
uintItems[1] = amount;                     // ✅ Initial collateral delta
uintItems[2] = 0;                          // Trigger price (0 = market order)
uintItems[3] = maxSlippageBps;             // Slippage tolerance
uintItems[4] = 0;                          // Execution fee
uintItems[5] = isLong ? 1 : 0;             // Position direction
```

#### 3. **USDC Token Address Requirements**

| Network              | USDC Address                                 | Decimals | Status        | Use Case              |
| -------------------- | -------------------------------------------- | -------- | ------------- | --------------------- |
| **Arbitrum Mainnet** | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | 6        | ✅ Production | GMX V2 native USDC    |
| **Arbitrum Sepolia** | `0x?` (FINDING IN PROGRESS)                  | 6        | 🔍 Testnet    | GMX V2 testnet        |
| **Polygon Mainnet**  | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` | 6        | ✅ Production | Polymarket settlement |
| **Polygon Amoy**     | `0xEb3f69bD8f04B405D8E9dB0a7A4E14a7Cf5aCDC3` | 6        | 🔍 Testnet    | Polymarket testnet    |

**CRITICAL**: The USDC address must match the network where GMX is operating:

- ❌ Using Polygon USDC on Arbitrum = GMX won't recognize it
- ✅ Using Arbitrum native USDC on Arbitrum = Correct

#### 4. **USDC Approval and Transfer**

```solidity
// In HedgeExecutor._executeGMXOrder():
usdc.approve(address(gmxRouter), amount);  // Approve router to spend USDC
```

Before creating any order, HedgeExecutor must:

1. **Hold sufficient USDC**: Checked in `createHedgeOrder()`
2. **Approve GMX Router**: Give permission to transfer USDC
3. **Transfer USDC**: Called internally by GMX contracts during order creation

```solidity
require(usdc.balanceOf(address(this)) >= amount, "insufficient USDC balance");
usdc.approve(address(gmxRouter), amount);
// GMX router now can transfer up to `amount` USDC from HedgeExecutor
```

#### 5. **USDC Settlement and Payout**

When positions close on GMX:

```
Short Position (Hedge):
  If BTC price falls (bet was correct):
    Profit = (Entry Price - Exit Price) * Size
    Payout = Initial Collateral + Profit (in USDC)

  If BTC price rises (bet was wrong):
    Loss = (Entry Price - Exit Price) * Size (negative)
    Payout = Initial Collateral + Loss (less USDC)
```

**Example**:

```
- Hedge: Short 10 BTC at $50,000 (using 10,000 USDC)
- BTC falls to $49,000 (correct prediction)
- Profit = $10,000 (10 BTC * $1,000 change)
- Final Payout = 10,000 USDC (collateral) + ~10 USDC (profit) ✅

Opposite case:
- BTC rises to $51,000 (wrong prediction)
- Loss = $10,000 (10 BTC * $1,000 change)
- Final Payout = 10,000 USDC - ~10 USDC = ~9,990 USDC ❌
```

#### 6. **USDC in PolyHedge Dual-Chain Flow**

```
Arbitrum (HedgeExecutor - GMX):           Polygon (PolygonReceiver - Polymarket):
┌─────────────────────────────┐           ┌──────────────────────────────┐
│ User buys strategy           │           │                              │
│ Sends 100 USDC               │           │                              │
│         ↓                    │           │                              │
│ Fee: 2% = 2 USDC             │           │                              │
│ Net: 98 USDC                 │           │                              │
│         ↓                    │           │                              │
│ 50 USDC → HedgeExecutor      │           │ 48 USDC → PolygonReceiver   │
│ (GMX collateral)             │────bridge─→ (Polymarket orders)         │
│         ↓                    │           │         ↓                    │
│ Create SHORT BTC order       │           │ Place YES/NO orders         │
│ Size: 50 USDC collateral     │           │ Amount: 48 USDC             │
│ Market: BTC/USD              │           │ Settlement: On-chain        │
│         ↓                    │           │         ↓                    │
│ Profits/losses in USDC ✅    │           │ Profits/losses in USDC ✅  │
└─────────────────────────────┘           └──────────────────────────────┘
```

---

### ✅ Important USDC Characteristics for GMX

| Aspect        | Requirement                  | Why                              |
| ------------- | ---------------------------- | -------------------------------- |
| **Decimals**  | Exactly 6                    | GMX assumes 6-decimal stablecoin |
| **Contract**  | Verified on Etherscan        | Ensure it's legitimate USDC      |
| **Chain**     | Must match network           | Arbitrum USDC ≠ Polygon USDC     |
| **Approval**  | Must be granted to gmxRouter | Otherwise transfer fails         |
| **Balance**   | Must exceed order size       | HedgeExecutor must hold USDC     |
| **Liquidity** | GLP pool must be funded      | Orders need counterparty         |

---

### 🔗 GMX Documentation Resources

| Resource                    | URL                                        | Purpose                  |
| --------------------------- | ------------------------------------------ | ------------------------ |
| **GMX Docs - Trading V2**   | https://docs.gmx.io/docs/trading/v2/       | Official trading guide   |
| **GMX Docs - Contracts**    | https://docs.gmx.io/docs/api/contracts-v2/ | Contract addresses & ABI |
| **GMX GitHub - Synthetics** | https://github.com/gmx-io/gmx-synthetics   | Smart contract source    |
| **GMX Governance**          | https://gov.gmx.io/                        | Protocol proposals       |
| **GMX Testnet Frontend**    | https://test.gmx-interface.pages.dev/      | Visual testing interface |
| **Arbitrum Sepolia**        | https://sepolia.arbiscan.io/               | Token verification       |
| **GMX Discord**             | https://discord.gg/gmx-io                  | Developer support        |

---

### 🎯 Next Steps for PolyHedge Deployment

1. **Find USDC on Arbitrum Sepolia**

   - Search: https://sepolia.arbiscan.io/ → "USDC"
   - Verify: 6 decimals, recent activity
   - Copy: Address (0x...)

2. **Update Deployment Configuration**

   ```typescript
   // packages/hardhat/deploy/02_deploy_hedge_executor.ts
   arbitrumSepolia: {
     exchangeRouter: "0x657F9215FA1e839FbA15cF44B1C00D95cF71ed10",
     router: "0x72F13a44C8ba16a678CAD549F17bc9e06d2B8bD2",
     usdc: "0x<FOUND_ADDRESS>",  // ← UPDATE WITH FOUND ADDRESS
   }
   ```

3. **Verify Configuration**

   ```bash
   # Check HedgeExecutor can read USDC
   yarn hardhat verify <HEDGE_EXECUTOR_ADDRESS> \
     <EXCHANGE_ROUTER> <ROUTER> <USDC_ADDRESS> --network arbitrumSepolia
   ```

4. **Test Order Creation**

   - Mint test USDC to HedgeExecutor
   - Create small test order (1 USDC)
   - Verify GMX accepts order
   - Check order tracking

5. **Monitor Gas Costs**
   - GMX orders typically cost 200k-500k gas
   - USDC approval: ~45k gas
   - Budget: ~600k gas per hedge order

---

### ⚠️ Common Issues & Solutions

| Issue                   | Cause                           | Solution                            |
| ----------------------- | ------------------------------- | ----------------------------------- |
| "Token not accepted"    | Wrong USDC address              | Verify on etherscan, check decimals |
| "Insufficient approval" | Approval not called             | Call `usdc.approve()` before order  |
| "Order rejected"        | GLP pool not funded             | Check GMX liquidity pools           |
| "Revert: invalid USDC"  | 18 decimals token               | Ensure exactly 6 decimals           |
| "No liquidity"          | Market not available on testnet | Check GMX testnet markets list      |

---

## 🔧 Technical Reference: USDC Integration in PolyHedge

### Code Walkthrough: From Strategy Purchase to GMX Order

#### Phase 1: Strategy Purchase (StrategyManager)

```solidity
// User calls buyStrategy() on StrategyManager
function buyStrategy(uint256 strategyId, uint256 grossAmount) external nonReentrant {
    // 1. Transfer USDC from user to StrategyManager
    usdc.transferFrom(msg.sender, address(this), grossAmount);

    // 2. Calculate fees and net amount
    uint256 fee = (grossAmount * feeBps) / 10000;  // 2% fee
    uint256 netAmount = grossAmount - fee;

    // 3. Record user position
    userPositions[msg.sender].push(
        UserPosition({
            strategyId: strategyId,
            amount: netAmount,          // ← This is USDC after fee
            purchaseTs: block.timestamp,
            claimed: false
        })
    );

    // 4. Emit event for bridge service
    emit StrategyPurchased(strategyId, msg.sender, grossAmount, netAmount);

    // 5. Trigger GMX hedge orders for each hedge order in strategy
    for (uint256 i = 0; i < s.details.hedgeOrders.length; i++) {
        HedgeOrder storage ho = s.details.hedgeOrders[i];

        // Call HedgeExecutor with GMX order details
        hedgeExecutor.createHedgeOrder(
            strategyId,
            msg.sender,
            ho.asset,          // "BTC", "ETH", etc.
            ho.isLong,         // true/false
            ho.amount,         // Amount in USDC (6 decimals)
            ho.maxSlippageBps   // Slippage tolerance
        );
    }
}
```

**USDC Role**:

- Transferred from user to StrategyManager
- Fee subtracted → NetAmount calculated
- NetAmount stored for settlement tracking

---

#### Phase 2: HedgeExecutor Configuration (Deployment)

```solidity
// During deployment (in deploy script)
const HedgeExecutor = await ethers.getContractFactory("HedgeExecutor");
const hedgeExecutor = await HedgeExecutor.deploy(
    gmxExchangeRouter,   // 0x657F9215FA1e839FbA15cF44B1C00D95cF71ed10 (Sepolia)
    gmxRouter,           // 0x72F13a44C8ba16a678CAD549F17bc9e06d2B8bD2 (Sepolia)
    usdcAddress          // 0x... (NEED TO FIND)
);

// HedgeExecutor constructor receives USDC address
contract HedgeExecutor is Ownable, ReentrancyGuard {
    IERC20 public usdc;  // ← Stores USDC contract reference

    constructor(address _gmxExchangeRouter, address _gmxRouter, address _usdc) {
        gmxExchangeRouter = IGMXExchangeRouter(_gmxExchangeRouter);
        gmxRouter = IGMXRouter(_gmxRouter);
        usdc = IERC20(_usdc);  // ← Initialize with testnet USDC
    }
}
```

**USDC Role**:

- Address stored in HedgeExecutor contract
- Used for all subsequent order operations

---

#### Phase 3: Hedge Order Creation (HedgeExecutor)

```solidity
// StrategyManager calls this via HedgeExecutor
function createHedgeOrder(
    uint256 strategyId,
    address user,
    string calldata asset,      // "BTC"
    bool isLong,                // false (short/hedge)
    uint256 amount,             // 1,000,000 = 1 USDC (6 decimals)
    uint256 maxSlippageBps      // 500 = 5% slippage
) external nonReentrant {
    require(msg.sender == strategyManager, "only StrategyManager");
    require(amount > 0, "amount=0");

    // ✅ CRITICAL: Verify USDC balance
    require(
        usdc.balanceOf(address(this)) >= amount,
        "insufficient USDC balance"
    );

    // Execute GMX order using USDC
    bytes32 gmxOrderKey = _executeGMXOrder(
        asset,
        isLong,
        amount,         // ← USDC amount
        maxSlippageBps
    );

    // Store order tracking
    hedgeOrders[strategyId] = HedgeOrder({
        strategyId: strategyId,
        user: user,
        asset: asset,
        isLong: isLong,
        amount: amount,
        maxSlippageBps: maxSlippageBps,
        executed: true,
        gmxOrderKey: gmxOrderKey
    });

    // Emit events for tracking
    emit HedgeOrderCreated(strategyId, user, asset, isLong, amount, gmxOrderKey);
    emit HedgeOrderExecuted(strategyId, gmxOrderKey);
}
```

**USDC Role**:

- Balance checked before order execution
- Amount passed to GMX order creation

---

#### Phase 4: GMX Order Execution (HedgeExecutor Internal)

```solidity
function _executeGMXOrder(
    string calldata asset,
    bool isLong,
    uint256 amount,             // USDC amount
    uint256 maxSlippageBps
) internal returns (bytes32 orderKey) {
    address marketAddress = assetMarkets[asset];  // Market address for asset

    // ✅ STEP 1: APPROVE GMX TO SPEND USDC
    // This is critical - GMX router needs permission to transfer USDC
    usdc.approve(address(gmxRouter), amount);

    // ✅ STEP 2: BUILD ORDER PARAMETERS FOR GMX
    address[] memory addressItems = new address[](4);
    addressItems[0] = marketAddress;        // Market: BTC/USD
    addressItems[1] = msg.sender;           // Receiver (HedgeExecutor)
    addressItems[2] = address(usdc);        // ✅ USDC token address
    addressItems[3] = address(0);           // Swap path (none)

    uint256[] memory uintItems = new uint256[](6);
    uintItems[0] = amount;                  // ✅ USDC size delta
    uintItems[1] = amount;                  // ✅ Initial collateral amount (USDC)
    uintItems[2] = 0;                       // Trigger price (0 = market order)
    uintItems[3] = maxSlippageBps;          // Acceptable slippage
    uintItems[4] = 0;                       // Execution fee
    uintItems[5] = isLong ? 1 : 0;          // Order type

    // ✅ STEP 3: CREATE ORDER ON GMX
    // GMX ExchangeRouter will now:
    // 1. Transfer USDC from HedgeExecutor to GMX contracts
    // 2. Lock USDC as collateral
    // 3. Create perpetual position
    // 4. Return order key for tracking
    orderKey = gmxExchangeRouter.createOrder(
        address(this),              // Account creating order
        addressItems,
        uintItems,
        new bytes32[](0),
        ""
    );

    return orderKey;
}
```

**USDC Interactions**:

1. **Approval**: `usdc.approve(gmxRouter, amount)`
   - Grants GMX router permission to transfer USDC
2. **Address Reference**: `addressItems[2] = address(usdc)`
   - Tells GMX which token to use as collateral
3. **Amount**: `uintItems[0] = amount` and `uintItems[1] = amount`
   - USDC amount for position sizing and collateral

---

### Data Flow Diagram: USDC Through PolyHedge

```
┌─────────────────────────────────────────────────────────────────┐
│ User Account (Mainnet Wallet)                                   │
│ Balance: 100 USDC (Arbitrum Sepolia)                            │
└────────────────┬────────────────────────────────────────────────┘
                 │ Transfer 100 USDC
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ StrategyManager Contract                                        │
│ - Receives: 100 USDC via transferFrom()                        │
│ - Deducts: 2 USDC fee (2%)                                      │
│ - NetAmount: 98 USDC (stored in userPositions)                 │
│ - Emits: StrategyPurchased(strategyId, user, 100, 98)          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ├─ 50 USDC → HedgeExecutor (for GMX orders)
                 │
                 └─ 48 USDC → Bridge (for Polymarket orders)
                 │
                 ▼ (HedgeExecutor branch)
┌─────────────────────────────────────────────────────────────────┐
│ HedgeExecutor Contract                                          │
│ - Receives: 50 USDC (now contract balance)                      │
│ - Approves: gmxRouter to spend up to 50 USDC                    │
│ - Calls: gmxExchangeRouter.createOrder(                         │
│          asset: "BTC",                                          │
│          isLong: false,                                         │
│          amount: 50 USDC,                                       │
│          usdc: 0x... [USDC token address]                       │
│        )                                                        │
└────────────────┬────────────────────────────────────────────────┘
                 │ GMX transfers 50 USDC from HedgeExecutor
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ GMX Protocol (Arbitrum Sepolia)                                 │
│ - Receives: 50 USDC as collateral                               │
│ - Creates: Short position (SHORT BTC/USD)                       │
│ - Amount: 50 USDC worth of notional value                       │
│ - Settlement: All PnL paid in USDC                              │
│ - Returns: orderKey (bytes32) to HedgeExecutor                  │
└─────────────────────────────────────────────────────────────────┘
                 │
                 ▼ (After position closes)
┌─────────────────────────────────────────────────────────────────┐
│ HedgeExecutor Contract                                          │
│ - Original: 50 USDC locked                                      │
│ - PnL: ±X USDC (from GMX settlement)                            │
│ - Final: 50 ± X USDC (received back)                            │
│ - Example: If BTC fell (correct):                               │
│   - Receive: 50 + 2 = 52 USDC ✅ (profit!)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

### Testnet Configuration Checklist

Before deployment, ensure you have:

```
USDC Configuration for Arbitrum Sepolia
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Step 1: Find USDC on Arbitrum Sepolia
   [ ] Go to: https://sepolia.arbiscan.io/
   [ ] Search: "USDC"
   [ ] Verify: 6 decimals
   [ ] Verify: Verified contract
   [ ] Verify: Recent transactions
   [ ] Copy: Address (0x...)

✅ Step 2: Configure Deployment Script
   Location: packages/hardhat/deploy/02_deploy_hedge_executor.ts

   Before:
   ┌─────────────────────────────────────────────────────────┐
   │ arbitrumSepolia: {                                      │
   │   exchangeRouter: "0x657F9215FA1e839FbA15cF44B1C00D95", │
   │   router: "0x72F13a44C8ba16a678CAD549F17bc9e06d2B8bD2", │
   │   usdc: "0x0000000000000000000000000000000000000000"   │
   │ }                                                       │
   └─────────────────────────────────────────────────────────┘

   After:
   ┌─────────────────────────────────────────────────────────┐
   │ arbitrumSepolia: {                                      │
   │   exchangeRouter: "0x657F9215FA1e839FbA15cF44B1C00D95", │
   │   router: "0x72F13a44C8ba16a678CAD549F17bc9e06d2B8bD2", │
   │   usdc: "0x<YOUR_FOUND_ADDRESS>"                        │
   │ }                                                       │
   └─────────────────────────────────────────────────────────┘

✅ Step 3: Verify Configuration
   [ ] Compile: yarn compile
   [ ] No TypeScript errors
   [ ] All imports resolve

✅ Step 4: Pre-Deployment Checks
   [ ] USDC address is 6 decimals
   [ ] Network is Arbitrum Sepolia
   [ ] Contract is verified on Arbiscan
   [ ] Have testnet ETH for deployment gas
   [ ] Have testnet USDC for order funding

✅ Step 5: Deployment & Testing
   [ ] Deploy: yarn deploy --network arbitrumSepolia
   [ ] Get HedgeExecutor address
   [ ] Mint test USDC to HedgeExecutor
   [ ] Create test hedge order
   [ ] Verify GMX accepts order
```

---

### Troubleshooting: USDC Issues

| Issue         | Error Message                   | Solution                                   |
| ------------- | ------------------------------- | ------------------------------------------ |
| Wrong address | "Token not accepted by GMX"     | Verify address on Arbiscan, check decimals |
| 18 decimals   | "Invalid collateral amount"     | Make sure it's 6 decimals, not 18          |
| Wrong network | "Contract not found"            | Ensure USDC address is on Arbitrum Sepolia |
| No approval   | "ERC20: insufficient allowance" | Call approve() before createOrder          |
| No balance    | "insufficient USDC balance"     | Fund HedgeExecutor with USDC               |
| Unverified    | Can't verify deployment         | Use verified contract address only         |
| Old USDC.e    | "Token deprecated"              | Use native USDC, not USDC.e                |

---

## Summary: USDC Usage in PolyHedge

1. **On Strategy Purchase**: User sends USDC → StrategyManager deducts fee → Splits net into GMX and Polymarket allocations

2. **In HedgeExecutor**: USDC stored as contract state → Used as collateral for GMX perpetual orders → Amount determines position size

3. **During GMX Order**: USDC approved → GMX transfers it to protocol → Locked as collateral → PnL settled in USDC

4. **At Settlement**: HedgeExecutor receives back original USDC ± profit/loss → Sent to user via StrategyManager

**Critical Requirements**:

- ✅ Correct address (Arbitrum Sepolia USDC)
- ✅ 6 decimals exactly
- ✅ Sufficient balance in HedgeExecutor
- ✅ Proper approval granted to gmxRouter
- ✅ Network matches (Arbitrum, not Polygon)
