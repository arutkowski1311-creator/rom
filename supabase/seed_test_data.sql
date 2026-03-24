-- ═══════════════════════════════════════════════════════════════════════════════
-- RŌM TEST DATA SEED
-- Run this in Supabase SQL Editor to populate the platform with realistic data.
-- All test data uses [TEST] prefix or known test IDs for easy cleanup.
-- ═══════════════════════════════════════════════════════════════════════════════

-- First, let's get the existing guide/profile IDs
-- We'll work with the rutnyllc@gmail.com guide (immerse tier) as primary test guide

-- ═══ STEP 1: Update the existing guide profile with rich data ═══════════════

-- Update the rutnyllc guide with full profile data
UPDATE guides SET
  tagline = '14 years guiding fly fishing on the Madison, Gallatin, and Yellowstone rivers.',
  bio = E'There''s a stretch of the Madison that most guides drive right past. After fourteen years on these waters, I''ve learned that the best fishing rarely happens where anyone''s looking.\n\nFly fishing for brown and rainbow trout is what I do — but teaching people to see water the way a fish sees it is what I''m actually here for. Every trip is built around technique, not just catching fish.\n\nWhether you''re picking up a rod for the first time or you''ve been fishing for decades, I meet you where you are. What I care about is that you leave understanding something you didn''t before.',
  location = 'Bozeman, MT',
  categories = ARRAY['Fly Fishing', 'Hiking', 'Wildlife'],
  years_experience = 14,
  website = 'https://example.com',
  verified = true,
  insured = true,
  licensed = true,
  rating = 4.97,
  review_count = 6,
  response_rate = 98,
  voice_profile = '{"tone": "warm, knowledgeable, understated", "vocabulary_level": "conversational", "personality_markers": "Speaks from experience without bragging. Uses river metaphors naturally. Direct but patient. Dry humor. Prefers showing over telling.", "sample_phrases": ["The fish will tell you what they want", "Most people look at water — I want to teach you to read it", "Best day on the river is the one you learn something"]}',
  ai_headline = 'Montana fly fishing. 14 years reading water most guides drive past.',
  ai_bio = E'There''s a stretch of the Madison that most guides drive right past. After fourteen years on these waters, I''ve learned that the best fishing rarely happens where anyone''s looking.',
  specialty_keywords = ARRAY['fly fishing', 'brown trout', 'rainbow trout', 'Madison River', 'Gallatin River', 'Yellowstone', 'wade fishing', 'dry fly', 'nymph fishing', 'Montana guide', 'backcountry', 'catch and release'],
  insurance_provider = 'Outdoor Recreation Insurance Group',
  insurance_policy_number = 'ORIG-2025-MT-4421',
  insurance_expiry_date = '2026-11-15',
  insurance_verified = true,
  insurance_verified_at = NOW()
WHERE profile_id = '225655aa-5d17-40e6-b361-7bbecd4c0653';

-- Get the guide ID for the rutnyllc account
-- We'll reference it in subsequent inserts

-- ═══ STEP 2: Create packages for the test guide ═════════════════════════════

-- Delete existing packages first to avoid duplicates
DELETE FROM packages WHERE guide_id = (SELECT id FROM guides WHERE profile_id = '225655aa-5d17-40e6-b361-7bbecd4c0653');

