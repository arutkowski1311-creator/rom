import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { contentId, action, editedContent, scheduledFor } = await req.json();
    if (!contentId || !action) {
      return NextResponse.json({ error: "contentId and action required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    if (action === "approve") {
      await supabase
        .from("content_pieces")
        .update({
          status: scheduledFor ? "scheduled" : "approved",
          scheduled_for: scheduledFor || null,
        })
        .eq("id", contentId);
    } else if (action === "edit") {
      await supabase
        .from("content_pieces")
        .update({
          status: "edited",
          content: editedContent || undefined,
          scheduled_for: scheduledFor || null,
        })
        .eq("id", contentId);
    } else if (action === "skip") {
      await supabase
        .from("content_pieces")
        .update({ status: "skipped" })
        .eq("id", contentId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
