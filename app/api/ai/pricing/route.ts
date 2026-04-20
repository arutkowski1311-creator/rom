import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getAuthUser(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: req.headers.get("authorization") || "" } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// POST — Generate pricing recommendations for a guide's packages
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { guideId } = await req.json();
    const supabase = getSupabaseAdmin();

    // Verify guide ownership
    const { data: guide } = await supabase
      .from("guides")
      .select("id, profile_id, categories, location, subscription_tier")
      .eq("id", guideId)
      .single();

    if (!guide || guide.profile_id !== user.id) {
      return NextResponse.json({ error: "Not your guide profile" }, { status: 403 });
    }

    // Fetch packages
    const { data: packages } = await supabase
      .from("packages")
      .select("id, title, price, price_type, duration, price_floor, price_ceiling, auto_pricing_enabled")
      .eq("guide_id", guideId)
      .eq("active", true);

    if (!packages?.length) {
      return NextResponse.json({ error: "No active packages" }, { status: 400 });
    }

    // Gather signals
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000).toISOString().split("T")[0];

    // Bookings in last 90 days
    const { data: recentBookings } = await supabase
      .from("bookings")
      .select("package_id, total, guests, trip_date, status, created_at")
      .eq("guide_id", guideId)
      .gte("created_at", ninetyDaysAgo);

    // Guide intelligence
    const { data: intel } = await supabase
      .from("guide_intelligence")
      .select("health_score, booking_velocity, repeat_rate")
      .eq("guide_id", guideId)
      .single();

    // Reviews
    const { data: reviews } = await supabase
      .from("reviews")
      .select("rating")
      .eq("guide_id", guideId);

    const avgRating = reviews?.length
      ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(2)
      : "N/A";

    // Category average price
    const category = guide.categories?.[0] || "";
    const { data: categoryGuides } = await supabase
      .from("packages")
      .select("price, guide_id")
      .eq("active", true);

    // Build per-package signals
    const packageSignals = packages.map((pkg: any) => {
      const pkgBookings = (recentBookings || []).filter((b: any) => b.package_id === pkg.id);
      const totalBookings = pkgBookings.length;
      const completedBookings = pkgBookings.filter((b: any) => b.status === "completed").length;

      // Approximate fill rate (bookings per 90 available days)
      const fillRate = Math.round((totalBookings / 90) * 100);

      // Average days in advance
      const advanceDays = pkgBookings.length > 0
        ? Math.round(pkgBookings.reduce((s: number, b: any) => {
            const created = new Date(b.created_at);
            const trip = new Date(b.trip_date);
            return s + (trip.getTime() - created.getTime()) / 86400000;
          }, 0) / pkgBookings.length)
        : 0;

      // Seasonal index (current month bookings vs average)
      const currentMonth = now.getMonth();
      const monthBookings = pkgBookings.filter((b: any) => new Date(b.trip_date).getMonth() === currentMonth).length;
      const avgMonthly = totalBookings / 3; // 3 months
      const seasonalIndex = avgMonthly > 0 ? (monthBookings / avgMonthly).toFixed(1) : "1.0";

      // Category average
      const catPrices = (categoryGuides || []).map((p: any) => p.price).filter((p: any) => p > 0);
      const catAvg = catPrices.length > 0 ? Math.round(catPrices.reduce((s: number, p: number) => s + p, 0) / catPrices.length) : pkg.price;

      return {
        packageId: pkg.id,
        title: pkg.title,
        currentPrice: pkg.price,
        priceType: pkg.price_type,
        duration: pkg.duration,
        floor: pkg.price_floor,
        ceiling: pkg.price_ceiling,
        autoEnabled: pkg.auto_pricing_enabled,
        signals: {
          fill_rate: fillRate,
          total_bookings_90d: totalBookings,
          completed_bookings_90d: completedBookings,
          avg_advance_days: advanceDays,
          seasonal_index: seasonalIndex,
          category_avg_price: catAvg,
          avg_rating: avgRating,
          review_count: reviews?.length || 0,
          repeat_rate: intel?.repeat_rate || 0,
          health_score: intel?.health_score || 0,
        },
      };
    });

    // Call Claude for analysis
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: `You are a pricing analyst for outdoor guide experiences. Analyze booking data and recommend price adjustments. Be specific and actionable. Return valid JSON array.`,
      messages: [{
        role: "user",
        content: `Analyze pricing for this guide in ${guide.location} (${category}):

${packageSignals.map((p: any) => `Package: "${p.title}" — $${p.currentPrice}/${p.priceType}
  Fill rate: ${p.signals.fill_rate}%, ${p.signals.total_bookings_90d} bookings in 90 days
  Advance booking: ${p.signals.avg_advance_days} days avg
  Seasonal index: ${p.signals.seasonal_index} (1.0 = average)
  Category avg: $${p.signals.category_avg_price}
  Rating: ${p.signals.avg_rating}/5 (${p.signals.review_count} reviews)
  Repeat rate: ${p.signals.repeat_rate}%
  ${p.floor ? `Price floor: $${p.floor}` : "No floor set"}
  ${p.ceiling ? `Price ceiling: $${p.ceiling}` : "No ceiling set"}`).join("\n\n")}

Return JSON: [{ "packageId": "uuid", "recommendedPrice": number, "confidence": "low"|"medium"|"high", "reasoning": "1-2 sentences explaining why" }]`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    let recommendations: any[];
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      recommendations = [];
    }

    // Save recommendations
    const saved = [];
    for (const rec of recommendations) {
      const pkgSignal = packageSignals.find((p: any) => p.packageId === rec.packageId);
      if (!pkgSignal) continue;

      const { data: savedRec } = await supabase
        .from("pricing_recommendations")
        .insert({
          guide_id: guideId,
          package_id: rec.packageId,
          current_price: pkgSignal.currentPrice,
          recommended_price: rec.recommendedPrice,
          confidence: rec.confidence || "medium",
          reasoning: rec.reasoning || "",
          signals: pkgSignal.signals,
          status: "pending",
        })
        .select()
        .single();

      if (savedRec) saved.push(savedRec);
    }

    return NextResponse.json({ recommendations: saved, packageSignals });
  } catch (err: any) {
    console.error("Pricing AI error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
