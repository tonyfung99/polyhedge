"""
Kelly Criterion Position Sizing

Implements the Kelly Criterion for optimal position sizing in arbitrage opportunities.
The Kelly Criterion maximizes long-term growth rate while managing risk.
"""

import numpy as np
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)


class KellyPositionSizer:
    """
    Calculates optimal position sizes using the Kelly Criterion.
    
    Kelly Formula: f = (p * b - q) / b
    where:
    - f = fraction of capital to bet
    - p = probability of winning
    - q = probability of losing (1 - p)
    - b = odds received on the wager (payout / stake - 1)
    """
    
    def __init__(self, kelly_fraction: float = 0.25, max_position_size: float = 0.40):
        """
        Initialize the position sizer.
        
        Args:
            kelly_fraction: Fraction of full Kelly to use (default 25% for safety)
            max_position_size: Maximum position size as fraction of capital (default 40%)
        """
        self.kelly_fraction = kelly_fraction
        self.max_position_size = max_position_size
    
    def calculate_kelly_fraction(
        self,
        win_probability: float,
        payout_ratio: float
    ) -> float:
        """
        Calculate Kelly fraction for a given bet.
        
        Args:
            win_probability: Probability of winning (0 to 1)
            payout_ratio: Payout per unit staked (e.g., 1.0 for even money)
            
        Returns:
            Kelly fraction (0 to 1)
        """
        if win_probability <= 0 or win_probability >= 1:
            return 0.0
            
        if payout_ratio <= 0:
            return 0.0
        
        # Kelly formula: f = (p * b - q) / b
        # where b = payout_ratio - 1 (odds received)
        odds_received = payout_ratio - 1
        lose_probability = 1 - win_probability
        
        if odds_received <= 0:
            return 0.0
            
        kelly_f = (win_probability * odds_received - lose_probability) / odds_received
        
        # Ensure non-negative
        return max(0.0, kelly_f)
    
    def size_position(
        self,
        opportunity: Dict[str, float],
        total_capital: float
    ) -> Dict[str, float]:
        """
        Calculate position size for an arbitrage opportunity.
        
        Args:
            opportunity: Dictionary with keys:
                        theoretical_price, market_price, recommendation, etc.
            total_capital: Total capital available for allocation
            
        Returns:
            Position sizing results
        """
        theoretical_price = opportunity['theoretical_price']
        market_price = opportunity['market_price']
        recommendation = opportunity['recommendation']
        
        if recommendation == "BET_YES":
            win_probability = theoretical_price
            # For YES bet: if you win, you get $1 per share, cost is market_price
            payout_ratio = 1.0 / market_price
            
        elif recommendation == "BET_NO":
            win_probability = 1 - theoretical_price
            # For NO bet: if you win, you get $1 per share, cost is (1 - market_price)
            no_price = 1 - market_price
            payout_ratio = 1.0 / no_price
            
        else:
            # No bet recommended
            return {
                'allocation': 0.0,
                'shares': 0,
                'kelly_fraction': 0.0,
                'expected_value': 0.0,
                'risk_adjusted_fraction': 0.0
            }
        
        # Calculate Kelly fraction
        kelly_f = self.calculate_kelly_fraction(win_probability, payout_ratio)
        
        # Apply safety fraction and position limits
        risk_adjusted_fraction = min(
            kelly_f * self.kelly_fraction,
            self.max_position_size
        )
        
        # Calculate allocation
        allocation = total_capital * risk_adjusted_fraction
        
        # Calculate number of shares
        if recommendation == "BET_YES":
            shares = allocation / market_price
        else:  # BET_NO
            no_price = 1 - market_price
            shares = allocation / no_price
        
        # Calculate expected value
        expected_value = allocation * (win_probability * payout_ratio - 1)
        
        return {
            'allocation': allocation,
            'shares': shares,
            'kelly_fraction': kelly_f,
            'risk_adjusted_fraction': risk_adjusted_fraction,
            'expected_value': expected_value,
            'win_probability': win_probability,
            'payout_ratio': payout_ratio
        }
    
    def size_portfolio(
        self,
        opportunities: List[Dict[str, float]],
        total_capital: float
    ) -> List[Dict[str, float]]:
        """
        Size positions for multiple opportunities.
        
        Args:
            opportunities: List of opportunity dictionaries
            total_capital: Total capital available
            
        Returns:
            List of position sizing results
        """
        positions = []
        
        for opportunity in opportunities:
            try:
                position = self.size_position(opportunity, total_capital)
                
                # Add opportunity data to position
                position.update({
                    'asset': opportunity.get('asset', ''),
                    'target': opportunity.get('target', 0),
                    'market_price': opportunity.get('market_price', 0),
                    'theoretical_price': opportunity.get('theoretical_price', 0),
                    'edge_percentage': opportunity.get('edge_percentage', 0),
                    'recommendation': opportunity.get('recommendation', 'SKIP')
                })
                
                positions.append(position)
                
            except Exception as e:
                logger.error(f"Error sizing position for {opportunity}: {e}")
                continue
        
        return positions
    
    def optimize_portfolio(
        self,
        positions: List[Dict[str, float]],
        total_capital: float,
        min_allocation: float = 100.0
    ) -> List[Dict[str, float]]:
        """
        Optimize portfolio by filtering and rebalancing positions.
        
        Args:
            positions: List of position sizing results
            total_capital: Total capital available
            min_allocation: Minimum allocation to include position
            
        Returns:
            Optimized portfolio
        """
        # Filter positions with minimum allocation
        valid_positions = [
            p for p in positions 
            if p['allocation'] >= min_allocation
        ]
        
        if not valid_positions:
            return []
        
        # Sort by expected value (descending)
        valid_positions.sort(key=lambda x: x['expected_value'], reverse=True)
        
        # Calculate total allocation
        total_allocated = sum(p['allocation'] for p in valid_positions)
        
        # If over-allocated, scale down proportionally
        if total_allocated > total_capital:
            scale_factor = total_capital / total_allocated
            
            for position in valid_positions:
                position['allocation'] *= scale_factor
                position['shares'] *= scale_factor
                position['expected_value'] *= scale_factor
        
        return valid_positions
    
    def calculate_portfolio_metrics(
        self,
        portfolio: List[Dict[str, float]]
    ) -> Dict[str, float]:
        """
        Calculate portfolio-level metrics.
        
        Args:
            portfolio: List of position dictionaries
            
        Returns:
            Portfolio metrics
        """
        if not portfolio:
            return {
                'total_allocation': 0.0,
                'total_expected_value': 0.0,
                'expected_return': 0.0,
                'position_count': 0,
                'diversification_ratio': 0.0
            }
        
        total_allocation = sum(p['allocation'] for p in portfolio)
        total_expected_value = sum(p['expected_value'] for p in portfolio)
        expected_return = (total_expected_value / total_allocation * 100) if total_allocation > 0 else 0
        
        # Calculate diversification (Herfindahl index)
        weights = [p['allocation'] / total_allocation for p in portfolio]
        herfindahl_index = sum(w**2 for w in weights)
        diversification_ratio = 1 / herfindahl_index if herfindahl_index > 0 else 0
        
        return {
            'total_allocation': total_allocation,
            'total_expected_value': total_expected_value,
            'expected_return': expected_return,
            'position_count': len(portfolio),
            'diversification_ratio': diversification_ratio,
            'avg_position_size': total_allocation / len(portfolio),
            'max_position_size': max(p['allocation'] for p in portfolio),
            'min_position_size': min(p['allocation'] for p in portfolio)
        }


