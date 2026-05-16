// Seed a fully-populated demo guide: Sam's Outdoor Outfitters (Lake Placid NY).
// Idempotent — wipes existing demo rows by guide_id and recreates from scratch.
//
// Usage: node --env-file=.env.local scripts/seed-demo-guide.mjs
//
// Login after seed: sam.demo@romlife.co / SamDemo2026!

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const DEMO_EMAIL = "rutnyllc@gmail.com";
const DEMO_PASSWORD = "Samlikeswang";
const DEMO_SLUG = "sams-outdoor-outfitters";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const today = new Date("2026-05-16T12:00:00Z");
const daysAgo = (n) => new Date(today.getTime() - n * 86400000);
const daysAhead = (n) => new Date(today.getTime() + n * 86400000);
const isoDate = (d) => d.toISOString().slice(0, 10);
const iso = (d) => d.toISOString();
const pick = (arr, i) => arr[i % arr.length];

async function step(label, fn) {
  process.stdout.write(`  ${label} … `);
  try {
    const result = await fn();
    console.log("ok" + (typeof result === "number" ? ` (${result})` : ""));
    return result;
  } catch (err) {
    console.log("FAIL");
    console.error("    →", err.message || err);
    throw err;
  }
}

async function softInsert(table, rows, opts = {}) {
  if (!Array.isArray(rows)) rows = [rows];
  if (rows.length === 0) return 0;
  const { error } = await admin.from(table).insert(rows);
  if (error) {
    if (opts.tolerate) {
      console.log(`    (skipped ${table}: ${error.message})`);
      return 0;
    }
    throw error;
  }
  return rows.length;
}

// ─── BRAND IMAGES (Unsplash, Adirondack / fly-fishing / climbing themes) ─────

const PROFILE_PHOTO   = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600";
const COVER_PHOTO     = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600";
const GALLERY = [
  "https://images.unsplash.com/photo-1444930694458-01babe71870e?w=1200", // fly fishing river
  "https://images.unsplash.com/photo-1551632811-561732d1e306?w=1200",     // mountain hike adirondack-ish
  "https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1200",     // ice climber
  "https://images.unsplash.com/photo-1502810190503-8303352d0dd1?w=1200",  // backcountry ski
  "https://images.unsplash.com/photo-1486915309851-b0cc1f8a0084?w=1200",  // alpine lake
  "https://images.unsplash.com/photo-1471115853179-bb1d604434e0?w=1200",  // canoe
  "https://images.unsplash.com/photo-1464278533981-50106e6176b1?w=1200",  // brook trout closeup
  "https://images.unsplash.com/photo-1455156218388-5e61b526818b?w=1200",  // dawn forest
];

const NEWSLETTER_HERO = "https://images.unsplash.com/photo-1444930694458-01babe71870e?w=1600";

// ─── MAIN ────────────────────────────────────────────────────────────────────

console.log("Seeding Sam's Outdoor Outfitters demo guide…\n");

// 1. Auth user + profile
let userId;
const existing = await admin.auth.admin.listUsers();
const existingUser = existing?.data?.users?.find(u => u.email === DEMO_EMAIL);

if (existingUser) {
  userId = existingUser.id;
  console.log(`  reuse auth.user ${userId}`);
  await admin.auth.admin.updateUserById(userId, { password: DEMO_PASSWORD, email_confirm: true });
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Sam McKenzie" },
  });
  if (error) { console.error("createUser failed:", error.message); process.exit(1); }
  userId = data.user.id;
  console.log(`  created auth.user ${userId}`);
}

// 2. Wipe any previous demo guide data (find the guide row first)
const { data: existingGuide } = await admin.from("guides").select("id").eq("profile_id", userId).maybeSingle();
let guideId = existingGuide?.id;

if (guideId) {
  console.log(`  wiping previous demo data for guide ${guideId}…`);
  const cascade = [
    "newsletter_sends", "email_subscribers", "content_pieces", "content_intelligence", "content_calendar",
    "guide_notifications", "signed_waivers", "waiver_templates", "licenses",
    "expenses", "mileage_trips", "recurring_expenses",
    "payments", "commission_ledger", "guide_billing",
    "reviews", "guest_profiles", "bookings",
    "packages", "guide_intelligence",
  ];
  for (const t of cascade) {
    await admin.from(t).delete().eq("guide_id", guideId);
  }
  await admin.from("guides").delete().eq("id", guideId);
}

// 3. Profile row
await step("upsert profile", async () => {
  await admin.from("profiles").upsert({
    id: userId,
    email: DEMO_EMAIL,
    full_name: "Sam McKenzie",
    role: "guide",
  }, { onConflict: "id" });
});

// 4. Voice profile JSON
const voiceProfile = {
  voice: "Plainspoken, gear-honest, Adirondack-rooted. No hype, no influencer voice. Talks like he's tying on a fly at the truck.",
  tone: "Calm, dry humor, quietly confident. Treats clients like adults.",
  audience: "Serious outdoor people who want to do it right — not crowd-pleasers, not gear-of-the-month chasers.",
  values: ["fishery health", "leave no trace", "honest gear talk", "the long apprenticeship", "weather respect"],
  banned_words: ["epic", "stoke", "crushed it", "bucket list", "unleash"],
  signature_phrases: [
    "fish where the fish are — not where Instagram is",
    "the river tells you when",
    "twelve seasons in, still learning",
    "a quiet day is the right day",
  ],
  geography: ["West Branch Ausable", "Lake Placid", "Cascade Pass", "Mt. Marcy", "Trapdike", "Whiteface", "Great Range", "Wright Peak", "Indian Pass"],
};

const voiceExamples = [
  "Spring fishing in the Adirondacks isn't pretty. The Ausable's running high and cold. You're not going to catch a hundred fish. But the ones you do hook will be wild and dark-backed and they'll remember the hand that let them go. Bring wool. Bring patience. Don't bring expectations from the magazines.",
  "People ask me what makes a good guide. Honestly? Showing up on time, knowing the water, and shutting up when you should. The rest is gear talk.",
  "Twelve seasons guiding the West Branch and I still get the same feeling at first light — like the river's deciding whether it likes you today. Some mornings it does. Some it doesn't. You learn to read the answer in the seam behind the third boulder.",
];

