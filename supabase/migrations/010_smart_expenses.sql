-- 010_smart_expenses.sql
-- Recurring expense templates and receipt support

-- Recurring expense templates
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL DEFAULT 'monthly', -- monthly, weekly, quarterly
  active BOOLEAN DEFAULT true,
  last_logged DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_guide ON recurring_expenses(guide_id);

ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guides manage own recurring expenses" ON recurring_expenses FOR ALL USING (true) WITH CHECK (true);

-- Add receipt_url to expenses if not exists
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;
