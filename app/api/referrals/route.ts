import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

async function getAuthUser(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: req.headers.get("authorization") || "" } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function generateCode(name: string): string {
  const clean = (name || "ROM").replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 6);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ROM-${clean}${rand}`;
}

// GET — Referral stats
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseAdmin();

    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code, full_name")
      .eq("id", user.id)
      .single();

    // Get referral events where I'm the referrer
    const { data: events } = await supabase
      .from("referral_events")
      .select("id, referee_id, event_type, reward_amount, status, created_at")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    // Get referee names
    const refereeIds = [...new Set((events || []).map((e: any) => e.referee_id))];
    let refereeNames: Record<string, string> = {};
    if (refereeIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", refereeIds);
      (profiles || []).forEach((p: any) => { refereeNames[p.id] = p.full_name || "Guest"; });
    }

    // Get credit balance
    const { data: credits } = await supabase
      .from("referral_credits")
      .select("amount")
      .eq("profile_id", user.id);

    const totalEarned = (credits || []).filter((c: any) => c.amount > 0).reduce((s: number, c: any) => s + c.amount, 0);
    const totalSpent = Math.abs((credits || []).filter((c: any) => c.amount < 0).reduce((s: number, c: any) => s + c.amount, 0));
    const availableCredit = totalEarned - totalSpent;

    const uniqueReferees = new Set((events || []).map((e: any) => e.referee_id));

    return NextResponse.json({
      referralCode: profile?.referral_code || null,
      stats: {
        totalReferred: uniqueReferees.size,
        totalEarned,
        totalSpent,
        availableCredit,
        pendingRewards: (events || []).filter((e: any) => e.status === "pending").length,
      },
      events: (events || []).map((e: any) => ({
        ...e,
        refereeName: refereeNames[e.referee_id] || "Guest",
      })),
    });
  } catch (err: any) {
    console.error("Referral stats error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

// POST — Generate referral code
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseAdmin();

    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code, full_name")
      .eq("id", user.id)
      .single();

    if (profile?.referral_code) {
      return NextResponse.json({ referralCode: profile.referral_code });
    }

    // Generate unique code with retry
    let code = generateCode(profile?.full_name || "");
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("referral_code", code)
        .single();
      if (!existing) break;
      code = generateCode(profile?.full_name || "");
      attempts++;
    }

    await supabase
      .from("profiles")
      .update({ referral_code: code })
      .eq("id", user.id);

    return NextResponse.json({ referralCode: code });
  } catch (err: any) {
    console.error("Generate referral code error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