INSERT INTO packages (guide_id, title, duration, price, price_type, description, active, sort_order, min_guests, max_guests) VALUES
(
  (SELECT id FROM guides WHERE profile_id = '225655aa-5d17-40e6-b361-7bbecd4c0653'),
  'Half Day — Learn to Read Water',
  '4 hours',
  275,
  'person',
  'Built for beginners and returning anglers who want to develop real technique. We spend the morning on the Madison, focusing on casting form, reading current seams, and presenting the fly correctly. You will hook fish. All gear, flies, and waders included.',
  true, 1, 1, 2
),
(
  (SELECT id FROM guides WHERE profile_id = '225655aa-5d17-40e6-b361-7bbecd4c0653'),
  'Full Day Trophy Hunt',
  '8 hours',
  495,
  'person',
  'A full day targeting large browns and rainbows in the upper Madison corridor. We move water and chase fish — this is a serious day for guests who want serious results. Includes all gear, flies, waders, riverside lunch, and catch photos. Best for anglers with some experience.',
  true, 2, 1, 2
),
(
  (SELECT id FROM guides WHERE profile_id = '225655aa-5d17-40e6-b361-7bbecd4c0653'),
  '3-Day Yellowstone Backcountry',
  '3 days',
  3200,
  'trip',
  'Three days in Yellowstone''s backcountry fishing wild cutthroat trout in streams most anglers will never see. We hike in, set camp, and spend the days working water that doesn''t appear on any outfitter map. Includes all gear, backcountry permits, camp meals, and photography support.',
  true, 3, 1, 3
),
(
  (SELECT id FROM guides WHERE profile_id = '225655aa-5d17-40e6-b361-7bbecd4c0653'),
  'Sunset Evening Hatch',
  '3 hours',
  175,
  'person',
  'The golden hour on the Madison. We target the evening hatch when the big fish come up to feed. Short, focused, and intense. Perfect for experienced anglers or anyone who wants to see what the river looks like when the light goes sideways.',
  true, 4, 1, 3
);

-- ═══ STEP 3: Create test guest profiles (auth.users) ════════════════════════
-- Note: We can't insert into auth.users directly via SQL in Supabase.
-- Instead, we'll create profiles entries and use them for bookings.
-- The bookings will use denormalized guest_name/guest_email fields.

-- ═══ STEP 4: Create bookings across different statuses ═══════════════════════

-- Get package IDs
DO $$
DECLARE
  v_guide_id UUID;
  v_pkg_half UUID;
  v_pkg_full UUID;
  v_pkg_backcountry UUID;
  v_pkg_sunset UUID;
  v_guest_profile_id UUID := '225655aa-5d17-40e6-b361-7bbecd4c0653'; -- using same profile as guest for testing
