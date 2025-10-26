import { arbitrumSepolia } from "wagmi/chains";

/**
 * Contract addresses by chain ID
 * Configured for Arbitrum Sepolia testnet
 */
export const CONTRACTS = {
  [arbitrumSepolia.id]: {
    // Deployed contract addresses on Arbitrum Sepolia
    StrategyManager: "0xc707d360BEc8048760F028f852cF1E244d155710" as `0x${string}`,
    HedgeExecutor: "0x67b059F3f838Ce25896635AcEd41a2ba5f175446" as `0x${string}`,
    PolygonReceiver: "0x0000000000000000000000000000000000000000" as `0x${string}`,

    // USDC on Arbitrum Sepolia testnet
    USDC: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as `0x${string}`,
  },
} as const;

/**
 * Get contract address for the current chain
 */
export function getContractAddress(
  chainId: number,
  contractName: keyof typeof CONTRACTS[typeof arbitrumSepolia.id]
): `0x${string}` {
  const addresses = CONTRACTS[chainId as keyof typeof CONTRACTS];
  if (!addresses) {
    throw new Error(`No contracts configured for chain ${chainId}`);
  }
  return addresses[contractName];
}
