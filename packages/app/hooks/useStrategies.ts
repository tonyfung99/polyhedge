import { useReadContract, useReadContracts } from "wagmi";
import { arbitrum } from "wagmi/chains";
import { CONTRACTS, StrategyManagerABI } from "@/lib/contracts";

export type Strategy = {
  id: bigint;
  name: string;
  feeBps: bigint;
  maturityTs: bigint;
  active: boolean;
  settled: boolean;
  payoutPerUSDC: bigint;
  details: {
    polymarketOrders: Array<{
      marketId: string;
      isYes: boolean;
      amount: bigint;
      maxPriceBps: bigint;
    }>;
    hedgeOrders: Array<{
      dex: string;
      asset: string;
      isLong: boolean;
      amount: bigint;
      maxSlippageBps: bigint;
    }>;
    expectedProfitBps: bigint;
  };
};

/**
 * Hook to fetch all strategies from StrategyManager contract
 *
 * Since the contract doesn't have a getAllStrategies function,
 * we first read nextStrategyId, then read each strategy individually
 */
export function useStrategies() {
  // First, get the next strategy ID to know how many strategies exist
  const { data: nextStrategyId, isLoading: isLoadingCount } = useReadContract({
    address: CONTRACTS[arbitrum.id].StrategyManager,
    abi: StrategyManagerABI,
    functionName: "nextStrategyId",
    chainId: arbitrum.id,
  });

  // Calculate strategy IDs (from 1 to nextStrategyId-1)
  const strategyIds = nextStrategyId
    ? Array.from({ length: Number(nextStrategyId) - 1 }, (_, i) => i + 1)
    : [];

  // Read all strategies in parallel
  const { data: strategiesData, isLoading: isLoadingStrategies } =
    useReadContracts({
      contracts: strategyIds.map((id) => ({
        address: CONTRACTS[arbitrum.id].StrategyManager,
        abi: StrategyManagerABI,
        functionName: "strategies",
        args: [BigInt(id)],
        chainId: arbitrum.id,
      })),
    });

  // Transform the data into a more usable format
  const strategies: Strategy[] =
    strategiesData
      ?.map((result, index) => {
        if (result.status !== "success" || !result.result) return null;

        const strategyData = result.result as any;

        return {
          id: BigInt(strategyIds[index]),
          name: strategyData[1] as string,
          feeBps: strategyData[2] as bigint,
          maturityTs: strategyData[3] as bigint,
          active: strategyData[4] as boolean,
          settled: strategyData[6] as boolean,
          payoutPerUSDC: strategyData[7] as bigint,
          details: strategyData[5] as Strategy["details"],
        };
      })
      .filter((s): s is Strategy => s !== null) || [];

  return {
    strategies,
    isLoading: isLoadingCount || isLoadingStrategies,
    strategyCount: nextStrategyId ? Number(nextStrategyId) - 1 : 0,
  };
}
