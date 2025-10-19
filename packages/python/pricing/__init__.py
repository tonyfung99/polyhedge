"""
Theoretical Pricing Engine

Implements Black-Scholes barrier option pricing for Polymarket binary options.
This is the core mathematical engine that calculates fair value probabilities
for prediction market events.
"""

from .theoretical_engine import TheoreticalPricingEngine

__all__ = ["TheoreticalPricingEngine"]
