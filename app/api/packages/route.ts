import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

// Create a new package
export async function POST(req: NextRequest) {
  try {
    const { guideId, title, duration, price, priceType, description, minGuests, maxGuests } = await req.json();

    if (!guideId || !title || !price) {
      return NextResponse.json({ error: "guideId, title, and price required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get current max sort_order
    const { data: existing } = await supabase
      .from("packages")
      .select("sort_order")
      .eq("guide_id", guideId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.sort_order || 0) + 1;

    const { data: pkg, error } = await supabase
      .from("packages")
      .insert({
        guide_id: guideId,
        title,
        duration: duration || null,
        price: parseFloat(price),
        price_type: priceType || "person",
        description: description || null,
        active: true,
        sort_order: nextOrder,
        min_guests: minGuests || 1,
        max_guests: maxGuests || 6,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ package: pkg });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create package" }, { status: 500 });
  }
}

// Update an existing package
export async function PUT(req: NextRequest) {
  try {
    const { id, title, duration, price, priceType, description, active, minGuests, maxGuests } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Package id required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = title;
    if (duration !== undefined) updates.duration = duration;
    if (price !== undefined) updates.price = parseFloat(price);
    if (priceType !== undefined) updates.price_type = priceType;
    if (description !== undefined) updates.description = description;
    if (active !== undefined) updates.active = active;
    if (minGuests !== undefined) updates.min_guests = minGuests;
    if (maxGuests !== undefined) updates.max_guests = maxGuests;

    const { data: pkg, error } = await supabase
      .from("packages")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ package: pkg });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update package" }, { status: 500 });
  }
}
