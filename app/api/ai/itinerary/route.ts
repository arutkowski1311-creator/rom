import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Vertical-specific presets for AI prompt enrichment
const VERTICAL_PRESETS: Record<string, { timelineFlavor: string; defaultBring: string[] }> = {
  "Fly Fishing": { timelineFlavor: "Dawn launch, morning run, midday drift, afternoon hatch, evening wrap", defaultBring: ["Fishing license", "Polarized sunglasses", "Layered clothing", "Sunscreen", "Water bottle", "Snacks"] },
  "Fishing": { timelineFlavor: "Dawn launch, morning run, midday drift, afternoon session", defaultBring: ["Fishing license", "Sunglasses", "Layers", "Sunscreen", "Water bottle", "Snacks"] },
  "Hiking": { timelineFlavor: "Trailhead meet, ascent, summit/destination, descent, wrap-up", defaultBring: ["Hiking boots", "Layers", "2L water", "Trail snacks", "Trekking poles", "Rain jacket"] },
  "Rock Climbing": { timelineFlavor: "Base meet, gear check, warm-up route, main climb, cool-down", defaultBring: ["Climbing shoes", "Helmet", "Chalk bag", "Water", "Snacks", "Sunscreen"] },
  "Surfing": { timelineFlavor: "Beach meet, warm-up, paddle out, surf session, debrief", defaultBring: ["Swimsuit", "Towel", "Sunscreen", "Water", "Change of clothes", "Flip flops"] },
  "Diving": { timelineFlavor: "Dock meet, gear check, boat out, dive 1, surface interval, dive 2, return", defaultBring: ["Swimsuit", "Towel", "Certification card", "Sunscreen", "Dry bag", "Seasickness meds"] },
  "Kayaking": { timelineFlavor: "Launch point meet, safety brief, paddle out, exploration, return", defaultBring: ["Quick-dry clothing", "Water shoes", "Sunscreen", "Water bottle", "Dry bag", "Hat"] },
  "Hunting": { timelineFlavor: "Pre-dawn meet, scout, morning sit, midday break, afternoon stalk", defaultBring: ["License/tags", "Blaze orange", "Binoculars", "Layers", "Water", "Snacks"] },
  "default": { timelineFlavor: "Meet, preparation, main activity, break, wrap-up", defaultBring: ["Comfortable clothing", "Water bottle", "Sunscreen", "Snacks", "Camera"] },
};

