# Quick Start Guide - Vincent Login

Get the admin portal running in 5 minutes!

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ Yarn installed
- ✅ Vincent App created (from Vincent Dashboard)
- ✅ Bridge service configured with `USE_VINCENT=true`

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd packages/vincent-login
yarn install
```

### 2. Configure Environment

```bash
# Copy the sample environment file
cp env.sample .env

# Edit .env with your values
nano .env  # or use your favorite editor
```

Required values in `.env`:

```env
VITE_VINCENT_APP_ID=your-actual-vincent-app-id
VITE_BRIDGE_API_URL=http://localhost:3001
VITE_LIT_NETWORK=datil-dev
VITE_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/your-api-key
```

### 3. Start the Bridge Service

In a separate terminal:

```bash
cd packages/bridge
yarn dev
```

Verify it's running:

```bash
curl http://localhost:3001/health
```

### 4. Start ngrok Tunnel (Required for OAuth)

In another terminal:

```bash
ngrok http 3002
```

**Important:** Copy the ngrok URL (e.g., `https://abc123.ngrok-free.app`)

Then update your **Vincent App redirect URL** in the Vincent Dashboard to this ngrok URL.

> 💡 See [NGROK_SETUP.md](./NGROK_SETUP.md) for detailed instructions

### 5. Start the Admin Portal

```bash
yarn dev
```

The app will be available at:

- 🌐 Publicly: `https://your-ngrok-url.ngrok-free.app` (use this!)
- 🏠 Locally: `http://localhost:3002` (won't work with Vincent OAuth)

## First Time Usage

### Step 1: Login

1. Click **"🚀 Login with Vincent"**
2. You'll be redirected to Vincent Connect
3. Create/unlock your admin wallet
4. Grant permissions when prompted

### Step 2: Wait for Auto-Processing

After redirect, the app will automatically:

- ✅ Extract JWT from URL
- ✅ Connect to Lit Protocol
- ✅ Extract PKP information
- ✅ Generate session signatures (24h validity)

You should see: "✅ Session signatures generated! Ready to send to backend."

### Step 3: Send to Bridge

1. Click **"📤 Send to Bridge Service"**
2. Wait for confirmation
3. You should see: "✅ Successfully authenticated with bridge service!"

### Step 4: Verify

Click **"🔍 Check Bridge Status"**

Expected response:

```json
{
  "vincentEnabled": true,
  "connected": true,
  "delegated": true,
  "adminAddress": "0x...",
  "expiresAt": "2025-10-27T12:00:00.000Z"
}
```

## Testing the Integration

### Test 1: Manual Trade Execution

With admin delegated, test a trade:

```bash
curl -X POST http://localhost:3001/api/test/place-bet \
  -H "Content-Type: application/json" \
  -d '{
    "tokenId": "21742633143463906290569050155826241533067272736897614950488156847949938836455",
    "side": "BUY",
    "quoteAmount": "1000000",
    "limitPriceBps": 5000,
    "maxPriceBps": 5000
  }'
```

Expected: Trade executes using admin's PKP (not private key)!

### Test 2: Event-Driven Execution

Trigger a `StrategyPurchased` event on-chain:

```bash
# Deploy and execute a strategy (in your dApp)
# The bridge should automatically execute trades via Vincent
```

Check bridge logs:

```
[polymarket-client] INFO: Submitting order to Polymarket {"mode":"Vincent PKP"}
[vincent-service] INFO: Executing Polymarket trade via Vincent
```

## Common Issues

### "Configuration Required" Error

**Problem**: Environment variables not set

**Solution**:

```bash
# Make sure .env exists and has correct values
cat .env

# If missing, copy from sample
cp env.sample .env
```

### "Failed to extract PKP info"

**Problem**: JWT structure mismatch or network issues

**Solution**:

1. Check browser console for detailed error
2. Verify `VITE_LIT_NETWORK` matches bridge config
3. Try logging in again

### "Failed to authenticate with backend"

**Problem**: Bridge service not running or not configured

**Solution**:

```bash
# Check bridge is running
curl http://localhost:3001/health

# Check Vincent is enabled
curl http://localhost:3001/api/vincent/status

# If vincentEnabled is false, set USE_VINCENT=true in bridge .env
```

### "Bridge is configured but not delegated"

**Problem**: Authentication not completed

**Solution**: Go through the full login flow in vincent-login app

## Session Management

### Session Expiry

- Sessions last **24 hours**
- After expiry, re-authenticate via vincent-login
- No need to disconnect/reconnect

### Manual Reset

Click **"🔄 Reset"** to:

- Clear JWT
- Clear PKP info
- Clear session signatures
- Start fresh authentication

## Production Deployment

### Build for Production

```bash
yarn build
```

Output in `dist/` folder.

### Deploy to Vercel/Netlify

1. Push to GitHub
2. Connect repository to Vercel/Netlify
3. Set environment variables:
   ```
   VITE_VINCENT_APP_ID=your-app-id
   VITE_BRIDGE_API_URL=https://your-bridge.herokuapp.com
   VITE_LIT_NETWORK=datil
   VITE_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/key
   ```
4. Deploy!

### Update Vincent App

After deployment, update your Vincent App settings:

- **Redirect URIs**: `https://your-admin-portal.vercel.app`
- **App User URL**: `https://your-admin-portal.vercel.app`

## Next Steps

- ✅ Admin authenticated successfully
- ✅ Bridge can execute trades via Vincent
- ✅ No private keys in environment

**Now you can:**

1. Test automated trading via blockchain events
2. Monitor trade execution logs
3. Update strategies in bridge service
4. Deploy to production

## Support

If you encounter issues:

1. Check [README.md](./README.md) for detailed docs
2. Review [VINCENT_INTEGRATION.md](../bridge/VINCENT_INTEGRATION.md)
3. Check browser console for errors
4. Verify bridge service logs

## Architecture Reminder

```
┌─────────────────┐
│  Vincent Login  │  ← You are here
│   (localhost:   │
│     3002)       │
└────────┬────────┘
         │ POST /api/admin/auth
         ↓
┌─────────────────┐
│  Bridge Service │
│   (localhost:   │
│     3001)       │
└────────┬────────┘
         │ Executes trades
         ↓
┌─────────────────┐
│   Polymarket    │
│      CLOB       │
└─────────────────┘
```

🎉 You're all set! Happy trading with Vincent!