BEGIN
  SELECT id INTO v_guide_id FROM guides WHERE profile_id = '225655aa-5d17-40e6-b361-7bbecd4c0653';

  SELECT id INTO v_pkg_half FROM packages WHERE guide_id = v_guide_id AND title LIKE 'Half Day%' LIMIT 1;
  SELECT id INTO v_pkg_full FROM packages WHERE guide_id = v_guide_id AND title LIKE 'Full Day%' LIMIT 1;
  SELECT id INTO v_pkg_backcountry FROM packages WHERE guide_id = v_guide_id AND title LIKE '3-Day%' LIMIT 1;
  SELECT id INTO v_pkg_sunset FROM packages WHERE guide_id = v_guide_id AND title LIKE 'Sunset%' LIMIT 1;

  -- Completed bookings (past trips)
  INSERT INTO bookings (confirmation_code, guest_id, guide_id, package_id, trip_date, guests, status, package_title, guide_name, guide_location, total_price, deposit, balance, completed_at, guest_name, guest_email, special_requests)
  VALUES
    ('ROM-TEST1', v_guest_profile_id, v_guide_id, v_pkg_full, '2026-01-15', 2, 'completed', 'Full Day Trophy Hunt', 'Test Guide', 'Bozeman, MT', 1138, 285, 853, '2026-01-15 18:00:00+00', 'Mark Thompson', 'mark.t@test.com', 'First time fly fishing in Montana. Excited!'),
    ('ROM-TEST2', v_guest_profile_id, v_guide_id, v_pkg_half, '2026-02-08', 1, 'completed', 'Half Day — Learn to Read Water', 'Test Guide', 'Bozeman, MT', 316, 79, 237, '2026-02-08 13:00:00+00', 'Sarah Chen', 'sarah.c@test.com', 'Intermediate angler, want to improve my dry fly game.'),
    ('ROM-TEST3', v_guest_profile_id, v_guide_id, v_pkg_backcountry, '2026-02-20', 2, 'completed', '3-Day Yellowstone Backcountry', 'Test Guide', 'Bozeman, MT', 3680, 920, 2760, '2026-02-22 17:00:00+00', 'Derek & Amy Patterson', 'derek.p@test.com', 'Anniversary trip. Both experienced hikers, moderate fishing experience.'),
    ('ROM-TEST4', v_guest_profile_id, v_guide_id, v_pkg_sunset, '2026-03-01', 1, 'completed', 'Sunset Evening Hatch', 'Test Guide', 'Bozeman, MT', 201, 50, 151, '2026-03-01 21:00:00+00', 'Chris Martinez', 'chris.m@test.com', ''),
    ('ROM-TEST5', v_guest_profile_id, v_guide_id, v_pkg_full, '2026-03-10', 1, 'completed', 'Full Day Trophy Hunt', 'Test Guide', 'Bozeman, MT', 569, 142, 427, '2026-03-10 18:00:00+00', 'Rachel Kim', 'rachel.k@test.com', 'Photographer, will bring camera gear. Want big fish photos.'),

  -- Confirmed bookings (upcoming trips)
    ('ROM-TEST6', v_guest_profile_id, v_guide_id, v_pkg_full, '2026-04-05', 2, 'confirmed', 'Full Day Trophy Hunt', 'Test Guide', 'Bozeman, MT', 1138, 285, 853, NULL, 'James O''Brien', 'james.o@test.com', 'Visited last year, loved it. Bringing my brother this time.'),
    ('ROM-TEST7', v_guest_profile_id, v_guide_id, v_pkg_half, '2026-04-12', 1, 'confirmed', 'Half Day — Learn to Read Water', 'Test Guide', 'Bozeman, MT', 316, 79, 237, NULL, 'Lisa Wong', 'lisa.w@test.com', 'Complete beginner. Birthday gift from my husband.'),
    ('ROM-TEST8', v_guest_profile_id, v_guide_id, v_pkg_backcountry, '2026-05-01', 3, 'confirmed', '3-Day Yellowstone Backcountry', 'Test Guide', 'Bozeman, MT', 3680, 920, 2760, NULL, 'Tom & Friends', 'tom.r@test.com', 'Group of 3 experienced anglers. We want the real backcountry experience.'),

  -- Pending bookings (awaiting guide approval)
    ('ROM-TEST9', v_guest_profile_id, v_guide_id, v_pkg_sunset, '2026-04-18', 2, 'pending', 'Sunset Evening Hatch', 'Test Guide', 'Bozeman, MT', 403, 101, 302, NULL, 'Emily Davis', 'emily.d@test.com', 'Honeymoon trip! Neither of us has fished before but we love the outdoors.'),
    ('ROM-TESTA', v_guest_profile_id, v_guide_id, v_pkg_full, '2026-04-22', 1, 'pending', 'Full Day Trophy Hunt', 'Test Guide', 'Bozeman, MT', 569, 142, 427, NULL, 'Robert Garcia', 'robert.g@test.com', 'Fly fished in Colorado for years. First time in Montana.'),

  -- Cancelled booking
    ('ROM-TESTB', v_guest_profile_id, v_guide_id, v_pkg_half, '2026-03-25', 1, 'cancelled', 'Half Day — Learn to Read Water', 'Test Guide', 'Bozeman, MT', 316, 79, 237, NULL, 'Alex Turner', 'alex.t@test.com', 'Had to cancel — work trip moved.');

  -- Update cancelled booking with cancellation info
  UPDATE bookings SET cancelled_at = '2026-03-20 10:00:00+00', cancellation_reason = 'Work travel conflict' WHERE confirmation_code = 'ROM-TESTB';

END $$;

-- ═══ STEP 5: Create reviews for completed bookings ══════════════════════════

INSERT INTO reviews (guide_id, reviewer_id, booking_id, rating, body, trip_label, solicited, created_at)
SELECT
  b.guide_id,
  b.guest_id,
  b.id,
  r.rating,
  r.body,
  r.trip_label,
  true,
  r.created_at
