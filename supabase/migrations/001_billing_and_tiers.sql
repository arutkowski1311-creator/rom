-- ─── ROM BILLING & TIER INFRASTRUCTURE ───────────────────────────────────────
-- Run in Supabase SQL Editor

-- 1. Platform config (admin-configurable settings)
CREATE TABLE IF NOT EXISTS platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO platform_config (key, value) VALUES
  ('deposit_rate', '"0.25"'),
  ('balance_charge_days_before', '"14"')
ON CONFLICT (key) DO NOTHING;

-- 2. Add subscription/tier fields to guides
ALTER TABLE guides
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'trail'
    CHECK (subscription_tier IN ('trail', 'pro', 'elite')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'past_due', 'cancelled', 'trialing')),
  ADD COLUMN IF NOT EXISTS billing_cycle_start TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS tier_started_at TIMESTAMPTZ;

-- 3. Payments table (tracks all Stripe transactions)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  guide_id UUID REFERENCES guides(id),
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL, -- cents
  type TEXT NOT NULL CHECK (type IN ('deposit', 'balance', 'refund', 'subscription')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
  commission_rate NUMERIC(4,3),
  commission_amount INTEGER, -- cents
  guide_payout_amount INTEGER, -- cents
  stripe_transfer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Add payment tracking to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS deposit_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS balance_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS balance_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(4,3);

-- 5. Add stripe customer to profiles (for saved payment methods)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- 6. Guide billing ledger (monthly billing cycles)
CREATE TABLE IF NOT EXISTS guide_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES guides(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  plan TEXT NOT NULL,
  monthly_minimum NUMERIC(10,2) NOT NULL,
  commission_rate NUMERIC(5,4) NOT NULL,
  gross_bookings NUMERIC(10,2) DEFAULT 0,
  commission_total NUMERIC(10,2) DEFAULT 0,
  total_charged NUMERIC(10,2) DEFAULT 0,
  stripe_invoice_id TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'paid', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Commission ledger (one row per booking)
CREATE TABLE IF NOT EXISTS commission_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES guides(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  booking_total NUMERIC(10,2) NOT NULL,
  commission_rate NUMERIC(5,4) NOT NULL,
  commission_amt NUMERIC(10,2) NOT NULL,
  period_month TEXT NOT NULL, -- YYYY-MM
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Expenses table (for guide business tools)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES guides(id) NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  receipt_url TEXT,
  ai_categorized BOOLEAN DEFAULT false,
  tax_deductible BOOLEAN DEFAULT true,
  mileage NUMERIC(8,1),
  mileage_rate NUMERIC(4,3) DEFAULT 0.70,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Analytics events
CREATE TABLE IF NOT EXISTS guide_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES guides(id) NOT NULL,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guide_analytics_guide_date
  ON guide_analytics(guide_id, created_at);

-- 10. Marketing content
CREATE TABLE IF NOT EXISTS marketing_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES guides(id) NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Trip plans (Concierge)
CREATE TABLE IF NOT EXISTS trip_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES profiles(id),
  session_id TEXT,
  status TEXT DEFAULT 'in_progress',
  destination TEXT,
  activity_types TEXT[],
  date_start DATE,
  date_end DATE,
  group_size INTEGER,
  experience_level TEXT,
  budget_range TEXT,
  special_requests TEXT,
  itinerary JSONB,
  matched_guide_id UUID REFERENCES guides(id),
  refinement_history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Saved guides
CREATE TABLE IF NOT EXISTS saved_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  guide_id UUID REFERENCES guides(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, guide_id)
);

-- 13. Guest CRM profiles
CREATE TABLE IF NOT EXISTS guest_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  guide_id UUID REFERENCES guides(id) NOT NULL,
  notes TEXT,
  tags TEXT[],
  total_trips INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  last_trip_date DATE,
  next_followup_date DATE,
  followup_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, guide_id)
);

-- 14. RLS policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_profiles ENABLE ROW LEVEL SECURITY;

-- Guides see their own data
CREATE POLICY "Guides see own billing" ON guide_billing FOR SELECT
  USING (guide_id IN (SELECT id FROM guides WHERE profile_id = auth.uid()));

CREATE POLICY "Guides see own commission" ON commission_ledger FOR SELECT
  USING (guide_id IN (SELECT id FROM guides WHERE profile_id = auth.uid()));

CREATE POLICY "Guides manage own expenses" ON expenses FOR ALL
  USING (guide_id IN (SELECT id FROM guides WHERE profile_id = auth.uid()));

CREATE POLICY "Guides see own analytics" ON guide_analytics FOR SELECT
  USING (guide_id IN (SELECT id FROM guides WHERE profile_id = auth.uid()));

CREATE POLICY "Guides manage own marketing" ON marketing_content FOR ALL
  USING (guide_id IN (SELECT id FROM guides WHERE profile_id = auth.uid()));

CREATE POLICY "Guests see own trip plans" ON trip_plans FOR ALL
  USING (guest_id = auth.uid());

CREATE POLICY "Users manage own saved guides" ON saved_guides FOR ALL
  USING (profile_id = auth.uid());

CREATE POLICY "Guides manage own CRM" ON guest_profiles FOR ALL
  USING (guide_id IN (SELECT id FROM guides WHERE profile_id = auth.uid()));

-- Payments visible to involved parties
CREATE POLICY "Users see own payments" ON payments FOR SELECT
  USING (
    guide_id IN (SELECT id FROM guides WHERE profile_id = auth.uid())
    OR booking_id IN (SELECT id FROM bookings WHERE guest_id = auth.uid())
  );

-- 15. Commission trigger (auto-records commission on booking insert)
CREATE OR REPLACE FUNCTION record_booking_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_rate NUMERIC(5,4);
  v_period TEXT;
BEGIN
  SELECT CASE subscription_tier
    WHEN 'trail' THEN 0.20
    WHEN 'pro'   THEN 0.15
    WHEN 'elite' THEN 0.12
    ELSE 0.20
  END INTO v_rate
  FROM guides WHERE id = NEW.guide_id;

  v_period := TO_CHAR(NOW(), 'YYYY-MM');

  INSERT INTO commission_ledger (
    guide_id, booking_id, booking_total,
    commission_rate, commission_amt, period_month
  ) VALUES (
    NEW.guide_id, NEW.id, NEW.total,
    v_rate, ROUND(NEW.total * v_rate, 2), v_period
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_booking_commission ON bookings;
CREATE TRIGGER trg_booking_commission
  AFTER INSERT ON bookings
  FOR EACH ROW
  WHEN (NEW.status != 'cancelled')
  EXECUTE FUNCTION record_booking_commission();

-- 16. Analytics insert policy (allow from API)
CREATE POLICY "Anyone can insert analytics" ON guide_analytics FOR INSERT
  WITH CHECK (true);
