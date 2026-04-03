import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/app/lib/stripe";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const stripe = getStripe();

    const { data: booking } = await supabase
      .from("property_bookings")
      .select("id, deposit_intent_id, deposit_released_at, status")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.deposit_released_at) {
      return NextResponse.json({ message: "Deposit already released" });
    }

    if (booking.deposit_intent_id) {
      try {
        await stripe.paymentIntents.cancel(booking.deposit_intent_id);
      } catch (stripeErr: any) {
        // If already cancelled or captured, log but don't fail
        console.warn("Stripe cancel warning:", stripeErr.message);
      }
    }

    await supabase
      .from("property_bookings")
      .update({
        deposit_released_at: new Date().toISOString(),
        status: "completed",
      })
      .eq("id", bookingId);

    return NextResponse.json({ success: true, message: "Security deposit released" });
  } catch (err: any) {
    console.error("Release deposit error:", err);
    return NextResponse.json({ error: err.message || "Failed to release deposit" }, { status: 500 });
  }
}
