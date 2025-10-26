"""
Strategy Scanner & Creator

End-to-end system that:
1. Scans Polymarket for inefficient opportunities
2. Calculates optimal GMX hedges
3. Groups opportunities into coherent strategies
4. Deploys strategies to smart contract

This is the main orchestrator that ties everything together.
"""

import os
import sys
import asyncio
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import json
from web3 import Web3
from eth_account import Account

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from inefficiency_detector import InefficiencyDetector
from pricing.theoretical_engine import TheoreticalPricingEngine
from portfolio.position_sizer import KellyPositionSizer
from polymarket_client import PolymarketAPIClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class PolymarketMarketData:
    """Fetches real market data from Polymarket API"""
    
    def __init__(self, api_client: PolymarketAPIClient):
        """
        Initialize Polymarket market data fetcher
        
        Args:
            api_client: PolymarketAPIClient instance for API calls
        """
        self.api_client = api_client
        logger.info("Initialized Polymarket market data fetcher")
    
    async def fetch_active_markets(self, asset: str = "BTC") -> List[Dict]:
        """
        Fetch active crypto price prediction markets from Polymarket with real current prices.
        
        Args:
            asset: Asset to scan (BTC, ETH, etc.)
            
        Returns:
            List of market data dictionaries with real current prices
        """
        try:
            # Fetch markets from Next.js endpoints
            markets = await self.api_client.get_crypto_price_markets_from_nextjs(asset)
            logger.info(f"Fetched {len(markets)} price markets for {asset}")
            
            # Fetch real current price from CoinGecko
            current_price = await self.api_client.get_current_price(asset)
            
            if current_price > 0:
                logger.info(f"✅ Fetched real current price for {asset}: ${current_price:,.2f}")
                
                # Inject real current price into all markets
                for market in markets:
                    market['current_price'] = current_price
                
                logger.info(f"Updated {len(markets)} markets with real current price")
            else:
                logger.warning(f"Could not fetch real price for {asset}, using market midpoint")
            
            return markets
            
        except Exception as e:
            logger.error(f"Error fetching markets: {e}")
            return []
    
    async def get_market_prices(self, market_ids: List[str]) -> Dict[str, float]:
        """
        Get current prices for specific markets
        
        Args:
            market_ids: List of market token IDs
            
        Returns:
            Dictionary of market_id -> current_price
        """
        try:
            prices = {}
            for market_id in market_ids:
                price = await self.api_client.get_market_price(market_id)
                prices[market_id] = price
            return prices
        except Exception as e:
            logger.error(f"Error fetching market prices: {e}")
            return {}