FROM (VALUES
  ('ROM-TEST1', 5, 'Put me on fish I had no business catching. I''ve fished the Madison twice before with other guides and left thinking it was overhyped. This was completely different. He found water I didn''t know existed and taught me why it held fish. Best guide day I''ve ever had, anywhere.', 'Full Day Trophy Hunt', '2026-01-17 10:00:00+00'::timestamptz),
  ('ROM-TEST2', 5, 'I hadn''t picked up a rod in 8 years. Patient in a way that doesn''t feel patronizing — just quietly adjusts what he''s saying until it lands. I hooked three fish and finally understand how to read a current seam. Worth every penny.', 'Half Day — Learn to Read Water', '2026-02-10 14:00:00+00'::timestamptz),
  ('ROM-TEST3', 5, 'This was a bucket list trip and it exceeded everything we imagined. The backcountry streams were unlike anything either of us had ever seen. Part guide, part naturalist, part photographer. Three perfect days. Zero complaints.', '3-Day Yellowstone Backcountry', '2026-02-25 09:00:00+00'::timestamptz),
  ('ROM-TEST4', 5, 'Landed a 22-inch brown on a dry fly in the evening hatch. Called it twenty minutes before it happened. The man knows this water like it''s his living room. Short trip, huge payoff.', 'Sunset Evening Hatch', '2026-03-03 11:00:00+00'::timestamptz),
  ('ROM-TEST5', 4, 'Great day on the water. Got some incredible photos of big browns. Only giving 4 stars because the wind picked up in the afternoon and we had to change spots, but that''s Montana for you. Guide handled it perfectly and we still caught fish.', 'Full Day Trophy Hunt', '2026-03-12 16:00:00+00'::timestamptz),
  ('ROM-TEST1', 5, 'Came back for round two. Even better than the first time. We went to completely different water and the guide remembered exactly what I was working on from last year. That kind of attention to detail is rare.', 'Full Day Trophy Hunt', '2026-03-15 10:00:00+00'::timestamptz)
) AS r(confirm_code, rating, body, trip_label, created_at)
JOIN bookings b ON b.confirmation_code = r.confirm_code;

-- ═══ STEP 6: Create guest CRM profiles ═════════════════════════════════════

INSERT INTO guest_profiles (profile_id, guide_id, notes, tags, total_trips, total_spent, last_trip_date, lifetime_value, booking_count, first_trip_date, booking_months, vip)
SELECT
  b.guest_id,
  b.guide_id,
  gp.notes,
  gp.tags,
  gp.total_trips,
  gp.total_spent,
  gp.last_trip_date,
  gp.total_spent,
  gp.total_trips,
  gp.first_trip_date,
  gp.booking_months,
  gp.vip
FROM (VALUES
  ('ROM-TEST1', 'Repeat guest. Experienced angler. Prefers trophy water. Books full days.', ARRAY['repeat', 'experienced', 'trophy'], 2, 1707.00, '2026-03-10'::date, '2026-01-15'::date, ARRAY[1,3], true),
  ('ROM-TEST2', 'Returning after long break. Focused on technique. Very coachable.', ARRAY['beginner-friendly', 'technique-focused'], 1, 316.00, '2026-02-08'::date, '2026-02-08'::date, ARRAY[2], false),
  ('ROM-TEST3', 'Couple. Anniversary trip. Both outdoorsy. Good hikers.', ARRAY['couple', 'backcountry', 'anniversary'], 1, 3680.00, '2026-02-20'::date, '2026-02-20'::date, ARRAY[2], true),
  ('ROM-TEST4', 'Quick evening trip. Experienced. Low maintenance.', ARRAY['experienced', 'evening'], 1, 201.00, '2026-03-01'::date, '2026-03-01'::date, ARRAY[3], false),
  ('ROM-TEST5', 'Photographer. Wants big fish photos as much as the fishing itself.', ARRAY['photographer', 'content-friendly'], 1, 569.00, '2026-03-10'::date, '2026-03-10'::date, ARRAY[3], false)
) AS gp(confirm_code, notes, tags, total_trips, total_spent, last_trip_date, first_trip_date, booking_months, vip)
JOIN bookings b ON b.confirmation_code = gp.confirm_code
ON CONFLICT DO NOTHING;

-- ═══ STEP 7: Create expenses ════════════════════════════════════════════════

INSERT INTO expenses (guide_id, category, amount, description, date, tax_deductible, receipt_url)
SELECT
  (SELECT id FROM guides WHERE profile_id = '225655aa-5d17-40e6-b361-7bbecd4c0653'),
  e.category, e.amount, e.description, e.date, e.tax_deductible, NULL
