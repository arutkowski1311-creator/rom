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

  // ── 24hr: First review request ──
  const cutoff24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const cutoff48 = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const { data: needsFirstRequest } = await supabase
    .from("bookings")
    .select("id, guide_id, guest_id, guest_name, guest_email, package_title, trip_date, completed_at")
    .eq("status", "completed")
    .is("review_requested_at", null)
    .not("completed_at", "is", null)
    .lte("completed_at", cutoff24.toISOString())
    .gte("completed_at", cutoff48.toISOString());

  for (const booking of needsFirstRequest || []) {
    try {
      // Get guide name
      const { data: guide } = await supabase.from("guides").select("profile_id").eq("id", booking.guide_id).single();
      const { data: guideProfile } = await supabase.from("profiles").select("full_name").eq("id", guide?.profile_id).single();
      const guideName = guideProfile?.full_name || "your guide";

      if (booking.guest_email) {
        await resend.emails.send({
          from: "RŌM <bookings@romlife.co>",
          to: booking.guest_email,
          subject: `How was your trip with ${guideName}?`,
          html: `
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
              <div style="background: #0d0d0d; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
                <div style="font-size: 28px; letter-spacing: 0.12em; color: #c9a96e; font-weight: 300;">RŌM</div>
              </div>
              <div style="background: #f9f7f4; padding: 36px; border-radius: 0 0 8px 8px;">
                <h1 style="font-size: 22px; font-weight: 500; margin: 0 0 8px;">How was your trip?</h1>
                <p style="color: #555; font-size: 15px; margin: 0 0 24px; line-height: 1.6;">
                  Your ${booking.package_title || "trip"} with ${guideName} — we'd love to hear how it went. Your review helps other travelers find great experiences and helps ${guideName} grow their business.
                </p>
                <a href="https://romlife.co/dashboard" style="display: block; background: #c9a96e; color: #0d0d0d; text-decoration: none; text-align: center; padding: 14px; border-radius: 6px; font-weight: 700; font-size: 14px;">
                  Leave a Review →
                </a>
                <p style="color: #aaa; font-size: 12px; margin: 16px 0 0; text-align: center;">Takes less than a minute</p>
              </div>
            </div>
          `,
        });
      }

      await supabase
        .from("bookings")
        .update({ review_requested_at: new Date().toISOString() })
        .eq("id", booking.id);

      results.push({ bookingId: booking.id, action: "review_request_sent" });
    } catch (e: any) {
      results.push({ bookingId: booking.id, action: "error", error: e.message });
    }
  }

  // ── 72hr: Follow-up reminder ──
  const cutoff72 = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  const cutoff96 = new Date(now.getTime() - 96 * 60 * 60 * 1000);

  const { data: needsReminder } = await supabase
    .from("bookings")
    .select("id, guide_id, guest_id, guest_name, guest_email, package_title")
    .eq("status", "completed")
    .is("review_reminder_sent_at", null)
    .not("review_requested_at", "is", null)
    .lte("review_requested_at", cutoff72.toISOString())
    .gte("review_requested_at", cutoff96.toISOString());

  for (const booking of needsReminder || []) {
    try {
      // Check if review already exists
      const { data: existingReview } = await supabase
        .from("reviews")
        .select("id")
        .eq("booking_id", booking.id)
        .single();

      if (existingReview) {
        // Already reviewed, skip
        results.push({ bookingId: booking.id, action: "already_reviewed" });
        continue;
      }

      if (booking.guest_email) {
        await resend.emails.send({
          from: "RŌM <bookings@romlife.co>",
          to: booking.guest_email,
          subject: `Quick reminder — your review means a lot`,
          html: `
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
              <div style="background: #0d0d0d; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
                <div style="font-size: 28px; letter-spacing: 0.12em; color: #c9a96e; font-weight: 300;">RŌM</div>
              </div>
              <div style="background: #f9f7f4; padding: 36px; border-radius: 0 0 8px 8px;">
                <h1 style="font-size: 22px; font-weight: 500; margin: 0 0 8px;">Still thinking about it?</h1>
                <p style="color: #555; font-size: 15px; margin: 0 0 24px; line-height: 1.6;">
                  A quick review of your ${booking.package_title || "trip"} helps future guests make confident decisions. Even a sentence or two makes a difference.
                </p>
                <a href="https://romlife.co/dashboard" style="display: block; background: #c9a96e; color: #0d0d0d; text-decoration: none; text-align: center; padding: 14px; border-radius: 6px; font-weight: 700; font-size: 14px;">
                  Leave a Review →
                </a>
              </div>
            </div>
          `,
        });
      }

      await supabase
        .from("bookings")
        .update({ review_reminder_sent_at: new Date().toISOString() })
        .eq("id", booking.id);

      results.push({ bookingId: booking.id, action: "review_reminder_sent" });
    } catch (e: any) {
      results.push({ bookingId: booking.id, action: "error", error: e.message });
    }
  }

  return NextResponse.json({ processed: results.length, results, timestamp: new Date().toISOString() });
}
