"use client";

import { useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPosition } from "@/hooks/useUserPositions";
import { useClaimStrategy } from "@/hooks/useClaimStrategy";
import { formatUnits } from "viem";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface PositionsTableProps {
  positions: UserPosition[];
  isLoading: boolean;
}

function formatTimestamp(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PositionRow({ position }: { position: UserPosition }) {
  const claim = useClaimStrategy();

  const amountUSDC = parseFloat(formatUnits(position.amount, 6));
  const now = Math.floor(Date.now() / 1000);
  const isMatured = position.maturityTs
    ? Number(position.maturityTs) < now
    : false;

  // Calculate payout/P&L
  let payout = 0;
  let pnl = 0;
  if (position.settled && position.payoutPerUSDC) {
    payout = parseFloat(
      formatUnits((position.amount * position.payoutPerUSDC) / 1_000_000n, 6)
    );
    pnl = payout - amountUSDC;
  } else if (position.expectedProfitBps) {
    // Unrealized P&L
    pnl = parseFloat(
      formatUnits((position.amount * position.expectedProfitBps) / 10_000n, 6)
    );
  }

  const canClaim = !position.claimed && position.settled && isMatured;

  // Show success toast when claim succeeds
  useEffect(() => {
    if (claim.isClaimSuccess) {
      toast.success("Claim Successful!", {
        description: `You've claimed $${payout.toFixed(2)} USDC`,
      });
      claim.reset();
    }
  }, [claim.isClaimSuccess]);

  // Show error toast if claim fails
  useEffect(() => {
    if (claim.claimError) {
      toast.error("Claim Failed", {
        description: claim.claimError.message,
      });
    }
  }, [claim.claimError]);

  // Status badge
  let statusBadge;
  if (position.claimed) {
    statusBadge = (
      <Badge variant="secondary">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Claimed
      </Badge>
    );
  } else if (position.settled) {
    statusBadge = <Badge variant="default">Settled</Badge>;
  } else if (isMatured) {
    statusBadge = <Badge variant="outline">Matured</Badge>;
  } else {
    statusBadge = <Badge variant="default">Active</Badge>;
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        #{position.strategyId.toString()}
      </TableCell>
      <TableCell>{position.strategyName || "Unknown"}</TableCell>
      <TableCell>${amountUSDC.toFixed(2)}</TableCell>
      <TableCell>
        {position.maturityTs ? formatTimestamp(position.maturityTs) : "N/A"}
      </TableCell>
      <TableCell>
        {position.settled ? (
          <span className={pnl >= 0 ? "text-green-600" : "text-red-600"}>
            {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
          </span>
        ) : (
          <span className="text-muted-foreground">
            +${pnl.toFixed(2)} (est.)
          </span>
        )}
      </TableCell>
      <TableCell>
        {position.settled && position.payoutPerUSDC
          ? `$${payout.toFixed(2)}`
          : "TBD"}
      </TableCell>
      <TableCell>{statusBadge}</TableCell>
      <TableCell>
        {canClaim ? (
          <Button
            size="sm"
            onClick={() => claim.handleClaim(position.strategyId)}
            disabled={claim.isProcessing}
          >
            {claim.isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Claiming...
              </>
            ) : (
              "Claim"
            )}
          </Button>
        ) : position.claimed ? (
          <span className="text-sm text-muted-foreground">-</span>
        ) : (
          <Button size="sm" disabled>
            Not Ready
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export function PositionsTable({ positions, isLoading }: PositionsTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading positions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (positions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">
                No positions yet. Visit the marketplace to get started!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Positions ({positions.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Strategy ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Invested</TableHead>
              <TableHead>Maturity</TableHead>
              <TableHead>P&L</TableHead>
              <TableHead>Payout</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((position, index) => (
              <PositionRow
                key={`${position.strategyId}-${index}`}
                position={position}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