// 5. Guide row
const guideRow = {
  profile_id: userId,
  business_name: "Sam's Outdoor Outfitters",
  slug: DEMO_SLUG,
  display_name: "Sam McKenzie",
  tagline: "Adirondack guiding for people who want to do it right.",
  bio: `Sam's Outdoor Outfitters has been guiding the High Peaks region out of Lake Placid since 2014. Twelve seasons on the West Branch of the Ausable, ten winters on Whiteface and the Trapdike. We run fly fishing trips on the Ausable, Saranac, and Boquet, day hikes and overnighters in the Great Range, ice climbing in Chapel Pond and Cascade, and backcountry skiing across the High Peaks Wilderness.

This isn't a volume operation. We cap groups at four. We share weather decisions before they're convenient. We tell you when conditions aren't right — including when that means refunding a deposit and rebooking. That's the work.

If you've got the day off and want to be told what to do, this might not be the right outfit. If you've got real questions about wild trout, alpine routes, snow stability, or where the brookies actually hold in late June — start a conversation. We'll tell you straight.`,
  location: "Lake Placid, NY",
  featured_locations: ["West Branch Ausable River", "Mt. Marcy", "Whiteface Mountain", "Cascade Pass", "Indian Pass", "Great Range Traverse"],
  categories: ["Fly Fishing", "Hiking", "Backcountry Skiing", "Ice Climbing"],
  specialty_keywords: ["wild trout", "high peaks", "adirondack", "wilderness first responder", "leave no trace", "small group"],
  years_experience: 12,
  verified: true,
  insured: true,
  licensed: true,
  has_own_liability_insurance: true,
  insurance_provider: "Outdoor Insurance Group",
  insurance_policy_number: "OIG-NY-2026-44829",
  insurance_expiry_date: isoDate(daysAhead(220)),
  rating: 4.9,
  review_count: 14,
  response_rate: 98,
  profile_views: 2847,
  profile_photo_url: PROFILE_PHOTO,
  cover_photo_url: COVER_PHOTO,
  gallery_photos: GALLERY,
  website: "https://samsoutdoors.example.com",
  subscription_tier: "discover",
  subscription_status: "active",
  tier_started_at: iso(daysAgo(245)),
  billing_cycle_start: iso(daysAgo(15)),
  stripe_customer_id: "cus_demo_sams_outdoors",
  stripe_subscription_id: "sub_demo_sams_001",
  stripe_onboarding_complete: true,
  voice_profile: voiceProfile,
  voice_examples: voiceExamples,
  ai_headline: "Lake Placid fly fishing, alpine, and ice — small groups, honest weather calls, twelve seasons in.",
  ai_bio: "Sam McKenzie has guided the High Peaks Wilderness since 2014. Wilderness First Responder, AMGA Single Pitch Instructor, AIARE Level 2. Caps groups at four. Specializes in wild brook trout on the West Branch Ausable, Great Range traverses, and Cascade Pass ice routes.",
  working_days: [1, 2, 3, 4, 5, 6, 0], // all week
  max_concurrent_bookings: 1,
  response_time_hours: 1,
  status: "active",
  email: DEMO_EMAIL,
  created_at: iso(daysAgo(580)),
};

const { data: guideInsert, error: guideErr } = await admin.from("guides").insert(guideRow).select("id").single();
if (guideErr) {
  console.error("guides insert failed:", guideErr.message);
  console.error("Trying a tolerant retry with reduced fields…");
  // Fall back: drop any non-critical columns the live schema may not have
  const minimal = { ...guideRow };
  delete minimal.featured_locations;
  delete minimal.specialty_keywords;
  delete minimal.has_own_liability_insurance;
  delete minimal.insurance_policy_number;
  delete minimal.response_time_hours;
  delete minimal.profile_views;
  delete minimal.working_days;
  delete minimal.max_concurrent_bookings;
  delete minimal.ai_headline;
  delete minimal.ai_bio;
  delete minimal.tier_started_at;
  delete minimal.billing_cycle_start;
  delete minimal.stripe_subscription_id;
  delete minimal.stripe_onboarding_complete;
  delete minimal.licensed;
  const retry = await admin.from("guides").insert(minimal).select("id").single();
  if (retry.error) { console.error(retry.error); process.exit(1); }
  guideId = retry.data.id;
} else {
  guideId = guideInsert.id;
}
console.log(`  guide row ${guideId}\n`);

// ─── PACKAGES (offerings the guide sells) ────────────────────────────────────
const packages = [
  { title: "Half-Day Wild Trout — West Branch Ausable", description: "Four hours on the West Branch hunting wild brook and brown trout. Catch-and-release. Dry-fly when the bugs cooperate; nymph rigs when they don't. Includes all rods, flies, and waders.", duration: "4 hours", price: 425, price_type: "flat", min_guests: 1, max_guests: 2, sort_order: 1, active: true },
  { title: "Full-Day Fly Fishing — Ausable + Boquet", description: "All-day pursuit of wild fish on two rivers. Truck-shuttle between the West Branch and the Boquet. Riverside lunch. Best for anglers with some fly-rod miles.", duration: "8 hours", price: 685, price_type: "flat", min_guests: 1, max_guests: 2, sort_order: 2, active: true },
  { title: "Mt. Marcy Day Hike (5,344 ft)", description: "Up Van Hoevenberg, down the same way. 14.8 miles, 3,200 ft gain. Real summit day — leave by 4 AM in summer to beat afternoon thunder. Includes guide, navigation, weather call, and lunch.", duration: "10-12 hours", price: 395, price_type: "person", min_guests: 1, max_guests: 4, sort_order: 3, active: true },
  { title: "Great Range Traverse (Overnight)", description: "Two days, eight peaks. Lower Wolfjaw to Marcy. Camp at Slant Rock. This is hard. WFR-guided, weather-flexible, group capped at three.", duration: "2 days", price: 925, price_type: "person", min_guests: 2, max_guests: 3, sort_order: 4, active: true },
  { title: "Cascade Pass Ice Climbing (Intro)", description: "Top-rope WI2-WI3 in Cascade Pass. Boots, crampons, tools provided. For first-timers and second-timers. Single pitch only — no multi-pitch on intro days.", duration: "6 hours", price: 525, price_type: "person", min_guests: 1, max_guests: 2, sort_order: 5, active: true },
  { title: "Backcountry Ski Tour — Wright Peak Slide", description: "Skin, transition, ski the Wright Slide when conditions allow. AIARE-trained guide. We're going where the snow is safe that morning — sometimes that's not Wright. Bring your own AT setup or splitboard.", duration: "7 hours", price: 595, price_type: "person", min_guests: 1, max_guests: 3, sort_order: 6, active: true },
  { title: "Whiteface Sunrise Hike", description: "Pre-dawn start, on the summit for first light. 10.4 miles round-trip via Wilmington Trail. Headlamps provided. Coffee on the descent.", duration: "7 hours", price: 295, price_type: "person", min_guests: 1, max_guests: 4, sort_order: 7, active: true },
  { title: "Indian Pass Overnight — Beginner Backcountry", description: "Gentle introduction to High Peaks overnight travel. 10.6 miles total. Camp at Wallface Ponds. Best for first-time backpackers who want a real wilderness night without grinding ten thousand feet of gain.", duration: "2 days", price: 645, price_type: "person", min_guests: 2, max_guests: 4, sort_order: 8, active: true },
];

let packageIds = [];
await step("packages", async () => {
  const rows = packages.map(p => ({ ...p, guide_id: guideId }));
  const { data, error } = await admin.from("packages").insert(rows).select("id, sort_order");
  if (error) throw error;
  // Order by sort_order so packageIds[i] matches packages[i]
  data.sort((a, b) => a.sort_order - b.sort_order);
  packageIds = data.map(d => d.id);
  return data.length;
});

