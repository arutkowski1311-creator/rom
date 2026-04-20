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

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bookingId, newDate, newGuests } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }
    if (!newDate && !newGuests) {
      return NextResponse.json({ error: "newDate or newGuests required" }, { status: 400 });
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

    // Only allow modifications before balance is charged
    if (booking.balance_paid_at) {
      return NextResponse.json({ error: "Cannot modify — balance already charged" }, { status: 400 });
    }
    if (booking.status === "cancelled" || booking.status === "completed") {
      return NextResponse.json({ error: `Cannot modify — booking is ${booking.status}` }, { status: 400 });
    }

    const originalDate = booking.trip_date;
    const originalGuests = booking.guests;

    // Validate new date availability
    if (newDate && newDate !== originalDate) {
      const { data: blocks } = await supabase
        .from("availability")
        .select("date")
        .eq("guide_id", booking.guide_id)
        .eq("date", newDate)
        .eq("status", "blocked");

      if (blocks && blocks.length > 0) {
        return NextResponse.json({ error: "Selected date is not available" }, { status: 400 });
      }
    }

    // Recalculate pricing if guests changed
    const SERVICE_FEE_RATE = 0.15;
    const TRIP_PROTECTION_RATE = 0.08;
    const effectiveGuests = newGuests || originalGuests;
    const effectiveDate = newDate || originalDate;

    let priceDifference = 0;
    let newTotal = booking.total;

    if (newGuests && newGuests !== originalGuests && booking.price_type === "person") {
      const packagePrice = parseFloat(booking.package_price) || 0;
      const newSubtotal = packagePrice * effectiveGuests;
      const newServiceFee = Math.round(newSubtotal * SERVICE_FEE_RATE);
      const newProtection = booking.trip_protection
        ? Math.round(newSubtotal * TRIP_PROTECTION_RATE) : 0;
      newTotal = newSubtotal + newServiceFee + newProtection;
      priceDifference = newTotal - parseFloat(booking.total);
    }

    const priceDiffCents = Math.round(priceDifference * 100);
    let clientSecret = null;
    let refundAmount = null;

    if (priceDiffCents > 0) {
      // Additional charge needed — create PaymentIntent
      const { data: guide } = await supabase
        .from("guides")
        .select("stripe_account_id")
        .eq("id", booking.guide_id)
        .single();

      if (guide?.stripe_account_id) {
        const tripPriceAmount = Math.round(priceDiffCents / (1 + SERVICE_FEE_RATE));
        const serviceFeeAmount = priceDiffCents - tripPriceAmount;

        // Get guest's Stripe customer
        const { data: profile } = await supabase
          .from("profiles")
          .select("stripe_customer_id")
          .eq("id", user.id)
          .single();

        const piParams: any = {
          amount: priceDiffCents,
          currency: "usd",
          transfer_data: {
            destination: guide.stripe_account_id,
            amount: tripPriceAmount,
          },
          metadata: {
            booking_id: bookingId,
            guide_id: booking.guide_id,
            type: "modification",
            service_fee_rate: SERVICE_FEE_RATE.toString(),
            service_fee_amount: serviceFeeAmount.toString(),
          },
        };
        if (profile?.stripe_customer_id) {
          piParams.customer = profile.stripe_customer_id;
        }

        const paymentIntent = await stripe.paymentIntents.create(piParams);
        clientSecret = paymentIntent.client_secret;

        // Record modification (pending payment)
        await supabase.from("booking_modifications").insert({
          booking_id: bookingId,
          booking_type: "guide",
          requested_by: user.id,
          original_date: newDate ? originalDate : null,
          new_date: newDate || null,
          original_guests: newGuests ? originalGuests : null,
          new_guests: newGuests || null,
          price_difference: priceDifference,
          status: "pending",
          stripe_payment_intent_id: paymentIntent.id,
        });

        return NextResponse.json({
          success: true,
          priceDifference: priceDiffCents,
          clientSecret,
          needsPayment: true,
        });
      }
    } else if (priceDiffCents < 0) {
      // Partial refund on deposit
      const refundCents = Math.abs(priceDiffCents);
      if (booking.deposit_payment_id) {
        try {
          const refund = await stripe.refunds.create({
            payment_intent: booking.deposit_payment_id,
            amount: Math.min(refundCents, Math.round(parseFloat(booking.deposit) * 100)),
          });
          refundAmount = refund.amount;
        } catch (err: any) {
          console.error("Partial refund error:", err.message);
        }
      }
    }

    // Apply the modification
    const updates: any = {};
    if (newDate) updates.trip_date = effectiveDate;
    if (newGuests) {
      updates.guests = effectiveGuests;
      if (booking.price_type === "person") {
        const packagePrice = parseFloat(booking.package_price) || 0;
        updates.subtotal = packagePrice * effectiveGuests;
        updates.service_fee = Math.round(updates.subtotal * SERVICE_FEE_RATE);
        updates.trip_protection_amount = booking.trip_protection
          ? Math.round(updates.subtotal * TRIP_PROTECTION_RATE) : 0;
        updates.total = newTotal;
        updates.total_price = newTotal;
        updates.deposit = Math.round(newTotal * 0.25 * 100) / 100;
        updates.balance = Math.round(newTotal * 0.75 * 100) / 100;
      }
    }

    await supabase.from("bookings").update(updates).eq("id", bookingId);

    // Update availability blocks if date changed
    if (newDate && newDate !== originalDate) {
      await supabase.from("availability")
        .delete()
        .eq("guide_id", booking.guide_id)
        .eq("date", originalDate)
        .eq("status", "blocked");

      await supabase.from("availability").insert({
        guide_id: booking.guide_id,
        date: effectiveDate,
        status: "blocked",
      });
    }

    // Record modification
    await supabase.from("booking_modifications").insert({
      booking_id: bookingId,
      booking_type: "guide",
      requested_by: user.id,
      original_date: newDate ? originalDate : null,
      new_date: newDate || null,
      original_guests: newGuests ? originalGuests : null,
      new_guests: newGuests || null,
      price_difference: priceDifference,
      status: "completed",
      refund_stripe_id: refundAmount ? "refund" : null,
      resolved_at: new Date().toISOString(),
    });

    // Notify guide
    await supabase.from("guide_notifications").insert({
      guide_id: booking.guide_id,
      type: "booking_modified",
      title: `Booking modified — ${booking.guide_name || "Guest"}`,
      body: [
        newDate ? `Date: ${originalDate} → ${effectiveDate}` : null,
        newGuests ? `Guests: ${originalGuests} → ${effectiveGuests}` : null,
      ].filter(Boolean).join(". "),
      metadata: { booking_id: bookingId },
    });

    return NextResponse.json({
      success: true,
      priceDifference: priceDiffCents,
      refundAmount: refundAmount || 0,
      needsPayment: false,
    });
  } catch (err: any) {
    console.error("Modify booking error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
