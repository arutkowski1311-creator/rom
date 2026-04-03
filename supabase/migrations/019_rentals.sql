-- ─── 019_rentals.sql ─────────────────────────────────────────────────────────
-- Boat / equipment rentals — standalone bookable + property add-on

CREATE TABLE IF NOT EXISTS rentals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          UUID REFERENCES auth.users(id),
  slug              TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  tagline           TEXT,
  description       TEXT,
  location          TEXT,
  region            TEXT,
  photos            TEXT[]  DEFAULT '{}',
  vessel_type       TEXT,                        -- 'pontoon', 'kayak', etc.
  vessel_length     TEXT,                        -- '20ft'
  capacity          INT DEFAULT 8,
  includes          TEXT[] DEFAULT '{}',         -- 'Gas', 'Life preservers', 'Cooler', 'Trailering'
  destinations      TEXT[] DEFAULT '{}',         -- ['Lake Placid', 'Saranac Lake']
  -- Pricing
  half_day_price    DECIMAL(10,2),               -- $400
  full_day_price    DECIMAL(10,2),               -- $600
  driver_addon_price DECIMAL(10,2) DEFAULT 0,   -- $150
  platform_fee_rate DECIMAL(5,4)  DEFAULT 0.06,
  -- Settings
  active            BOOLEAN DEFAULT true,
  -- Stripe Connect (owner payout)
  owner_stripe_id   TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rental_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id   UUID REFERENCES rentals(id) ON DELETE CASCADE,
  block_date  DATE NOT NULL,
  source      TEXT DEFAULT 'manual',             -- 'manual' | 'booking'
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rental_blocks_rental_date_idx ON rental_blocks(rental_id, block_date);

CREATE TABLE IF NOT EXISTS rental_bookings (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_code        TEXT UNIQUE,
  rental_id                UUID REFERENCES rentals(id),
  property_booking_id      UUID REFERENCES property_bookings(id),  -- if add-on to a stay
  guest_id                 UUID REFERENCES auth.users(id),
  rental_date              DATE NOT NULL,
  duration                 TEXT NOT NULL,          -- 'half_day' | 'full_day'
  destination              TEXT,                   -- 'Lake Placid' | 'Saranac Lake'
  driver_requested         BOOLEAN DEFAULT false,
  passengers               INT DEFAULT 1,
  base_price               DECIMAL(10,2),
  driver_fee               DECIMAL(10,2) DEFAULT 0,
  platform_fee             DECIMAL(10,2) DEFAULT 0,
  total                    DECIMAL(10,2),
  stripe_payment_intent_id TEXT,
  status                   TEXT DEFAULT 'pending',  -- pending|confirmed|cancelled|completed
  special_requests         TEXT,
  terms_accepted_at        TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE rentals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_blocks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rentals_public_read"  ON rentals FOR SELECT USING (active = true);
CREATE POLICY "rentals_owner_manage" ON rentals FOR ALL   USING (auth.uid() = owner_id);

CREATE POLICY "rental_blocks_public_read"  ON rental_blocks FOR SELECT USING (true);
CREATE POLICY "rental_blocks_owner_manage" ON rental_blocks FOR ALL USING (
  rental_id IN (SELECT id FROM rentals WHERE owner_id = auth.uid())
);

CREATE POLICY "rental_bookings_guest_own"  ON rental_bookings FOR ALL    USING (auth.uid() = guest_id);
CREATE POLICY "rental_bookings_owner_read" ON rental_bookings FOR SELECT USING (
  rental_id IN (SELECT id FROM rentals WHERE owner_id = auth.uid())
);
