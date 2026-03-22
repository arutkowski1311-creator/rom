import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Fallback if no vertical_config found
const FALLBACK_VERTICAL = {
  prompt_personality: "Write with warmth, expertise, and genuine enthusiasm for this activity. The guest should feel like they hired the best guide in the area.",
  tone_keywords: ["warm", "expert", "personal"],
  timeline_logic: "Structure around the activity's natural rhythm. Morning, midday, afternoon.",
  what_to_bring_defaults: ["Comfortable clothing", "Water bottle", "Sunscreen", "Snacks", "Camera"],
  what_to_bring_guide_provides: ["Expert guidance", "Safety equipment", "First aid kit"],
  conditions_block_label: "Current Conditions",
  notes_from_guide_prompt: "Write a warm personal note referencing current conditions and what makes today special. 3-4 sentences.",
  seasonal_intelligence: {},
  section_overrides: {},
};

async function fetchWeather(location: string, tripDate: string) {
  try {
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`);
    const geoData = await geoRes.json();
    if (!geoData.results?.length) return null;
    const { latitude, longitude } = geoData.results[0];

    const tripDay = new Date(tripDate);
    const now = new Date();
    const daysUntil = Math.ceil((tripDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil > 7 || daysUntil < 0) return null;

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode,sunrise,sunset&timezone=auto&start_date=${tripDate}&end_date=${tripDate}`
    );
    const data = await res.json();
    if (!data.daily) return null;

    const codes: Record<number, string> = {
      0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
      45: "Foggy", 51: "Light drizzle", 61: "Light rain", 63: "Moderate rain",
      65: "Heavy rain", 71: "Light snow", 73: "Moderate snow", 80: "Rain showers", 95: "Thunderstorms",
    };

    return {
      high: Math.round(data.daily.temperature_2m_max[0]),
      low: Math.round(data.daily.temperature_2m_min[0]),
      precipitation: data.daily.precipitation_sum[0],
      windSpeed: Math.round(data.daily.windspeed_10m_max[0]),
      condition: codes[data.daily.weathercode[0]] || "Variable",
      sunrise: data.daily.sunrise?.[0] || null,
      sunset: data.daily.sunset?.[0] || null,
      latitude, longitude,
    };
  } catch (e) {
    console.error("Weather fetch error:", e);
    return null;
  }
}

