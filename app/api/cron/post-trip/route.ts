import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";
import { Resend } from "resend";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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

  // Find completed trips 3-5 days ago with no post-trip email sent
  const cutoff3 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const cutoff5 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, guide_id, guest_id, guest_name, guest_email, package_title, trip_date, completed_at")
    .eq("status", "completed")
    .is("post_trip_sent_at", null)
    .not("completed_at", "is", null)
    .lte("completed_at", cutoff3.toISOString())
    .gte("completed_at", cutoff5.toISOString());

  for (const booking of bookings || []) {
    try {
      // Get guide with voice profile
      const { data: guide } = await supabase
        .from("guides")
        .select("id, profile_id, voice_profile, location, categories")
        .eq("id", booking.guide_id)
        .single();

      const { data: guideProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", guide?.profile_id)
        .single();

      const guideName = guideProfile?.full_name || "Your guide";
      const voiceProfile = guide?.voice_profile;

      // Generate personalized follow-up in guide's voice
      let followUpText = `Thanks for joining us for ${booking.package_title || "the trip"}. It was great having you out there. Hope you had as much fun as we did. If you're ever back in the area, we'd love to take you out again.`;

      if (voiceProfile) {
        try {
          const message = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 200,
            system: `Write a brief post-trip thank-you message (2-3 sentences) from ${guideName} to a guest. Use this voice: ${voiceProfile.tone}. ${voiceProfile.personality_markers}. Sound genuine, not corporate. Reference the specific trip naturally. Return ONLY the message text.`,
            messages: [{
              role: "user",
              content: `Guest: ${booking.guest_name || "the guest"}. Trip: ${booking.package_title || "trip"} on ${new Date(booking.trip_date).toLocaleDateString("en-US", { month: "long", day: "numeric" })} in ${guide?.location || "the area"}.`,
            }],
          });
          followUpText = message.content[0].type === "text" ? message.content[0].text.trim() : followUpText;
        } catch (e) {
          // Use default text if AI fails
        }
      }

      if (booking.guest_email) {
        await resend.emails.send({
          from: "RŌM <bookings@romlife.co>",
          to: booking.guest_email,
          subject: `A note from ${guideName}`,
          html: `
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
              <div style="background: #0d0d0d; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
                <div style="font-size: 28px; letter-spacing: 0.12em; color: #c9a96e; font-weight: 300;">RŌM</div>
              </div>
              <div style="background: #f9f7f4; padding: 36px; border-radius: 0 0 8px 8px;">
                <div style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: #999; margin-bottom: 12px;">From ${guideName}</div>
                <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 28px; font-style: italic;">"${followUpText}"</p>
                <div style="border-top: 1px solid #e5e0d8; padding-top: 20px;">
                  <p style="color: #888; font-size: 13px; margin: 0 0 16px;">Thinking about your next trip?</p>
                  <a href="https://romlife.co/search" style="display: inline-block; background: #c9a96e; color: #0d0d0d; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; font-size: 14px;">
                    Explore More Guides →
                  </a>
                </div>
              </div>
            </div>
          `,
        });
      }

      await supabase
        .from("bookings")
        .update({ post_trip_sent_at: new Date().toISOString() })
        .eq("id", booking.id);

      results.push({ bookingId: booking.id, action: "post_trip_sent" });
    } catch (e: any) {
      results.push({ bookingId: booking.id, action: "error", error: e.message });
    }
  }

  return NextResponse.json({ processed: results.length, results, timestamp: new Date().toISOString() });
}
