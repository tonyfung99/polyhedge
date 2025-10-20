# Bridge Service Monitoring & Execution Notes

## Overview

This document captures the current uncommitted work on the bridge service. The focus of this iteration was to wire up HyperSync-based monitoring of `StrategyManager` events and connect them to Polymarket order execution logic.

## Key Changes

- Added an environment-driven configuration loader (`packages/bridge/src/config/env.ts`) that validates HyperSync endpoints, RPC URLs, and Polymarket credentials using zod, and loads strategy definitions from `strategies.json`.
- Implemented HyperSync monitoring loop (`packages/bridge/src/index.ts`) that streams `StrategyPurchased` events, decodes them, and triggers execution.
- Introduced monitoring utilities:
  - `packages/bridge/src/monitoring/config.ts` builds the HyperSync query configuration (topics, field selection, polling parameters).
  - `packages/bridge/src/monitoring/decoder.ts` converts HyperSync logs to strongly-typed `StrategyPurchasedEvent` objects.
- Created strategy typing and helpers (`packages/bridge/src/types.ts`) to represent strategy definitions, order intents, and event payloads.
- Added executor service (`packages/bridge/src/services/executor.ts`) that maps events to configured strategies and constructs Polymarket order intents.
- Implemented Polymarket client wrapper (`packages/bridge/src/polymarket/client.ts`) with simple concurrency limiting and retry behaviour for order submission via the official CLOB client.
- Added minimal utilities:
  - `packages/bridge/src/utils/logger.ts` provides scoped logging with log-level filtering.
  - `packages/bridge/src/utils/promise.ts` contains timeout, retry, and concurrency limiter helpers.
- Updated TypeScript config to support JSON imports and emit to `dist`.
- Dependencies: ensured `@polymarket/clob-client`, `@envio-dev/hypersync-client`, `zod`, and `ethers` are installed at the package level. Removed earlier experimental deps (axios, bignumber.js, p-limit, p-retry) after custom helpers were added.

## Environment Expectations

The service expects the following environment variables (see `env.ts` for validation details):

- `HYPERSYNC_ENDPOINT` – Envio HyperSync endpoint URL.
- `HYPERSYNC_FROM_BLOCK`, `HYPERSYNC_POLL_INTERVAL_MS`, `HYPERSYNC_BATCH_SIZE` – optional overrides for monitoring behaviour.
- `STRATEGY_MANAGER_ADDRESS`, `ARBITRUM_RPC_URL`, `POLYGON_RPC_URL` – base chain configuration.
- `POLYMARKET_PRIVATE_KEY` (required), optional API key/secret/passphrase/signature type, funder address.

Additionally, `strategies.json` (path configurable via `STRATEGY_DEFINITIONS_PATH`) should describe each strategy, its Polymarket market allocations, and maximum prices.

## Current Limitations / Next Steps

- Bridging and hedge execution remain placeholders (only Polymarket order execution is implemented).
- No persistence or status reporting back to the contract yet — errors are logged but not surfaced on-chain.
- Testing harness absent; running `pnpm dev` requires valid RPC/endpoints/keys.
- Consider adding structured error handling around HyperSync pagination and Polymarket API responses.

## How to Run

1. Populate `.env` with the required variables.
2. Provide `strategies.json` in the project root (or override path via `STRATEGY_DEFINITIONS_PATH`).
3. Install deps: `cd packages/bridge && pnpm install`.
4. Start the service: `pnpm dev` (ensure HyperSync endpoint and RPCs are reachable).

This document should give the next contributor enough context to continue enhancing the bridge service.

