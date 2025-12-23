# PayPal Integration Setup Guide

## Overview
This e-commerce platform uses PayPal for payment processing. Orders are created in the system first, then customers are redirected to PayPal to complete payment.

## Prerequisites
- PayPal Business Account (for production) or Personal Account (for sandbox testing)
- PayPal Developer Account: https://developer.paypal.com

## Setup Steps

### 1. Create PayPal App
1. Go to https://developer.paypal.com/dashboard/
2. Log in with your PayPal account
3. Navigate to "My Apps & Credentials"
4. Click "Create App"
5. Enter an app name (e.g., "E-commerce Platform")
6. Select "Merchant" as the app type
7. Click "Create App"

### 2. Get API Credentials

#### Sandbox (Testing)
1. In your app dashboard, select the "Sandbox" tab
2. Copy your **Sandbox Client ID**
3. Click "Show" under Secret to reveal your **Sandbox Secret**
4. Save these credentials

#### Live (Production)
1. In your app dashboard, select the "Live" tab
2. Copy your **Live Client ID**
3. Click "Show" under Secret to reveal your **Live Secret**
4. Save these credentials

### 3. Configure Environment Variables

Create a `.env` file in the project root or update `docker-compose.yml`:

```bash
# For Sandbox Testing (Default)
PAYPAL_CLIENT_ID=your_sandbox_client_id_here
PAYPAL_CLIENT_SECRET=your_sandbox_secret_here
PAYPAL_SANDBOX=true

# For Production
# PAYPAL_CLIENT_ID=your_live_client_id_here
# PAYPAL_CLIENT_SECRET=your_live_secret_here
# PAYPAL_SANDBOX=false
```

### 4. Update docker-compose.yml

The payment service environment should include:
```yaml
payment-service:
  environment:
    PAYPAL_CLIENT_ID: ${PAYPAL_CLIENT_ID:-dummy_client_id}
    PAYPAL_CLIENT_SECRET: ${PAYPAL_CLIENT_SECRET:-dummy_client_secret}
    PAYPAL_SANDBOX: ${PAYPAL_SANDBOX:-true}
```

### 5. Restart Services

```bash
docker-compose up -d --build payment-service
```

## Testing

### Using Sandbox (Test Mode)

1. **Test Buyer Account**
   - Go to https://developer.paypal.com/dashboard/accounts
   - Use the pre-created sandbox buyer account or create a new one
   - Use these credentials when testing payments

2. **Test Payment Flow**
   - Add items to cart in the UI
   - Click "Checkout with PayPal"
   - You'll be redirected to PayPal sandbox
   - Log in with your sandbox buyer account
   - Complete the payment
   - You'll be redirected back to the success page

3. **Sandbox Test Cards**
   PayPal sandbox accounts come pre-funded. You can also link test cards:
   - Test Visa: 4032039904328079
   - Test Mastercard: 5424180279791732
   - Any future expiry date
   - Any CVV

### Viewing Transactions

#### Sandbox Transactions
1. Go to https://developer.paypal.com/dashboard/
2. Navigate to "Sandbox" → "Accounts"
3. Click on your business sandbox account
4. View transactions in the account details

#### Live Transactions
1. Log in to https://www.paypal.com
2. Go to "Activity"
3. View all transactions

## Webhooks (Optional but Recommended)

Webhooks allow PayPal to notify your application about payment events.

### 1. Configure Webhook Endpoint

The payment service exposes a webhook endpoint:
```
POST http://your-domain.com/api/payments/paypal/webhook
```

### 2. Set Up in PayPal Dashboard

1. Go to https://developer.paypal.com/dashboard/
2. Select your app
3. Click "Add Webhook"
4. Enter your webhook URL: `https://your-domain.com/api/payments/paypal/webhook`
5. Select events to subscribe to:
   - `CHECKOUT.ORDER.APPROVED`
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `CHECKOUT.ORDER.VOIDED`

### 3. Local Testing with ngrok

