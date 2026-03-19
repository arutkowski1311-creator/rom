import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      guestEmail,
      guestName,
      guideId,
      guideName,
      confirmCode,
      packageTitle,
      tripDate,
      guests,
      total,
      deposit,
      balance,
      guideLocation,
    } = body;

    // Look up guide email server-side
    let guideEmail = null;
    if (guideId) {
      const supabase = getSupabaseAdmin();
      const { data: guideRow } = await supabase
        .from("guides")
        .select("email")
        .eq("id", guideId)
        .single();
      guideEmail = guideRow?.email || null;
    }


    // ── Guest confirmation email ──
    await resend.emails.send({
      from: "RŌM <bookings@romlife.co>",
      to: guestEmail,
      subject: `You're booked — ${packageTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
          <div style="background: #0d0d0d; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
            <div style="font-size: 28px; letter-spacing: 0.12em; color: #c9a96e; font-weight: 300;">RŌM</div>
          </div>
          <div style="background: #f9f7f4; padding: 36px; border-radius: 0 0 8px 8px;">
            <h1 style="font-size: 22px; font-weight: 500; margin: 0 0 8px;">Your trip is confirmed.</h1>
            <p style="color: #555; font-size: 15px; margin: 0 0 28px;">
              ${guideName} is expecting you. Here are your booking details.
            </p>

            <div style="background: #fff; border: 1px solid #e5e0d8; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
              <div style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: #999; margin-bottom: 4px;">Confirmation</div>
              <div style="font-size: 22px; font-weight: 700; letter-spacing: 0.06em; color: #0d0d0d; margin-bottom: 20px;">${confirmCode}</div>

              ${[
                ["Experience", packageTitle],
                ["Guide", guideName],
                ["Location", guideLocation],
                ["Date", tripDate],
                ["Guests", `${guests} client${guests !== 1 ? "s" : ""}`],
              ].map(([label, value]) => `
                <div style="display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-top: 1px solid #f0ece4;">
                  <span style="color: #888; font-size: 13px;">${label}</span>
                  <span style="color: #1a1a1a; font-size: 13px; font-weight: 500;">${value}</span>
                </div>
              `).join("")}
            </div>

            <div style="background: #fff; border: 1px solid #e5e0d8; border-radius: 8px; padding: 24px; margin-bottom: 28px;">
              <div style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: #999; margin-bottom: 12px;">Payment</div>
              ${[
                ["Deposit paid", `$${deposit}`],
                ["Balance due on trip", `$${balance}`],
                ["Total", `$${total}`],
              ].map(([label, value]) => `
                <div style="display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-top: 1px solid #f0ece4;">
                  <span style="color: #888; font-size: 13px;">${label}</span>
                  <span style="color: #1a1a1a; font-size: 13px; font-weight: 500;">${value}</span>
                </div>
              `).join("")}
            </div>

            <p style="color: #888; font-size: 13px; line-height: 1.6; margin: 0;">
              Questions? Reply to this email or message ${guideName} directly through your RŌM dashboard.
            </p>
          </div>
        </div>
      `,
    });

    // ── Guide notification email ──
    if (guideEmail) {
      await resend.emails.send({
        from: "RŌM <bookings@romlife.co>",
        to: guideEmail,
        subject: `New booking request — ${packageTitle}`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
            <div style="background: #0d0d0d; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
              <div style="font-size: 28px; letter-spacing: 0.12em; color: #c9a96e; font-weight: 300;">RŌM</div>
            </div>
            <div style="background: #f9f7f4; padding: 36px; border-radius: 0 0 8px 8px;">
              <h1 style="font-size: 22px; font-weight: 500; margin: 0 0 8px;">You have a new booking request.</h1>
              <p style="color: #555; font-size: 15px; margin: 0 0 28px;">
                Log in to your dashboard to accept or decline within 24 hours.
              </p>

              <div style="background: #fff; border: 1px solid #e5e0d8; border-radius: 8px; padding: 24px; margin-bottom: 28px;">
                ${[
                  ["Client", guestName],
                  ["Experience", packageTitle],
                  ["Date", tripDate],
                  ["Guests", `${guests} client${guests !== 1 ? "s" : ""}`],
                  ["Trip total", `$${total}`],
                  ["Confirmation", confirmCode],
                ].map(([label, value]) => `
                  <div style="display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-top: 1px solid #f0ece4;">
                    <span style="color: #888; font-size: 13px;">${label}</span>
                    <span style="color: #1a1a1a; font-size: 13px; font-weight: 500;">${value}</span>
                  </div>
                `).join("")}
              </div>

              <a href="https://romlife.co/guide/dashboard" style="display: block; background: #c9a96e; color: #0d0d0d; text-decoration: none; text-align: center; padding: 14px; border-radius: 6px; font-weight: 700; font-size: 14px; letter-spacing: 0.04em;">
                View in Dashboard →
              </a>
            </div>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Email error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
