import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — Fetch action items for a guide
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const guideId = searchParams.get("guideId");
  const status = searchParams.get("status") || "open";

  if (!guideId) return NextResponse.json({ error: "Missing guideId" }, { status: 400 });

  const { data: items, error } = await supabase
    .from("action_items")
    .select("*")
    .eq("guide_id", guideId)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: items || [] });
}

// PATCH — Update action item (resolve, dismiss, send draft)
export async function PATCH(req: Request) {
  try {
    const { itemId, action, editedDraft } = await req.json();
    if (!itemId || !action) return NextResponse.json({ error: "Missing itemId or action" }, { status: 400 });

    const { data: item } = await supabase
      .from("action_items").select("*").eq("id", itemId).single();
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    if (action === "send_draft") {
      // Send the AI draft (or edited version) as a message
      const draftToSend = editedDraft || item.ai_draft;
      if (!draftToSend || !item.thread_id) {
        return NextResponse.json({ error: "No draft or thread to send to" }, { status: 400 });
      }

      // Get guide's profile_id for sender
      const { data: guide } = await supabase
        .from("guides").select("profile_id").eq("id", item.guide_id).single();

      await supabase.from("messages").insert({
        thread_id: item.thread_id,
        sender_id: guide?.profile_id,
        body: draftToSend,
        auto_generated: false, // Guide reviewed it
      });

      await supabase.from("action_items").update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      }).eq("id", itemId);

      return NextResponse.json({ success: true, action: "sent" });
    }

    if (action === "resolve") {
      await supabase.from("action_items").update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      }).eq("id", itemId);
      return NextResponse.json({ success: true, action: "resolved" });
    }

    if (action === "dismiss") {
      await supabase.from("action_items").update({
        status: "dismissed",
        resolved_at: new Date().toISOString(),
      }).eq("id", itemId);
      return NextResponse.json({ success: true, action: "dismissed" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
