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
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const results: any[] = [];

  const { data: guides } = await supabase
    .from("guides")
    .select("id, profile_id, rating, review_count, bio, tagline, categories, location, profile_photo_url, gallery_photos")
    .eq("status", "active");

  for (const guide of guides || []) {
    try {
      // 1. Booking velocity (25%) — bookings this month vs rolling avg
      const { count: thisMonthBookings } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("guide_id", guide.id)
        .eq("status", "completed")
        .gte("trip_date", new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]);

      const { count: last90Bookings } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("guide_id", guide.id)
        .eq("status", "completed")
        .gte("trip_date", ninetyDaysAgo.toISOString().split("T")[0]);

      const avgMonthly = (last90Bookings || 0) / 3;
      const velocityScore = avgMonthly > 0 ? Math.min(100, ((thisMonthBookings || 0) / avgMonthly) * 100) : (thisMonthBookings || 0) > 0 ? 80 : 30;

      // 2. Review rating (20%)
      const ratingScore = guide.rating ? Math.min(100, (parseFloat(guide.rating as string) / 5) * 100) : 50;

      // 3. Response time (20%) — from message threads last 30 days
      const { data: threads } = await supabase
        .from("message_threads")
        .select("id, created_at")
        .eq("guide_id", guide.id)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .limit(20);

      let responseScore = 70; // default if no data
      if (threads && threads.length > 0) {
        // Simplified: check how many threads have guide responses
        let totalResponseMin = 0;
        let respondedCount = 0;
        for (const thread of threads) {
          const { data: msgs } = await supabase
            .from("messages")
            .select("sender_id, created_at")
            .eq("thread_id", thread.id)
            .order("created_at", { ascending: true })
            .limit(3);
          if (msgs && msgs.length >= 2) {
            const firstGuideMsg = msgs.find((m: any) => m.sender_id === guide.profile_id);
            if (firstGuideMsg) {
              const responseMin = (new Date(firstGuideMsg.created_at).getTime() - new Date(thread.created_at).getTime()) / 60000;
              totalResponseMin += responseMin;
              respondedCount++;
            }
          }
        }
        if (respondedCount > 0) {
          const avgMin = totalResponseMin / respondedCount;
          if (avgMin <= 60) responseScore = 100;
          else if (avgMin <= 120) responseScore = 85;
          else if (avgMin <= 240) responseScore = 70;
          else if (avgMin <= 480) responseScore = 50;
          else responseScore = 30;
        }
      }

      // 4. Profile completeness (15%)
      let completeness = 0;
      if (guide.bio) completeness += 15;
      if (guide.tagline) completeness += 10;
      if (guide.profile_photo_url) completeness += 15;
      if ((guide.gallery_photos || []).length >= 3) completeness += 15;
      if ((guide.categories || []).length >= 1) completeness += 10;
      if (guide.location) completeness += 10;
      if (guide.rating && parseFloat(guide.rating as string) > 0) completeness += 10;
      if ((guide.review_count || 0) >= 1) completeness += 15;

      // 5. Content activity (10%)
      const { count: contentCount } = await supabase
        .from("marketing_content")
        .select("id", { count: "exact", head: true })
        .eq("guide_id", guide.id)
        .gte("created_at", thirtyDaysAgo.toISOString());

      const contentScore = Math.min(100, (contentCount || 0) * 25);

      // 6. Repeat rate (10%)
      const { data: guestProfiles } = await supabase
        .from("guest_profiles")
        .select("total_trips")
        .eq("guide_id", guide.id);

      let repeatScore = 50;
      if (guestProfiles && guestProfiles.length > 0) {
        const repeatGuests = guestProfiles.filter((g: any) => (g.total_trips || 0) > 1).length;
        repeatScore = Math.min(100, (repeatGuests / guestProfiles.length) * 200);
      }

      // Weighted composite
      const healthScore = Math.round(
        velocityScore * 0.25 +
        ratingScore * 0.20 +
        responseScore * 0.20 +
        completeness * 0.15 +
        contentScore * 0.10 +
        repeatScore * 0.10
      );

      const components = {
        booking_velocity: Math.round(velocityScore),
        review_rating: Math.round(ratingScore),
        response_time: Math.round(responseScore),
        profile_completeness: Math.round(completeness),
        content_activity: Math.round(contentScore),
        repeat_rate: Math.round(repeatScore),
      };

      // Find lowest dimension for action
      const sorted = Object.entries(components).sort(([, a], [, b]) => (a as number) - (b as number));
      const [weakest, weakestScore] = sorted[0];

      // Generate action sentence
      let action = "";
      try {
        const msg = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 80,
          system: "Generate a single actionable sentence (max 20 words) for a guide to improve their business. Be specific and encouraging. Return ONLY the sentence.",
          messages: [{
            role: "user",
            content: `Health score: ${healthScore}/100. Weakest area: ${weakest} (${weakestScore}/100). Guide has ${last90Bookings || 0} bookings in 90 days, ${guide.review_count || 0} reviews, rating ${guide.rating || "none"}.`,
          }],
        });
        action = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
      } catch (e) {
        const actionMap: Record<string, string> = {
          booking_velocity: "Consider running a promotion or reaching out to past guests to boost bookings.",
          review_rating: "Focus on delivering exceptional experiences — every 5-star review counts.",
          response_time: "Try to respond to inquiries within 2 hours to improve your conversion rate.",
          profile_completeness: "Complete your profile — add photos, update your bio, and list your credentials.",
          content_activity: "Generate some marketing content this week to stay visible to potential guests.",
          repeat_rate: "Send personalized follow-ups to past guests to encourage repeat bookings.",
        };
        action = actionMap[weakest] || "Keep up the great work.";
      }

      // Upsert guide_intelligence
      const { data: existing } = await supabase
        .from("guide_intelligence")
        .select("id")
        .eq("guide_id", guide.id)
        .single();

      const payload = {
        guide_id: guide.id,
        health_score: healthScore,
        health_components: components,
        health_action: action,
        booking_velocity: avgMonthly,
        repeat_rate: guestProfiles && guestProfiles.length > 0 ? guestProfiles.filter((g: any) => (g.total_trips || 0) > 1).length / guestProfiles.length : 0,
        avg_response_minutes: Math.round(responseScore), // simplified
        profile_completeness: completeness,
        content_activity_score: contentScore,
        last_health_computed: now.toISOString(),
        updated_at: now.toISOString(),
      };

      if (existing) {
        await supabase.from("guide_intelligence").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("guide_intelligence").insert(payload);
      }

      // Notify guide
      await supabase.from("guide_notifications").insert({
        guide_id: guide.id,
        type: "business_health_weekly",
        title: `Your score is ${healthScore}. ${action.split(".")[0]}.`,
        body: action,
        metadata: { health_score: healthScore, components, weakest },
        priority: healthScore < 50 ? "high" : "normal",
      });

      results.push({ guideId: guide.id, healthScore, weakest });
    } catch (e: any) {
      results.push({ guideId: guide.id, action: "error", error: e.message });
    }
  }

  return NextResponse.json({ processed: results.length, results, timestamp: now.toISOString() });
}
