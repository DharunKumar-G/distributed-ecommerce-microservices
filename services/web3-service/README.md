# 🔗 Web3 Service - Quick Start Guide

## 🎯 **What Is This?**

A blockchain integration microservice that adds Web3 capabilities to your e-commerce platform:
- 👛 **Wallet Authentication** (MetaMask, WalletConnect)
- 💰 **Crypto Payments** (BTC, ETH, USDC, etc.)
- 🎨 **NFT Certificates** (Proof of purchase)
- 🪙 **Token Rewards** (Loyalty system)
- 📜 **Blockchain Audit Logs** (Immutable records)

## 🚀 **Quick Start**

### 1. Start the Service
```bash
docker-compose up -d web3-service
```

### 2. Check Health
```bash
curl http://localhost:8087/health
```

### 3. Test Wallet Auth
```bash
# Request a nonce for your wallet
curl -X POST http://localhost:8087/api/web3/wallet/request-nonce \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "YOUR_WALLET_ADDRESS"}'
```

## 📡 **API Endpoints**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| POST | `/api/web3/wallet/request-nonce` | Get nonce for signing |
| POST | `/api/web3/wallet/verify` | Verify signature & auth |
| POST | `/api/web3/wallet/link` | Link wallet to user |
| GET | `/api/web3/wallet/user/:userId` | Get user's wallets |
| DELETE | `/api/web3/wallet/unlink` | Unlink wallet |
| GET | `/api/web3/wallet/balance/:address` | Get balance |

## 🌐 **Supported Blockchains**

| Chain | ID | Network | Purpose |
|-------|-----|---------|---------|
| Polygon | 137 | Mainnet | **Recommended** - Low fees |
| Ethereum | 1 | Mainnet | High security |
| Base | 8453 | Mainnet | Easy fiat onramp |
| Polygon Mumbai | 80001 | Testnet | Development |

## 🔧 **Configuration**

Environment variables in `docker-compose.yml`:

```yaml
environment:
  PORT: 8087
  MONGO_URI: mongodb://...
  POLYGON_RPC: https://polygon-rpc.com
  ETH_RPC: https://eth.llamarpc.com
  BASE_RPC: https://mainnet.base.org
```

## 💻 **Frontend Integration**

### Connect MetaMask:

```javascript
// 1. Request accounts
const accounts = await window.ethereum.request({ 
  method: 'eth_requestAccounts' 
});

// 2. Request nonce
const { nonce, message } = await fetch('http://localhost:8087/api/web3/wallet/request-nonce', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ walletAddress: accounts[0] })
}).then(r => r.json());

// 3. Sign message
const signature = await window.ethereum.request({
  method: 'personal_sign',
  params: [message, accounts[0]]
});

// 4. Verify
const { token } = await fetch('http://localhost:8087/api/web3/wallet/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    walletAddress: accounts[0], 
    signature, 
    message 
  })
}).then(r => r.json());

// 5. Store token
localStorage.setItem('web3_token', token);
```

## 📊 **Database Collections**

MongoDB (`web3_db` database):
- `wallets` - User wallet addresses
- `nft_certificates` - Product NFTs
- `crypto_payments` - Payment transactions
- `token_rewards` - Loyalty tokens
- `audit_logs` - Blockchain audit trail

## 🛡️ **Security**

- ✅ No private keys stored
- ✅ Cryptographic signature verification
- ✅ Nonce-based authentication
- ✅ Replay attack prevention
- ✅ User controls their own wallet

## 🎨 **Next Features to Implement**

1. **MetaMask UI Button** - Add "Connect Wallet" to frontend
2. **Crypto Payments** - Accept BTC/ETH/USDC
3. **NFT Minting** - Auto-mint NFT on order complete
4. **Token Rewards** - Earn tokens on purchases
5. **Audit Logs** - Store critical events on-chain

## 📝 **Logs**

View service logs:
```bash
docker logs kafka-web3-service-1 -f
```

## 🔍 **Troubleshooting**

### Service won't start?
```bash
# Check logs
docker logs kafka-web3-service-1

# Rebuild
docker-compose build web3-service
docker-compose up -d web3-service
```

### MongoDB connection issues?
```bash
# Check MongoDB is running
docker ps | grep mongodb

# Verify connection
docker exec -it kafka-mongodb-1 mongosh -u ecommerce -p ecommerce123 --authenticationDatabase admin
```

### RPC issues?
Use free public RPCs or sign up for:
- Alchemy (recommended)
- Infura
- QuickNode

## 🎯 **Testing Checklist**

- [ ] Service starts successfully
- [ ] Health endpoint responds
- [ ] Can request nonce
- [ ] MongoDB connection works
- [ ] RPC providers respond
- [ ] Can verify signatures

## 📚 **Resources**

- [Ethers.js Docs](https://docs.ethers.org/)
- [Polygon Network](https://polygon.technology/)
- [MetaMask Docs](https://docs.metamask.io/)
- [Web3.js Guide](https://web3js.readthedocs.io/)

---

**Port:** 8087  
**Database:** MongoDB (`web3_db`)  
**Status:** ✅ Ready for wallet authentication

---

**Next Steps:**
1. Start service: `docker-compose up -d web3-service`
2. Test endpoints (see above)
3. Add UI components (Step 2)
4. Implement crypto payments (Step 3)
