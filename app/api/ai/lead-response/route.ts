import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";
import { Resend } from "resend";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { threadId, messageId } = await req.json();
    if (!threadId) {
      return NextResponse.json({ error: "threadId required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Fetch the thread
    const { data: thread } = await supabase
      .from("message_threads")
      .select("*")
      .eq("id", threadId)
      .single();

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Fetch guide with voice profile
    const { data: guide } = await supabase
      .from("guides")
      .select("*, profiles!guides_profile_id_fkey(full_name, email)")
      .eq("id", thread.guide_id)
      .single();

    if (!guide) {
      return NextResponse.json({ error: "Guide not found" }, { status: 404 });
    }

    // Fetch the inquiry message
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    const lastMessage = messages?.[messages.length - 1];
    if (!lastMessage) {
      return NextResponse.json({ error: "No messages in thread" }, { status: 400 });
    }

    // Fetch guest info
    const { data: guestProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", thread.guest_id)
      .single();

    // Fetch guide's packages for context
    const { data: packages } = await supabase
      .from("packages")
      .select("title, duration, price, price_type, description")
      .eq("guide_id", guide.id)
      .eq("active", true);

    // Fetch availability (blocked dates for next 30 days)
    const today = new Date().toISOString().split("T")[0];
    const thirtyOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const { data: blocked } = await supabase
      .from("availability")
      .select("date")
      .eq("guide_id", guide.id)
      .gte("date", today)
      .lte("date", thirtyOut);

    const blockedDates = (blocked || []).map((b: any) => b.date);
    const voiceProfile = guide.voice_profile;
    const guideName = guide.profiles?.full_name || "Guide";

    // Generate response in guide's voice
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: `You are responding to a guest inquiry on behalf of ${guideName}, an adventure guide on RŌM.

${voiceProfile ? `VOICE PROFILE: Tone: ${voiceProfile.tone}. Style: ${voiceProfile.personality_markers}. Sample phrases: ${(voiceProfile.sample_phrases || []).join(", ")}` : `Write in a warm, professional tone.`}

Write a short, warm response (3-5 sentences) that:
1. Acknowledges their interest personally
2. Confirms general availability (or suggests alternative dates)
3. Briefly mentions what the experience involves
4. Includes a natural call to book

Sound like ${guideName}, not like a platform. Keep it conversational and real.
Return ONLY the message text, no JSON.`,
      messages: [{
        role: "user",
        content: `Guest "${guestProfile?.full_name || "Guest"}" sent this inquiry:
"${lastMessage.body}"

Available packages:
${(packages || []).map((p: any) => `- ${p.title}: $${p.price}/${p.price_type}, ${p.duration}`).join("\n")}

Blocked dates in next 30 days: ${blockedDates.length > 0 ? blockedDates.join(", ") : "None — wide open"}

Generate the response.`,
      }],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    // Insert auto-response into messages
    const { data: newMsg } = await supabase
      .from("messages")
      .insert({
        thread_id: threadId,
        sender_id: guide.profile_id,
        body: responseText.trim(),
        auto_generated: true,
        ai_draft: responseText.trim(),
      })
      .select()
      .single();

    // Update thread's last_message_at
    await supabase
      .from("message_threads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", threadId);

    // Send email notification to guest
    if (guestProfile?.email) {
      await resend.emails.send({
        from: "RŌM <bookings@romlife.co>",
        to: guestProfile.email,
        subject: `${guideName} replied to your inquiry`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
            <div style="background: #0d0d0d; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
              <div style="font-size: 28px; letter-spacing: 0.12em; color: #c9a96e; font-weight: 300;">RŌM</div>
            </div>
            <div style="background: #f9f7f4; padding: 36px; border-radius: 0 0 8px 8px;">
              <h1 style="font-size: 22px; font-weight: 500; margin: 0 0 8px;">${guideName} replied</h1>
              <div style="background: #fff; border: 1px solid #e5e0d8; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="font-size: 14px; color: #333; line-height: 1.7; margin: 0;">${responseText.trim()}</p>
              </div>
              <a href="https://romlife.co/dashboard" style="display: block; background: #c9a96e; color: #0d0d0d; text-decoration: none; text-align: center; padding: 14px; border-radius: 6px; font-weight: 700; font-size: 14px;">
                View in Dashboard →
              </a>
            </div>
          </div>
        `,
      });
    }

    // Notify guide about the auto-response
    await supabase.from("guide_notifications").insert({
      guide_id: guide.id,
      type: "lead_response_sent",
      title: `Auto-replied to ${guestProfile?.full_name || "a guest"}`,
      body: `We responded to their inquiry in your voice. Review it in Messages.`,
      metadata: { thread_id: threadId, message_id: newMsg?.id },
    });

    return NextResponse.json({ success: true, response: responseText.trim() });
  } catch (err: any) {
    console.error("Lead response error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
