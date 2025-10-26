# Mainnet Migration Status

## ✅ Already Configured for Mainnet

Great news! Your codebase is **already fully configured for Arbitrum mainnet**. Here's what's already set:

### Frontend (`packages/app`)
- ✅ Using Arbitrum mainnet chain (`arbitrum` from `wagmi/chains` - Chain ID: 42161)
- ✅ USDC address is correct: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- ✅ All hooks use `arbitrum.id` (mainnet chain ID)
- ✅ No hardcoded testnet configurations
- ✅ RPC endpoint defaults to mainnet: `https://arb1.arbitrum.io/rpc`

### Smart Contracts (`packages/hardhat`)
- ✅ Deployment scripts configured for Arbitrum mainnet
- ✅ GMX V2 addresses set to mainnet:
  - ExchangeRouter: `0x7C68C7E1CDBdD30B08C1c5433f385E814fAc2b9E`
  - Router: `0x549352201EB5eba6cdc235D127cAe56d2145DAAF`
  - USDC: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- ✅ Hardhat config includes `arbitrum` network

### Bridge Service (`packages/bridge`)
- ✅ HyperSync endpoint: `https://arb-main.hypersync.xyz` (mainnet)
- ✅ Polymarket host: `https://clob.polymarket.com` (mainnet)
- ✅ Polymarket chain ID: 137 (Polygon mainnet)
- ✅ RPC endpoints configured for mainnet

## 🔧 What You Need to Do

### 1. Deploy Smart Contracts to Arbitrum Mainnet

```bash
cd packages/hardhat

# Make sure you have the environment variables set:
# ALCHEMY_API_KEY=your_alchemy_api_key
# __RUNTIME_DEPLOYER_PRIVATE_KEY=0x...
# ETHERSCAN_V2_API_KEY=your_etherscan_api_key

# Deploy contracts
yarn deploy --network arbitrum

# This will deploy in order:
# 1. HedgeExecutor
# 2. StrategyManager
# 3. PolygonReceiver (if needed)

# Note the addresses from the deployment output
```

### 2. Configure Frontend Environment Variables

Create `packages/app/.env.local`:

```bash
# See packages/app/ENV_TEMPLATE.md for full instructions

# Your RPC endpoint (you mentioned you already have this)
NEXT_PUBLIC_ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# Optional WalletConnect Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Deployed contract addresses from step 1
NEXT_PUBLIC_STRATEGY_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_HEDGE_EXECUTOR_ADDRESS=0x...
NEXT_PUBLIC_POLYGON_RECEIVER_ADDRESS=0x...
```

### 3. Configure Bridge Service

Create `packages/bridge/.env`:

```bash
# Copy from env.sample and fill in:
cp packages/bridge/env.sample packages/bridge/.env

# Key variables to set:
STRATEGY_MANAGER_ADDRESS=0x...  # From deployment
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/your-key
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/your-key

# Polymarket credentials (use Vincent SDK or direct private key)
USE_VINCENT=false  # or true if using Vincent
POLYMARKET_PRIVATE_KEY=0x...
POLYMARKET_FUNDER_ADDRESS=0x...
```

### 4. Start the Application

```bash
# Terminal 1 - Frontend
cd packages/app
yarn dev

# Terminal 2 - Bridge Service
cd packages/bridge
yarn dev
```

## 📋 Quick Checklist

### Smart Contracts
- [ ] Set `ALCHEMY_API_KEY` in `packages/hardhat/.env`
- [ ] Set `__RUNTIME_DEPLOYER_PRIVATE_KEY` in `packages/hardhat/.env`
- [ ] Fund deployer wallet with ETH on Arbitrum mainnet
- [ ] Run: `yarn deploy --network arbitrum`
- [ ] Save deployed contract addresses
- [ ] (Optional) Verify contracts on Arbiscan

### Frontend
- [ ] Create `packages/app/.env.local`
- [ ] Set `NEXT_PUBLIC_ARBITRUM_RPC_URL` (you have this)
- [ ] Set `NEXT_PUBLIC_STRATEGY_MANAGER_ADDRESS`
- [ ] Set `NEXT_PUBLIC_HEDGE_EXECUTOR_ADDRESS`
- [ ] Set `NEXT_PUBLIC_POLYGON_RECEIVER_ADDRESS`
- [ ] Run: `yarn dev`
- [ ] Connect MetaMask to Arbitrum mainnet
- [ ] Test basic functionality

### Bridge Service
- [ ] Create `packages/bridge/.env` from `env.sample`
- [ ] Set `STRATEGY_MANAGER_ADDRESS`
- [ ] Set `ARBITRUM_RPC_URL` and `POLYGON_RPC_URL`
- [ ] Configure Polymarket credentials
- [ ] Run: `yarn dev`
- [ ] Test API health endpoint

## 🎯 Summary

**Your code is already configured for mainnet!** You just need to:

1. **Deploy** the smart contracts to Arbitrum mainnet
2. **Set environment variables** with the deployed addresses
3. **Start** the services

## 📁 Reference Files

- Frontend env template: `packages/app/ENV_TEMPLATE.md`
- Bridge env sample: `packages/bridge/env.sample`
- Deployment guide: `MAINNET_DEPLOYMENT_GUIDE.md`
- Contract addresses: `packages/app/lib/contracts/addresses.ts`
- Deployment scripts: `packages/hardhat/deploy/`

## ⚠️ Important Notes

### Security
- Never commit `.env` or `.env.local` files (they're in `.gitignore`)
- Keep private keys secure
- Test with small amounts first

### Network Settings
- **Chain ID**: 42161 (Arbitrum mainnet)
- **Native Token**: ETH
- **USDC**: 6 decimals (not 18!)
- **Block Explorer**: https://arbiscan.io/

### Testing
Before going live:
1. Deploy contracts to mainnet
2. Verify on Arbiscan
3. Test with minimum USDC amounts
4. Verify events are emitted correctly
5. Check Polymarket order execution
6. Monitor gas costs

## 🚀 Next Steps

1. **Right now**: Deploy contracts if you haven't already
2. **Set env vars**: Add addresses to frontend `.env.local`
3. **Start services**: Run frontend and bridge
4. **Test**: Verify everything works with small amounts
5. **Go live**: Open to users once tested

---

**Questions?** Check:
- `MAINNET_DEPLOYMENT_GUIDE.md` for detailed deployment steps
- `packages/app/ENV_TEMPLATE.md` for frontend environment variables
- `packages/bridge/env.sample` for bridge configuration

**You're almost there!** 🎉

