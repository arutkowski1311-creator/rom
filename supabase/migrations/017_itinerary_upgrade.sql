-- 017: Itinerary upgrade — premium content schema + status + weather

-- Add new columns to existing itineraries table
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS content JSONB;
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS weather_data JSONB;
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS guest_id UUID;

-- Add check constraint for status
ALTER TABLE itineraries DROP CONSTRAINT IF EXISTS itineraries_status_check;
ALTER TABLE itineraries ADD CONSTRAINT itineraries_status_check
  CHECK (status IN ('draft', 'published', 'archived'));

-- Allow guests to read their own published itineraries
DROP POLICY IF EXISTS "guests_read_own_itineraries" ON itineraries;
CREATE POLICY "guests_read_own_itineraries" ON itineraries
  FOR SELECT USING (guest_id = auth.uid() AND status = 'published');

-- Index for guest lookups
CREATE INDEX IF NOT EXISTS idx_itineraries_guest ON itineraries(guest_id) WHERE guest_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_itineraries_status ON itineraries(status);
