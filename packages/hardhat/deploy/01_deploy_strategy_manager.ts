import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

// USDC placeholder; replace per-network if needed
const USDC_BY_NETWORK: Record<string, string> = {
  hardhat: "0x0000000000000000000000000000000000000001", // dummy for local
  localhost: "0x0000000000000000000000000000000000000001",
  polygonAmoy: "0x6a2a6aC3F2a7C0B8A1A1Ff000000000000000000", // TODO: replace
};

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, log } = deployments;

  const { deployer } = await getNamedAccounts();
  const chain = network.name;

  const usdc = USDC_BY_NETWORK[chain] ?? USDC_BY_NETWORK["hardhat"];
  log(`Deploying StrategyManager on ${chain} with USDC: ${usdc}`);

  await deploy("StrategyManager", {
    from: deployer,
    args: [usdc],
    log: true,
    autoMine: true,
    waitConfirmations: 1,
  });
};

export default func;
func.tags = ["StrategyManager"];
