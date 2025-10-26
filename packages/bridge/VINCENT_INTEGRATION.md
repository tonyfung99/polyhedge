# Vincent Integration Guide

This guide explains how to use **Vincent Protocol** with the Polyhedge bridge service for secure, PKP-based trade execution.

## 🎯 Overview

The bridge service now supports **two modes** of operation:

1. **Vincent Mode (Recommended for Hackathon)**: Admin delegates their wallet to a Vincent App, which executes trades using Lit Protocol PKPs
2. **Direct Mode (Legacy)**: Uses a private key directly from environment variables

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────┐
│ SETUP PHASE (One-time)                                     │
├────────────────────────────────────────────────────────────┤
│ 1. Create Vincent App in Dashboard                         │
│ 2. Add Polymarket betting ability                          │
│ 3. Admin connects wallet to Vincent App                    │
│ 4. Admin delegates signing authority to app                │
│ 5. Frontend calls /api/admin/auth with delegation creds    │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ RUNTIME PHASE (Automated)                                  │
├────────────────────────────────────────────────────────────┤
│ Blockchain Event → Bridge Service → Vincent PKP → Sign     │
│                                                             │
│ StrategyPurchased → Execute Trade → Admin's PKP Signs      │
└────────────────────────────────────────────────────────────┘
```

## 📦 Setup Instructions

### Step 1: Install Dependencies

The required packages are already added to `package.json`:

```bash
yarn install
```

Key packages:

- `@lit-protocol/vincent-sdk` - Vincent SDK for PKP operations
- `@lit-protocol/lit-node-client` - Lit Protocol client
- `@bridgewager/vincent-ability-polymarket-bet` - Polymarket trading ability

### Step 2: Create Vincent App

1. Visit [Vincent Dashboard](https://vincent.lit.protocol.com/) (or your hackathon-specific Vincent URL)
2. Click "Create New App"
3. Name it "Polyhedge Admin Bot" (or your preferred name)
4. Add the following ability:
   - **Ability**: `@bridgewager/vincent-ability-polymarket-bet`
   - **Version**: Latest
5. Configure app settings:
   - **App User URL**: Your bridge service URL (e.g., `https://your-bridge.herokuapp.com`)
   - **Redirect URIs**: Add your frontend URL(s)
