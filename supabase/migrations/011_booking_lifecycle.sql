-- 011: Booking lifecycle + Guest CRM enhancement
-- Adds columns for trip completion, cancellation, refunds, review tracking,
-- itinerary tracking, and enriches guest_profiles for CRM.

-- 1. Booking lifecycle columns
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_stripe_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS review_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS itinerary_sent_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS post_trip_sent_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS mileage_trip_id UUID REFERENCES mileage_trips(id);

-- 2. Guest CRM enrichment
ALTER TABLE guest_profiles ADD COLUMN IF NOT EXISTS experience_level TEXT;
ALTER TABLE guest_profiles ADD COLUMN IF NOT EXISTS lifetime_value NUMERIC(10,2) DEFAULT 0;
ALTER TABLE guest_profiles ADD COLUMN IF NOT EXISTS vip BOOLEAN DEFAULT false;
ALTER TABLE guest_profiles ADD COLUMN IF NOT EXISTS preferred_activities TEXT[] DEFAULT '{}';
ALTER TABLE guest_profiles ADD COLUMN IF NOT EXISTS booking_count INTEGER DEFAULT 0;
ALTER TABLE guest_profiles ADD COLUMN IF NOT EXISTS first_trip_date DATE;
ALTER TABLE guest_profiles ADD COLUMN IF NOT EXISTS outreach_count INTEGER DEFAULT 0;
ALTER TABLE guest_profiles ADD COLUMN IF NOT EXISTS last_outreach_at TIMESTAMPTZ;
ALTER TABLE guest_profiles ADD COLUMN IF NOT EXISTS booking_months INTEGER[] DEFAULT '{}';

-- 3. Mileage → Booking link
ALTER TABLE mileage_trips ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id);

-- 4. Indexes for cron queries
CREATE INDEX IF NOT EXISTS idx_bookings_guide_trip_date ON bookings(guide_id, trip_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_completed_at ON bookings(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guest_profiles_guide ON guest_profiles(guide_id);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_last_trip ON guest_profiles(last_trip_date);
