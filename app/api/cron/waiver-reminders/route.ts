import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const now = new Date();
  const results: any[] = [];

  // Find confirmed bookings where:
  // - trip_date is within 7 days
  // - waiver not signed
  // - waiver reminder not already sent (or sent > 48hrs ago for follow-up)
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, guide_id, guest_id, guest_name, guest_email, package_title, trip_date, waiver_reminder_sent_at")
    .eq("status", "confirmed")
    .eq("waiver_signed", false)
    .gte("trip_date", now.toISOString().split("T")[0])
    .lte("trip_date", sevenDaysOut.toISOString().split("T")[0]);

  for (const booking of bookings || []) {
    try {
      // Skip if reminder sent within last 48 hours
      if (booking.waiver_reminder_sent_at) {
        const lastSent = new Date(booking.waiver_reminder_sent_at);
        if (now.getTime() - lastSent.getTime() < 48 * 60 * 60 * 1000) continue;
      }

      // Get guide name
      const { data: guide } = await supabase.from("guides").select("profile_id").eq("id", booking.guide_id).single();
      const { data: guideProfile } = await supabase.from("profiles").select("full_name").eq("id", guide?.profile_id).single();
      const guideName = guideProfile?.full_name || "your guide";

      const daysUntil = Math.ceil((new Date(booking.trip_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isUrgent = daysUntil <= 2;

      if (booking.guest_email) {
        await resend.emails.send({
          from: "RŌM <bookings@romlife.co>",
          to: booking.guest_email,
          subject: isUrgent
            ? `Action required: Sign your waiver before ${booking.package_title || "your trip"}`
            : `Please sign your waiver — ${booking.package_title || "your trip"} is in ${daysUntil} days`,
          html: `
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
              <div style="background: #0d0d0d; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
                <div style="font-size: 28px; letter-spacing: 0.12em; color: #c9a96e; font-weight: 300;">RŌM</div>
              </div>
              <div style="background: #f9f7f4; padding: 36px; border-radius: 0 0 8px 8px;">
                <h1 style="font-size: 22px; font-weight: 500; margin: 0 0 8px;">${isUrgent ? "⚠️ Waiver needed" : "Sign your waiver"}</h1>
                <p style="color: #555; font-size: 15px; margin: 0 0 24px; line-height: 1.6;">
                  Your ${booking.package_title || "trip"} with ${guideName} is ${daysUntil === 0 ? "today" : daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`}.
                  ${isUrgent ? "Please sign the liability waiver now to confirm your participation." : "Please take a moment to sign the required liability waiver."}
                </p>
                <a href="https://romlife.co/waiver/${booking.id}" style="display: block; background: #c9a96e; color: #0d0d0d; text-decoration: none; text-align: center; padding: 14px; border-radius: 6px; font-weight: 700; font-size: 14px;">
                  Sign Waiver →
                </a>
                <p style="color: #aaa; font-size: 12px; margin: 16px 0 0; text-align: center;">Takes less than 2 minutes. Required before your trip.</p>
              </div>
            </div>
          `,
        });
      }

      await supabase
        .from("bookings")
        .update({ waiver_reminder_sent_at: now.toISOString() })
        .eq("id", booking.id);

      // Also notify guide if urgent
      if (isUrgent) {
        await supabase.from("guide_notifications").insert({
          guide_id: booking.guide_id,
          type: "waiver_unsigned",
          title: `${booking.guest_name || "Guest"} hasn't signed their waiver`,
          body: `Trip is ${daysUntil === 0 ? "today" : "tomorrow"}. We've sent them a reminder.`,
          metadata: { booking_id: booking.id },
          priority: "high",
        });
      }

      results.push({ bookingId: booking.id, action: isUrgent ? "urgent_reminder" : "reminder_sent", daysUntil });
    } catch (e: any) {
      results.push({ bookingId: booking.id, action: "error", error: e.message });
    }
  }

  return NextResponse.json({ processed: results.length, results, timestamp: now.toISOString() });
}
