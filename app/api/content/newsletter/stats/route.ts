// Aggregate newsletter_sends per newsletter for the authenticated guide.
// Returns one row per campaign (newsletter_id) with delivery and engagement
// metrics computed from the rows that the Resend webhook keeps current.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";
import { cookies } from "next/headers";

async function getGuideId(req: NextRequest): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  let userId: string | null = null;
  if (token) {
    const { data: { user } } = await admin.auth.getUser(token);
    userId = user?.id || null;
  } else {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  }
  if (!userId) return null;
  const { data: guide } = await admin.from("guides").select("id").eq("profile_id", userId).single();
  return guide?.id || null;
}

interface SendRow {
  newsletter_id: string | null;
  status: string;
  opens: number | null;
  clicks: number | null;
  sent_at: string | null;
  send_type: string;
}

export async function GET(req: NextRequest) {
  const guideId = await getGuideId(req);
  if (!guideId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();

  // Pull all campaign sends for this guide (skip tests so they don't pollute stats)
  const { data: sends, error } = await admin
    .from("newsletter_sends")
    .select("newsletter_id, status, opens, clicks, sent_at, send_type")
    .eq("guide_id", guideId)
    .eq("send_type", "campaign")
    .order("sent_at", { ascending: false })
    .limit(5000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group by newsletter_id
  const byNewsletter = new Map<string, {
    recipients: number; delivered: number; bounced: number; failed: number;
    opens: number; clicks: number; uniqueOpeners: number; uniqueClickers: number;
    firstSentAt: string | null; lastSentAt: string | null;
  }>();

  for (const row of (sends as SendRow[]) || []) {
    if (!row.newsletter_id) continue;
    let bucket = byNewsletter.get(row.newsletter_id);
    if (!bucket) {
      bucket = { recipients: 0, delivered: 0, bounced: 0, failed: 0, opens: 0, clicks: 0, uniqueOpeners: 0, uniqueClickers: 0, firstSentAt: null, lastSentAt: null };
      byNewsletter.set(row.newsletter_id, bucket);
    }
    bucket.recipients += 1;
    if (row.status === "sent") bucket.delivered += 1;
    else if (row.status === "bounced") bucket.bounced += 1;
    else if (row.status === "failed") bucket.failed += 1;
    bucket.opens += row.opens || 0;
    bucket.clicks += row.clicks || 0;
    if ((row.opens || 0) > 0) bucket.uniqueOpeners += 1;
    if ((row.clicks || 0) > 0) bucket.uniqueClickers += 1;
    if (row.sent_at) {
      if (!bucket.firstSentAt || row.sent_at < bucket.firstSentAt) bucket.firstSentAt = row.sent_at;
      if (!bucket.lastSentAt || row.sent_at > bucket.lastSentAt) bucket.lastSentAt = row.sent_at;
    }
  }

  const newsletterIds = Array.from(byNewsletter.keys());
  if (newsletterIds.length === 0) return NextResponse.json({ campaigns: [] });

  // Pull subject/title for each newsletter
  interface PieceRow { id: string; subject: string | null; title: string | null; public_slug: string | null; published_at: string | null }
  const { data: pieces } = await admin
    .from("content_pieces")
    .select("id, subject, title, public_slug, published_at")
    .in("id", newsletterIds);

  const pieceById = new Map(((pieces || []) as unknown as PieceRow[]).map(p => [p.id, p]));

  const campaigns = newsletterIds.map(id => {
    const b = byNewsletter.get(id)!;
    const piece = pieceById.get(id);
    const openRate = b.delivered > 0 ? b.uniqueOpeners / b.delivered : 0;
    const clickRate = b.delivered > 0 ? b.uniqueClickers / b.delivered : 0;
    return {
      newsletterId: id,
      subject: piece?.subject || piece?.title || "(no subject)",
      slug: piece?.public_slug || null,
      sentAt: b.firstSentAt,
      recipients: b.recipients,
      delivered: b.delivered,
      bounced: b.bounced,
      failed: b.failed,
      opens: b.opens,
      clicks: b.clicks,
      uniqueOpeners: b.uniqueOpeners,
      uniqueClickers: b.uniqueClickers,
      openRate,
      clickRate,
    };
  }).sort((a, b) => (b.sentAt || "").localeCompare(a.sentAt || ""));

  return NextResponse.json({ campaigns });
}
