import { StrategyTable } from "@/components/strategies/StrategyTable";

export default function StrategiesPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Strategy Marketplace</h1>
        <p className="text-muted-foreground mt-2">
          Browse and purchase hedging strategies combining Polymarket positions with DEX hedges
        </p>
      </div>

      <StrategyTable />
    </div>
  );
}
