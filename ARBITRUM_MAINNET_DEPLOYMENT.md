# Arbitrum Mainnet Deployment Guide

Complete guide for deploying PolyHedge contracts to Arbitrum mainnet and verifying them on Arbiscan.

---

## 📋 Prerequisites

### 1. Environment Variables

Update your `.env` file with mainnet configuration:

```bash
# Required - Your deployer private key (KEEP SECURE!)
__RUNTIME_DEPLOYER_PRIVATE_KEY=your_mainnet_private_key_here

# Required - Alchemy API key for Arbitrum mainnet RPC
ALCHEMY_API_KEY=your_alchemy_api_key

# Required - Arbiscan API key for contract verification
ETHERSCAN_V2_API_KEY=your_arbiscan_api_key
```

### 2. Get API Keys

**Alchemy API Key:**
1. Sign up at https://www.alchemy.com/
2. Create a new app
3. Select "Arbitrum" network
4. Copy the API key

**Arbiscan API Key:**
1. Sign up at https://arbiscan.io/
2. Go to https://arbiscan.io/myapikey
3. Create a new API key
4. Copy the key

### 3. Fund Your Deployer Account

Your deployer address needs ETH on Arbitrum mainnet for gas fees.

**Get your deployer address:**
```bash
cd packages/hardhat
yarn hardhat run scripts/listAccount.ts --network arbitrum
```

**Fund with ETH:**
- Bridge ETH from Ethereum mainnet: https://bridge.arbitrum.io/
- Or buy directly on Arbitrum via exchanges
- Recommended: **0.05 ETH** for deployment + verification

**Estimated Gas Costs:**
- HedgeExecutor deployment: ~0.01 ETH
- StrategyManager deployment: ~0.01 ETH
- Total: ~0.02 ETH + buffer

---

## 🔍 Pre-Deployment Checklist

Before deploying to mainnet, verify all configurations:

### ✅ Contract Addresses Configured

The deployment scripts use these **Arbitrum Mainnet** addresses:

```
USDC: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
GMX ExchangeRouter: 0x7C68C7E1CDBdD30B08C1c5433f385E814fAc2b9E
GMX Router: 0x549352201EB5eba6cdc235D127cAe56d2145DAAF
```

**Verify these are correct:**
- USDC: https://arbiscan.io/token/0xaf88d065e77c8cC2239327C5EDb3A432268e5831
- GMX Docs: https://docs.gmx.io/

### ✅ Deployment Order

Contracts deploy in this order:
1. **HedgeExecutor** (independent)
2. **StrategyManager** (depends on HedgeExecutor)

This is handled automatically by hardhat-deploy.

### ✅ Security Review

**CRITICAL:** Before deploying to mainnet:

1. ✅ Audit all smart contracts
2. ✅ Review deployment scripts
3. ✅ Test thoroughly on testnet (Arbitrum Sepolia)
4. ✅ Verify all addresses are correct
5. ✅ Ensure deployer key is secure
6. ✅ Check gas price is reasonable
7. ✅ Have a backup of deployer private key

---

## 🚀 Deployment Steps

### Step 1: Clean and Compile

```bash
cd packages/hardhat

# Clean previous builds
yarn clean

# Compile contracts
yarn compile
```

**Expected output:**
```
Compiled 15 Solidity files successfully
```

### Step 2: Dry Run (Optional but Recommended)

Simulate deployment without actually deploying:

```bash
# This will show you what will be deployed without executing
yarn hardhat deploy --network arbitrum --dry-run
```

### Step 3: Deploy to Arbitrum Mainnet

```bash
yarn hardhat deploy --network arbitrum
```

**Expected output:**
```
Deploying HedgeExecutor on arbitrum
GMX ExchangeRouter: 0x7C68C7E1CDBdD30B08C1c5433f385E814fAc2b9E
GMX Router: 0x549352201EB5eba6cdc235D127cAe56d2145DAAF
USDC Token: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
deploying "HedgeExecutor" (tx: 0xabc123...)
✅ HedgeExecutor deployed at: 0x...

Deploying StrategyManager on arbitrum with HedgeExecutor: 0x...
deploying "StrategyManager" (tx: 0xdef456...)
✅ StrategyManager deployed at: 0x...
```

**Important:**
- Save the transaction hashes
- Save the deployed contract addresses
- Wait for confirmations before proceeding

### Step 4: Verify Deployment Artifacts

Check that deployment files were created:

```bash
ls -la deployments/arbitrum/
```

**You should see:**
```
HedgeExecutor.json
StrategyManager.json
.chainId
```

### Step 5: View Deployed Addresses

