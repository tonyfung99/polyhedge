# Test Suite for PolyHedge

"""
This package contains unit tests and integration tests for the PolyHedge
arbitrage strategy implementation.

Test Structure:
- test_pricing_engine.py: Tests for Black-Scholes barrier option pricing
- test_inefficiency_detector.py: Tests for market inefficiency detection
- test_position_sizer.py: Tests for Kelly Criterion position sizing
- test_portfolio_builder.py: Tests for portfolio construction
- test_integration.py: End-to-end integration tests

Run tests with:
    pytest tests/
    
Run with coverage:
    pytest tests/ --cov=src/
"""
