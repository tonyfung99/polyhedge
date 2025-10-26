# Polymarket Market ID Scripts

## Quick Start: Finding Real Market IDs

### Method 1: Using Browser DevTools (Recommended)

1. **Open Polymarket Website**

   ```
   https://polymarket.com
   ```

2. **Open DevTools**

   - Press `F12` or `Cmd+Opt+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Go to the "Network" tab

3. **Search for Markets**

   - Search for "BTC" or "Bitcoin price"
   - Click on a market like "Will BTC be above $110k by Oct 31?"

4. **Find the API Call**

   - Look for network requests to `clob.polymarket.com`
   - Find requests to `/markets` or `/order-book`
   - Look for `token_id` in the response

5. **Extract Token IDs**
   - YES token ID: Usually starts with a long number
   - NO token ID: Another long number
   - Copy both IDs

### Method 2: From Market URL

Some Polymarket URLs contain the condition ID or market slug:

```
https://polymarket.com/event/will-btc-be-above-110k
                                  ^^^ market slug ^^^
```

You can try to resolve this to token IDs using the CLOB API.

### Method 3: Use Polymarket GraphQL/API Docs

Check https://docs.polymarket.com for official API documentation.

## Scripts

### validate-market-ids.ts

Test if market IDs are valid:

```bash
npx tsx scripts/validate-market-ids.ts <token_id_1> [token_id_2] ...
```

**Example:**

```bash
npx tsx scripts/validate-market-ids.ts \\
  21742633143463906290569050155826241533067272736897614950488156847949938836455 \\
  69236923620077691027083946871148646972011131466059644796654161903044970987404
```

### fetch-polymarket-markets.ts

Auto-fetch markets (may not work without API auth):

```bash
npx tsx scripts/fetch-polymarket-markets.ts --asset BTC --output strategies.json
```

## Manual Update: strategies.json

Once you have valid token IDs, update `strategies.json`:

```json
{
  "strategies": [
    {
      "id": 1,
      "name": "Your Strategy Name",
      "polymarketOrders": [
        {
          "marketId": "PASTE_YES_TOKEN_ID_HERE",
          "outcome": "YES",
          "priority": 1,
          "notionalBps": 5000,
          "maxPriceBps": 7500
        },
        {
          "marketId": "PASTE_NO_TOKEN_ID_HERE",
          "outcome": "NO",
          "priority": 2,
          "notionalBps": 5000,
          "maxPriceBps": 6000
        }
      ]
    }
  ]
}
```

## Example: Finding BTC $110k Market

1. Go to https://polymarket.com
2. Search "BTC 110k"
3. Click on the market
4. Open DevTools → Network tab
5. Look for API calls with `token_id`
6. Copy the token ID (long number, 70+ digits)
7. Validate it: `npx tsx scripts/validate-market-ids.ts <token_id>`
8. Update `strategies.json` with valid ID

## Common Issues

### 404 Error

- Market ID is invalid or market has been removed
- Try finding a different/newer market

### API Rate Limiting

- Add delays between requests
- Use fewer concurrent requests

### Expired Markets

- Markets that have ended will still exist but be closed
- Check the `closed` and `active` flags

## Need Help?

1. Check Polymarket docs: https://docs.polymarket.com
2. Join Polymarket Discord/community
3. Look at CLOB client examples: https://github.com/Polymarket/clob-client

## Quick Test

Test with a known working market (if any):

```bash
# Replace with actual working market ID from Polymarket website
npx tsx scripts/validate-market-ids.ts YOUR_MARKET_ID_HERE
```

If it shows ✅ Valid, use that ID in your strategies!
