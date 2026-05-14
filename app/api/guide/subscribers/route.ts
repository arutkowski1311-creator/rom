// Subscriber list management.
//   GET  /api/guide/subscribers              → list active subscribers + counts
//   POST /api/guide/subscribers              → bulk add (JSON array OR CSV string)
//   DELETE /api/guide/subscribers?id=:id     → mark unsubscribed (does not delete)

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";
import { cookies } from "next/headers";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

interface ParsedRow { email: string; full_name?: string; tags?: string[] }

function parseCsv(input: string): ParsedRow[] {
  // Minimal CSV: email,name,tags. Header optional. Tag list separated by ';' or '|'.
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const first = lines[0].toLowerCase();
  const hasHeader = first.includes("email") && (first.includes("name") || first.includes(","));
  const rows = hasHeader ? lines.slice(1) : lines;

  const out: ParsedRow[] = [];
  for (const row of rows) {
    const parts = row.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
    const email = parts[0];
    if (!email || !EMAIL_RE.test(email)) continue;
    const full_name = parts[1] || undefined;
    const tagsStr = parts[2] || "";
    const tags = tagsStr ? tagsStr.split(/[;|]/).map((t) => t.trim()).filter(Boolean) : undefined;
    out.push({ email: email.toLowerCase(), full_name, tags });
  }
  return out;
}

export async function GET(req: NextRequest) {
  const guideId = await getUserGuideId(req);
  if (!guideId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("email_subscribers")
    .select("id, email, full_name, source, consent_at, unsubscribed_at, tags, created_at")
    .eq("guide_id", guideId)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const subs = (data || []) as Array<{ unsubscribed_at: string | null }>;
  const active = subs.filter((s) => !s.unsubscribed_at);
  return NextResponse.json({
    subscribers: subs,
    counts: { total: subs.length, active: active.length, unsubscribed: subs.length - active.length },
  });
}

export async function POST(req: NextRequest) {
  try {
    const guideId = await getUserGuideId(req);
    if (!guideId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { csv, rows, source = "manual", consent_source = "imported" } = body as { csv?: string; rows?: ParsedRow[]; source?: string; consent_source?: string };

    let parsed: ParsedRow[] = [];
    if (typeof csv === "string" && csv.trim()) parsed = parseCsv(csv);
    if (Array.isArray(rows)) {
      const more = rows
        .filter((r) => r && typeof r.email === "string" && EMAIL_RE.test(r.email))
        .map((r) => ({ email: r.email.toLowerCase(), full_name: r.full_name, tags: Array.isArray(r.tags) ? r.tags : undefined }));
      parsed.push(...more);
    }
    if (parsed.length === 0) return NextResponse.json({ error: "No valid rows. Provide csv string or rows[]" }, { status: 400 });

    // Dedupe by email within payload
    const byEmail = new Map<string, ParsedRow>();
    for (const r of parsed) byEmail.set(r.email, r);
    const dedup = Array.from(byEmail.values());

    const admin = getSupabaseAdmin();
    const records = dedup.map((r) => ({
      guide_id: guideId,
      email: r.email,
      full_name: r.full_name || null,
      source,
      consent_at: new Date().toISOString(),
      consent_source,
      tags: r.tags || [],
    }));

    // Upsert with ignoreDuplicates so existing emails aren't clobbered
    const { error } = await admin.from("email_subscribers")
      .upsert(records as never, { onConflict: "guide_id,email", ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Return new total
    const { count } = await admin.from("email_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("guide_id", guideId)
      .is("unsubscribed_at", null);

    return NextResponse.json({ added: dedup.length, activeCount: count || 0 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Import failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const guideId = await getUserGuideId(req);
  if (!guideId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("email_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() } as never)
    .eq("id", id)
    .eq("guide_id", guideId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
