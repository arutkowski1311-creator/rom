-- ─── RENAME TIERS: trail→spark, pro→discover, elite→immerse ─────────────────

-- Update existing records
UPDATE guides SET subscription_tier = 'spark' WHERE subscription_tier = 'trail';
UPDATE guides SET subscription_tier = 'discover' WHERE subscription_tier = 'pro';
UPDATE guides SET subscription_tier = 'immerse' WHERE subscription_tier = 'elite';

-- Drop old constraint and add new one
ALTER TABLE guides DROP CONSTRAINT IF EXISTS guides_subscription_tier_check;
ALTER TABLE guides
  ALTER COLUMN subscription_tier SET DEFAULT 'spark',
  ADD CONSTRAINT guides_subscription_tier_check
    CHECK (subscription_tier IN ('spark', 'discover', 'immerse'));

-- Update commission trigger to use new tier names
CREATE OR REPLACE FUNCTION calculate_commission()
RETURNS TRIGGER AS $$
BEGIN
  NEW.commission_rate := CASE
    (SELECT subscription_tier FROM guides WHERE id = NEW.guide_id)
    WHEN 'spark' THEN 0.20
    WHEN 'discover' THEN 0.15
    WHEN 'immerse' THEN 0.12
    ELSE 0.20
  END;
  NEW.commission_amount := ROUND(NEW.total_amount * NEW.commission_rate, 2);
  NEW.guide_payout := NEW.total_amount - NEW.commission_amount;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
