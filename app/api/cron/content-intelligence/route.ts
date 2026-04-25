import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

export const maxDuration = 300;

// Weekly cron: generate content opportunities for discover+ guides
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Get all active discover/immerse guides
  const { data: guides } = await supabase
    .from("guides")
    .select("id")
    .eq("status", "active")
    .in("subscription_tier", ["discover", "immerse"]);

  if (!guides?.length) {
    return NextResponse.json({ message: "No eligible guides", count: 0 });
  }

  let generated = 0;
  for (const guide of guides) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://romlife.co"}/api/ai/content-intelligence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideId: guide.id }),
      });
      if (res.ok) generated++;
    } catch (e) {
      console.error(`Content intel error for guide ${guide.id}:`, e);
    }
  }

  return NextResponse.json({ message: "Content intelligence complete", generated, total: guides.length });
}
