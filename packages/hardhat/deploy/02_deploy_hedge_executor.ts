import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

// GMX V2 Contract Addresses on Arbitrum Mainnet
const GMX_ADDRESSES = {
  arbitrum: {
    exchangeRouter: "0x7C68C7E1CDBdD30B08C1c5433f385E814fAc2b9E",
    router: "0x549352201EB5eba6cdc235D127cAe56d2145DAAF",
    usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  },
  arbitrumSepolia: {
    // Sepolia testnet addresses (if available)
    exchangeRouter: "0x657F9215FA1e839FbA15cF44B1C00D95cF71ed10",
    router: "0x72F13a44C8ba16a678CAD549F17bc9e06d2B8bD2",
    usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  },
};

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

  // Get GMX addresses for the current network
  const gmxAddresses = GMX_ADDRESSES[chain as keyof typeof GMX_ADDRESSES];
  if (!gmxAddresses) {
    throw new Error(`GMX addresses not configured for network: ${chain}`);
  }

  const { exchangeRouter, router, usdc } = gmxAddresses;

  log(`GMX ExchangeRouter: ${exchangeRouter}`);
  log(`GMX Router: ${router}`);
  log(`USDC Token: ${usdc}`);

  const deploymentResult = await deploy("HedgeExecutor", {
    from: deployer,
    args: [exchangeRouter, router, usdc],
    log: true,
    autoMine: true,
    waitConfirmations: 1,
  });

  log(`✅ HedgeExecutor deployed at: ${deploymentResult.address}`);
};

export default func;
func.tags = ["HedgeExecutor"];
func.skip = async (hre: HardhatRuntimeEnvironment) => {
  const { network } = hre;
  return !["arbitrum", "arbitrumSepolia"].includes(network.name);
};
