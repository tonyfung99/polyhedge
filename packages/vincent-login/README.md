# Vincent Login - Admin Portal

A React-based admin authentication portal for the Polyhedge bridge service using Vincent Protocol and Lit Protocol PKPs.

## 🎯 Purpose

This standalone web application allows Polyhedge administrators to:

1. **Authenticate** with Vincent Protocol
2. **Generate PKP credentials** using Lit Protocol
3. **Delegate signing authority** to the bridge service
4. **Monitor** bridge service delegation status

## 🏗️ Architecture

```
Admin → Vincent Login UI → Vincent Connect → Returns JWT
                               ↓
        Extract PKP Info → Generate Session Sigs
                               ↓
        POST /api/admin/auth → Bridge Service
                               ↓
        Bridge Executes Trades → Using Admin's PKP
```

## 📦 Installation

From the project root:

```bash
cd packages/vincent-login
yarn install
```

Or if you're using the monorepo:

```bash
# From project root
yarn install
```

## ⚙️ Configuration

1. **Copy environment sample:**

   ```bash
   cp env.sample .env
   ```

2. **Configure `.env`:**

   ```env
   # Your Vincent App ID from Vincent Dashboard
   VITE_VINCENT_APP_ID=your-vincent-app-id-here

   # Bridge service URL (where admin credentials will be sent)
   VITE_BRIDGE_API_URL=http://localhost:3001

   # Lit Protocol network (datil-dev for testing, datil for production)
   VITE_LIT_NETWORK=datil-dev

   # Polygon RPC URL for session signature generation
   VITE_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/your-key
   ```

3. **Required Setup:**
   - ✅ Bridge service must be running with `USE_VINCENT=true`
   - ✅ Vincent App must be created and published
   - ✅ Polymarket ability must be added to your Vincent App

## 🚀 Usage

### Development Mode

```bash
yarn dev
```

The app will start on `http://localhost:3002`

### 🌐 Using with ngrok (Required for OAuth)

Vincent Protocol requires a publicly accessible URL for OAuth redirects. Use ngrok for local development:

```bash
# In a separate terminal
ngrok http 3002
```

Then update your Vincent App redirect URL to the ngrok URL (e.g., `https://xyz.ngrok-free.app`)

**📚 For detailed ngrok setup instructions, see [NGROK_SETUP.md](./NGROK_SETUP.md)**

### Production Build

```bash
yarn build
yarn preview
```

## 📱 User Flow

### Step 1: Login with Vincent

1. Click **"Login with Vincent"**
2. You'll be redirected to Vincent Connect page
3. Create or unlock your admin wallet
4. Grant permissions to the Polyhedge Admin Bot

### Step 2: Automatic PKP Extraction

After redirect:

- JWT is automatically extracted from URL
- PKP public key and address are derived
- Session signatures are generated (valid for 24 hours)

### Step 3: Send to Bridge Service

1. Click **"Send to Bridge Service"**
2. Credentials are sent to `POST /api/admin/auth`
3. Bridge service stores delegation in memory
4. Success message confirms delegation

### Step 4: Verify Status

Click **"Check Bridge Status"** to verify:

- Bridge has Vincent enabled
- Admin delegation is active
- PKP address is correct
- Expiration time

## 🔍 Features

### Authentication Flow

- ✅ Vincent OAuth redirect flow
- ✅ JWT extraction from URL hash
- ✅ Automatic cleanup of URL after redirect

### PKP Management

- ✅ Derive PKP address from public key
- ✅ Generate session signatures
- ✅ 24-hour session validity
- ✅ Display PKP information

### Bridge Integration

- ✅ Send credentials to bridge service
- ✅ Check delegation status
- ✅ Error handling and retry logic
- ✅ Real-time status updates

### UI/UX

- ✅ Modern, responsive design
- ✅ Dark/light mode support
- ✅ Loading states
- ✅ Error messages
- ✅ Configuration validation
- ✅ Step-by-step instructions

## 🔐 Security Considerations

### What Gets Sent to Bridge Service

```typescript
{
  pkpPublicKey: string,      // PKP public key (safe to share)
  pkpEthAddress: string,     // PKP Ethereum address (safe to share)
  sessionSigs: object,       // Session signatures (temporary, expires in 24h)
  expiresAt: string         // ISO 8601 timestamp
}
```

### What Doesn't Leave the Browser

- Admin's private key (never exposed)
- Vincent OAuth credentials (handled by Vincent SDK)

### Session Management

- Sessions expire after 24 hours
- Admin can revoke delegation at any time via Vincent Dashboard
- Bridge service stores credentials in memory (cleared on restart)

## 🎨 UI Components

### Main Components

1. **VincentLogin** - Main authentication component

   - Vincent SDK integration
   - Lit Protocol client
   - Session signature generation
   - Bridge API communication

