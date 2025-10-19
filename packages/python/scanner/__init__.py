"""
Market Scanner

Real-time market scanning and inefficiency detection for Polymarket.
Identifies arbitrage opportunities by comparing theoretical vs market prices.
"""

from .inefficiency_detector import InefficiencyDetector

__all__ = ["InefficiencyDetector"]
