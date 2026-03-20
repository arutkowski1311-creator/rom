-- Guide notifications for trip matches, booking requests, messages, etc.
CREATE TABLE IF NOT EXISTS guide_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,  -- 'trip_match', 'booking_request', 'message', etc.
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE guide_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "guides_see_own_notifications" ON guide_notifications
  FOR ALL USING (guide_id IN (SELECT id FROM guides WHERE profile_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_guide_notifications_guide ON guide_notifications(guide_id, created_at DESC);
