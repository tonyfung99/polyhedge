# Complete Workflow: Finding & Using Polymarket Token IDs

## ✅ Successfully Completed Example

### Step 1: Found Market in Browser

- Visited https://polymarket.com
- Found market: "Will Bitcoin reach $200k in October?"

### Step 2: Extracted Condition ID from Network Tab

Found curl command with condition ID:

```
0x25e73d2f118e87fc15df7cf736172737f0b82b7ec6ca6a24cd67ae341ed760fb
```

### Step 3: Converted Condition ID to Token IDs

```bash
npx tsx scripts/get-market-tokens.ts 0x25e73d2f118e87fc15df7cf736172737f0b82b7ec6ca6a24cd67ae341ed760fb
```

**Result:**

- ✅ **Condition ID**: `0x25e73d2f118e87fc15df7cf736172737f0b82b7ec6ca6a24cd67ae341ed760fb` (for market maturity checks)
- ✅ **YES Token**: `70224002415726915146697406828863644162763565870559027191380082229342088681891` (for placing orders)
- ✅ **NO Token**: `70675888591821022661888822332310350865640025923189889375444789233897528725031` (for placing orders)

**Important:** You need BOTH the condition ID and token IDs!

### Step 4: Updated strategies.json

File now contains valid token IDs!

### Step 5: Restart Service

```bash
yarn dev
```

## 🔑 Understanding Polymarket IDs

### Condition ID (Market ID)

- **Format**: Hex string starting with `0x` (66 characters)
- **Example**: `0x25e73d2f118e87fc15df7cf736172737f0b82b7ec6ca6a24cd67ae341ed760fb`
- **Used for**: Checking market status, expiry, closure
- **API endpoint**: `/markets/{conditionId}`

### Token IDs

- **Format**: Very long decimal numbers (70+ digits)
- **Example**: `70224002415726915146697406828863644162763565870559027191380082229342088681891`
- **Used for**: Placing orders on specific outcomes (YES/NO)
- **Relationship**: Each market has 2+ token IDs (one per outcome)

### Why Both?

- **Market Maturity Monitor** needs the condition ID to check if market is closed
- **Order Execution** needs token IDs to place bets on specific outcomes
- The condition ID represents the entire market, token IDs represent individual outcomes

## 🔄 To Add More Markets

### Quick Method (Recommended)

1. **Go to Polymarket** → Find a market
2. **Open DevTools** → Network tab
3. **Find curl with `/data/trades?market=0x...`** or similar
4. **Copy the hex market ID** (starts with `0x`)
5. **Run:**
   ```bash
   npx tsx scripts/get-market-tokens.ts 0xYOUR_HEX_MARKET_ID
   ```
6. **Copy the token IDs** from the output
7. **Add to strategies.json**
8. **Restart** `yarn dev`

### Example Output Format

When you run `get-market-tokens.ts`, you'll get:

```
🎯 Token IDs (USE THESE IN strategies.json):
================================================================================

Yes Token:
  Token ID: 70224002415726915146697406828863644162763565870559027191380082229342088681891
  Price: 0.25%

No Token:
  Token ID: 70675888591821022661888822332310350865640025923189889375444789233897528725031
  Price: 99.75%

📝 strategies.json snippet:
{
  "id": 2,
  "name": "Your Market Name",
  "polymarketOrders": [
    {
      "marketId": "PASTE_YES_TOKEN_HERE",
      ...
    }
  ]
}
```

## 📋 Network Tab Patterns to Look For

### Pattern 1: Trades Endpoint

```
/data/trades?market=0x25e73d2f118e...
                    ^^^^^^^^^^^^^^^^ Copy this!
```

### Pattern 2: Orders Endpoint

```
/data/orders?condition_id=0x25e73d2f118e...
                          ^^^^^^^^^^^^^^^^ Copy this!
```

### Pattern 3: Markets Endpoint

```
/markets/0x25e73d2f118e...
         ^^^^^^^^^^^^^^^^ Copy this!
```

## 🎯 Current Status

✅ strategies.json updated with valid token IDs from:

- Market: "Will Bitcoin reach $200k in October?"
- Condition ID: `0x25e73d2f118e87fc15df7cf736172737f0b82b7ec6ca6a24cd67ae341ed760fb`
- Expiry: November 1, 2025
- Active: Yes

## 🚀 Next Steps

1. **Restart your bridge service**: `yarn dev`
2. **Check logs** - Should see "Market info fetched successfully"
3. **Add more markets** using the same workflow above
4. **Test with different crypto assets** (ETH, SOL, etc.)

## 💡 Pro Tips

- Look for markets with **upcoming expiry dates** (weeks or months away)
- Use **popular markets** (more liquidity, better execution)
- Check market **prices** - avoid markets with extreme prices (0.01% or 99.99%)
- Start with **1-2 markets** to test, then add more

## 🛠️ Available Scripts

| Script                        | Purpose                           | Usage                                               |
| ----------------------------- | --------------------------------- | --------------------------------------------------- |
| `get-market-tokens.ts`        | Convert condition ID to token IDs | `npx tsx scripts/get-market-tokens.ts 0x...`        |
| `validate-market-ids.ts`      | Check if token IDs work           | `npx tsx scripts/validate-market-ids.ts <token_id>` |
| `fetch-polymarket-markets.ts` | Auto-fetch (may not work)         | `npx tsx scripts/fetch-polymarket-markets.ts`       |

## ✅ Success Checklist

- [x] Found market on Polymarket.com
- [x] Extracted condition ID from Network tab
- [x] Converted to token IDs using script
- [x] Updated strategies.json
- [ ] Restarted bridge service
- [ ] Verified in logs (no 404 errors)
- [ ] Added more markets (optional)

🎉 You're all set!