class HedgeCalculator:
    """Calculates optimal GMX hedges for identified opportunities"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def calculate_hedge(
        self,
        opportunity: Dict,
        polymarket_allocation: float
    ) -> Dict:
        """
        Calculate GMX hedge position for a Polymarket opportunity
        
        The hedge should neutralize the risk from the Polymarket bet:
        - If betting YES (bullish): SHORT the asset
        - If betting NO (bearish): LONG the asset
        
        But since we're trying to capture spread between two markets,
        we typically SHORT to hedge long Polymarket exposure.
        
        Args:
            opportunity: Market opportunity with edge calculation
            polymarket_allocation: Portion of capital going to Polymarket (as fraction)
            
        Returns:
            Hedge order configuration
        """
        asset = opportunity['asset']
        recommendation = opportunity['recommendation']
        edge_pct = opportunity['edge_percentage']
        
        # Determine hedge direction based on Polymarket bet
        # For YES bets (long exposure): SHORT to hedge
        # For NO bets (short exposure): LONG to hedge (but less common)
        
        if recommendation == "BET_YES":
            # Betting YES (bullish) → SHORT hedge to neutralize upside risk
            is_long = False
            hedge_direction = "SHORT"
        else:  # BET_NO
            # Betting NO (bearish) → LONG hedge to neutralize downside risk  
            is_long = True
            hedge_direction = "LONG"
        
        # Hedge allocation: typically 50-70% of Polymarket allocation
        # More conservative with partial hedge to allow some upside
        hedge_allocation_pct = min(
            0.6,  # 60% hedge of the Polymarket position
            0.3   # But cap at 30% of total strategy capital
        )
        
        return {
            'asset': asset,
            'isLong': is_long,
            'direction': hedge_direction,
            'allocation_pct': hedge_allocation_pct,
            'rationale': f"{hedge_direction} {asset} to hedge {recommendation} bet (edge: {edge_pct:.1f}%)",
            'opportunity_edge': edge_pct
        }
    
    def build_hedge_orders(
        self,
        opportunities: List[Dict],
        net_amount_usdc: float
    ) -> Tuple[List[Dict], float]:
        """
        Build complete hedge orders for a strategy
        
        Args:
            opportunities: List of selected opportunities
            net_amount_usdc: Total capital available (after fees)
            
        Returns:
            Tuple of (hedge_orders_list, total_hedge_allocation)
        """
        hedge_orders = []
        total_hedge_allocation = 0
        
        for opp in opportunities:
            # Calculate Polymarket allocation for this opportunity
            notional_bps = opp.get('notional_bps', 5000)
            polymarket_allocation = (net_amount_usdc * notional_bps) / 10_000
            
            # Calculate hedge
            hedge = self.calculate_hedge(opp, polymarket_allocation)
            
            # Calculate hedge amount (allocation % of Polymarket position)
            hedge_amount_usdc = polymarket_allocation * hedge['allocation_pct']
            total_hedge_allocation += hedge_amount_usdc
            
            hedge_orders.append({
                'asset': hedge['asset'],
                'isLong': hedge['isLong'],
                'amount': int(hedge_amount_usdc * 1_000_000),  # Convert to USDC 6 decimals
                'maxSlippageBps': 500,  # 5% slippage tolerance
                'rationale': hedge['rationale']
            })
            
            self.logger.info(
                f"Hedge Order: SHORT {hedge_amount_usdc:.2f} USDC of {hedge['asset']} "
                f"(hedge for {opp['edge_percentage']:.1f}% edge opportunity)"
            )
        
        return hedge_orders, total_hedge_allocation


class StrategyGrouper:
    """Groups opportunities into coherent strategies"""
    
    def __init__(self, min_opportunities: int = 1, max_opportunities: int = 4):
        """
        Initialize strategy grouper
        
        Args:
            min_opportunities: Minimum opportunities to form a strategy
            max_opportunities: Maximum opportunities per strategy
        """
        self.min_opportunities = min_opportunities
        self.max_opportunities = max_opportunities
        self.logger = logging.getLogger(__name__)
    
    def group_opportunities(
        self,
        opportunities_df
    ) -> List[List[Dict]]:
        """
        Group opportunities into strategies
        
        Grouping logic:
        1. Same asset (BTC, ETH, etc.)
        2. Same maturity date (within 1 day tolerance)
        3. Mix of YES/NO for hedging effectiveness
        4. Max 4 opportunities per strategy
        
        Args:
            opportunities_df: DataFrame of all opportunities
            
        Returns:
            List of opportunity groups (each is a strategy)
        """
        if opportunities_df.empty:
            return []
        
        strategies = []
        processed = set()
        
        for idx, row in opportunities_df.iterrows():
            if idx in processed:
                continue
            
            # Start new strategy with this opportunity
            strategy_group = [row.to_dict()]
            processed.add(idx)
            
            asset = row['asset']
            maturity = row.get('maturity_date', None)
            
            # Parse maturity date if it's a string
            if isinstance(maturity, str):
                try:
                    maturity = datetime.fromisoformat(maturity.replace('Z', '+00:00'))
                except Exception:
                    maturity = None
            
            # If no maturity, use current UTC time (timezone-aware)
            if maturity is None:
                maturity = datetime.now(datetime.now().astimezone().tzinfo)
            
            # Find complementary opportunities
            for idx2, row2 in opportunities_df.iterrows():
                if idx2 in processed:
                    continue
                
                # Check if compatible
                if row2['asset'] != asset:
                    continue
                
                # Check maturity compatibility (within 1 day)
                maturity2 = row2.get('maturity_date', None)
                
                # Parse maturity2 date if it's a string
                if isinstance(maturity2, str):
                    try:
                        maturity2 = datetime.fromisoformat(maturity2.replace('Z', '+00:00'))
                    except Exception:
                        maturity2 = None
                
                # If no maturity2, use current UTC time (timezone-aware)
                if maturity2 is None:
                    maturity2 = datetime.now(datetime.now().astimezone().tzinfo)
                
                if abs((maturity - maturity2).days) > 1:
                    continue
                
                # Check if mixing YES/NO (better for hedging)
                current_recommendations = [o['recommendation'] for o in strategy_group]
                new_recommendation = row2['recommendation']
                
                # Prefer mixed YES/NO strategies
                has_yes = 'BET_YES' in current_recommendations
                has_no = 'BET_NO' in current_recommendations
                
                if not (has_yes and has_no) and new_recommendation not in current_recommendations:
                    # Add this opportunity
                    strategy_group.append(row2.to_dict())
                    processed.add(idx2)
                
                if len(strategy_group) >= self.max_opportunities:
                    break
            
            # Only add if meets minimum
            if len(strategy_group) >= self.min_opportunities:
                strategies.append(strategy_group)
                self.logger.info(
                    f"Formed strategy with {len(strategy_group)} opportunities "
                    f"({asset}, total edge: {sum(o['edge_percentage'] for o in strategy_group):.1f}%)"
                )
        
        return strategies


class StrategyConstructor:
    """Constructs complete strategy definitions for smart contract deployment"""
    
    def __init__(self, hedge_calculator: HedgeCalculator):
        self.hedge_calculator = hedge_calculator
        self.logger = logging.getLogger(__name__)
    
    def construct_strategy(
        self,
        opportunity_group: List[Dict],
        strategy_id: int,
        net_amount_usdc: float,
        fee_bps: int = 200,
        maturity_days: int = 30
    ) -> Dict:
        """
        Construct complete strategy for smart contract
        
        Args:
            opportunity_group: List of grouped opportunities
            strategy_id: Unique strategy ID
            net_amount_usdc: Capital available (after fees)
            fee_bps: Platform fee in basis points
            maturity_days: Days until strategy maturity
            
        Returns:
            Complete strategy definition ready for deployment
        """
        # Generate strategy name
        assets = list(set(o['asset'] for o in opportunity_group))
        recommendations = list(set(o['recommendation'] for o in opportunity_group))
        
        asset_str = "/".join(assets)
        if len(recommendations) > 1:
            name = f"{asset_str} Price Hedge - Mixed"
        else:
            name = f"{asset_str} Price Strategy - {recommendations[0].replace('BET_', '')}"
        
        # Build Polymarket orders
        polymarket_orders = []
        total_notional_bps = 0
        
        for idx, opp in enumerate(opportunity_group):
            # Allocate based on edge size (stronger edges get more)
            abs_edge = abs(opp['edge_percentage'])
            # Normalize allocation
            notional_bps = min(
                int((abs_edge / 100) * 10_000),  # Convert edge % to bps
                5000  # Cap at 50% per order
            )
            total_notional_bps += notional_bps
            
            polymarket_orders.append({
                'marketId': opp['market_id'],
                'isYes': opp['recommendation'] == 'BET_YES',
                'notionalBps': notional_bps,
                'maxPriceBps': int(opp['market_price'] * 10_000 * 1.25),  # 25% premium
                'priority': idx + 1
            })
        
        # Build hedge orders
        hedge_orders, _ = self.hedge_calculator.build_hedge_orders(
            opportunity_group,
            net_amount_usdc
        )
        
        # Calculate expected profit
        avg_edge = sum(o['edge_percentage'] for o in opportunity_group) / len(opportunity_group)
        expected_profit_bps = int(min(avg_edge * 100, 10_000))  # Cap at 100%
        
        # Calculate maturity timestamp
        maturity_ts = int((datetime.now() + timedelta(days=maturity_days)).timestamp())
        
        strategy_def = {
            'id': strategy_id,
            'name': name,
            'feeBps': fee_bps,
            'maturityTs': maturity_ts,
            'polymarketOrders': polymarket_orders,
            'hedgeOrders': hedge_orders,
            'expectedProfitBps': expected_profit_bps,
            'totalNotionalBps': total_notional_bps,
            'opportunityCount': len(opportunity_group),
            'avgEdge': avg_edge
        }
        
        self.logger.info(
            f"Constructed strategy '{name}': "
            f"{len(polymarket_orders)} Polymarket orders, "
            f"{len(hedge_orders)} hedge orders, "
            f"Expected profit: {expected_profit_bps/100:.1f}%"
        )
        
        return strategy_def


class SmartContractDeployer:
    """Deploys strategies to smart contract via createStrategy()"""
    
    def __init__(
        self,
        rpc_url: str,
        private_key: str,
        strategy_manager_abi: Dict,
        strategy_manager_address: str
    ):
        """
        Initialize contract deployer
        
        Args:
            rpc_url: Arbitrum RPC URL
            private_key: Private key for transaction signing
            strategy_manager_abi: Contract ABI
            strategy_manager_address: StrategyManager contract address
        """
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.account = Account.from_key(private_key)
        self.contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(strategy_manager_address),
            abi=strategy_manager_abi
        )
        self.logger = logging.getLogger(__name__)
    
    async def deploy_strategy(self, strategy_def: Dict) -> str:
        """
        Deploy strategy to smart contract
        
        Calls createStrategy() with all strategy parameters
        
        Args:
            strategy_def: Complete strategy definition
            
        Returns:
            Transaction hash
        """
        try:
            # Build transaction
            tx_dict = self.contract.functions.createStrategy(
                strategy_def['name'],
                strategy_def['feeBps'],
                strategy_def['maturityTs'],
                strategy_def['polymarketOrders'],
                strategy_def['hedgeOrders'],
                strategy_def['expectedProfitBps']
            ).build_transaction({
                'from': self.account.address,
                'nonce': self.w3.eth.get_transaction_count(self.account.address),
                'gas': 500_000,
                'gasPrice': self.w3.eth.gas_price,
            })
            
            # Sign and send
            signed_tx = self.w3.eth.account.sign_transaction(tx_dict, self.account.key)
            # Handle both old and new web3.py API
            try:
                raw_tx = signed_tx['rawTransaction']
            except (TypeError, KeyError):
                raw_tx = signed_tx.rawTransaction
            tx_hash = self.w3.eth.send_raw_transaction(raw_tx)
            
            self.logger.info(f"Deployed strategy: {tx_hash.hex()}")
            
            # Wait for receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)
            self.logger.info(f"Strategy deployment confirmed in block {receipt['blockNumber']}")
            
            return tx_hash.hex()
            
        except Exception as e:
            self.logger.error(f"Error deploying strategy: {e}")
            raise


class StrategyScanner:
    """Main orchestrator - ties all components together"""
    
    def __init__(
        self,
        polymarket_api_key: str,
        polymarket_api_secret: str,
        arbitrum_rpc: str,
        strategy_manager_address: str,
        strategy_manager_abi: Dict,
        private_key: str
    ):
        """
        Initialize strategy scanner
        
        Args:
            polymarket_api_key: API key for Polymarket
            polymarket_api_secret: API secret for Polymarket
            arbitrum_rpc: Arbitrum RPC URL
            strategy_manager_address: StrategyManager address
            strategy_manager_abi: Contract ABI
            private_key: Private key for deployments
        """
        # Initialize components
        self.polymarket_client = PolymarketAPIClient(
            api_key=polymarket_api_key,
            api_secret=polymarket_api_secret
        )
        self.market_data = PolymarketMarketData(self.polymarket_client)
        self.pricing_engine = TheoreticalPricingEngine()
        self.inefficiency_detector = InefficiencyDetector(min_edge_threshold=0.10)
        self.position_sizer = KellyPositionSizer(kelly_fraction=0.25, max_position_size=0.40)
        self.hedge_calculator = HedgeCalculator()
        self.strategy_grouper = StrategyGrouper(min_opportunities=1, max_opportunities=4)
        self.strategy_constructor = StrategyConstructor(self.hedge_calculator)
        self.contract_deployer = SmartContractDeployer(
            rpc_url=arbitrum_rpc,
            private_key=private_key,
            strategy_manager_abi=strategy_manager_abi,
            strategy_manager_address=strategy_manager_address
        )
        self.logger = logging.getLogger(__name__)
    
    async def scan_and_deploy(
        self,
        assets: List[str] = None,
        mock_data: bool = False
    ) -> List[Dict]:
        """
        Main scanning and deployment loop
        
        Args:
            assets: List of assets to scan (default: BTC, ETH)
            mock_data: Use mock client instead of real API
            
        Returns:
            List of deployed strategies
        """
        assets = assets or ['BTC', 'ETH']
        deployed_strategies = []
        
        self.logger.info(f"Starting strategy scanning for assets: {assets}")
        
        # Use mock client if requested, otherwise use real API
        if mock_data:
            from polymarket_client import MockPolymarketAPIClient
            self.market_data = PolymarketMarketData(MockPolymarketAPIClient())
            self.logger.warning("⚠️  Using MOCK market data (no real API calls)")
        
        for asset in assets:
            self.logger.info(f"\n{'='*60}")
            self.logger.info(f"Scanning {asset} markets...")
            self.logger.info(f"{'='*60}")
            
            try:
                # Step 1: Fetch markets from Polymarket API (no hardcoding!)
                markets = await self.market_data.fetch_active_markets(asset)
                
                if not markets:
                    self.logger.warning(f"No markets found for {asset}")
                    continue
                
                self.logger.info(f"✅ Fetched {len(markets)} {asset} markets from Polymarket API")
                
                # Step 2: Price markets and detect inefficiencies
                self.logger.info(f"Analyzing {len(markets)} {asset} markets for inefficiencies...")
                
                markets_analysis = self.pricing_engine.batch_price_markets(markets)
                opportunities_df = self.inefficiency_detector.scan_markets(
                    markets_analysis
                )
                
                if opportunities_df.empty:
                    self.logger.info(f"No inefficient opportunities found for {asset}")
                    continue
                
                opportunities = self.inefficiency_detector.get_opportunities(opportunities_df)
                summary = self.inefficiency_detector.generate_summary(opportunities)
                
                self.logger.info(f"\n📊 Opportunity Summary for {asset}:")
                for category, stats in summary.items():
                    if stats['count'] > 0:
                        self.logger.info(
                            f"  {category}: {stats['count']} opportunities, "
                            f"avg edge: {stats['avg_edge']:.1f}%"
                        )
                
                # Step 3: Group opportunities into strategies
                opportunity_groups = self.strategy_grouper.group_opportunities(
                    opportunities_df
                )
                self.logger.info(f"\n✅ Formed {len(opportunity_groups)} strategy groups")
                
                # Step 4: Construct and deploy strategies
                net_amount_usdc = 1000  # Default for strategy construction
                strategy_id_start = 1
                
                for group_idx, opportunity_group in enumerate(opportunity_groups):
                    strategy_id = strategy_id_start + group_idx
                    
                    self.logger.info(f"\n🏗️  Constructing strategy {strategy_id}...")
                    
                    strategy_def = self.strategy_constructor.construct_strategy(
                        opportunity_group,
                        strategy_id,
                        net_amount_usdc
                    )
                    
                    # Deploy to contract
                    self.logger.info(f"📤 Deploying strategy {strategy_id} to smart contract...")
                    
                    try:
                        tx_hash = await self.contract_deployer.deploy_strategy(strategy_def)
                        strategy_def['txHash'] = tx_hash
                        deployed_strategies.append(strategy_def)
                        
                    except Exception as e:
                        self.logger.error(f"Failed to deploy strategy: {e}")
                        continue
            
            except Exception as e:
                self.logger.error(f"Error scanning {asset}: {e}", exc_info=True)
                continue
        
        self.logger.info(f"\n{'='*60}")
        self.logger.info(f"✅ Scanning complete. Deployed {len(deployed_strategies)} strategies")
        self.logger.info(f"{'='*60}")
        
        return deployed_strategies


# Example usage
if __name__ == "__main__":
    # Load environment variables
    polymarket_api_key = os.getenv('POLYMARKET_API_KEY', '')
    polymarket_api_secret = os.getenv('POLYMARKET_API_SECRET', '')
    arbitrum_rpc = os.getenv('ARBITRUM_RPC_URL', 'http://localhost:8545')
    strategy_manager_address = os.getenv(
        'STRATEGY_MANAGER_ADDRESS',
        '0x0000000000000000000000000000000000000000'
    )
    private_key = os.getenv('PRIVATE_KEY', '0x' + '0'*64)
    
    # Load contract ABI (placeholder)
    strategy_manager_abi = []
    
    # Initialize scanner
    scanner = StrategyScanner(
        polymarket_api_key=polymarket_api_key,
        polymarket_api_secret=polymarket_api_secret,
        arbitrum_rpc=arbitrum_rpc,
        strategy_manager_address=strategy_manager_address,
        strategy_manager_abi=strategy_manager_abi,
        private_key=private_key
    )
    
    # Run with mock data for testing
    asyncio.run(scanner.scan_and_deploy(assets=['BTC'], mock_data=True))
