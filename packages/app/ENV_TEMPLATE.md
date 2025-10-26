# Frontend Environment Variables Template

Create a file named `.env.local` in this directory (`packages/app/`) with the following content:

```bash
# Arbitrum Mainnet Configuration

# RPC Endpoint (you mentioned you already updated this)
NEXT_PUBLIC_ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# WalletConnect Project ID (optional - get one at https://cloud.walletconnect.com/)
# If not set, only injected wallets (MetaMask, etc.) will be available
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Deployed Contract Addresses on Arbitrum Mainnet
# These will be filled after you deploy with: yarn deploy --network arbitrum
NEXT_PUBLIC_STRATEGY_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_HEDGE_EXECUTOR_ADDRESS=0x...
NEXT_PUBLIC_POLYGON_RECEIVER_ADDRESS=0x...
```

## How to Use

1. **Copy this template**:
   ```bash
   # In packages/app/ directory
   touch .env.local
   # Then paste the content above into .env.local
   ```

2. **Fill in the values**:
   - `NEXT_PUBLIC_ARBITRUM_RPC_URL`: Your RPC endpoint (you said you already have this)
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Get from https://cloud.walletconnect.com/ (optional)
   - Contract addresses: Will be provided after deploying contracts to mainnet

3. **The file is already in .gitignore**, so it won't be committed to git.

## Example with Real Values

```bash
# Real mainnet RPC (using public endpoint)
NEXT_PUBLIC_ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# Your WalletConnect project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=abc123xyz789

# Your deployed contracts (example addresses - use your actual ones)
NEXT_PUBLIC_STRATEGY_MANAGER_ADDRESS=0x1234567890123456789012345678901234567890
NEXT_PUBLIC_HEDGE_EXECUTOR_ADDRESS=0x2345678901234567890123456789012345678901
NEXT_PUBLIC_POLYGON_RECEIVER_ADDRESS=0x3456789012345678901234567890123456789012
```

## What Each Variable Does

| Variable | Purpose | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_ARBITRUM_RPC_URL` | RPC endpoint for Arbitrum mainnet | Yes |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Enables WalletConnect support | No (fallback to injected wallets) |
| `NEXT_PUBLIC_STRATEGY_MANAGER_ADDRESS` | Your deployed StrategyManager contract | Yes |
| `NEXT_PUBLIC_HEDGE_EXECUTOR_ADDRESS` | Your deployed HedgeExecutor contract | Yes |
| `NEXT_PUBLIC_POLYGON_RECEIVER_ADDRESS` | Your deployed PolygonReceiver contract | Optional |

## Verification

After creating `.env.local`, restart your dev server:

```bash
yarn dev
```

The app should now connect to Arbitrum mainnet!

