-- Partner lodging table for Airbnb/property partners whose listings get prioritized in concierge
CREATE TABLE IF NOT EXISTS partner_lodging (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  region TEXT,
  type TEXT DEFAULT 'airbnb',
  description TEXT,
  price_per_night DECIMAL(10,2),
  max_guests INT DEFAULT 4,
  amenities TEXT[],
  booking_url TEXT NOT NULL,
  photo_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE partner_lodging ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own listings
DO $$ BEGIN
CREATE POLICY "owner_manage_own_lodging" ON partner_lodging
  FOR ALL USING (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Public read access for active listings
DO $$ BEGIN
CREATE POLICY "public_read_active_lodging" ON partner_lodging
  FOR SELECT USING (active = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
