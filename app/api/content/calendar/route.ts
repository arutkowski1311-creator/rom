import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

async function getAuthUser(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: req.headers.get("authorization") || "" } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET — Fetch calendar entries for a date range
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const guideId = searchParams.get("guideId");
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");

    if (!guideId) return NextResponse.json({ error: "guideId required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("content_calendar")
      .select("*, content_pieces(id, type, content_type, platform, content, title, photos, status, goal)")
      .eq("guide_id", guideId)
      .order("scheduled_date", { ascending: true });

    if (startDate) query = query.gte("scheduled_date", startDate);
    if (endDate) query = query.lte("scheduled_date", endDate);

    const { data } = await query;
    return NextResponse.json({ entries: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

// POST — Schedule content to calendar
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { guideId, contentPieceId, scheduledDate, scheduledTime, platform, notes } = await req.json();
    if (!guideId || !scheduledDate || !platform) {
      return NextResponse.json({ error: "guideId, scheduledDate, platform required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("content_calendar")
      .insert({
        guide_id: guideId,
        content_piece_id: contentPieceId || null,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime || "09:00",
        platform,
        status: contentPieceId ? "ready" : "planned",
        notes: notes || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Failed to schedule" }, { status: 500 });
    return NextResponse.json({ entry: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

// PUT — Update calendar entry (mark posted, reschedule, etc.)
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, status, scheduledDate, scheduledTime, notes } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const updates: any = {};
    if (status) updates.status = status;
    if (scheduledDate) updates.scheduled_date = scheduledDate;
    if (scheduledTime) updates.scheduled_time = scheduledTime;
    if (notes !== undefined) updates.notes = notes;

    const { data } = await supabase
      .from("content_calendar")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    return NextResponse.json({ entry: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
