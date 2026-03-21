import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Mark booking completed
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", bookingId)
      .select("*, packages(title, duration, price)")
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Upsert guest profile for CRM
    const guestId = booking.guest_id;
    const guideId = booking.guide_id;
    const tripDate = booking.trip_date;
    const tripTotal = booking.total_price || booking.packages?.price || 0;
    const tripMonth = new Date(tripDate).getMonth() + 1; // 1-12

    // Check if guest profile exists
    const { data: existing } = await supabase
      .from("guest_profiles")
      .select("*")
      .eq("profile_id", guestId)
      .eq("guide_id", guideId)
      .single();

    if (existing) {
      // Update existing profile
      const currentMonths = existing.booking_months || [];
      const updatedMonths = currentMonths.includes(tripMonth)
        ? currentMonths
        : [...currentMonths, tripMonth];

      await supabase
        .from("guest_profiles")
        .update({
          total_trips: (existing.total_trips || 0) + 1,
          total_spent: (parseFloat(existing.total_spent) || 0) + tripTotal,
          last_trip_date: tripDate,
          lifetime_value: (parseFloat(existing.lifetime_value) || 0) + tripTotal,
          booking_count: (existing.booking_count || 0) + 1,
          booking_months: updatedMonths,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      // Check VIP criteria: 3+ trips AND lifetime value >= 1500
      const newTripCount = (existing.total_trips || 0) + 1;
      const newLifetimeValue = (parseFloat(existing.lifetime_value) || 0) + tripTotal;
      if (newTripCount >= 3 && newLifetimeValue >= 1500 && !existing.vip) {
        await supabase
          .from("guest_profiles")
          .update({ vip: true })
          .eq("id", existing.id);

        // Notify guide about VIP
        await supabase.from("guide_notifications").insert({
          guide_id: guideId,
          type: "vip_detected",
          title: `${booking.guest_name || "A guest"} is now a VIP`,
          body: `${newTripCount} trips, $${Math.round(newLifetimeValue)} lifetime value.`,
          metadata: { guest_profile_id: existing.id, guest_id: guestId },
        });
      }
    } else {
      // Create new guest profile
      await supabase.from("guest_profiles").insert({
        profile_id: guestId,
        guide_id: guideId,
        notes: "",
        tags: [],
        total_trips: 1,
        total_spent: tripTotal,
        last_trip_date: tripDate,
        lifetime_value: tripTotal,
        booking_count: 1,
        first_trip_date: tripDate,
        booking_months: [tripMonth],
      });
    }

    // Create notification for guide
    await supabase.from("guide_notifications").insert({
      guide_id: guideId,
      type: "trip_completed",
      title: `Trip completed — ${booking.guest_name || "Guest"}`,
      body: `${booking.packages?.title || "Trip"} on ${new Date(tripDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}. Review request will be sent in 24hrs.`,
      metadata: { booking_id: bookingId },
    });

    return NextResponse.json({ success: true, booking });
  } catch (err: any) {
    console.error("Complete booking error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
