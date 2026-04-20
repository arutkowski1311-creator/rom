-- Referral tracking system
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);

-- Referral events: tracks each referral action
CREATE TABLE IF NOT EXISTS referral_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES profiles(id) NOT NULL,
  referee_id UUID REFERENCES profiles(id) NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('signup', 'first_booking')),
  reward_amount INTEGER NOT NULL DEFAULT 0,
  booking_id UUID REFERENCES bookings(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_events_referrer ON referral_events(referrer_id);

-- Referral credits: spendable account balance
CREATE TABLE IF NOT EXISTS referral_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  amount INTEGER NOT NULL,
  source_event_id UUID REFERENCES referral_events(id),
  booking_id UUID REFERENCES bookings(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_credits_profile ON referral_credits(profile_id);

-- RLS
ALTER TABLE referral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_referral_events" ON referral_events
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

CREATE POLICY "users_own_credits" ON referral_credits
  FOR SELECT USING (auth.uid() = profile_id);
