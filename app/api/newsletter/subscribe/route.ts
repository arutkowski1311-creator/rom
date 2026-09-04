// Public newsletter opt-in. Unauthenticated by design — this is the form on a
// guide's profile and at the foot of every public newsletter, and it is the
// only path that grows a list rather than importing one.
//
// POST /api/newsletter/subscribe  { guideId, email, name? }
//
// Always answers with a generic success once the input is well-formed, so the
// endpoint cannot be used to test whether an address is already on a guide's
// list.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_NAME = 120;

// Crude per-instance throttle. Serverless means each instance keeps its own
// counter, so this is a speed bump against a naive script, not a real rate
// limiter — a determined abuser needs blocking upstream.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, { count: number; resetAt: number }>();

function throttled(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    // Opportunistic cleanup so the map cannot grow without bound.
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
    }
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  let body: { guideId?: string; email?: string; name?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const guideId = (body.guideId || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const name = (body.name || "").trim().slice(0, MAX_NAME) || null;

  if (!UUID_RE.test(guideId)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (throttled(ip)) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const admin = getSupabaseAdmin();

  // Confirm the guide exists before writing a row pointed at them.
  const { data: guide } = await admin.from("guides").select("id").eq("id", guideId).maybeSingle();
  if (!guide) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { data: existing } = await admin
    .from("email_subscribers")
    .select("id, unsubscribed_at")
    .eq("guide_id", guideId)
    .eq("email", email)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing) {
    // Someone filling in this form is opting in right now, so an earlier
    // unsubscribe is superseded by the fresh consent. An already-active
    // subscriber is left untouched — re-submitting must not reset their
    // original consent date.
    if (existing.unsubscribed_at) {
      const { error } = await admin
        .from("email_subscribers")
        .update({ unsubscribed_at: null, consent_at: now, consent_source: "opt_in_form", source: "web_signup" } as never)
        .eq("id", existing.id);
      if (error) return NextResponse.json({ error: "Could not subscribe" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const { error } = await admin.from("email_subscribers").insert({
    guide_id: guideId,
    email,
    full_name: name,
    source: "web_signup",
    consent_at: now,
    consent_source: "opt_in_form",
    tags: ["lead"],
  } as never);

  // A unique-violation means a concurrent submit won the race — same outcome
  // for the person filling in the form.
  if (error && error.code !== "23505") {
    console.error("Subscribe failed:", error);
    return NextResponse.json({ error: "Could not subscribe" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