For local development:
```bash
# Install ngrok
npm install -g ngrok

# Create tunnel to your local server
ngrok http 8084

# Use the ngrok URL in PayPal webhook settings
# Example: https://abc123.ngrok.io/api/payments/paypal/webhook
```

## API Endpoints

### Create PayPal Order
```bash
POST /api/payments/paypal/create-order
Content-Type: application/json

{
  "order_id": "ORD-12345",
  "amount": 99.99,
  "currency": "USD",
  "success_url": "http://localhost:3001/success",
  "cancel_url": "http://localhost:3001/cancel"
}
```

Response:
```json
{
  "payment_id": "550e8400-e29b-41d4-a716-446655440000",
  "approval_url": "https://www.sandbox.paypal.com/checkoutnow?token=...",
  "status": "created"
}
```

### Capture Order (Manual)
```bash
POST /api/payments/paypal/capture/:order_id
```

### Get Payment Status
```bash
GET /api/payments/paypal/:payment_id
```

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "order_id": "ORD-12345",
  "amount": 99.99,
  "currency": "USD",
  "paypal_order_id": "5O190127TN364715T",
  "status": "completed",
  "created_at": "2025-11-21T10:00:00Z",
  "updated_at": "2025-11-21T10:05:00Z"
}
```

## Payment Flow

1. **Customer adds items to cart** → UI
2. **Customer clicks "Checkout with PayPal"** → UI sends request to payment service
3. **Payment service creates PayPal order** → Returns approval URL
4. **Customer redirected to PayPal** → Logs in and approves payment
5. **PayPal redirects back** → Customer returns to success URL
6. **Webhook triggered** (if configured) → Payment service captures order automatically
7. **Order marked as completed** → Database updated

## Troubleshooting

### "Failed to create PayPal order"
- Check that your Client ID and Secret are correct
- Verify PAYPAL_SANDBOX is set to `true` for testing
- Check payment service logs: `docker logs kafka-payment-service-1`

### "PayPal auth error"
- Credentials may be incorrect
- Make sure you're using sandbox credentials with PAYPAL_SANDBOX=true
- Check that the secret wasn't truncated when copying

### Webhook not working
- Verify webhook URL is publicly accessible
- Use ngrok for local testing
- Check webhook signature verification is disabled (or implement verification)
- Review PayPal webhook logs in developer dashboard

### Payment stuck in "pending"
- Check if webhook is configured correctly
- Manually capture the order using the capture endpoint
- Verify order was approved in PayPal dashboard

## Going to Production

1. **Get Live Credentials**
   - Switch to "Live" tab in PayPal app dashboard
   - Copy Live Client ID and Secret

2. **Update Environment**
   ```bash
   PAYPAL_CLIENT_ID=your_live_client_id
   PAYPAL_CLIENT_SECRET=your_live_secret
   PAYPAL_SANDBOX=false
   ```

3. **Update Webhook URLs**
   - Change webhook URL to production domain
   - Remove ngrok URLs

4. **Test Thoroughly**
   - Perform test transactions with small amounts
   - Verify webhooks are working
   - Check order status updates

5. **Monitor**
   - Set up logging and monitoring
   - Watch for failed payments
   - Monitor webhook deliveries

## Security Notes

- **Never commit credentials** to version control
- Store credentials in environment variables
- Use HTTPS in production
- Implement webhook signature verification for production
- Regularly rotate API credentials
- Monitor suspicious payment activity

## Support

- PayPal Developer Documentation: https://developer.paypal.com/docs/
- PayPal Sandbox: https://developer.paypal.com/dashboard/
- Community Forum: https://www.paypal-community.com/

## Currency Support

PayPal supports 25+ currencies. Update the `currency` field in the checkout request:
- USD - US Dollar
- EUR - Euro
- GBP - British Pound
- CAD - Canadian Dollar
- AUD - Australian Dollar
- JPY - Japanese Yen
- And more...

See full list: https://developer.paypal.com/docs/reports/reference/paypal-supported-currencies/
