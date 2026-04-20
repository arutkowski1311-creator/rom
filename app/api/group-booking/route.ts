import { NextRequest, NextResponse } from "next/server";
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

// POST — Create group booking inquiry
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { guideId, packageId, groupName, headcount, companyName, billingEmail, preferredDates, specialRequests } = await req.json();

    if (!guideId || !groupName || !headcount || !billingEmail) {
      return NextResponse.json({ error: "guideId, groupName, headcount, and billingEmail required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: groupBooking, error } = await supabase
      .from("group_bookings")
      .insert({
        organizer_id: user.id,
        guide_id: guideId,
        package_id: packageId || null,
        group_name: groupName,
        headcount,
        company_name: companyName || null,
        billing_email: billingEmail,
        billing_contact: null,
        preferred_dates: preferredDates || [],
        special_requests: specialRequests || null,
        status: "inquiry",
      })
      .select()
      .single();

    if (error) {
      console.error("Group booking error:", error);
      return NextResponse.json({ error: "Failed to create inquiry" }, { status: 500 });
    }

    // Notify guide
    await supabase.from("guide_notifications").insert({
      guide_id: guideId,
      type: "group_inquiry",
      title: `New group inquiry — ${groupName}`,
      body: `${headcount} guests${companyName ? ` from ${companyName}` : ""}. ${preferredDates?.length ? `Dates: ${preferredDates.join(", ")}` : "Flexible dates."}`,
      metadata: { group_booking_id: groupBooking.id },
    });

    return NextResponse.json({ groupBooking });
  } catch (err: any) {
    console.error("Group booking error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

// GET — List group bookings (as organizer or guide)
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const guideId = searchParams.get("guideId");

    let query = supabase.from("group_bookings").select("*").order("created_at", { ascending: false });

    if (guideId) {
      query = query.eq("guide_id", guideId);
    } else {
      query = query.eq("organizer_id", user.id);
    }

    const { data } = await query;
    return NextResponse.json({ groupBookings: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

// PUT — Update group booking (guide quotes, accepts, etc.)
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, status, quotedTotal, discountRate, notes, paymentDueDate } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    const updates: any = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (quotedTotal !== undefined) updates.quoted_total = quotedTotal;
    if (discountRate !== undefined) updates.discount_rate = discountRate;
    if (notes !== undefined) updates.notes = notes;
    if (paymentDueDate) updates.payment_due_date = paymentDueDate;

    const { data, error } = await supabase
      .from("group_bookings")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
    return NextResponse.json({ groupBooking: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
