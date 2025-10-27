#!/usr/bin/env python3
"""
Main entry point for the PolyHedge Strategy Scanner

This script:
1. Loads deployed contract addresses and ABIs
2. Initializes the StrategyScanner with real Polymarket API
3. Scans for inefficient opportunities
4. Constructs hedging strategies
5. Deploys strategies to the smart contract
"""

import os
import sys
import asyncio
import json
import logging
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from strategy_scanner import StrategyScanner

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


def load_contract_abi(contract_name: str, network: str = "arbitrum") -> dict:
    """Load contract ABI from deployment JSON file"""
    try:
        # Path to hardhat deployments
        deployment_path = Path(__file__).parent.parent.parent / "hardhat" / "deployments" / network
        
        # Load from deployment JSON
        deployment_file = deployment_path / f"{contract_name}.json"
        
        if deployment_file.exists():
            with open(deployment_file, 'r') as f:
                deployment_data = json.load(f)
                abi = deployment_data.get('abi', [])
                logger.info(f"Loaded {contract_name} ABI from deployment file: {deployment_file}")
                logger.info(f"   ✓ ABI loaded ({len(abi)} items)")
                return abi
        else:
            logger.warning(f"Deployment file not found: {deployment_file}")
            return _get_fallback_abi(contract_name)
    
    except Exception as e:
        logger.error(f"Error loading ABI: {e}")
        return _get_fallback_abi(contract_name)


def _get_fallback_abi(contract_name: str) -> dict:
    """Fallback ABI for known contracts"""
    if contract_name == "StrategyManager":
        # Minimal ABI for createStrategy function
        return [
            {
                "inputs": [
                    {"name": "name", "type": "string"},
                    {"name": "feeBps", "type": "uint256"},
                    {"name": "maturityTs", "type": "uint256"},
                    {
                        "name": "pmOrders",
                        "type": "tuple[]",
                        "components": [
                            {"name": "marketId", "type": "string"},
                            {"name": "isYes", "type": "bool"},
                            {"name": "notionalBps", "type": "uint256"},
                            {"name": "maxPriceBps", "type": "uint256"},
                            {"name": "priority", "type": "uint256"},
                        ],
                    },
                    {
                        "name": "hedgeOrders",
                        "type": "tuple[]",
                        "components": [
                            {"name": "asset", "type": "string"},
                            {"name": "isLong", "type": "bool"},
                            {"name": "amount", "type": "uint256"},
                            {"name": "maxSlippageBps", "type": "uint256"},
                        ],
                    },
                    {"name": "expectedProfitBps", "type": "uint256"},
                ],
                "name": "createStrategy",
                "outputs": [{"name": "strategyId", "type": "uint256"}],
                "stateMutability": "nonpayable",
                "type": "function",
            }
        ]
    return []


def get_strategy_manager_address(network: str = "arbitrum") -> str:
    """Get StrategyManager address from deployment or environment"""
    # Try environment variable first
    if os.getenv('STRATEGY_MANAGER_ADDRESS'):
        return os.getenv('STRATEGY_MANAGER_ADDRESS')
    
    # Try to load from deployment artifacts
    try:
        deployment_file = (
            Path(__file__).parent.parent.parent / "hardhat" / 
            "deployments" / network / "StrategyManager.json"
        )
        if deployment_file.exists():
            with open(deployment_file, 'r') as f:
                deployment = json.load(f)
                address = deployment.get('address')
                if address:
                    logger.info(f"Loaded StrategyManager address from deployment: {address}")
                    return address
    except Exception as e:
        logger.warning(f"Could not load from deployment file: {e}")
    
    # Fallback to mainnet deployed address
    return "0x2E0DBaC1cE2356aca580F89AbAb94032d36E0579"


