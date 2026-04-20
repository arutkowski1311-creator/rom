-- Add tip tracking to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tip_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tip_payment_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tip_paid_at TIMESTAMPTZ;

-- Allow 'tip' as a payment type
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_type_check
  CHECK (type IN ('deposit', 'balance', 'refund', 'subscription', 'tip'));