// ─── EMAIL SUBSCRIBERS ───────────────────────────────────────────────────────
const subscriberNames = [
  ["Tom Halligan", "tom.halligan@example.com", "past_guest"],
  ["Marisa Cole", "marisa.c@example.com", "past_guest"],
  ["Peter Dunne", "peter.dunne@example.com", "csv_import"],
  ["Annika Voss", "annika.voss@example.com", "past_guest"],
  ["Brian Eckhart", "brian.eckhart@example.com", "csv_import"],
  ["Cara Linville", "cara.lv@example.com", "web_signup"],
  ["David Yost", "dyost@example.com", "past_guest"],
  ["Erin Quinones", "erinq@example.com", "past_guest"],
  ["Frank Akiyama", "f.akiyama@example.com", "csv_import"],
  ["Gretchen Maul", "g.maul@example.com", "web_signup"],
  ["Hannah Brewer", "hbrewer@example.com", "past_guest"],
  ["Ian Carpentieri", "ian.c@example.com", "csv_import"],
  ["Jana Reyes", "j.reyes@example.com", "past_guest"],
  ["Kris Pearlstein", "kris.p@example.com", "past_guest"],
  ["Liam Doherty", "liam.d@example.com", "web_signup"],
  ["Maeve Lonsdale", "maeve.l@example.com", "csv_import"],
  ["Nora Ackerman", "nora.a@example.com", "past_guest"],
  ["Owen McCrae", "owen.mc@example.com", "past_guest"],
  ["Pia Schroeder", "pia.s@example.com", "csv_import"],
  ["Quinn Tabor", "quinn.t@example.com", "web_signup"],
  ["Rita Mendelson", "rita.m@example.com", "past_guest"],
  ["Sean Boudreau", "sean.b@example.com", "past_guest"],
  ["Talia Whitcomb", "talia.w@example.com", "csv_import"],
  ["Uma Castellano", "uma.c@example.com", "web_signup"],
  ["Vince Truscott", "v.truscott@example.com", "past_guest"],
  ["Will Geddes", "wgeddes@example.com", "past_guest"],
  ["Xanthe Bowers", "xanthe.b@example.com", "csv_import"],
  ["Yael Niskanen", "yael.n@example.com", "past_guest"],
  ["Zoe Pendergast", "zoe.p@example.com", "web_signup"],
  ["Adam Trzcinski", "adam.t@example.com", "csv_import"],
  ["Beth Iverson", "beth.i@example.com", "past_guest"],
  ["Cole Margolies", "cole.m@example.com", "past_guest"],
  ["Dana Whitehurst", "dana.w@example.com", "csv_import"],
  ["Evan Korsgaard", "evan.k@example.com", "past_guest"],
  ["Fia Petrucci", "fia.p@example.com", "web_signup"],
  ["Greg Halverson", "greg.h@example.com", "csv_import"],
  ["Hank Driscoll", "hank.d@example.com", "past_guest"],
  ["Iris Yancey", "iris.y@example.com", "past_guest"],
  ["Jonas Tilbury", "jonas.t@example.com", "csv_import"],
  ["Kate Lindholm", "kate.l@example.com", "past_guest"],
  ["Leo Mackenzie", "leo.m@example.com", "web_signup"],
  ["Mira Aslanian", "mira.a@example.com", "past_guest"],
  ["Nash Holcomb", "nash.h@example.com", "csv_import"],
  ["Opal Sandberg", "opal.s@example.com", "past_guest"],
  ["Pax Whitman", "pax.w@example.com", "web_signup"],
  ["Reese Calloway", "reese.c@example.com", "csv_import"],
  ["Sage Ottoson", "sage.o@example.com", "past_guest"],
];

const subscriberRows = subscriberNames.map(([name, email, source], i) => ({
  guide_id: guideId,
  email,
  full_name: name,
  source,
  consent_at: iso(daysAgo(420 - i * 4)),
  consent_source: source === "web_signup" ? "opt_in_form" : source === "past_guest" ? "booking_checkbox" : "imported",
  tags: source === "past_guest" ? ["client"] : source === "web_signup" ? ["lead"] : [],
}));

await step("email_subscribers", () => softInsert("email_subscribers", subscriberRows));

// ─── BOOKINGS + PAYMENTS + REVIEWS ───────────────────────────────────────────

const reviewBodies = [
  ["Marisa Cole", 5, "Half-Day Wild Trout", "Sam doesn't sell you the river — he reads it and shows you. Caught my first wild brookie on a size 18 BWO. He'd already picked the seam before I tied on."],
  ["Tom Halligan", 5, "Great Range Traverse", "Booked a Marcy day hike. Sam called me the night before and said the forecast had shifted — afternoon storms moving in earlier than first read. He rebooked me for Friday. Friday was perfect. Most guides would've taken the money and gone."],
  ["Peter Dunne", 5, "Cascade Pass Ice Climbing", "I'm a complete beginner. Sam met me at the diner, walked me through every piece of gear, then put me on real ice at Chapel Pond. By 1pm I'd led a short WI2. He's a teacher first, climber second."],
  ["Annika Voss", 5, "Full-Day Fly Fishing", "Caught more wild trout in a day with Sam than the previous three trips I'd taken with other outfits combined. He fishes the water, not the calendar."],
  ["Brian Eckhart", 4, "Mt. Marcy Day Hike", "Hard day. Honest pace. Sam doesn't pretend Marcy is easy and doesn't try to make you feel like a champion if you're suffering. He just gets you up and down. Knocked a star because the pre-trip email could've been more detailed about the boot situation."],
  ["David Yost", 5, "Backcountry Ski Tour", "We didn't ski Wright — Sam read the snowpack at the trailhead and pivoted us to a low-angle route on the back of Algonquin. Some guides would've forced the marquee line. This one wouldn't. Got a great day of skiing AND came home."],
  ["Erin Quinones", 5, "Half-Day Wild Trout", "Twelve years guiding shows. Every cast he suggested had a reason behind it. Lost a really nice brown right at the net — he laughed and said 'that's the right one to lose.' I'll be back."],
  ["Hannah Brewer", 5, "Whiteface Sunrise Hike", "Got to the summit just as the sun cleared the Greens. Sam had picked the date around the moon phase so the descent through the trees wasn't pitch black. Thoughtful in the small ways."],
  ["Jana Reyes", 5, "Indian Pass Overnight", "First backpacking trip ever. Sam set up camp like it was nothing, taught me to filter water at the pond, didn't make me feel stupid when I overpacked. Heard a barred owl at 11pm. Don't change anything."],
  ["Kris Pearlstein", 4, "Full-Day Fly Fishing", "Caught fish. Learned a ton. Lunch was excellent. The drive between rivers is longer than it sounds — would've liked a heads up. Otherwise — five stars."],
  ["Nora Ackerman", 5, "Cascade Pass Ice Climbing", "Booked the intro day. By hour three I was leading short pitches. Sam's patient and very, very safe. My kid (16) came too — same experience. Booking him again for spring multi-pitch."],
  ["Sean Boudreau", 5, "Great Range Traverse", "Slept at Slant Rock. Watched stars through the lean-to. Did Marcy at dawn. This is the trip I'll remember. Sam carried the stove and let me think I was carrying my weight. He wasn't."],
  ["Will Geddes", 5, "Half-Day Wild Trout", "Showed up skeptical — I've guided clients myself in the West. Sam knows this river the way you only know a river after a thousand days on it. He's the real thing."],
  ["Cole Margolies", 5, "Mt. Marcy Day Hike", "Tough conditions — fog at treeline, drizzle all morning. Sam was matter-of-fact about everything: 'We can turn around at any of three places, here are the criteria.' Got the summit. Came down safe. That's the job and he's good at it."],
];

