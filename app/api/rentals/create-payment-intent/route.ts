import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/app/lib/stripe";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const {
      rentalId,
      rentalDate,
      duration,       // 'half_day' | 'full_day'
      destination,
      passengers,
      basePrice,      // cents
      platformFee,    // cents
      total,          // cents
      guestEmail,
      specialRequests,
      propertyBookingId,
    } = await req.json();

    if (!rentalId || !total || !rentalDate || !duration) {
      return NextResponse.json({ error: "rentalId, total, rentalDate, duration required" }, { status: 400 });
    }

    const stripe = getStripe();
    const supabase = getSupabaseAdmin();

    const { data: rental } = await supabase
      .from("rentals")
      .select("id, name, owner_stripe_id")
      .eq("id", rentalId)
      .single();

    if (!rental) return NextResponse.json({ error: "Rental not found" }, { status: 404 });

    // Get or create Stripe customer
    let stripeCustomerId: string | undefined;
    if (guestEmail) {
      const customers = await stripe.customers.list({ email: guestEmail, limit: 1 });
      stripeCustomerId = customers.data.length > 0
        ? customers.data[0].id
        : (await stripe.customers.create({ email: guestEmail })).id;
    }

    const intentParams: any = {
      amount: total,
      currency: "usd",
      ...(stripeCustomerId && { customer: stripeCustomerId }),
      metadata: {
        rental_id: rentalId,
        rental_name: rental.name,
        rental_date: rentalDate,
        duration,
        destination: destination || "",
        driver_requested: "false",
        type: "rental_booking",
      },
    };

    if (rental.owner_stripe_id) {
      intentParams.transfer_data = {
        destination: rental.owner_stripe_id,
        amount: total - platformFee,
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(intentParams);

    // Create booking record
    const confirmCode = "ROM-R" + Math.random().toString(36).slice(2, 7).toUpperCase();

    const { data: booking, error: bookingErr } = await supabase
      .from("rental_bookings")
      .insert({
        confirmation_code:        confirmCode,
        rental_id:                rentalId,
        rental_date:              rentalDate,
        duration,
        destination:              destination || null,
        driver_requested:         false,
        passengers:               passengers || 1,
        base_price:               basePrice / 100,
        driver_fee:               0,
        platform_fee:             platformFee / 100,
        total:                    total / 100,
        stripe_payment_intent_id: paymentIntent.id,
        property_booking_id:      propertyBookingId || null,
        special_requests:         specialRequests || null,
        status:                   "pending",
      })
      .select()
      .single();

    if (bookingErr) throw bookingErr;

    return NextResponse.json({
      clientSecret:    paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      bookingId:       booking.id,
      confirmCode:     booking.confirmation_code,
    });
  } catch (err: any) {
    console.error("Rental payment intent error:", err);
    return NextResponse.json({ error: err.message || "Failed to create payment" }, { status: 500 });
  }
}
