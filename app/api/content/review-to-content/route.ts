import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

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

// POST — Turn a review into content
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { reviewId, guideId, contentType, goal } = await req.json();
    if (!reviewId || !guideId || !contentType) {
      return NextResponse.json({ error: "reviewId, guideId, contentType required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Fetch review
    const { data: review } = await supabase
      .from("reviews")
      .select("rating, body, trip_label, created_at")
      .eq("id", reviewId)
      .single();

    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

    // Fetch guide data
    const { data: guide } = await supabase
      .from("guides")
      .select("categories, location, tagline, voice_profile, slug")
      .eq("id", guideId)
      .single();

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", guide?.profile_id || user.id)
      .single();

    const guideName = profile?.full_name || "Guide";
    const activity = guide?.categories?.[0] || "adventure";

    const typePrompts: Record<string, string> = {
      post: `Create 2 Instagram post options featuring this review. Each: headline (max 6 words), caption (2-3 sentences + CTA), 12 hashtags. Format the guest quote prominently.`,
      carousel: `Create 2 Instagram carousel options (4-5 slides each). Slide 1: hook quote. Slides 2-3: expand on the experience. Last slide: CTA to book. Each slide has a headline and body text.`,
      reel: `Create 2 reel script options (15-30s) built around this review. Include: hook (0-2s using the best quote), visual shots, text overlays, and CTA.`,
      blog: `Create 2 blog post options inspired by this review. Each: title, meta description (155 chars), 3-4 section outline with headers and key points. 500-800 words when written out.`,
      story: `Create 2 Instagram story sequence options (3-5 frames each). Frame 1: attention-grabbing quote. Middle frames: context/details. Final frame: CTA with link.`,
    };

    const goalContext = goal === "booking_gen" ? "Focus on driving bookings with strong CTAs and urgency."
      : goal === "lead_gen" ? "Focus on capturing interest and encouraging contact/follow."
      : goal === "education" ? "Focus on teaching something valuable about the experience."
      : "Focus on building brand awareness and trust through authentic storytelling.";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system: `You create social media content for outdoor guides from real guest reviews. Match the guide's voice: ${JSON.stringify(guide?.voice_profile || {})}. ${goalContext}

Return valid JSON: { "options": [{ "title": "...", "content": "...", "hashtags": [...], "slides": [...] (if carousel/story), "shots": [...] (if reel), "sections": [...] (if blog) }] }`,
      messages: [{
        role: "user",
        content: `${typePrompts[contentType] || typePrompts.post}

Guide: ${guideName}, ${activity} in ${guide?.location}
Review (${review.rating}/5): "${review.body}"
Trip: ${review.trip_label}
Guide URL: romlife.co/guides/${guide?.slug}`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    let parsed: any;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { options: [] };
    } catch {
      parsed = { options: [] };
    }

    return NextResponse.json({
      options: parsed.options || [],
      reviewText: review.body,
      reviewRating: review.rating,
      reviewTrip: review.trip_label,
    });
  } catch (err: any) {
    console.error("Review to content error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
