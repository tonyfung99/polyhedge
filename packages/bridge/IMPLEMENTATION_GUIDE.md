# Bridge Service Implementation Guide

## Quick Start

The bridge service has been refactored into a Fastify-based API with background workers.

### Architecture Overview

```
┌─────────────────────────────────────────┐
│         Fastify API Server              │
│  - Health check endpoint                │
│  - Service info endpoint                │
│  - Future: Status/metrics endpoints     │
└─────────────────────────────────────────┘
                  │
                  │ runs alongside
                  │
┌─────────────────────────────────────────┐
│      Event Monitor Worker               │
│                                         │
│  HyperSync ──> Decode ──> Execute       │
│    Loop         Logs      Strategies    │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  StrategyPurchaseExecutor         │ │
│  │  - Maps events to strategies      │ │
│  │  - Builds Polymarket orders       │ │
│  │  - Executes via CLOB client       │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## File Structure

### Core Files

- **`src/index.ts`** - Main entry point
  - Loads configuration
  - Starts Fastify server
  - Launches event monitor worker
  - Handles graceful shutdown

- **`src/server.ts`** - Fastify server setup
  - Configures CORS
  - Defines API routes
  - Health check endpoint

- **`src/workers/event-monitor.ts`** - Background worker
  - Polls HyperSync for events
  - Decodes `StrategyPurchased` logs
  - Triggers strategy execution
  - Handles errors and retries

### Services & Utilities

- **`src/services/executor.ts`** - Strategy execution logic
  - Maps events to strategy definitions
  - Builds Polymarket order intents
  - Coordinates order submission

- **`src/monitoring/`** - Event monitoring utilities
  - `config.ts` - HyperSync query configuration
  - `decoder.ts` - Event log decoding

- **`src/polymarket/client.ts`** - Polymarket integration
  - CLOB client wrapper
  - Order submission with retry logic
  - Rate limiting

- **`src/config/env.ts`** - Configuration management
  - Environment variable validation (zod)
  - Strategy definitions loading
  - RPC and API endpoint setup

- **`src/utils/`** - Helper utilities
  - `logger.ts` - Structured logging
  - `promise.ts` - Async utilities (retry, timeout, concurrency)

## Environment Configuration

### Required Variables

```bash
# API Server
PORT=3001
HOST=0.0.0.0

# Blockchain Monitoring
HYPERSYNC_ENDPOINT=https://arb-main.hypersync.xyz
STRATEGY_MANAGER_ADDRESS=0x...
ARBITRUM_RPC_URL=https://...
POLYGON_RPC_URL=https://...

# Polymarket
POLYMARKET_PRIVATE_KEY=0x...
POLYMARKET_HOST=https://clob.polymarket.com
POLYMARKET_CHAIN_ID=137
```

### Optional Variables

```bash
# Logging
LOG_LEVEL=info  # debug | info | warn | error

# HyperSync Tuning
HYPERSYNC_FROM_BLOCK=0
HYPERSYNC_POLL_INTERVAL_MS=5000
HYPERSYNC_BATCH_SIZE=500

# Polymarket Advanced
POLYMARKET_API_KEY=
POLYMARKET_API_SECRET=
POLYMARKET_API_PASSPHRASE=
POLYMARKET_SIGNATURE_TYPE=1
POLYMARKET_FUNDER_ADDRESS=0x...

# Execution
MAX_ORDER_CONCURRENCY=2

# Strategy Definitions
STRATEGY_DEFINITIONS_PATH=./strategies.json
```

## Strategy Definitions Format

Create `strategies.json` with this structure:

```json
{
  "1": {
    "strategyId": 1,
    "name": "Example Strategy",
    "polymarketOrders": [
      {
        "marketId": "0x1234...",
        "isYes": true,
        "notionalBps": 5000,
        "maxPriceBps": 7500
      }
    ]
  }
}
```

## Running the Service

### Development Mode
```bash
pnpm dev
```

### Production Mode
```bash
pnpm build
pnpm start
```

### Testing
```bash
# Check health
curl http://localhost:3001/health

# Get service info
curl http://localhost:3001/
```

## Event Flow

1. **Event Detection**
   - HyperSync polls for `StrategyPurchased` events
   - Events are decoded into typed TypeScript objects

2. **Strategy Lookup**
   - Event `strategyId` is matched against loaded strategy definitions
   - If no strategy found, warning is logged and event is skipped

3. **Order Building**
   - Strategy orders are mapped to Polymarket intents
   - Notional amounts are calculated based on `netAmount` and `notionalBps`
   - Price limits are validated

4. **Execution**
   - Orders are submitted to Polymarket CLOB
   - Retry logic handles transient failures
   - Concurrency limits prevent API rate limiting

5. **Error Handling**
   - Errors are logged with context
   - Event loop continues despite individual failures
   - Service remains running for subsequent events

## Graceful Shutdown

The service handles signals properly:

```typescript
SIGTERM / SIGINT → stop worker → close server → exit(0)
```

This ensures:
- No events are lost mid-processing
- In-flight HTTP requests complete
- Clean termination for orchestrators (Docker, K8s)

## Extending the Service

### Adding New API Endpoints

Edit `src/server.ts`:

```typescript
fastify.get('/api/strategies', async (request, reply) => {
  // Your handler logic
  return { strategies: [...] };
});
```

### Adding New Workers

1. Create `src/workers/your-worker.ts`
2. Implement start/stop methods
3. Launch from `src/index.ts`

Example:

```typescript
// In src/index.ts
const yourWorker = new YourWorker(appConfig);
yourWorker.start().catch(...);

// In shutdown handler
yourWorker.stop();
```

### Adding New Integrations

1. Create client wrapper in `src/clients/` or `src/[integration-name]/`
2. Add configuration to `src/config/env.ts`
3. Wire up in `src/services/executor.ts`

## Current Limitations

- **No persistence**: Events are processed in-memory only
- **No status reporting**: Failed executions aren't reported on-chain
- **Polymarket only**: Hedge execution (GMX, Hyperliquid) not yet implemented
- **No bridging**: LayerZero/Stargate integration pending
- **Basic retry logic**: Could be enhanced with exponential backoff, dead-letter queues

## Future Enhancements

- [ ] Add `/api/status` endpoint showing worker health and metrics
- [ ] Implement event/order persistence (PostgreSQL or Redis)
- [ ] Add webhook support for external event sources
- [ ] Implement bridging via LayerZero/Stargate
- [ ] Add GMX and Hyperliquid hedge execution
- [ ] Settlement computation and on-chain reporting
- [ ] Prometheus metrics export
- [ ] Structured alerting (PagerDuty, Slack)
- [ ] Admin API for strategy management
- [ ] Rate limiting and authentication

## Troubleshooting

### Worker Not Starting
- Check `HYPERSYNC_ENDPOINT` is reachable
- Verify `STRATEGY_MANAGER_ADDRESS` is correct
- Ensure RPC URLs are valid

### Orders Not Executing
- Verify `POLYMARKET_PRIVATE_KEY` has funds
- Check Polymarket API connectivity
- Review `strategies.json` format and market IDs
- Look for error logs with context

### API Server Issues
- Ensure `PORT` is not in use
- Check firewall rules if accessing remotely
- Verify `HOST` binding (0.0.0.0 vs 127.0.0.1)

## Support

For questions or issues:
1. Check logs with `LOG_LEVEL=debug`
2. Review this guide and README
3. Examine source code comments
4. Open an issue in the repository