async function fetchWeather(location: string, tripDate: string) {
  try {
    // Geocode location first (use Open-Meteo geocoding)
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`);
    const geoData = await geoRes.json();
    if (!geoData.results?.length) return null;

    const { latitude, longitude } = geoData.results[0];

    // Check if trip is within 7 days
    const tripDay = new Date(tripDate);
    const now = new Date();
    const daysUntil = Math.ceil((tripDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil > 7 || daysUntil < 0) return null;

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode&timezone=auto&start_date=${tripDate}&end_date=${tripDate}`
    );
    const data = await res.json();
    if (!data.daily) return null;

    const weatherCodes: Record<number, string> = {
      0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
      45: "Foggy", 51: "Light drizzle", 61: "Light rain", 63: "Moderate rain",
      65: "Heavy rain", 71: "Light snow", 73: "Moderate snow", 80: "Rain showers",
      95: "Thunderstorms",
    };

    return {
      high: Math.round(data.daily.temperature_2m_max[0]),
      low: Math.round(data.daily.temperature_2m_min[0]),
      precipitation: data.daily.precipitation_sum[0],
      windSpeed: Math.round(data.daily.windspeed_10m_max[0]),
      condition: weatherCodes[data.daily.weathercode[0]] || "Variable",
      latitude, longitude,
    };
  } catch (e) {
    console.error("Weather fetch error:", e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();
    if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    const { data: booking } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const { data: guide } = await supabase.from("guides").select("*").eq("id", booking.guide_id).single();
    const { data: pkg } = await supabase.from("packages").select("*").eq("id", booking.package_id).single();
    const { data: guestProfile } = await supabase.from("guest_profiles").select("*").eq("profile_id", booking.guest_id).eq("guide_id", booking.guide_id).maybeSingle();
    const { data: guestUser } = await supabase.from("profiles").select("full_name").eq("id", booking.guest_id).single();
    const { data: guideProfile } = await supabase.from("profiles").select("full_name").eq("id", guide?.profile_id).single();

    const guideName = guideProfile?.full_name || "Guide";
    const guestName = booking.guest_name || guestUser?.full_name || "Guest";
    const activity = guide?.categories?.[0] || "Adventure";
    const location = guide?.location || "";
    const voiceProfile = guide?.voice_profile;
    const vertical = VERTICAL_PRESETS[activity] || VERTICAL_PRESETS["default"];

    // Fetch weather
    const weather = await fetchWeather(location, booking.trip_date);

    const prompt = `You are generating a premium guest itinerary for RŌM, an adventure guide marketplace. This itinerary must feel handcrafted, personal, and beautiful — like a luxury travel document, not a confirmation email.

Generate a complete itinerary in JSON matching this EXACT structure:

{
  "header": {
    "title": "Your [Duration] with ${guideName}",
    "date": "${booking.trip_date}",
    "location": "${location}",
    "vibe_statement": "One evocative sentence setting the mood"
  },
  "overview": {
    "description": "2-3 sentences about what this experience is. Reference the guest by name. Make it specific to their trip.",
    "highlights": ["3-4 short highlight phrases"]
  },
  "timeline": [
    { "time": "e.g. 6:00 AM", "title": "Block title", "description": "1-2 sentences, vivid and specific" }
  ],
  "what_to_expect": {
    "effort_level": "Easy / Moderate / Challenging",
    "pace": "Description of the pace",
    "environment": "Description of the environment"
  },
  "what_to_bring": ["Specific items for this activity and conditions"],
  "notes_from_guide": "A personal note from the guide to this specific guest. Reference their booking details. This must feel handwritten — warm, direct, not corporate. 3-4 sentences.",
  "add_ons": [],
  "after_experience": {
    "review_prompt": "A warm one-liner encouraging a review",
    "rebook_url": "https://romlife.co/guides/${guide?.slug || ''}"
  }
}

ALSO generate a guide_briefing object for the guide's internal use:
{
  "guide_briefing": {
    "guest_summary": "Who they are, what they want, skill level",
    "conditions": "Current conditions note",
    "approach": "Recommended approach, techniques, backup plans",
    "gear_checklist": ["Items guide needs to prepare"],
    "red_flags": "Any concerns or things to watch for",
    "timeline": "Hour-by-hour internal plan"
  }
}

Return both as: { "content": {...itinerary}, "guide_briefing": {...} }

Booking data:
- Guest: ${guestName}
- Guide: ${guideName}
- Activity: ${activity}
- Package: ${pkg?.title || booking.package_title || "Trip"}
- Duration: ${pkg?.duration || "Full day"}
- Date: ${new Date(booking.trip_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
- Group size: ${booking.guests || 1} people
- Special requests: ${booking.special_requests || booking.guest_message || "None"}
${guestProfile?.experience_level ? `- Skill level: ${guestProfile.experience_level}` : "- Skill level: Not specified"}
${guestProfile?.total_trips ? `- Previous trips with this guide: ${guestProfile.total_trips}` : "- First-time guest"}
${guestProfile?.notes ? `- Guide notes about guest: ${guestProfile.notes}` : ""}
${weather ? `- Weather forecast: ${weather.condition}, High ${weather.high}°F / Low ${weather.low}°F, Wind ${weather.windSpeed}mph${weather.precipitation > 0 ? `, ${weather.precipitation}mm precipitation` : ""}` : "- Weather: Not available yet"}

Vertical hints:
- Timeline flavor: ${vertical.timelineFlavor}
- Default what-to-bring: ${vertical.defaultBring.join(", ")}

${voiceProfile ? `Guide's voice: Tone: ${typeof voiceProfile === "object" ? voiceProfile.tone : ""}, Style: ${typeof voiceProfile === "object" ? voiceProfile.personality_markers : ""}` : ""}

Rules:
- Use ${guestName}'s name naturally in the text (at least 2-3 times)
- Tone: warm, expert, personal — not corporate
- What to bring must be specific to activity AND weather conditions
- Notes from guide must feel genuinely handwritten
- Timeline should have 4-6 realistic blocks for ${pkg?.duration || "a full day"}
- Never use generic filler — every line should feel intentional
- Return ONLY valid JSON, no markdown, no preamble`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (e) {
      console.error("Failed to parse itinerary:", text);
      // Create blank structure so guide can edit manually
      parsed = {
        content: {
          header: { title: `Your Trip with ${guideName}`, date: booking.trip_date, location, vibe_statement: "" },
          overview: { description: "", highlights: [] },
          timeline: [{ time: "", title: "", description: "" }],
          what_to_expect: { effort_level: "", pace: "", environment: "" },
          what_to_bring: vertical.defaultBring,
          notes_from_guide: "",
          add_ons: [],
          after_experience: { review_prompt: "", rebook_url: `https://romlife.co/guides/${guide?.slug || ""}` },
        },
        guide_briefing: { guest_summary: "", conditions: "", approach: "", gear_checklist: [], red_flags: "", timeline: "" },
      };
    }

    // Upsert
    const { data: existing } = await supabase.from("itineraries").select("id").eq("booking_id", bookingId).maybeSingle();

    const itineraryData = {
      booking_id: bookingId,
      guide_id: booking.guide_id,
      guest_id: booking.guest_id,
      content: parsed.content,
      guide_version: parsed.guide_briefing || parsed.guide_version,
      guest_version: parsed.content, // Keep backward compat
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
      body: `${pkg?.title || "Trip"} on ${new Date(booking.trip_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}. Review and publish when ready.`,
      metadata: { booking_id: bookingId },
    });

    return NextResponse.json({ success: true, content: parsed.content, guide_briefing: parsed.guide_briefing });
  } catch (err: any) {
    console.error("Itinerary generation error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