2. **App** - Application wrapper
   - Configuration validation
   - Error boundary
   - Routing (future)

### Styling

- Modern CSS with CSS variables
- Responsive design (mobile-friendly)
- Dark/light mode support
- Gradient buttons with hover effects
- Loading animations

## 🧪 Testing

### Manual Testing Checklist

- [ ] Load app without `.env` (should show config error)
- [ ] Configure `.env` and reload (should show login UI)
- [ ] Click "Login with Vincent" (should redirect)
- [ ] Complete Vincent flow (should redirect back with JWT)
- [ ] Verify PKP info extracted (should show address)
- [ ] Click "Send to Bridge Service" (should succeed)
- [ ] Click "Check Bridge Status" (should show delegated)
- [ ] Restart bridge service (delegation should be lost)
- [ ] Re-authenticate (should work)

### Integration Testing

Test with bridge service:

```bash
# Terminal 1: Start bridge service
cd packages/bridge
yarn dev

# Terminal 2: Start vincent-login
cd packages/vincent-login
yarn dev

# Browser: Open http://localhost:3002
```

## 📊 API Endpoints Used

### POST `/api/admin/auth`

Send admin delegation to bridge service:

```typescript
// Request
{
  pkpPublicKey: string;
  pkpEthAddress: string;
  sessionSigs: any;
  expiresAt: string;
}

// Response (success)
{
  success: true;
  message: "Admin delegation stored successfully";
  data: {
    pkpEthAddress, expiresAt;
  }
  timestamp: string;
}

// Response (error)
{
  success: false;
  error: string;
  message: string;
}
```

### GET `/api/vincent/status`

Check bridge delegation status:

```typescript
// Response
{
  vincentEnabled: boolean;
  connected: boolean;
  delegated: boolean;
  adminAddress: string | null;
  expiresAt: string | null;
}
```

## 🐛 Troubleshooting

### "VITE_VINCENT_APP_ID not configured"

**Solution**: Create `.env` from `env.sample` and set your Vincent App ID

### "Failed to extract PKP info"

**Possible causes**:

- Invalid JWT structure
- Lit Protocol network mismatch
- Network connectivity issues

**Solution**:

- Check JWT payload structure
- Verify `VITE_LIT_NETWORK` matches bridge config
- Check browser console for detailed errors

### "Failed to authenticate with backend"

**Possible causes**:

- Bridge service not running
- Vincent not enabled in bridge (`USE_VINCENT=false`)
- CORS issues

**Solution**:

- Ensure bridge is running on `VITE_BRIDGE_API_URL`
- Set `USE_VINCENT=true` in bridge `.env`
- Check bridge has CORS enabled for localhost:3002

### "Bridge is configured but not delegated"

**Solution**: Complete the authentication flow in vincent-login app

## 🚀 Deployment

### Vercel/Netlify

1. Build the app:

   ```bash
   yarn build
   ```

2. Deploy `dist/` folder

3. Set environment variables in deployment platform:

   ```
   VITE_VINCENT_APP_ID=your-app-id
   VITE_BRIDGE_API_URL=https://your-bridge.herokuapp.com
   VITE_LIT_NETWORK=datil
   VITE_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/your-key
   ```

4. Update Vincent App settings:
   - **Redirect URIs**: Add your deployment URL
   - **App User URL**: Add your deployment URL

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build
CMD ["yarn", "preview", "--host", "0.0.0.0"]
EXPOSE 4173
```

## 📚 Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **@lit-protocol/vincent-app-sdk** - Vincent authentication
- **@lit-protocol/lit-node-client** - Lit Protocol integration
- **CSS Modules** - Styling

## 🤝 Integration with Bridge Service

This app works in tandem with `@polyhedge/bridge`:

```
vincent-login (port 3002)     bridge (port 3001)
        │                            │
        ├─ Admin authenticates       │
        ├─ Generates PKP creds       │
        ├─ POST /api/admin/auth ────>│
        │                            ├─ Stores delegation
        │                            ├─ Uses PKP for trades
        ├─ GET /api/vincent/status ─>│
        └─ Shows delegation status <─┘
```

## 📝 Notes for Hackathon

This implementation showcases:

- ✅ **Vincent SDK** - Official SDK integration
- ✅ **User Experience** - Smooth OAuth flow
- ✅ **Error Handling** - Comprehensive error states
- ✅ **Security** - No private keys stored
- ✅ **Modern Stack** - React 18 + Vite + TypeScript
- ✅ **Responsive UI** - Works on mobile and desktop
- ✅ **Real-time Status** - Check delegation status

## 🔗 Links

- [Vincent Documentation](https://vincent.lit.protocol.com/docs)
- [Lit Protocol Docs](https://developer.litprotocol.com/)
- [Bridge Service](../bridge/README.md)
- [Vincent Integration Guide](../bridge/VINCENT_INTEGRATION.md)
