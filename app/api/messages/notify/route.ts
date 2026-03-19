import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { threadId, senderId, messageBody } = await req.json();

    const supabase = getSupabaseAdmin();

    // Get thread participants
    const { data: thread, error: threadError } = await supabase
      .from("message_threads")
      .select("guide_id, guest_id")
      .eq("id", threadId)
      .single();

    if (!thread) {
      console.error("Thread not found:", threadError);
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Determine who sent and who receives the notification
    const senderIsGuide = senderId === thread.guide_id;

    // Get guide email (flat query - no nested joins per RLS pattern)
    const { data: guideRow } = await supabase
      .from("guides")
      .select("email")
      .eq("id", thread.guide_id)
      .single();

    // Get guest profile
    const { data: guestProfile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", thread.guest_id)
      .single();

    // Get guide name from profiles separately
    const { data: guideProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", thread.guide_id)
      .single();

    const guideEmail = guideRow?.email;
    const guideName = guideProfile?.full_name || "Your Guide";
    const guestEmail = guestProfile?.email;
    const guestName = guestProfile?.full_name || "Your Client";

    console.log("NOTIFY TARGETS:", { guideEmail, guestEmail, senderIsGuide });

    const preview = messageBody?.length > 200
      ? messageBody.slice(0, 200) + "..."
      : messageBody;

    if (senderIsGuide && guestEmail) {
      // Guide sent → notify guest
      await resend.emails.send({
        from: "RŌM <bookings@romlife.co>",
        to: guestEmail,
        subject: `${guideName} sent you a message`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
            <div style="background: #0d0d0d; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
              <div style="font-size: 28px; letter-spacing: 0.12em; color: #c9a96e; font-weight: 300;">RŌM</div>
            </div>
            <div style="background: #f9f7f4; padding: 36px; border-radius: 0 0 8px 8px;">
              <h1 style="font-size: 20px; font-weight: 500; margin: 0 0 8px;">${guideName} replied to your message</h1>
              <div style="background: #fff; border: 1px solid #e5e0d8; border-radius: 8px; padding: 20px; margin: 20px 0; font-size: 15px; color: #333; line-height: 1.6; font-style: italic;">
                "${preview}"
              </div>
              <a href="https://rom.travel/guides" style="display: inline-block; background: #c9a96e; color: #0d0d0d; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; font-size: 14px; letter-spacing: 0.04em;">
                View Conversation →
              </a>
              <p style="color: #aaa; font-size: 12px; margin-top: 24px;">Your contact information is kept private until a booking is confirmed through RŌM.</p>
            </div>
          </div>
        `,
      });
    } else if (!senderIsGuide && guideEmail) {
      // Guest sent → notify guide
      await resend.emails.send({
        from: "RŌM <bookings@romlife.co>",
        to: guideEmail,
        subject: `New message from ${guestName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
            <div style="background: #0d0d0d; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
              <div style="font-size: 28px; letter-spacing: 0.12em; color: #c9a96e; font-weight: 300;">RŌM</div>
            </div>
            <div style="background: #f9f7f4; padding: 36px; border-radius: 0 0 8px 8px;">
              <h1 style="font-size: 20px; font-weight: 500; margin: 0 0 8px;">New message from ${guestName}</h1>
              <div style="background: #fff; border: 1px solid #e5e0d8; border-radius: 8px; padding: 20px; margin: 20px 0; font-size: 15px; color: #333; line-height: 1.6; font-style: italic;">
                "${preview}"
              </div>
              <a href="https://rom.travel/guide/dashboard" style="display: inline-block; background: #c9a96e; color: #0d0d0d; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; font-size: 14px; letter-spacing: 0.04em;">
                Reply in Dashboard →
              </a>
              <p style="color: #aaa; font-size: 12px; margin-top: 24px;">Client contact details are kept private until a booking is confirmed.</p>
            </div>
          </div>
        `,
      });
    } else {
      console.warn("No recipient email found — guide:", guideEmail, "guest:", guestEmail);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Message notify error:", err);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
