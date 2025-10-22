# Bridge API Service

A Fastify-based API service that monitors `StrategyManager` contract events and coordinates off-chain execution:

- **API Server**: Provides health checks and monitoring endpoints
- **Background Worker**: Listens to blockchain events via HyperSync
- **Execution Engine**: Executes Polymarket orders and manages strategy execution
- Bridge funds to hedging chains (LayerZero/Stargate) - *Coming soon*
- Execute hedge orders (GMX/Hyperliquid) - *Coming soon*
- Settlement computation and on-chain reporting - *Coming soon*

## Architecture

```
packages/bridge/
├── src/
│   ├── index.ts                 # Main entry: starts server + workers
│   ├── server.ts                # Fastify API server setup
│   ├── workers/
│   │   └── event-monitor.ts     # Background HyperSync event listener
│   ├── services/
│   │   └── executor.ts          # Strategy execution orchestrator
│   ├── monitoring/
│   │   ├── config.ts            # HyperSync query configuration
│   │   └── decoder.ts           # Event log decoder
│   ├── polymarket/
│   │   └── client.ts            # Polymarket CLOB client wrapper
│   ├── config/
│   │   └── env.ts               # Environment validation & config loader
│   ├── utils/
│   │   ├── logger.ts            # Structured logging
│   │   └── promise.ts           # Async utilities
│   └── types.ts                 # TypeScript type definitions
├── package.json
└── README.md
```

## API Endpoints

| Method | Path       | Description                     |
|--------|------------|---------------------------------|
| GET    | /          | Service info and available endpoints |
| GET    | /health    | Health check (status, timestamp) |

## Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure environment**:
   Copy `env.sample` to `.env` and fill in your values:
   ```bash
   cp env.sample .env
   ```

   Required variables:
   - `HYPERSYNC_ENDPOINT` - HyperSync endpoint for event monitoring
   - `STRATEGY_MANAGER_ADDRESS` - StrategyManager contract address
   - `ARBITRUM_RPC_URL`, `POLYGON_RPC_URL` - Chain RPC endpoints
   - `POLYMARKET_PRIVATE_KEY` - Private key for Polymarket trading
   - `PORT`, `HOST` - API server configuration (defaults: 3001, 0.0.0.0)

3. **Provide strategy definitions**:
   Create `strategies.json` with your strategy configurations (or set `STRATEGY_DEFINITIONS_PATH`)

## Run

### Development
```bash
pnpm dev
```

### Production
```bash
pnpm build
pnpm start
```

The service will:
1. Start the Fastify API server on the configured port (default: 3001)
2. Begin monitoring blockchain events in the background
3. Execute Polymarket orders when `StrategyPurchased` events are detected

## Testing the API

```bash
# Health check
curl http://localhost:3001/health

# Service info
curl http://localhost:3001/
```

## Graceful Shutdown

The service handles SIGTERM and SIGINT signals gracefully:
- Stops the event monitor worker
- Closes the API server
- Waits for in-flight requests to complete

Press `Ctrl+C` to trigger a graceful shutdown.

## Logging

Configure log level via `LOG_LEVEL` environment variable:
- `debug` - Verbose output for development
- `info` - Standard operational information (default)
- `warn` - Warning messages only
- `error` - Error messages only

## Next Steps

- [ ] Add status/metrics endpoint showing worker health
- [ ] Implement bridging logic (LayerZero/Stargate)
- [ ] Add hedge execution clients (GMX, Hyperliquid)
- [ ] Implement settlement computation
- [ ] Add webhook endpoints for external events
- [ ] Set up monitoring and alerting
