import { useAccount, useReadContracts } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { CONTRACTS, StrategyManagerABI } from "@/lib/contracts";
import { useStrategies } from "./useStrategies";

export type UserPosition = {
  strategyId: bigint;
  amount: bigint;
  purchaseTs: bigint;
  claimed: boolean;
  // Enriched with strategy data
  strategyName?: string;
  maturityTs?: bigint;
  settled?: boolean;
  payoutPerUSDC?: bigint;
  expectedProfitBps?: bigint;
};

/**
 * Hook to fetch user positions from StrategyManager contract
 *
 * Since the contract doesn't have a getter for all positions,
 * we try reading indices 0-19 (assuming max 20 positions per user)
 * and filter out failed reads.
 */
export function useUserPositions() {
  const { address } = useAccount();
  const { strategies } = useStrategies();

  // Try reading positions at indices 0-19
  const maxPositions = 20;
  const indices = Array.from({ length: maxPositions }, (_, i) => i);

  const { data: positionsData, isLoading } = useReadContracts({
    contracts: address
      ? indices.map((index) => ({
          address: CONTRACTS[arbitrumSepolia.id].StrategyManager,
          abi: StrategyManagerABI,
          functionName: "userPositions",
          args: [address, BigInt(index)],
          chainId: arbitrumSepolia.id,
        }))
      : [],
  });

  // Filter successful reads and transform to UserPosition type
  const positions: UserPosition[] =
    positionsData
      ?.map((result, index) => {
        if (result.status !== "success" || !result.result) return null;

        const positionData = result.result as any;
        const strategyId = positionData[0] as bigint;

        // Find matching strategy to enrich position data
        const strategy = strategies.find((s) => s.id === strategyId);

        return {
          strategyId,
          amount: positionData[1] as bigint,
          purchaseTs: positionData[2] as bigint,
          claimed: positionData[3] as boolean,
          // Enriched data from strategy
          strategyName: strategy?.name,
          maturityTs: strategy?.maturityTs,
          settled: strategy?.settled,
          payoutPerUSDC: strategy?.payoutPerUSDC,
          expectedProfitBps: strategy?.details.expectedProfitBps,
        };
      })
      .filter((p): p is UserPosition => p !== null && p.strategyId > 0n) || [];

  // Calculate totals
  const totalInvested = positions.reduce((sum, p) => sum + p.amount, 0n);

  const totalClaimable = positions.reduce((sum, p) => {
    if (!p.claimed && p.settled && p.payoutPerUSDC) {
      const payout = (p.amount * p.payoutPerUSDC) / 1_000_000n;
      return sum + payout;
    }
    return sum;
  }, 0n);

  const totalClaimed = positions.reduce((sum, p) => {
    if (p.claimed && p.payoutPerUSDC) {
      const payout = (p.amount * p.payoutPerUSDC) / 1_000_000n;
      return sum + payout;
    }
    return sum;
  }, 0n);

  // Calculate unrealized P&L for active positions
  const unrealizedPnL = positions.reduce((sum, p) => {
    if (!p.claimed && !p.settled && p.expectedProfitBps) {
      const expectedProfit = (p.amount * p.expectedProfitBps) / 10_000n;
      return sum + expectedProfit;
    }
    return sum;
  }, 0n);

  // Calculate realized P&L (claimed positions)
  const realizedPnL = positions.reduce((sum, p) => {
    if (p.claimed && p.payoutPerUSDC) {
      const payout = (p.amount * p.payoutPerUSDC) / 1_000_000n;
      const profit = payout - p.amount;
      return sum + profit;
    }
    return sum;
  }, 0n);

  return {
    positions,
    isLoading,
    totalInvested,
    totalClaimable,
    totalClaimed,
    unrealizedPnL,
    realizedPnL,
    totalPnL: unrealizedPnL + realizedPnL,
  };
}
