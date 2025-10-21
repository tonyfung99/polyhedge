import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

// USDC on Polygon
const USDC_POLYGON = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, log } = deployments;

  const { deployer } = await getNamedAccounts();
  const chain = network.name;

  if (chain !== "polygon" && chain !== "polygonMumbai") {
    log(`⏭️  Skipping PolygonReceiver deployment. Only deploy on Polygon.`);
    return;
  }

  log(`Deploying PolygonReceiver on ${chain} with USDC: ${USDC_POLYGON}`);

  await deploy("PolygonReceiver", {
    from: deployer,
    args: [USDC_POLYGON],
    log: true,
    autoMine: true,
    waitConfirmations: 1,
  });
};

export default func;
func.tags = ["PolygonReceiver"];
