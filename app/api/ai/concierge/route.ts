import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

export const maxDuration = 60;

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

    // Find partner lodging near the destination
    const { data: partnerLodging } = await supabase
      .from("partner_lodging")
      .select("name, location, type, description, price_per_night, max_guests, amenities, booking_url, photo_url")
      .eq("active", true)
      .ilike("location", `%${destination.split(",")[0].trim()}%`);

    // Find curated RŌM properties near the destination
    const { data: romProperties } = await supabase
      .from("properties")
      .select("slug, name, tagline, location, description, price_per_night, max_guests, bedrooms, bathrooms, amenities, positioning_tags, photos")
      .eq("active", true)
      .ilike("location", `%${destination.split(",")[0].trim()}%`);

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
3. Partner Lodging — if ROM partner properties are provided, prioritize them over generic suggestions. These are verified properties from our network.
4. Lodging — minimum 4.5 star. Rank by proximity to main activity, budget fit, preference match. Always include an Airbnb option.
5. Dining — rank by review score, proximity, cuisine match, price fit. Include OpenTable/Resy links where applicable.
6. Local Events — research and include local events happening during the trip dates: festivals, concerts, farmers markets, seasonal events, sporting events, fairs. These add authentic local flair. If specific dates are provided, tailor event recommendations to those exact dates.
7. Local Activities — things to do near destination on trip dates with booking links.
8. Transportation — single recommendation based on destination type and preference.

QUALITY STANDARDS:
- Only recommend places you would confidently tell a friend about. Prioritize places with strong reputations, local favorites, and high review scores. Never suggest generic chains unless they are genuinely the best option in the area.
- For dining: recommend specific dishes when you know them. Mention what the restaurant is known for. In the "reason" field, cite WHY it's good — e.g., "James Beard semifinalist", "consistently rated best pizza in the Adirondacks", "locals' go-to since 1987", "featured in Bon Appétit". Be specific.
- For lodging: mention specific room types, views, or features when relevant. In the "reason" field, cite reputation — e.g., "top-rated on TripAdvisor for the region", "historic property since 1882", "only lakefront lodge in town".
- For activities/outfitters: prioritize established operators with strong safety records and reputations. Mention years in business, certifications, or notable recognition when you know them.
- Research quality matters — specific, real recommendations that locals would endorse over tourist-trap generic suggestions. If you are not confident a place is genuinely good, do not include it.

ACCURACY — DO NOT FABRICATE:
- NEVER invent fees, surcharges, or costs that you are not confident exist (e.g., do not make up "check-in fees", "resort fees", "booking fees" unless you know the property charges them).
- If you are unsure of an exact price, say "approximately $X" or give a range. Do not state a specific price as fact unless you are confident.
- Do not invent phone numbers, addresses, or URLs. If you don't have a real link, use null.

BOOKING & RESERVATION LINKS — CRITICAL:
- For EVERY restaurant, provide a reservationLink. Use the format: "https://www.google.com/maps/search/{restaurant+name}+{city}" as a minimum fallback if you don't have an OpenTable/Resy link.
- For lodging, provide booking links. Use "https://www.google.com/maps/search/{property+name}+{city}" as fallback.
- For activities with ticket purchases, provide the actual booking URL or a Google search link.
- NEVER return null for reservationLink on dining — always provide at least a Google Maps search link.

REALISTIC TIMING — THIS IS CRITICAL:
People are on vacation, not executing a military operation. Every itinerary must be comfortably achievable by real humans who need to eat, shower, drive, park, and breathe.

Time budgets you MUST build into the schedule:
- Drive time: Use REAL drive times for the specific area. Consider traffic patterns — LA/metro areas have significant traffic, rural mountain roads are slower than GPS estimates. Add 15 min buffer for parking, finding locations, etc.
- Transition between activities: Minimum 30 minutes between any two scheduled items. If they require a change of clothes or gear (e.g., coming off a river before dinner), add 45-60 minutes.
- Meals: Breakfast 30-45 min, lunch 45-60 min, dinner 75-90 min. Do NOT schedule activities that cut into meal times.
- Guided experiences: Add 15-30 min before (meeting, gear check, briefing) and 15 min after (debrief, photos, tips)

Geographic grouping:
- Group morning activities near each other. Do NOT zigzag across a region.
- If two activities are 45+ min apart, they belong in different half-days.
- Always include approximate drive times between locations when they exceed 20 minutes.
- In urban areas (LA, NYC, etc.) account for real traffic — a 10-mile drive can be 45+ min at peak times.

