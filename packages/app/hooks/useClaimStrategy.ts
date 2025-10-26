import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { arbitrum } from "wagmi/chains";
import { CONTRACTS, StrategyManagerABI } from "@/lib/contracts";

export function useClaimStrategy() {
  const {
    writeContract: claim,
    data: claimHash,
    isPending: isClaimPending,
    error: claimError,
    reset,
  } = useWriteContract();

  const {
    isLoading: isClaimConfirming,
    isSuccess: isClaimSuccess,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash: claimHash,
  });

  const handleClaim = async (strategyId: bigint) => {
    claim({
      address: CONTRACTS[arbitrum.id].StrategyManager,
      abi: StrategyManagerABI,
      functionName: "claimStrategy",
      args: [strategyId],
      chainId: arbitrum.id,
    });
  };

  return {
    handleClaim,
    isClaimPending,
    isClaimConfirming,
    isClaimSuccess,
    claimError: claimError || confirmError,
    claimHash,
    reset,
    isProcessing: isClaimPending || isClaimConfirming,
  };
}
