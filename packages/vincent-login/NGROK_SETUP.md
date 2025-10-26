# Using ngrok with Vincent Login

## 🌐 Why ngrok?

Vincent Protocol requires a **publicly accessible redirect URL** for OAuth callbacks. Since you're developing locally, ngrok creates a secure tunnel to your local dev server.

## 🚀 Quick Setup

### Step 1: Start the Vincent Login App

```bash
cd packages/vincent-login
yarn dev
```

Your app will run on `http://localhost:3002`

### Step 2: Start ngrok Tunnel

In a **new terminal**:

```bash
ngrok http 3002
```

You'll see output like:

```
Forwarding   https://bcdd7d8edf27.ngrok-free.app -> http://localhost:3002
```

### Step 3: Configure Vincent App

1. Go to [Vincent Protocol Dashboard](https://vincent.lit-protocol.com/)
2. Find your Vincent App
3. Update the **Redirect URL** to:
   ```
   https://YOUR_NGROK_SUBDOMAIN.ngrok-free.app
   ```
   Example: `https://bcdd7d8edf27.ngrok-free.app`

### Step 4: Update Your .env

Create/update `.env` file:

```bash
VITE_VINCENT_APP_ID=your_app_id_here
VITE_BRIDGE_API_URL=http://localhost:3001
VITE_LIT_NETWORK=datil-dev
VITE_POLYGON_RPC_URL=https://polygon-rpc.com
```

**Note:** Keep `VITE_BRIDGE_API_URL` as `localhost:3001` - the proxy handles this internally.

### Step 5: Test

1. Open your ngrok URL in browser: `https://YOUR_SUBDOMAIN.ngrok-free.app`
2. Click "Login with Vincent"
3. Complete OAuth flow
4. You should be redirected back to your ngrok URL

## 🔧 Configuration Details

### Vite Config (Already Updated! ✅)

```typescript
server: {
  port: 3002,
  host: true, // Listen on all addresses (0.0.0.0)
  allowedHosts: 'all', // Allow all hosts (needed for ngrok)
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    },
  },
}
```

### How It Works

```
Browser (https://xyz.ngrok-free.app)
         ↓
    ngrok tunnel
         ↓
Vincent Login App (localhost:3002)
         ↓ /api/* requests proxied to →
Bridge Service (localhost:3001)
```

## 🔄 ngrok Subdomain Changes

**Important:** ngrok free tier gives you a **new random subdomain** each time you restart ngrok!

**When you restart ngrok:**

1. Note the new subdomain
2. Update Vincent App redirect URL
3. Refresh your browser

**Pro Tip:** Upgrade to ngrok Pro for a permanent subdomain:

```bash
ngrok http 3002 --subdomain=my-permanent-name
```

## 🐛 Troubleshooting

### "Blocked request" Error

✅ **FIXED!** The vite.config.ts now includes `allowedHosts: 'all'`

### "Invalid redirect_uri" Error

- Check Vincent App Dashboard → Redirect URL matches your ngrok URL exactly
- No trailing slash: ✅ `https://xyz.ngrok-free.app`
- With trailing slash: ❌ `https://xyz.ngrok-free.app/`

### ngrok "Visit Site" Button

When you open the ngrok URL, you might see an ngrok warning page with a "Visit Site" button. Click it to proceed to your app.

### Port Already in Use

If port 3002 is busy:

```bash
# Change port in vite.config.ts
server: {
  port: 3003, // or any free port
}

# Update ngrok
ngrok http 3003
```

## 🎯 Production Deployment

For production, you don't need ngrok. Deploy to:

- Vercel: `vercel deploy`
- Netlify: `netlify deploy`
- Any static hosting

Then use the production URL as your Vincent redirect URL.

## 📝 Complete Workflow

```bash
# Terminal 1: Bridge Service
cd packages/bridge
yarn dev

# Terminal 2: Vincent Login
cd packages/vincent-login
yarn dev

# Terminal 3: ngrok
ngrok http 3002

# Then:
# 1. Copy ngrok URL
# 2. Update Vincent App redirect URL
# 3. Open ngrok URL in browser
# 4. Test login flow
```

## 🔐 Security Notes

- ⚠️ `allowedHosts: 'all'` is fine for development
- ⚠️ For production, specify exact domains:
  ```typescript
  allowedHosts: ["yourdomain.com", "www.yourdomain.com"];
  ```
- ⚠️ Never commit your ngrok auth token or .env file

## ✅ Checklist

- [x] Updated vite.config.ts with `allowedHosts: 'all'`
- [ ] Started ngrok tunnel
- [ ] Updated Vincent App redirect URL
- [ ] Tested OAuth flow
- [ ] Bridge service running
- [ ] Vincent login app running

🎉 You're all set! Your Vincent login should now work with ngrok.
