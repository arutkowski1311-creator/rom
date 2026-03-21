import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel cron sends this header)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Find confirmed bookings where:
  // - trip_date is within 14 days
  // - balance has not been paid
  const now = new Date();
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() + 14);

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id")
    .eq("status", "confirmed")
    .is("balance_paid_at", null)
    .lte("trip_date", cutoffDate.toISOString().split("T")[0])
    .gte("trip_date", now.toISOString().split("T")[0]);

  if (error) {
    console.error("Cron balance-charges query error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: { bookingId: string; success: boolean; error?: string }[] = [];

  for (const booking of bookings || []) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/bookings/charge-balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const data = await res.json();
      results.push({ bookingId: booking.id, success: res.ok, error: data.error });
    } catch (err: any) {
      results.push({ bookingId: booking.id, success: false, error: err.message });
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}
