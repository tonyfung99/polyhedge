# Mainnet Quick Start Guide

## TL;DR - Your Code is Already Mainnet Ready! 🎉

Your codebase is **already configured for Arbitrum mainnet**. You just need to:
1. Deploy contracts
2. Set environment variables
3. Start the app

## Step-by-Step Deployment

### Step 1: Deploy Smart Contracts (5 minutes)

```bash
# From project root
cd packages/hardhat

# Create .env file if you haven't:
cat << EOF > .env
ALCHEMY_API_KEY=your_alchemy_api_key
__RUNTIME_DEPLOYER_PRIVATE_KEY=0x...your_private_key
ETHERSCAN_V2_API_KEY=your_etherscan_api_key
EOF

# Deploy to Arbitrum mainnet
yarn deploy --network arbitrum

# Save the deployed addresses that are printed:
# - HedgeExecutor: 0x...
# - StrategyManager: 0x...
```

### Step 2: Configure Frontend (2 minutes)

```bash
# From project root
cd packages/app

# Create .env.local
cat << EOF > .env.local
# Your RPC (you already have this)
NEXT_PUBLIC_ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# Optional - Get from https://cloud.walletconnect.com/
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Paste addresses from Step 1
NEXT_PUBLIC_STRATEGY_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_HEDGE_EXECUTOR_ADDRESS=0x...
NEXT_PUBLIC_POLYGON_RECEIVER_ADDRESS=0x...
EOF
```

### Step 3: Start Frontend (30 seconds)

```bash
# From packages/app
yarn dev

# Or from project root:
yarn start
```

Open http://localhost:3000 - Done! ✅

### Optional: Configure Bridge Service

```bash
cd packages/bridge

# Copy and edit
cp env.sample .env

# Edit .env with:
# - STRATEGY_MANAGER_ADDRESS from Step 1
# - Your RPC URLs
# - Polymarket credentials

# Start bridge
yarn dev
```

## What's Already Configured

| Component | Status | Details |
|-----------|--------|---------|
| **Frontend Chain** | ✅ Mainnet | Using Arbitrum mainnet (42161) |
| **USDC Address** | ✅ Mainnet | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| **GMX Addresses** | ✅ Mainnet | ExchangeRouter & Router configured |
| **Deployment Scripts** | ✅ Mainnet | Hardhat config ready for mainnet |
| **Bridge Config** | ✅ Mainnet | HyperSync & Polymarket endpoints |
| **RPC Defaults** | ✅ Mainnet | Public mainnet endpoints set |

## Handy Commands

### From Project Root

```bash
# Deploy contracts
yarn deploy --network arbitrum

# Start frontend
yarn start

# Compile contracts
yarn compile

# Run tests
yarn test
```

### Verify Contracts (Optional)

```bash
cd packages/hardhat

# After deployment, verify on Arbiscan
yarn hardhat verify --network arbitrum <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## Troubleshooting

### "Contract address is zero"
**Fix**: Make sure you created `packages/app/.env.local` with contract addresses

### "Wrong network" in wallet
**Fix**: Switch MetaMask to Arbitrum mainnet (Chain ID: 42161)

### "Insufficient funds for gas"
**Fix**: Send ETH to your deployer address on Arbitrum mainnet

### Frontend won't start
**Fix**: Make sure you ran `yarn install` from project root

## Testing Checklist

Before opening to users:

- [ ] Deploy contracts to mainnet
- [ ] Verify contracts on Arbiscan (https://arbiscan.io/)
- [ ] Set frontend environment variables
- [ ] Start frontend - verify it loads
- [ ] Connect MetaMask to Arbitrum mainnet
- [ ] Test buying a strategy with small amount (1 USDC)
- [ ] Check transaction on Arbiscan
- [ ] Verify events are emitted
- [ ] Test claiming after maturity
- [ ] Monitor gas costs

## Environment Files Summary

```
polyhedge/
├── packages/
│   ├── hardhat/
│   │   └── .env                 # ← Create this (deployment keys)
│   ├── app/
│   │   └── .env.local           # ← Create this (contract addresses)
│   └── bridge/
│       └── .env                 # ← Create this (bridge config)
└── ...
```

## Critical Addresses (Already in Code)

| Contract | Address |
|----------|---------|
| **USDC (Arbitrum)** | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| **GMX ExchangeRouter** | `0x7C68C7E1CDBdD30B08C1c5433f385E814fAc2b9E` |
| **GMX Router** | `0x549352201EB5eba6cdc235D127cAe56d2145DAAF` |

## Resources

- **Mainnet Status**: `MAINNET_STATUS.md`
- **Deployment Guide**: `MAINNET_DEPLOYMENT_GUIDE.md`
- **Frontend Env Template**: `packages/app/ENV_TEMPLATE.md`
- **Bridge Env Sample**: `packages/bridge/env.sample`

## Questions?

1. Check if contracts are deployed: https://arbiscan.io/
2. Check if frontend env is set: `cat packages/app/.env.local`
3. Check if RPC is working: `curl $NEXT_PUBLIC_ARBITRUM_RPC_URL`

---

**Ready to deploy?** Start with Step 1 above! 🚀

