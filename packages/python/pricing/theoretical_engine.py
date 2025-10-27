"""
Theoretical Pricing Engine

Implements Black-Scholes barrier option pricing for Polymarket binary options.
This is the core mathematical engine that calculates fair value probabilities
for prediction market events.
"""

import numpy as np
from scipy.stats import norm
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)


class TheoreticalPricingEngine:
    """
    Calculates theoretical prices for Polymarket binary options using
    Black-Scholes barrier option pricing theory.
    
    A Polymarket "Yes" share on "BTC > $130k by Oct 31" is equivalent to
    a digital barrier call option with payoff:
    - $1.00 if max(S_t) >= H (barrier hit)
    - $0.00 if max(S_t) < H (barrier not hit)
    """
    
    def __init__(self, risk_free_rate: float = 0.0):
        """
        Initialize the pricing engine.
        
        Args:
            risk_free_rate: Risk-free interest rate (default 0 for crypto)
        """
        self.r = risk_free_rate
        
    def barrier_hit_probability(
        self, 
        S0: float, 
        H: float, 
        T: float, 
        sigma: float, 
        mu: float = 0.0
    ) -> float:
        """
        Calculate probability that asset price hits barrier H from current price S0 in time T.
        
        Uses GBM barrier-hitting formula:
        P(max S_t >= H) = Phi(-b/sqrt(T) + nu*sqrt(T)) + exp(-2*nu*b) * Phi(-b/sqrt(T) - nu*sqrt(T))
        
        Args:
            S0: Current asset price
            H: Barrier price (target)
            T: Time to expiry (years)
            sigma: Volatility (annualized)
            mu: Drift (default 0 for risk-neutral pricing)
            
        Returns:
            Probability as float (0 to 1)
        """
        if S0 >= H:
            return 1.0
            
        # Log-ratio
        b = np.log(H / S0)
        
        # Drift parameter (risk-neutral)
        nu = (mu - self.r) / sigma - sigma / 2
        
        # Two terms of the formula
        sqrt_T = np.sqrt(T)
        term1 = norm.cdf(-b / (sigma * sqrt_T) + nu * sqrt_T)
        term2 = np.exp(-2 * nu * b / (sigma ** 2)) * norm.cdf(-b / (sigma * sqrt_T) - nu * sqrt_T)
        
        return term1 + term2
    
    def calculate_delta(
        self, 
        S0: float, 
        H: float, 
        T: float, 
        sigma: float, 
        epsilon: float = 1.0
    ) -> float:
        """
        Calculate delta (price sensitivity) numerically.
        
        Delta = ∂p / ∂S0 where p is the barrier hit probability
        
        Args:
            S0: Current asset price
            H: Barrier price
            T: Time to expiry (years)
            sigma: Volatility
            epsilon: Step size for numerical derivative (default $1)
            
        Returns:
            Delta value
        """
        p_up = self.barrier_hit_probability(S0 + epsilon, H, T, sigma)
        p_down = self.barrier_hit_probability(S0 - epsilon, H, T, sigma)
        
        delta = (p_up - p_down) / (2 * epsilon)
        return delta
    
    def calculate_implied_volatility(
        self,
        S0: float,
        H: float,
        T: float,
        market_price: float,
        initial_guess: float = 0.5
    ) -> float:
        """
        Calculate implied volatility from market price.
        
        Uses Newton-Raphson method to solve:
        theoretical_price(sigma) = market_price
        
        Args:
            S0: Current asset price
            H: Barrier price
            T: Time to expiry (years)
            market_price: Observed market price (0 to 1)
            initial_guess: Initial volatility guess
            
        Returns:
            Implied volatility
        """
        sigma = initial_guess
        tolerance = 1e-6
        max_iterations = 100
        
        for i in range(max_iterations):
            # Calculate theoretical price and its derivative
            p_theory = self.barrier_hit_probability(S0, H, T, sigma)
            
            # Numerical derivative w.r.t. volatility
            p_up = self.barrier_hit_probability(S0, H, T, sigma + 0.01)
            p_down = self.barrier_hit_probability(S0, H, T, sigma - 0.01)
            dp_dsigma = (p_up - p_down) / 0.02
            
            # Newton-Raphson update
            error = p_theory - market_price
            if abs(error) < tolerance:
                break
                
            if abs(dp_dsigma) < 1e-10:  # Avoid division by zero
                break
                
            sigma = sigma - error / dp_dsigma
            sigma = max(0.01, min(5.0, sigma))  # Keep in reasonable range
            
        return sigma
    
    def price_market(
        self,
        asset: str,
        current_price: float,
        target_price: float,
        days_to_expiry: int,
        volatility: float
    ) -> Dict[str, float]:
        """
        Price a complete Polymarket event.
        
        Args:
            asset: Asset symbol (e.g., 'BTC', 'ETH')
            current_price: Current asset price
            target_price: Target/barrier price
            days_to_expiry: Days until expiry
            volatility: Annualized volatility
            
        Returns:
            Dictionary with pricing results
        """
        T = days_to_expiry / 365.0
        
        # Calculate theoretical price
        p_theory = self.barrier_hit_probability(
            current_price, target_price, T, volatility
        )
        
        # Calculate delta
        delta = self.calculate_delta(
            current_price, target_price, T, volatility
        )
        
        return {
            'asset': asset,
            'current_price': current_price,
            'target_price': target_price,
            'days_to_expiry': days_to_expiry,
            'volatility': volatility,
            'theoretical_price': p_theory,
            'delta': delta,
            'time_to_expiry': T
        }
    
    def batch_price_markets(
        self,
        markets: List[Dict[str, float]]
    ) -> List[Dict[str, float]]:
        """
        Price multiple markets in batch.
        
        Args:
            markets: List of market dictionaries with keys:
                    asset, current_price, target_price, days_to_expiry, volatility
                    
        Returns:
            List of pricing results with original market fields preserved
        """
        results = []
        
        for market in markets:
            try:
                result = self.price_market(
                    asset=market['asset'],
                    current_price=market['current_price'],
                    target_price=market['target_price'],
                    days_to_expiry=market['days_to_expiry'],
                    volatility=market['volatility']
                )
                
                # Preserve original market fields (market_price, no_price, etc.)
                market_with_pricing = market.copy()
                market_with_pricing.update(result)
                
                results.append(market_with_pricing)
                
            except Exception as e:
                logger.error(f"Error pricing market {market}: {e}")
                continue
                
        return results


# Example usage and testing
if __name__ == "__main__":
    # Initialize pricing engine
    engine = TheoreticalPricingEngine()
    
    # Example: BTC > $130k by Oct 31, 2025
    result = engine.price_market(
        asset="BTC",
        current_price=107127,
        target_price=130000,
        days_to_expiry=13,
        volatility=0.55
    )
    
    print("Pricing Result:")
    for key, value in result.items():
        print(f"  {key}: {value}")
    
    # Calculate implied volatility from market price
    market_price = 0.07  # 7% market price
    implied_vol = engine.calculate_implied_volatility(
        S0=107127,
        H=130000,
        T=13/365,
        market_price=market_price
    )
    
    print(f"\nImplied Volatility from {market_price*100:.1f}% market price: {implied_vol*100:.1f}%")
