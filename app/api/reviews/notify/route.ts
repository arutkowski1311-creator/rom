import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { guideId, guideName, rating, body } = await req.json();

    const supabase = getSupabaseAdmin();

    // Get guide email (flat query)
    const { data: guideRow } = await supabase
      .from("guides")
      .select("email")
      .eq("id", guideId)
      .single();

    const guideEmail = guideRow?.email;
    if (!guideEmail) {
      console.warn("No guide email found for review notify:", guideId);
      return NextResponse.json({ success: false, reason: "no email" });
    }

    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
    const preview = body?.length > 200 ? body.slice(0, 200) + "..." : body;

    await resend.emails.send({
      from: "RŌM <bookings@romlife.co>",
      to: guideEmail,
      subject: `New ${rating}-star review on your profile`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
          <div style="background: #0d0d0d; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
            <div style="font-size: 28px; letter-spacing: 0.12em; color: #c9a96e; font-weight: 300;">RŌM</div>
          </div>
          <div style="background: #f9f7f4; padding: 36px; border-radius: 0 0 8px 8px;">
            <h1 style="font-size: 20px; font-weight: 500; margin: 0 0 8px;">You have a new review</h1>
            <p style="color: #555; font-size: 15px; margin: 0 0 20px;">A guest left a review on your RŌM profile.</p>

            <div style="background: #fff; border: 1px solid #e5e0d8; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
              <div style="font-size: 22px; color: #c9a96e; margin-bottom: 8px; letter-spacing: 0.05em;">${stars}</div>
              <p style="font-size: 15px; color: #333; line-height: 1.7; font-style: italic; margin: 0;">"${preview}"</p>
            </div>

            <a href="https://romlife.co/guide/dashboard" style="display: inline-block; background: #c9a96e; color: #0d0d0d; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 700; font-size: 14px; letter-spacing: 0.04em;">
              View in Dashboard →
            </a>
            <p style="color: #aaa; font-size: 12px; margin-top: 24px;">Reviews help guests find you. Keep delivering great experiences.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Review notify error:", err);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
