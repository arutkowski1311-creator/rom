-- Add pricing bounds and auto-pricing to packages
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS price_floor NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_ceiling NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS auto_pricing_enabled BOOLEAN DEFAULT false;

-- Pricing recommendations
CREATE TABLE IF NOT EXISTS pricing_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE NOT NULL,
  current_price NUMERIC(10,2) NOT NULL,
  recommended_price NUMERIC(10,2) NOT NULL,
  confidence TEXT CHECK (confidence IN ('low', 'medium', 'high')),
  reasoning TEXT,
  signals JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'dismissed', 'auto_applied', 'expired')),
  applied_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_recs_guide ON pricing_recommendations(guide_id);
CREATE INDEX IF NOT EXISTS idx_pricing_recs_status ON pricing_recommendations(status) WHERE status = 'pending';

ALTER TABLE pricing_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guides_own_pricing_recs" ON pricing_recommendations
  FOR ALL USING (guide_id IN (SELECT id FROM guides WHERE profile_id = auth.uid()));
