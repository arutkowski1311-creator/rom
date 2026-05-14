// Send a newsletter campaign to all active subscribers. Per-recipient
// unsubscribe link injected into the rendered HTML. Each send logged in
// newsletter_sends. Rate-limited via small concurrency window.

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";
import { validateNewsletterContent, type NewsletterContent } from "@/app/lib/newsletter-schema";
import { renderNewsletterHtml, renderNewsletterText } from "@/app/lib/newsletter-html";
import { cookies } from "next/headers";

export const maxDuration = 300;

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_ADDR = process.env.NEWSLETTER_FROM_EMAIL || "RŌM <newsletters@romlife.co>";
const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "https://romlife.co";
const CONCURRENCY = 8;
const MAX_PER_CAMPAIGN = 5000; // safety guard

async function getUserGuideId(req: NextRequest): Promise<string | null> {
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

interface Subscriber { id: string; email: string; full_name: string | null; unsubscribe_token: string }

async function sendOne(content: NewsletterContent, sub: Subscriber, newsletterId: string | undefined, guideId: string): Promise<"sent" | "failed"> {
  const admin = getSupabaseAdmin();
  const unsubscribeUrl = `${SITE_ORIGIN}/unsubscribe/${sub.unsubscribe_token}`;
  const personalized: NewsletterContent = {
    ...content,
    footer: { ...content.footer, unsubscribeUrl },
  };
  const html = renderNewsletterHtml(personalized);
  const text = renderNewsletterText(personalized);
  try {
    const result = await resend.emails.send({
      from: FROM_ADDR,
      to: sub.email,
      subject: content.subject,
      html,
      text,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (result.error) {
      await admin.from("newsletter_sends").insert({
        guide_id: guideId,
        newsletter_id: newsletterId || null,
        send_type: "campaign",
        recipient_email: sub.email,
        recipient_count: 1,
        status: "failed",
        error: result.error.message,
      } as never);
      return "failed";
    }
    await admin.from("newsletter_sends").insert({
      guide_id: guideId,
      newsletter_id: newsletterId || null,
      send_type: "campaign",
      recipient_email: sub.email,
      recipient_count: 1,
      status: "sent",
      resend_message_id: result.data?.id || null,
      sent_at: new Date().toISOString(),
    } as never);
    return "sent";
  } catch (err) {
    await admin.from("newsletter_sends").insert({
      guide_id: guideId,
      newsletter_id: newsletterId || null,
      send_type: "campaign",
      recipient_email: sub.email,
      recipient_count: 1,
      status: "failed",
      error: err instanceof Error ? err.message : "send failed",
    } as never);
    return "failed";
  }
}

async function processInChunks(items: Subscriber[], worker: (item: Subscriber) => Promise<"sent" | "failed">, concurrency: number): Promise<{ sent: number; failed: number }> {
  let sent = 0; let failed = 0;
  for (let i = 0; i < items.length; i += concurrency) {
    const slice = items.slice(i, i + concurrency);
    const results = await Promise.all(slice.map(worker));
    for (const r of results) (r === "sent" ? sent++ : failed++);
  }
  return { sent, failed };
}

export async function POST(req: NextRequest) {
  try {
    const guideId = await getUserGuideId(req);
    if (!guideId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { newsletterId, content: contentInput, dryRun } = body as { newsletterId?: string; content?: unknown; dryRun?: boolean };

    const admin = getSupabaseAdmin();

    let content: NewsletterContent;
    let resolvedNewsletterId = newsletterId;

    if (newsletterId) {
      const { data } = await admin.from("content_pieces").select("guide_id, content_json").eq("id", newsletterId).single();
      if (!data || data.guide_id !== guideId) return NextResponse.json({ error: "Newsletter not found" }, { status: 404 });
      try { content = validateNewsletterContent(data.content_json); }
      catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid stored content" }, { status: 400 }); }
    } else if (contentInput) {
      try { content = validateNewsletterContent(contentInput); }
      catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid content" }, { status: 400 }); }
    } else {
      return NextResponse.json({ error: "Provide newsletterId or content" }, { status: 400 });
    }

    // Pull active subscribers
    const { data: subs, error: subsErr } = await admin.from("email_subscribers")
      .select("id, email, full_name, unsubscribe_token")
      .eq("guide_id", guideId)
      .is("unsubscribed_at", null)
      .limit(MAX_PER_CAMPAIGN);
    if (subsErr) return NextResponse.json({ error: subsErr.message }, { status: 500 });

    const subscribers = (subs || []) as Subscriber[];
    if (subscribers.length === 0) return NextResponse.json({ error: "No active subscribers" }, { status: 400 });

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        wouldSend: subscribers.length,
        sampleHtmlLength: renderNewsletterHtml(content).length,
        sampleSubject: content.subject,
      });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    const startedAt = Date.now();
    const { sent, failed } = await processInChunks(subscribers, (s) => sendOne(content, s, resolvedNewsletterId, guideId), CONCURRENCY);
    const elapsedMs = Date.now() - startedAt;

    if (resolvedNewsletterId) {
      await admin.from("content_pieces").update({ status: "published" } as never).eq("id", resolvedNewsletterId);
    }

    return NextResponse.json({ ok: true, sent, failed, total: subscribers.length, elapsedMs });
  } catch (err: unknown) {
    console.error("Campaign send error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Send failed" }, { status: 500 });
  }
}
