# Bridge Executor Service

This service listens to `StrategyManager` contract events and coordinates off-chain execution:

- Execute Polymarket orders for the strategy legs on Polygon
- Bridge funds to the hedging chain (e.g., Arbitrum) via LayerZero/Stargate
- Execute hedge orders on GMX/Hyperliquid
- After closing all legs at/after maturity, compute payoutPerUSDC and call `settleStrategy`

## Structure

```
packages/bridge/
├── src/
│   ├── index.ts            # Entry: event listener
│   ├── executor.ts         # Orchestrates polymarket + hedge execution
│   ├── polymarket.ts       # Polymarket CLOB client wrapper (stub)
│   ├── gmx.ts              # GMX client wrapper (stub)
│   ├── hyperliquid.ts      # Hyperliquid client wrapper (stub)
│   ├── bridge.ts           # LayerZero/Stargate wrapper (stub)
│   └── settlement.ts       # Payout calculation + settleStrategy
├── package.json
└── README.md
```

## Run (dev)

```
pnpm install
pnpm dev
```

Configure `.env` with RPCs, private keys, API keys.


