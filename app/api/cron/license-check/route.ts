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

  // Check all active licenses
  const { data: licenses } = await supabase
    .from("licenses")
    .select("*, guides(id, profile_id, email)")
    .not("expiry_date", "is", null);

  for (const lic of licenses || []) {
    const expiry = new Date(lic.expiry_date);
    const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const guideId = lic.guides?.id || lic.guide_id;

    try {
      // 60-day alert
      if (daysUntil <= 60 && daysUntil > 30 && !lic.reminder_60_sent) {
        await supabase.from("guide_notifications").insert({
          guide_id: guideId,
          type: "license_expiring",
          title: `${lic.name} expires in ${daysUntil} days`,
          body: lic.renewal_url ? "Tap to renew." : "Update your license details.",
          metadata: { license_id: lic.id, days_until: daysUntil },
        });
        await supabase.from("licenses").update({ reminder_60_sent: true }).eq("id", lic.id);
        results.push({ licenseId: lic.id, action: "60_day_alert" });
      }

      // 30-day alert
      if (daysUntil <= 30 && daysUntil > 7 && !lic.reminder_30_sent) {
        await supabase.from("guide_notifications").insert({
          guide_id: guideId,
          type: "license_expiring",
          title: `${lic.name} expires in ${daysUntil} days`,
          body: "Renew soon to keep your profile active.",
          metadata: { license_id: lic.id, days_until: daysUntil },
        });
        await supabase.from("licenses").update({ reminder_30_sent: true }).eq("id", lic.id);
        results.push({ licenseId: lic.id, action: "30_day_alert" });
      }

      // 7-day alert + email
      if (daysUntil <= 7 && daysUntil >= 0 && !lic.reminder_7_sent) {
        await supabase.from("guide_notifications").insert({
          guide_id: guideId,
          type: "license_expiring",
          title: `URGENT: ${lic.name} expires in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
          body: "Your profile may be deactivated if this license expires.",
          metadata: { license_id: lic.id, days_until: daysUntil, urgent: true },
        });

        // Send email
        const guideEmail = lic.guides?.email;
        if (guideEmail) {
          await resend.emails.send({
            from: "RŌM <bookings@romlife.co>",
            to: guideEmail,
            subject: `Action needed: ${lic.name} expires in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
            html: `
              <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
                <div style="background: #0d0d0d; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
                  <div style="font-size: 28px; letter-spacing: 0.12em; color: #c9a96e; font-weight: 300;">RŌM</div>
                </div>
                <div style="background: #f9f7f4; padding: 36px; border-radius: 0 0 8px 8px;">
                  <h1 style="font-size: 22px; font-weight: 500; margin: 0 0 8px; color: #8a3a3a;">License expiring soon</h1>
                  <p style="color: #555; font-size: 15px; margin: 0 0 24px; line-height: 1.6;">
                    Your <strong>${lic.name}</strong>${lic.license_number ? ` (#${lic.license_number})` : ""} expires on ${new Date(lic.expiry_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
                    Please renew it to keep your guide profile active.
                  </p>
                  ${lic.renewal_url ? `<a href="${lic.renewal_url}" style="display: block; background: #c9a96e; color: #0d0d0d; text-decoration: none; text-align: center; padding: 14px; border-radius: 6px; font-weight: 700; font-size: 14px; margin-bottom: 12px;">Renew Now →</a>` : ""}
                  <a href="https://romlife.co/guide/dashboard" style="display: block; background: none; border: 1px solid #ddd; color: #555; text-decoration: none; text-align: center; padding: 14px; border-radius: 6px; font-weight: 600; font-size: 14px;">
                    Update in Dashboard
                  </a>
                </div>
              </div>
            `,
          });
        }

        await supabase.from("licenses").update({ reminder_7_sent: true }).eq("id", lic.id);
        results.push({ licenseId: lic.id, action: "7_day_alert_email" });
      }
    } catch (e: any) {
      results.push({ licenseId: lic.id, action: "error", error: e.message });
    }
  }

  return NextResponse.json({ processed: results.length, results, timestamp: new Date().toISOString() });
}
