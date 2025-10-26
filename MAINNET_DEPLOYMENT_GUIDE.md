# Mainnet Deployment Guide

## Overview
This guide walks you through deploying PolyHedge to Arbitrum Mainnet and updating the frontend.

## Prerequisites

✅ **Already Configured**:
- Frontend uses Arbitrum mainnet chain (`wagmi/chains` - chain ID 42161)
- USDC address set to Arbitrum mainnet: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- GMX V2 addresses configured for mainnet
- RPC endpoints updated (as you mentioned)

## Deployment Steps

### 1. Set Up Environment Variables

#### For Hardhat Deployment (`packages/hardhat/.env`):

```bash
# Required for deployment
ALCHEMY_API_KEY=your_alchemy_api_key
__RUNTIME_DEPLOYER_PRIVATE_KEY=0x...  # Your deployer wallet private key
ETHERSCAN_V2_API_KEY=your_etherscan_api_key  # For contract verification
```

### 2. Deploy Contracts to Arbitrum Mainnet

```bash
cd packages/hardhat

# Deploy HedgeExecutor first
yarn deploy --network arbitrum --tags HedgeExecutor

# Then deploy StrategyManager
yarn deploy --network arbitrum --tags StrategyManager

# Optionally deploy PolygonReceiver (if needed)
yarn deploy --network arbitrum --tags PolygonReceiver
```

After deployment, note the contract addresses from the output:
```
✅ HedgeExecutor deployed at: 0x...
✅ StrategyManager deployed at: 0x...
✅ PolygonReceiver deployed at: 0x...
```

### 3. Verify Contracts on Arbiscan (Optional but Recommended)

```bash
# Verify HedgeExecutor
yarn hardhat verify --network arbitrum <HEDGE_EXECUTOR_ADDRESS> \
  "0x7C68C7E1CDBdD30B08C1c5433f385E814fAc2b9E" \
  "0x549352201EB5eba6cdc235D127cAe56d2145DAAF" \
  "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"

# Verify StrategyManager
yarn hardhat verify --network arbitrum <STRATEGY_MANAGER_ADDRESS> \
  "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" \
  <HEDGE_EXECUTOR_ADDRESS>
```

### 4. Update Frontend Environment Variables

Create `packages/app/.env.local`:

```bash
# Copy the example file
cd packages/app
cp .env.example .env.local
```

Edit `.env.local` with your deployed contract addresses:

```bash
# Arbitrum Mainnet RPC (you already have this)
NEXT_PUBLIC_ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# WalletConnect Project ID (optional, for WalletConnect support)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Deployed Contract Addresses (from step 2)
NEXT_PUBLIC_STRATEGY_MANAGER_ADDRESS=0x...  # Your deployed StrategyManager address
NEXT_PUBLIC_HEDGE_EXECUTOR_ADDRESS=0x...    # Your deployed HedgeExecutor address
NEXT_PUBLIC_POLYGON_RECEIVER_ADDRESS=0x...  # Your deployed PolygonReceiver address
```

### 5. Start Frontend

```bash
cd packages/app
yarn dev
```

Your frontend will now connect to the mainnet contracts!

## Configuration Summary

### Contract Addresses (Pre-configured in deployment scripts)

| Contract | Network | Address |
|----------|---------|---------|
| **GMX ExchangeRouter** | Arbitrum Mainnet | `0x7C68C7E1CDBdD30B08C1c5433f385E814fAc2b9E` |
| **GMX Router** | Arbitrum Mainnet | `0x549352201EB5eba6cdc235D127cAe56d2145DAAF` |
| **USDC** | Arbitrum Mainnet | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |

### Your Deployed Contracts (To be filled after deployment)

| Contract | Network | Address |
|----------|---------|---------|
| **HedgeExecutor** | Arbitrum Mainnet | `NEXT_PUBLIC_HEDGE_EXECUTOR_ADDRESS` |
| **StrategyManager** | Arbitrum Mainnet | `NEXT_PUBLIC_STRATEGY_MANAGER_ADDRESS` |
| **PolygonReceiver** | Arbitrum Mainnet | `NEXT_PUBLIC_POLYGON_RECEIVER_ADDRESS` |

