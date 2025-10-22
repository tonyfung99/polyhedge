# Bridge Service Monitoring & Execution Notes

## Overview

The bridge service has been refactored into a **Fastify-based API service** with background workers. It monitors `StrategyManager` contract events via HyperSync and executes Polymarket orders based on strategy definitions.

## Architecture

The service now consists of two main components:

1. **API Server** (Fastify)
   - Health check endpoint (`/health`)
   - Service info endpoint (`/`)
   - Future: Status, metrics, and management endpoints

2. **Background Worker** (Event Monitor)
   - Polls HyperSync for `StrategyPurchased` events
   - Decodes and validates events
   - Triggers strategy execution via executor service
   - Handles errors and retries gracefully

## Key Components

### Server Layer (`src/server.ts`)
- Fastify application setup with CORS support
- RESTful API endpoints for health checks and service info
- Designed for easy extension with additional routes

### Worker Layer (`src/workers/event-monitor.ts`)
- `EventMonitorWorker` class encapsulates the monitoring loop
- Configurable polling intervals and batch sizes
- Graceful start/stop lifecycle management
- Error recovery with automatic retries

### Execution Layer (`src/services/executor.ts`)
- `StrategyPurchaseExecutor` handles strategy-to-order mapping
- Builds Polymarket order intents from strategy definitions
- Coordinates order submission with concurrency control
- Comprehensive error logging with context

### Integration Layer
- **HyperSync Monitoring** (`src/monitoring/`)
  - `config.ts` - Query configuration and topic management
  - `decoder.ts` - Type-safe event log decoding
- **Polymarket Client** (`src/polymarket/client.ts`)
  - CLOB client wrapper with retry logic
  - Rate limiting via concurrency limiter
  - Proper wallet/provider setup for Polygon

### Configuration (`src/config/env.ts`)
- Environment variable validation using Zod
- Strategy definitions loading from JSON
- Type-safe configuration object throughout app

### Utilities (`src/utils/`)
- `logger.ts` - Structured logging with scoped loggers
- `promise.ts` - Async helpers (retry, timeout, concurrency limiter)

## Environment Configuration

### API Server
```bash
PORT=3001              # API server port
HOST=0.0.0.0           # Bind address
```

### Blockchain Monitoring
```bash
HYPERSYNC_ENDPOINT=https://arb-main.hypersync.xyz
HYPERSYNC_FROM_BLOCK=0                  # Optional: Starting block
HYPERSYNC_POLL_INTERVAL_MS=5000         # Optional: Polling interval
HYPERSYNC_BATCH_SIZE=500                # Optional: Events per query

STRATEGY_MANAGER_ADDRESS=0x...          # Required
ARBITRUM_RPC_URL=https://...            # Required
POLYGON_RPC_URL=https://...             # Required (for Polymarket)
```

### Polymarket Integration
```bash
POLYMARKET_PRIVATE_KEY=0x...            # Required
POLYMARKET_HOST=https://clob.polymarket.com
POLYMARKET_CHAIN_ID=137
POLYMARKET_SIGNATURE_TYPE=1
POLYMARKET_FUNDER_ADDRESS=0x...         # Optional

MAX_ORDER_CONCURRENCY=2                 # Rate limiting
```

### Strategy Definitions
```bash
STRATEGY_DEFINITIONS_PATH=./strategies.json  # Optional: path override
```

## Running the Service

### Development
```bash
cd packages/bridge
pnpm install
cp env.sample .env
# Edit .env with your configuration
pnpm dev
```

The service will:
1. Load and validate configuration
2. Start Fastify API server on configured port
3. Launch event monitor worker in background
4. Process events and execute strategies continuously

### Production
```bash
pnpm build
pnpm start
```

### Testing
```bash
# Health check
curl http://localhost:3001/health

# Service info
curl http://localhost:3001/

# Type checking
pnpm run lint
```

## Graceful Shutdown

The service handles SIGTERM and SIGINT signals:
1. Stops the event monitor worker (prevents new event processing)
2. Waits for in-flight operations to complete
3. Closes the Fastify server
4. Exits cleanly with code 0

This ensures no data loss and proper cleanup in containerized environments.

## Event Flow

```
HyperSync → Decode → Validate → Execute → Log
   ↓          ↓         ↓          ↓        ↓
 Query     Event     Strategy  Polymarket  Result
 Logs      Objects   Lookup    Orders
```

1. **HyperSync Query**: Worker polls for `StrategyPurchased` events
2. **Decoding**: Logs are decoded into typed TypeScript objects
3. **Validation**: Strategy definitions are looked up by ID
4. **Execution**: Orders are built and submitted to Polymarket
5. **Logging**: All operations are logged with structured context

## Current Capabilities

✅ Fastify API server with health endpoints
✅ Background HyperSync event monitoring
✅ Type-safe event decoding
✅ Strategy definition management
✅ Polymarket order execution with retry logic
✅ Concurrency limiting for API rate limits
✅ Graceful shutdown handling
✅ Structured logging with log levels
✅ Environment-driven configuration

## Limitations & TODOs

### Not Yet Implemented
- ❌ Bridging logic (LayerZero/Stargate)
- ❌ Hedge execution (GMX, Hyperliquid)
- ❌ Settlement computation and reporting
- ❌ Persistent event/order storage
- ❌ Status reporting back to contract
- ❌ Metrics and monitoring endpoints
- ❌ Webhook support for external events
- ❌ Admin API for strategy management

### Potential Improvements
- [ ] Add PostgreSQL/Redis for persistence
- [ ] Implement exponential backoff for retries
- [ ] Add Prometheus metrics export
- [ ] Set up alerting (PagerDuty, Slack)
- [ ] Implement circuit breakers for external APIs
- [ ] Add rate limiting and authentication to API
- [ ] Create admin dashboard for monitoring
- [ ] Add comprehensive test suite
- [ ] Implement dead-letter queue for failed orders
- [ ] Add order status tracking endpoint

## Architecture Benefits

### Separation of Concerns
- API layer decoupled from event processing
- Workers can be scaled independently
- Clean interfaces between components

### Extensibility
- Easy to add new API endpoints
- Simple to add additional background workers
- Pluggable integration layer

### Reliability
- Graceful error handling throughout
- Automatic retries with backoff
- No tight coupling to external services

### Observability
- Structured logging with context
- Future-ready for metrics export
- Clear error messages for debugging

## Migration Notes

The refactoring from a standalone script to Fastify API involved:

1. **Extraction**: Monitoring loop moved to `EventMonitorWorker` class
2. **Server Addition**: New Fastify server with health endpoint
3. **Lifecycle Management**: Proper start/stop handling for both components
4. **Type Safety**: Fixed TypeScript issues with ethers v6 and HyperSync types
5. **Documentation**: Comprehensive README and implementation guide

## Development Workflow

1. Make changes to source files
2. Run `pnpm run lint` to check types
3. Test locally with `pnpm dev`
4. Build for production with `pnpm build`
5. Deploy compiled `dist/` directory

## Support & Troubleshooting

### Common Issues

**TypeScript Errors**: Run `pnpm run lint` to check
**Worker Not Starting**: Verify HyperSync endpoint and RPC URLs
**Orders Failing**: Check Polymarket credentials and wallet balance
**Port Already in Use**: Change `PORT` in `.env`

### Debug Mode
```bash
LOG_LEVEL=debug pnpm dev
```

For detailed information, see:
- `packages/bridge/README.md` - User guide
- `packages/bridge/IMPLEMENTATION_GUIDE.md` - Developer guide
- `packages/bridge/src/` - Source code with inline comments
