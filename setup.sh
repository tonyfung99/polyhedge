#!/bin/bash

# PolyHedge Setup Script
# This script sets up the development environment for PolyHedge

set -e  # Exit on any error

echo "🚀 Setting up PolyHedge development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js >= 20.18.3"
    echo "   Visit: https://nodejs.org/en/download/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="20.18.3"
if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js >= $REQUIRED_VERSION"
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION is compatible"

# Check if Yarn is installed
if ! command -v yarn &> /dev/null; then
    echo "❌ Yarn is not installed. Please install Yarn"
    echo "   Visit: https://yarnpkg.com/getting-started/install"
    exit 1
fi

echo "✅ Yarn is installed"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+"
    echo "   Visit: https://www.python.org/downloads/"
    exit 1
fi

echo "✅ Python 3 is installed"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
yarn install

# Create Python virtual environment
echo "🐍 Setting up Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
echo "📦 Installing Python dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r packages/python/requirements.txt

# Run mathematical verification
echo "🧮 Running mathematical verification..."
python packages/python/analysis/verify_math.py

echo ""
echo "🎉 Setup complete! Here's what you can do next:"
echo ""
echo "📚 Read the documentation:"
echo "   - Start with: docs/PROJECT_OVERVIEW.md"
echo "   - Then read: docs/MATHEMATICAL_ANALYSIS.md"
echo "   - Finally: docs/STRATEGY_GUIDE.md"
echo ""
echo "🚀 Start development:"
echo "   # Terminal 1: Start local blockchain"
echo "   yarn chain"
echo ""
echo "   # Terminal 2: Deploy contracts"
echo "   yarn deploy"
echo ""
echo "   # Terminal 3: Start frontend"
echo "   yarn start"
echo ""
echo "🧮 Run analysis:"
echo "   source venv/bin/activate"
echo "   python packages/python/analysis/verify_math.py"
echo ""
echo "🧪 Run tests:"
echo "   cd packages/python && pytest tests/ -v"
echo ""
echo "📖 For more information, see README.md"
echo ""
echo "Happy coding! 🚀"
