"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStrategies, type Strategy } from "@/hooks/useStrategies";
import { BuyStrategyDialog } from "./BuyStrategyDialog";
import { ShoppingCart } from "lucide-react";

function formatTimestamp(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStrategyStatus(strategy: Strategy): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  if (strategy.settled) {
    return { label: "Settled", variant: "secondary" };
  }
  if (!strategy.active) {
    return { label: "Inactive", variant: "destructive" };
  }
  const now = Math.floor(Date.now() / 1000);
  if (Number(strategy.maturityTs) < now) {
    return { label: "Matured", variant: "outline" };
  }
  return { label: "Active", variant: "default" };
}

function StrategyRow({
  strategy,
  onBuyClick,
}: {
  strategy: Strategy;
  onBuyClick: (strategy: Strategy) => void;
}) {
  const status = getStrategyStatus(strategy);
  const profitPercent = (Number(strategy.details.expectedProfitBps) / 100).toFixed(
    2
  );
  const feePercent = (Number(strategy.feeBps) / 100).toFixed(2);

  // Summarize position types
  const hasPolymarket = strategy.details.polymarketOrders.length > 0;
  const hasHedge = strategy.details.hedgeOrders.length > 0;
  let positionType = "Unknown";
  if (hasPolymarket && hasHedge) {
    positionType = "Poly + Hedge";
  } else if (hasPolymarket) {
    positionType = "Polymarket";
  } else if (hasHedge) {
    positionType = "Hedge Only";
  }

  const canPurchase = strategy.active && !strategy.settled;

  return (
    <TableRow>
      <TableCell className="font-medium">#{strategy.id.toString()}</TableCell>
      <TableCell>{strategy.name}</TableCell>
      <TableCell>{positionType}</TableCell>
      <TableCell>{formatTimestamp(strategy.maturityTs)}</TableCell>
      <TableCell className="text-green-600">+{profitPercent}%</TableCell>
      <TableCell className="text-muted-foreground">{feePercent}%</TableCell>
      <TableCell>
        <Badge variant={status.variant}>{status.label}</Badge>
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          onClick={() => onBuyClick(strategy)}
          disabled={!canPurchase}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Buy
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function StrategyTable() {
  const { strategies, isLoading, strategyCount } = useStrategies();
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Available Strategies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading strategies...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (strategyCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Available Strategies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">
              No strategies available yet. Check back soon!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Available Strategies ({strategyCount})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Strategy Name</TableHead>
                <TableHead>Position Type</TableHead>
                <TableHead>Maturity Date</TableHead>
                <TableHead>Expected Profit</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {strategies.map((strategy) => (
                <StrategyRow
                  key={strategy.id.toString()}
                  strategy={strategy}
                  onBuyClick={setSelectedStrategy}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedStrategy && (
        <BuyStrategyDialog
          strategy={selectedStrategy}
          open={!!selectedStrategy}
          onOpenChange={(open) => !open && setSelectedStrategy(null)}
        />
      )}
    </>
  );
}