FROM (VALUES
  ('Fuel', 62.50, 'Gas — Bozeman to upper Madison', '2026-01-15'::date, true),
  ('Fuel', 58.00, 'Gas — Madison round trip', '2026-02-08'::date, true),
  ('Fuel', 185.00, 'Gas — Yellowstone backcountry 3 days', '2026-02-20'::date, true),
  ('Food & Meals', 45.00, 'Client lunch — riverside', '2026-01-15'::date, true),
  ('Food & Meals', 120.00, 'Camp meals — backcountry trip', '2026-02-20'::date, true),
  ('Food & Meals', 32.00, 'Coffee and snacks — morning trip', '2026-03-01'::date, true),
  ('Gear', 89.00, 'Replacement fly line — 5wt', '2026-01-10'::date, true),
  ('Gear', 245.00, 'New waders — client loaners', '2026-02-01'::date, true),
  ('Gear', 42.00, 'Fly tying materials', '2026-02-15'::date, true),
  ('Insurance', 1800.00, 'Annual liability insurance renewal', '2026-01-01'::date, true),
  ('License & Permits', 350.00, 'Montana Outfitter License renewal', '2026-01-05'::date, true),
  ('License & Permits', 125.00, 'Yellowstone backcountry permit', '2026-02-18'::date, true),
  ('Marketing', 150.00, 'Instagram promotion — spring season', '2026-03-01'::date, true),
  ('Vehicle', 420.00, 'Truck maintenance — oil change + tires', '2026-02-10'::date, true),
  ('Supplies', 78.00, 'First aid kit restock', '2026-01-20'::date, true),
  ('Software', 29.00, 'RŌM Discover subscription — March', '2026-03-01'::date, true)
) AS e(category, amount, description, date, tax_deductible);

-- ═══ STEP 8: Create licenses ════════════════════════════════════════════════

INSERT INTO licenses (guide_id, name, license_number, issuing_authority, expiry_date, renewal_url)
SELECT
  (SELECT id FROM guides WHERE profile_id = '225655aa-5d17-40e6-b361-7bbecd4c0653'),
  l.name, l.license_number, l.issuing_authority, l.expiry_date, l.renewal_url
FROM (VALUES
  ('Montana Outfitter License', 'OUT-2025-MT-7742', 'Montana FWP', '2027-01-31'::date, 'https://fwp.mt.gov/'),
  ('Wilderness First Responder', 'WFR-88421', 'NOLS Wilderness Medicine', '2026-09-15'::date, 'https://www.nols.edu/'),
  ('CPR / First Aid Certification', 'ARC-2025-1190', 'American Red Cross', '2026-06-30'::date, 'https://www.redcross.org/'),
  ('Yellowstone Backcountry Permit', 'YNP-BC-2026-114', 'National Park Service', '2026-12-31'::date, 'https://www.nps.gov/yell/')
) AS l(name, license_number, issuing_authority, expiry_date, renewal_url)
ON CONFLICT DO NOTHING;

-- ═══ STEP 9: Create waiver template ═════════════════════════════════════════

