-- Trips table: groups bookings across verticals into one trip
CREATE TABLE IF NOT EXISTS trips (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id    UUID REFERENCES auth.users(id),
  name        TEXT,
  trip_plan_id UUID REFERENCES trip_plans(id),
  status      TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'checkout', 'confirmed', 'completed', 'cancelled')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Link each booking type to a trip
ALTER TABLE bookings          ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES trips(id);
ALTER TABLE property_bookings ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES trips(id);
ALTER TABLE rental_bookings   ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES trips(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trips_guest_id ON trips(guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_trip_id ON bookings(trip_id) WHERE trip_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_property_bookings_trip_id ON property_bookings(trip_id) WHERE trip_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rental_bookings_trip_id ON rental_bookings(trip_id) WHERE trip_id IS NOT NULL;

-- RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trips_guest_own" ON trips FOR ALL USING (auth.uid() = guest_id);
