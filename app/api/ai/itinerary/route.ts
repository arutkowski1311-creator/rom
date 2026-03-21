import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Fetch booking with related data
    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Fetch guide
    const { data: guide } = await supabase
      .from("guides")
      .select("*, profiles!guides_profile_id_fkey(full_name, email)")
      .eq("id", booking.guide_id)
      .single();

    // Fetch package
    const { data: pkg } = await supabase
      .from("packages")
      .select("*")
      .eq("id", booking.package_id)
      .single();

    // Fetch guest profile if exists
    const { data: guestProfile } = await supabase
      .from("guest_profiles")
      .select("*")
      .eq("profile_id", booking.guest_id)
      .eq("guide_id", booking.guide_id)
      .single();

    // Fetch guest name from profiles
    const { data: guestUser } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", booking.guest_id)
      .single();

    const guideName = guide?.profiles?.full_name || "Guide";
    const guestName = booking.guest_name || guestUser?.full_name || "Guest";
    const voiceProfile = guide?.voice_profile;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system: `You generate trip itineraries for RŌM, a premium adventure guide marketplace. You create TWO versions for each booking:

1. GUIDE VERSION (internal briefing) — direct, actionable, no fluff:
   - guest_summary: Who they are, experience level, what they want
   - conditions_note: Current conditions relevant to this trip
   - recommended_approach: Techniques, locations, backup plans
   - gear_checklist: Specific gear for this trip + conditions
   - red_flags: Anything from guest profile to be aware of
   - timeline: Hour-by-hour plan

2. GUEST VERSION (sent to guest 48hrs before) — warm, exciting, in the guide's voice:
   - welcome_message: Personal welcome from the guide
   - what_to_expect: Timeline of the day, written to build anticipation
   - what_to_bring: Gear/clothing list
   - meeting_point: Where and when to meet, parking, landmarks
   - conditions_note: What's happening in the area right now
   - anticipation_builder: What they might see/catch/experience

${voiceProfile ? `GUIDE'S VOICE PROFILE: Tone: ${voiceProfile.tone}. Style: ${voiceProfile.personality_markers}` : ""}

Return ONLY valid JSON with keys: { "guide_version": {...}, "guest_version": {...} }`,
      messages: [{
        role: "user",
        content: `Generate itinerary for this booking:

Guide: ${guideName} (${guide?.location || "—"})
Specialties: ${(guide?.categories || []).join(", ")}
${guide?.tagline ? `Tagline: ${guide.tagline}` : ""}

Package: ${pkg?.title || booking.package_title || "Trip"}
Duration: ${pkg?.duration || "Full day"}
Price: $${pkg?.price || booking.total_price || 0}

Guest: ${guestName}
Party size: ${booking.guests || 1}
Trip date: ${booking.trip_date}
${booking.message ? `Guest message: "${booking.message}"` : ""}
${guestProfile?.experience_level ? `Experience level: ${guestProfile.experience_level}` : ""}
${guestProfile?.total_trips ? `Previous trips with this guide: ${guestProfile.total_trips}` : "First-time guest"}
${guestProfile?.notes ? `Guide notes: ${guestProfile.notes}` : ""}

Generate both versions. Return only the JSON object.`,
      }],
    });

    // Parse response
    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (e) {
      console.error("Failed to parse itinerary response:", responseText);
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    // Upsert itinerary
    const { data: existing } = await supabase
      .from("itineraries")
      .select("id")
      .eq("booking_id", bookingId)
      .single();

    if (existing) {
      await supabase
        .from("itineraries")
        .update({
          guide_version: parsed.guide_version,
          guest_version: parsed.guest_version,
          generated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("itineraries").insert({
        booking_id: bookingId,
        guide_id: booking.guide_id,
        guide_version: parsed.guide_version,
        guest_version: parsed.guest_version,
        generated_at: new Date().toISOString(),
      });
    }

    // Notify guide
    await supabase.from("guide_notifications").insert({
      guide_id: booking.guide_id,
      type: "itinerary_generated",
      title: `Trip plan ready — ${guestName}`,
      body: `${pkg?.title || "Trip"} on ${new Date(booking.trip_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}. Review the briefing in your bookings.`,
      metadata: { booking_id: bookingId },
    });

    return NextResponse.json({
      success: true,
      guide_version: parsed.guide_version,
      guest_version: parsed.guest_version,
    });
  } catch (err: any) {
    console.error("Itinerary generation error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
