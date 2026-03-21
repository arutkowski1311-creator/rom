-- 016: Digital waivers + insurance verification
-- Guest waivers with e-signature, guide insurance tracking, waiver templates per activity type.

-- 1. Waiver templates (per guide, customizable by activity type)
CREATE TABLE IF NOT EXISTS waiver_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Standard Liability Waiver',
  activity_type TEXT,          -- null = applies to all, or specific like 'fly_fishing'
  content TEXT NOT NULL,        -- the full waiver text (markdown/plain text)
  requires_emergency_contact BOOLEAN DEFAULT true,
  requires_medical_disclosure BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE waiver_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guides_manage_own_templates" ON waiver_templates
  FOR ALL USING (guide_id IN (SELECT id FROM guides WHERE profile_id = auth.uid()));

-- 2. Signed waivers (one per booking, legally binding record)
CREATE TABLE IF NOT EXISTS signed_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
  guest_id UUID NOT NULL,
  template_id UUID REFERENCES waiver_templates(id),
  waiver_content TEXT NOT NULL,       -- snapshot of waiver text at time of signing (immutable)
  guest_name TEXT NOT NULL,           -- legal name as entered by guest
  guest_email TEXT,
  signature_text TEXT NOT NULL,       -- typed signature (e.g. "John A. Smith")
  signature_ip TEXT,                  -- IP address at signing
  signed_at TIMESTAMPTZ NOT NULL,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  medical_notes TEXT,
  minor_participants JSONB DEFAULT '[]',  -- [{ name, age, guardian_name }]
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE signed_waivers ENABLE ROW LEVEL SECURITY;
-- Guests can see their own waivers
CREATE POLICY "guests_see_own_waivers" ON signed_waivers
  FOR SELECT USING (guest_id = auth.uid());
-- Guides can see waivers for their bookings
CREATE POLICY "guides_see_booking_waivers" ON signed_waivers
  FOR SELECT USING (guide_id IN (SELECT id FROM guides WHERE profile_id = auth.uid()));
-- Service role can insert (from API)
CREATE POLICY "service_insert_waivers" ON signed_waivers
  FOR INSERT WITH CHECK (true);

-- 3. Insurance verification on guides
ALTER TABLE guides ADD COLUMN IF NOT EXISTS insurance_provider TEXT;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS insurance_document_url TEXT;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS insurance_verified BOOLEAN DEFAULT false;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS insurance_verified_at TIMESTAMPTZ;

-- 4. Waiver tracking on bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS waiver_signed BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS waiver_signed_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS waiver_id UUID REFERENCES signed_waivers(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS waiver_reminder_sent_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_waiver_templates_guide ON waiver_templates(guide_id);
CREATE INDEX IF NOT EXISTS idx_signed_waivers_booking ON signed_waivers(booking_id);
CREATE INDEX IF NOT EXISTS idx_signed_waivers_guide ON signed_waivers(guide_id);
CREATE INDEX IF NOT EXISTS idx_bookings_waiver ON bookings(waiver_signed) WHERE waiver_signed = false;