const bookingsPlan = [
  // Completed past bookings (chronological)
  { daysOffset: -185, pkg: 0, guest: "Marisa Cole", email: "marisa.c@example.com", guests: 2, status: "completed", reviewed: true },
  { daysOffset: -174, pkg: 2, guest: "Tom Halligan", email: "tom.halligan@example.com", guests: 2, status: "completed", reviewed: true },
  { daysOffset: -158, pkg: 1, guest: "Annika Voss", email: "annika.voss@example.com", guests: 2, status: "completed", reviewed: true },
  { daysOffset: -141, pkg: 4, guest: "Peter Dunne", email: "peter.dunne@example.com", guests: 1, status: "completed", reviewed: true },
  { daysOffset: -127, pkg: 2, guest: "Brian Eckhart", email: "brian.eckhart@example.com", guests: 3, status: "completed", reviewed: true },
  { daysOffset: -116, pkg: 5, guest: "David Yost", email: "dyost@example.com", guests: 2, status: "completed", reviewed: true },
  { daysOffset: -98,  pkg: 0, guest: "Erin Quinones", email: "erinq@example.com", guests: 1, status: "completed", reviewed: true },
  { daysOffset: -89,  pkg: 6, guest: "Hannah Brewer", email: "hbrewer@example.com", guests: 2, status: "completed", reviewed: true },
  { daysOffset: -72,  pkg: 7, guest: "Jana Reyes", email: "j.reyes@example.com", guests: 2, status: "completed", reviewed: true },
  { daysOffset: -61,  pkg: 1, guest: "Kris Pearlstein", email: "kris.p@example.com", guests: 2, status: "completed", reviewed: true },
  { daysOffset: -53,  pkg: 4, guest: "Nora Ackerman", email: "nora.a@example.com", guests: 2, status: "completed", reviewed: true },
  { daysOffset: -44,  pkg: 3, guest: "Sean Boudreau", email: "sean.b@example.com", guests: 2, status: "completed", reviewed: true },
  { daysOffset: -36,  pkg: 0, guest: "Will Geddes", email: "wgeddes@example.com", guests: 2, status: "completed", reviewed: true },
  { daysOffset: -27,  pkg: 2, guest: "Cole Margolies", email: "cole.m@example.com", guests: 1, status: "completed", reviewed: true },
  // Recent completed, no review yet
  { daysOffset: -14,  pkg: 0, guest: "Beth Iverson", email: "beth.i@example.com", guests: 1, status: "completed", reviewed: false },
  { daysOffset: -8,   pkg: 2, guest: "Evan Korsgaard", email: "evan.k@example.com", guests: 2, status: "completed", reviewed: false },
  // Confirmed upcoming
  { daysOffset: 6,    pkg: 0, guest: "Hank Driscoll", email: "hank.d@example.com", guests: 2, status: "confirmed", reviewed: false },
  { daysOffset: 12,   pkg: 1, guest: "Iris Yancey", email: "iris.y@example.com", guests: 1, status: "confirmed", reviewed: false },
  { daysOffset: 18,   pkg: 6, guest: "Leo Mackenzie", email: "leo.m@example.com", guests: 3, status: "confirmed", reviewed: false },
  { daysOffset: 24,   pkg: 2, guest: "Mira Aslanian", email: "mira.a@example.com", guests: 2, status: "confirmed", reviewed: false },
  { daysOffset: 33,   pkg: 3, guest: "Pax Whitman", email: "pax.w@example.com", guests: 2, status: "confirmed", reviewed: false },
  // Pending
  { daysOffset: 41,   pkg: 7, guest: "Reese Calloway", email: "reese.c@example.com", guests: 3, status: "pending",   reviewed: false },
  { daysOffset: 49,   pkg: 1, guest: "Sage Ottoson", email: "sage.o@example.com", guests: 2, status: "pending",   reviewed: false },
  // One cancellation
  { daysOffset: -102, pkg: 5, guest: "Owen McCrae", email: "owen.mc@example.com", guests: 2, status: "cancelled", reviewed: false, cancelReason: "Snowpack instability — refunded deposit and offered rebook" },
];

const bookingsToInsert = bookingsPlan.map(b => {
  const pkg = packages[b.pkg];
  const tripDate = isoDate(b.daysOffset < 0 ? daysAgo(-b.daysOffset) : daysAhead(b.daysOffset));
  const headcount = b.guests;
  const total = pkg.price_type === "person" ? pkg.price * headcount : pkg.price;
  const deposit = Math.round(total * 0.25 * 100) / 100;
  const balance = Math.round((total - deposit) * 100) / 100;
  const isCompleted = b.status === "completed";
  const isCancelled = b.status === "cancelled";
  const completedAt = isCompleted ? iso(daysAgo(-b.daysOffset - 0.2)) : null;
  return {
    guide_id: guideId,
    guest_id: userId, // placeholder — satisfies FK; guest_name is the human label
    guest_name: b.guest,
    package_id: packageIds[b.pkg],
    package_title: pkg.title,
    guide_name: "Sam McKenzie",
    guide_location: "Lake Placid, NY",
    guide_slug: DEMO_SLUG,
    guests: headcount,
    trip_date: tripDate,
    status: b.status,
    price_type: pkg.price_type,
    package_price: pkg.price,
    subtotal: total,
    total: total,
    deposit: deposit,
    balance: balance,
    deposit_paid_at: isCancelled ? null : iso(b.daysOffset < 0 ? daysAgo(-b.daysOffset + 21) : daysAgo(Math.max(1, 14 - b.daysOffset))),
    balance_paid_at: isCompleted ? iso(daysAgo(-b.daysOffset + 7)) : null,
    completed_at: completedAt,
    cancelled_at: isCancelled ? iso(daysAgo(-b.daysOffset + 4)) : null,
    cancellation_reason: b.cancelReason || null,
    payout_completed_at: isCompleted ? iso(daysAgo(-b.daysOffset - 1)) : null,
    commission_rate: 0.15,
    waiver_signed: isCompleted || b.status === "confirmed",
    waiver_signed_at: (isCompleted || b.status === "confirmed") ? iso(b.daysOffset < 0 ? daysAgo(-b.daysOffset + 1) : daysAgo(Math.max(1, 3))) : null,
    review_requested_at: isCompleted ? iso(daysAgo(-b.daysOffset - 2)) : null,
    _meta: b, // not inserted; used for follow-up linking
  };
});

const cleanBookings = bookingsToInsert.map(({ _meta, ...rest }) => rest);

const bookingsResult = await step("bookings", async () => {
  const { data, error } = await admin.from("bookings").insert(cleanBookings).select("id, trip_date, total, status, guest_name");
  if (error) throw error;
  return data.length;
});

// Re-fetch with IDs to wire up payments & reviews
const { data: insertedBookings } = await admin.from("bookings").select("id, trip_date, total, status, guest_name, package_title, completed_at, deposit, balance").eq("guide_id", guideId).order("trip_date");

// Build payments
const paymentRows = [];
for (const bk of insertedBookings) {
  if (bk.status === "cancelled") continue;
  // Deposit
  paymentRows.push({
    guide_id: guideId,
    booking_id: bk.id,
    stripe_payment_intent_id: `pi_demo_dep_${bk.id.slice(0, 8)}`,
    amount: Math.round(bk.deposit * 100),
    type: "deposit",
    status: "succeeded",
    commission_rate: 0.15,
    commission_amount: Math.round(bk.deposit * 100 * 0.15),
    guide_payout_amount: Math.round(bk.deposit * 100 * 0.85),
    stripe_transfer_id: `tr_demo_dep_${bk.id.slice(0, 8)}`,
  });
  // Balance — only if completed
  if (bk.status === "completed") {
    paymentRows.push({
      guide_id: guideId,
      booking_id: bk.id,
      stripe_payment_intent_id: `pi_demo_bal_${bk.id.slice(0, 8)}`,
      amount: Math.round(bk.balance * 100),
      type: "balance",
      status: "succeeded",
      commission_rate: 0.15,
      commission_amount: Math.round(bk.balance * 100 * 0.15),
      guide_payout_amount: Math.round(bk.balance * 100 * 0.85),
      stripe_transfer_id: `tr_demo_bal_${bk.id.slice(0, 8)}`,
    });
  }
}
// A few tips
const tipBookings = insertedBookings.filter(b => b.status === "completed").slice(0, 6);
for (const bk of tipBookings) {
  paymentRows.push({
    guide_id: guideId,
    booking_id: bk.id,
    stripe_payment_intent_id: `pi_demo_tip_${bk.id.slice(0, 8)}`,
    amount: 5000 + Math.floor(Math.random() * 5000),
    type: "tip",
    status: "succeeded",
    commission_rate: 0,
    commission_amount: 0,
    guide_payout_amount: 5000,
  });
}

