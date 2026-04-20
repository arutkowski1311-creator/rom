-- Track booking modifications for audit trail
CREATE TABLE IF NOT EXISTS booking_modifications (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id             UUID REFERENCES bookings(id),
  booking_type           TEXT NOT NULL CHECK (booking_type IN ('guide', 'property', 'rental')),
  requested_by           UUID REFERENCES auth.users(id),
  original_date          DATE,
  new_date               DATE,
  original_guests        INT,
  new_guests             INT,
  price_difference       DECIMAL(10,2) DEFAULT 0,
  status                 TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'rejected')),
  stripe_payment_intent_id TEXT,
  refund_stripe_id       TEXT,
  created_at             TIMESTAMPTZ DEFAULT now(),
  resolved_at            TIMESTAMPTZ
);

ALTER TABLE booking_modifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modifications_own" ON booking_modifications FOR ALL
  USING (auth.uid() = requested_by);

CREATE INDEX IF NOT EXISTS idx_booking_modifications_booking ON booking_modifications(booking_id);
