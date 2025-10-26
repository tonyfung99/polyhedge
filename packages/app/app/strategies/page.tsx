import { StrategyTable } from "@/components/strategies/StrategyTable";

export default function StrategiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Strategy Marketplace</h1>
        <p className="text-muted-foreground mt-2">
          Browse and purchase hedging strategies combining Polymarket positions with DEX hedges
        </p>
      </div>

      <StrategyTable />
    </div>
  );
}
