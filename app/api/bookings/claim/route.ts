import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST — Guest submits a trip protection claim
export async function POST(req: Request) {
  try {
    const { bookingId, guestId, claimType, description } = await req.json();

    if (!bookingId || !guestId || !claimType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the booking exists, belongs to this guest, and has trip protection
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, guide_id, guest_id, trip_protection, trip_protection_status, trip_protection_amount, total, trip_date, status")
      .eq("id", bookingId)
      .single();

    if (bErr || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.guest_id !== guestId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!booking.trip_protection) {
      return NextResponse.json({ error: "This booking does not have trip protection" }, { status: 400 });
    }

    if (booking.trip_protection_status === "claimed" || booking.trip_protection_status === "refunded") {
      return NextResponse.json({ error: "A claim has already been filed for this booking" }, { status: 400 });
    }

    // Check cancellation window (48+ hours before trip)
    const tripDate = new Date(booking.trip_date + "T00:00:00");
    const now = new Date();
    const hoursUntilTrip = (tripDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    let eligible = true;
    let reason = "";

    if (claimType === "cancellation" && hoursUntilTrip < 24) {
      eligible = false;
      reason = "Cancellations less than 24 hours before the trip are not covered unless for medical reasons.";
    }

    // Medical claims are always eligible regardless of timing
    if (claimType === "medical") {
      eligible = true;
      reason = "";
    }

    // Guide cancellations and weather are always covered
    if (claimType === "guide_cancel" || claimType === "weather") {
      eligible = true;
      reason = "";
    }

    // Calculate refund amount
    // Full trip total minus the protection fee itself
    const refundAmount = eligible ? booking.total - (booking.trip_protection_amount || 0) : 0;

    // Create the claim record
    const { data: claim, error: claimErr } = await supabase
      .from("insurance_claims")
      .insert({
        booking_id: bookingId,
        guide_id: booking.guide_id,
        guest_id: guestId,
        claim_type: claimType,
        description: description || "",
        amount_requested: refundAmount,
        status: eligible ? "approved" : "pending", // Auto-approve eligible claims
        amount_approved: eligible ? refundAmount : null,
      })
      .select()
      .single();

    if (claimErr) {
      console.error("Claim creation error:", claimErr);
      return NextResponse.json({ error: "Failed to create claim" }, { status: 500 });
    }

    // If auto-approved, update the booking
    if (eligible) {
      await supabase.from("bookings").update({
        trip_protection_status: "claimed",
        trip_protection_claimed_at: new Date().toISOString(),
        trip_protection_claim_reason: claimType,
        trip_protection_refund_amount: refundAmount,
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: `Trip protection claim: ${claimType}`,
      }).eq("id", bookingId);

      // TODO: Process actual Stripe refund here when payments are live
      // await stripe.refunds.create({ payment_intent: booking.deposit_intent_id, amount: refundAmount * 100 });
    }

    // Notify the guide
    await supabase.from("guide_notifications").insert({
      guide_id: booking.guide_id,
      type: "booking",
      title: `Trip protection claim filed`,
      body: `A guest filed a ${claimType} claim for their ${booking.trip_date} booking. ${eligible ? "Auto-approved — refund processing." : "Requires review."}`,
      metadata: { booking_id: bookingId, claim_id: claim.id, claim_type: claimType, eligible },
    });

    return NextResponse.json({
      success: true,
      claim: {
        id: claim.id,
        status: claim.status,
        eligible,
        refundAmount: eligible ? refundAmount : 0,
        reason: reason || (eligible ? "Claim approved. Refund will be processed." : "Claim submitted for review."),
      },
    });
  } catch (e: any) {
    console.error("Claim error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET — Guest checks claim status
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("bookingId");
  const guestId = searchParams.get("guestId");

  if (!bookingId || !guestId) {
    return NextResponse.json({ error: "Missing bookingId or guestId" }, { status: 400 });
  }

  const { data: claims } = await supabase
    .from("insurance_claims")
    .select("*")
    .eq("booking_id", bookingId)
    .eq("guest_id", guestId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ claims: claims || [] });
}
