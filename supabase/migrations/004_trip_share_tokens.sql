-- Add share_token column to trip_plans for shareable URLs
ALTER TABLE trip_plans ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_plans_share_token ON trip_plans(share_token);

-- Update existing rows that don't have a share_token
UPDATE trip_plans SET share_token = gen_random_uuid() WHERE share_token IS NULL;

-- Allow public read access to trip_plans by share_token (no auth required)
DO $$ BEGIN
CREATE POLICY "public_read_by_share_token" ON trip_plans
  FOR SELECT USING (share_token IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
