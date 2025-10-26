# Arbitrum Mainnet Deployment - Quick Start

**⚡ Fast track guide for deploying to Arbitrum mainnet**

---

## 🚀 One-Command Deployment

```bash
# Run the automated deployment script
./deploy-mainnet.sh
```

This script will:
1. ✅ Check environment variables
2. ✅ Clean and compile contracts
3. ✅ Deploy to Arbitrum mainnet
4. ✅ Verify contracts on Arbiscan
5. ✅ Display contract addresses and next steps

---

## 📋 Prerequisites (Quick Checklist)

Before running deployment:

```bash
# 1. Set environment variables in .env
__RUNTIME_DEPLOYER_PRIVATE_KEY=your_mainnet_private_key
ALCHEMY_API_KEY=your_alchemy_key
ETHERSCAN_V2_API_KEY=your_arbiscan_key

# 2. Fund deployer account with 0.05+ ETH on Arbitrum mainnet

# 3. Test on testnet first (IMPORTANT!)
cd packages/hardhat
yarn hardhat deploy --network arbitrumSepolia
```

---

## 🔐 Get API Keys

**Alchemy (for RPC):**
```
https://www.alchemy.com/
→ Create app → Select Arbitrum → Copy API key
```

**Arbiscan (for verification):**
```
https://arbiscan.io/myapikey
→ Create API key → Copy key
```

---

## 📝 Manual Deployment Steps

If you prefer step-by-step:

```bash
cd packages/hardhat

# 1. Clean
yarn clean

# 2. Compile
yarn compile

# 3. Deploy
yarn hardhat deploy --network arbitrum

# 4. Verify
yarn hardhat run scripts/verifyDeployedContracts.ts --network arbitrum
```

---

## ✅ After Deployment

1. **Save contract addresses** (from deployment output)

2. **Update Python scanner:**
   ```bash
   cd packages/python/scanner
   # Edit .env and add:
   STRATEGY_MANAGER_ADDRESS=<your_deployed_address>
   ```

3. **Test with small amounts:**
   ```bash
   cd packages/hardhat
   yarn hardhat run scripts/testBuyStrategy.ts --network arbitrum
   ```

4. **View on Arbiscan:**
   ```
   https://arbiscan.io/address/<your_contract_address>#code
   ```

---

## 🆘 Troubleshooting

**"Insufficient funds"**
→ Add more ETH to deployer account

**"Invalid API key"**
→ Check `.env` file has correct keys

**"Verification failed"**
→ Run verification script again:
```bash
yarn hardhat run scripts/verifyDeployedContracts.ts --network arbitrum
```

**"Bytecode doesn't match"**
→ Clean and recompile:
```bash
yarn clean && yarn compile
```

---

## 📚 Full Documentation

For detailed instructions, see:
- **Full Guide:** `ARBITRUM_MAINNET_DEPLOYMENT.md`
- **Contract Docs:** `packages/hardhat/contracts/`
- **Tests:** `packages/hardhat/test/`

---

## ⚠️ Security Reminder

**MAINNET = REAL MONEY**

- ✅ Test on testnet first
- ✅ Audit contracts
- ✅ Secure your private keys
- ✅ Start with small amounts
- ✅ Monitor contracts closely

---

## 📞 Need Help?

- Review logs in terminal
- Check Arbiscan for transaction details
- See `ARBITRUM_MAINNET_DEPLOYMENT.md` for detailed troubleshooting

---

**Ready?** Run `./deploy-mainnet.sh` 🚀

