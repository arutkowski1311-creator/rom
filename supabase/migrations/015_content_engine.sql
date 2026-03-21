-- 015: Content engine + calendar fill + waitlist

-- 1. Content pieces table
CREATE TABLE IF NOT EXISTS content_pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,        -- instagram, facebook, email, reel_script
  platform TEXT,             -- instagram, facebook, email, tiktok
  content TEXT NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  image_prompt TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','edited','skipped','published','scheduled')),
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  ai_model TEXT,
  generation_context JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE content_pieces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guides_manage_own_content" ON content_pieces
  FOR ALL USING (guide_id IN (SELECT id FROM guides WHERE profile_id = auth.uid()));

-- 2. Guide content features junction
CREATE TABLE IF NOT EXISTS guide_content_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
  content_piece_id UUID REFERENCES content_pieces(id) ON DELETE CASCADE NOT NULL,
  feature_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE guide_content_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guides_see_own_features" ON guide_content_features
  FOR ALL USING (guide_id IN (SELECT id FROM guides WHERE profile_id = auth.uid()));

-- 3. Waitlist
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
  guest_email TEXT,
  guest_name TEXT,
  package_id UUID REFERENCES packages(id),
  preferred_dates TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guides_manage_own_waitlist" ON waitlist
  FOR ALL USING (guide_id IN (SELECT id FROM guides WHERE profile_id = auth.uid()));

-- 4. Calendar fill intelligence
ALTER TABLE guide_intelligence ADD COLUMN IF NOT EXISTS booking_pace_current NUMERIC(6,2);
ALTER TABLE guide_intelligence ADD COLUMN IF NOT EXISTS booking_pace_historical NUMERIC(6,2);
ALTER TABLE guide_intelligence ADD COLUMN IF NOT EXISTS pace_gap_percent NUMERIC(5,2);
ALTER TABLE guide_intelligence ADD COLUMN IF NOT EXISTS calendar_fill_triggered_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_pieces_guide ON content_pieces(guide_id);
CREATE INDEX IF NOT EXISTS idx_content_pieces_status ON content_pieces(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_guide ON waitlist(guide_id);
