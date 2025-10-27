#!/bin/bash

# PolyHedge - Arbitrum Mainnet Deployment Script
# This script automates the deployment and verification process

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                  PolyHedge - Arbitrum Mainnet Deployment                  ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Check environment variables
echo "🔍 Checking environment configuration..."

if [ -z "$__RUNTIME_DEPLOYER_PRIVATE_KEY" ]; then
    echo "❌ Error: __RUNTIME_DEPLOYER_PRIVATE_KEY not set in .env"
    exit 1
fi

if [ -z "$ALCHEMY_API_KEY" ]; then
    echo "❌ Error: ALCHEMY_API_KEY not set in .env"
    exit 1
fi

if [ -z "$ETHERSCAN_V2_API_KEY" ]; then
    echo "⚠️  Warning: ETHERSCAN_V2_API_KEY not set - verification will fail"
fi

echo "✅ Environment variables configured"
echo ""

# Confirmation prompt
echo "⚠️  ⚠️  ⚠️  WARNING ⚠️  ⚠️  ⚠️"
echo ""
echo "You are about to deploy to ARBITRUM MAINNET"
echo "This will use REAL ETH and deploy REAL contracts!"
echo ""
echo "Make sure you have:"
echo "  ✅ Tested on Arbitrum Sepolia testnet"
echo "  ✅ Audited all smart contracts"
echo "  ✅ Backed up your deployer private key"
echo "  ✅ At least 0.05 ETH in deployer account"
echo "  ✅ Reviewed all contract addresses (USDC, GMX)"
echo ""
read -p "Are you ABSOLUTELY SURE you want to proceed? (type 'YES' to continue): " confirmation

if [ "$confirmation" != "YES" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "STEP 1: Cleaning previous builds"
echo "════════════════════════════════════════════════════════════════════════════"
cd packages/hardhat
yarn clean

echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "STEP 2: Compiling contracts"
echo "════════════════════════════════════════════════════════════════════════════"
yarn compile

echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo "STEP 3: Deploying to Arbitrum Mainnet"
echo "════════════════════════════════════════════════════════════════════════════"
echo "This may take several minutes..."
echo ""

yarn hardhat deploy --network arbitrum

# Check if deployment was successful
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Deployment failed! Check the error messages above."
    exit 1
fi

echo ""
echo "✅ Deployment successful!"
echo ""

# Extract deployed addresses
HEDGE_EXECUTOR_ADDRESS=$(cat deployments/arbitrum/HedgeExecutor.json | grep -o '"address"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4)
STRATEGY_MANAGER_ADDRESS=$(cat deployments/arbitrum/StrategyManager.json | grep -o '"address"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4)

echo "📋 Deployed Contracts:"
echo "   HedgeExecutor: $HEDGE_EXECUTOR_ADDRESS"
echo "   StrategyManager: $STRATEGY_MANAGER_ADDRESS"
echo ""

echo "════════════════════════════════════════════════════════════════════════════"
echo "STEP 4: Verifying contracts on Arbiscan"
echo "════════════════════════════════════════════════════════════════════════════"
echo "This may take a minute..."
echo ""

yarn hardhat run scripts/verifyDeployedContracts.ts --network arbitrum

echo ""
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                        ✅ DEPLOYMENT COMPLETE!                            ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Contract Addresses:"
echo ""
echo "HedgeExecutor:"
echo "  Address: $HEDGE_EXECUTOR_ADDRESS"
echo "  Arbiscan: https://arbiscan.io/address/$HEDGE_EXECUTOR_ADDRESS#code"
echo ""
echo "StrategyManager:"
echo "  Address: $STRATEGY_MANAGER_ADDRESS"
echo "  Arbiscan: https://arbiscan.io/address/$STRATEGY_MANAGER_ADDRESS#code"
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "📋 NEXT STEPS:"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "1. Save these addresses in a secure location"
echo "2. Update Python scanner configuration:"
echo "   cd packages/python/scanner"
echo "   Update .env with STRATEGY_MANAGER_ADDRESS=$STRATEGY_MANAGER_ADDRESS"
echo ""
echo "3. Update frontend configuration:"
echo "   cd packages/nextjs"
echo "   Update scaffold.config.ts with arbitrum mainnet"
echo ""
echo "4. Test the deployment:"
echo "   yarn hardhat run scripts/testBuyStrategy.ts --network arbitrum"
echo "   (Use small amounts for initial testing!)"
echo ""
echo "5. Set up monitoring for your contracts on Arbiscan"
echo ""
echo "6. Consider transferring ownership to a multi-sig wallet"
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "🎉 Congratulations on your mainnet deployment!"
echo ""