function mapCategoryToVertical(category: string): string {
  const map: Record<string, string> = {
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
  };
  return map[category] || "";
}

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();
    if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    // ── Fetch all context data in parallel ─────────────────────────────────
    const { data: booking } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const [
      { data: guide },
      { data: pkg },
      { data: guestProfile },
      { data: guestUser },
    ] = await Promise.all([
      supabase.from("guides").select("*").eq("id", booking.guide_id).single(),
      supabase.from("packages").select("*").eq("id", booking.package_id).single(),
      supabase.from("guest_profiles").select("*").eq("profile_id", booking.guest_id).eq("guide_id", booking.guide_id).maybeSingle(),
      supabase.from("profiles").select("full_name").eq("id", booking.guest_id).single(),
    ]);

    const { data: guideProfile } = await supabase.from("profiles").select("full_name").eq("id", guide?.profile_id).single();

    // Fetch reviews for this guide (used to understand what guests love)
    const { data: reviews } = await supabase
      .from("reviews").select("body, rating, trip_label")
      .eq("guide_id", booking.guide_id)
      .order("created_at", { ascending: false }).limit(5);

    // Fetch previous bookings for this guest with this guide
    const { data: previousTrips } = await supabase
      .from("bookings").select("package_title, trip_date, status")
      .eq("guest_id", booking.guest_id).eq("guide_id", booking.guide_id)
      .neq("id", bookingId).eq("status", "completed")
      .order("trip_date", { ascending: false }).limit(3);

    // Fetch other packages for rebook suggestions
    const { data: otherPackages } = await supabase
      .from("packages").select("title, price, duration")
      .eq("guide_id", booking.guide_id).eq("active", true)
      .neq("id", booking.package_id).limit(3);

    // ── Fetch vertical config from database ─────────────────────────────────
    const activity = guide?.categories?.[0] || "Adventure";
    const verticalSlug = mapCategoryToVertical(activity);
    let verticalConfig = FALLBACK_VERTICAL;

    if (verticalSlug) {
      const { data: vc } = await supabase
        .from("vertical_configs").select("*")
        .eq("vertical", verticalSlug).single();
      if (vc) verticalConfig = vc;
    }

    // ── Derive context ──────────────────────────────────────────────────────
    const guideName = guideProfile?.full_name || "Guide";
    const guestName = booking.guest_name || guestUser?.full_name || "Guest";
    const location = guide?.location || "";
    const voiceProfile = guide?.voice_profile;
    const tripDate = new Date(booking.trip_date);
    const monthName = tripDate.toLocaleString("en-US", { month: "long" }).toLowerCase();
    const dayOfWeek = tripDate.toLocaleString("en-US", { weekday: "long" });
    const seasonalHint = typeof verticalConfig.seasonal_intelligence === "object"
      ? (verticalConfig.seasonal_intelligence as Record<string, string>)[monthName] || ""
      : "";

    const reviewHighlights = (reviews || []).map((r: any) => `"${(r.body || "").substring(0, 100)}"`).join("\n");

    const previousTripContext = (previousTrips || []).length > 0
      ? `This guest has been with you before:\n${(previousTrips || []).map((t: any) => `- ${t.package_title} on ${t.trip_date}`).join("\n")}\nReference their history naturally — it builds trust.`
      : "This is their FIRST trip with you. Make the welcome extra warm and reassuring.";

    const otherPkgList = (otherPackages || []).map((p: any) => `${p.title} ($${p.price}, ${p.duration})`).join(", ");

    // ── Fetch weather ────────────────────────────────────────────────────────
    const weather = await fetchWeather(location, booking.trip_date);

    // ── Section overrides from vertical config ──────────────────────────────
    const sectionOverrides = verticalConfig.section_overrides || {};
    const renames = typeof sectionOverrides === "object" && (sectionOverrides as any).rename
      ? (sectionOverrides as any).rename : {};

    // ── Build the AI prompt ──────────────────────────────────────────────────
    const prompt = `${verticalConfig.prompt_personality}

You are generating a premium guest itinerary for RŌM, an adventure guide marketplace. This must feel like the guide personally sat down and wrote it for this specific guest. Every line must be specific — no generic filler.

GUIDE CONTEXT:
- Name: ${guideName}
- Location: ${location}
- Activity: ${activity}
- Bio: ${guide?.bio || guide?.tagline || ""}
- Years experience: ${guide?.years_experience || "experienced"}
${voiceProfile ? `- Voice/tone: ${typeof voiceProfile === "object" ? `${voiceProfile.tone}. ${voiceProfile.personality_markers}` : voiceProfile}` : ""}
${voiceProfile && typeof voiceProfile === "object" && voiceProfile.sample_phrases ? `- How the guide talks: "${(voiceProfile.sample_phrases as string[]).join('", "')}"` : ""}

WHAT GUESTS LOVE ABOUT THIS GUIDE (from real reviews):
${reviewHighlights || "No reviews yet — make the itinerary especially welcoming."}

GUEST CONTEXT:
- Name: ${guestName}
- Party size: ${booking.guests || 1}
- ${previousTripContext}
${guestProfile?.experience_level ? `- Skill level: ${guestProfile.experience_level}` : "- Skill level: Not specified — assume beginner-friendly tone"}
${booking.special_requests || booking.guest_message ? `- Special requests: "${booking.special_requests || booking.guest_message}"` : ""}
${guestProfile?.notes ? `- Guide's private notes: ${guestProfile.notes}` : ""}
${guestProfile?.vip ? `- VIP guest (${guestProfile.total_trips} trips, $${guestProfile.total_spent} spent). Treat them accordingly.` : ""}

