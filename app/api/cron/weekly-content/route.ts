import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const results: any[] = [];

  // Get Discover+ guides
  const { data: guides } = await supabase
    .from("guides")
    .select("id, profile_id, voice_profile, location, categories, tagline, bio, rating, review_count")
    .eq("status", "active")
    .in("subscription_tier", ["discover", "immerse"]);

  for (const guide of guides || []) {
    try {
      const { data: guideProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", guide.profile_id)
        .single();
      const guideName = guideProfile?.full_name || "Guide";

      // Get recent reviews for content context
      const { data: reviews } = await supabase
        .from("reviews")
        .select("body, rating")
        .eq("guide_id", guide.id)
        .order("created_at", { ascending: false })
        .limit(3);

      // Get recent bookings for seasonal context
      const { data: recentBookings } = await supabase
        .from("bookings")
        .select("package_title, trip_date")
        .eq("guide_id", guide.id)
        .eq("status", "completed")
        .order("trip_date", { ascending: false })
        .limit(5);

      const voiceProfile = guide.voice_profile;
      const month = new Date().toLocaleDateString("en-US", { month: "long" });

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: `You generate weekly content packages for adventure guides on RŌM. Generate 3 pieces of content:

1. An Instagram post (caption + 15 hashtags)
2. A Facebook post (longer, more storytelling)
3. An email newsletter draft (subject line + body, to send to past guests)

All content should:
- Sound like the guide, not a platform${voiceProfile ? `. Voice: ${voiceProfile.tone}. ${voiceProfile.personality_markers}` : ""}
- Reference the current season (${month}) and what's happening in their area
- Include a soft CTA to book (link to their RŌM profile)
- Feel authentic and real, never salesy or corporate

Return JSON with keys: { "instagram": { "caption": "...", "hashtags": ["..."] }, "facebook": { "content": "..." }, "email": { "subject": "...", "body": "..." } }`,
        messages: [{
          role: "user",
          content: `Guide: ${guideName} in ${guide.location || "their area"}
Activities: ${(guide.categories || []).join(", ")}
Bio: ${guide.tagline || guide.bio || ""}
Rating: ${guide.rating || "N/A"} (${guide.review_count || 0} reviews)
${reviews?.length ? `Recent reviews: ${reviews.map((r: any) => `"${(r.body || "").substring(0, 60)}..."`).join(", ")}` : ""}
${recentBookings?.length ? `Recent trips: ${recentBookings.map((b: any) => b.package_title).join(", ")}` : ""}

Generate the weekly content package. Return only JSON.`,
        }],
      });

      const responseText = message.content[0].type === "text" ? message.content[0].text : "";
      let parsed;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
      } catch (e) {
        results.push({ guideId: guide.id, action: "parse_error" });
        continue;
      }

      // Insert content pieces
      const pieces = [];
      if (parsed.instagram) {
        pieces.push({
          guide_id: guide.id,
          type: "social_post",
          platform: "instagram",
          content: parsed.instagram.caption || "",
          hashtags: parsed.instagram.hashtags || [],
          status: "pending",
          ai_model: "claude-sonnet-4",
          generation_context: { trigger: "weekly_content", month },
        });
      }
      if (parsed.facebook) {
        pieces.push({
          guide_id: guide.id,
          type: "social_post",
          platform: "facebook",
          content: parsed.facebook.content || "",
          hashtags: [],
          status: "pending",
          ai_model: "claude-sonnet-4",
          generation_context: { trigger: "weekly_content", month },
        });
      }
      if (parsed.email) {
        pieces.push({
          guide_id: guide.id,
          type: "email",
          platform: "email",
          content: JSON.stringify({ subject: parsed.email.subject, body: parsed.email.body }),
          hashtags: [],
          status: "pending",
          ai_model: "claude-sonnet-4",
          generation_context: { trigger: "weekly_content", month },
        });
      }

      if (pieces.length > 0) {
        await supabase.from("content_pieces").insert(pieces);

        await supabase.from("guide_notifications").insert({
          guide_id: guide.id,
          type: "content_ready",
          title: `${pieces.length} posts ready for your approval`,
          body: "Your weekly content is ready. Approve, edit, or skip each piece.",
          metadata: { count: pieces.length },
          priority: "normal",
        });
      }

      results.push({ guideId: guide.id, pieces: pieces.length });
    } catch (e: any) {
      results.push({ guideId: guide.id, action: "error", error: e.message });
    }
  }

  return NextResponse.json({ processed: results.length, results, timestamp: new Date().toISOString() });
}
