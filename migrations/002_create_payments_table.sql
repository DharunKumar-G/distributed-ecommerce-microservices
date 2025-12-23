-- Create payments table for Stripe integration
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    stripe_session_id VARCHAR(255),
    stripe_payment_intent VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session_id ON payments(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Comments for documentation
COMMENT ON TABLE payments IS 'Stores payment transaction records integrated with Stripe';
COMMENT ON COLUMN payments.id IS 'Unique payment identifier';
COMMENT ON COLUMN payments.order_id IS 'Reference to the order being paid for';
COMMENT ON COLUMN payments.stripe_session_id IS 'Stripe Checkout Session ID';
COMMENT ON COLUMN payments.stripe_payment_intent IS 'Stripe Payment Intent ID';
COMMENT ON COLUMN payments.status IS 'Payment status: pending, completed, failed, expired';
