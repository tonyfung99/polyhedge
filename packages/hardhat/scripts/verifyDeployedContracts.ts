/**
 * Script to verify deployed contracts on Arbiscan
 *
 * Usage:
 *   yarn hardhat run scripts/verifyDeployedContracts.ts --network arbitrum
 *   yarn hardhat run scripts/verifyDeployedContracts.ts --network arbitrumSepolia
 */

import { network, run } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🔍 CONTRACT VERIFICATION SCRIPT");
  console.log("=".repeat(80));

  const networkName = network.name;
  console.log(`\nNetwork: ${networkName}`);

  // Get deployment directory
  const deploymentPath = path.join(__dirname, "..", "deployments", networkName);

  if (!fs.existsSync(deploymentPath)) {
    console.error(`\n❌ No deployments found for network: ${networkName}`);
    console.error(`   Expected path: ${deploymentPath}`);
    process.exit(1);
  }

  console.log(`Deployment path: ${deploymentPath}`);

  // Load deployed contracts
  const hedgeExecutorPath = path.join(deploymentPath, "HedgeExecutor.json");
  const strategyManagerPath = path.join(deploymentPath, "StrategyManager.json");

  if (!fs.existsSync(hedgeExecutorPath)) {
    console.error("\n❌ HedgeExecutor deployment not found!");
    process.exit(1);
  }

  if (!fs.existsSync(strategyManagerPath)) {
    console.error("\n❌ StrategyManager deployment not found!");
    process.exit(1);
  }

  const hedgeExecutorDeployment = JSON.parse(fs.readFileSync(hedgeExecutorPath, "utf8"));
  const strategyManagerDeployment = JSON.parse(fs.readFileSync(strategyManagerPath, "utf8"));

  console.log("\n" + "=".repeat(80));
  console.log("📋 DEPLOYED CONTRACTS");
  console.log("=".repeat(80));

  console.log(`\nHedgeExecutor:`);
  console.log(`  Address: ${hedgeExecutorDeployment.address}`);
  console.log(`  Transaction: ${hedgeExecutorDeployment.transactionHash || "N/A"}`);

  console.log(`\nStrategyManager:`);
  console.log(`  Address: ${strategyManagerDeployment.address}`);
  console.log(`  Transaction: ${strategyManagerDeployment.transactionHash || "N/A"}`);

  // Get constructor args
  const hedgeExecutorArgs = hedgeExecutorDeployment.args || [];
  const strategyManagerArgs = strategyManagerDeployment.args || [];

  console.log("\n" + "=".repeat(80));
  console.log("🔧 CONSTRUCTOR ARGUMENTS");
  console.log("=".repeat(80));

  console.log(`\nHedgeExecutor:`);
  console.log(`  exchangeRouter: ${hedgeExecutorArgs[0] || "N/A"}`);
  console.log(`  router: ${hedgeExecutorArgs[1] || "N/A"}`);
  console.log(`  usdc: ${hedgeExecutorArgs[2] || "N/A"}`);

  console.log(`\nStrategyManager:`);
  console.log(`  usdc: ${strategyManagerArgs[0] || "N/A"}`);
  console.log(`  hedgeExecutor: ${strategyManagerArgs[1] || "N/A"}`);

  // Verify contracts
  console.log("\n" + "=".repeat(80));
  console.log("✅ VERIFYING CONTRACTS ON ARBISCAN");
  console.log("=".repeat(80));

  // Verify HedgeExecutor
  console.log(`\n📝 Verifying HedgeExecutor...`);
  try {
    await run("verify:verify", {
      address: hedgeExecutorDeployment.address,
      constructorArguments: hedgeExecutorArgs,
      contract: "contracts/HedgeExecutor.sol:HedgeExecutor",
    });
    console.log(`✅ HedgeExecutor verified!`);
    console.log(
      `   View: https://${networkName === "arbitrum" ? "" : "sepolia."}arbiscan.io/address/${hedgeExecutorDeployment.address}#code`,
    );
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.toLowerCase().includes("already verified")) {
      console.log(`✅ HedgeExecutor already verified!`);
      console.log(
        `   View: https://${networkName === "arbitrum" ? "" : "sepolia."}arbiscan.io/address/${hedgeExecutorDeployment.address}#code`,
      );
    } else {
      console.error(`❌ Error verifying HedgeExecutor: ${err.message}`);
    }
  }

  // Verify StrategyManager
  console.log(`\n📝 Verifying StrategyManager...`);
  try {
    await run("verify:verify", {
      address: strategyManagerDeployment.address,
      constructorArguments: strategyManagerArgs,
      contract: "contracts/StrategyManager.sol:StrategyManager",
    });
    console.log(`✅ StrategyManager verified!`);
    console.log(
      `   View: https://${networkName === "arbitrum" ? "" : "sepolia."}arbiscan.io/address/${strategyManagerDeployment.address}#code`,
    );
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.toLowerCase().includes("already verified")) {
      console.log(`✅ StrategyManager already verified!`);
      console.log(
        `   View: https://${networkName === "arbitrum" ? "" : "sepolia."}arbiscan.io/address/${strategyManagerDeployment.address}#code`,
      );
    } else {
      console.error(`❌ Error verifying StrategyManager: ${err.message}`);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 VERIFICATION SUMMARY");
  console.log("=".repeat(80));

  const explorerUrl = networkName === "arbitrum" ? "arbiscan.io" : "sepolia.arbiscan.io";

  console.log(`\nYour contracts on ${networkName}:`);
  console.log(`\nHedgeExecutor:`);
  console.log(`  ${hedgeExecutorDeployment.address}`);
  console.log(`  https://${explorerUrl}/address/${hedgeExecutorDeployment.address}#code`);

  console.log(`\nStrategyManager:`);
  console.log(`  ${strategyManagerDeployment.address}`);
  console.log(`  https://${explorerUrl}/address/${strategyManagerDeployment.address}#code`);

  console.log("\n" + "=".repeat(80));
  console.log("✅ VERIFICATION COMPLETE!");
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
