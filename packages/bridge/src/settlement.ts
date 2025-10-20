export function computePayoutPerUSDC(realizedPnLUsd: number, totalNetPrincipalUsd: number): number {
  if (totalNetPrincipalUsd <= 0) return 0;
  // payout factor with 6 decimals (e.g., 1.08 USDC per 1 USDC => 1_080_000)
  const factor = (totalNetPrincipalUsd + realizedPnLUsd) / totalNetPrincipalUsd;
  return Math.floor(factor * 1_000_000);
}


