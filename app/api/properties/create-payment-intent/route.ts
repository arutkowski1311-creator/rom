import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/app/lib/stripe";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const {
      propertyId,
      checkIn,
      checkOut,
      guests,
      nights,
      baseTotal,       // cents — nights × price_per_night
      cleaningFee,     // cents
      platformFee,     // cents
      damageWaiver,    // cents
      taxAmount,       // cents
      total,           // cents — full charge amount
      securityDeposit, // cents — held, not captured
      damageWaiverOpted,
      specialRequests,
      guestEmail,
    } = await req.json();

    if (!propertyId || !total || !checkIn || !checkOut) {
      return NextResponse.json({ error: "propertyId, total, checkIn, checkOut required" }, { status: 400 });
    }

    const stripe = getStripe();
    const supabase = getSupabaseAdmin();

    // Get property + owner Stripe account
    const { data: property } = await supabase
      .from("properties")
      .select("id, name, owner_stripe_id, price_per_night")
      .eq("id", propertyId)
      .single();

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Get or create guest Stripe customer
    let stripeCustomerId: string | undefined;
    if (guestEmail) {
      const customers = await stripe.customers.list({ email: guestEmail, limit: 1 });
      stripeCustomerId = customers.data.length > 0
        ? customers.data[0].id
        : (await stripe.customers.create({ email: guestEmail })).id;
    }

    // ── Main payment intent (full trip charge) ────────────────────────────────
    const intentParams: any = {
      amount: total,
      currency: "usd",
      ...(stripeCustomerId && { customer: stripeCustomerId }),
      metadata: {
        property_id: propertyId,
        property_name: property.name,
        check_in: checkIn,
        check_out: checkOut,
        guests: String(guests),
        nights: String(nights),
        base_total: String(baseTotal),
        cleaning_fee: String(cleaningFee),
        platform_fee: String(platformFee),
        damage_waiver: String(damageWaiver),
        tax_amount: String(taxAmount),
        type: "property_booking",
      },
    };

    // If owner has Stripe Connect, use destination charge
    if (property.owner_stripe_id) {
      const ownerReceives = total - platformFee;
      intentParams.transfer_data = {
        destination: property.owner_stripe_id,
        amount: ownerReceives,
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(intentParams);

    // ── Security deposit hold (manual capture, never auto-captured) ───────────
    let depositIntentId: string | null = null;
    if (securityDeposit > 0) {
      const depositIntent = await stripe.paymentIntents.create({
        amount: securityDeposit,
        currency: "usd",
        capture_method: "manual",
        ...(stripeCustomerId && { customer: stripeCustomerId }),
        metadata: {
          property_id: propertyId,
          type: "security_deposit",
          check_in: checkIn,
          check_out: checkOut,
        },
      });
      depositIntentId = depositIntent.id;
    }

    // ── Create booking record ─────────────────────────────────────────────────
    const { data: authUser } = await supabase.auth.admin.listUsers();
    // (guest_id will be set client-side after auth confirmation)
    const confirmCode = "ROM-P" + Math.random().toString(36).slice(2, 7).toUpperCase();

    const { data: booking, error: bookingErr } = await supabase
      .from("property_bookings")
      .insert({
        confirmation_code:        confirmCode,
        property_id:              propertyId,
        check_in:                 checkIn,
        check_out:                checkOut,
        guests,
        nights,
        base_total:               baseTotal / 100,
        cleaning_fee:             cleaningFee / 100,
        platform_fee:             platformFee / 100,
        damage_waiver:            damageWaiver / 100,
        total:                    total / 100,
        security_deposit:         securityDeposit / 100,
        stripe_payment_intent_id: paymentIntent.id,
        deposit_intent_id:        depositIntentId,
        damage_waiver_opted:      damageWaiverOpted || false,
        special_requests:         specialRequests || null,
        status:                   "pending",
      })
      .select()
      .single();

    if (bookingErr) throw bookingErr;

    return NextResponse.json({
      clientSecret:    paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      depositIntentId,
      bookingId:       booking.id,
      confirmCode:     booking.confirmation_code,
    });
  } catch (err: any) {
    console.error("Property payment intent error:", err);
    return NextResponse.json({ error: err.message || "Failed to create payment" }, { status: 500 });
  }
}
