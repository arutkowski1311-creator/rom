// CRUD + publish-link endpoint for newsletters.
//   GET  /api/content/newsletter?id=:id        → load draft
//   GET  /api/content/newsletter?guideId=:id   → list drafts for a guide
//   POST /api/content/newsletter               → save draft (insert or update)
//   POST /api/content/newsletter?action=publish → assign public_slug if missing
//
// Auth: Supabase user must own the guide.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";
import { validateNewsletterContent, type NewsletterContent } from "@/app/lib/newsletter-schema";
import { cookies } from "next/headers";

async function getUserGuideId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const admin = getSupabaseAdmin();
  if (token) {
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return null;
    const { data: guide } = await admin.from("guides").select("id").eq("profile_id", user.id).single();
    return guide?.id || null;
  }
  // Cookie-based fallback
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: guide } = await admin.from("guides").select("id").eq("profile_id", user.id).single();
  return guide?.id || null;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function uniqueSlug(guideSlug: string, subject: string): Promise<string> {
  const admin = getSupabaseAdmin();
  const base = `${guideSlug || "newsletter"}-${slugify(subject) || "edition"}`.slice(0, 70) || "newsletter";
  for (let i = 0; i < 8; i++) {
    const candidate = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data } = await admin.from("content_pieces").select("id").eq("public_slug", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const guideId = url.searchParams.get("guideId");

  const userGuideId = await getUserGuideId(req);
  if (!userGuideId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();

  if (id) {
    const { data, error } = await admin.from("content_pieces")
      .select("id, guide_id, type, status, content_json, subject, preheader, public_slug, created_at")
      .eq("id", id)
      .eq("type", "newsletter")
      .single();
    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (data.guide_id !== userGuideId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ newsletter: data });
  }

  const targetGuideId = guideId || userGuideId;
  if (targetGuideId !== userGuideId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await admin.from("content_pieces")
    .select("id, type, status, subject, preheader, public_slug, created_at")
    .eq("guide_id", targetGuideId)
    .eq("type", "newsletter")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ newsletters: data || [] });
}

// ─── POST (save / publish) ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const userGuideId = await getUserGuideId(req);
    if (!userGuideId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const action = url.searchParams.get("action"); // 'publish' or null

    const body = await req.json();
    const { id, content } = body as { id?: string; content: unknown };

    let validated: NewsletterContent;
    try {
      validated = validateNewsletterContent(content);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid content" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    if (id) {
      const { data: existing } = await admin.from("content_pieces").select("guide_id, public_slug").eq("id", id).single();
      if (!existing || existing.guide_id !== userGuideId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const update: Record<string, unknown> = {
        content_json: validated,
        subject: validated.subject,
        preheader: validated.preheader,
      };

      if (action === "publish" && !existing.public_slug) {
        update.public_slug = await uniqueSlug(validated.guide.slug, validated.subject);
        update.status = "approved";
      }

      const { data, error } = await admin.from("content_pieces")
        .update(update as never)
        .eq("id", id)
        .select("id, public_slug, status")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ newsletter: data });
    }

    // Insert new draft
    const insert: Record<string, unknown> = {
      guide_id: userGuideId,
      type: "newsletter",
      platform: "email",
      content_type: "email",
      content: validated.subject, // legacy fallback for the TEXT NOT NULL column
      content_json: validated,
      subject: validated.subject,
      preheader: validated.preheader,
      status: "pending",
      ai_model: "claude-sonnet-4-20250514",
    };
    if (action === "publish") {
      insert.public_slug = await uniqueSlug(validated.guide.slug, validated.subject);
      insert.status = "approved";
    }

    const { data, error } = await admin.from("content_pieces")
      .insert(insert as never)
      .select("id, public_slug, status")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ newsletter: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Save failed";
    console.error("Newsletter save error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
