"use client";

import { useAccount } from "wagmi";
import { useUserPositions } from "@/hooks/useUserPositions";
import { PnLSummary } from "@/components/dashboard/PnLSummary";
import { PositionsTable } from "@/components/dashboard/PositionsTable";

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const userPositions = useUserPositions();

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Track your strategy positions and claim your winnings
          </p>
        </div>

        <div className="flex items-center justify-center py-16 border rounded-lg">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-muted-foreground">
              Please connect your wallet to view your dashboard
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Track your strategy positions and claim your winnings
        </p>
      </div>

      <PnLSummary
        totalInvested={userPositions.totalInvested}
        unrealizedPnL={userPositions.unrealizedPnL}
        realizedPnL={userPositions.realizedPnL}
        totalClaimable={userPositions.totalClaimable}
      />

      <PositionsTable
        positions={userPositions.positions}
        isLoading={userPositions.isLoading}
      />
    </div>
  );
}
