-- Newsletters: strict-schema NewsletterContent JSON as the source of truth.
-- HTML and the public web page are derived from this row, never the other way
-- around.

-- 1. voice_examples on guides — guide pastes their own posts, AI clones tone
ALTER TABLE guides
  ADD COLUMN IF NOT EXISTS voice_examples TEXT[] DEFAULT '{}';

-- 2. content_pieces gets a typed JSON column (used by carousel, reels, stories,
-- newsletters, and any future structured format). Keeps the legacy `content`
-- TEXT column for backwards compat.
ALTER TABLE content_pieces
  ADD COLUMN IF NOT EXISTS content_json JSONB,
  ADD COLUMN IF NOT EXISTS public_slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS preheader TEXT;

CREATE INDEX IF NOT EXISTS idx_content_pieces_public_slug ON content_pieces(public_slug)
  WHERE public_slug IS NOT NULL;

-- 3. Newsletter sends — track each campaign send for analytics
CREATE TABLE IF NOT EXISTS newsletter_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
  newsletter_id UUID REFERENCES content_pieces(id) ON DELETE CASCADE,
  send_type TEXT NOT NULL CHECK (send_type IN ('test', 'campaign')),
  recipient_email TEXT,
  recipient_count INT DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'bounced')),
  resend_message_id TEXT,
  error TEXT,
  opens INT DEFAULT 0,
  clicks INT DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_sends_guide ON newsletter_sends(guide_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_newsletter ON newsletter_sends(newsletter_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_status ON newsletter_sends(status);

ALTER TABLE newsletter_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guides_own_newsletter_sends" ON newsletter_sends
  FOR ALL USING (guide_id IN (SELECT id FROM guides WHERE profile_id = auth.uid()));

-- 4. Email subscribers — guide's own audience for campaign sends
-- (Stage 4 — tables ready, UI wired later)
CREATE TABLE IF NOT EXISTS email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  source TEXT,                      -- 'csv_import', 'past_guest', 'web_signup', 'manual'
  consent_at TIMESTAMPTZ,
  consent_source TEXT,              -- 'imported', 'opt_in_form', 'booking_checkbox'
  unsubscribed_at TIMESTAMPTZ,
  unsubscribe_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (guide_id, email)
);

CREATE INDEX IF NOT EXISTS idx_email_subscribers_guide ON email_subscribers(guide_id);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_active ON email_subscribers(guide_id) WHERE unsubscribed_at IS NULL;

ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guides_own_subscribers" ON email_subscribers
  FOR ALL USING (guide_id IN (SELECT id FROM guides WHERE profile_id = auth.uid()));