await step("payments", () => softInsert("payments", paymentRows, { tolerate: true }));

// Reviews — only for completed bookings with reviewed=true
const reviewRows = [];
for (let i = 0; i < reviewBodies.length; i++) {
  const [name, rating, label, body] = reviewBodies[i];
  const matchingBooking = insertedBookings.find(b => b.guest_name === name && b.status === "completed");
  reviewRows.push({
    guide_id: guideId,
    booking_id: matchingBooking?.id || null,
    rating,
    body,
    trip_label: label,
    solicited: true,
    created_at: iso(daysAgo(170 - i * 11)),
  });
}
await step("reviews", () => softInsert("reviews", reviewRows));

// ─── EXPENSES ────────────────────────────────────────────────────────────────
const expenseRows = [
  { category: "Insurance", amount: 4850, description: "Outdoor Insurance Group — annual commercial liability premium", date: isoDate(daysAgo(214)), tax_deductible: true },
  { category: "Licenses", amount: 165, description: "NY State Outdoor Guide License renewal", date: isoDate(daysAgo(196)), tax_deductible: true },
  { category: "Certifications", amount: 875, description: "WFR recertification — SOLO Schools", date: isoDate(daysAgo(178)), tax_deductible: true },
  { category: "Gear", amount: 1240, description: "Sage Trout LL 5wt + Hatch Iconic 4 Plus — client loaner upgrade", date: isoDate(daysAgo(165)), tax_deductible: true },
  { category: "Gear", amount: 685, description: "Black Diamond Cobra ice tools (pair)", date: isoDate(daysAgo(160)), tax_deductible: true },
  { category: "Gear", amount: 540, description: "Petzl Sirocco helmets — 4 client-loaner units", date: isoDate(daysAgo(152)), tax_deductible: true },
  { category: "Vehicle", amount: 92, description: "Oil change + brake inspection — guide truck", date: isoDate(daysAgo(141)), tax_deductible: true },
  { category: "Lodging", amount: 285, description: "Slant Rock lean-to permit + season backcountry pass", date: isoDate(daysAgo(128)), tax_deductible: true },
  { category: "Food", amount: 116, description: "Client lunches — Great Range traverse provisions", date: isoDate(daysAgo(116)), tax_deductible: true },
  { category: "Gear", amount: 320, description: "Replacement waders — Simms G3 client loaner", date: isoDate(daysAgo(99)), tax_deductible: true },
  { category: "Marketing", amount: 450, description: "Romlife Discover tier — monthly subscription", date: isoDate(daysAgo(82)), tax_deductible: true },
  { category: "Vehicle", amount: 78, description: "Gas — Saranac/Boquet shuttle days", date: isoDate(daysAgo(64)), tax_deductible: true },
  { category: "Food", amount: 142, description: "Bagel breakfasts + thermoses — fly fishing pre-dawn starts", date: isoDate(daysAgo(48)), tax_deductible: true },
  { category: "Gear", amount: 215, description: "Replacement crampons — Petzl Vasak (one pair)", date: isoDate(daysAgo(35)), tax_deductible: true },
  { category: "Office", amount: 99, description: "Adobe Creative Cloud monthly — newsletter image prep", date: isoDate(daysAgo(22)), tax_deductible: true },
  { category: "Continuing Ed", amount: 425, description: "AIARE Level 2 refresher — Bridger Bowl", date: isoDate(daysAgo(9)), tax_deductible: true },
  { category: "Vehicle", amount: 84, description: "Gas — Whiteface trailhead runs", date: isoDate(daysAgo(4)), tax_deductible: true },
];
await step("expenses", async () => softInsert("expenses", expenseRows.map(e => ({ ...e, guide_id: guideId }))));

// ─── MILEAGE TRIPS ───────────────────────────────────────────────────────────
const mileageRows = [
  { miles: 18.2, date: isoDate(daysAgo(36)), description: "Lake Placid → West Branch Ausable client meet", deduction_amount: 12.74 },
  { miles: 42.6, date: isoDate(daysAgo(27)), description: "Marcy trailhead shuttle + return", deduction_amount: 29.82 },
  { miles: 31.4, date: isoDate(daysAgo(22)), description: "Boquet River access — Westport scouting", deduction_amount: 21.98 },
  { miles: 24.8, date: isoDate(daysAgo(18)), description: "Cascade Pass ice walk-in + shuttle", deduction_amount: 17.36 },
  { miles: 56.9, date: isoDate(daysAgo(11)), description: "Saranac → Ausable two-river fishing day", deduction_amount: 39.83 },
  { miles: 19.2, date: isoDate(daysAgo(8)), description: "Whiteface Memorial Hwy summit prep", deduction_amount: 13.44 },
  { miles: 38.5, date: isoDate(daysAgo(5)), description: "Indian Pass trailhead + back", deduction_amount: 26.95 },
  { miles: 22.7, date: isoDate(daysAgo(2)), description: "Marcy trailhead client drop", deduction_amount: 15.89 },
];
await step("mileage_trips", () => softInsert("mileage_trips", mileageRows.map(m => ({ ...m, guide_id: guideId, mileage_rate: 0.70 }))));

// ─── LICENSES ────────────────────────────────────────────────────────────────
const licenseRows = [
  { name: "NY State Outdoor Guide License", license_number: "NY-OGL-2014-7783", issuing_authority: "NYS DEC", expiry_date: isoDate(daysAhead(195)) },
  { name: "Wilderness First Responder", license_number: "SOLO-WFR-26B-114", issuing_authority: "SOLO Schools", expiry_date: isoDate(daysAhead(548)) },
  { name: "AIARE Avalanche Level 2", license_number: "AIARE-L2-2025-3041", issuing_authority: "AIARE", expiry_date: isoDate(daysAhead(910)) },
  { name: "AMGA Single Pitch Instructor", license_number: "AMGA-SPI-2023-2289", issuing_authority: "American Mountain Guides Association", expiry_date: isoDate(daysAhead(420)) },
  { name: "CPR / AED Certification", license_number: "ARC-2026-44102", issuing_authority: "American Red Cross", expiry_date: isoDate(daysAhead(280)) },
];
await step("licenses", () => softInsert("licenses", licenseRows.map(l => ({ ...l, guide_id: guideId })), { tolerate: true }));

