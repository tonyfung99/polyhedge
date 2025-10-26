#!/bin/bash

# PolyHedge Python Environment Setup Script
# This script sets up the Python virtual environment and installs all dependencies

set -e  # Exit on error

PROJECT_DIR="/Users/tonyfung/polyhedge"
VENV_DIR="$PROJECT_DIR/venv"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     PolyHedge Python Environment Setup                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Check Python installation
echo "📋 Step 1: Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install it first:"
    echo "   brew install python3"
    exit 1
fi
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "✅ Python $PYTHON_VERSION found at $(which python3)"
echo ""

# Step 2: Create virtual environment
echo "📋 Step 2: Creating virtual environment..."
if [ -d "$VENV_DIR" ]; then
    echo "ℹ️  Virtual environment already exists at $VENV_DIR"
    read -p "Do you want to recreate it? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$VENV_DIR"
        python3 -m venv "$VENV_DIR"
        echo "✅ Virtual environment recreated"
    fi
else
    python3 -m venv "$VENV_DIR"
    echo "✅ Virtual environment created at $VENV_DIR"
fi
echo ""

# Step 3: Activate virtual environment
echo "📋 Step 3: Activating virtual environment..."
source "$VENV_DIR/bin/activate"
echo "✅ Virtual environment activated"
ACTIVATED_PYTHON=$(which python)
echo "   Using: $ACTIVATED_PYTHON"
echo ""

# Step 4: Upgrade pip
echo "📋 Step 4: Upgrading pip..."
python -m pip install --upgrade pip > /dev/null 2>&1 || {
    echo "⚠️  Could not upgrade pip (may need network access), continuing..."
}
echo "✅ Pip upgraded (or skipped)"
echo ""

# Step 5: Install requirements
echo "📋 Step 5: Installing Python dependencies..."
REQUIREMENTS_FILE="$PROJECT_DIR/packages/python/scanner/requirements.txt"
if [ -f "$REQUIREMENTS_FILE" ]; then
    pip install -r "$REQUIREMENTS_FILE" 2>&1 | tail -5
    echo "✅ Dependencies installed"
else
    echo "❌ requirements.txt not found at $REQUIREMENTS_FILE"
    exit 1
fi
echo ""

# Step 6: Verify installation
echo "📋 Step 6: Verifying installation..."
python << 'VERIFY'
import sys

packages = {
    'web3': 'Web3 (Ethereum library)',
    'eth_account': 'eth_account (Key management)',
    'httpx': 'httpx (HTTP client)',
    'pandas': 'pandas (Data analysis)',
    'numpy': 'numpy (Numerical computing)',
    'scipy': 'scipy (Scientific computing)',
}

all_ok = True
for package, description in packages.items():
    try:
        module = __import__(package)
        version = getattr(module, '__version__', 'installed')
        print(f"✅ {description}: {version}")
    except ImportError:
        print(f"❌ {package}: NOT INSTALLED")
        all_ok = False

if all_ok:
    print("\n✅ All dependencies installed successfully!")
    sys.exit(0)
else:
    print("\n❌ Some dependencies are missing")
    sys.exit(1)
VERIFY

VERIFY_EXIT_CODE=$?
if [ $VERIFY_EXIT_CODE -ne 0 ]; then
    echo ""
    echo "⚠️  Some issues detected. Trying to fix..."
    pip install --upgrade web3 eth-account httpx pandas numpy scipy > /dev/null 2>&1
    echo "✅ Retry completed"
fi
echo ""

# Step 7: Display final instructions
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║ ✅ SETUP COMPLETE!                                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1️⃣  Verify everything is working:"
echo "   python -c \"import web3; print('✅ Web3 ready!')\""
echo ""
echo "2️⃣  Run the scanner with mock data:"
echo "   cd packages/python/scanner"
echo "   python -m strategy_scanner"
echo ""
echo "3️⃣  When done with development, deactivate the virtual environment:"
echo "   deactivate"
echo ""
echo "💡 To reactivate later:"
echo "   source $VENV_DIR/bin/activate"
echo ""

# Keep the environment activated for immediate use
echo "🚀 Virtual environment is now ACTIVE!"
echo "   Type 'python' to start coding"
echo ""
