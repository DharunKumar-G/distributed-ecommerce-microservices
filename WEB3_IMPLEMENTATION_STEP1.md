# 🔗 Web3 & Blockchain Integration - Step-by-Step Implementation

## ✅ **STEP 1 COMPLETED: Infrastructure Setup**

### What We've Built:

#### **1. Web3 Service Created** (`/services/web3-service`)
A dedicated microservice for all blockchain operations on **port 8087**

#### **2. Database Models** (`src/models.ts`)
Created 5 Mongoose schemas:

- **Wallet** - Store user wallet addresses & authentication
- **NFTCertificate** - Track product NFTs
- **CryptoPayment** - Handle crypto transactions
- **TokenReward** - Loyalty token system
- **AuditLog** - Immutable blockchain audit trail

#### **3. Web3 Provider Service** (`src/services/web3Provider.ts`)
Multi-chain blockchain provider supporting:
- ✅ Polygon (low fees, fast)
- ✅ Ethereum mainnet  
- ✅ Base L2 (Coinbase)
- ✅ Polygon Mumbai testnet

**Features:**
- Transaction signing
- Balance checking
- Gas price estimation
- Message verification (for auth)
- Transaction monitoring

#### **4. Wallet Authentication Service** (`src/services/walletAuthService.ts`)
Secure Web3 wallet login system:
- Generate authentication nonce
- Verify wallet signatures
- Link wallets to user accounts
- Get wallet balances
- Manage multiple wallets per user

#### **5. API Routes** (`src/api/walletRoutes.ts`)
RESTful endpoints:

```
POST   /api/web3/wallet/request-nonce    - Get nonce for signing
POST   /api/web3/wallet/verify           - Verify signature & authenticate
POST   /api/web3/wallet/link             - Link wallet to user
GET    /api/web3/wallet/user/:userId     - Get user's wallets
DELETE /api/web3/wallet/unlink           - Unlink wallet
GET    /api/web3/wallet/balance/:address - Get wallet balance
```

#### **6. Docker Integration**
Added to `docker-compose.yml`:
- Port: 8087
- MongoDB: `web3_db` database
- RPC endpoints for all chains
- Environment variables for configuration

#### **7. UI Integration**
Updated `App.jsx` to include:
```javascript
web3: 'http://localhost:8087'
```

---

## 🎯 **How It Works**

### **Wallet Authentication Flow:**

1. **User clicks "Connect Wallet"** (MetaMask button)
2. **Frontend requests nonce** from `/api/web3/wallet/request-nonce`
3. **User signs message** in MetaMask with nonce
4. **Frontend sends signature** to `/api/web3/wallet/verify`
5. **Backend verifies signature** using ethers.js
6. **Returns JWT token** for authenticated session
7. **Wallet linked to user account**

### **Example Usage:**

```javascript
// Frontend code to connect wallet
async function connectWallet() {
  // 1. Get accounts from MetaMask
  const accounts = await window.ethereum.request({ 
    method: 'eth_requestAccounts' 
  });
  const address = accounts[0];
  
  // 2. Request nonce
  const { nonce, message } = await fetch('http://localhost:8087/api/web3/wallet/request-nonce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress: address })
  }).then(r => r.json());
  
  // 3. Sign message
  const signature = await window.ethereum.request({
    method: 'personal_sign',
    params: [message, address]
  });
  
  // 4. Verify and authenticate
  const { token, wallet } = await fetch('http://localhost:8087/api/web3/wallet/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress: address, signature, message })
  }).then(r => r.json());
  
  // 5. Store token and update UI
  localStorage.setItem('web3_token', token);
  console.log('Connected:', wallet.address);
}
```

---

## 📊 **Current Status**

### ✅ Completed:
- [x] Web3 service infrastructure
- [x] Database models (5 schemas)
- [x] Multi-chain provider (4 chains)
- [x] Wallet authentication system
- [x] API routes for wallet management
- [x] Docker configuration
- [x] UI API integration

### ⏳ Building:
- Web3 service Docker image (in progress)

### 🔜 Next Steps (After Build Completes):

**STEP 2:** Start the service & test wallet auth
**STEP 3:** Add MetaMask button to UI
**STEP 4:** Implement crypto payments
**STEP 5:** Create NFT smart contracts
**STEP 6:** Deploy token rewards system
**STEP 7:** Add blockchain audit logs

---

## 🚀 **Testing Once Service Starts**

### Test Wallet Authentication:
```bash
# 1. Request nonce
curl -X POST http://localhost:8087/api/web3/wallet/request-nonce \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'

# 2. Check service health
curl http://localhost:8087/health

# 3. Get wallet balance
curl http://localhost:8087/api/web3/wallet/balance/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb?chainId=137
```

---

## 🛡️ **Security Features**

1. **Signature Verification** - Cryptographic proof of wallet ownership
2. **Nonce-based Authentication** - Prevents replay attacks
3. **No Private Keys Stored** - Users control their own keys
4. **Multi-chain Support** - Flexibility for users
5. **MongoDB for Metadata** - Fast queries, blockchain for immutability

---

## 💡 **Why This Architecture?**

- **Microservice Pattern** - Separate Web3 concerns from existing services
- **Non-Breaking** - Existing features work independently
- **Scalable** - Can add more chains easily
- **Flexible** - Can integrate with any Web3 wallet
- **Secure** - Industry-standard authentication pattern

---

## 📝 **Environment Variables**

```env
PORT=8087
MONGO_URI=mongodb://ecommerce:ecommerce123@mongodb:27017/web3_db
POLYGON_MUMBAI_RPC=https://rpc-mumbai.maticvigil.com
POLYGON_RPC=https://polygon-rpc.com
ETH_RPC=https://eth.llamarpc.com
BASE_RPC=https://mainnet.base.org
WEB3_PRIVATE_KEY=<your-private-key>  # Optional, for signing
LOG_LEVEL=info
```

---

## 🎨 **Next: UI Components**

Once the service is running, we'll add:
1. **MetaMask Connect Button**
2. **Wallet Display Component**
3. **Crypto Payment Option**
4. **NFT Certificate Viewer**
5. **Token Rewards Dashboard**

---

**Status:** Building Docker image... ⏳
**Estimated Time:** 2-3 minutes
**Next Command:** `docker-compose up -d web3-service`
