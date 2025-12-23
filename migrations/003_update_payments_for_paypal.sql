-- Update payments table for PayPal integration
-- Drop Stripe-specific columns and add PayPal columns

ALTER TABLE payments 
  DROP COLUMN IF EXISTS stripe_session_id,
  DROP COLUMN IF EXISTS stripe_payment_intent;

ALTER TABLE payments 
  ADD COLUMN IF NOT EXISTS paypal_order_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS paypal_capture_id VARCHAR(255);

-- Update indexes
DROP INDEX IF EXISTS idx_payments_stripe_session_id;
CREATE INDEX IF NOT EXISTS idx_payments_paypal_order_id ON payments(paypal_order_id);

-- Update comments
COMMENT ON TABLE payments IS 'Stores payment transaction records integrated with PayPal';
COMMENT ON COLUMN payments.paypal_order_id IS 'PayPal Order ID';
COMMENT ON COLUMN payments.paypal_capture_id IS 'PayPal Capture ID after order is captured';
