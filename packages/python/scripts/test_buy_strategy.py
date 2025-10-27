#!/usr/bin/env python3
"""
Test script for buying strategies on Arbitrum Sepolia testnet

This script:
1. Connects to deployed StrategyManager contract
2. Fetches available strategies
3. Gets testnet USDC from faucet (if needed)
4. Approves USDC spending
5. Buys a strategy
6. Monitors the transaction and events
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from web3 import Web3
from eth_account import Account
from dotenv import load_dotenv
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class StrategyBuyerTest:
    """Test buying strategies on Arbitrum Sepolia"""
    
    def __init__(
        self,
        rpc_url: str,
        strategy_manager_address: str,
        usdc_address: str,
        private_key: str
    ):
        """Initialize the test buyer"""
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        
        if not self.w3.is_connected():
            raise Exception("Failed to connect to Arbitrum Sepolia RPC")
        
        self.account = Account.from_key(private_key)
        self.strategy_manager_address = Web3.to_checksum_address(strategy_manager_address)
        self.usdc_address = Web3.to_checksum_address(usdc_address)
        
        # Load ABIs
        self.strategy_manager_abi = self._load_contract_abi('StrategyManager')
        self.usdc_abi = self._load_erc20_abi()
        
        # Create contract instances
        self.strategy_manager = self.w3.eth.contract(
            address=self.strategy_manager_address,
            abi=self.strategy_manager_abi
        )
        
        self.usdc = self.w3.eth.contract(
            address=self.usdc_address,
            abi=self.usdc_abi
        )
        
        logger.info(f"✅ Connected to Arbitrum Sepolia")
        logger.info(f"   Account: {self.account.address}")
        logger.info(f"   StrategyManager: {self.strategy_manager_address}")
        logger.info(f"   USDC: {self.usdc_address}")
    
    def _load_contract_abi(self, contract_name: str) -> list:
        """Load contract ABI from deployment file"""
        try:
            deployment_path = Path(__file__).parent.parent.parent / "hardhat" / "deployments" / "arbitrumSepolia"
            deployment_file = deployment_path / f"{contract_name}.json"
            
            with open(deployment_file, 'r') as f:
                deployment_data = json.load(f)
                return deployment_data['abi']
        except Exception as e:
            logger.error(f"Error loading ABI for {contract_name}: {e}")
            raise
    
    def _load_erc20_abi(self) -> list:
        """Load standard ERC20 ABI"""
        return [
            {
                "constant": True,
                "inputs": [{"name": "_owner", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"name": "balance", "type": "uint256"}],
                "type": "function"
            },
            {
                "constant": False,
                "inputs": [
                    {"name": "_spender", "type": "address"},
                    {"name": "_value", "type": "uint256"}
                ],
                "name": "approve",
                "outputs": [{"name": "", "type": "bool"}],
                "type": "function"
            },
            {
                "constant": True,
                "inputs": [
                    {"name": "_owner", "type": "address"},
                    {"name": "_spender", "type": "address"}
                ],
                "name": "allowance",
                "outputs": [{"name": "", "type": "uint256"}],
                "type": "function"
            },
            {
                "constant": True,
                "inputs": [],
                "name": "decimals",
                "outputs": [{"name": "", "type": "uint8"}],
                "type": "function"
            }
        ]
    
    def get_eth_balance(self) -> float:
        """Get ETH balance"""
        balance_wei = self.w3.eth.get_balance(self.account.address)
        return float(self.w3.from_wei(balance_wei, 'ether'))
    
    def get_usdc_balance(self) -> float:
        """Get USDC balance"""
        balance = self.usdc.functions.balanceOf(self.account.address).call()
        return balance / 1e6  # USDC has 6 decimals
    
    def get_usdc_allowance(self) -> float:
        """Get USDC allowance for StrategyManager"""
        allowance = self.usdc.functions.allowance(
            self.account.address,
            self.strategy_manager_address
        ).call()
        return allowance / 1e6
    
    def list_strategies(self, max_strategies: int = 100) -> list:
        """List available strategies"""
        logger.info("\n" + "="*80)
        logger.info("📋 FETCHING AVAILABLE STRATEGIES")
        logger.info("="*80)
        
        strategies = []
        
        try:
            next_strategy_id = self.strategy_manager.functions.nextStrategyId().call()
            logger.info(f"Next Strategy ID: {next_strategy_id}")
            
            for strategy_id in range(1, min(next_strategy_id, max_strategies + 1)):
                try:
                    # Get strategy details
                    strategy = self.strategy_manager.functions.strategies(strategy_id).call()
                    
                    # Unpack strategy tuple
                    (
                        id,
                        name,
                        fee_bps,
                        maturity_ts,
                        active,
                        details,  # This is a nested tuple
                        settled,
                        payout_per_usdc
                    ) = strategy
                    
                    # Unpack details tuple
                    # details = (polymarketOrders[], hedgeOrders[], expectedProfitBps)
                    # Since it's nested, we'll just display what we can
                    
                    strategies.append({
                        'id': id,
                        'name': name,
                        'fee_bps': fee_bps,
                        'maturity_ts': maturity_ts,
                        'active': active,
                        'settled': settled,
                        'payout_per_usdc': payout_per_usdc
                    })
                    
                    status = "✅ ACTIVE" if active and not settled else "❌ INACTIVE"
                    fee_percent = fee_bps / 100
                    
                    logger.info(f"\nStrategy #{id}: {name}")
                    logger.info(f"  Status: {status}")
                    logger.info(f"  Fee: {fee_percent}%")
                    logger.info(f"  Maturity: {maturity_ts}")
                    logger.info(f"  Settled: {settled}")
                    
                except Exception as e:
                    # Strategy doesn't exist or error reading it
                    if "execution reverted" not in str(e).lower():
                        logger.debug(f"Error reading strategy {strategy_id}: {e}")
                    break
            
            logger.info(f"\n✅ Found {len(strategies)} strategies")
            return strategies
            
        except Exception as e:
            logger.error(f"Error listing strategies: {e}")
            return []
    
    def approve_usdc(self, amount_usdc: float) -> str:
        """Approve USDC spending"""
        logger.info("\n" + "="*80)
        logger.info("💰 APPROVING USDC SPENDING")
        logger.info("="*80)
        
        amount_wei = int(amount_usdc * 1e6)  # USDC has 6 decimals
        
        logger.info(f"Approving {amount_usdc} USDC for StrategyManager...")
        
        try:
            # Build approval transaction
            tx_dict = self.usdc.functions.approve(
                self.strategy_manager_address,
                amount_wei
            ).build_transaction({
                'from': self.account.address,
                'nonce': self.w3.eth.get_transaction_count(self.account.address),
                'gas': 100_000,
                'gasPrice': self.w3.eth.gas_price,
            })
            
            # Sign and send
            signed_tx = self.w3.eth.account.sign_transaction(tx_dict, self.account.key)
            
            if hasattr(signed_tx, 'raw_transaction'):
                raw_tx = signed_tx.raw_transaction
            elif hasattr(signed_tx, 'rawTransaction'):
                raw_tx = signed_tx.rawTransaction
            else:
                raw_tx = signed_tx['raw_transaction'] if 'raw_transaction' in signed_tx else signed_tx['rawTransaction']
            
            tx_hash = self.w3.eth.send_raw_transaction(raw_tx)
            
            logger.info(f"Transaction sent: {tx_hash.hex()}")
            logger.info(f"Waiting for confirmation...")
            
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)
            
            if receipt['status'] == 1:
                logger.info(f"✅ Approval successful!")
                logger.info(f"   Block: {receipt['blockNumber']}")
                logger.info(f"   Gas used: {receipt['gasUsed']}")
                return tx_hash.hex()
            else:
                logger.error(f"❌ Approval failed!")
                return None
                
        except Exception as e:
            logger.error(f"Error approving USDC: {e}")
            raise
    
    def buy_strategy(self, strategy_id: int, amount_usdc: float) -> dict:
        """Buy a strategy"""
        logger.info("\n" + "="*80)
        logger.info("🛒 BUYING STRATEGY")
        logger.info("="*80)
        
        amount_wei = int(amount_usdc * 1e6)  # USDC has 6 decimals
        
        logger.info(f"Strategy ID: {strategy_id}")
        logger.info(f"Amount: {amount_usdc} USDC")
        
        try:
            # Build buy transaction
            tx_dict = self.strategy_manager.functions.buyStrategy(
                strategy_id,
                amount_wei
            ).build_transaction({
                'from': self.account.address,
                'nonce': self.w3.eth.get_transaction_count(self.account.address),
                'gas': 1_000_000,  # Higher gas for complex transaction
                'gasPrice': self.w3.eth.gas_price,
            })
            
            # Sign and send
            signed_tx = self.w3.eth.account.sign_transaction(tx_dict, self.account.key)
            
            if hasattr(signed_tx, 'raw_transaction'):
                raw_tx = signed_tx.raw_transaction
            elif hasattr(signed_tx, 'rawTransaction'):
                raw_tx = signed_tx.rawTransaction
            else:
                raw_tx = signed_tx['raw_transaction'] if 'raw_transaction' in signed_tx else signed_tx['rawTransaction']
            
            tx_hash = self.w3.eth.send_raw_transaction(raw_tx)
            
            logger.info(f"Transaction sent: {tx_hash.hex()}")
            logger.info(f"Waiting for confirmation...")
            
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)
            
            if receipt['status'] == 1:
                logger.info(f"✅ Strategy purchase successful!")
                logger.info(f"   Block: {receipt['blockNumber']}")
                logger.info(f"   Gas used: {receipt['gasUsed']}")
                
                # Parse events
                self._parse_events(receipt)
                
                return {
                    'success': True,
                    'tx_hash': tx_hash.hex(),
                    'block': receipt['blockNumber'],
                    'gas_used': receipt['gasUsed']
                }
            else:
                logger.error(f"❌ Strategy purchase failed!")
                return {'success': False}
                
        except Exception as e:
            logger.error(f"Error buying strategy: {e}")
            raise
    
    def _parse_events(self, receipt: dict):
        """Parse events from transaction receipt"""
        logger.info("\n📡 EVENTS EMITTED:")
        
        try:
            # Get StrategyPurchased events
            strategy_purchased_event = self.strategy_manager.events.StrategyPurchased()
            purchased_logs = strategy_purchased_event.process_receipt(receipt)
            
            for log in purchased_logs:
                logger.info(f"\n  ✅ StrategyPurchased:")
                logger.info(f"     Strategy ID: {log['args']['strategyId']}")
                logger.info(f"     User: {log['args']['user']}")
                logger.info(f"     Gross Amount: {log['args']['grossAmount'] / 1e6} USDC")
                logger.info(f"     Net Amount: {log['args']['netAmount'] / 1e6} USDC")
            
            # Get HedgeOrderCreated events (from HedgeExecutor)
            # Note: These might not show up in StrategyManager receipt
            logger.info(f"\n  Note: Check HedgeExecutor contract for HedgeOrderCreated events")
            
        except Exception as e:
            logger.debug(f"Error parsing events: {e}")
    
    def get_user_positions(self) -> list:
        """Get user's positions"""
        logger.info("\n" + "="*80)
        logger.info("📊 YOUR POSITIONS")
        logger.info("="*80)
        
        try:
            # This requires calling userPositions mapping
            # For simplicity, we'll just note that positions were created
            logger.info(f"User: {self.account.address}")
            logger.info(f"Check contract state for detailed positions")
            
        except Exception as e:
            logger.error(f"Error getting positions: {e}")


