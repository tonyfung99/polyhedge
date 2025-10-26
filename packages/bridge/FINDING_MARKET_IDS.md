# How to Find Valid Polymarket Market IDs

## 🎯 Quick Summary

Your current `strategies.json` contains **invalid market IDs** (they return 404). You need to find real, active market token IDs from Polymarket to fix the errors.

## 📋 Step-by-Step Guide

### Step 1: Open Polymarket

Go to https://polymarket.com and search for crypto price markets:

- "BTC 110k"
- "Bitcoin price"
- "ETH 5k"

### Step 2: Open DevTools

**On Mac:** `Cmd + Opt + I`  
**On Windows/Linux:** `Ctrl + Shift + I` or `F12`

Go to the **Network** tab.

### Step 3: Click on a Market

Click on any market like:

- "Will BTC be above $110,000 by October 31?"
- "Will ETH reach $5,000 in 2024?"

### Step 4: Find the API Call

In the Network tab, look for requests to:

- `clob.polymarket.com/markets`
- `clob.polymarket.com/order-book`
- Any request with "token" in the name

### Step 5: Extract Token IDs

Click on the API request and look at the **Response** tab.

You should see JSON with structures like:

```json
{
  "tokens": [
    {
      "token_id": "21742633143463906290569050155826241533067272736897614950488156847949938836455",
      "outcome": "YES",
      "price": "0.45"
    },
    {
      "token_id": "69236923620077691027083946871148646972011131466059644796654161903044970987404",
      "outcome": "NO",
      "price": "0.55"
    }
  ]
}
```

**Copy both token IDs** (the long 70+ digit numbers).

### Step 6: Validate the IDs

Use the validation script:

```bash
cd packages/bridge

# Test your token IDs
npx tsx scripts/validate-market-ids.ts \\
  21742633143463906290569050155826241533067272736897614950488156847949938836455 \\
  69236923620077691027083946871148646972011131466059644796654161903044970987404
```

You should see:

- ✅ Valid - Good! Use this ID
- ❌ Invalid - Try a different market

### Step 7: Update strategies.json

Edit `strategies.json` with your valid token IDs:

```json
{
  "strategies": [
    {
      "id": 1,
      "name": "BTC Price Hedge",
      "polymarketOrders": [
        {
          "marketId": "PASTE_YOUR_VALID_YES_TOKEN_ID_HERE",
          "outcome": "YES",
          "priority": 1,
          "notionalBps": 5000,
          "maxPriceBps": 7500
        },
        {
          "marketId": "PASTE_YOUR_VALID_NO_TOKEN_ID_HERE",
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

### Step 8: Save and Restart

Save `strategies.json` and restart the bridge service:

```bash
cd packages/bridge
yarn dev
```

## 🔧 Available Scripts

### Validate Market IDs

Test if token IDs are valid:

```bash
npx tsx scripts/validate-market-ids.ts <token_id_1> [token_id_2] ...
```

### Use Template

Copy the template to get started:

```bash
cp strategies.template.json strategies.json
# Then edit strategies.json with real token IDs
```

## ❓ Common Issues

### Q: Where do I find the Network tab?

**A:** In your browser, press F12 (or Cmd+Opt+I on Mac), then click the "Network" tab at the top.

### Q: I don't see any API calls

**A:**

1. Make sure the Network tab is open BEFORE you click on the market
2. Refresh the page with Network tab open
3. Try a different market

### Q: The token IDs are too long!

**A:** Yes, they're 70+ digits. That's normal! Copy the entire number.

### Q: Can I use market slugs instead of token IDs?

**A:** No, the bridge service needs the exact token IDs (the long numbers).

### Q: My market IDs return 404

**A:** The markets may have expired or been removed. Find newer, active markets on Polymarket.

## 📚 Reference Documents

- **scripts/README.md** - Detailed script documentation
- **strategies.template.json** - Template with instructions
- **strategies.example.json** - Example structure

## 🎓 Example Session

```bash
# 1. Go to polymarket.com and find market
# 2. Extract token IDs from DevTools
# 3. Validate them
npx tsx scripts/validate-market-ids.ts 12345...789

# Output:
# ✅ Valid
# Active: ✅ Yes
# Question: Will BTC be above $110k by Oct 31?

# 4. Update strategies.json
vim strategies.json

# 5. Restart service
yarn dev

# 6. Check logs - should see "Market info fetched successfully"
```

## 🚀 Next Steps

1. Find 2-3 active crypto price markets on Polymarket
2. Extract their token IDs using DevTools
3. Validate them with the script
4. Update `strategies.json` with valid IDs
5. Restart the bridge service
6. Verify in logs that markets are fetched successfully

## 💡 Pro Tips

- Look for markets with upcoming expiry dates (weeks away, not days)
- Use popular markets (more liquidity)
- Check that markets are "Active" not "Closed"
- Test with just 1-2 markets first before adding more

Good luck! 🎉
