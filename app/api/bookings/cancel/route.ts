import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/app/lib/stripe";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { bookingId, reason, initiatedBy } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    const stripe = getStripe();
    const supabase = getSupabaseAdmin();

    // Fetch booking + guide + payment info
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bErr || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status === "cancelled" || booking.status === "completed") {
      return NextResponse.json({ error: `Cannot cancel a ${booking.status} booking` }, { status: 400 });
    }

    // Fetch deposit payment for refund
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("type", "deposit")
      .eq("status", "succeeded")
      .single();

    let refundAmount = 0;
    let refundStripeId = null;

    if (payment?.stripe_payment_intent_id) {
      try {
        // Issue full refund of the deposit
        const refund = await stripe.refunds.create({
          payment_intent: payment.stripe_payment_intent_id,
        });
        refundAmount = refund.amount / 100;
        refundStripeId = refund.id;

        // Record refund in payments
        await supabase.from("payments").insert({
          booking_id: bookingId,
          guide_id: booking.guide_id,
          stripe_payment_intent_id: payment.stripe_payment_intent_id,
          amount: -refund.amount,
          type: "refund",
          status: "succeeded",
          service_fee_rate: 0,
          service_fee_amount: 0,
          guide_payout_amount: 0,
        });
      } catch (stripeErr: any) {
        console.error("Stripe refund error:", stripeErr);
        // Continue with cancellation even if refund fails
      }
    }

    // Update booking
    await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || null,
        refund_amount: refundAmount,
        refund_stripe_id: refundStripeId,
      })
      .eq("id", bookingId);

    // Unblock the date on availability
    await supabase
      .from("availability")
      .delete()
      .eq("guide_id", booking.guide_id)
      .eq("date", booking.trip_date);

    // Notify guide if guest initiated, or notify guest if guide initiated
    const guideId = booking.guide_id;

    if (initiatedBy === "guest") {
      await supabase.from("guide_notifications").insert({
        guide_id: guideId,
        type: "booking_cancelled",
        title: `${booking.guest_name || "Guest"} cancelled their trip`,
        body: reason ? `Reason: ${reason}` : `${booking.package_title || "Trip"} on ${booking.trip_date}. ${refundAmount > 0 ? `$${refundAmount} refunded.` : ""}`,
        metadata: { booking_id: bookingId },
      });
    }

    // Send cancellation email to guest
    if (booking.guest_email) {
      await resend.emails.send({
        from: "RŌM <bookings@romlife.co>",
        to: booking.guest_email,
        subject: `Booking cancelled — ${booking.package_title || "Trip"}`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
            <div style="background: #0d0d0d; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
              <div style="font-size: 28px; letter-spacing: 0.12em; color: #c9a96e; font-weight: 300;">RŌM</div>
            </div>
            <div style="background: #f9f7f4; padding: 36px; border-radius: 0 0 8px 8px;">
              <h1 style="font-size: 22px; font-weight: 500; margin: 0 0 8px;">Your booking has been cancelled.</h1>
              <p style="color: #555; font-size: 15px; margin: 0 0 24px;">
                ${booking.package_title || "Trip"} on ${booking.trip_date} has been cancelled.
                ${refundAmount > 0 ? `A refund of $${refundAmount.toFixed(2)} will appear on your statement within 5-10 business days.` : ""}
              </p>
              <a href="https://romlife.co/dashboard" style="display: block; background: #c9a96e; color: #0d0d0d; text-decoration: none; text-align: center; padding: 14px; border-radius: 6px; font-weight: 700; font-size: 14px;">
                Browse More Guides →
              </a>
            </div>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true, refundAmount, refundStripeId });
  } catch (err: any) {
    console.error("Cancel booking error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
