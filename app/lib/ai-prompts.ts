// Shared prompt fragments for the marketing AI. Centralized so the main
// generate route, the per-block refine route, and any future surfaces (carousel
// slide regen, reel scene regen) all draw the guide's voice/context from one
// place.

import { getSupabaseAdmin } from "./supabase-server";
import { profileToPromptBlock } from "./voice-profile";

export interface GuideContext {
  guideId: string;
  guideName: string;
  activity: string;
  location: string;
  bio: string;
  slug: string;
  bookingUrl: string;
  voiceProfile: unknown;
  voiceExamples: string[];
  packages: Array<{ title: string; price: number | null; duration: string | null; description: string | null }>;
  reviewQuotes: Array<{ body: string; rating: number; author?: string; trip_label?: string }>;
  guidePhotos: string[];
  coverPhotoUrl?: string;
  profilePhotoUrl?: string;
  currentMonth: string; // lowercase
  seasonalHint: string;
  promptPersonality: string;
  notePrompt: string;
}

const CATEGORY_MAP: Record<string, string> = {
  "Fly Fishing": "fly_fishing", "Fishing": "fly_fishing",
  "Hiking": "hiking", "Mountaineering": "hiking",
  "Rock Climbing": "rock_climbing", "Climbing": "rock_climbing",
  "Ice Climbing": "ice_climbing",
  "Backcountry Skiing": "backcountry_skiing", "Skiing": "backcountry_skiing",
  "Food Tour": "food_tour", "Culinary": "food_tour",
  "Wildlife": "wildlife_safari", "Safari": "wildlife_safari",
  "4WD": "four_wheel_drive", "Jeep": "four_wheel_drive",
  "Mountain Biking": "mountain_biking", "MTB": "mountain_biking",
  "Rafting": "whitewater", "Whitewater": "whitewater",
  "Kayaking": "paddling", "Canoeing": "paddling", "Paddling": "paddling",
  "Stargazing": "stargazing", "Astronomy": "stargazing",
  "Photography": "photography",
  "Cultural": "cultural_history", "Historical": "cultural_history",
  "Via Ferrata": "via_ferrata",
  "Hunting": "hunting",
  "Snowmobiling": "snowmobiling",
  "Foraging": "foraging",
  "Brewery": "brewery_tour", "Beer": "brewery_tour",
  "Diving": "whitewater", "Surfing": "whitewater",
  "Camping": "hiking", "Backpacking": "hiking",
  "Sailing": "paddling", "Snowshoeing": "backcountry_skiing",
  "Ice Fishing": "fly_fishing",
};

export async function loadGuideContext(guideId: string): Promise<GuideContext> {
  const supabase = getSupabaseAdmin();

  const { data: guide } = await supabase.from("guides").select("*").eq("id", guideId).single();
  if (!guide) throw new Error(`Guide ${guideId} not found`);

  const [{ data: profile }, { data: reviews }, { data: packages }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", guide.profile_id).single(),
    supabase.from("reviews").select("body, rating, trip_label, guest_name").eq("guide_id", guideId)
      .order("rating", { ascending: false }).limit(10),
    supabase.from("packages").select("title, price, duration, description").eq("guide_id", guideId).eq("active", true).limit(8),
  ]);

  const guideName = profile?.full_name || "Guide";
  const activity = guide.categories?.[0] || "Adventure";
  const location = guide.location || "";

  const verticalSlug = CATEGORY_MAP[activity] || (activity || "").toLowerCase().replace(/[^a-z_]/g, "_").replace(/_+/g, "_");
  const { data: verticalConfig } = await supabase.from("vertical_configs").select("*").eq("vertical", verticalSlug).maybeSingle();

  const currentMonth = new Date().toLocaleString("en-US", { month: "long" }).toLowerCase();
  const seasonalHint = verticalConfig?.seasonal_intelligence?.[currentMonth] || "";
  const promptPersonality = verticalConfig?.prompt_personality || "";
  const notePrompt = verticalConfig?.notes_from_guide_prompt || "";

  const guidePhotos = [
    ...(guide.gallery_photos || []),
    guide.cover_photo_url,
    guide.profile_photo_url,
  ].filter(Boolean);

  return {
    guideId,
    guideName,
    activity,
    location,
    bio: guide.bio || guide.tagline || "",
    slug: guide.slug || "",
    bookingUrl: `https://romlife.co/guides/${guide.slug || ""}`,
    voiceProfile: guide.voice_profile,
    voiceExamples: Array.isArray(guide.voice_examples) ? guide.voice_examples.filter(Boolean) : [],
    packages: (packages || []).map((p: Record<string, unknown>) => ({
      title: String(p.title || ""),
      price: typeof p.price === "number" ? p.price : null,
      duration: p.duration ? String(p.duration) : null,
      description: p.description ? String(p.description) : null,
    })),
    reviewQuotes: (reviews || []).map((r: Record<string, unknown>) => ({
      body: String(r.body || ""),
      rating: Number(r.rating) || 0,
      author: r.guest_name ? String(r.guest_name) : undefined,
      trip_label: r.trip_label ? String(r.trip_label) : undefined,
    })).filter((r: { body: string }) => r.body),
    guidePhotos,
    coverPhotoUrl: guide.cover_photo_url || undefined,
    profilePhotoUrl: guide.profile_photo_url || undefined,
    currentMonth,
    seasonalHint,
    promptPersonality,
    notePrompt,
  };
}

// The base context block injected into every system prompt.
export function buildBaseContext(ctx: GuideContext, opts: { topic?: string } = {}): string {
  const packageList = ctx.packages.map((p) => `${p.title}${p.price ? ` ($${p.price})` : ""}${p.duration ? `, ${p.duration}` : ""}${p.description ? ` — ${p.description.slice(0, 80)}` : ""}`).join("\n  ");
  const reviewBlock = ctx.reviewQuotes.length
    ? `\nREAL GUEST QUOTES (use verbatim where possible — never fabricate):\n${ctx.reviewQuotes.slice(0, 4).map((r) => `  "${r.body.slice(0, 280)}" — ${r.author || "Guest"}${r.trip_label ? ` · ${r.trip_label}` : ""}`).join("\n")}`
    : "";

  const voiceBlock = profileToPromptBlock(ctx.voiceProfile, ctx.voiceExamples);

  return `Guide: ${ctx.guideName}
Location: ${ctx.location}
Activity: ${ctx.activity}
Bio: ${ctx.bio}
${voiceBlock}
Packages:
  ${packageList || "Not set"}
Booking URL: ${ctx.bookingUrl}
${reviewBlock}
${opts.topic ? `\nFOCUS TOPIC: ${opts.topic}` : ""}

CURRENT MONTH: ${ctx.currentMonth.charAt(0).toUpperCase() + ctx.currentMonth.slice(1)}
${ctx.seasonalHint ? `WHAT'S HAPPENING RIGHT NOW IN ${ctx.location.toUpperCase()}: ${ctx.seasonalHint}` : ""}
${ctx.promptPersonality ? `VOICE GUIDANCE FOR THIS VERTICAL: ${ctx.promptPersonality}` : ""}

GROUNDING RULES:
- Use your real knowledge of ${ctx.location} — name actual rivers, trails, peaks, neighborhoods, species, weather patterns
- Be specific, not generic. "The Madison" beats "the local river"
- Match the guide's voice: ${ctx.voiceExamples.length ? "study the examples above" : "warm, expert, personal — not corporate, not salesy"}
- Never use marketing jargon (leverage, optimize, journey, solutions, unleash)
- Reference current month and conditions specifically`;
}