TRIP DETAILS:
- Package: ${pkg?.title || booking.package_title || "Trip"}
- Duration: ${pkg?.duration || "Full day"}
- Price: $${pkg?.price || booking.package_price || 0}
- Date: ${dayOfWeek}, ${tripDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
${weather ? `- Weather: ${weather.condition}, High ${weather.high}°F / Low ${weather.low}°F, Wind ${weather.windSpeed}mph${weather.precipitation > 0 ? `, ${weather.precipitation}mm precipitation expected` : ""}` : "- Weather: Forecast not available yet"}
${weather?.sunrise ? `- Sunrise: ${new Date(weather.sunrise).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}
${weather?.sunset ? `- Sunset: ${new Date(weather.sunset).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}

SEASONAL INTELLIGENCE FOR ${monthName.toUpperCase()}:
${seasonalHint || "No specific seasonal data — use general knowledge of this activity and location."}

TIMELINE STRUCTURE:
${verticalConfig.timeline_logic}

WHAT TO BRING (baseline — adjust for weather and guest skill):
Guest brings: ${JSON.stringify(verticalConfig.what_to_bring_defaults)}
Guide provides: ${JSON.stringify(verticalConfig.what_to_bring_guide_provides)}

NOTES FROM GUIDE — SPECIFIC INSTRUCTIONS:
${verticalConfig.notes_from_guide_prompt}

${renames ? `SECTION LABELS TO USE:
${Object.entries(renames).map(([k, v]) => `- ${k} → "${v}"`).join("\n")}` : ""}

OTHER PACKAGES (for rebook suggestions):
${otherPkgList || "No other packages listed."}

Generate a complete itinerary as JSON matching this EXACT structure:
{
  "content": {
    "header": {
      "title": "Your [Duration] with ${guideName}",
      "date": "${booking.trip_date}",
      "location": "${location}",
      "vibe_statement": "One evocative sentence that sets the mood for this specific trip on this specific day"
    },
    "overview": {
      "description": "2-3 sentences. Use ${guestName}'s name. Reference their specific booking details.",
      "highlights": ["3-4 short phrases specific to THIS trip"]
    },
    "timeline": [
      { "time": "Specific time", "title": "Block title", "description": "1-2 vivid sentences" }
    ],
    "what_to_expect": {
      "effort_level": "Easy / Moderate / Challenging",
      "pace": "Specific pace description",
      "environment": "What the environment feels like"
    },
    "what_to_bring": ["Specific items adjusted for weather and skill level"],
    "notes_from_guide": "The most personal section. Written in the guide's voice. References conditions, the guest, and what makes today special. Must feel handwritten.",
    "add_ons": [],
    "after_experience": {
      "review_prompt": "Warm one-liner encouraging a review",
      "rebook_url": "https://romlife.co/guides/${guide?.slug || ""}"
    }
  },
  "guide_briefing": {
    "guest_summary": "Who they are, what they want, red flags, opportunities",
    "conditions": "Current conditions relevant to decisions",
    "approach": "Tactical plan, backup options, key decision points",
    "gear_checklist": ["What guide needs to prepare"],
    "red_flags": "Anything to watch for",
    "timeline": "Internal hour-by-hour operational plan"
  }
}

RULES:
- Use ${guestName}'s name at least 3 times across the itinerary
- Every line must be specific to THIS trip, THIS guest, THIS date, THIS location
- The notes_from_guide section must feel like the guide texted it last night — warm, direct, specific
- Timeline should have 4-6 blocks realistic for ${pkg?.duration || "a full day"}
- What to bring must account for the weather forecast
- If this is a repeat guest, reference their history naturally
- Never use generic filler — if you can't be specific, be vivid
- Return ONLY valid JSON, no markdown, no preamble`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      console.error("Failed to parse itinerary:", text.substring(0, 200));
      // Blank structure so guide can edit
      const bringDefaults = Array.isArray(verticalConfig.what_to_bring_defaults)
        ? verticalConfig.what_to_bring_defaults
        : (typeof verticalConfig.what_to_bring_defaults === "string"
          ? JSON.parse(verticalConfig.what_to_bring_defaults) : ["Comfortable clothing", "Water", "Sunscreen"]);
      parsed = {
        content: {
          header: { title: `Your Trip with ${guideName}`, date: booking.trip_date, location, vibe_statement: "" },
          overview: { description: "", highlights: [] },
          timeline: [{ time: "", title: "", description: "" }],
          what_to_expect: { effort_level: "", pace: "", environment: "" },
          what_to_bring: bringDefaults,
          notes_from_guide: "",
          add_ons: [],
          after_experience: { review_prompt: "", rebook_url: `https://romlife.co/guides/${guide?.slug || ""}` },
        },
        guide_briefing: { guest_summary: "", conditions: "", approach: "", gear_checklist: [], red_flags: "", timeline: "" },
      };
    }

    // Store section overrides with the itinerary for the guest page to use
    if (parsed.content) {
      parsed.content._section_overrides = sectionOverrides;
      parsed.content._conditions_label = verticalConfig.conditions_block_label;
    }

    // Upsert
    const { data: existing } = await supabase.from("itineraries").select("id").eq("booking_id", bookingId).maybeSingle();
    const itineraryData = {
      booking_id: bookingId,
      guide_id: booking.guide_id,
      guest_id: booking.guest_id,
      content: parsed.content,
      guide_version: parsed.guide_briefing,
      guest_version: parsed.content,
      status: "draft",
      generated_at: new Date().toISOString(),
      weather_data: weather,
    };

    if (existing) {
      await supabase.from("itineraries").update(itineraryData).eq("id", existing.id);
    } else {
      await supabase.from("itineraries").insert(itineraryData);
    }

    // Notify guide
    await supabase.from("guide_notifications").insert({
      guide_id: booking.guide_id,
      type: "itinerary_generated",
      title: `Itinerary ready — ${guestName}`,
      body: `${pkg?.title || "Trip"} on ${tripDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}. Review and publish when ready.`,
      metadata: { booking_id: bookingId },
    });

    return NextResponse.json({ success: true, content: parsed.content, guide_briefing: parsed.guide_briefing });
  } catch (err: any) {
    console.error("Itinerary generation error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
