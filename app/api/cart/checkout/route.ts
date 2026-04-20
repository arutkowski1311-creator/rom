import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

function genConfirmCode() {
  return "ROM-" + Math.floor(10000 + Math.random() * 90000);
}

async function getAuthUser(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: req.headers.get("authorization") || "" } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// POST — Create trip and all booking records (no payment intents here — those are created client-side)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { items, tripName, tripPlanId } = await req.json();
    if (!items?.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Create trip
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .insert({
        guest_id: user.id,
        name: tripName || null,
        trip_plan_id: tripPlanId || null,
        status: "checkout",
      })
      .select("id")
      .single();

    if (tripErr) {
      console.error("Trip creation error:", tripErr);
      return NextResponse.json({ error: "Failed to create trip" }, { status: 500 });
    }

    const bookings: any[] = [];

    for (const item of items) {
      const confirmCode = genConfirmCode();

      if (item.type === "guide") {
        const { data: booking, error } = await supabase
          .from("bookings")
          .insert({
            guest_id: user.id,
            guide_id: item.guideId,
            package_id: item.packageId || null,
            trip_date: item.date,
            guests: item.guests,
            special_requests: item.specialRequests || null,
            package_title: item.packageTitle,
            guide_name: item.guideName,
            guide_slug: item.guideSlug,
            guide_location: item.guideLocation || null,
            price_type: item.priceType,
            package_price: item.packagePrice,
            subtotal: item.subtotal,
            service_fee: item.serviceFee,
            service_fee_rate: 0.15,
            trip_protection: item.tripProtection || false,
            trip_protection_rate: item.tripProtection ? 0.08 : 0,
            trip_protection_amount: item.tripProtectionAmount || 0,
            total: item.totalPrice / 100, // cents to dollars
            total_price: item.totalPrice / 100,
            deposit: (item.totalPrice * 0.25) / 100,
            balance: (item.totalPrice * 0.75) / 100,
            confirmation_code: confirmCode,
            status: "pending",
            trip_id: trip.id,
          })
          .select("id")
          .single();

        if (error) {
          console.error("Guide booking error:", error);
          continue;
        }
        bookings.push({ type: "guide", bookingId: booking.id, confirmCode, guideId: item.guideId });
      }

      if (item.type === "property") {
        const { data: booking, error } = await supabase
          .from("property_bookings")
          .insert({
            guest_id: user.id,
            property_id: item.propertyId,
            check_in: item.checkIn,
            check_out: item.checkOut,
            guests: item.guests,
            nights: item.nights,
            base_total: item.baseTotal / 100,
            cleaning_fee: item.cleaningFee / 100,
            platform_fee: item.platformFee / 100,
            damage_waiver: item.damageWaiver / 100,
            tax_amount: item.taxAmount / 100,
            total: item.total / 100,
            damage_waiver_opted: item.damageWaiverOpted || false,
            special_requests: item.specialRequests || null,
            confirmation_code: confirmCode,
            status: "pending",
            trip_id: trip.id,
          })
          .select("id")
          .single();

        if (error) {
          console.error("Property booking error:", error);
          continue;
        }
        bookings.push({ type: "property", bookingId: booking.id, confirmCode, propertyId: item.propertyId });
      }

      if (item.type === "rental") {
        const { data: booking, error } = await supabase
          .from("rental_bookings")
          .insert({
            guest_id: user.id,
            rental_id: item.rentalId,
            rental_date: item.rentalDate,
            duration: item.duration,
            destination: item.destination || null,
            passengers: item.passengers || 1,
            base_price: item.basePrice / 100,
            platform_fee: item.platformFee / 100,
            total: item.total / 100,
            special_requests: item.specialRequests || null,
            confirmation_code: confirmCode,
            status: "pending",
            trip_id: trip.id,
          })
          .select("id")
          .single();

        if (error) {
          console.error("Rental booking error:", error);
          continue;
        }
        bookings.push({ type: "rental", bookingId: booking.id, confirmCode, rentalId: item.rentalId });
      }
    }

    return NextResponse.json({ tripId: trip.id, bookings });
  } catch (err: any) {
    console.error("Cart checkout error:", err);
    return NextResponse.json({ error: err.message || "Checkout failed" }, { status: 500 });
  }
}
