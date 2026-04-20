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

// POST — Accept or dismiss a pricing recommendation
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { recommendationId, accept } = await req.json();
    if (!recommendationId) {
      return NextResponse.json({ error: "recommendationId required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Fetch recommendation
    const { data: rec } = await supabase
      .from("pricing_recommendations")
      .select("*, guides!inner(profile_id)")
      .eq("id", recommendationId)
      .single();

    if (!rec || (rec as any).guides?.profile_id !== user.id) {
      return NextResponse.json({ error: "Not found or not authorized" }, { status: 404 });
    }

    if (rec.status !== "pending") {
      return NextResponse.json({ error: "Recommendation already processed" }, { status: 400 });
    }

    if (accept) {
      // Validate within bounds
      const { data: pkg } = await supabase
        .from("packages")
        .select("price_floor, price_ceiling")
        .eq("id", rec.package_id)
        .single();

      let finalPrice = rec.recommended_price;
      if (pkg?.price_floor && finalPrice < pkg.price_floor) finalPrice = pkg.price_floor;
      if (pkg?.price_ceiling && finalPrice > pkg.price_ceiling) finalPrice = pkg.price_ceiling;

      // Update package price
      await supabase
        .from("packages")
        .update({ price: finalPrice })
        .eq("id", rec.package_id);

      // Mark recommendation as applied
      await supabase
        .from("pricing_recommendations")
        .update({ status: "applied", applied_at: new Date().toISOString() })
        .eq("id", recommendationId);

      return NextResponse.json({ success: true, newPrice: finalPrice, status: "applied" });
    } else {
      await supabase
        .from("pricing_recommendations")
        .update({ status: "dismissed" })
        .eq("id", recommendationId);

      return NextResponse.json({ success: true, status: "dismissed" });
    }
  } catch (err: any) {
    console.error("Apply pricing error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
