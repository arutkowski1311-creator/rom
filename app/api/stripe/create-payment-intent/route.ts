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

    // Get guide's Stripe Connect account
    const { data: guide } = await supabase
      .from("guides")
      .select("stripe_account_id, stripe_onboarding_complete")
      .eq("id", guideId)
      .single();

    if (!guide?.stripe_account_id || !guide?.stripe_onboarding_complete) {
      return NextResponse.json(
        { error: "Guide has not completed Stripe setup" },
        { status: 400 }
      );
    }

    // Guest-side service fee model: amount is the total the guest pays (trip price + 15% fee)
    // ROM keeps the service fee, guide gets 100% of their listed price
    const SERVICE_FEE_RATE = 0.15;
    const tripPriceAmount = Math.round(amount / (1 + SERVICE_FEE_RATE));
    const serviceFeeAmount = amount - tripPriceAmount;

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
        amount: tripPriceAmount, // guide receives 100% of their listed price
      },
      metadata: {
        booking_id: bookingId || "",
        guide_id: guideId,
        type,
        service_fee_rate: SERVICE_FEE_RATE.toString(),
        service_fee_amount: serviceFeeAmount.toString(),
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
        service_fee_rate: SERVICE_FEE_RATE,
        service_fee_amount: serviceFeeAmount,
        guide_payout_amount: tripPriceAmount,
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
