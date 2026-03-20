import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mode = "standard", // "standard" | "surprise"
      destination,
      dateStart,
      dateEnd,
      adults = 2,
      children = 0,
      tripVibe = [],
      mainActivity,
      activityTypes = [], // backward compat
      totalBudget,
      budgetAllocation,
      flightOrigin,
      lodgingPreference,
      cuisinePreferences = [],
      transportPreference,
      specialRequests,
      guestId,
      // legacy fields
      groupSize,
      experienceLevel,
      budgetRange,
    } = body;

    if (!destination) {
      return NextResponse.json({ error: "destination required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Resolve activity for guide matching
    const searchActivities = mainActivity
      ? [mainActivity, ...(activityTypes || [])]
      : activityTypes?.length
        ? activityTypes
        : [];

    // Find matching guides on ROM
    let guideQuery = supabase
      .from("guides")
      .select("id, slug, location, categories, tagline, rating, review_count, bio, profile_id")
      .eq("status", "active");

    if (searchActivities.length > 0) {
      for (const activity of searchActivities.slice(0, 3)) {
        guideQuery = guideQuery.contains("categories", [activity]);
      }
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

    // Resolve party size
    const partyAdults = adults || groupSize || 2;
    const partyChildren = children || 0;
    const totalParty = partyAdults + partyChildren;

    // Build budget context
    let budgetContext = "";
    if (totalBudget && budgetAllocation) {
      budgetContext = `Total budget: $${totalBudget}
Budget allocation:
${Object.entries(budgetAllocation).map(([k, v]) => `  - ${k}: $${v}`).join("\n")}`;
    } else if (totalBudget) {
      budgetContext = `Total budget: $${totalBudget}`;
    } else if (budgetRange) {
      budgetContext = `Budget level: ${budgetRange}`;
    }

    const isSurprise = mode === "surprise";

    const systemPrompt = `You are a premium trip concierge for RŌM, an adventure guide marketplace. You create detailed, personalized trip itineraries that feel curated by a local expert — not a generic travel site. Your recommendations should be specific, opinionated, and practical.

${isSurprise ? "The guest chose SURPRISE ME mode. Make every decision for them — be confident and opinionated. One recommendation per category, no options. Surprise and delight." : ""}

PROCESSING PRIORITY ORDER:
1. Rōm Guides — always surface matching ROM guides first. If none match, note the gap.
2. Flights — only if flight origin is provided. Rank by price fit, rating, schedule.
3. Lodging — minimum 4.5 star. Rank by proximity to main activity, budget fit, preference match.
4. Dining — rank by review score, proximity, cuisine match, price fit. Include OpenTable/Resy links where applicable.
5. Local Activities — things to do near destination on trip dates with booking links.
6. Transportation — single recommendation based on destination type and preference.

You MUST return valid JSON matching this exact schema:
{
  "title": "Trip title (e.g., 'Three Days on Montana Blue Ribbon Waters')",
  "summary": "2-3 sentence overview of the trip",
  "guide": {
    "id": "guide UUID from the matches (or null)",
    "name": "Guide name",
    "slug": "guide slug for profile link",
    "reason": "Why this guide is the best match (1-2 sentences)"
  },
  "days": [
    {
      "dayNumber": 1,
      "title": "Day title",
      "morning": { "name": "Activity name", "description": "1-2 sentences", "estimatedCost": "$X", "bookingLink": "URL or null" },
      "afternoon": { "name": "Activity name", "description": "1-2 sentences", "estimatedCost": "$X", "bookingLink": "URL or null" },
      "evening": { "name": "Activity name", "description": "1-2 sentences", "estimatedCost": "$X", "bookingLink": "URL or null" }
    }
  ],
  "flights": { "recommendation": "Flight recommendation or null if no origin", "estimatedCost": "$X", "bookingLink": "URL or null" },
  "lodging": [
    { "name": "Place name", "type": "hotel|cabin|lodge|airbnb|camping", "pricePerNight": "$X", "totalEstimate": "$X", "reason": "Why (1 sentence)", "bookingLink": "URL or null" }
  ],
  "dining": [
    { "name": "Restaurant name", "meal": "breakfast|lunch|dinner", "cuisine": "Type", "priceRange": "$|$$|$$$", "reason": "Why (1 sentence)", "reservationLink": "URL or null" }
  ],
  "activities": [
    { "name": "Activity name", "description": "1-2 sentences", "cost": "$X", "bookingLink": "URL or null" }
  ],
  "transportation": { "recommendation": "How to get around (2-3 sentences)", "estimatedCost": "$X" },
  "gear": ["Item 1", "Item 2"],
  "localTips": ["Tip 1", "Tip 2", "Tip 3"],
  "budgetSummary": {
    "flights": "$X",
    "lodging": "$X",
    "dining": "$X",
    "guide": "$X",
    "activities": "$X",
    "transportation": "$X",
    "total": "$X",
    "overBudget": false
  }
}`;

    const vibeStr = tripVibe.length > 0 ? `Trip vibe: ${tripVibe.join(", ")}` : "";
    const activityStr = mainActivity || (searchActivities.length > 0 ? searchActivities.join(", ") : "general adventure");
    const cuisineStr = cuisinePreferences.length > 0 ? `Cuisine preferences: ${cuisinePreferences.join(", ")}` : "";

    const userPrompt = `Plan a ${tripDays}-day trip to ${destination} for ${partyAdults} adult${partyAdults > 1 ? "s" : ""}${partyChildren > 0 ? ` and ${partyChildren} child${partyChildren > 1 ? "ren" : ""}` : ""}.

Main activity: ${activityStr}
${vibeStr}
${dateStart ? `Dates: ${dateStart} to ${dateEnd}` : "Dates: flexible"}
${budgetContext}
${flightOrigin ? `Flying from: ${flightOrigin}` : "No flights needed — driving or already local."}
${lodgingPreference ? `Lodging preference: ${lodgingPreference}` : ""}
${cuisineStr}
${transportPreference ? `Transportation preference: ${transportPreference}` : ""}
${experienceLevel ? `Experience level: ${experienceLevel}` : ""}
${specialRequests ? `Special requests: ${specialRequests}` : ""}

Available ROM guides in this area:
${guidesWithDetails.length > 0 ? guidesWithDetails.map((g, i) => `${i + 1}. ${g.name} (${g.location}) — ${g.tagline}
   Rating: ${g.rating}/5 (${g.review_count} reviews)
   Packages: ${g.packages.map((p: any) => `${p.title} ($${p.price}/${p.price_type})`).join(", ")}
`).join("\n") : "No guides currently listed in this exact area — recommend the trip anyway and note that guides are coming soon to this destination."}

${guidesWithDetails.length > 0 ? "Pick the best-matched guide and build the trip around their packages." : ""}

Include specific lodging, dining, and activity recommendations for the area. Be opinionated — recommend the best options, not every option. Include real restaurant names, real lodging properties, and real activity providers where possible.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
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
        activity_types: searchActivities.length > 0 ? searchActivities : [activityStr],
        date_start: dateStart || null,
        date_end: dateEnd || null,
        group_size: totalParty,
        experience_level: experienceLevel || "intermediate",
        budget_range: totalBudget ? `$${totalBudget}` : (budgetRange || "moderate"),
        special_requests: specialRequests || null,
        itinerary,
        matched_guide_id: itinerary.guide?.id || null,
        status: "complete",
      })
      .select()
      .single();

    return NextResponse.json({
      tripPlanId: tripPlan?.id,
      shareToken: tripPlan?.share_token || null,
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
