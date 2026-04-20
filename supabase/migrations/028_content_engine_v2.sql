-- Content Engine V2: Intelligence, Calendar, Performance, Extended Types

-- Content intelligence: automated monitoring of opportunities
CREATE TABLE IF NOT EXISTS content_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,  -- seasonal, local_event, news, law_change, weather, trend, review_highlight
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  source TEXT,             -- url or description of source
  relevance_score NUMERIC(3,2) DEFAULT 0.5,  -- 0-1 how relevant to this guide
  suggested_angle TEXT,    -- content angle suggestion
  suggested_types TEXT[],  -- ['instagram','blog','reel']
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'used', 'dismissed', 'expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_intel_guide ON content_intelligence(guide_id);
CREATE INDEX IF NOT EXISTS idx_content_intel_status ON content_intelligence(status) WHERE status = 'new';

-- Extend content_pieces for new types and features
ALTER TABLE content_pieces
  ADD COLUMN IF NOT EXISTS content_type TEXT,         -- post, reel, carousel, blog, article, story, email
  ADD COLUMN IF NOT EXISTS goal TEXT,                 -- awareness, education, lead_gen, booking_gen
  ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}', -- array of photo URLs used
  ADD COLUMN IF NOT EXISTS video_url TEXT,            -- for reels/stories
  ADD COLUMN IF NOT EXISTS intelligence_id UUID REFERENCES content_intelligence(id),
  ADD COLUMN IF NOT EXISTS review_id UUID REFERENCES reviews(id),
  ADD COLUMN IF NOT EXISTS remix_parent_id UUID REFERENCES content_pieces(id),
  ADD COLUMN IF NOT EXISTS title TEXT,                -- for blogs/articles
  ADD COLUMN IF NOT EXISTS meta_description TEXT,     -- SEO for blogs
  ADD COLUMN IF NOT EXISTS export_formats JSONB DEFAULT '{}',  -- {instagram_square: url, story_vertical: url, ...}
  ADD COLUMN IF NOT EXISTS performance JSONB DEFAULT '{}';     -- {views: 0, clicks: 0, bookings: 0, posted_at: null}

-- Content calendar: scheduling and cadence tracking
CREATE TABLE IF NOT EXISTS content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
  content_piece_id UUID REFERENCES content_pieces(id),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME DEFAULT '09:00',
  platform TEXT NOT NULL,  -- instagram, facebook, tiktok, blog, email
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'ready', 'posted', 'skipped')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_calendar_guide ON content_calendar(guide_id);
CREATE INDEX IF NOT EXISTS idx_content_calendar_date ON content_calendar(scheduled_date);

-- RLS
ALTER TABLE content_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guides_own_intel" ON content_intelligence
  FOR ALL USING (guide_id IN (SELECT id FROM guides WHERE profile_id = auth.uid()));

CREATE POLICY "guides_own_calendar" ON content_calendar
  FOR ALL USING (guide_id IN (SELECT id FROM guides WHERE profile_id = auth.uid()));
