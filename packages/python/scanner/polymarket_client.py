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
    
    # Supported assets and their CoinGecko IDs
    ASSET_TO_COINGECKO_ID = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'SOL': 'solana',
        'XRP': 'ripple',
        'DOGE': 'dogecoin',
        'AVAX': 'avalanche-2',
        'MATIC': 'matic-network',
        'ARB': 'arbitrum',
    }
    
    def __init__(
        self,
        api_key: str = "",
        api_secret: str = "",
        base_url: str = "https://gamma-api.polymarket.com",
        coingecko_url: str = "https://api.coingecko.com/api/v3"
    ):
        """
        Initialize Polymarket API client with CoinGecko for price data
        
        Args:
            api_key: Ignored - Gamma API is public
            api_secret: Ignored - Gamma API is public
            base_url: Polymarket Gamma API endpoint
            coingecko_url: CoinGecko API endpoint (public, no auth)
        """
        self.base_url = base_url
        self.coingecko_url = coingecko_url
        self.client = httpx.AsyncClient(timeout=30.0)
        logger.info(f"Initialized Polymarket API client: {base_url}")
        logger.info(f"Initialized CoinGecko price API: {coingecko_url}")
    
    async def get_current_prices(self, assets: List[str] = None) -> Dict[str, float]:
        """
        Fetch current prices for specified assets from CoinGecko.
        
        CoinGecko is a free, no-auth-required public API with:
        - Real-time prices from 1000+ exchanges
        - 14-day free tier with ~50 calls/minute
        - Perfect for limited set of assets
        
        Args:
            assets: List of asset symbols (BTC, ETH, SOL, etc.)
                   If None, fetches all supported assets
            
        Returns:
            Dict mapping asset symbol to USD price
            Example: {'BTC': 107127.45, 'ETH': 3542.89}
        """
        try:
            if not assets:
                assets = list(self.ASSET_TO_COINGECKO_ID.keys())
            
            # Filter to only supported assets
            supported_assets = [a for a in assets if a in self.ASSET_TO_COINGECKO_ID]
            
            if not supported_assets:
                logger.warning(f"No supported assets found in: {assets}")
                return {}
            
            # Build CoinGecko IDs list
            coingecko_ids = [self.ASSET_TO_COINGECKO_ID[asset] for asset in supported_assets]
            
            logger.info(f"Fetching prices from CoinGecko for: {supported_assets}")
            
            # CoinGecko simple/price endpoint
            params = {
                'ids': ','.join(coingecko_ids),
                'vs_currencies': 'usd'
            }
            
            response = await self.client.get(
                f"{self.coingecko_url}/simple/price",
                params=params
            )
            response.raise_for_status()
            
            data = response.json()
            
            # Map back to asset symbols
            prices = {}
            for asset in supported_assets:
                coingecko_id = self.ASSET_TO_COINGECKO_ID[asset]
                if coingecko_id in data and 'usd' in data[coingecko_id]:
                    prices[asset] = data[coingecko_id]['usd']
                    logger.info(f"  {asset}: ${prices[asset]:,.2f}")
            
            logger.info(f"✅ Fetched {len(prices)} asset prices from CoinGecko")
            return prices
            
        except Exception as e:
            logger.error(f"Error fetching prices from CoinGecko: {e}")
            return {}
    
    async def get_current_price(self, asset: str) -> float:
        """
        Fetch current price for a single asset.
        
        Args:
            asset: Asset symbol (BTC, ETH, etc.)
            
        Returns:
            Current USD price, or 0.0 if not found
        """
        prices = await self.get_current_prices([asset])
        return prices.get(asset, 0.0)
    
    # Hardcoded event paths from Polymarket Next.js data endpoints
    # Format: https://polymarket.com/_next/data/{BUILD_ID}/event/{event_slug}.json?slug={event_slug}
    CRYPTO_PRICE_EVENTS = {
        'BTC': {
            'slug': 'what-price-will-bitcoin-hit-in-2025',
            'title': 'What price will Bitcoin hit in 2025?',
            'fallback_path': 'https://polymarket.com/_next/data/BccF6SMeriM3v_DhHF7_H/event/what-price-will-bitcoin-hit-in-2025.json?slug=what-price-will-bitcoin-hit-in-2025',
        },
        'ETH': {
            'slug': 'what-price-will-ethereum-hit-in-2025',
            'title': 'What price will Ethereum hit in 2025?',
            'fallback_path': 'https://polymarket.com/_next/data/BccF6SMeriM3v_DhHF7_H/event/what-price-will-ethereum-hit-in-2025.json?slug=what-price-will-ethereum-hit-in-2025',
        },
    }
    
    async def get_crypto_price_markets_from_nextjs(self, asset: str = None, use_local: bool = False, local_data: Dict = None) -> List[Dict]:
        """
        Fetch crypto price markets from Polymarket Next.js data endpoints.
        
        This approach:
        1. Uses hardcoded event paths for specific assets (BTC, ETH)
        2. Fetches from Polymarket's Next.js data endpoints
        3. Can optionally use local cached data instead of API calls
        
        Args:
            asset: Asset filter (BTC, ETH, etc.)
            use_local: If True, use local_data instead of API calls
            local_data: Local JSON data to parse (for offline testing)
            
        Returns:
            List of market data dictionaries with explicit target prices
        """
        try:
            if use_local and local_data:
                logger.info(f"Using LOCAL data for {asset}")
                return self._parse_nextjs_event_data(local_data, asset)
            
            markets = []
            assets_to_fetch = [asset.upper()] if asset else list(self.CRYPTO_PRICE_EVENTS.keys())
            
            for fetch_asset in assets_to_fetch:
                if fetch_asset not in self.CRYPTO_PRICE_EVENTS:
                    logger.warning(f"No hardcoded path for {fetch_asset}")
                    continue
                
                logger.info(f"Fetching {fetch_asset} price markets from Polymarket Next.js endpoint...")
                event_config = self.CRYPTO_PRICE_EVENTS[fetch_asset]
                
                try:
                    # Try to fetch from Next.js data endpoint
                    response = await self.client.get(
                        event_config['fallback_path'],
                        follow_redirects=True
                    )
                    response.raise_for_status()
                    
                    data = response.json()
                    asset_markets = self._parse_nextjs_event_data(data, fetch_asset)
                    markets.extend(asset_markets)
                    logger.info(f"✅ Fetched {len(asset_markets)} {fetch_asset} price markets")
                    
                except Exception as e:
                    logger.warning(f"Could not fetch {fetch_asset} from Next.js endpoint: {e}")
                    continue
            
            return markets
            
        except Exception as e:
            logger.error(f"Error fetching crypto price markets from Next.js: {e}")
            return []
    
    def _parse_nextjs_event_data(self, data: Dict, asset: str) -> List[Dict]:
        """
        Parse Polymarket Next.js event data into our format.
        
        Extracts individual markets from the event data and creates
        market dictionaries with explicit price targets.
        
        Args:
            data: JSON response from Next.js endpoint
            asset: Asset symbol (BTC, ETH)
            
        Returns:
            List of parsed market data dictionaries
        """
        markets = []
        
        try:
            # Navigate the Next.js data structure
            # data -> pageProps -> dehydratedState -> queries
            page_props = data.get('pageProps', {})
            dehydrated_state = page_props.get('dehydratedState', {})
            queries = dehydrated_state.get('queries', [])
            
            # Find the markets data in queries
            for query in queries:
                query_state = query.get('state', {})
                query_data = query_state.get('data', [])
                
                # query_data contains list of individual markets
                if isinstance(query_data, list):
                    for market_item in query_data:
                        if not isinstance(market_item, dict):
                            continue
                        
                        try:
                            # Extract price target from title
                            title = market_item.get('title', '')
                            question = market_item.get('question', title)
                            
                            target_price = self._extract_target_price_from_question(question, asset)
                            
                            if target_price is None:
                                # Also try to extract from description
                                description = market_item.get('description', '')
                                target_price = self._extract_target_price_from_question(description, asset)
                            
                            if target_price is None:
                                logger.debug(f"Could not extract price from: {title}")
                                continue
                            
                            # Parse market data
                            outcome_prices = market_item.get('outcomePrices', '["0.5", "0.5"]')
                            if isinstance(outcome_prices, str):
                                import json
                                outcome_prices = json.loads(outcome_prices)
                            
                            try:
                                yes_price = float(outcome_prices[0]) if len(outcome_prices) > 0 else 0.5
                                no_price = float(outcome_prices[1]) if len(outcome_prices) > 1 else 0.5
                            except (ValueError, IndexError, TypeError):
                                yes_price = 0.5
                                no_price = 0.5
                            
                            # Calculate expiry
                            end_date_str = market_item.get('endDate', '') or market_item.get('endDateIso', '')
                            if end_date_str:
                                try:
                                    if 'T' not in end_date_str:
                                        end_date_str = f"{end_date_str}T00:00:00Z"
                                    end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                                    now = datetime.now(end_date.tzinfo)
                                    days_to_expiry = max(0.01, (end_date - now).total_seconds() / (24 * 3600))
                                except Exception as e:
                                    logger.debug(f"Could not parse end date {end_date_str}: {e}")
                                    days_to_expiry = 365  # Default 1 year for crypto price markets
                            else:
                                days_to_expiry = 365
                            
                            # NOTE: current_price will be set by caller using CoinGecko API
                            # This is a placeholder; the actual current asset price should be:
                            # current_price = await get_current_price(asset)
                            # For now, use market midpoint as fallback
                            market_midpoint = (yes_price + no_price) / 2
                            
                            market_data = {
                                'asset': asset,
                                'market_id': market_item.get('id', market_item.get('slug', '')),
                                'slug': market_item.get('slug', ''),
                                'title': title,
                                'question': question,
                                'description': market_item.get('description', ''),
                                'current_price': market_midpoint,  # ⚠️  PLACEHOLDER: Will be updated with real price
                                'target_price': target_price,
                                'market_price': yes_price,  # YES/NO derivative price
                                'no_price': no_price,
                                'days_to_expiry': days_to_expiry,
                                'volatility': 0.55,
                                'maturity_date': end_date_str,
                                'liquidity': float(market_item.get('liquidity', 0)),
                                'volume': float(market_item.get('volume', 0)),
                                'active': market_item.get('active', True),
                                'outcomes': market_item.get('outcomes', '["Yes", "No"]'),
                                'outcome_prices': outcome_prices,
                                'market_type': 'yearly_price',
                            }
                            
                            markets.append(market_data)
                            logger.debug(f"Parsed market: {title[:50]}... → target: ${target_price}")
                            
                        except Exception as e:
                            logger.debug(f"Error parsing individual market: {e}")
                            continue
            
            return markets
            
        except Exception as e:
            logger.error(f"Error parsing Next.js event data: {e}")
            return []
    
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
    
    async def get_monthly_crypto_price_markets(self, asset: str = None) -> List[Dict]:
        """
        Fetch monthly crypto price prediction markets from Polymarket Gamma API.
        
        Filters by:
        1. Crypto-related title (BTC, ETH, etc.)
        2. Price prediction language ("price", "reach", "hit", "$")
        3. Duration ~25-35 days (monthly)
        
        Args:
            asset: Optional asset filter (BTC, ETH, etc.)
            
        Returns:
            List of market data dictionaries with explicit target prices
        """
        try:
            logger.info(f"Fetching monthly crypto markets from Gamma API (asset filter: {asset})")
            
            # Fetch all active events (no tag filter needed - we'll filter by duration)
            params = {
                'closed': False,
                'limit': 100
            }
            
            response = await self.client.get('/events', params=params)
            response.raise_for_status()
            
            events = response.json()
            logger.info(f"Fetched {len(events)} total events from Gamma API")
            
            # Transform to expected format
            markets = []
            for event in events:
                try:
                    # Check if this is a crypto price market with monthly duration
                    if not self._is_monthly_crypto_price_market(event, asset):
                        continue
                    
                    # Monthly markets have multiple sub-markets with different price targets
                    if not event.get('markets'):
                        continue
                    
                    # Extract asset from title
                    event_title = event.get('title', '')
                    extracted_asset = self._extract_asset_from_title(event_title)
                    
                    # Filter by asset if specified
                    if asset and extracted_asset.upper() != asset.upper():
                        continue
                    
                    # Process each price level market in the event
                    for market in event.get('markets', []):
                        try:
                            market_data = self._parse_monthly_market(event, market, extracted_asset)
                            if market_data:
                                markets.append(market_data)
                        except Exception as e:
                            logger.debug(f"Could not parse monthly market {market.get('id')}: {e}")
                            continue
                        
                except Exception as e:
                    logger.debug(f"Could not process event {event.get('id')}: {e}")
                    continue
            
            logger.info(f"Parsed {len(markets)} {asset or 'all'} monthly price markets")
            return markets
            
        except Exception as e:
            logger.error(f"Error fetching monthly markets from Gamma API: {e}")
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
    
    def _parse_monthly_market(self, event: Dict, market: Dict, asset: str) -> Optional[Dict]:
        """
        Parse monthly market response - extracts explicit price target from question.
        
        Example question: "What price will Ethereum hit in October?"
        This extracts: target_price = 8000
        
        Args:
            event: The parent event (e.g., "What price will Ethereum hit in October?")
            market: Individual binary market for a specific price level
            asset: The asset (BTC, ETH, etc.)
            
        Returns:
            Market data dictionary with explicit target_price
        """
        try:
            question = market.get('question', '')
            description = market.get('description', '')
            
            # Extract price target from question text
            # Examples:
            # "Will Ethereum reach $8000?" → 8000
            # "Will Bitcoin hit $150,000 by...?" → 150000
            # "Will ETH be above 5000?" → 5000
            
            target_price = self._extract_target_price_from_question(question, asset)
            
            if target_price is None:
                logger.debug(f"Could not extract target price from: {question}")
                return None
            
            # Get market prices (probabilities)
            outcome_prices = market.get('outcomePrices', ['0.5', '0.5'])
            outcomes = market.get('outcomes', ['Yes', 'No'])
            
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
                    days_to_expiry = 30  # Monthly markets are ~30 days
            else:
                days_to_expiry = 30
            
            # For monthly markets, use neutral current price as midpoint
            # The actual current price would be from a price feed (not in this API)
            current_price_implied = (yes_price + no_price) / 2
            
            return {
                'asset': asset,
                'market_id': market.get('id', ''),
                'ticker': event.get('ticker', ''),
                'title': event.get('title', ''),
                'question': question,
                'description': description,
                'current_price': current_price_implied,
                'target_price': target_price,  # ✅ EXPLICIT TARGET PRICE!
                'market_price': yes_price,  # YES price (probability of hitting target)
                'no_price': no_price,  # NO price
                'days_to_expiry': days_to_expiry,
                'volatility': 0.55,  # Default crypto volatility
                'maturity_date': end_date_str,
                'liquidity': float(market.get('liquidity', 0)),
                'volume': float(market.get('volume', 0)),
                'active': market.get('active', True),
                'outcomes': outcomes,
                'outcome_prices': outcome_prices,
                'market_type': 'monthly',
            }
            
        except Exception as e:
            logger.error(f"Error parsing monthly market {market.get('id')}: {e}")
            return None
    
    def _extract_target_price_from_question(self, question: str, asset: str) -> Optional[float]:
        """
        Extract numeric price target from question text.
        
        Examples:
        "Will Ethereum reach $8000?" → 8000
        "Will Bitcoin hit $150,000 by...?" → 150000
        "Will ETH be above 5000?" → 5000
        
        Args:
            question: The market question text
            asset: The asset (BTC, ETH, etc.) for scale context
            
        Returns:
            Target price as float, or None if not found
        """
        import re
        
        # Remove common words
        cleaned = question.lower()
        
        # Find dollar signs followed by numbers (with optional commas)
        # Pattern: $ followed by optional digits, optional comma, digits
        pattern = r'\$[\d,]+(?:\.\d+)?'
        matches = re.findall(pattern, cleaned)
        
        if matches:
            # Take the first match, remove $ and commas
            price_str = matches[0].replace('$', '').replace(',', '')
            try:
                price = float(price_str)
                logger.debug(f"Extracted target price ${price} from: {question}")
                return price
            except ValueError:
                pass
        
        # Also try to find plain numbers that look like prices
        # Look for large numbers (4+ digits for crypto prices)
        number_pattern = r'\b(\d{4,})\b'
        matches = re.findall(number_pattern, cleaned)
        
        if matches:
            # Return the largest number (usually the price target)
            try:
                prices = [float(m) for m in matches]
                price = max(prices)
                logger.debug(f"Extracted target price {price} from: {question}")
                return price
            except ValueError:
                pass
        
        return None
    
    def _is_monthly_crypto_price_market(self, event: Dict, asset_filter: str = None) -> bool:
        """
        Check if an event is a monthly crypto price prediction market.
        
        Criteria:
        1. Title contains crypto asset name (BTC, ETH, etc.)
        2. Title contains price-related keywords (price, reach, hit, above, etc.)
        3. Duration is roughly 25-35 days (monthly)
        
        Args:
            event: Event from Gamma API
            asset_filter: Optional asset to filter by
            
        Returns:
            True if this looks like a monthly crypto price market
        """
        title = event.get('title', '').lower()
        
        # Check for crypto keywords
        crypto_keywords = ['bitcoin', 'ethereum', 'solana', 'xrp', 'btc', 'eth', 'sol', 'xrp', 'dogecoin', 'doge']
        is_crypto = any(keyword in title for keyword in crypto_keywords)
        
        if not is_crypto:
            return False
        
        # Check for price-related keywords
        price_keywords = ['price', 'reach', 'hit', 'above', 'below', 'will', '$']
        is_price = any(keyword in title for keyword in price_keywords)
        
        if not is_price:
            return False
        
        # Check duration is monthly (~25-35 days)
        try:
            start_str = event.get('startDate', '')
            end_str = event.get('endDate', '')
            
            if not start_str or not end_str:
                return False
            
            # Parse dates
            start = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
            end = datetime.fromisoformat(end_str.replace('Z', '+00:00'))
            
            duration_days = (end - start).days
            
            # Monthly markets are roughly 25-35 days
            is_monthly = 25 <= duration_days <= 35
            
            if is_monthly:
                logger.debug(f"Identified monthly market: {title[:50]}... (duration: {duration_days} days)")
            
            return is_monthly
            
        except Exception as e:
            logger.debug(f"Could not check duration for event {event.get('id')}: {e}")
            return False
    
    async def close(self):
        """Close the async client"""
        await self.client.aclose()

    async def download_and_cache_markets(self, cache_dir: str = "./market_cache") -> Dict[str, str]:
        """
        Download Polymarket Next.js data and cache locally for offline use.
        
        Args:
            cache_dir: Directory to store cached JSON files
            
        Returns:
            Dict mapping assets to cache file paths
        """
        import os
        from pathlib import Path
        
        # Create cache directory
        cache_path = Path(cache_dir)
        cache_path.mkdir(parents=True, exist_ok=True)
        
        cached_files = {}
        
        try:
            for asset, config in self.CRYPTO_PRICE_EVENTS.items():
                cache_file = cache_path / f"{asset.lower()}_markets.json"
                
                logger.info(f"⬇️  Downloading {asset} market data...")
                
                try:
                    response = await self.client.get(
                        config['fallback_path'],
                        follow_redirects=True
                    )
                    response.raise_for_status()
                    
                    # Save to cache
                    with open(cache_file, 'w') as f:
                        import json
                        json.dump(response.json(), f, indent=2)
                    
                    cached_files[asset] = str(cache_file)
                    logger.info(f"✅ Cached {asset} to: {cache_file}")
                    
                except Exception as e:
                    logger.error(f"❌ Failed to download {asset}: {e}")
                    continue
            
            return cached_files
            
        except Exception as e:
            logger.error(f"Error caching markets: {e}")
            return {}
    
    async def get_cached_markets(self, cache_dir: str = "./market_cache", asset: str = None) -> List[Dict]:
        """
        Load markets from cached JSON files.
        
        Args:
            cache_dir: Directory containing cached JSON files
            asset: Asset filter (BTC, ETH, etc.)
            
        Returns:
            List of market data dictionaries
        """
        import os
        import json
        from pathlib import Path
        
        cache_path = Path(cache_dir)
        markets = []
        
        try:
            assets_to_load = [asset.upper()] if asset else list(self.CRYPTO_PRICE_EVENTS.keys())
            
            for load_asset in assets_to_load:
                cache_file = cache_path / f"{load_asset.lower()}_markets.json"
                
                if not cache_file.exists():
                    logger.warning(f"No cache file for {load_asset}: {cache_file}")
                    continue
                
                logger.info(f"📂 Loading {load_asset} from cache: {cache_file}")
                
                try:
                    with open(cache_file, 'r') as f:
                        data = json.load(f)
                    
                    asset_markets = self._parse_nextjs_event_data(data, load_asset)
                    markets.extend(asset_markets)
                    logger.info(f"✅ Loaded {len(asset_markets)} {load_asset} markets from cache")
                    
                except Exception as e:
                    logger.error(f"Error loading cached {load_asset} data: {e}")
                    continue
            
            return markets
            
        except Exception as e:
            logger.error(f"Error reading cached markets: {e}")
            return []


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

