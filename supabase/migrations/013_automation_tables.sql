-- 013: Automated communications — lead response, review collection, licenses, post-trip
-- Adds auto-generated message tracking, licenses table, review solicitation tracking.

-- 1. Auto-generated message tracking
ALTER TABLE messages ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_draft TEXT;

-- 2. Licenses & certifications table
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  license_number TEXT,
  issuing_authority TEXT,
  expiry_date DATE,
  renewal_url TEXT,
  document_url TEXT,
  reminder_60_sent BOOLEAN DEFAULT false,
  reminder_30_sent BOOLEAN DEFAULT false,
  reminder_7_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guides_manage_own_licenses" ON licenses
  FOR ALL USING (guide_id IN (SELECT id FROM guides WHERE profile_id = auth.uid()));

-- 3. Review solicitation tracking
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS solicited BOOLEAN DEFAULT false;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_licenses_guide ON licenses(guide_id);
CREATE INDEX IF NOT EXISTS idx_licenses_expiry ON licenses(expiry_date) WHERE expiry_date IS NOT NULL;