// ─── WAIVER TEMPLATES ────────────────────────────────────────────────────────
const waiverTemplates = [
  {
    name: "Fly Fishing Waiver",
    activity_type: "fly_fishing",
    requires_emergency_contact: true,
    requires_medical_disclosure: false,
    active: true,
    content: "I acknowledge that fly fishing in moving water carries inherent risks including wading hazards, slippery rocks, hypothermia, and exposure. I assume all such risks. Sam's Outdoor Outfitters has provided me with a wading staff, polarized eyewear, and a personal flotation device for high-water conditions. I attest that I can swim 50 yards and that I will follow my guide's instructions regarding water entry and exit points."
  },
  {
    name: "Hiking / Mountaineering Waiver",
    activity_type: "hiking",
    requires_emergency_contact: true,
    requires_medical_disclosure: true,
    active: true,
    content: "I acknowledge that mountain travel in the Adirondack High Peaks carries risks of falls, hypothermia, rapidly changing weather, lightning above treeline, and remote evacuation times exceeding 6 hours. I disclose all medical conditions and medications below. I agree that my guide has final authority to turn the trip around for safety reasons and that no refund is due for a guide-called weather decision."
  },
  {
    name: "Ice Climbing Waiver",
    activity_type: "ice_climbing",
    requires_emergency_contact: true,
    requires_medical_disclosure: true,
    active: true,
    content: "I acknowledge that ice climbing involves risk of serious injury or death from falling, falling ice, anchor failure, equipment failure, and rope-system error. I will follow all instructions from my certified guide. I have been instructed on belaying, knot tying, and emergency procedures. I attest I am in adequate physical condition for the route as described."
  },
  {
    name: "Backcountry Skiing Waiver",
    activity_type: "backcountry_skiing",
    requires_emergency_contact: true,
    requires_medical_disclosure: true,
    active: true,
    content: "I acknowledge avalanche risk and that no terrain, regardless of guide expertise, is risk-free. My guide has reviewed today's regional avalanche forecast with me. I am carrying a beacon, shovel, and probe and have demonstrated competency with each. I understand the guide may change or cancel the objective at any point based on snowpack assessment."
  },
];
await step("waiver_templates", () => softInsert("waiver_templates", waiverTemplates.map(w => ({ ...w, guide_id: guideId })), { tolerate: true }));

// ─── CONTENT PIECES (newsletters, carousels, blogs, IG posts) ────────────────
const contentPieces = [];

// Newsletter 1 — "The Mud Season Issue" (published, with sends)
const nl1Slug = "mud-season-2026";
const nl1Content = {
  version: 1,
  subject: "The mud season issue — why we're not fishing yet",
  preheader: "Three weeks until the West Branch is itself again.",
  hero: { imageUrl: NEWSLETTER_HERO, headline: "The mud season issue", subhead: "We don't book until the water tells us to." },
  blocks: [
    { type: "paragraph", text: "Hey — quick note from Lake Placid. The West Branch is high, brown, and 41°F as of this morning. I know some of you have spring trips on the books. Here's where we are:" },
    { type: "heading", text: "What's running" },
    { type: "paragraph", text: "Boquet's clearer than the Ausable. Saranac is still pushing too much water. I'm not putting clients on water that's stained and pushing 1,800 CFS — you won't see fish and they won't see your bug. We're better off waiting two weeks." },
    { type: "heading", text: "When we'll be back on" },
    { type: "paragraph", text: "Best read of the forecast: water drops below 600 CFS around June 2-5. That's when I'll start running half-days again. I'll send a one-line note when the gauge confirms it." },
    { type: "heading", text: "If you're booked for May 22-31" },
    { type: "paragraph", text: "I've already reached out. We're rebooking everyone for the first week of June at no additional cost. If that window doesn't work for you, your deposit's refundable — just reply to this email." },
    { type: "paragraph", text: "— Sam" },
  ],
  footer: { businessName: "Sam's Outdoor Outfitters", location: "Lake Placid, NY", unsubscribeUrl: "{{unsubscribeUrl}}" },
};

contentPieces.push({
  guide_id: guideId,
  type: "email",
  platform: "email",
  content: nl1Content.blocks.filter(b => b.type === "paragraph").map(b => b.text).join("\n\n"),
  content_json: nl1Content,
  public_slug: nl1Slug,
  subject: nl1Content.subject,
  preheader: nl1Content.preheader,
  title: "The mud season issue",
  status: "published",
  published_at: iso(daysAgo(11)),
  photos: [NEWSLETTER_HERO],
});

// Newsletter 2 — "Late-Spring Bug Report" (draft)
contentPieces.push({
  guide_id: guideId,
  type: "email",
  platform: "email",
  content: "Quick bug-by-bug rundown of what's hatching on the West Branch right now: Hendricksons winding down, March Browns starting, sulphur first appearance expected around June 8-12. Carry a 14 Adams parachute, 16 sulphur dun, and a sparse 18 BWO emerger.",
  content_json: {
    version: 1,
    subject: "Late-spring bug report — what's hatching this week",
    preheader: "Hendricksons winding down, sulphurs coming online.",
    hero: { imageUrl: GALLERY[6], headline: "Late-spring bug report", subhead: "What to tie on, week of June 8-14." },
    blocks: [
      { type: "paragraph", text: "Short one this week — just want to update what's working on the water before the weekend." },
      { type: "heading", text: "On the West Branch" },
      { type: "paragraph", text: "Hendricksons are about done. Last good hatch was Tuesday evening on the upper section. March Browns are filling in midday on warm afternoons." },
    ],
    footer: { businessName: "Sam's Outdoor Outfitters", location: "Lake Placid, NY", unsubscribeUrl: "{{unsubscribeUrl}}" },
  },
  public_slug: "late-spring-bug-report",
  subject: "Late-spring bug report — what's hatching this week",
  preheader: "Hendricksons winding down, sulphurs coming online.",
  title: "Late-spring bug report",
  status: "approved",
  photos: [GALLERY[6]],
});

// Newsletter 3 — "Why we cap groups at 4" (published, older)
contentPieces.push({
  guide_id: guideId,
  type: "email",
  platform: "email",
  content: "A note on group size and what changes when you push past four people in alpine terrain.",
  content_json: {
    version: 1,
    subject: "Why we cap groups at four",
    preheader: "It's not about exclusivity. It's about decision-making.",
    hero: { imageUrl: GALLERY[1], headline: "Why we cap at four", subhead: "Same reason mountain guides cap at four worldwide." },
    blocks: [
      { type: "paragraph", text: "Got a few inquiries this spring asking if we'd run groups of 6 or 7 for corporate days. Short answer: no. Long answer below." },
      { type: "heading", text: "What changes at five" },
      { type: "paragraph", text: "Decision-making time. Spacing on technical terrain. Visibility of the slowest person. Communication on a windy ridge. Every one of those degrades fast above four." },
    ],
    footer: { businessName: "Sam's Outdoor Outfitters", location: "Lake Placid, NY", unsubscribeUrl: "{{unsubscribeUrl}}" },
  },
  public_slug: "why-we-cap-at-four",
  subject: "Why we cap groups at four",
  preheader: "It's not about exclusivity. It's about decision-making.",
  title: "Why we cap groups at four",
  status: "published",
  published_at: iso(daysAgo(38)),
  photos: [GALLERY[1]],
});

// Carousel — "Wild trout vs stocked trout" (published)
contentPieces.push({
  guide_id: guideId,
  type: "carousel",
  platform: "instagram",
  content: "7-slide carousel teaching the difference between wild and stocked trout.",
  content_json: {
    version: 1,
    slides: [
      { title: "Wild vs stocked", subtitle: "How to tell, and why it matters." },
      { title: "Slide 2 — Fin shape", body: "Stocked: rounded, often nicked. Wild: long, intact, perfect edges." },
      { title: "Slide 3 — Color", body: "Stocked: pale, silvery. Wild: dark-backed, brilliant red spots, halo-bordered." },
      { title: "Slide 4 — Size variance", body: "A stocked stretch is all 9-12 inches. A wild fishery: 4-inchers next to 18s." },
      { title: "Slide 5 — Where they hold", body: "Stocked fish stack in pools near the truck. Wild fish hold in seams, undercuts, structure." },
      { title: "Slide 6 — Why it matters", body: "Wild fisheries are fragile. Catch and release. Wet hands. Crimped barbs." },
      { title: "Slide 7", body: "Want to see the difference in person? Book a half-day. Lake Placid, NY." },
    ],
    caption: "We get this question every spring. Wild trout are a different animal — literally. Swipe through.\n\nQuick gear note: bring barbless. Wet your hands. The fish doesn't care what your photo looks like.",
    hashtags: ["#wildtrout", "#adirondacks", "#flyfishing", "#lakeplacid", "#highpeaks"],
  },
  title: "Wild vs stocked trout — how to tell",
  status: "published",
  published_at: iso(daysAgo(22)),
  hashtags: ["#wildtrout", "#adirondacks", "#flyfishing", "#lakeplacid", "#highpeaks"],
  photos: [GALLERY[0], GALLERY[6]],
  performance: { views: 4280, likes: 318, saves: 142, comments: 27 },
});

