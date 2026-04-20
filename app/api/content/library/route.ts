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

// GET — Search/filter content library
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const guideId = searchParams.get("guideId");
    const contentType = searchParams.get("type");
    const status = searchParams.get("status");
    const goal = searchParams.get("goal");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!guideId) return NextResponse.json({ error: "guideId required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("content_pieces")
      .select("*")
      .eq("guide_id", guideId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (contentType) query = query.eq("content_type", contentType);
    if (status) query = query.eq("status", status);
    if (goal) query = query.eq("goal", goal);

    const { data } = await query;
    return NextResponse.json({ content: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

// PUT — Update content performance metrics
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { contentId, performance, status } = await req.json();
    if (!contentId) return NextResponse.json({ error: "contentId required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const updates: any = {};
    if (performance) updates.performance = performance;
    if (status) updates.status = status;

    const { data } = await supabase
      .from("content_pieces")
      .update(updates)
      .eq("id", contentId)
      .select()
      .single();

    return NextResponse.json({ content: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
