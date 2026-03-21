import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const guideId = req.nextUrl.searchParams.get("guideId");
    if (!guideId) return NextResponse.json({ error: "guideId required" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    // Fetch notifications, prioritized: unread first, then by priority, then by date
    const { data: notifications } = await supabase
      .from("guide_notifications")
      .select("*")
      .eq("guide_id", guideId)
      .order("read_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false })
      .limit(50);

    // Count unread
    const unread = (notifications || []).filter((n: any) => !n.read_at && !n.dismissed_at).length;

    return NextResponse.json({ notifications: notifications || [], unread });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { notificationId, action } = await req.json();
    if (!notificationId || !action) return NextResponse.json({ error: "notificationId and action required" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    if (action === "read") {
      await supabase
        .from("guide_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId);
    } else if (action === "dismiss") {
      await supabase
        .from("guide_notifications")
        .update({ dismissed_at: new Date().toISOString(), read_at: new Date().toISOString() })
        .eq("id", notificationId);
    } else if (action === "execute") {
      // Mark as executed
      await supabase
        .from("guide_notifications")
        .update({ auto_executed_at: new Date().toISOString(), read_at: new Date().toISOString() })
        .eq("id", notificationId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
