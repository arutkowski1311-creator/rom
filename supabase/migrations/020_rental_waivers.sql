-- ─── 020_rental_waivers.sql ──────────────────────────────────────────────────
-- Signed liability waivers for rental bookings + waiver tracking columns

CREATE TABLE IF NOT EXISTS rental_signed_waivers (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_booking_id        UUID REFERENCES rental_bookings(id) ON DELETE CASCADE NOT NULL,
  rental_id                UUID REFERENCES rentals(id) NOT NULL,
  guest_id                 UUID NOT NULL,
  waiver_version           TEXT NOT NULL DEFAULT '1.0',
  waiver_content           TEXT NOT NULL,     -- full text snapshot at time of signing (immutable)
  guest_legal_name         TEXT NOT NULL,     -- typed legal name
  guest_email              TEXT,
  signature_text           TEXT NOT NULL,     -- typed signature
  signed_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  emergency_contact_name   TEXT,
  emergency_contact_phone  TEXT,
  participant_count        INT DEFAULT 1,
  minor_participants       JSONB DEFAULT '[]',  -- [{ name, age }]
  created_at               TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rental_signed_waivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rental_waiver_guest_read"   ON rental_signed_waivers FOR SELECT USING (guest_id = auth.uid());
CREATE POLICY "rental_waiver_service_insert" ON rental_signed_waivers FOR INSERT WITH CHECK (true);

-- Track waiver on rental booking
ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS waiver_signed       BOOLEAN   DEFAULT false;
ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS waiver_signed_at    TIMESTAMPTZ;
ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS waiver_id           UUID REFERENCES rental_signed_waivers(id);
ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS guest_legal_name    TEXT;
ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS emergency_contact   TEXT;

CREATE INDEX IF NOT EXISTS idx_rental_waivers_booking ON rental_signed_waivers(rental_booking_id);