## Important Notes

### Chain Configuration
- ✅ Frontend is already configured for Arbitrum mainnet (chain ID: 42161)
- ✅ USDC address is correct for mainnet
- ✅ GMX addresses are correct for mainnet
- ✅ All hooks use `arbitrum.id` from `wagmi/chains`

### What Changed From Testnet
If you were previously on testnet:
1. **Chain ID**: Now using 42161 (Arbitrum mainnet) instead of 421614 (Arbitrum Sepolia)
2. **USDC**: Using native USDC on mainnet
3. **GMX**: Using production GMX V2 contracts
4. **RPC**: Using mainnet RPC endpoints

### Security Reminders
- ⚠️ **Never commit `.env.local`** - it's already in `.gitignore`
- ⚠️ **Keep private keys secure** - use environment variables or a secure key manager
- ⚠️ **Test with small amounts first** - verify everything works before large transactions
- ⚠️ **Verify contracts** - helps users trust your contracts

## Troubleshooting

### "Contract address is zero" Error
**Cause**: Environment variables not set in `.env.local`
**Solution**: Make sure you've created `.env.local` with the correct contract addresses

### "Wrong network" Error
**Cause**: Wallet is connected to a different network
**Solution**: In your wallet (MetaMask, etc.), switch to Arbitrum Mainnet

### "Insufficient balance" Error
**Cause**: Deployer account doesn't have enough ETH for gas
**Solution**: Send ETH to your deployer address on Arbitrum mainnet

### Contracts Won't Deploy
**Cause**: GMX addresses might be incorrect
**Solution**: Double-check GMX addresses match the official ones:
- Docs: https://docs.gmx.io/docs/api/contracts-v2/

## Testing Before Going Live

1. **Deploy contracts** to mainnet
2. **Verify contracts** on Arbiscan
3. **Test with small amounts**:
   - Buy a strategy with minimum USDC
   - Verify transactions on Arbiscan
   - Check events are emitted correctly
4. **Monitor gas costs** for typical operations
5. **Test claiming** when strategies mature

## Next Steps After Deployment

1. ✅ Deploy contracts to Arbitrum mainnet
2. ✅ Update frontend `.env.local` with addresses
3. ✅ Verify contracts on Arbiscan
4. 🔄 Deploy bridge service to production
5. 🔄 Configure Polymarket integration
6. 🔄 Set up monitoring and alerts
7. 🔄 Deploy frontend to production (Vercel, etc.)

## Additional Resources

- **Arbitrum Explorer**: https://arbiscan.io/
- **GMX Docs**: https://docs.gmx.io/
- **USDC on Arbitrum**: https://arbiscan.io/token/0xaf88d065e77c8cC2239327C5EDb3A432268e5831
- **Hardhat Deploy**: https://github.com/wighawag/hardhat-deploy

---

## Quick Checklist

- [ ] Set `ALCHEMY_API_KEY` in `packages/hardhat/.env`
- [ ] Set `__RUNTIME_DEPLOYER_PRIVATE_KEY` in `packages/hardhat/.env`
- [ ] Deploy HedgeExecutor: `yarn deploy --network arbitrum --tags HedgeExecutor`
- [ ] Deploy StrategyManager: `yarn deploy --network arbitrum --tags StrategyManager`
- [ ] Copy contract addresses
- [ ] Create `packages/app/.env.local` from `.env.example`
- [ ] Set `NEXT_PUBLIC_STRATEGY_MANAGER_ADDRESS`
- [ ] Set `NEXT_PUBLIC_HEDGE_EXECUTOR_ADDRESS`
- [ ] Set `NEXT_PUBLIC_POLYGON_RECEIVER_ADDRESS`
- [ ] Set `NEXT_PUBLIC_ARBITRUM_RPC_URL` (if not already done)
- [ ] Start frontend: `yarn dev`
- [ ] Test with MetaMask on Arbitrum mainnet
- [ ] Verify contract interactions work

---

**You're almost there!** The code is already configured for mainnet - you just need to deploy the contracts and set the addresses in the frontend environment variables.