async def main():
    """Main test function"""
    # Load environment variables
    load_dotenv()
    
    # Configuration
    RPC_URL = os.getenv('ARBITRUM_RPC_URL', 'https://sepolia-rollup.arbitrum.io/rpc')
    STRATEGY_MANAGER_ADDRESS = os.getenv(
        'STRATEGY_MANAGER_ADDRESS',
        '0xc707d360BEc8048760F028f852cF1E244d155710'  # From deployment
    )
    USDC_ADDRESS = os.getenv(
        'USDC_ADDRESS',
        '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'  # Arbitrum Sepolia USDC
    )
    PRIVATE_KEY = os.getenv('PRIVATE_KEY')
    
    if not PRIVATE_KEY:
        logger.error("❌ PRIVATE_KEY not found in environment variables")
        logger.info("Please set PRIVATE_KEY in your .env file")
        sys.exit(1)
    
    # Initialize test buyer
    logger.info("\n" + "="*80)
    logger.info("🚀 STRATEGY PURCHASE TEST - ARBITRUM SEPOLIA")
    logger.info("="*80)
    
    buyer = StrategyBuyerTest(
        rpc_url=RPC_URL,
        strategy_manager_address=STRATEGY_MANAGER_ADDRESS,
        usdc_address=USDC_ADDRESS,
        private_key=PRIVATE_KEY
    )
    
    # Check balances
    logger.info("\n" + "="*80)
    logger.info("💳 CHECKING BALANCES")
    logger.info("="*80)
    
    eth_balance = buyer.get_eth_balance()
    usdc_balance = buyer.get_usdc_balance()
    usdc_allowance = buyer.get_usdc_allowance()
    
    logger.info(f"ETH Balance: {eth_balance:.6f} ETH")
    logger.info(f"USDC Balance: {usdc_balance:.2f} USDC")
    logger.info(f"USDC Allowance: {usdc_allowance:.2f} USDC")
    
    if eth_balance < 0.001:
        logger.warning("⚠️  Low ETH balance! Get testnet ETH from:")
        logger.warning("   https://www.alchemy.com/faucets/arbitrum-sepolia")
    
    if usdc_balance < 1:
        logger.warning("⚠️  Low USDC balance! Get testnet USDC from:")
        logger.warning("   1. Bridge from Sepolia: https://bridge.arbitrum.io/?destinationChain=arbitrum-sepolia")
        logger.warning("   2. Or use a testnet USDC faucet")
    
    # List available strategies
    strategies = buyer.list_strategies()
    
    if not strategies:
        logger.error("❌ No strategies found!")
        logger.info("Run the Python scanner to create strategies first:")
        logger.info("  cd packages/python/scanner && python run_strategy_scanner.py")
        sys.exit(1)
    
    # Filter active strategies
    active_strategies = [s for s in strategies if s['active'] and not s['settled']]
    
    if not active_strategies:
        logger.error("❌ No active strategies available!")
        sys.exit(1)
    
    # Select first active strategy
    strategy = active_strategies[0]
    strategy_id = strategy['id']
    
    logger.info("\n" + "="*80)
    logger.info(f"🎯 SELECTED STRATEGY: #{strategy_id} - {strategy['name']}")
    logger.info("="*80)
    
    # Amount to invest
    INVEST_AMOUNT = 100.0  # 100 USDC
    
    # Check if we have enough USDC
    if usdc_balance < INVEST_AMOUNT:
        logger.error(f"❌ Insufficient USDC balance!")
        logger.error(f"   Required: {INVEST_AMOUNT} USDC")
        logger.error(f"   Available: {usdc_balance} USDC")
        sys.exit(1)
    
    # Approve USDC if needed
    if usdc_allowance < INVEST_AMOUNT:
        logger.info(f"Need to approve USDC spending...")
        buyer.approve_usdc(INVEST_AMOUNT * 2)  # Approve 2x for future purchases
    else:
        logger.info(f"✅ USDC already approved (allowance: {usdc_allowance} USDC)")
    
    # Buy strategy
    result = buyer.buy_strategy(strategy_id, INVEST_AMOUNT)
    
    if result['success']:
        logger.info("\n" + "="*80)
        logger.info("✅ TEST COMPLETED SUCCESSFULLY!")
        logger.info("="*80)
        logger.info(f"\nTransaction Hash: {result['tx_hash']}")
        logger.info(f"View on Arbiscan:")
        logger.info(f"https://sepolia.arbiscan.io/tx/{result['tx_hash']}")
        
        # Check updated balances
        logger.info("\n" + "="*80)
        logger.info("💳 UPDATED BALANCES")
        logger.info("="*80)
        
        eth_balance_after = buyer.get_eth_balance()
        usdc_balance_after = buyer.get_usdc_balance()
        
        logger.info(f"ETH Balance: {eth_balance_after:.6f} ETH (used {eth_balance - eth_balance_after:.6f} for gas)")
        logger.info(f"USDC Balance: {usdc_balance_after:.2f} USDC (invested {usdc_balance - usdc_balance_after:.2f})")
        
        # Get positions
        buyer.get_user_positions()
        
    else:
        logger.error("\n❌ TEST FAILED!")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

