# Polymarket ID Guide

## 🎯 The Problem

The Market Maturity Monitor was getting 404 errors because it was trying to fetch market info using **token IDs** instead of **condition IDs**.

### What Happened

```
❌ BEFORE:
  strategies.json has: Token IDs (70224002415726915146697406828863644162763565870559027191380082229342088681891)
  Market Monitor calls: /markets/70224002415726915146697406828863644162763565870559027191380082229342088681891
  Polymarket API: 404 Not Found (token IDs don't work here!)
```

## 🔧 The Solution

Add **BOTH** condition ID and token IDs to `strategies.json`:

```json
{
  "strategies": [
    {
      "id": 1,
      "name": "Will Bitcoin reach $200k in October?",
      "conditionId": "0x25e73d2f118e87fc15df7cf736172737f0b82b7ec6ca6a24cd67ae341ed760fb",
      "polymarketOrders": [
        {
          "marketId": "70224002415726915146697406828863644162763565870559027191380082229342088681891",
          "outcome": "YES",
          ...
        }
      ]
    }
  ]
}
```

### Now It Works

```
✅ AFTER:
  Market Monitor uses: conditionId (0x25e73d2f118e87fc15df7cf736172737f0b82b7ec6ca6a24cd67ae341ed760fb)
  Market Monitor calls: /markets/0x25e73d2f118e87fc15df7cf736172737f0b82b7ec6ca6a24cd67ae341ed760fb
  Polymarket API: 200 OK with market info!

  Order Executor uses: token IDs (70224002415726915146697406828863644162763565870559027191380082229342088681891)
  Order Executor calls: CLOB API with token_id
  Polymarket API: Orders placed successfully!
```

## 📚 Understanding the Two Types of IDs

### 1. Condition ID (Market ID)

**What it is:**

- The unique identifier for the entire market
- Hex format: `0x...` (66 characters)
- Example: `0x25e73d2f118e87fc15df7cf736172737f0b82b7ec6ca6a24cd67ae341ed760fb`

**Where to find it:**

- Network tab → `/data/trades?market=0x...`
- Network tab → `/data/orders?condition_id=0x...`
- Network tab → `/markets/0x...`

**Used by:**

- Market Maturity Monitor (checking if market is closed)
- Polymarket `/markets/` API endpoint

### 2. Token IDs

**What they are:**

- Individual outcome tokens within a market
- Decimal format: 70+ digit numbers
- Example YES: `70224002415726915146697406828863644162763565870559027191380082229342088681891`
- Example NO: `70675888591821022661888822332310350865640025923189889375444789233897528725031`

**Where to find them:**

- Run: `npx tsx scripts/get-market-tokens.ts 0xCONDITION_ID`
- They are derived from the condition ID

**Used by:**

- Order Executor (placing bets on specific outcomes)
- Polymarket CLOB API for order placement

## 🔄 Complete Workflow

### Step 1: Find Condition ID

Go to Polymarket → Open DevTools → Network Tab → Find curl command with:

```
/data/trades?market=0x25e73d2f...
```

Copy the `0x...` string.

### Step 2: Get Token IDs

```bash
cd packages/bridge
npx tsx scripts/get-market-tokens.ts 0xYOUR_CONDITION_ID_HERE
```

This will output:

- ✅ Condition ID
- ✅ YES Token ID
- ✅ NO Token ID
- 📝 Ready-to-use strategies.json snippet

### Step 3: Update strategies.json

Copy the snippet from Step 2 into your `strategies.json`.

**IMPORTANT:** Make sure BOTH fields are included:

- `conditionId`: The hex string (0x...)
- `polymarketOrders[].marketId`: The token IDs (decimal)

### Step 4: Restart Service

```bash
cd packages/bridge
yarn dev
```

### Step 5: Verify

Check logs for:

- ✅ "Market info fetched successfully"
- ✅ No 404 errors
- ✅ End date and market status displayed

## 🛠️ Changes Made to Fix This

### 1. Updated Type Definition

```typescript
// packages/bridge/src/types.ts
export interface StrategyDefinition {
  id: bigint;
  name: string;
  conditionId?: string; // NEW! For market maturity checks
  polymarketOrders: StrategyPolymarketOrder[];
  totalNotionalBps: number;
}
```

### 2. Updated Market Maturity Monitor

```typescript
// packages/bridge/src/workers/market-maturity-monitor.ts
private initializeTrackedMarkets(): void {
    for (const [strategyId, strategy] of this.config.strategies.entries()) {
        // Use conditionId if available (NEW!)
        const marketId = strategy.conditionId || strategy.polymarketOrders[0]?.marketId;

        if (marketId && !this.trackedMarkets.has(marketId)) {
            this.trackedMarkets.set(marketId, {
                strategyId,
                endDate: new Date(0),
            });
        }
    }
}
```

### 3. Updated Scripts

- ✅ `get-market-tokens.ts` now includes `conditionId` in output
- ✅ `strategies.template.json` shows proper structure
- ✅ `WORKFLOW.md` explains the difference

## 🎓 Key Takeaways

1. **Condition ID = Market**, Token IDs = Outcomes
2. **Always use the script** to get both IDs together
3. **Both IDs are required** for the service to work correctly
4. **Condition IDs are hex**, Token IDs are decimal

## ❓ FAQ

**Q: Can I use just token IDs?**
A: No, the Market Maturity Monitor needs the condition ID to check market status.

**Q: Can I use just the condition ID?**
A: No, the Order Executor needs token IDs to place orders on specific outcomes.

**Q: How do I know if my IDs are correct?**
A: Run `npx tsx scripts/validate-market-ids.ts <token_id>` (will check token IDs)
The condition ID validation happens automatically when you restart the service.

**Q: What if I see "Strategy missing conditionId" warning?**
A: The service will fall back to using the first token ID, but this may cause 404 errors.
Always add the `conditionId` field to your strategies.

## 🎉 Success!

Your bridge service is now correctly configured to:

- ✅ Monitor market maturity using condition IDs
- ✅ Place orders using token IDs
- ✅ Automatically trigger settlement when markets close

For more details, see:

- `scripts/WORKFLOW.md` - Complete workflow guide
- `scripts/README.md` - Script documentation
- `FINDING_MARKET_IDS.md` - Detailed instructions
