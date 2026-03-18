import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { guideId } = await req.json();

    if (!guideId) {
      return NextResponse.json({ error: "guideId required" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: guide } = await supabase
      .from("guides")
      .select("stripe_account_id")
      .eq("id", guideId)
      .single();

    if (!guide?.stripe_account_id) {
      return NextResponse.json({ error: "No Stripe account found" }, { status: 404 });
    }

    // Check if onboarding is complete with Stripe
    const account = await stripe.accounts.retrieve(guide.stripe_account_id);
    const isComplete = account.details_submitted;

    if (isComplete) {
      await supabase
        .from("guides")
        .update({ stripe_onboarding_complete: true })
        .eq("id", guideId);
    }

    return NextResponse.json({ complete: isComplete });
  } catch (err) {
    console.error("Stripe callback error:", err);
    return NextResponse.json({ error: "Failed to verify account" }, { status: 500 });
  }
}
