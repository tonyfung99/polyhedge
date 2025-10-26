"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUnits } from "viem";
import { TrendingUp, Wallet, DollarSign, Gift } from "lucide-react";

interface PnLSummaryProps {
  totalInvested: bigint;
  unrealizedPnL: bigint;
  realizedPnL: bigint;
  totalClaimable: bigint;
}

export function PnLSummary({
  totalInvested,
  unrealizedPnL,
  realizedPnL,
  totalClaimable,
}: PnLSummaryProps) {
  const totalPnL = unrealizedPnL + realizedPnL;
  const totalInvestedNum = parseFloat(formatUnits(totalInvested, 6));
  const totalPnLNum = parseFloat(formatUnits(totalPnL, 6));
  const unrealizedPnLNum = parseFloat(formatUnits(unrealizedPnL, 6));
  const realizedPnLNum = parseFloat(formatUnits(realizedPnL, 6));
  const totalClaimableNum = parseFloat(formatUnits(totalClaimable, 6));

  const totalPnLPercent =
    totalInvestedNum > 0 ? (totalPnLNum / totalInvestedNum) * 100 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Invested */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Invested
          </CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground/60" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">
            ${totalInvestedNum.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">USDC</p>
        </CardContent>
      </Card>

      {/* Total P&L */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total P&L
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground/60" />
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold tracking-tight ${
              totalPnLNum >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
            }`}
          >
            {totalPnLNum >= 0 ? "+" : ""}${totalPnLNum.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalPnLPercent >= 0 ? "+" : ""}
            {totalPnLPercent.toFixed(2)}%
          </p>
        </CardContent>
      </Card>

      {/* Unrealized P&L */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Unrealized P&L
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground/60" />
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold tracking-tight ${
              unrealizedPnLNum >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
            }`}
          >
            {unrealizedPnLNum >= 0 ? "+" : ""}${unrealizedPnLNum.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Active positions</p>
        </CardContent>
      </Card>

      {/* Claimable Amount */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Claimable
          </CardTitle>
          <Gift className="h-4 w-4 text-muted-foreground/60" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-500">
            ${totalClaimableNum.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Ready to claim</p>
        </CardContent>
      </Card>
    </div>
  );
}