```bash
cat deployments/arbitrum/HedgeExecutor.json | grep '"address"'
cat deployments/arbitrum/StrategyManager.json | grep '"address"'
```

---

## ✅ Contract Verification

Verify your contracts on Arbiscan so users can read the source code.

### Method 1: Automatic Verification (Recommended)

```bash
# Verify HedgeExecutor
yarn hardhat etherscan-verify --network arbitrum --license MIT

# Or verify individual contracts
yarn hardhat verify --network arbitrum HEDGE_EXECUTOR_ADDRESS \
  "0x7C68C7E1CDBdD30B08C1c5433f385E814fAc2b9E" \
  "0x549352201EB5eba6cdc235D127cAe56d2145DAAF" \
  "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"

yarn hardhat verify --network arbitrum STRATEGY_MANAGER_ADDRESS \
  "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" \
  "HEDGE_EXECUTOR_ADDRESS"
```

Replace `HEDGE_EXECUTOR_ADDRESS` and `STRATEGY_MANAGER_ADDRESS` with your actual deployed addresses.

**Expected output:**
```
Successfully submitted source code for contract
contracts/HedgeExecutor.sol:HedgeExecutor at 0x...
for verification on the block explorer. Waiting for verification result...

Successfully verified contract HedgeExecutor on Arbiscan.
https://arbiscan.io/address/0x...#code
```

### Method 2: Manual Verification

If automatic verification fails:

1. Go to https://arbiscan.io/
2. Search for your contract address
3. Click "Contract" tab
4. Click "Verify and Publish"
5. Fill in the form:
   - **Compiler Type:** Solidity (Single file)
   - **Compiler Version:** v0.8.20+commit.a1b79de6
   - **License:** MIT
   - **Optimization:** Yes (200 runs)
6. Paste flattened source code
7. Add constructor arguments (ABI-encoded)

**To get flattened source:**
```bash
yarn hardhat flatten contracts/HedgeExecutor.sol > HedgeExecutor_flat.sol
yarn hardhat flatten contracts/StrategyManager.sol > StrategyManager_flat.sol
```

**To get constructor arguments:**
```bash
# HedgeExecutor constructor: (exchangeRouter, router, usdc)
# StrategyManager constructor: (usdc, hedgeExecutor)

# These will be automatically detected by the verify command
```

### Troubleshooting Verification

**Error: "Already Verified"**
- Contract is already verified, no action needed

**Error: "Invalid API Key"**
- Check your `ETHERSCAN_V2_API_KEY` in `.env`
- Verify API key is active on Arbiscan

**Error: "Constructor arguments mismatch"**
- Ensure constructor args match deployment
- Check deployment JSON files for exact args used

**Error: "Bytecode does not match"**
- Ensure compiler version matches (0.8.20)
- Ensure optimization settings match (200 runs)
- Recompile with `yarn clean && yarn compile`

---

## 📊 Post-Deployment Steps

### 1. Test Contract Interactions

```bash
# Run mainnet test script
yarn hardhat run scripts/testBuyStrategy.ts --network arbitrum
```

**Note:** This will use real mainnet USDC! Test with small amounts first.

### 2. Configure Python Scanner

Update Python scanner for mainnet:

```bash
cd packages/python/scanner

# Update .env with mainnet addresses
cat >> .env << EOF

# Arbitrum Mainnet
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
STRATEGY_MANAGER_ADDRESS=YOUR_DEPLOYED_STRATEGY_MANAGER_ADDRESS
USDC_ADDRESS=0xaf88d065e77c8cC2239327C5EDb3A432268e5831
EOF
```

### 3. Update Frontend Configuration

Update `packages/nextjs/scaffold.config.ts`:

```typescript
targetNetworks: [chains.arbitrum],

// Update deployed contracts in contracts/deployedContracts.ts
// Copy from packages/hardhat/deployments/arbitrum/
```

### 4. Run Scanner (Production)

```bash
cd packages/python/scanner
python run_strategy_scanner.py
```

This will:
- Scan real Polymarket markets
- Calculate real arbitrage opportunities
- Deploy strategies to mainnet contract

**⚠️ WARNING:** This uses real USDC and creates real strategies!

### 5. Set Up Monitoring

Monitor your deployed contracts:

**Arbiscan Dashboard:**
- HedgeExecutor: `https://arbiscan.io/address/HEDGE_EXECUTOR_ADDRESS`
- StrategyManager: `https://arbiscan.io/address/STRATEGY_MANAGER_ADDRESS`

**Monitor Events:**
```bash
# Watch for StrategyCreated events
yarn hardhat run scripts/monitorEvents.ts --network arbitrum
```

### 6. Security Measures

**After deployment:**

