import { arbitrum } from "wagmi/chains";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

/**
 * Contract addresses by chain ID
 * Configured for Arbitrum mainnet
 */
export const CONTRACTS = {
  [arbitrum.id]: {
    // Deployed contract addresses on Arbitrum mainnet
    StrategyManager: (process.env.NEXT_PUBLIC_STRATEGY_MANAGER_ADDRESS ||
      ZERO_ADDRESS) as `0x${string}`,
    HedgeExecutor: (process.env.NEXT_PUBLIC_HEDGE_EXECUTOR_ADDRESS ||
      ZERO_ADDRESS) as `0x${string}`,
    PolygonReceiver: (process.env.NEXT_PUBLIC_POLYGON_RECEIVER_ADDRESS ||
      ZERO_ADDRESS) as `0x${string}`,

    // USDC on Arbitrum mainnet
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`,
  },
} as const;

/**
 * Get contract address for the current chain
 */
export function getContractAddress(
  chainId: number,
  contractName: keyof typeof CONTRACTS[typeof arbitrum.id]
): `0x${string}` {
  const addresses = CONTRACTS[chainId as keyof typeof CONTRACTS];
  if (!addresses) {
    throw new Error(`No contracts configured for chain ${chainId}`);
  }
  const address = addresses[contractName];
  if (!address || address === ZERO_ADDRESS) {
    throw new Error(
      `Missing address for ${String(contractName)} on chain ${chainId}. Check your NEXT_PUBLIC_* environment variables.`
    );
  }
  return address;
}
