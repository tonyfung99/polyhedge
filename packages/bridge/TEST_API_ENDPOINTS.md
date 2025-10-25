# Test API Endpoints for Polymarket Integration

This document describes the internal test API endpoints for placing and closing bets on Polymarket. These endpoints are designed for testing the Polymarket integration independently of contract events.

## Base URL

```
http://localhost:3001
```

## Endpoints

### 1. Place Bet on Polymarket

**Endpoint:** `POST /api/test/place-bet`

**Description:** Places a bet (market order) on Polymarket using the existing PolymarketClient.

**Request Body:**

```json
{
  "tokenId": "string",         // Required: Polymarket token ID
  "side": "BUY" | "SELL",      // Required: Order side (BUY or SELL)
  "quoteAmount": "string",     // Required: Amount in USDC (as string, e.g., "1000000" for 1 USDC)
  "limitPriceBps": number,     // Required: Limit price in basis points (0-10000)
  "maxPriceBps": number        // Required: Max price in basis points (0-10000)
}
```

**Example Request:**

```bash
curl -X POST http://localhost:3001/api/test/place-bet \
  -H "Content-Type: application/json" \
  -d '{
    "tokenId": "21742633143463906290569050155826241533067272736897614950488156847949938836455",
    "side": "BUY",
    "quoteAmount": "1000000",
    "limitPriceBps": 9500,
    "maxPriceBps": 9500
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Bet placed successfully",
  "data": {
    "tokenId": "21742633143463906290569050155826241533067272736897614950488156847949938836455",
    "side": "BUY",
    "quoteAmount": "1000000"
  },
  "timestamp": "2025-10-25T12:34:56.789Z"
}
```

**Error Response (400 - Invalid Request):**

```json
{
  "success": false,
  "error": "Invalid request body",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["tokenId"],
      "message": "Token ID is required"
    }
  ]
}
```

**Error Response (500 - Server Error):**

```json
{
  "success": false,
  "error": "Failed to place bet",
  "message": "Error details here"
}
```

**Error Response (503 - Service Unavailable):**

```json
{
  "error": "Polymarket client not initialized",
  "message": "The Polymarket client must be configured to use this endpoint"
}
```

---

### 2. Close Bet Position on Polymarket

**Endpoint:** `POST /api/test/close-bet`

**Description:** Closes an existing position on Polymarket by selling it at market price.

**Request Body:**

```json
{
  "tokenId": "string",      // Required: Polymarket token ID
  "side": "YES" | "NO"      // Required: Position side (YES or NO)
}
```

**Example Request:**

```bash
curl -X POST http://localhost:3001/api/test/close-bet \
  -H "Content-Type: application/json" \
  -d '{
    "tokenId": "21742633143463906290569050155826241533067272736897614950488156847949938836455",
    "side": "YES"
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Position closed successfully",
  "data": {
    "tokenId": "21742633143463906290569050155826241533067272736897614950488156847949938836455",
    "size": 100,
    "side": "YES"
  },
  "timestamp": "2025-10-25T12:34:56.789Z"
}
```

**Error Response (400 - Invalid Request):**

```json
{
  "success": false,
  "error": "Invalid request body",
  "details": [
    {
      "code": "invalid_enum_value",
      "options": ["YES", "NO"],
      "received": "BUY",
      "path": ["side"],
      "message": "Side must be YES or NO"
    }
  ]
}
```

**Error Response (500 - Server Error):**

```json
{
  "success": false,
  "error": "Failed to close position",
  "message": "Error details here"
}
```

**Error Response (503 - Service Unavailable):**

```json
{
  "error": "Polymarket client not initialized",
  "message": "The Polymarket client must be configured to use this endpoint"
}
```

---

## Environment Setup

Make sure the following environment variables are configured in your `.env` file:

```env
# Polymarket Configuration
POLYGON_RPC_URL=https://polygon-rpc.com
POLYMARKET_PRIVATE_KEY=0x...
POLYMARKET_HOST=https://clob.polymarket.com
POLYMARKET_CHAIN_ID=137
POLYMARKET_SIGNATURE_TYPE=0
POLYMARKET_FUNDER_ADDRESS=0x...  # Optional

# Server Configuration
PORT=3001
HOST=0.0.0.0
```

## Testing the Endpoints

1. **Start the bridge service:**

```bash
cd packages/bridge
yarn dev
```

2. **Check the server is running:**

```bash
curl http://localhost:3001/health
```

3. **Test placing a bet:**

```bash
curl -X POST http://localhost:3001/api/test/place-bet \
  -H "Content-Type: application/json" \
  -d '{
    "tokenId": "YOUR_TOKEN_ID",
    "side": "BUY",
    "quoteAmount": "1000000",
    "limitPriceBps": 9500,
    "maxPriceBps": 9500
  }'
```

4. **Test closing a position:**

```bash
curl -X POST http://localhost:3001/api/test/close-bet \
  -H "Content-Type: application/json" \
  -d '{
    "tokenId": "YOUR_TOKEN_ID",
    "side": "YES"
  }'
```

## Notes

- **Quote Amount Format:** The `quoteAmount` should be provided as a string representing the amount in USDC with 6 decimals. For example, "1000000" represents 1 USDC.
- **Basis Points:** Both `limitPriceBps` and `maxPriceBps` use basis points (1 bps = 0.01%). A value of 9500 represents 95%.
- **Token IDs:** You can find Polymarket token IDs by querying their API or examining the markets on their platform.
- **Position Size:** The close position endpoint currently uses a placeholder position size. In production, you should query the actual position size from Polymarket.
- **Test Mode:** These endpoints work independently of contract events and can be used for isolated testing.

## Error Handling

All endpoints include comprehensive error handling:

- **400 Bad Request:** Invalid input parameters (validated using Zod schemas)
- **500 Internal Server Error:** Failed to execute the order/close position
- **503 Service Unavailable:** Polymarket client not initialized

Check the logs for detailed error messages and debugging information.
