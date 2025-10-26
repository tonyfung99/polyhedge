"use client";

import { useState, useEffect } from "react";
import { Strategy } from "@/hooks/useStrategies";
import { useBuyStrategy } from "@/hooks/useBuyStrategy";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface BuyStrategyDialogProps {
  strategy: Strategy;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BuyStrategyDialog({
  strategy,
  open,
  onOpenChange,
}: BuyStrategyDialogProps) {
  const [amount, setAmount] = useState("");
  const buyStrategy = useBuyStrategy(strategy.id);

  const grossAmount = parseFloat(amount) || 0;
  const feeAmount = (grossAmount * Number(strategy.feeBps)) / 10_000;
  const netAmount = grossAmount - feeAmount;
  const expectedProfit =
    (netAmount * Number(strategy.details.expectedProfitBps)) / 10_000;

  const isValidAmount = grossAmount > 0;
  const needsApproval = isValidAmount && buyStrategy.needsApproval(amount);

  // Reset dialog state when closing
  useEffect(() => {
    if (!open) {
      setAmount("");
    }
  }, [open]);

  // Close dialog after successful purchase
  useEffect(() => {
    if (buyStrategy.isBuySuccess) {
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    }
  }, [buyStrategy.isBuySuccess, onOpenChange]);

  const handleApprove = () => {
    buyStrategy.handleApprove(amount);
  };

  const handleBuy = () => {
    buyStrategy.handleBuy(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Purchase Strategy</DialogTitle>
          <DialogDescription>
            {strategy.name}
          </DialogDescription>
        </DialogHeader>

        {buyStrategy.isBuySuccess ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Purchase Successful!</h3>
            <p className="text-sm text-muted-foreground">
              Your strategy purchase is confirmed.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              {/* Strategy Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Expected Profit</p>
                  <p className="text-lg font-semibold text-green-600">
                    +{(Number(strategy.details.expectedProfitBps) / 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Platform Fee</p>
                  <p className="text-lg font-semibold">
                    {(Number(strategy.feeBps) / 100).toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">Investment Amount (USDC)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={buyStrategy.isProcessing}
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Breakdown */}
              {isValidAmount && (
                <div className="space-y-2 p-4 border rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Gross Amount</span>
                    <span className="font-medium">{grossAmount.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Platform Fee</span>
                    <span className="font-medium">-{feeAmount.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t pt-2">
                    <span>Net Investment</span>
                    <span>{netAmount.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Expected Payout</span>
                    <span>+{expectedProfit.toFixed(2)} USDC</span>
                  </div>
                </div>
              )}

              {/* Error Messages */}
              {(buyStrategy.approveError || buyStrategy.buyError) && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <p className="text-sm text-destructive">
                    {buyStrategy.approveError?.message || buyStrategy.buyError?.message}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              {needsApproval ? (
                <Button
                  onClick={handleApprove}
                  disabled={!isValidAmount || buyStrategy.isProcessing}
                  className="w-full"
                >
                  {buyStrategy.isApprovePending || buyStrategy.isApproveConfirming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {buyStrategy.isApprovePending ? "Approving..." : "Confirming..."}
                    </>
                  ) : (
                    "Approve USDC"
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleBuy}
                  disabled={!isValidAmount || buyStrategy.isProcessing}
                  className="w-full"
                >
                  {buyStrategy.isBuyPending || buyStrategy.isBuyConfirming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {buyStrategy.isBuyPending ? "Purchasing..." : "Confirming..."}
                    </>
                  ) : (
                    "Purchase Strategy"
                  )}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
