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

// GET — Check available credit
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data: credits } = await supabase
      .from("referral_credits")
      .select("amount")
      .eq("profile_id", user.id);

    const balance = (credits || []).reduce((s: number, c: any) => s + c.amount, 0);
    return NextResponse.json({ availableCredit: Math.max(0, balance) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

// POST — Apply credit to a booking
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bookingId, applyAmount } = await req.json();
    if (!bookingId || !applyAmount || applyAmount <= 0) {
      return NextResponse.json({ error: "bookingId and positive applyAmount required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Check balance
    const { data: credits } = await supabase
      .from("referral_credits")
      .select("amount")
      .eq("profile_id", user.id);

    const balance = (credits || []).reduce((s: number, c: any) => s + c.amount, 0);
    const actualApply = Math.min(applyAmount, balance);

    if (actualApply <= 0) {
      return NextResponse.json({ error: "No credit available" }, { status: 400 });
    }

    // Deduct credit
    await supabase.from("referral_credits").insert({
      profile_id: user.id,
      amount: -actualApply,
      booking_id: bookingId,
      description: "Applied to booking",
    });

    const remaining = balance - actualApply;
    return NextResponse.json({ applied: actualApply, remainingCredit: Math.max(0, remaining) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
