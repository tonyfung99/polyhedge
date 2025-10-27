/**
 * Test script for buying strategies on Arbitrum Sepolia testnet
 *
 * Usage:
 *   yarn hardhat run scripts/testBuyStrategy.ts --network arbitrumSepolia
 */

import { ethers } from "hardhat";

// ERC20 ABI for USDC interactions
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🚀 STRATEGY PURCHASE TEST - ARBITRUM SEPOLIA");
  console.log("=".repeat(80));

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log(`\n✅ Connected with account: ${signer.address}`);

  // Contract addresses (from deployment)
  const STRATEGY_MANAGER_ADDRESS = "0xc707d360BEc8048760F028f852cF1E244d155710";
  const USDC_ADDRESS = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"; // Arbitrum Sepolia USDC

  // Load contracts
  const StrategyManager = await ethers.getContractAt("StrategyManager", STRATEGY_MANAGER_ADDRESS);

  const USDC = await ethers.getContractAt(ERC20_ABI, USDC_ADDRESS);

  // Check balances
  console.log("\n" + "=".repeat(80));
  console.log("💳 CHECKING BALANCES");
  console.log("=".repeat(80));

  const ethBalance = await ethers.provider.getBalance(signer.address);
  const usdcBalance = await USDC.balanceOf(signer.address);
  const usdcAllowance = await USDC.allowance(signer.address, STRATEGY_MANAGER_ADDRESS);

  console.log(`ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
  console.log(`USDC Balance: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
  console.log(`USDC Allowance: ${ethers.formatUnits(usdcAllowance, 6)} USDC`);

  if (ethBalance < ethers.parseEther("0.001")) {
    console.log("\n⚠️  Low ETH balance! Get testnet ETH from:");
    console.log("   https://www.alchemy.com/faucets/arbitrum-sepolia");
  }

  if (usdcBalance < ethers.parseUnits("1", 6)) {
    console.log("\n⚠️  Low USDC balance! Get testnet USDC from:");
    console.log("   1. Bridge from Sepolia: https://bridge.arbitrum.io/?destinationChain=arbitrum-sepolia");
    console.log("   2. Or use a testnet USDC faucet");
  }

  // List available strategies
  console.log("\n" + "=".repeat(80));
  console.log("📋 FETCHING AVAILABLE STRATEGIES");
  console.log("=".repeat(80));

  const nextStrategyId = await StrategyManager.nextStrategyId();
  console.log(`Next Strategy ID: ${nextStrategyId}`);

  const strategies = [];

  for (let strategyId = 1; strategyId < nextStrategyId; strategyId++) {
    try {
      const strategy = await StrategyManager.strategies(strategyId);

      const [id, name, feeBps, maturityTs, active, , settled, payoutPerUSDC] = strategy;

      strategies.push({
        id: Number(id),
        name,
        feeBps: Number(feeBps),
        maturityTs: Number(maturityTs),
        active,
        settled,
        payoutPerUSDC: Number(payoutPerUSDC),
      });

      const status = active && !settled ? "✅ ACTIVE" : "❌ INACTIVE";
      const feePercent = Number(feeBps) / 100;

      console.log(`\nStrategy #${id}: ${name}`);
      console.log(`  Status: ${status}`);
      console.log(`  Fee: ${feePercent}%`);
      console.log(`  Maturity: ${maturityTs}`);
      console.log(`  Settled: ${settled}`);
    } catch {
      // Strategy doesn't exist
      break;
    }
  }

  console.log(`\n✅ Found ${strategies.length} strategies`);

  if (strategies.length === 0) {
    console.error("\n❌ No strategies found!");
    console.log("Run the Python scanner to create strategies first:");
    console.log("  cd packages/python/scanner && python run_strategy_scanner.py");
    process.exit(1);
  }

  // Filter active strategies
  const activeStrategies = strategies.filter(s => s.active && !s.settled);

  if (activeStrategies.length === 0) {
    console.error("\n❌ No active strategies available!");
    process.exit(1);
  }

  // Select first active strategy
  const strategy = activeStrategies[0];
  const strategyId = strategy.id;

  console.log("\n" + "=".repeat(80));
  console.log(`🎯 SELECTED STRATEGY: #${strategyId} - ${strategy.name}`);
  console.log("=".repeat(80));

  // Amount to invest
  const INVEST_AMOUNT = ethers.parseUnits("100", 6); // 100 USDC

  // Check if we have enough USDC
  if (usdcBalance < INVEST_AMOUNT) {
    console.error("\n❌ Insufficient USDC balance!");
    console.error(`   Required: ${ethers.formatUnits(INVEST_AMOUNT, 6)} USDC`);
    console.error(`   Available: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
    process.exit(1);
  }

  // Approve USDC if needed
  if (usdcAllowance < INVEST_AMOUNT) {
    console.log("\n" + "=".repeat(80));
    console.log("💰 APPROVING USDC SPENDING");
    console.log("=".repeat(80));

    const approveAmount = INVEST_AMOUNT * 2n; // Approve 2x for future purchases
    console.log(`Approving ${ethers.formatUnits(approveAmount, 6)} USDC...`);

    const approveTx = await USDC.approve(STRATEGY_MANAGER_ADDRESS, approveAmount);
    console.log(`Transaction sent: ${approveTx.hash}`);
    console.log("Waiting for confirmation...");

    const approveReceipt = await approveTx.wait();
    console.log(`✅ Approval successful!`);
    console.log(`   Block: ${approveReceipt?.blockNumber}`);
    console.log(`   Gas used: ${approveReceipt?.gasUsed}`);
  } else {
    console.log(`\n✅ USDC already approved (allowance: ${ethers.formatUnits(usdcAllowance, 6)} USDC)`);
  }

  // Buy strategy
  console.log("\n" + "=".repeat(80));
  console.log("🛒 BUYING STRATEGY");
  console.log("=".repeat(80));

  console.log(`Strategy ID: ${strategyId}`);
  console.log(`Amount: ${ethers.formatUnits(INVEST_AMOUNT, 6)} USDC`);

  const buyTx = await StrategyManager.buyStrategy(strategyId, INVEST_AMOUNT);
  console.log(`Transaction sent: ${buyTx.hash}`);
  console.log("Waiting for confirmation...");

  const buyReceipt = await buyTx.wait();

  if (buyReceipt?.status === 1) {
    console.log(`✅ Strategy purchase successful!`);
    console.log(`   Block: ${buyReceipt.blockNumber}`);
    console.log(`   Gas used: ${buyReceipt.gasUsed}`);

    // Parse events
    console.log("\n📡 EVENTS EMITTED:");

    const iface = StrategyManager.interface;
    for (const log of buyReceipt.logs) {
      try {
        const parsed = iface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });

        if (parsed) {
          if (parsed.name === "StrategyPurchased") {
            console.log(`\n  ✅ StrategyPurchased:`);
            console.log(`     Strategy ID: ${parsed.args.strategyId}`);
            console.log(`     User: ${parsed.args.user}`);
            console.log(`     Gross Amount: ${ethers.formatUnits(parsed.args.grossAmount, 6)} USDC`);
            console.log(`     Net Amount: ${ethers.formatUnits(parsed.args.netAmount, 6)} USDC`);
          }
        }
      } catch {
        // Not a StrategyManager event
      }
    }

    // Check updated balances
    console.log("\n" + "=".repeat(80));
    console.log("💳 UPDATED BALANCES");
    console.log("=".repeat(80));

    const ethBalanceAfter = await ethers.provider.getBalance(signer.address);
    const usdcBalanceAfter = await USDC.balanceOf(signer.address);

    const ethUsed = ethBalance - ethBalanceAfter;
    const usdcUsed = usdcBalance - usdcBalanceAfter;

    console.log(
      `ETH Balance: ${ethers.formatEther(ethBalanceAfter)} ETH (used ${ethers.formatEther(ethUsed)} for gas)`,
    );
    console.log(
      `USDC Balance: ${ethers.formatUnits(usdcBalanceAfter, 6)} USDC (invested ${ethers.formatUnits(usdcUsed, 6)})`,
    );

    // Success
    console.log("\n" + "=".repeat(80));
    console.log("✅ TEST COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(80));
    console.log(`\nTransaction Hash: ${buyTx.hash}`);
    console.log(`View on Arbiscan:`);
    console.log(`https://sepolia.arbiscan.io/tx/${buyTx.hash}`);
  } else {
    console.error("\n❌ Strategy purchase failed!");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
