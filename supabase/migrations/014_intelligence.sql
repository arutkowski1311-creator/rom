-- 014: Guide intelligence engine — health scores, repeat guest tracking, notification upgrade

-- 1. Guide intelligence table
CREATE TABLE IF NOT EXISTS guide_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES guides(id) ON DELETE CASCADE UNIQUE NOT NULL,
  health_score INTEGER,
  health_components JSONB,  -- { booking_velocity: N, review_rating: N, response_time: N, profile_completeness: N, content_activity: N, repeat_rate: N }
  health_action TEXT,       -- one action sentence
  booking_velocity NUMERIC(6,2),
  repeat_rate NUMERIC(5,4),
  avg_response_minutes INTEGER,
  profile_completeness INTEGER,
  content_activity_score INTEGER,
  last_health_computed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE guide_intelligence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guides_see_own_intelligence" ON guide_intelligence
  FOR ALL USING (guide_id IN (SELECT id FROM guides WHERE profile_id = auth.uid()));

-- 2. Guest outreach tracking
ALTER TABLE guest_profiles ADD COLUMN IF NOT EXISTS outreach_history JSONB DEFAULT '[]';
ALTER TABLE guest_profiles ADD COLUMN IF NOT EXISTS preferred_season TEXT;

-- 3. Notification system upgrade
ALTER TABLE guide_notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE guide_notifications ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE guide_notifications ADD COLUMN IF NOT EXISTS action_payload JSONB;
ALTER TABLE guide_notifications ADD COLUMN IF NOT EXISTS auto_executed_at TIMESTAMPTZ;
ALTER TABLE guide_notifications ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ;
ALTER TABLE guide_notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guide_intelligence_guide ON guide_intelligence(guide_id);
CREATE INDEX IF NOT EXISTS idx_notifications_guide_unread ON guide_notifications(guide_id, read_at) WHERE read_at IS NULL;
