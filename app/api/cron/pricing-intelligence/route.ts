import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

export const maxDuration = 300;

// Weekly cron: generate pricing recommendations for immerse-tier guides
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Get all active immerse-tier guides
  const { data: guides } = await supabase
    .from("guides")
    .select("id")
    .eq("status", "active")
    .eq("subscription_tier", "immerse");

  if (!guides?.length) {
    return NextResponse.json({ message: "No immerse guides", count: 0 });
  }

  let generated = 0;
  for (const guide of guides) {
    try {
      // Call the pricing API internally
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://romlife.co"}/api/ai/pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideId: guide.id }),
      });
      if (res.ok) generated++;
    } catch (e) {
      console.error(`Pricing intel error for guide ${guide.id}:`, e);
    }
  }

  return NextResponse.json({ message: "Pricing intelligence complete", generated, total: guides.length });
}
