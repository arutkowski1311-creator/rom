import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

// Vercel cron: runs every 6 hours
// vercel.json: { "crons": [{ "path": "/api/cron/ical-sync", "schedule": "0 */6 * * *" }] }
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: feeds } = await supabase
    .from("property_ical_feeds")
    .select("id, property_id, url, label");

  let synced = 0;
  let errors = 0;

  for (const feed of feeds || []) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/properties/ical-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: feed.property_id, feed_url: feed.url, label: feed.label }),
      });
      if (res.ok) synced++;
      else errors++;
    } catch {
      errors++;
    }
  }

  return NextResponse.json({ synced, errors, total: (feeds || []).length });
}
