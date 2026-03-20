import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/app/lib/stripe";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { guideId, returnTo } = body;

    if (!guideId) {
      return NextResponse.json({ error: "guideId required" }, { status: 400 });
    }

    const stripe = getStripe();
    const supabase = getSupabaseAdmin();

    // Check if guide already has a Stripe account
    const { data: guide } = await supabase
      .from("guides")
      .select("stripe_account_id, stripe_onboarding_complete")
      .eq("id", guideId)
      .single();

    let accountId = guide?.stripe_account_id;

    // Create a new Stripe Connect account if none exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;

      // Save to Supabase
      await supabase
        .from("guides")
        .update({ stripe_account_id: accountId })
        .eq("id", guideId);
    }

    // Return to onboarding or dashboard after Stripe
    const basePath = returnTo === "onboarding" ? "/guide/onboarding" : "/guide/dashboard";

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}${basePath}?stripe=refresh&guide_id=${guideId}`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}${basePath}?stripe=success&guide_id=${guideId}`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    console.error("Stripe Connect error:", err);
    return NextResponse.json({ error: "Failed to create Connect account" }, { status: 500 });
  }
}
