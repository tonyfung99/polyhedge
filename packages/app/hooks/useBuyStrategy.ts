import { useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { arbitrum } from "wagmi/chains";
import { parseUnits } from "viem";
import { CONTRACTS, StrategyManagerABI } from "@/lib/contracts";

// Minimal ERC20 ABI for approve function
const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export function useBuyStrategy(strategyId: bigint) {
  const { address } = useAccount();
  const [pendingTx, setPendingTx] = useState<"approve" | "buy" | null>(null);

  const strategyManagerAddress = CONTRACTS[arbitrum.id].StrategyManager;
  const usdcAddress = CONTRACTS[arbitrum.id].USDC;

  // Check current USDC allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, strategyManagerAddress] : undefined,
    chainId: arbitrum.id,
  });

  // Approve USDC spending
  const {
    writeContract: approve,
    data: approveHash,
    isPending: isApprovePending,
    error: approveError,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({
      hash: approveHash,
    });

  // Buy strategy
  const {
    writeContract: buy,
    data: buyHash,
    isPending: isBuyPending,
    error: buyError,
  } = useWriteContract();

  const { isLoading: isBuyConfirming, isSuccess: isBuySuccess } =
    useWaitForTransactionReceipt({
      hash: buyHash,
    });

  // Approve USDC spending (max uint256 for simplicity)
  const handleApprove = async (amount: string) => {
    if (!address) return;

    setPendingTx("approve");
    const amountWei = parseUnits(amount, 6); // USDC has 6 decimals

    approve({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [strategyManagerAddress, amountWei],
      chainId: arbitrum.id,
    });
  };

  // Buy strategy
  const handleBuy = async (grossAmount: string) => {
    if (!address) return;

    setPendingTx("buy");
    const amountWei = parseUnits(grossAmount, 6); // USDC has 6 decimals

    buy({
      address: strategyManagerAddress,
      abi: StrategyManagerABI,
      functionName: "buyStrategy",
      args: [strategyId, amountWei],
      chainId: arbitrum.id,
    });
  };

  // Check if approval is needed
  const needsApproval = (amount: string): boolean => {
    if (!allowance) return true;
    const amountWei = parseUnits(amount, 6);
    return allowance < amountWei;
  };

  // Refetch allowance after successful approval
  if (isApproveSuccess && pendingTx === "approve") {
    refetchAllowance();
    setPendingTx(null);
  }

  // Clear pending state after successful buy
  if (isBuySuccess && pendingTx === "buy") {
    setPendingTx(null);
  }

  return {
    // State
    allowance,
    needsApproval,

    // Approve
    handleApprove,
    isApprovePending,
    isApproveConfirming,
    isApproveSuccess,
    approveError,
    approveHash,

    // Buy
    handleBuy,
    isBuyPending,
    isBuyConfirming,
    isBuySuccess,
    buyError,
    buyHash,

    // General
    isProcessing:
      isApprovePending ||
      isApproveConfirming ||
      isBuyPending ||
      isBuyConfirming,
  };
}
