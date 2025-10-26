# Market Maturity Monitor - Polymarket API Integration

## Overview

Implemented the `fetchMarketInfo()` function in `MarketMaturityMonitor` to query real market data from Polymarket's CLOB API.

## Implementation Details

### API Endpoint

```typescript
GET https://clob.polymarket.com/markets/{marketId}
```

### Request

```typescript
const response = await fetch(
  `${this.config.polymarketHost}/markets/${marketId}`,
  {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  }
);
```

### Response Parsing

The function handles multiple timestamp formats from the Polymarket API:

1. **Unix timestamp** (number): Converted to ISO string

   ```typescript
   endDate = new Date(endTime * 1000).toISOString();
   ```

2. **ISO string** (string): Used as-is
   ```typescript
   endDate = endTime;
   ```

### Fields Extracted

- `marketId`: Market identifier (token ID)
- `endDate`: Market end time (ISO 8601 string)
- `active`: Whether market is currently active
- `closed`: Whether market has closed

## Reference Implementation

Based on the Python implementation in:

```
packages/python/scanner/bridge_polymarket_client.py
```

Key similarities:

- Uses same base URL: `https://clob.polymarket.com`
- Same endpoint pattern: `/markets/{marketId}`
- Handles similar response fields: `endTime`, `active`, `closed`

## Usage Flow

1. **Initialization**: Monitor tracks all markets from strategy definitions
2. **Polling**: Every 5 seconds (configurable), fetches market info for each tracked market
3. **Market Closure Detection**:
   - Checks `closed` flag from API
   - Checks if `endDate` has passed
4. **Settlement**: When a market closes, triggers position closing via `PositionCloser`

## Error Handling

- Returns `null` if API request fails
- Logs warnings for non-200 responses
- Logs errors with full stack traces
- Continues monitoring other markets if one fails

## Example Log Output

```typescript
// Successful fetch
{
  scope: 'market-maturity-monitor',
  message: 'Market info fetched successfully',
  meta: {
    marketId: '21742633143463906290569050155826241533067272736897614950488156847949938836455',
    endDate: '2025-10-31T23:59:59.000Z',
    active: true,
    closed: false
  }
}

// Market closure detected
{
  scope: 'market-maturity-monitor',
  message: 'Market closed, triggering settlement',
  meta: {
    marketId: '21742633143463906290569050155826241533067272736897614950488156847949938836455',
    strategyId: '1',
    endDate: '2025-10-31T23:59:59.000Z'
  }
}
```

## Testing

### With Real Market IDs

Update `strategies.json` with real Polymarket token IDs:

```json
{
  "marketId": "21742633143463906290569050155826241533067272736897614950488156847949938836455",
  "outcome": "YES",
  "priority": 1,
  "notionalBps": 5000,
  "maxPriceBps": 7500
}
```

### Enable Production Mode

In `.env`:

```bash
TEST_MODE=false
```

### Monitor Logs

```bash
cd packages/bridge
yarn dev
```

Look for:

- "Fetching market info" debug logs
- "Market info fetched successfully" on successful API calls
- "Market closed, triggering settlement" when markets close

## API Documentation

For more details on the Polymarket CLOB API:

- https://docs.polymarket.com/
- API Base URL: `https://clob.polymarket.com`
- Market endpoint: `/markets/{tokenId}`

## Future Enhancements

1. **Caching**: Cache market info to reduce API calls
2. **Batch Requests**: Fetch multiple markets in one request if API supports it
3. **Websocket**: Use websocket for real-time market closure notifications
4. **Rate Limiting**: Implement exponential backoff for API errors
