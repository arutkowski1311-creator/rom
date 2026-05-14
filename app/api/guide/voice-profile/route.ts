// Save & retrieve the guide's voice profile (structured v2 schema) plus the
// optional voice_examples array.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";
import { cookies } from "next/headers";
import { mergeProfile, emptyProfile } from "@/app/lib/voice-profile";

const MAX_EXAMPLES = 5;
const MIN_EXAMPLE_LEN = 40;
const MAX_EXAMPLE_LEN = 1200;

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

export async function GET(req: NextRequest) {
  const guideId = await getUserGuideId(req);
  if (!guideId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data } = await admin.from("guides")
    .select("voice_profile, voice_examples")
    .eq("id", guideId)
    .single();
  return NextResponse.json({
    profile: data?.voice_profile || emptyProfile(),
    examples: data?.voice_examples || [],
  });
}

export async function POST(req: NextRequest) {
  try {
    const guideId = await getUserGuideId(req);
    if (!guideId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { profile: incoming, examples: incomingExamples } = body as {
      profile?: unknown;
      examples?: unknown;
    };

    const admin = getSupabaseAdmin();
    const update: Record<string, unknown> = {};

    if (incoming && typeof incoming === "object") {
      const { data: existing } = await admin.from("guides").select("voice_profile").eq("id", guideId).single();
      update.voice_profile = mergeProfile(existing?.voice_profile, incoming as Partial<ReturnType<typeof emptyProfile>>);
    }

    if (Array.isArray(incomingExamples)) {
      update.voice_examples = incomingExamples
        .map((e: unknown) => (typeof e === "string" ? e.trim() : ""))
        .filter((e: string) => e.length >= MIN_EXAMPLE_LEN && e.length <= MAX_EXAMPLE_LEN)
        .slice(0, MAX_EXAMPLES);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update — pass profile or examples" }, { status: 400 });
    }

    const { error } = await admin.from("guides").update(update as never).eq("id", guideId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: refreshed } = await admin.from("guides")
      .select("voice_profile, voice_examples")
      .eq("id", guideId)
      .single();

    return NextResponse.json({
      saved: true,
      profile: refreshed?.voice_profile || emptyProfile(),
      examples: refreshed?.voice_examples || [],
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Save failed" }, { status: 500 });
  }
}
