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

  // ── 48-hour window: Generate itinerary + send to guest ──
  const date48 = new Date(now);
  date48.setDate(date48.getDate() + 2);
  const dateStr48 = date48.toISOString().split("T")[0];

  const { data: bookings48 } = await supabase
    .from("bookings")
    .select("id, guide_id, guest_id, guest_name, guest_email, trip_date, package_title, message, guests, waiver_signed")
    .eq("status", "confirmed")
    .eq("trip_date", dateStr48)
    .is("itinerary_sent_at", null);

  for (const booking of bookings48 || []) {
    try {
      // Check if itinerary exists
      const { data: existingItin } = await supabase
        .from("itineraries")
        .select("id, guest_version")
        .eq("booking_id", booking.id)
        .single();

      let guestVersion = existingItin?.guest_version;

      // Generate if none exists
      if (!guestVersion) {
        const genRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/itinerary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: booking.id }),
        });
        if (genRes.ok) {
          const genData = await genRes.json();
          guestVersion = genData.guest_version;
        }
      }

      if (!guestVersion) {
        results.push({ bookingId: booking.id, action: "itinerary_failed" });
        continue;
      }

      // Fetch guide name
      const { data: guide } = await supabase
        .from("guides")
        .select("profile_id")
        .eq("id", booking.guide_id)
        .single();
      const { data: guideProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", guide?.profile_id)
        .single();
      const guideName = guideProfile?.full_name || "Your guide";

      // Format guest version for email
      const gv = guestVersion;
      const tripDate = new Date(booking.trip_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

      // Send guest email
      if (booking.guest_email) {
        await resend.emails.send({
          from: "RŌM <bookings@romlife.co>",
          to: booking.guest_email,
          subject: `Your trip with ${guideName} is in 2 days — here's your plan`,
          html: `
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
              <div style="background: #0d0d0d; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
                <div style="font-size: 28px; letter-spacing: 0.12em; color: #c9a96e; font-weight: 300;">RŌM</div>
              </div>
              <div style="background: #f9f7f4; padding: 36px; border-radius: 0 0 8px 8px;">
                <h1 style="font-size: 22px; font-weight: 500; margin: 0 0 8px;">${tripDate}</h1>
                <p style="color: #555; font-size: 15px; margin: 0 0 4px;">${booking.package_title || "Your trip"} with ${guideName}</p>
                <p style="color: #888; font-size: 13px; margin: 0 0 28px;">${booking.guests || 1} guest${(booking.guests || 1) > 1 ? "s" : ""}</p>

                ${gv.welcome_message ? `<div style="background: #fff; border: 1px solid #e5e0d8; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
                  <div style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: #999; margin-bottom: 8px;">From ${guideName}</div>
                  <p style="font-size: 14px; color: #333; line-height: 1.7; margin: 0; font-style: italic;">${gv.welcome_message}</p>
                </div>` : ""}

                ${gv.what_to_expect ? `<div style="background: #fff; border: 1px solid #e5e0d8; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
                  <div style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: #999; margin-bottom: 8px;">What to Expect</div>
                  <p style="font-size: 14px; color: #333; line-height: 1.7; margin: 0;">${gv.what_to_expect}</p>
                </div>` : ""}

                ${gv.what_to_bring ? `<div style="background: #fff; border: 1px solid #e5e0d8; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
                  <div style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: #999; margin-bottom: 8px;">What to Bring</div>
                  <p style="font-size: 14px; color: #333; line-height: 1.7; margin: 0;">${typeof gv.what_to_bring === "string" ? gv.what_to_bring : (gv.what_to_bring || []).join(", ")}</p>
                </div>` : ""}

                ${gv.meeting_point ? `<div style="background: #fff; border: 1px solid #e5e0d8; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
                  <div style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: #999; margin-bottom: 8px;">Meeting Point</div>
                  <p style="font-size: 14px; color: #333; line-height: 1.7; margin: 0;">${gv.meeting_point}</p>
                </div>` : ""}

                ${gv.conditions_note ? `<div style="background: #fff; border: 1px solid #e5e0d8; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
                  <div style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: #999; margin-bottom: 8px;">Current Conditions</div>
                  <p style="font-size: 14px; color: #333; line-height: 1.7; margin: 0;">${gv.conditions_note}</p>
                </div>` : ""}

                ${gv.anticipation_builder ? `<div style="background: #f0ece4; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                  <p style="font-size: 14px; color: #555; line-height: 1.7; margin: 0; font-style: italic;">${gv.anticipation_builder}</p>
                </div>` : ""}

                ${!booking.waiver_signed ? `<div style="background: #fff3e0; border: 1px solid #e8a840; border-radius: 8px; padding: 20px; margin-bottom: 16px; text-align: center;">
                  <div style="font-size: 14px; font-weight: 700; color: #8a6520; margin-bottom: 8px;">⚠️ Waiver Required</div>
                  <p style="font-size: 13px; color: #8a6520; margin: 0 0 12px;">Please sign your liability waiver before the trip.</p>
                  <a href="https://romlife.co/waiver/${booking.id}" style="display: inline-block; background: #c9a96e; color: #0d0d0d; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 700; font-size: 13px;">Sign Waiver →</a>
                </div>` : `<div style="background: #e8f5e9; border: 1px solid #4caf50; border-radius: 8px; padding: 12px; margin-bottom: 16px; text-align: center;">
                  <span style="font-size: 13px; color: #2e7d32; font-weight: 600;">✓ Waiver signed — you're all set</span>
                </div>`}

                <p style="color: #888; font-size: 13px; line-height: 1.6; margin: 0;">
                  Questions? Reply to this email or message ${guideName} through your <a href="https://romlife.co/dashboard" style="color: #c9a96e;">RŌM dashboard</a>.
                </p>
              </div>
            </div>
          `,
        });

        // Mark as sent
        await supabase
          .from("bookings")
          .update({ itinerary_sent_at: new Date().toISOString() })
          .eq("id", booking.id);

        await supabase
          .from("itineraries")
          .update({ guest_sent_at: new Date().toISOString() })
          .eq("booking_id", booking.id);

        results.push({ bookingId: booking.id, action: "guest_itinerary_sent" });
      }
    } catch (e: any) {
      console.error("Pre-trip 48hr error:", e);
      results.push({ bookingId: booking.id, action: "error", error: e.message });
    }
  }

  // ── 24-hour window: Guide briefing notification ──
  const date24 = new Date(now);
  date24.setDate(date24.getDate() + 1);
  const dateStr24 = date24.toISOString().split("T")[0];

  const { data: bookings24 } = await supabase
    .from("bookings")
    .select("id, guide_id, guest_name, trip_date, package_title, guests, message")
    .eq("status", "confirmed")
    .eq("trip_date", dateStr24);

  for (const booking of bookings24 || []) {
    try {
      // Check if itinerary exists with guide version
      const { data: itin } = await supabase
        .from("itineraries")
        .select("id, guide_version, guide_sent_at")
        .eq("booking_id", booking.id)
        .single();

      if (itin && !itin.guide_sent_at) {
        // Send guide briefing notification
        const gv = itin.guide_version || {};
        await supabase.from("guide_notifications").insert({
          guide_id: booking.guide_id,
          type: "guest_briefing",
          title: `Tomorrow: ${booking.guest_name || "Guest"} — ${booking.package_title || "Trip"}`,
          body: gv.guest_summary ? gv.guest_summary.substring(0, 200) : `${booking.guests || 1} guest${(booking.guests || 1) > 1 ? "s" : ""}. ${booking.message || "No special requests."}`,
          metadata: { booking_id: booking.id },
        });

        await supabase
          .from("itineraries")
          .update({ guide_sent_at: new Date().toISOString() })
          .eq("id", itin.id);

        results.push({ bookingId: booking.id, action: "guide_briefing_sent" });
      }
    } catch (e: any) {
      console.error("Pre-trip 24hr error:", e);
      results.push({ bookingId: booking.id, action: "error", error: e.message });
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}