INSERT INTO waiver_templates (guide_id, name, content, requires_emergency_contact, requires_medical_disclosure)
SELECT
  (SELECT id FROM guides WHERE profile_id = '225655aa-5d17-40e6-b361-7bbecd4c0653'),
  'Standard Liability Waiver',
  E'ASSUMPTION OF RISK AND LIABILITY WAIVER\n\nI, the undersigned participant, acknowledge and agree to the following:\n\n1. ASSUMPTION OF RISK\nI understand that fly fishing, wading in rivers, hiking in backcountry terrain, and related outdoor activities involve inherent risks including but not limited to: physical injury from slippery rocks, swift currents, wildlife encounters, extreme weather, and remote locations far from medical facilities. I voluntarily assume all risks associated with my participation.\n\n2. RELEASE OF LIABILITY\nI hereby release, waive, and discharge the guide, their business, RŌM Inc., and their respective officers, agents, and employees from any and all liability, claims, demands, or causes of action arising from my participation, except in cases of gross negligence or willful misconduct.\n\n3. MEDICAL ACKNOWLEDGMENT\nI confirm that I am physically capable of wading in moving water, hiking on uneven terrain, and spending extended time outdoors. I have disclosed any relevant medical conditions, allergies, or physical limitations.\n\n4. MINOR PARTICIPANTS\nIf signing on behalf of a minor (under 18), I am their parent or legal guardian and accept these terms on their behalf.\n\n5. PHOTO/VIDEO RELEASE\nI grant the guide and RŌM permission to use photographs and video taken during the experience for promotional purposes, unless I opt out in writing before the trip.\n\n6. EQUIPMENT\nI agree to handle all provided equipment (rods, reels, waders, etc.) with reasonable care. I accept responsibility for damage caused by negligence.\n\n7. CANCELLATION & WEATHER\nTrips may be rescheduled due to dangerous water conditions, severe weather, or guide discretion. Cancellation policies are as stated at the time of booking.\n\nBy signing below, I confirm that I have read and understand this waiver, that I am at least 18 years old (or signing as parent/guardian of a minor), and that I agree to all terms.',
  true,
  true;

-- ═══ STEP 10: Create mileage trips ══════════════════════════════════════════

INSERT INTO mileage_trips (guide_id, description, miles, duration_seconds, deduction_amount, mileage_rate, created_at)
SELECT
  (SELECT id FROM guides WHERE profile_id = '225655aa-5d17-40e6-b361-7bbecd4c0653'),
  m.description, m.miles, m.duration_seconds, ROUND(m.miles * 0.70, 2), 0.70, m.created_at
FROM (VALUES
  ('Bozeman to Upper Madison — Full Day Trophy Hunt', 48.2, 28800, '2026-01-15 06:00:00+00'::timestamptz),
  ('Madison River half day — Learn to Read Water', 32.5, 18000, '2026-02-08 07:00:00+00'::timestamptz),
  ('Yellowstone Backcountry — 3 day trip', 186.0, 259200, '2026-02-20 05:00:00+00'::timestamptz),
  ('Evening hatch — Madison sunset run', 22.8, 12600, '2026-03-01 16:00:00+00'::timestamptz),
  ('Full Day Trophy Hunt — upper corridor', 55.1, 32400, '2026-03-10 06:30:00+00'::timestamptz)
) AS m(description, miles, duration_seconds, created_at);

-- ═══ STEP 11: Create guide intelligence record ══════════════════════════════

INSERT INTO guide_intelligence (guide_id, health_score, health_components, health_action, booking_velocity, repeat_rate, avg_response_minutes, profile_completeness, content_activity_score, last_health_computed)
SELECT
  (SELECT id FROM guides WHERE profile_id = '225655aa-5d17-40e6-b361-7bbecd4c0653'),
  82,
  '{"booking_velocity": 85, "review_rating": 99, "response_time": 90, "profile_completeness": 85, "content_activity": 50, "repeat_rate": 70}',
  'Your content activity is your weakest area — approve this week''s content package to stay visible to potential guests.',
  3.5,
  0.20,
  45,
  85,
  50,
  NOW()
ON CONFLICT (guide_id) DO UPDATE SET
  health_score = 82,
  health_components = '{"booking_velocity": 85, "review_rating": 99, "response_time": 90, "profile_completeness": 85, "content_activity": 50, "repeat_rate": 70}',
  health_action = 'Your content activity is your weakest area — approve this week''s content package to stay visible to potential guests.',
  last_health_computed = NOW();

-- ═══ STEP 12: Create some notifications ══════════════════════════════════════

INSERT INTO guide_notifications (guide_id, type, title, body, metadata, priority, created_at)
SELECT
  (SELECT id FROM guides WHERE profile_id = '225655aa-5d17-40e6-b361-7bbecd4c0653'),
  n.type, n.title, n.body, n.metadata::jsonb, n.priority, n.created_at
