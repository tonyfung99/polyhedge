import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

// USDC on Arbitrum
const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

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

  log(`Deploying StrategyManager on ${chain} with HedgeExecutor: ${hedgeExecutorAddress}`);

  await deploy("StrategyManager", {
    from: deployer,
    args: [USDC_ARBITRUM, hedgeExecutorAddress],
    log: true,
    autoMine: true,
    waitConfirmations: 1,
  });
};

export default func;
func.tags = ["StrategyManager"];
func.dependencies = ["HedgeExecutor"];
