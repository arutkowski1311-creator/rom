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

// POST — Apply a referral code during signup
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { referralCode } = await req.json();
    if (!referralCode) {
      return NextResponse.json({ error: "referralCode required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Find referrer by code
    const { data: referrer } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("referral_code", referralCode.toUpperCase().trim())
      .single();

    if (!referrer) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
    }

    // Can't refer yourself
    if (referrer.id === user.id) {
      return NextResponse.json({ error: "Cannot use your own referral code" }, { status: 400 });
    }

    // Check if already referred
    const { data: existing } = await supabase
      .from("profiles")
      .select("referred_by")
      .eq("id", user.id)
      .single();

    if (existing?.referred_by) {
      return NextResponse.json({ error: "Already used a referral code" }, { status: 400 });
    }

    // Set referred_by
    await supabase
      .from("profiles")
      .update({ referred_by: referrer.id })
      .eq("id", user.id);

    // Create signup event (pending — reward triggers on first booking)
    await supabase.from("referral_events").insert({
      referrer_id: referrer.id,
      referee_id: user.id,
      event_type: "signup",
      reward_amount: 0,
      status: "pending",
    });

    return NextResponse.json({
      success: true,
      referrerName: (referrer.full_name || "").split(" ")[0] + " " + ((referrer.full_name || "").split(" ")[1] || "")[0] + ".",
    });
  } catch (err: any) {
    console.error("Apply referral error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