FROM (VALUES
  ('business_health_weekly', 'Your score is 82. Approve this week''s content to boost visibility.', 'Your content activity is your weakest area — approve this week''s content package to stay visible.', '{"health_score": 82}', 'normal', NOW() - INTERVAL '2 days'),
  ('review_received', 'Mark Thompson left you a 5-star review', 'Put me on fish I had no business catching. Best guide day I''ve ever had, anywhere.', '{"rating": 5}', 'normal', NOW() - INTERVAL '5 days'),
  ('review_received', 'Rachel Kim left you a 4-star review', 'Great day on the water. Got some incredible photos of big browns.', '{"rating": 4}', 'normal', NOW() - INTERVAL '1 day'),
  ('content_ready', '3 posts ready for your approval', 'Your weekly content is ready. Approve, edit, or skip each piece.', '{"count": 3}', 'normal', NOW() - INTERVAL '1 day'),
  ('itinerary_generated', 'Trip plan ready — James O''Brien', 'Full Day Trophy Hunt on Apr 5. Review the briefing in your bookings.', '{}', 'normal', NOW() - INTERVAL '3 hours'),
  ('repeat_guest_sent', 'Reached out to 2 past guests', 'Personalized emails sent to bring them back this season.', '{"count": 2}', 'normal', NOW() - INTERVAL '4 days'),
  ('license_expiring', 'CPR / First Aid expires in 102 days', 'Renew soon to keep your profile active.', '{"days_until": 102}', 'normal', NOW() - INTERVAL '1 day')
) AS n(type, title, body, metadata, priority, created_at);

-- ═══ STEP 13: Create sample content pieces ══════════════════════════════════

INSERT INTO content_pieces (guide_id, type, platform, content, hashtags, status, ai_model, generation_context, created_at)
SELECT
  (SELECT id FROM guides WHERE profile_id = '225655aa-5d17-40e6-b361-7bbecd4c0653'),
  c.type, c.platform, c.content, c.hashtags, 'pending', 'claude-sonnet-4', '{"trigger": "weekly_content", "month": "March"}', NOW() - INTERVAL '1 day'
FROM (VALUES
  ('social_post', 'instagram',
   E'The Madison doesn''t care what rod you brought. It cares whether you can read the seam where the fast water meets the slow.\n\nMarch runoff is starting. The fish are moving. If you''ve been thinking about booking a spring trip, this is the window.\n\nLink in bio — or DM me. Let''s get you on the water.',
   ARRAY['flyfishing', 'montanafishing', 'madisonriver', 'browntrout', 'rainbowtrout', 'catchandrelease', 'wadinglife', 'dryfly', 'nymphfishing', 'troutbum', 'bozemanmt', 'montanaguide', 'springfishing', 'riverfishing', 'adventuretravel']),
  ('social_post', 'facebook',
   E'People ask me what makes a good day on the river. It''s not the size of the fish — though that helps.\n\nIt''s the moment a guest sees the water differently than they did that morning. When they stop looking at the surface and start reading what''s underneath. That''s the day I did my job.\n\nSpring bookings are open. The Madison is about to wake up. Half-day, full-day, and 3-day backcountry trips available through June.\n\nBook at romlife.co 🧭',
   ARRAY[]::TEXT[]),
  ('email', 'email',
   '{"subject": "The river is waking up", "body": "Spring runoff is starting on the Madison and the fishing is about to get very good. The browns are moving into feeding lanes and the hatches are building. If you''ve been thinking about getting back on the water, March and April are prime time. I have openings for half-day and full-day trips through mid-June. Reply to this email or book directly on my profile."}',
   ARRAY[]::TEXT[])
) AS c(type, platform, content, hashtags);

-- ═══ DONE ════════════════════════════════════════════════════════════════════
-- Your test data is loaded. Hard refresh your dashboard to see everything.
-- All test bookings use confirmation codes starting with ROM-TEST for easy cleanup.
-- To remove test data later:
--   DELETE FROM bookings WHERE confirmation_code LIKE 'ROM-TEST%';
--   DELETE FROM expenses WHERE guide_id = (SELECT id FROM guides WHERE profile_id = '225655aa-5d17-40e6-b361-7bbecd4c0653');
--   DELETE FROM reviews WHERE booking_id IN (SELECT id FROM bookings WHERE confirmation_code LIKE 'ROM-TEST%');
