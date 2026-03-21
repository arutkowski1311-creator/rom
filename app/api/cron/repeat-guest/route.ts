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
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const results: any[] = [];

  // Get all guides with voice profiles
  const { data: guides } = await supabase
    .from("guides")
    .select("id, profile_id, voice_profile, location, categories")
    .eq("status", "active");

  for (const guide of guides || []) {
    try {
      const { data: guideProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", guide.profile_id)
        .single();
      const guideName = guideProfile?.full_name || "Guide";

      // Find eligible guests:
      // (a) last_trip_date is 10.5-11.5 months ago
      // (b) OR current month is within 4 weeks of their historically booked months
      const tenHalfMonthsAgo = new Date(now);
      tenHalfMonthsAgo.setMonth(tenHalfMonthsAgo.getMonth() - 10);
      tenHalfMonthsAgo.setDate(tenHalfMonthsAgo.getDate() - 15);
      const elevenHalfMonthsAgo = new Date(now);
      elevenHalfMonthsAgo.setMonth(elevenHalfMonthsAgo.getMonth() - 11);
      elevenHalfMonthsAgo.setDate(elevenHalfMonthsAgo.getDate() - 15);

      const { data: guests } = await supabase
        .from("guest_profiles")
        .select("*, profiles!guest_profiles_profile_id_fkey(full_name, email)")
        .eq("guide_id", guide.id);

      for (const guest of guests || []) {
        // Skip if already outreached 2+ times this year
        const outreachHistory = guest.outreach_history || [];
        const thisYearOutreach = outreachHistory.filter((o: any) =>
          new Date(o.date).getFullYear() === currentYear
        );
        if (thisYearOutreach.length >= 2) continue;

        // Skip if outreached in last 6 months
        if (guest.last_outreach_at) {
          const sixMonthsAgo = new Date(now);
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          if (new Date(guest.last_outreach_at) > sixMonthsAgo) continue;
        }

        // Check eligibility criteria
        let eligible = false;
        let reason = "";

        // (a) Anniversary approaching
        if (guest.last_trip_date) {
          const lastTrip = new Date(guest.last_trip_date);
          const monthsSince = (now.getFullYear() - lastTrip.getFullYear()) * 12 + (now.getMonth() - lastTrip.getMonth());
          if (monthsSince >= 10 && monthsSince <= 12) {
            eligible = true;
            reason = "anniversary";
          }
        }

        // (b) In-season: current month is one of their booking months (± 1 month)
        const bookingMonths = guest.booking_months || [];
        if (!eligible && bookingMonths.length > 0) {
          const nearbyMonths = [currentMonth, currentMonth === 1 ? 12 : currentMonth - 1, currentMonth === 12 ? 1 : currentMonth + 1];
          if (bookingMonths.some((m: number) => nearbyMonths.includes(m))) {
            eligible = true;
            reason = "in_season";
          }
        }

        if (!eligible) continue;

        const guestEmail = guest.profiles?.email;
        const guestName = guest.profiles?.full_name || "there";
        if (!guestEmail) continue;

        // Generate personalized email
        let emailBody = `Hey ${guestName}, it's been a while since your last trip. ${guideName} would love to have you back out.`;

        if (guide.voice_profile) {
          try {
            const msg = await anthropic.messages.create({
              model: "claude-sonnet-4-20250514",
              max_tokens: 250,
              system: `Write a short re-engagement email (3-4 sentences) from ${guideName} to a past guest. Voice: ${guide.voice_profile.tone}. ${guide.voice_profile.personality_markers}. Reference their last trip specifically. Mention what's happening in the area now. Include a soft booking nudge. Return ONLY the email body text.`,
              messages: [{
                role: "user",
                content: `Guest: ${guestName}. Last trip: ${guest.last_trip_date ? new Date(guest.last_trip_date).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "a while back"}. Total trips: ${guest.total_trips || 1}. Location: ${guide.location || "the area"}. Activities: ${(guide.categories || []).join(", ")}.${reason === "anniversary" ? " It's been almost a year." : " Their booking season is coming up."}`,
              }],
            });
            emailBody = msg.content[0].type === "text" ? msg.content[0].text.trim() : emailBody;
          } catch (e) { /* use default */ }
        }

        // Send email
        await resend.emails.send({
          from: "RŌM <bookings@romlife.co>",
          to: guestEmail,
          subject: `${guideName} — thinking about your next trip?`,
          html: `
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
              <div style="background: #0d0d0d; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
                <div style="font-size: 28px; letter-spacing: 0.12em; color: #c9a96e; font-weight: 300;">RŌM</div>
              </div>
              <div style="background: #f9f7f4; padding: 36px; border-radius: 0 0 8px 8px;">
                <div style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: #999; margin-bottom: 12px;">From ${guideName}</div>
                <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 28px;">${emailBody}</p>
                <a href="https://romlife.co/guides/${guide.id}" style="display: block; background: #c9a96e; color: #0d0d0d; text-decoration: none; text-align: center; padding: 14px; border-radius: 6px; font-weight: 700; font-size: 14px;">
                  See Availability →
                </a>
              </div>
            </div>
          `,
        });

        // Update guest profile
        const newHistory = [...outreachHistory, { date: now.toISOString(), reason, type: "repeat_guest" }];
        await supabase
          .from("guest_profiles")
          .update({
            outreach_count: (guest.outreach_count || 0) + 1,
            last_outreach_at: now.toISOString(),
            outreach_history: newHistory,
          })
          .eq("id", guest.id);

        results.push({ guideId: guide.id, guestId: guest.profile_id, reason });
      }

      // Notify guide if outreach was sent
      const guideResults = results.filter((r: any) => r.guideId === guide.id);
      if (guideResults.length > 0) {
        await supabase.from("guide_notifications").insert({
          guide_id: guide.id,
          type: "repeat_guest_sent",
          title: `Reached out to ${guideResults.length} past guest${guideResults.length > 1 ? "s" : ""}`,
          body: `Personalized emails sent to bring them back this season.`,
          metadata: { count: guideResults.length },
        });
      }
    } catch (e: any) {
      results.push({ guideId: guide.id, action: "error", error: e.message });
    }
  }

  return NextResponse.json({ processed: results.length, results, timestamp: now.toISOString() });
}
