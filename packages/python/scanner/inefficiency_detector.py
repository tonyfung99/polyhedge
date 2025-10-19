"""
Inefficiency Detector

Identifies arbitrage opportunities by comparing theoretical prices
with market prices and calculating edges.
"""

import pandas as pd
from typing import List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)


class InefficiencyDetector:
    """
    Detects market inefficiencies by comparing theoretical vs market prices.
    
    An inefficiency exists when:
    |theoretical_price - market_price| / market_price > threshold
    
    Positive edge: Market undervalued → Bet YES
    Negative edge: Market overvalued → Bet NO
    """
    
    def __init__(self, min_edge_threshold: float = 0.10):
        """
        Initialize the inefficiency detector.
        
        Args:
            min_edge_threshold: Minimum edge percentage to flag (default 10%)
        """
        self.min_edge_threshold = min_edge_threshold
    
    def calculate_edge(
        self, 
        theoretical_price: float, 
        market_price: float
    ) -> Tuple[float, float, str]:
        """
        Calculate edge between theoretical and market price.
        
        Args:
            theoretical_price: Calculated fair value (0 to 1)
            market_price: Observed market price (0 to 1)
            
        Returns:
            Tuple of (edge_absolute, edge_percentage, recommendation)
        """
        if market_price <= 0:
            return 0.0, 0.0, "INVALID"
            
        edge_absolute = theoretical_price - market_price
        edge_percentage = (edge_absolute / market_price) * 100
        
        if edge_percentage > self.min_edge_threshold:
            recommendation = "BET_YES"
        elif edge_percentage < -self.min_edge_threshold:
            recommendation = "BET_NO"
        else:
            recommendation = "SKIP"
            
        return edge_absolute, edge_percentage, recommendation
    
    def analyze_market(
        self,
        market_data: Dict[str, float]
    ) -> Dict[str, float]:
        """
        Analyze a single market for inefficiencies.
        
        Args:
            market_data: Dictionary with keys:
                        theoretical_price, market_price, asset, target, etc.
                        
        Returns:
            Analysis results with edge calculations
        """
        theoretical_price = market_data['theoretical_price']
        market_price = market_data['market_price']
        
        edge_abs, edge_pct, recommendation = self.calculate_edge(
            theoretical_price, market_price
        )
        
        # Add analysis results to market data
        result = market_data.copy()
        result.update({
            'edge_absolute': edge_abs,
            'edge_percentage': edge_pct,
            'recommendation': recommendation,
            'is_opportunity': abs(edge_pct) >= self.min_edge_threshold * 100
        })
        
        return result
    
    def scan_markets(
        self,
        markets: List[Dict[str, float]]
    ) -> pd.DataFrame:
        """
        Scan multiple markets for inefficiencies.
        
        Args:
            markets: List of market data dictionaries
            
        Returns:
            DataFrame with analysis results, sorted by edge percentage
        """
        results = []
        
        for market in markets:
            try:
                analysis = self.analyze_market(market)
                results.append(analysis)
            except Exception as e:
                logger.error(f"Error analyzing market {market}: {e}")
                continue
        
        if not results:
            return pd.DataFrame()
        
        # Convert to DataFrame and sort by absolute edge percentage
        df = pd.DataFrame(results)
        df = df.sort_values('edge_percentage', key=abs, ascending=False)
        
        return df
    
    def get_opportunities(
        self,
        markets_df: pd.DataFrame
    ) -> Dict[str, pd.DataFrame]:
        """
        Categorize markets into opportunity types.
        
        Args:
            markets_df: DataFrame from scan_markets()
            
        Returns:
            Dictionary with categorized opportunities
        """
        opportunities = {
            'all': markets_df,
            'undervalued': markets_df[markets_df['edge_percentage'] > self.min_edge_threshold * 100],
            'overvalued': markets_df[markets_df['edge_percentage'] < -self.min_edge_threshold * 100],
            'high_confidence': markets_df[abs(markets_df['edge_percentage']) > 50],  # >50% edge
            'medium_confidence': markets_df[
                (abs(markets_df['edge_percentage']) > 20) & 
                (abs(markets_df['edge_percentage']) <= 50)
            ],
            'low_confidence': markets_df[
                (abs(markets_df['edge_percentage']) > self.min_edge_threshold * 100) & 
                (abs(markets_df['edge_percentage']) <= 20)
            ]
        }
        
        return opportunities
    
    def rank_opportunities(
        self,
        opportunities_df: pd.DataFrame,
        max_positions: int = 10
    ) -> pd.DataFrame:
        """
        Rank opportunities by expected value and risk.
        
        Args:
            opportunities_df: DataFrame of opportunities
            max_positions: Maximum number of positions to return
            
        Returns:
            Ranked DataFrame
        """
        if opportunities_df.empty:
            return pd.DataFrame()
        
        # Calculate expected value (simplified)
        # EV = edge_percentage * position_size (assuming $100 position)
        opportunities_df = opportunities_df.copy()
        opportunities_df['expected_value'] = abs(opportunities_df['edge_percentage']) * 100
        
        # Rank by expected value (descending)
        ranked = opportunities_df.sort_values('expected_value', ascending=False)
        
        # Take top positions
        return ranked.head(max_positions)
    
    def generate_summary(
        self,
        opportunities: Dict[str, pd.DataFrame]
    ) -> Dict[str, any]:
        """
        Generate summary statistics for opportunities.
        
        Args:
            opportunities: Dictionary from get_opportunities()
            
        Returns:
            Summary statistics
        """
        summary = {}
        
        for category, df in opportunities.items():
            if df.empty:
                summary[category] = {
                    'count': 0,
                    'avg_edge': 0,
                    'max_edge': 0,
                    'total_ev': 0
                }
                continue
            
            summary[category] = {
                'count': len(df),
                'avg_edge': df['edge_percentage'].mean(),
                'max_edge': df['edge_percentage'].max(),
                'min_edge': df['edge_percentage'].min(),
                'total_ev': df['expected_value'].sum() if 'expected_value' in df.columns else 0
            }
        
        return summary


# Example usage
if __name__ == "__main__":
    # Sample market data
    sample_markets = [
        {
            'asset': 'BTC',
            'target': 200000,
            'theoretical_price': 0.0001,
            'market_price': 0.007,
            'days_to_expiry': 12
        },
        {
            'asset': 'BTC', 
            'target': 150000,
            'theoretical_price': 0.0022,
            'market_price': 0.025,
            'days_to_expiry': 12
        },
        {
            'asset': 'BTC',
            'target': 110000,
            'theoretical_price': 0.8235,
            'market_price': 0.18,
            'days_to_expiry': 12
        }
    ]
    
    # Initialize detector
    detector = InefficiencyDetector(min_edge_threshold=0.10)
    
    # Scan markets
    results_df = detector.scan_markets(sample_markets)
    print("Market Analysis Results:")
    print(results_df[['asset', 'target', 'theoretical_price', 'market_price', 
                     'edge_percentage', 'recommendation']].to_string())
    
    # Get opportunities
    opportunities = detector.get_opportunities(results_df)
    
    # Generate summary
    summary = detector.generate_summary(opportunities)
    print(f"\nSummary:")
    for category, stats in summary.items():
        print(f"  {category}: {stats['count']} opportunities, avg edge: {stats['avg_edge']:.1f}%")
