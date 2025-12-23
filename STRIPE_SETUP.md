# Stripe Payment Integration Setup

## Overview
This e-commerce platform now supports Stripe payments with:
- **Stripe Checkout** for secure payment processing
- **Webhook handling** for real-time payment status updates
- **PostgreSQL database** for payment record storage
- **Automated order fulfillment** on successful payment

## Prerequisites
1. **Stripe Account**: Sign up at [stripe.com](https://stripe.com)
2. **Stripe API Keys**: Get from [Dashboard → API Keys](https://dashboard.stripe.com/apikeys)
3. **Webhook Secret**: Create webhook endpoint and get secret

## Setup Steps

### 1. Get Stripe API Keys
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```bash
cp .env.example .env
```

Edit `.env` and add your keys:
```env
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 3. Set Up Webhooks (for production)
1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Set endpoint URL: `https://your-domain.com/api/payments/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add it to your `.env` file

### 4. Run Database Migration
The payments table will be created automatically when you start the services:
```bash
docker-compose up -d postgres
docker-compose exec postgres psql -U ecommerce -d orders_db -f /docker-entrypoint-initdb.d/002_create_payments_table.sql
```

### 5. Start Services
```bash
docker-compose up --build payment-service
```

## API Endpoints

### Create Stripe Checkout Session
```http
POST /api/payments/create-checkout
Content-Type: application/json

{
  "order_id": "order_123",
  "amount": 99.99,
  "currency": "usd",
  "success_url": "http://localhost:3001/success?session_id={CHECKOUT_SESSION_ID}",
  "cancel_url": "http://localhost:3001/cancel"
}
```

**Response:**
```json
{
  "payment_id": "uuid-here",
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "status": "pending"
}
```

### Stripe Webhook Handler
```http
POST /api/payments/webhook
Content-Type: application/json
Stripe-Signature: t=...,v1=...

{
  "type": "checkout.session.completed",
  "data": {...}
}
```

### Get Payment Status
```http
GET /api/payments/{payment_id}
```

**Response:**
```json
{
  "id": "uuid-here",
  "order_id": "order_123",
  "amount": 99.99,
  "currency": "usd",
  "stripe_session_id": "cs_test_...",
  "stripe_payment_intent": "pi_...",
  "status": "completed",
  "created_at": "2025-11-21T10:00:00Z",
  "updated_at": "2025-11-21T10:01:30Z"
}
```

## Testing

### Test Cards
Use Stripe's test cards for development:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Use any future expiry date, any 3-digit CVC, and any postal code.

### Test Webhooks Locally
Use Stripe CLI to forward webhooks to localhost:
```bash
stripe login
stripe listen --forward-to localhost:8084/api/payments/webhook
```

This will give you a webhook signing secret starting with `whsec_`.

## UI Integration

The UI now includes a Stripe Checkout button. When clicked:
1. Creates order in order-service
2. Calls `/api/payments/create-checkout` endpoint
3. Redirects user to Stripe Checkout page
4. User completes payment on Stripe
5. Stripe sends webhook to update payment status
6. User redirected back to success/cancel page

## Payment Flow

```
User Cart → Create Order → Create Stripe Checkout → User Pays on Stripe
                                                            ↓
Success Page ← Order Fulfilled ← Webhook Received ← Payment Completed
```

## Database Schema

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    stripe_session_id VARCHAR(255),
    stripe_payment_intent VARCHAR(255),
    status VARCHAR(50) NOT NULL,  -- 'pending', 'completed', 'failed', 'expired'
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

## Security Best Practices

1. **Never expose secret keys** in client-side code
2. **Always verify webhook signatures** to prevent fraud
3. **Use HTTPS** in production for webhook endpoints
4. **Store keys in environment variables**, not in code
5. **Rotate keys regularly** from Stripe Dashboard
6. **Monitor webhook deliveries** in Stripe Dashboard

## Troubleshooting

### Webhook not receiving events
- Check webhook endpoint URL is publicly accessible
- Verify webhook secret is correct
- Check Stripe Dashboard for webhook delivery logs
- Ensure firewall allows incoming traffic on webhook port

### Payment not updating in database
- Check Kafka is running and accessible
- Verify DATABASE_URL environment variable
- Check payment-service logs: `docker logs kafka-payment-service-1`
- Ensure PostgreSQL migrations ran successfully

### Checkout session creation fails
- Verify STRIPE_SECRET_KEY is correct
- Check amount is in correct format (dollars, not cents)
- Ensure success_url and cancel_url are valid URLs
- Check payment-service logs for detailed error

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Checkout Docs](https://stripe.com/docs/payments/checkout)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Test Card Numbers](https://stripe.com/docs/testing)

## Support

For issues or questions:
1. Check payment-service logs
2. Review Stripe Dashboard for payment details
3. Test with Stripe CLI locally
4. Check webhook delivery attempts in Stripe Dashboard
