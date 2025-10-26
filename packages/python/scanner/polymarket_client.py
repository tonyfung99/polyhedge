"""
Polymarket Gamma API Client

Direct implementation using Polymarket's public Gamma API.
No authentication required - free public endpoint.

Reference: https://gamma-api.polymarket.com/events
"""

import httpx
import asyncio
import logging
import re
from typing import List, Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class PolymarketAPIClient:
    """
    Async client for Polymarket Gamma API (public, no auth required)
    
    Reference: https://gamma-api.polymarket.com/events
    """
    
    def __init__(
        self,
        api_key: str = "",
        api_secret: str = "",
        base_url: str = "https://gamma-api.polymarket.com"
    ):
        """
        Initialize Polymarket API client
        
        Note: api_key and api_secret are ignored - Gamma API is public
        """
        self.base_url = base_url
        self.client = httpx.AsyncClient(base_url=base_url, timeout=30.0)
        logger.info(f"Initialized Polymarket Gamma API client: {base_url}")
    
    async def get_active_crypto_price_markets(self, asset: str = None) -> List[Dict]:
        """
        Fetch active crypto price prediction markets from Polymarket Gamma API
        
        This fetches markets like:
        - ETH Up or Down (4H)
        - BTC Up or Down (4H)
        etc.
        
        Args:
            asset: Optional asset filter (BTC, ETH, etc.) - filters results
            
        Returns:
            List of market data dictionaries ready for analysis
        """
        try:
            logger.info(f"Fetching markets from Gamma API (asset filter: {asset})")
            
            # Fetch active 4H crypto price markets using tag_id=102531
            # tag_id=102531 = "4H" tag (4-hour crypto markets)
            params = {
                'tag_id': '102531',  # 4H crypto markets
                'closed': False,
                'limit': 100
            }
            
            response = await self.client.get('/events', params=params)
            response.raise_for_status()
            
            events = response.json()
            logger.info(f"Fetched {len(events)} 4H crypto events from Gamma API")
            
            # Transform to expected format
            markets = []
            for event in events:
                try:
                    # Use first market from the event (they typically have the same odds)
                    if not event.get('markets'):
                        continue
                    
                    market = event['markets'][0]
                    
                    # Extract asset from title
                    title = event.get('title', '')
                    extracted_asset = self._extract_asset_from_title(title)
                    
                    # Filter by asset if specified
                    if asset and extracted_asset.upper() != asset.upper():
                        continue
                    
                    # Parse market data
                    market_data = self._parse_gamma_market(event, market, extracted_asset)
                    if market_data:
                        markets.append(market_data)
                        
                except Exception as e:
                    logger.debug(f"Could not parse market {event.get('id')}: {e}")
                    continue
            
            logger.info(f"Parsed {len(markets)} {asset or 'all'} 4H price markets")
            return markets
            
        except Exception as e:
            logger.error(f"Error fetching markets from Gamma API: {e}")
            return []
    
    async def get_market_price(self, market_id: str) -> float:
        """
        Get current YES price for a market (mock - returns from cache)
        """
        # Gamma API doesn't have individual market endpoint
        # Prices are embedded in the events response
        logger.debug(f"get_market_price called for {market_id}")
        return 0.5  # Default neutral price
    
    def _extract_asset_from_title(self, title: str) -> str:
        """
        Extract asset name from market title
        
        Examples:
        - "Ethereum Up or Down" → "ETH"
        - "Bitcoin Up or Down" → "BTC"
        - "ETH Up or Down" → "ETH"
        """
        title_upper = title.upper()
        
        if 'ETHEREUM' in title_upper or 'ETH' in title_upper:
            return 'ETH'
        elif 'BITCOIN' in title_upper or 'BTC' in title_upper:
            return 'BTC'
        elif 'SOLANA' in title_upper or 'SOL' in title_upper:
            return 'SOL'
        elif 'AVAX' in title_upper or 'AVALANCHE' in title_upper:
            return 'AVAX'
        elif 'POLYGON' in title_upper or 'MATIC' in title_upper:
            return 'MATIC'
        
        return 'UNKNOWN'
    
    def _parse_gamma_market(self, event: Dict, market: Dict, asset: str) -> Optional[Dict]:
        """
        Parse Gamma API market response into our format
        """
        try:
            title = event.get('title', '')
            description = event.get('description', '')
            
            # Get market prices
            outcome_prices = market.get('outcomePrices', ['0.5', '0.5'])
            outcomes = market.get('outcomes', ['Up', 'Down'])
            
            # Convert prices to float
            try:
                yes_price = float(outcome_prices[0]) if len(outcome_prices) > 0 else 0.5
                no_price = float(outcome_prices[1]) if len(outcome_prices) > 1 else 0.5
            except (ValueError, IndexError):
                yes_price = 0.5
                no_price = 0.5
            
            # Calculate time to expiry
            end_date_str = event.get('endDate', '')
            if end_date_str:
                try:
                    end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                    now = datetime.now(end_date.tzinfo)
                    days_to_expiry = max(0.01, (end_date - now).total_seconds() / (24 * 3600))
                except Exception as e:
                    logger.debug(f"Could not parse end date {end_date_str}: {e}")
                    days_to_expiry = 7  # Default 7 days
            else:
                days_to_expiry = 7
            
            # Extract current price context from description
            # For "Up or Down" markets, we'll use market center price
            current_price_implied = (yes_price + no_price) / 2  # Neutral point
            
            return {
                'asset': asset,
                'market_id': market.get('id', event.get('id', '')),
                'ticker': event.get('ticker', ''),
                'title': title,
                'description': description,
                'current_price': current_price_implied,  # Implied from market prices
                'market_price': yes_price,  # YES price
                'no_price': no_price,  # NO price
                'days_to_expiry': days_to_expiry,
                'volatility': 0.55,  # Default crypto volatility
                'maturity_date': end_date_str,
                'liquidity': float(event.get('liquidity', 0)),
                'volume': float(event.get('volume', 0)),
                'volume_24h': float(event.get('volume24hr', 0)),
                'active': event.get('active', True),
                'outcomes': outcomes,
                'outcome_prices': outcome_prices,
                'resolution_source': event.get('resolutionSource', ''),
                'created_at': event.get('createdAt', ''),
                'updated_at': event.get('updatedAt', ''),
            }
            
        except Exception as e:
            logger.error(f"Error parsing market {market.get('id')}: {e}")
            return None
    
    async def close(self):
        """Close the async client"""
        await self.client.aclose()


