import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, log } = deployments;

  const { deployer } = await getNamedAccounts();
  const chain = network.name;

  if (chain !== "arbitrum" && chain !== "arbitrumSepolia") {
    log(`⏭️  Skipping HedgeExecutor deployment on ${chain}. Only deploy on Arbitrum.`);
    return;
  }

  log(`Deploying HedgeExecutor on ${chain}`);

  await deploy("HedgeExecutor", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: 1,
  });
};

export default func;
func.tags = ["HedgeExecutor"];
func.skip = async (hre: HardhatRuntimeEnvironment) => {
  const { network } = hre;
  return !["arbitrum", "arbitrumSepolia"].includes(network.name);
};
