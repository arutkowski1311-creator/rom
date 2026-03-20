-- ─── PER-BOOKING EXPENSE TRACKING ──────────────────────────────────────────
-- Links expenses to specific bookings for trip profitability analysis

-- Add booking_id to expenses table for per-trip expense linking
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_booking ON expenses(booking_id);
