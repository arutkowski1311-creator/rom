-- Mileage trips table for GPS-tracked mileage logging
CREATE TABLE IF NOT EXISTS mileage_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  description TEXT DEFAULT 'Trip',
  miles NUMERIC(8,1) NOT NULL DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  route_points JSONB DEFAULT '[]'::jsonb,
  deduction_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  mileage_rate NUMERIC(4,2) NOT NULL DEFAULT 0.70,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for guide lookups
CREATE INDEX IF NOT EXISTS idx_mileage_trips_guide ON mileage_trips(guide_id);
CREATE INDEX IF NOT EXISTS idx_mileage_trips_date ON mileage_trips(guide_id, date);

-- RLS
ALTER TABLE mileage_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guides can manage own mileage trips"
  ON mileage_trips FOR ALL
  USING (true)
  WITH CHECK (true);
