// Send a test of a newsletter to a single email (the guide's own, by default).
// Renders the JSON to HTML at send time so the latest schema version always
// produces the latest template.

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";
import { validateNewsletterContent } from "@/app/lib/newsletter-schema";
import { renderNewsletterHtml, renderNewsletterText } from "@/app/lib/newsletter-html";
import { cookies } from "next/headers";

export const maxDuration = 30;

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_ADDR = process.env.NEWSLETTER_FROM_EMAIL || "RŌM <newsletters@romlife.co>";

async function getUserAndGuide(req: NextRequest): Promise<{ userId: string; userEmail: string | undefined; guideId: string } | null> {
  const admin = getSupabaseAdmin();
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  let userId: string | null = null;
  let userEmail: string | undefined;

  if (token) {
    const { data: { user } } = await admin.auth.getUser(token);
    userId = user?.id || null;
    userEmail = user?.email;
  } else {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
    userEmail = user?.email;
  }

  if (!userId) return null;
  const { data: guide } = await admin.from("guides").select("id").eq("profile_id", userId).single();
  if (!guide?.id) return null;
  return { userId, userEmail, guideId: guide.id };
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getUserAndGuide(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { content, recipient } = body as { content: unknown; recipient?: string };

    let validated;
    try { validated = validateNewsletterContent(content); }
    catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid content" }, { status: 400 }); }

    const to = recipient || auth.userEmail;
    if (!to) return NextResponse.json({ error: "No recipient email available — pass `recipient` or set the user's email" }, { status: 400 });

    const html = renderNewsletterHtml(validated);
    const text = renderNewsletterText(validated);

    if (!process.env.RESEND_API_KEY) {
      // Dev convenience: short-circuit so a missing key doesn't block UI testing
      return NextResponse.json({ ok: true, dryRun: true, recipient: to, htmlPreview: html.slice(0, 500) });
    }

    const result = await resend.emails.send({
      from: FROM_ADDR,
      to,
      subject: `[TEST] ${validated.subject}`,
      html,
      text,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error.message || "Send failed" }, { status: 502 });
    }

    // Log the send
    const admin = getSupabaseAdmin();
    await admin.from("newsletter_sends").insert({
      guide_id: auth.guideId,
      send_type: "test",
      recipient_email: to,
      recipient_count: 1,
      status: "sent",
      resend_message_id: result.data?.id,
      sent_at: new Date().toISOString(),
    } as never);

    return NextResponse.json({ ok: true, recipient: to, messageId: result.data?.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Send failed";
    console.error("Newsletter send-test error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