6. Publish the app
7. Copy your **Vincent App ID** (you'll need this for `.env`)

### Step 3: Configure Environment

Update your `.env` file:

```bash
# Enable Vincent mode
USE_VINCENT=true

# Vincent App ID from Step 2
VINCENT_APP_ID=your-vincent-app-id-here

# Lit Protocol network (use datil-dev for testing, datil for production)
LIT_NETWORK=datil-dev

# Polymarket configuration (still needed for Vincent abilities)
POLYMARKET_HOST=https://clob.polymarket.com
POLYMARKET_CHAIN_ID=137
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/your-key

# Private key is NO LONGER NEEDED in Vincent mode!
# POLYMARKET_PRIVATE_KEY can be omitted
```

### Step 4: Admin Delegation (One-time Setup)

The admin needs to delegate their wallet once. There are two ways to do this:

#### Option A: Using a Frontend (Recommended)

Create a simple admin delegation UI:

```typescript
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { ethers } from "ethers";

// Connect wallet
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Initialize Lit Protocol
const litClient = new LitNodeClient({
  litNetwork: "datil-dev",
});
await litClient.connect();

// Get or create PKP for admin
const pkp = await litClient.getPKP({
  authMethod: {
    authMethodType: 1, // Ethereum wallet
    accessToken: await signer.signMessage(
      "Sign to authorize Polyhedge Admin Bot"
    ),
  },
});

// Create session signatures (valid for 24 hours)
const sessionSigs = await litClient.getSessionSigs({
  pkpPublicKey: pkp.publicKey,
  chain: "polygon",
  expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  resourceAbilityRequests: [
    {
      resource: new LitActionResource("*"),
      ability: LitAbility.PKPSigning,
    },
  ],
});

// Send delegation to bridge service
const response = await fetch("http://your-bridge-url/api/admin/auth", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    pkpPublicKey: pkp.publicKey,
    pkpEthAddress: pkp.ethAddress,
    sessionSigs: sessionSigs,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }),
});

console.log("Admin delegation stored:", await response.json());
```

#### Option B: Using Direct API Call (For Testing)

If you already have PKP credentials:

```bash
curl -X POST http://localhost:3001/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{
    "pkpPublicKey": "0x04...",
    "pkpEthAddress": "0x...",
    "sessionSigs": { ... },
    "expiresAt": "2025-10-27T00:00:00Z"
  }'
```

### Step 5: Run the Bridge Service

```bash
# Development
yarn dev

# Production
yarn build
yarn start
```

You should see:

```
[main] INFO: Initializing Vincent service for PKP-based signing
[main] INFO: Connected to Lit Protocol network
[main] INFO: Vincent service initialized successfully
[main] INFO: Polymarket client initialized {"mode":"Vincent PKP"}
```

## 🔍 Monitoring Vincent Status

### Check Vincent Status

```bash
curl http://localhost:3001/api/vincent/status
```

Response:

```json
{
  "vincentEnabled": true,
  "connected": true,
  "delegated": true,
  "adminAddress": "0x...",
  "expiresAt": "2025-10-27T00:00:00.000Z"
}
```

### Check All Endpoints

```bash
curl http://localhost:3001/
```

## 🧪 Testing Vincent Integration

### 1. Test Admin Authentication

```bash
# This should return success if delegation is stored
curl http://localhost:3001/api/vincent/status
```

### 2. Test Trade Execution (Manual)

```bash
curl -X POST http://localhost:3001/api/test/place-bet \
  -H "Content-Type: application/json" \
  -d '{
    "tokenId": "your-token-id",
    "side": "BUY",
    "quoteAmount": "1000000",
    "limitPriceBps": 5000,
    "maxPriceBps": 5000
  }'
```

If Vincent is configured correctly, this should execute the trade using the admin's PKP.

### 3. Test Event-Driven Execution

Trigger a `StrategyPurchased` event on the blockchain. The bridge service should:

1. Detect the event
2. Build Polymarket order intents
3. Execute trades via Vincent PKP
4. Log the results

Check logs:

```
[polymarket-client] INFO: Submitting order to Polymarket {"mode":"Vincent PKP"}
[vincent-service] INFO: Executing Polymarket trade via Vincent
```

## 🔐 Security Considerations

### ✅ Advantages of Vincent Mode

1. **No Private Key in Env**: Admin private key is never stored in the service
2. **Delegated Signing**: PKP signs transactions, admin can revoke at any time
3. **Session Expiration**: Delegations expire automatically
4. **Auditable**: All PKP operations are logged on Lit Protocol

### ⚠️ Important Notes

1. **Session Expiration**: Admin must re-delegate when sessions expire (default: 24 hours)
2. **PKP Funding**: Ensure the PKP address has sufficient MATIC for gas fees
3. **Ability Versions**: Use the exact version of abilities that admin has approved
4. **Rate Limits**: Lit Protocol has rate limits on PKP operations

## 🚨 Troubleshooting

### "Admin not delegated or delegation expired"

**Solution**: Admin needs to call `/api/admin/auth` again with fresh session signatures.

### "Vincent service required when USE_VINCENT=true"

**Solution**: Ensure Vincent service is properly initialized before creating PolymarketClient.

### "Lit Protocol client not initialized"

**Solution**: Check that `LIT_NETWORK` is set correctly and Lit Protocol nodes are accessible.

### "Failed to execute Lit Action"

**Solution**:

- Verify PKP has gas funds (MATIC on Polygon)
- Check that session signatures haven't expired
- Ensure the Polymarket ability is properly installed in your Vincent App

## 📚 Additional Resources

- [Vincent Documentation](https://vincent.lit.protocol.com/docs)
- [Lit Protocol Docs](https://developer.litprotocol.com/)
- [Polymarket CLOB API](https://docs.polymarket.com/)
- [Vincent Starter App Example](https://github.com/LIT-Protocol/vincent-starter-app)

## 🎉 For Hackathon Judges

This implementation demonstrates:

1. ✅ **Vincent Integration**: Using Vincent SDK for delegated wallet operations
2. ✅ **PKP-Based Signing**: Secure signing without exposing private keys
3. ✅ **Event-Driven Automation**: Automatic trade execution on blockchain events
4. ✅ **Production-Ready Architecture**: Proper error handling, logging, and graceful shutdown
5. ✅ **Security Best Practices**: No private keys in code, delegated auth, session expiration

The bridge service can operate in both legacy mode (for testing) and Vincent mode (for hackathon demonstration).
