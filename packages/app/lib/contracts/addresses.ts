import { arbitrum } from "wagmi/chains";

/**
 * Contract addresses by chain ID
 *
 * TODO: Update with actual deployed contract addresses
 * Get these from your team after deployment
 */
export const CONTRACTS = {
  [arbitrum.id]: {
    // TODO: Replace with actual StrategyManager address
    StrategyManager: "0x0000000000000000000000000000000000000000" as `0x${string}`,

    // TODO: Replace with actual HedgeExecutor address
    HedgeExecutor: "0x0000000000000000000000000000000000000000" as `0x${string}`,

    // TODO: Replace with actual PolygonReceiver address
    PolygonReceiver: "0x0000000000000000000000000000000000000000" as `0x${string}`,

    // USDC on Arbitrum (official address)
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
  return addresses[contractName];
}
