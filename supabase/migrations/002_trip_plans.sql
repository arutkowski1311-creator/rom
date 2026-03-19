-- ─── TRIP PLANS (Concierge) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  destination TEXT NOT NULL,
  activity_types TEXT[] NOT NULL DEFAULT '{}',
  date_start DATE,
  date_end DATE,
  group_size INT DEFAULT 2,
  experience_level TEXT DEFAULT 'intermediate',
  budget_range TEXT DEFAULT 'moderate',
  special_requests TEXT,
  itinerary JSONB,
  matched_guide_id UUID,
  refinement_history JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'complete',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE trip_plans ENABLE ROW LEVEL SECURITY;

-- Guests can read their own trip plans
DO $$ BEGIN
CREATE POLICY "guests_read_own_plans" ON trip_plans
  FOR SELECT USING (auth.uid() = guest_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Service role can do everything (API routes use admin client)
DO $$ BEGIN
CREATE POLICY "service_full_access" ON trip_plans
  FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for guest lookups
CREATE INDEX IF NOT EXISTS idx_trip_plans_guest ON trip_plans(guest_id);
CREATE INDEX IF NOT EXISTS idx_trip_plans_destination ON trip_plans(destination);
