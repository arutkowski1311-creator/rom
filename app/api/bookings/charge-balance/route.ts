import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/app/lib/stripe";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    const stripe = getStripe();
    const supabase = getSupabaseAdmin();

    // Fetch booking
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bErr || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "confirmed") {
      return NextResponse.json({ error: "Booking must be confirmed to charge balance" }, { status: 400 });
    }

    if (booking.balance_paid_at) {
      return NextResponse.json({ error: "Balance already paid" }, { status: 400 });
    }

    // Calculate balance amount
    const totalCents = Math.round((booking.total_price || 0) * 100);
    const depositCents = Math.round(totalCents * 0.25);
    const balanceCents = totalCents - depositCents;

    if (balanceCents <= 0) {
      return NextResponse.json({ error: "No balance to charge" }, { status: 400 });
    }

    // Get guide's Stripe account
    const { data: guide } = await supabase
      .from("guides")
      .select("stripe_account_id")
      .eq("id", booking.guide_id)
      .single();

    if (!guide?.stripe_account_id) {
      return NextResponse.json({ error: "Guide has no Stripe account" }, { status: 400 });
    }

    // Get guest's Stripe customer from deposit payment
    const { data: depositPayment } = await supabase
      .from("payments")
      .select("stripe_payment_intent_id")
      .eq("booking_id", bookingId)
      .eq("type", "deposit")
      .eq("status", "succeeded")
      .single();

    if (!depositPayment?.stripe_payment_intent_id) {
      return NextResponse.json({ error: "No deposit payment found" }, { status: 400 });
    }

    // Get customer from original payment intent
    const originalPI = await stripe.paymentIntents.retrieve(depositPayment.stripe_payment_intent_id);
    const customerId = originalPI.customer as string;

    if (!customerId) {
      return NextResponse.json({ error: "No customer on file for balance charge" }, { status: 400 });
    }

    // Get customer's default payment method
    const customer = await stripe.customers.retrieve(customerId);
    const defaultPM = (customer as any).invoice_settings?.default_payment_method ||
                      (customer as any).default_source;

    if (!defaultPM) {
      // Fallback: try to find any saved payment method on the customer
      const methods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
      });
      if (methods.data.length > 0) {
        const fallbackPM = methods.data[0].id;
        // Use the fallback PM and set it as default for future charges
        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: fallbackPM },
        });
        // Continue with this PM (reassign defaultPM via the payment intent below)
        const SERVICE_FEE_RATE = 0.15;
        const tripPriceAmountFB = Math.round(balanceCents / (1 + SERVICE_FEE_RATE));
        const serviceFeeAmountFB = balanceCents - tripPriceAmountFB;

        const paymentIntent = await stripe.paymentIntents.create({
          amount: balanceCents,
          currency: "usd",
          customer: customerId,
          payment_method: fallbackPM,
          off_session: true,
          confirm: true,
          transfer_data: {
            destination: guide.stripe_account_id,
            amount: tripPriceAmountFB,
          },
          metadata: {
            booking_id: bookingId,
            guide_id: booking.guide_id,
            type: "balance",
            service_fee_rate: SERVICE_FEE_RATE.toString(),
            service_fee_amount: serviceFeeAmountFB.toString(),
          },
        });

        await supabase.from("payments").insert({
          booking_id: bookingId,
          guide_id: booking.guide_id,
          stripe_payment_intent_id: paymentIntent.id,
          amount: balanceCents,
          type: "balance",
          status: paymentIntent.status === "succeeded" ? "succeeded" : "pending",
          service_fee_rate: SERVICE_FEE_RATE,
          service_fee_amount: serviceFeeAmountFB,
          guide_payout_amount: tripPriceAmountFB,
        });

        if (paymentIntent.status === "succeeded") {
          await supabase.from("bookings").update({
            balance_paid_at: new Date().toISOString(),
            balance_payment_id: paymentIntent.id,
          }).eq("id", bookingId);

          await supabase.from("guide_notifications").insert({
            guide_id: booking.guide_id,
            type: "balance_charged",
            title: `Balance collected — ${booking.guest_name || "Guest"}`,
            body: `$${(balanceCents / 100).toFixed(2)} charged for ${booking.package_title || "trip"} on ${booking.trip_date}.`,
            metadata: { booking_id: bookingId },
          });
        }

        return NextResponse.json({ success: true, paymentIntentId: paymentIntent.id });
      }

      // No saved payment method at all — notify guide to collect manually
      await supabase.from("guide_notifications").insert({
        guide_id: booking.guide_id,
        type: "balance_charge_failed",
        title: `Balance charge failed — ${booking.guest_name || "Guest"}`,
        body: `No payment method on file. Collect $${(balanceCents / 100).toFixed(2)} balance manually.`,
        metadata: { booking_id: bookingId },
      });
      return NextResponse.json({ error: "No payment method on file", needsManualCollection: true }, { status: 400 });
    }

    // Service fee split
    const SERVICE_FEE_RATE = 0.15;
    const tripPriceAmount = Math.round(balanceCents / (1 + SERVICE_FEE_RATE));
    const serviceFeeAmount = balanceCents - tripPriceAmount;

    // Charge balance
    const paymentIntent = await stripe.paymentIntents.create({
      amount: balanceCents,
      currency: "usd",
      customer: customerId,
      payment_method: defaultPM as string,
      off_session: true,
      confirm: true,
      transfer_data: {
        destination: guide.stripe_account_id,
        amount: tripPriceAmount,
      },
      metadata: {
        booking_id: bookingId,
        guide_id: booking.guide_id,
        type: "balance",
        service_fee_rate: SERVICE_FEE_RATE.toString(),
        service_fee_amount: serviceFeeAmount.toString(),
      },
    });

    // Record payment
    await supabase.from("payments").insert({
      booking_id: bookingId,
      guide_id: booking.guide_id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: balanceCents,
      type: "balance",
      status: paymentIntent.status === "succeeded" ? "succeeded" : "pending",
      service_fee_rate: SERVICE_FEE_RATE,
      service_fee_amount: serviceFeeAmount,
      guide_payout_amount: tripPriceAmount,
    });

    // Update booking
    if (paymentIntent.status === "succeeded") {
      await supabase
        .from("bookings")
        .update({
          balance_paid_at: new Date().toISOString(),
          balance_payment_id: paymentIntent.id,
        })
        .eq("id", bookingId);

      // Notify guide
      await supabase.from("guide_notifications").insert({
        guide_id: booking.guide_id,
        type: "balance_charged",
        title: `Balance collected — ${booking.guest_name || "Guest"}`,
        body: `$${(balanceCents / 100).toFixed(2)} charged for ${booking.package_title || "trip"} on ${booking.trip_date}.`,
        metadata: { booking_id: bookingId },
      });
    }

    return NextResponse.json({ success: true, paymentIntentId: paymentIntent.id });
  } catch (err: any) {
    console.error("Charge balance error:", err);

    // Handle card decline
    if (err.type === "StripeCardError") {
      return NextResponse.json({ error: "Card declined", needsManualCollection: true }, { status: 400 });
    }

    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