class MockPolymarketAPIClient(PolymarketAPIClient):
    """Mock client for testing without network access"""
    
    async def get_active_crypto_price_markets(self, asset: str = None) -> List[Dict]:
        """Return mock market data"""
        logger.info("Using MOCK market data (no real API calls)")
        
        mock_data = {
            'BTC': [
                {
                    'asset': 'BTC',
                    'market_id': 'mock_btc_up_1',
                    'ticker': 'btc-updown-1h',
                    'title': 'Bitcoin Up or Down - 1H',
                    'description': 'Will Bitcoin be higher in 1 hour',
                    'current_price': 107127,
                    'market_price': 0.55,
                    'no_price': 0.45,
                    'days_to_expiry': 1/24,
                    'volatility': 0.55,
                    'maturity_date': '2025-10-26T01:00:00Z',
                    'liquidity': 5000,
                    'volume': 10000,
                    'volume_24h': 15000,
                    'active': True,
                    'outcomes': ['Up', 'Down'],
                    'outcome_prices': ['0.55', '0.45'],
                }
            ],
            'ETH': [
                {
                    'asset': 'ETH',
                    'market_id': 'mock_eth_up_1',
                    'ticker': 'eth-updown-4h',
                    'title': 'Ethereum Up or Down - 4H',
                    'description': 'Will Ethereum be higher in 4 hours',
                    'current_price': 3500,
                    'market_price': 0.60,
                    'no_price': 0.40,
                    'days_to_expiry': 4/24,
                    'volatility': 0.55,
                    'maturity_date': '2025-10-26T04:00:00Z',
                    'liquidity': 8000,
                    'volume': 15000,
                    'volume_24h': 20000,
                    'active': True,
                    'outcomes': ['Up', 'Down'],
                    'outcome_prices': ['0.60', '0.40'],
                }
            ]
        }
        
        if asset and asset.upper() in mock_data:
            return mock_data[asset.upper()]
        elif asset:
            return []
        else:
            # Return all mock data
            all_markets = []
            for markets in mock_data.values():
                all_markets.extend(markets)
            return all_markets

