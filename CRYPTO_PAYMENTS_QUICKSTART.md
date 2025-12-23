# 🚀 Quick Start: Testing Crypto Payments

## Start Services

```bash
# Start all services
cd /home/dharunthegreat/Downloads/kafka
docker-compose up -d

# Check services are running
docker ps

# Start the UI
cd ui
npm run dev
```

## Test Flow

### 1. **Connect Wallet** (Top Right)
- Click purple "Connect Wallet" button
- Approve MetaMask connection
- See your wallet address and balance

### 2. **Shop & Add to Cart**
- Browse product catalog
- Click "Add to Cart" on products
- See cart count update

### 3. **Checkout**
- Click cart icon (top right)
- Review cart items
- See two payment options:
  - 💳 **PayPal** (blue button) - traditional payment
  - ⚡ **Crypto** (purple/pink button) - blockchain payment

### 4. **Pay with Crypto**
- Click "⚡ Crypto" button
- **Select cryptocurrency:**
  - ⬡ **MATIC** - Recommended, lowest fees
  - ⟠ **ETH** - Most secure
  - $ **USDC** - Stablecoin
  - ₮ **USDT** - Stablecoin
- Click "Continue to Payment"

### 5. **Complete Payment**
- See crypto amount and wallet address
- Click "Pay with MetaMask"
- Confirm transaction in MetaMask popup
- Wait for confirmation (5-10 seconds)
- ✅ Payment confirmed!

## Quick API Tests

```bash
# Get supported cryptos
curl http://localhost:8087/api/web3/payment/supported | jq

# Get current prices
curl http://localhost:8087/api/web3/payment/prices/current | jq

# Create test payment
curl -X POST http://localhost:8087/api/web3/payment/create \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test-123",
    "amount": 50,
    "cryptoCurrency": "MATIC",
    "chainId": 137
  }' | jq

# Check service health
curl http://localhost:8087/health | jq
```

## Service URLs

- **Frontend**: http://localhost:3001
- **Web3 API**: http://localhost:8087
- **Catalog API**: http://localhost:8083
- **User API**: http://localhost:8086

## Expected Results

### ✅ Wallet Connection
```
Connected to: 0x1234...5678
Balance: 10.5 MATIC
Network: Polygon
```

### ✅ Payment Creation
```json
{
  "paymentId": "uuid...",
  "cryptoAmount": "62.50000000",
  "cryptoCurrency": "MATIC",
  "walletAddress": "0xabcd...",
  "status": "pending"
}
```

### ✅ Payment Confirmation
```
✓ Transaction sent
✓ Confirmations: 3/3
✓ Payment confirmed!
✓ Order completed
```

## Troubleshooting

### No MetaMask?
1. Install: https://metamask.io
2. Create wallet or import
3. Get test MATIC: https://faucet.polygon.technology/

### Service Not Running?
```bash
docker-compose restart web3-service
docker logs kafka-web3-service-1
```

### Price Shows $0?
- Wait 60 seconds for cache refresh
- Check: `curl http://localhost:8087/api/web3/payment/prices/current`

## Features Working

✅ Connect Wallet
✅ Select Cryptocurrency
✅ Real-time Price Conversion
✅ Create Payment Request
✅ Send Transaction via MetaMask
✅ Verify on Blockchain
✅ Track Confirmations
✅ Complete Order

## Ready for Production?

### For Demo/Development: ✅ Ready Now!
- All features working
- Using test wallets
- Free RPC providers

### For Production: Need Updates
- [ ] Use dedicated payment wallet
- [ ] Secure key management (AWS KMS)
- [ ] Paid RPC providers (Alchemy/Infura)
- [ ] Payment processor integration
- [ ] Webhook notifications
- [ ] Refund functionality

---

**Status**: Step 3 COMPLETE ✅

**Next**: Step 4 - NFT Product Certificates 🎫
