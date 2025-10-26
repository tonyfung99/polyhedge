import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

// USDC on Arbitrum (checksummed address)
const USDC_ADDRESSES = {
  arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  arbitrumSepolia: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
};

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, get, log } = deployments;

  const { deployer } = await getNamedAccounts();
  const chain = network.name;

  if (chain !== "arbitrum" && chain !== "arbitrumSepolia") {
    log(`⏭️  Skipping StrategyManager deployment. Only deploy on Arbitrum.`);
    return;
  }

  // Get HedgeExecutor address (must be deployed first)
  let hedgeExecutorAddress: string;
  try {
    const hedgeExecutor = await get("HedgeExecutor");
    hedgeExecutorAddress = hedgeExecutor.address;
  } catch (e) {
    log("❌ HedgeExecutor not deployed yet. Deploy it first.");
    throw e;
  }

  // Get USDC address for the current network
  const usdcAddress = USDC_ADDRESSES[chain as keyof typeof USDC_ADDRESSES];
  if (!usdcAddress) {
    throw new Error(`USDC address not configured for network: ${chain}`);
  }

  log(`Deploying StrategyManager on ${chain} with HedgeExecutor: ${hedgeExecutorAddress}`);
  log(`USDC Token: ${usdcAddress}`);

  await deploy("StrategyManager", {
    from: deployer,
    args: [usdcAddress, hedgeExecutorAddress],
    log: true,
    autoMine: true,
    waitConfirmations: 1,
  });
};

export default func;
func.tags = ["StrategyManager"];
func.dependencies = ["HedgeExecutor"];