Pacing rules:
- Maximum ONE physically demanding activity per day (hiking, climbing, long fishing day). Pair it with something relaxed.
- Day 1 of a multi-day trip should be lighter — people just traveled. Build up intensity.
- Last day should have a relaxed morning — people need to pack and check out.
- If someone books a full-day guided experience (8+ hours), that IS the day. Do not add more activities around it.
- Include "free time" or "explore on your own" windows when the traveler's schedule feels packed. A good trip breathes.

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
  "events": [
    { "name": "Event name", "date": "Date or date range", "description": "1-2 sentences about the event", "ticketLink": "URL or null", "cost": "$X or Free" }
  ],
  "flights": { "recommendation": "Flight recommendation or null if no origin", "estimatedCost": "$X", "bookingLink": "URL or null" },
  "lodging": [
    { "name": "Place name", "type": "hotel|cabin|lodge|airbnb|camping", "pricePerNight": "$X", "totalEstimate": "$X", "reason": "Why (1 sentence)", "bookingLink": "URL or null", "isPartner": false }
  ],
  "dining": [
    { "name": "Restaurant name", "meal": "breakfast|lunch|dinner", "cuisine": "Type", "priceRange": "$|$$|$$$", "reason": "Why (1 sentence)", "mustTry": "Specific dish recommendation", "reservationLink": "URL or null" }
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

${(romProperties && romProperties.length > 0) ? `RŌM Curated Properties (TOP PRIORITY — book directly on RŌM, premium vetted homes):
${romProperties.map((p: any, i: number) => `${i + 1}. ${p.name} (${p.location})${p.tagline ? ` — ${p.tagline}` : ""}
   ${p.description ? p.description.slice(0, 200) : ""}
   $${p.price_per_night}/night · ${p.bedrooms || "?"} bed · ${p.bathrooms || "?"} bath · Max ${p.max_guests} guests
   ${p.positioning_tags?.length ? `Tags: ${p.positioning_tags.join(", ")}` : ""}
   ${p.amenities?.length ? `Amenities: ${p.amenities.slice(0, 6).join(", ")}` : ""}
   Book at: romlife.co/properties/${p.slug}
`).join("\n")}
Mark RŌM properties with "isPartner": true and "romProperty": true in the lodging array.` : ""}
${(partnerLodging && partnerLodging.length > 0) ? `ROM Partner Properties (PRIORITIZE these over generic lodging):
${partnerLodging.map((p: any, i: number) => `${i + 1}. ${p.name} (${p.location}) — ${p.type}
   ${p.description || ""}
   $${p.price_per_night}/night · Max ${p.max_guests} guests
   ${p.amenities?.length ? `Amenities: ${p.amenities.join(", ")}` : ""}
   Book: ${p.booking_url}
`).join("\n")}
Mark partner lodging with "isPartner": true in the lodging array.` : ""}

Include specific lodging, dining, and activity recommendations for the area. Be opinionated — recommend the best options, not every option. Include real restaurant names, real lodging properties, and real activity providers where possible.

${dateStart ? `IMPORTANT: Research and include local events happening between ${dateStart} and ${dateEnd} in the ${destination} area. Festivals, concerts, farmers markets, seasonal celebrations, sporting events — anything that adds authentic local flair to the trip.` : "Include any notable recurring events, seasonal happenings, or local traditions in the area."}`;

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

    // Notify matched guide
    if (itinerary.guide?.id && tripPlan?.id) {
      const matchedGuide = guidesWithDetails.find((g: any) => g.id === itinerary.guide.id);
      if (matchedGuide) {
        await supabase.from("guide_notifications").insert({
          guide_id: matchedGuide.id,
          type: "trip_match",
          title: `New trip match — ${destination}`,
          body: `${totalParty} guest${totalParty > 1 ? "s" : ""} looking for ${activityStr} in ${destination}${dateStart ? ` (${dateStart} to ${dateEnd})` : ""}.`,
          metadata: {
            trip_plan_id: tripPlan.id,
            destination,
            activity_types: searchActivities.length > 0 ? searchActivities : [activityStr],
            group_size: totalParty,
            date_start: dateStart || null,
            date_end: dateEnd || null,
          },
        }).then(() => {}).catch(() => {}); // Non-blocking, don't fail the request
      }
    }

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
