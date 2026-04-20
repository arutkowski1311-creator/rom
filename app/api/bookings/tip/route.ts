import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/app/lib/stripe";
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

// POST — Create a tip PaymentIntent (100% goes to guide, no platform fee)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bookingId, amount } = await req.json(); // amount in cents
    if (!bookingId || !amount || amount < 100) {
      return NextResponse.json({ error: "bookingId and amount (min $1) required" }, { status: 400 });
    }

    const stripe = getStripe();
    const supabase = getSupabaseAdmin();

    // Fetch booking
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("guest_id", user.id)
      .single();

    if (bErr || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "completed" && booking.status !== "deposit_paid" && booking.status !== "confirmed") {
      return NextResponse.json({ error: "Can only tip on completed or confirmed bookings" }, { status: 400 });
    }

    if (booking.tip_paid_at) {
      return NextResponse.json({ error: "Tip already sent for this booking" }, { status: 400 });
    }

    // Get guide's Stripe Connect account
    const { data: guide } = await supabase
      .from("guides")
      .select("stripe_account_id")
      .eq("id", booking.guide_id)
      .single();

    if (!guide?.stripe_account_id) {
      return NextResponse.json({ error: "Guide has no Stripe account" }, { status: 400 });
    }

    // Get or create Stripe customer for guest
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({ email: user.email! });
        customerId = customer.id;
      }
      await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    // Create PaymentIntent — 100% goes to guide (no platform cut on tips)
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      customer: customerId,
      transfer_data: {
        destination: guide.stripe_account_id,
        amount, // guide gets 100%
      },
      metadata: {
        booking_id: bookingId,
        guide_id: booking.guide_id,
        type: "tip",
      },
    });

    // Record payment
    await supabase.from("payments").insert({
      booking_id: bookingId,
      guide_id: booking.guide_id,
      stripe_payment_intent_id: paymentIntent.id,
      amount,
      type: "tip",
      status: "pending",
      service_fee_rate: 0,
      service_fee_amount: 0,
      guide_payout_amount: amount,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err: any) {
    console.error("Tip error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