// Blog — "The Great Range Traverse: A Real Account"
contentPieces.push({
  guide_id: guideId,
  type: "blog",
  platform: "web",
  content: `The Great Range Traverse is eight summits and somewhere between 24 and 27 miles, depending on where you start and which variation you take. People call it one of the hardest dayhikes in the Northeast. We don't run it as a dayhike. We run it as a two-day with a camp at Slant Rock. Here's why.

The dayhike version requires twenty hours of moving time for a fit hiker who knows the trails. That's ten hours below treeline and ten hours above. The exposed sections — Gothics, Saddleback, Basin, Marcy — are not the place to be deteriorating from sleep deprivation and a 4 AM start. Most of the mistakes I've watched happen in the Range happened in hour seventeen. Hypothermia, navigation errors, ankle rolls that should have been caught and weren't. Tired people make tired decisions.

The two-day version splits the work. Day one: Lower Wolfjaw, Upper Wolfjaw, Armstrong, Gothics, Saddleback. That's eight miles and about 4,500 feet of gain. We're at Slant Rock by 5 PM. We make a real dinner. We sleep. Day two: Basin, Haystack, Marcy. Six miles, 2,800 feet, mostly downhill once you tag Marcy. We're back at the truck by 4 PM.

What you need: real boots that you've broken in. Layered clothing that handles 35°F to 75°F in the same day, because that's normal up there in September. A rain shell that actually keeps you dry, not a windbreaker that calls itself a rain shell. Enough food to overeat by 30%. Two liters of water per person per day, filtered at the camp from the brook.

What I provide: the route knowledge, the tent, the stove, the filter, dinner ingredients, breakfast, and the call on whether we go. The weather decision happens at the trailhead. If it's calling for thunder above treeline on day two, we don't start day one. That's not a rule I bend.

The Range is the best two days of mountain travel in the Northeast. It earns the reputation. If you want to see what an Adirondack alpine ridge actually feels like — exposed quartzite, scrub spruce, the whole High Peaks visible in every direction — this is the trip.`,
  title: "The Great Range Traverse: a real account",
  status: "published",
  published_at: iso(daysAgo(45)),
  meta_description: "What the Great Range Traverse is actually like, why we run it as a two-day, and what you need to bring. From Sam's Outdoor Outfitters, Lake Placid NY.",
  photos: [GALLERY[1], GALLERY[4]],
  performance: { views: 1850, time_on_page_seconds: 245 },
});

// Blog — "Reading the West Branch Ausable: a primer"
contentPieces.push({
  guide_id: guideId,
  type: "blog",
  platform: "web",
  content: `The West Branch of the Ausable runs 25 miles from Lake Placid to Au Sable Forks. Most of it is wild-trout water. None of it fishes the same way twice.

If you're new to it, here's the short version of what to read for...

[1,400 more words covering: flow rate as the primary variable, the four sections of river (Wilmington, Flume, Lake Placid stretch, lower river), seasonal hatch progression, where the wild fish actually hold versus where they don't, common mistakes from western anglers, and a closing note on conservation.]`,
  title: "Reading the West Branch Ausable: a primer",
  status: "published",
  published_at: iso(daysAgo(78)),
  meta_description: "How to read the West Branch Ausable river — flow rates, seasonal hatches, where the wild trout hold. Guide notes from twelve seasons of Adirondack fly fishing.",
  photos: [GALLERY[0]],
  performance: { views: 3120, time_on_page_seconds: 312 },
});

// Instagram posts
const igPosts = [
  { content: "First light, West Branch. Water dropped to 540 CFS overnight. We're back on this week.", photo: GALLERY[0], days: 6 },
  { content: "Spring is loud here. Hermit thrush at 4 AM, peepers at 9 PM, Hendricksons on the water in between.", photo: GALLERY[4], days: 19 },
  { content: "Booking the Great Range traverse for the second week of July. Two spots open. Reach out.", photo: GALLERY[1], days: 31 },
  { content: "Why I won't run an alpine day with rain gear from a department store. The mountain doesn't care what it says on the tag.", photo: GALLERY[3], days: 50 },
  { content: "Cascade Pass yesterday. WI3, top-rope, two clients on their first ice day. Crampons mounted, helmets snug, smiles big.", photo: GALLERY[2], days: 63 },
  { content: "Stillborn Hendrickson, sparse. Tied with grizzly hen and CDC. The fish on this river don't want the magazine fly. They want the one that drifts dead.", photo: GALLERY[0], days: 77 },
  { content: "Sunrise from Marcy. Five clients in three days summited. The trail is in good shape after the maintenance crew's spring run.", photo: GALLERY[1], days: 88 },
  { content: "Carrying out trash that wasn't ours. Not a complaint — just a reminder. The Adirondacks stay this way because someone always carries out the bottle.", photo: GALLERY[5], days: 102 },
];
for (const p of igPosts) {
  contentPieces.push({
    guide_id: guideId,
    type: "social_post",
    platform: "instagram",
    content: p.content,
    title: p.content.slice(0, 60),
    status: "published",
    published_at: iso(daysAgo(p.days)),
    photos: [p.photo],
    hashtags: ["#adirondacks", "#lakeplacid", "#flyfishing", "#highpeaks", "#wildtrout"],
    performance: { views: 800 + Math.floor(Math.random() * 4000), likes: 60 + Math.floor(Math.random() * 280), comments: Math.floor(Math.random() * 25) },
  });
}

const insertedContent = await step("content_pieces", async () => {
  const { data, error } = await admin.from("content_pieces").insert(contentPieces).select("id, type, public_slug, subject");
  if (error) throw error;
  return data.length;
});

// Fetch back so we have IDs
const { data: publishedNewsletters } = await admin
  .from("content_pieces")
  .select("id, subject, public_slug, published_at")
  .eq("guide_id", guideId)
  .eq("type", "email")
  .not("published_at", "is", null);

