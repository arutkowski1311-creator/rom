import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 45;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getAuthUser(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: req.headers.get("authorization") || "" } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// POST — Generate content intelligence opportunities for a guide
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { guideId } = await req.json();
    const supabase = getSupabaseAdmin();

    const { data: guide } = await supabase
      .from("guides")
      .select("id, profile_id, categories, location, tagline, bio, voice_profile, featured_locations")
      .eq("id", guideId)
      .single();

    if (!guide || guide.profile_id !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Gather context
    const now = new Date();
    const month = now.toLocaleString("en-US", { month: "long" });
    const activity = guide.categories?.[0] || "outdoor adventure";

    // Get vertical config for seasonal intelligence
    const categoryMap: Record<string, string> = { "Fly Fishing": "fly_fishing", "Hiking": "hiking", "Rock Climbing": "rock_climbing", "Hunting": "hunting", "Surfing": "surfing", "Diving": "diving", "Kayaking": "kayaking", "Sailing": "sailing", "Camping": "camping" };
    const verticalSlug = categoryMap[activity] || activity.toLowerCase().replace(/[^a-z_]/g, "_");
    const { data: verticalConfig } = await supabase
      .from("vertical_configs")
      .select("seasonal_intelligence, prompt_personality")
      .eq("vertical", verticalSlug)
      .maybeSingle();

    const seasonalHint = verticalConfig?.seasonal_intelligence?.[month.toLowerCase()] || "";

    // Get recent reviews for highlight opportunities
    const { data: recentReviews } = await supabase
      .from("reviews")
      .select("id, rating, body, trip_label, created_at")
      .eq("guide_id", guideId)
      .gte("rating", 4)
      .order("created_at", { ascending: false })
      .limit(5);

    // Get recent bookings for demand signals
    const { data: recentBookings } = await supabase
      .from("bookings")
      .select("package_title, trip_date, guests")
      .eq("guide_id", guideId)
      .gte("created_at", new Date(now.getTime() - 30 * 86400000).toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system: `You are a content strategist for outdoor/adventure guide businesses. Generate content opportunity intelligence based on the guide's location, activity type, season, and business data. Return actionable, specific opportunities.

Return valid JSON array of 6-10 opportunities:
[{
  "category": "seasonal" | "local_event" | "news" | "law_change" | "weather" | "trend" | "review_highlight" | "educational" | "behind_scenes",
  "title": "Short attention-grabbing title",
  "summary": "2-3 sentences explaining the opportunity and why it matters now",
  "suggested_angle": "Specific content angle the guide should take",
  "suggested_types": ["instagram", "reel", "blog", "carousel", "story", "email"],
  "relevance_score": 0.5-1.0,
  "expires_days": number (how many days this is relevant, 7-90)
}]`,
      messages: [{
        role: "user",
        content: `Generate content intelligence for this guide:

Guide: ${activity} guide in ${guide.location}
Bio: ${guide.bio || guide.tagline || ""}
Featured locations: ${guide.featured_locations || ""}
Current month: ${month} ${now.getFullYear()}
Seasonal context: ${seasonalHint}

Recent high-rated reviews (potential spotlight content):
${(recentReviews || []).map((r: any) => `- ${r.rating}/5: "${r.body?.slice(0, 150)}..." (${r.trip_label})`).join("\n") || "None yet"}

Recent booking activity (demand signals):
${(recentBookings || []).map((b: any) => `- ${b.package_title}: ${b.guests} guests on ${b.trip_date}`).join("\n") || "Low recent activity"}

Think about:
1. What's happening in ${guide.location} right now? Seasonal changes, weather patterns, wildlife activity.
2. Any regulations, license requirements, or safety advisories for ${activity}?
3. Educational content opportunities (how-to, gear guides, technique tips).
4. Behind-the-scenes content (day in the life, prep routines, local knowledge).
5. Trending topics in the ${activity} community.
6. Local events, festivals, or seasonal happenings near ${guide.location}.
7. High-performing review quotes that deserve their own post.
8. Booking momentum — if busy, create urgency content. If slow, create awareness content.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    let opportunities: any[];
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      opportunities = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      opportunities = [];
    }

    // Save to database
    const saved = [];
    for (const opp of opportunities) {
      const { data: record } = await supabase
        .from("content_intelligence")
        .insert({
          guide_id: guideId,
          category: opp.category || "trend",
          title: opp.title,
          summary: opp.summary,
          suggested_angle: opp.suggested_angle,
          suggested_types: opp.suggested_types || ["instagram"],
          relevance_score: opp.relevance_score || 0.5,
          status: "new",
          expires_at: new Date(now.getTime() + (opp.expires_days || 30) * 86400000).toISOString(),
        })
        .select()
        .single();

      if (record) saved.push(record);
    }

    return NextResponse.json({ opportunities: saved });
  } catch (err: any) {
    console.error("Content intelligence error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

// GET — Fetch active intelligence for a guide
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const guideId = searchParams.get("guideId");
    if (!guideId) return NextResponse.json({ error: "guideId required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("content_intelligence")
      .select("*")
      .eq("guide_id", guideId)
      .eq("status", "new")
      .gte("expires_at", new Date().toISOString())
      .order("relevance_score", { ascending: false });

    return NextResponse.json({ opportunities: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
