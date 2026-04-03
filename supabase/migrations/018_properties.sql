-- ─── 018_properties.sql ──────────────────────────────────────────────────────
-- Curated vacation rental properties: full microsite, native booking, iCal sync

-- ── Core properties table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          UUID REFERENCES auth.users(id),
  slug              TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  tagline           TEXT,
  location          TEXT,
  region            TEXT,
  lat               DECIMAL(9,6),
  lng               DECIMAL(9,6),
  description       TEXT,
  photos            TEXT[]  DEFAULT '{}',   -- ordered; [0] = hero image
  positioning_tags  TEXT[]  DEFAULT '{}',   -- ["Family compound","Ski basecamp"]
  amenities         TEXT[]  DEFAULT '{}',
  max_guests        INT     DEFAULT 8,
  bedrooms          INT,
  bathrooms         DECIMAL(3,1),
  -- Pricing
  price_per_night   DECIMAL(10,2),
  cleaning_fee      DECIMAL(10,2) DEFAULT 0,
  platform_fee_rate DECIMAL(5,4)  DEFAULT 0.06,   -- 6% (~50% of Airbnb's 12%)
  min_nights        INT           DEFAULT 2,
  cushion_days      INT           DEFAULT 1,       -- blocked buffer days between bookings
  -- Settings
  active            BOOLEAN DEFAULT true,
  instant_book      BOOLEAN DEFAULT false,
  -- Stripe Connect (owner payout)
  owner_stripe_id   TEXT,
  -- Meta
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ── Availability blocks (iCal + manual) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_blocks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID REFERENCES properties(id) ON DELETE CASCADE,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  source        TEXT DEFAULT 'manual',   -- 'airbnb' | 'vrbo' | 'manual' | 'booking'
  ical_uid      TEXT,                    -- dedup iCal VEVENT UIDs
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS property_blocks_property_id_idx ON property_blocks(property_id);
CREATE INDEX IF NOT EXISTS property_blocks_dates_idx ON property_blocks(start_date, end_date);

-- ── Native bookings ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_bookings (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_code        TEXT UNIQUE,
  property_id              UUID REFERENCES properties(id),
  guest_id                 UUID REFERENCES auth.users(id),
  check_in                 DATE NOT NULL,
  check_out                DATE NOT NULL,
  guests                   INT  DEFAULT 1,
  nights                   INT,
  base_total               DECIMAL(10,2),
  cleaning_fee             DECIMAL(10,2) DEFAULT 0,
  platform_fee             DECIMAL(10,2) DEFAULT 0,
  damage_waiver            DECIMAL(10,2) DEFAULT 0,
  tax_amount               DECIMAL(10,2) DEFAULT 0,
  total                    DECIMAL(10,2),
  security_deposit         DECIMAL(10,2) DEFAULT 500,
  deposit_intent_id        TEXT,            -- Stripe PI held (not captured)
  deposit_released_at      TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  status                   TEXT DEFAULT 'pending',  -- pending|confirmed|cancelled|completed
  damage_waiver_opted      BOOLEAN DEFAULT false,
  terms_accepted_at        TIMESTAMPTZ,
  special_requests         TEXT,
  created_at               TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS property_bookings_property_id_idx ON property_bookings(property_id);
CREATE INDEX IF NOT EXISTS property_bookings_guest_id_idx ON property_bookings(guest_id);

-- ── iCal feed registry ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_ical_feeds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  label       TEXT,           -- "Airbnb", "VRBO"
  url         TEXT NOT NULL,
  last_synced TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE properties        ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_blocks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_ical_feeds ENABLE ROW LEVEL SECURITY;

-- properties: public read active; owner full CRUD
CREATE POLICY "properties_public_read"  ON properties FOR SELECT USING (active = true);
CREATE POLICY "properties_owner_manage" ON properties FOR ALL   USING (auth.uid() = owner_id);

-- blocks: public read (calendar availability); owner can manage
CREATE POLICY "blocks_public_read"   ON property_blocks FOR SELECT USING (true);
CREATE POLICY "blocks_owner_manage"  ON property_blocks FOR ALL USING (
  property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
);

-- bookings: guest sees own; owner sees their property bookings
CREATE POLICY "bookings_guest_own"   ON property_bookings FOR ALL    USING (auth.uid() = guest_id);
CREATE POLICY "bookings_owner_read"  ON property_bookings FOR SELECT USING (
  property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
);

-- ical feeds: owner only
CREATE POLICY "ical_owner_manage" ON property_ical_feeds FOR ALL USING (
  property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
);