// ─── NEWSLETTER SENDS — campaign analytics with realistic webhook stats ──────
const sendRows = [];
for (const nl of publishedNewsletters || []) {
  const sendBaseDate = new Date(nl.published_at);
  // ~42 recipients (subscribers minus a few unsubscribes)
  const recipientPool = subscriberRows.slice(0, 42);
  for (let i = 0; i < recipientPool.length; i++) {
    const sub = recipientPool[i];
    const isBounced = i === 7 || i === 23; // 2 bounces
    const isOpen = !isBounced && Math.random() < 0.62; // 62% open rate
    const opens = isOpen ? (Math.random() < 0.3 ? 2 : 1) : 0;
    const isClick = isOpen && Math.random() < 0.18; // 18% CTR among openers (~11% overall)
    const clicks = isClick ? 1 : 0;
    sendRows.push({
      guide_id: guideId,
      newsletter_id: nl.id,
      send_type: "campaign",
      recipient_email: sub.email,
      recipient_count: 1,
      status: isBounced ? "bounced" : "sent",
      resend_message_id: `re_demo_${nl.id.slice(0, 6)}_${i.toString().padStart(3, "0")}`,
      opens,
      clicks,
      sent_at: iso(new Date(sendBaseDate.getTime() + i * 1200)),
      error: isBounced ? "550 5.1.1 user unknown" : null,
    });
  }
}
// Plus one test send each
for (const nl of publishedNewsletters || []) {
  sendRows.push({
    guide_id: guideId,
    newsletter_id: nl.id,
    send_type: "test",
    recipient_email: DEMO_EMAIL,
    recipient_count: 1,
    status: "sent",
    resend_message_id: `re_demo_test_${nl.id.slice(0, 6)}`,
    opens: 1,
    clicks: 0,
    sent_at: iso(new Date(new Date(nl.published_at).getTime() - 3600 * 1000)),
  });
}

await step("newsletter_sends", () => softInsert("newsletter_sends", sendRows));

// ─── CONTENT INTELLIGENCE OPPORTUNITIES ──────────────────────────────────────
const intelligenceRows = [
  { category: "weather", title: "Cold front Thursday — best fishing of the week", summary: "Forecast model shows a 12-degree drop Wed→Thu with sustained low-light. West Branch flows steady at 580 CFS. Prime conditions for streamer + nymph rigs.", relevance_score: 0.88, suggested_angle: "Send a 'last-minute openings' note to your subscriber list. Two slots left for Thursday half-day.", suggested_types: ["social_post", "email"], status: "new" },
  { category: "seasonal", title: "Sulphur hatch starts in 10-14 days", summary: "Year-over-year USGS temp data + degree-day model suggest sulphur emergence around June 8-14 on the West Branch.", relevance_score: 0.92, suggested_angle: "Publish a 'know your bugs' carousel or a short newsletter for subscribers who fish dry-fly only.", suggested_types: ["carousel", "email"], status: "new" },
  { category: "local_event", title: "Ironman Lake Placid (July 26) — incoming visitors", summary: "1,800+ visiting athletes plus families. Many are outdoor-minded and looking for post-race recovery activities Monday-Wednesday.", relevance_score: 0.74, suggested_angle: "Position the Whiteface Sunrise Hike or half-day fly fishing as a 'recovery activity.' Pre-race week is your booking window.", suggested_types: ["social_post", "blog"], status: "new" },
  { category: "review_highlight", title: "Recent five-star review from Sean Boudreau (Great Range)", summary: "'Slept at Slant Rock. Watched stars through the lean-to.' — story-quality testimonial perfect for carousel or short reel.", relevance_score: 0.81, suggested_angle: "Turn the lean-to + stars line into a single-image quote post.", suggested_types: ["social_post", "review_spotlight"], status: "used" },
  { category: "trend", title: "Search interest in 'Adirondack overnight' up 34% YoY", summary: "Google Trends shows 'adirondack overnight hike' and 'high peaks camping permit' both up materially since April.", relevance_score: 0.69, suggested_angle: "SEO blog targeting overnight-curious hikers. Indian Pass is the natural beginner pitch.", suggested_types: ["blog"], status: "new" },
  { category: "law_change", title: "DEC bear canister requirement reminder — Eastern High Peaks", summary: "Approved bear-resistant canister required for all overnight stays April 1 – Nov 30. Some clients still showing up without one.", relevance_score: 0.65, suggested_angle: "Pre-trip checklist email to anyone with an overnight booked in the next 60 days.", suggested_types: ["email"], status: "new" },
];
await step("content_intelligence", () => softInsert("content_intelligence", intelligenceRows.map(r => ({ ...r, guide_id: guideId })), { tolerate: true }));

// ─── GUIDE NOTIFICATIONS ─────────────────────────────────────────────────────
const notificationRows = [
  { type: "new_booking", title: "New booking — Hank Driscoll, May 22", body: "Half-day fly fishing for 2. Deposit paid. Waiver pending.", priority: "high", created_at: iso(daysAgo(3)) },
  { type: "review_received", title: "5-star review from Cole Margolies", body: "'Tough conditions — fog at treeline, drizzle all morning. Sam was matter-of-fact...'", priority: "normal", created_at: iso(daysAgo(8)) },
  { type: "weather_alert", title: "Thunderstorms forecast for Sunday", body: "Sage Ottoson's fishing trip is on Saturday — clear. Pax Whitman's traverse begins Sunday — review.", priority: "high", created_at: iso(daysAgo(1)) },
  { type: "balance_charged", title: "Balance auto-charged — Mira Aslanian", body: "$1,185 charged 14 days before trip date (June 8). Payout pending.", priority: "normal", created_at: iso(daysAgo(2)) },
  { type: "license_renewal", title: "WFR cert expires in 18 months", body: "Schedule SOLO recert before October 2027 to maintain continuous status.", priority: "normal", created_at: iso(daysAgo(12)) },
];
await step("guide_notifications", () => softInsert("guide_notifications", notificationRows.map(n => ({ ...n, guide_id: guideId })), { tolerate: true }));

// ─── GUIDE INTELLIGENCE (health score) ───────────────────────────────────────
const intelRow = {
  guide_id: guideId,
  health_score: 87,
  health_components: {
    profile_completeness: 95,
    response_speed: 92,
    review_velocity: 88,
    booking_pipeline: 82,
    content_activity: 79,
  },
  booking_velocity: 2.8,
  repeat_rate: 0.31,
  avg_response_minutes: 38,
  profile_completeness: 95,
  content_activity_score: 79,
};
await admin.from("guide_intelligence").upsert(intelRow, { onConflict: "guide_id" });
console.log("  guide_intelligence … ok");

// ─── GUEST PROFILES (CRM for repeat clients) ─────────────────────────────────
// Just a few — repeat guests show as VIP
const repeats = ["Marisa Cole", "Tom Halligan", "Annika Voss", "Erin Quinones"];
const guestProfileRows = [];
for (const name of repeats) {
  const matchingBookings = insertedBookings.filter(b => b.guest_name === name && b.status === "completed");
  if (!matchingBookings.length) continue;
  guestProfileRows.push({
    guide_id: guideId,
    profile_id: userId, // FK to profiles — use guide's own profile as placeholder since we don't have guest auth users
    notes: `Repeat client. ${name} books spring fly fishing days.`,
    tags: ["repeat", "vip"],
    total_trips: matchingBookings.length,
    total_spent: matchingBookings.reduce((sum, b) => sum + b.total, 0),
    last_trip_date: matchingBookings[matchingBookings.length - 1].trip_date,
    first_trip_date: matchingBookings[0].trip_date,
    booking_count: matchingBookings.length,
    vip: true,
    experience_level: "intermediate",
    preferred_activities: ["fly_fishing"],
    lifetime_value: matchingBookings.reduce((sum, b) => sum + b.total, 0),
  });
}
await step("guest_profiles", () => softInsert("guest_profiles", guestProfileRows, { tolerate: true }));

// ─── DONE ────────────────────────────────────────────────────────────────────
console.log("\n────────────────────────────────────────────");
console.log("  Sam's Outdoor Outfitters — seed complete");
console.log("────────────────────────────────────────────");
console.log(`  Login:    ${DEMO_EMAIL}`);
console.log(`  Password: ${DEMO_PASSWORD}`);
console.log(`  Guide ID: ${guideId}`);
console.log(`  Public:   /guides/${DEMO_SLUG}`);
console.log("");
