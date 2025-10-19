"""
Tests for the Theoretical Pricing Engine

Validates Black-Scholes barrier option pricing calculations
and edge case handling.
"""

import pytest
import numpy as np
from src.scanner.pricing_engine import TheoreticalPricingEngine


class TestTheoreticalPricingEngine:
    """Test cases for the pricing engine."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.engine = TheoreticalPricingEngine()
    
    def test_barrier_hit_probability_basic(self):
        """Test basic barrier hit probability calculation."""
        # Test case: BTC at $100k, target $110k, 30 days, 50% vol
        S0 = 100000
        H = 110000
        T = 30 / 365
        sigma = 0.50
        
        prob = self.engine.barrier_hit_probability(S0, H, T, sigma)
        
        # Should be between 0 and 1
        assert 0 <= prob <= 1
        
        # Should be reasonable (not too high for 10% move in 30 days)
        assert prob < 0.5
    
    def test_barrier_hit_probability_already_hit(self):
        """Test case where barrier is already hit."""
        S0 = 110000
        H = 100000  # Barrier below current price
        T = 30 / 365
        sigma = 0.50
        
        prob = self.engine.barrier_hit_probability(S0, H, T, sigma)
        
        # Should be 1.0 (already hit)
        assert prob == 1.0
    
    def test_barrier_hit_probability_extreme_cases(self):
        """Test extreme cases."""
        S0 = 100000
        T = 30 / 365
        sigma = 0.50
        
        # Very high barrier (impossible)
        H_high = 1000000
        prob_high = self.engine.barrier_hit_probability(S0, H_high, T, sigma)
        assert prob_high < 0.01  # Very low probability
        
        # Very low barrier (almost certain)
        H_low = 101000
        prob_low = self.engine.barrier_hit_probability(S0, H_low, T, sigma)
        assert prob_low > 0.1  # Reasonable probability
    
    def test_delta_calculation(self):
        """Test delta calculation."""
        S0 = 100000
        H = 110000
        T = 30 / 365
        sigma = 0.50
        
        delta = self.engine.calculate_delta(S0, H, T, sigma)
        
        # Delta should be positive (higher price = higher probability)
        assert delta > 0
        
        # Delta should be small (sensitivity to $1 change)
        assert delta < 0.001
    
    def test_implied_volatility(self):
        """Test implied volatility calculation."""
        S0 = 100000
        H = 110000
        T = 30 / 365
        market_price = 0.15  # 15% market price
        
        implied_vol = self.engine.calculate_implied_volatility(
            S0, H, T, market_price
        )
        
        # Should be positive and reasonable
        assert implied_vol > 0
        assert implied_vol < 2.0  # Less than 200% vol
        
        # Verify it gives back the market price
        theoretical = self.engine.barrier_hit_probability(
            S0, H, T, implied_vol
        )
        assert abs(theoretical - market_price) < 0.01
    
    def test_price_market_complete(self):
        """Test complete market pricing."""
        result = self.engine.price_market(
            asset="BTC",
            current_price=107127,
            target_price=130000,
            days_to_expiry=13,
            volatility=0.55
        )
        
        # Check all required fields are present
        required_fields = [
            'asset', 'current_price', 'target_price', 'days_to_expiry',
            'volatility', 'theoretical_price', 'delta', 'time_to_expiry'
        ]
        
        for field in required_fields:
            assert field in result
        
        # Check values are reasonable
        assert result['asset'] == "BTC"
        assert result['current_price'] == 107127
        assert result['target_price'] == 130000
        assert 0 < result['theoretical_price'] < 1
        assert result['delta'] > 0
        assert result['time_to_expiry'] > 0
    
    def test_batch_pricing(self):
        """Test batch pricing of multiple markets."""
        markets = [
            {
                'asset': 'BTC',
                'current_price': 107127,
                'target_price': 130000,
                'days_to_expiry': 13,
                'volatility': 0.55
            },
            {
                'asset': 'BTC',
                'current_price': 107127,
                'target_price': 150000,
                'days_to_expiry': 13,
                'volatility': 0.55
            }
        ]
        
        results = self.engine.batch_price_markets(markets)
        
        # Should return same number of results
        assert len(results) == len(markets)
        
        # Check that higher target has lower probability
        assert results[0]['theoretical_price'] > results[1]['theoretical_price']
    
    def test_volatility_sensitivity(self):
        """Test sensitivity to volatility changes."""
        S0 = 100000
        H = 110000
        T = 30 / 365
        
        # Low volatility
        prob_low = self.engine.barrier_hit_probability(S0, H, T, 0.20)
        
        # High volatility
        prob_high = self.engine.barrier_hit_probability(S0, H, T, 0.80)
        
        # Higher volatility should increase probability
        assert prob_high > prob_low
    
    def test_time_sensitivity(self):
        """Test sensitivity to time changes."""
        S0 = 100000
        H = 110000
        sigma = 0.50
        
        # Short time
        prob_short = self.engine.barrier_hit_probability(S0, H, 1/365, sigma)
        
        # Long time
        prob_long = self.engine.barrier_hit_probability(S0, H, 90/365, sigma)
        
        # More time should increase probability
        assert prob_long > prob_short


if __name__ == "__main__":
    pytest.main([__file__])
