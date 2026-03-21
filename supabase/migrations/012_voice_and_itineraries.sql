-- 012: Voice profiles + itinerary engine
-- Adds AI voice profile fields to guides, creates itineraries table for per-booking trip plans.

-- 1. Voice profile fields on guides
ALTER TABLE guides ADD COLUMN IF NOT EXISTS voice_profile JSONB;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS ai_headline TEXT;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS ai_bio TEXT;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS specialty_keywords TEXT[] DEFAULT '{}';
ALTER TABLE guides ADD COLUMN IF NOT EXISTS onboarding_interview JSONB;

-- 2. Itineraries table
CREATE TABLE IF NOT EXISTS itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE UNIQUE,
  guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
  guide_version JSONB,       -- guide briefing: guest summary, conditions, approach, gear, red flags
  guest_version JSONB,       -- guest itinerary: welcome, timeline, what to bring, meeting point
  conditions_snapshot JSONB, -- weather/conditions at generation time
  generated_at TIMESTAMPTZ,
  guide_sent_at TIMESTAMPTZ,
  guest_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guides_manage_own_itineraries" ON itineraries
  FOR ALL USING (guide_id IN (SELECT id FROM guides WHERE profile_id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_itineraries_booking ON itineraries(booking_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_guide ON itineraries(guide_id);
