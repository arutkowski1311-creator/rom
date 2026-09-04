// Resend webhook receiver. Maps email lifecycle events into newsletter_sends:
//   email.sent / email.delivered → status = 'sent'
//   email.opened                 → opens += 1
//   email.clicked                → clicks += 1
//   email.bounced                → status = 'bounced' (+ suppress on hard bounce)
//   email.complained             → noted + subscriber suppressed
//
// Verifies Svix-style signature so only real Resend events get through.
// Configure in Resend dashboard:
//   URL:    https://www.romlife.co/api/webhooks/resend
//   Events: email.sent, email.delivered, email.opened, email.clicked,
//           email.bounced, email.complained
//   Secret: copy the signing secret into RESEND_WEBHOOK_SECRET (Vercel env)

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

export const maxDuration = 10;

const TOLERANCE_SECONDS = 5 * 60;

function verifySvixSignature(
  secret: string,
  svixId: string,
  svixTimestamp: string,
  signatureHeader: string,
  body: string,
): boolean {
  // Reject stale events to prevent replay attacks
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(svixTimestamp, 10);
  if (Number.isNaN(ts) || Math.abs(now - ts) > TOLERANCE_SECONDS) return false;

  // Resend signing secret format: "whsec_<base64>". The base64 portion is the
  // raw HMAC key.
  const cleanSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let secretBytes: Buffer;
  try { secretBytes = Buffer.from(cleanSecret, "base64"); }
  catch { return false; }

  const signedPayload = `${svixId}.${svixTimestamp}.${body}`;
  const expected = createHmac("sha256", secretBytes).update(signedPayload).digest("base64");

  // Header may contain multiple signatures: "v1,sig1 v1,sig2 ..." — match any
  for (const part of signatureHeader.split(" ")) {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) continue;
    try {
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch { continue; }
  }
  return false;
}

interface ResendEvent {
  type: string;
  data: {
    email_id?: string;
    id?: string;
    to?: string | string[];
    bounce?: { type?: string; subType?: string; message?: string };
    [key: string]: unknown;
  };
}

// Stop mailing an address for good. A hard bounce means the mailbox does not
// exist; a complaint means the person hit "spam". Either way, sending again
// burns the sending domain's reputation, so the subscriber is unsubscribed the
// same way the unsubscribe page does it.
async function suppressSubscriber(
  guideId: string | null,
  email: string | null,
  reason: string,
): Promise<void> {
  if (!guideId || !email) return;
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("email_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() } as never)
    .eq("guide_id", guideId)
    .eq("email", email)
    .is("unsubscribed_at", null);
  if (error) console.error(`Failed to suppress ${email} after ${reason}:`, error);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const svixId = req.headers.get("svix-id") || "";
  const svixTimestamp = req.headers.get("svix-timestamp") || "";
  const signature = req.headers.get("svix-signature") || "";
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  if (!secret) {
    console.error("RESEND_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }
  if (!svixId || !svixTimestamp || !signature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }
  if (!verifySvixSignature(secret, svixId, svixTimestamp, signature, body)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: ResendEvent;
  try { event = JSON.parse(body) as ResendEvent; }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const messageId = event.data?.email_id || event.data?.id;
  if (!messageId) {
    return NextResponse.json({ ok: true, ignored: "no message id" });
  }

  const admin = getSupabaseAdmin();
  const { data: send } = await admin
    .from("newsletter_sends")
    .select("id, opens, clicks, status, error, guide_id, recipient_email")
    .eq("resend_message_id", messageId)
    .maybeSingle();

  // Not ours — could be from another integration the guide uses with the same
  // Resend account. Acknowledge so Resend stops retrying.
  if (!send) return NextResponse.json({ ok: true, ignored: "send not found", messageId });

  // Build the patch. Counters use read-modify-write — fine for our volume,
  // a small race window could miss an increment but never corrupts data.
  const update: Record<string, unknown> = {};
  let suppressed: string | null = null;
  switch (event.type) {
    case "email.sent":
    case "email.delivered":
      if (send.status === "queued") update.status = "sent";
      break;
    case "email.opened":
      update.opens = (send.opens || 0) + 1;
      break;
    case "email.clicked":
      update.clicks = (send.clicks || 0) + 1;
      break;
    case "email.bounced": {
      update.status = "bounced";
      // Resend reports Transient (mailbox full, greylisted) separately from
      // Permanent. Only permanent bounces suppress — a transient one can
      // deliver on the next campaign.
      const bounceType = (event.data.bounce?.type || "").toLowerCase();
      const permanent = bounceType !== "transient";
      update.error = `bounced: ${event.data.bounce?.type || "unknown"}${event.data.bounce?.subType ? `/${event.data.bounce.subType}` : ""}`;
      if (permanent) suppressed = "hard bounce";
      break;
    }
    case "email.complained":
      // Surface complaints in the error column so they're visible in queries.
      // Doesn't overwrite a real send error if one is already stored.
      if (!send.error) update.error = "spam complaint";
      suppressed = "spam complaint";
      break;
    case "email.delivery_delayed":
      break;
    default:
      return NextResponse.json({ ok: true, ignored: `unhandled event: ${event.type}` });
  }

  if (Object.keys(update).length > 0) {
    const { error } = await admin
      .from("newsletter_sends")
      .update(update as never)
      .eq("id", send.id);
    if (error) {
      console.error("Webhook update failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (suppressed) {
    await suppressSubscriber(send.guide_id, send.recipient_email, suppressed);
  }

  return NextResponse.json({ ok: true, type: event.type, messageId, suppressed: suppressed ?? undefined });
}

// GET handler for the Resend dashboard's "Test webhook" button which sends a
// GET to verify reachability before subscribing.
export async function GET() {
  return NextResponse.json({ ok: true, name: "resend-webhook", ready: !!process.env.RESEND_WEBHOOK_SECRET });
}