async def main():
    """Main entry point for strategy scanner"""
    
    logger.info("="*80)
    logger.info("🚀 PolyHedge Strategy Scanner - Starting")
    logger.info("="*80)
    logger.info("")
    
    # Load configuration
    polymarket_api_key = os.getenv('POLYMARKET_API_KEY', '')
    polymarket_api_secret = os.getenv('POLYMARKET_API_SECRET', '')
    
    # Determine network from environment variable
    network = os.getenv('NETWORK', 'arbitrum')  # Default to mainnet
    
    # Set RPC URL based on network
    if network == 'arbitrum':
        default_rpc = 'https://arb1.arbitrum.io/rpc'
        network_name = 'Arbitrum Mainnet'
    elif network == 'arbitrumSepolia':
        default_rpc = 'https://sepolia-rollup.arbitrum.io/rpc'
        network_name = 'Arbitrum Sepolia'
    else:
        default_rpc = 'https://arb1.arbitrum.io/rpc'
        network_name = network
    
    arbitrum_rpc = os.getenv('ARBITRUM_RPC_URL', default_rpc)
    private_key = os.getenv('DEPLOYER_PRIVATE_KEY') or os.getenv('__RUNTIME_DEPLOYER_PRIVATE_KEY')
    
    # Get contract address
    strategy_manager_address = get_strategy_manager_address(network)
    
    logger.info("📝 Configuration:")
    logger.info(f"  Network: {network_name}")
    logger.info(f"  RPC URL: {arbitrum_rpc}")
    logger.info(f"  StrategyManager: {strategy_manager_address}")
    logger.info(f"  Polymarket API: Public Gamma API (no auth needed)")
    logger.info(f"  Deployer Key: {'✓ Loaded' if private_key else '✗ NOT CONFIGURED'}")
    logger.info("")
    
    # Validate configuration
    if not private_key:
        logger.error("❌ DEPLOYER_PRIVATE_KEY not found in environment")
        logger.error("   Please set DEPLOYER_PRIVATE_KEY or __RUNTIME_DEPLOYER_PRIVATE_KEY in .env file")
        sys.exit(1)
    
    try:
        # Load contract ABI
        logger.info("📋 Loading StrategyManager ABI...")
        strategy_manager_abi = load_contract_abi("StrategyManager", network)
        logger.info(f"   ✓ ABI loaded ({len(strategy_manager_abi)} functions)")
        logger.info("")
        
        # Initialize scanner
        logger.info("🔧 Initializing Strategy Scanner...")
        scanner = StrategyScanner(
            polymarket_api_key=polymarket_api_key,
            polymarket_api_secret=polymarket_api_secret,
            arbitrum_rpc=arbitrum_rpc,
            strategy_manager_address=strategy_manager_address,
            strategy_manager_abi=strategy_manager_abi,
            private_key=private_key
        )
        logger.info("   ✓ Scanner initialized")
        logger.info("")
        
        # Always use real Polymarket Gamma API (no mock data)
        logger.info("📡 Using REAL Polymarket Gamma API")
        logger.info("   Endpoint: https://gamma-api.polymarket.com/events")
        logger.info("   No authentication required - public endpoint")
        logger.info("")
        
        logger.info("🔍 Starting market scan...")
        logger.info("")
        
        deployed_strategies = await scanner.scan_and_deploy(
            assets=['BTC', 'ETH'],
            mock_data=False  # Always use real API
        )
        
        # Print results
        logger.info("")
        logger.info("="*80)
        logger.info(f"✅ Scan Complete: {len(deployed_strategies)} strategies deployed")
        logger.info("="*80)
        
        if deployed_strategies:
            logger.info("\n📊 Deployed Strategies:")
            for i, strategy in enumerate(deployed_strategies, 1):
                logger.info(f"\n  Strategy {i}:")
                logger.info(f"    Name: {strategy.get('name', 'N/A')}")
                logger.info(f"    Fee: {strategy.get('feeBps', 0) / 100}%")
                logger.info(f"    Expected Profit: {strategy.get('expectedProfitBps', 0) / 100}%")
                logger.info(f"    Polymarket Orders: {len(strategy.get('polymarketOrders', []))}")
                logger.info(f"    Hedge Orders: {len(strategy.get('hedgeOrders', []))}")
                logger.info(f"    TX Hash: {strategy.get('txHash', 'N/A')}")
        
        logger.info("\n" + "="*80)
        logger.info("✨ Strategy Scanner Session Complete")
        logger.info("="*80)
        
        return deployed_strategies
    
    except Exception as e:
        logger.error(f"❌ Error during scanning: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    # Run async main
    deployed = asyncio.run(main())
    sys.exit(0 if deployed else 1)