1. ✅ Transfer ownership if needed
2. ✅ Set up multi-sig for admin functions
3. ✅ Configure emergency pause mechanisms
4. ✅ Set up monitoring alerts
5. ✅ Document all contract addresses
6. ✅ Backup deployment artifacts
7. ✅ Set up incident response plan

---

## 🔐 Security Best Practices

### Private Key Management

**DO:**
- ✅ Use hardware wallet for mainnet deployments
- ✅ Store private keys in secure vault
- ✅ Use separate deployer account (not main wallet)
- ✅ Rotate keys periodically
- ✅ Have secure backup of keys

**DON'T:**
- ❌ Commit `.env` file to git
- ❌ Share private keys
- ❌ Use same key for testnet and mainnet
- ❌ Store keys in plain text
- ❌ Use public or shared computers

### Access Control

After deployment, consider:
1. Transfer contract ownership to multi-sig
2. Implement timelock for critical functions
3. Set up role-based access control
4. Regular security audits

---

## 📝 Deployment Checklist

Print this checklist and check off each item:

### Pre-Deployment
- [ ] All contracts audited
- [ ] Testnet deployment successful
- [ ] All addresses verified (USDC, GMX)
- [ ] Environment variables configured
- [ ] Deployer account funded (0.05+ ETH)
- [ ] API keys active (Alchemy, Arbiscan)
- [ ] Gas price acceptable
- [ ] Team notified of deployment

### Deployment
- [ ] Clean build completed
- [ ] Contracts compiled successfully
- [ ] Dry run executed
- [ ] HedgeExecutor deployed
- [ ] StrategyManager deployed
- [ ] Transaction hashes recorded
- [ ] Contract addresses recorded
- [ ] Deployment artifacts saved

### Verification
- [ ] HedgeExecutor verified on Arbiscan
- [ ] StrategyManager verified on Arbiscan
- [ ] Contract source code visible
- [ ] Constructor args correct
- [ ] License type set

### Post-Deployment
- [ ] Test transactions executed
- [ ] Python scanner configured
- [ ] Frontend updated
- [ ] Monitoring set up
- [ ] Documentation updated
- [ ] Team notified of addresses
- [ ] Security measures implemented
- [ ] Backup created

---

## 🆘 Emergency Procedures

### If Deployment Fails

1. **Check gas price** - May need to increase
2. **Check balance** - Ensure sufficient ETH
3. **Check RPC** - Try different RPC endpoint
4. **Review logs** - Check error messages
5. **Redeploy** - Clean and try again

### If Verification Fails

1. Try manual verification on Arbiscan
2. Check compiler settings match
3. Ensure constructor args are correct
4. Contact Arbiscan support if needed

### If Contract Has Bug

1. **DO NOT PANIC**
2. Assess severity
3. Pause contract if possible
4. Contact security team
5. Prepare fix/migration plan
6. Communicate with users

---

## 📞 Support & Resources

**Documentation:**
- GMX Docs: https://docs.gmx.io/
- Arbitrum Docs: https://docs.arbitrum.io/
- Hardhat Docs: https://hardhat.org/

**Block Explorers:**
- Arbiscan: https://arbiscan.io/
- Arbitrum Bridge: https://bridge.arbitrum.io/

**RPC Endpoints:**
- Alchemy: https://dashboard.alchemy.com/
- Arbitrum Public: https://arbitrum.io/

**Community:**
- GMX Discord: https://discord.gg/gmx
- Arbitrum Discord: https://discord.gg/arbitrum

---

## 📄 Contract Addresses (After Deployment)

**Update this section after deployment:**

```
Network: Arbitrum Mainnet (Chain ID: 42161)

HedgeExecutor:
  Address: 0x...
  Transaction: https://arbiscan.io/tx/0x...
  Verified: https://arbiscan.io/address/0x...#code

StrategyManager:
  Address: 0x...
  Transaction: https://arbiscan.io/tx/0x...
  Verified: https://arbiscan.io/address/0x...#code

External Contracts:
  USDC: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
  GMX ExchangeRouter: 0x7C68C7E1CDBdD30B08C1c5433f385E814fAc2b9E
  GMX Router: 0x549352201EB5eba6cdc235D127cAe56d2145DAAF
```

---

## ⚠️ FINAL WARNING

**DEPLOYING TO MAINNET INVOLVES REAL MONEY AND REAL RISK**

- Double-check all addresses
- Test thoroughly on testnet first
- Ensure contracts are audited
- Have emergency procedures ready
- Monitor contracts closely after deployment
- Be prepared for unexpected issues

**Only proceed if you are confident and ready for production deployment.**

---

Good luck with your mainnet deployment! 🚀

