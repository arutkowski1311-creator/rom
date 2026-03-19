import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const {
      destination,
      activityTypes,
      dateStart,
      dateEnd,
      groupSize,
      experienceLevel,
      budgetRange,
      specialRequests,
      guestId,
    } = await req.json();

    if (!destination || !activityTypes?.length) {
      return NextResponse.json(
        { error: "destination and activityTypes required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Find matching guides on ROM
    let guideQuery = supabase
      .from("guides")
      .select("id, slug, location, categories, tagline, rating, review_count, bio, profile_id")
      .eq("status", "active");

    // Filter by categories that overlap with requested activity types
    for (const activity of activityTypes) {
      guideQuery = guideQuery.contains("categories", [activity]);
    }

    const { data: matchingGuides } = await guideQuery.order("rating", { ascending: false }).limit(5);

    // Get guide names and packages
    const guidesWithDetails = [];
    for (const guide of (matchingGuides || [])) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", guide.profile_id)
        .single();

      const { data: packages } = await supabase
        .from("packages")
        .select("title, duration, price, price_type, description")
        .eq("guide_id", guide.id)
        .eq("active", true)
        .order("price", { ascending: true });

      guidesWithDetails.push({
        ...guide,
        name: profile?.full_name || "Guide",
        packages: packages || [],
      });
    }

    // Calculate trip duration
    const start = dateStart ? new Date(dateStart) : null;
    const end = dateEnd ? new Date(dateEnd) : null;
    const tripDays = start && end ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 3;

    const systemPrompt = `You are a premium trip concierge for RŌM, an adventure guide marketplace. You create detailed, personalized trip itineraries that feel curated by a local expert — not a generic travel site. Your recommendations should be specific, opinionated, and practical.

You MUST return valid JSON matching this exact schema:
{
  "title": "Trip title (e.g., 'Three Days on Montana's Blue Ribbon Waters')",
  "summary": "2-3 sentence overview of the trip",
  "guide": {
    "id": "guide UUID from the matches",
    "name": "Guide name",
    "slug": "guide slug for profile link",
    "reason": "Why this guide is the best match (1-2 sentences)"
  },
  "days": [
    {
      "dayNumber": 1,
      "title": "Day title",
      "activities": [
        { "time": "Morning", "name": "Activity name", "description": "1-2 sentences", "type": "guided|dining|lodging|transport|free" }
      ]
    }
  ],
  "lodging": [
    { "name": "Place name", "type": "hotel|cabin|lodge|camping", "priceRange": "$|$$|$$$|$$$$", "reason": "Why this option (1 sentence)" }
  ],
  "gear": ["Item 1", "Item 2"],
  "transportation": "How to get there and get around (2-3 sentences)",
  "localTips": ["Tip 1", "Tip 2", "Tip 3"],
  "estimatedBudget": {
    "guideServices": "$X - $X",
    "lodging": "$X - $X per night",
    "meals": "$X - $X per day",
    "total": "$X - $X"
  }
}`;

    const userPrompt = `Plan a ${tripDays}-day trip to ${destination} for ${groupSize || 2} ${experienceLevel || "intermediate"}-level guests.

Activities: ${activityTypes.join(", ")}
${dateStart ? `Dates: ${dateStart} to ${dateEnd}` : ""}
Budget: ${budgetRange || "moderate"}
${specialRequests ? `Special requests: ${specialRequests}` : ""}

Available ROM guides in this area:
${guidesWithDetails.map((g, i) => `${i + 1}. ${g.name} (${g.location}) — ${g.tagline}
   Rating: ${g.rating}/5 (${g.review_count} reviews)
   Packages: ${g.packages.map((p: any) => `${p.title} ($${p.price}/${p.price_type})`).join(", ")}
`).join("\n")}

${guidesWithDetails.length === 0 ? "No guides currently listed in this exact area — recommend the trip anyway and note that guides are coming soon to this destination." : "Pick the best-matched guide and build the trip around their packages."}

Include specific lodging, dining, and activity recommendations for the area. Be opinionated — recommend the best options, not every option.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    let itinerary;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      itinerary = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      itinerary = null;
    }

    if (!itinerary) {
      return NextResponse.json(
        { error: "Failed to generate itinerary", raw: text },
        { status: 500 }
      );
    }

    // Save trip plan to DB
    const { data: tripPlan } = await supabase
      .from("trip_plans")
      .insert({
        guest_id: guestId || null,
        destination,
        activity_types: activityTypes,
        date_start: dateStart || null,
        date_end: dateEnd || null,
        group_size: groupSize || 2,
        experience_level: experienceLevel || "intermediate",
        budget_range: budgetRange || "moderate",
        special_requests: specialRequests || null,
        itinerary,
        matched_guide_id: itinerary.guide?.id || null,
        status: "complete",
      })
      .select()
      .single();

    return NextResponse.json({
      tripPlanId: tripPlan?.id,
      itinerary,
    });
  } catch (err: any) {
    console.error("Concierge error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to plan trip" },
      { status: 500 }
    );
  }
}