# Example usage
if __name__ == "__main__":
    # Sample opportunities
    opportunities = [
        {
            'asset': 'BTC',
            'target': 200000,
            'theoretical_price': 0.0001,
            'market_price': 0.007,
            'edge_percentage': -99.9,
            'recommendation': 'BET_NO'
        },
        {
            'asset': 'BTC',
            'target': 110000,
            'theoretical_price': 0.8235,
            'market_price': 0.18,
            'edge_percentage': 358.0,
            'recommendation': 'BET_YES'
        }
    ]
    
    # Initialize position sizer
    sizer = KellyPositionSizer(kelly_fraction=0.25, max_position_size=0.40)
    
    # Size positions
    positions = sizer.size_portfolio(opportunities, total_capital=10000)
    
    # Optimize portfolio
    optimized = sizer.optimize_portfolio(positions, total_capital=10000)
    
    # Calculate metrics
    metrics = sizer.calculate_portfolio_metrics(optimized)
    
    print("Portfolio Metrics:")
    for key, value in metrics.items():
        print(f"  {key}: {value}")
    
    print("\nOptimized Positions:")
    for i, pos in enumerate(optimized):
        print(f"  Position {i+1}: {pos['asset']} >${pos['target']:,}")
        print(f"    Allocation: ${pos['allocation']:,.2f}")
        print(f"    Expected Value: ${pos['expected_value']:,.2f}")
        print(f"    Kelly Fraction: {pos['kelly_fraction']:.3f}")
        print()
