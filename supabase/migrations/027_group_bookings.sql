-- Group/corporate bookings
CREATE TABLE IF NOT EXISTS group_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES profiles(id) NOT NULL,
  guide_id UUID REFERENCES guides(id) NOT NULL,
  package_id UUID REFERENCES packages(id),
  group_name TEXT NOT NULL,
  headcount INTEGER NOT NULL CHECK (headcount >= 2),
  company_name TEXT,
  billing_email TEXT NOT NULL,
  billing_contact TEXT,
  preferred_dates TEXT[],
  special_requests TEXT,
  status TEXT DEFAULT 'inquiry' CHECK (status IN (
    'inquiry', 'quoted', 'accepted', 'invoiced', 'paid', 'confirmed', 'completed', 'cancelled'
  )),
  quoted_total INTEGER,
  discount_rate NUMERIC(5,4),
  stripe_invoice_id TEXT,
  payment_due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_bookings_guide ON group_bookings(guide_id);
CREATE INDEX IF NOT EXISTS idx_group_bookings_status ON group_bookings(status);

-- Link individual bookings to a group
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS group_booking_id UUID REFERENCES group_bookings(id);

-- Group discount tiers on packages
ALTER TABLE packages ADD COLUMN IF NOT EXISTS group_discount_tiers JSONB DEFAULT '[]';

-- RLS
ALTER TABLE group_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organizers_own_groups" ON group_bookings
  FOR SELECT USING (auth.uid() = organizer_id);

CREATE POLICY "guides_own_group_requests" ON group_bookings
  FOR ALL USING (guide_id IN (SELECT id FROM guides WHERE profile_id = auth.uid()));
