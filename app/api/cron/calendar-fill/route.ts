import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const now = new Date();
  const results: any[] = [];

  // For each active guide, compare current booking pace vs historical
  const { data: guides } = await supabase
    .from("guides")
    .select("id, profile_id, subscription_tier")
    .eq("status", "active");

  for (const guide of guides || []) {
    try {
      // Current pace: bookings in next 60 days
      const sixtyOut = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      const { count: upcoming } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("guide_id", guide.id)
        .in("status", ["confirmed", "pending"])
        .gte("trip_date", now.toISOString().split("T")[0])
        .lte("trip_date", sixtyOut.toISOString().split("T")[0]);

      // Historical pace: same 60-day window last year
      const lastYearStart = new Date(now);
      lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
      const lastYearEnd = new Date(sixtyOut);
      lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

      const { count: historical } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("guide_id", guide.id)
        .eq("status", "completed")
        .gte("trip_date", lastYearStart.toISOString().split("T")[0])
        .lte("trip_date", lastYearEnd.toISOString().split("T")[0]);

      const currentPace = upcoming || 0;
      const historicalPace = historical || 0;
      const gapPercent = historicalPace > 0
        ? Math.round(((currentPace - historicalPace) / historicalPace) * 100)
        : 0;

      // Update intelligence
      await supabase.from("guide_intelligence").upsert({
        guide_id: guide.id,
        booking_pace_current: currentPace,
        booking_pace_historical: historicalPace,
        pace_gap_percent: gapPercent,
        updated_at: now.toISOString(),
      }, { onConflict: "guide_id" });

      // If pace is below 75% of historical, trigger actions
      if (historicalPace > 0 && currentPace < historicalPace * 0.75) {
        // Trigger content generation if guide is Discover+
        if (["discover", "immerse"].includes(guide.subscription_tier)) {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cron/weekly-content`, {
              method: "GET",
              headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
            });
          } catch (e) { /* non-critical */ }
        }

        // Notify guide
        await supabase.from("guide_notifications").insert({
          guide_id: guide.id,
          type: "calendar_fill_activated",
          title: `Your calendar is tracking ${Math.abs(gapPercent)}% below last year`,
          body: `${currentPace} bookings in the next 60 days vs ${historicalPace} this time last year. We've activated your fill sequence.`,
          metadata: { currentPace, historicalPace, gapPercent },
          priority: "high",
        });

        await supabase.from("guide_intelligence").update({
          calendar_fill_triggered_at: now.toISOString(),
        }).eq("guide_id", guide.id);

        results.push({ guideId: guide.id, action: "fill_triggered", currentPace, historicalPace, gapPercent });
      } else {
        results.push({ guideId: guide.id, action: "on_track", currentPace, historicalPace });
      }
    } catch (e: any) {
      results.push({ guideId: guide.id, action: "error", error: e.message });
    }
  }

  return NextResponse.json({ processed: results.length, results, timestamp: now.toISOString() });
}
