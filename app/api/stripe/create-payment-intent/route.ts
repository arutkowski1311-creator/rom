import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/app/lib/stripe";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const {
      bookingId,
      amount, // cents
      guideId,
      guestEmail,
      type, // 'deposit' or 'balance'
    } = await req.json();

    if (!amount || !guideId) {
      return NextResponse.json({ error: "amount and guideId required" }, { status: 400 });
    }

    const stripe = getStripe();
    const supabase = getSupabaseAdmin();

    // Get guide's Stripe Connect account and commission rate
    const { data: guide } = await supabase
      .from("guides")
      .select("stripe_account_id, stripe_onboarding_complete, subscription_tier")
      .eq("id", guideId)
      .single();

    if (!guide?.stripe_account_id || !guide?.stripe_onboarding_complete) {
      return NextResponse.json(
        { error: "Guide has not completed Stripe setup" },
        { status: 400 }
      );
    }

    // Calculate commission based on guide's tier
    const commissionRates: Record<string, number> = {
      spark: 0.20,
      discover: 0.15,
      immerse: 0.12,
    };
    const tier = guide.subscription_tier || "spark";
    const commissionRate = commissionRates[tier] || 0.20;
    const commissionAmount = Math.round(amount * commissionRate);
    const guideAmount = amount - commissionAmount;

    // Get or create Stripe Customer for guest
    let stripeCustomerId: string | undefined;
    if (guestEmail) {
      const customers = await stripe.customers.list({ email: guestEmail, limit: 1 });
      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({ email: guestEmail });
        stripeCustomerId = customer.id;
      }
    }

    // Create PaymentIntent with destination charge
    // ROM collects the full amount, then transfers guide's share
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      ...(stripeCustomerId && { customer: stripeCustomerId }),
      transfer_data: {
        destination: guide.stripe_account_id,
        amount: guideAmount, // guide receives total minus commission
      },
      metadata: {
        booking_id: bookingId || "",
        guide_id: guideId,
        type,
        commission_rate: commissionRate.toString(),
        commission_amount: commissionAmount.toString(),
      },
    });

    // Record payment in DB
    if (bookingId) {
      await supabase.from("payments").insert({
        booking_id: bookingId,
        guide_id: guideId,
        stripe_payment_intent_id: paymentIntent.id,
        amount,
        type,
        status: "pending",
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        guide_payout_amount: guideAmount,
      });

      // Update booking with payment ID
      const updateField = type === "deposit" ? "deposit_payment_id" : "balance_payment_id";
      await supabase
        .from("bookings")
        .update({ [updateField]: paymentIntent.id })
        .eq("id", bookingId);
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err: any) {
    console.error("Create payment intent error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create payment" },
      { status: 500 }
    );
  }
}
