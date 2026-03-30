import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Message categories and how to handle them
const CLASSIFICATIONS = {
  availability: { autoRespond: true, label: "Availability inquiry" },
  pricing: { autoRespond: true, label: "Pricing question" },
  what_to_bring: { autoRespond: true, label: "What to bring / preparation" },
  experience_level: { autoRespond: true, label: "Skill level question" },
  logistics: { autoRespond: true, label: "Meeting point / logistics" },
  general_info: { autoRespond: true, label: "General information" },
  booking_intent: { autoRespond: true, label: "Ready to book" },
  reschedule: { autoRespond: false, label: "Reschedule request", priority: "high" },
  cancellation: { autoRespond: false, label: "Cancellation request", priority: "urgent" },
  complaint: { autoRespond: false, label: "Issue or complaint", priority: "urgent" },
  special_request: { autoRespond: false, label: "Special request", priority: "normal" },
  negotiation: { autoRespond: false, label: "Pricing negotiation", priority: "normal" },
  safety: { autoRespond: false, label: "Safety concern", priority: "urgent" },
  personal: { autoRespond: false, label: "Personal message", priority: "low" },
  unknown: { autoRespond: false, label: "Needs review", priority: "normal" },
};

export async function POST(req: Request) {
  try {
    const { messageId, threadId, guideId } = await req.json();
    if (!messageId || !guideId) {
      return NextResponse.json({ error: "Missing messageId or guideId" }, { status: 400 });
    }

    // Fetch the incoming message
    const { data: message } = await supabase
      .from("messages").select("*").eq("id", messageId).single();
    if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

    // Fetch guide context
    const { data: guide } = await supabase
      .from("guides").select("*, profiles(full_name)").eq("id", guideId).single();
    if (!guide) return NextResponse.json({ error: "Guide not found" }, { status: 404 });

    const guideName = guide.display_name || guide.profiles?.full_name || "Guide";
    const voiceProfile = guide.voice_profile;

    // Fetch guide's packages for context
    const { data: packages } = await supabase
      .from("packages").select("title, price, price_type, duration, description")
      .eq("guide_id", guideId).eq("active", true);

    // Fetch thread context (previous messages)
    const { data: threadMsgs } = await supabase
      .from("messages").select("body, sender_id, created_at")
      .eq("thread_id", threadId || message.thread_id)
      .order("created_at", { ascending: true }).limit(10);

    // Fetch any linked booking
    let bookingContext = "";
    if (message.thread_id) {
      const { data: thread } = await supabase
        .from("threads").select("booking_id").eq("id", message.thread_id).single();
      if (thread?.booking_id) {
        const { data: booking } = await supabase
          .from("bookings").select("package_title, trip_date, guests, status, guest_name")
          .eq("id", thread.booking_id).single();
        if (booking) {
          bookingContext = `\nLinked booking: ${booking.package_title} on ${booking.trip_date} for ${booking.guests} guests (status: ${booking.status})`;
        }
      }
    }

    // Fetch upcoming availability (next 30 days of confirmed bookings)
    const today = new Date().toISOString().split("T")[0];
    const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const { data: upcomingBookings } = await supabase
      .from("bookings").select("trip_date, package_title")
      .eq("guide_id", guideId)
      .in("status", ["confirmed", "pending"])
      .gte("trip_date", today).lte("trip_date", thirtyDays);

    const bookedDates = (upcomingBookings || []).map(b => b.trip_date);

    // Step 1: Classify the message
    const classifyResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      system: "You classify incoming messages to adventure guides. Return ONLY a JSON object with: {\"classification\": \"one of: availability, pricing, what_to_bring, experience_level, logistics, general_info, booking_intent, reschedule, cancellation, complaint, special_request, negotiation, safety, personal, unknown\", \"confidence\": 0.0-1.0, \"summary\": \"one sentence summary\"}",
      messages: [{ role: "user", content: `Classify this message from a potential guest:\n\n"${message.body}"` }],
    });

    let classification = "unknown";
    let confidence = 0.5;
    let summary = message.body.substring(0, 100);
    try {
      const classText = classifyResponse.content[0].type === "text" ? classifyResponse.content[0].text : "";
      const parsed = JSON.parse(classText.match(/\{[\s\S]*\}/)?.[0] || "{}");
      classification = parsed.classification || "unknown";
      confidence = parsed.confidence || 0.5;
      summary = parsed.summary || summary;
    } catch (e) { /* use defaults */ }

    const classConfig = CLASSIFICATIONS[classification as keyof typeof CLASSIFICATIONS] || CLASSIFICATIONS.unknown;

    // Update the message with classification
    await supabase.from("messages").update({
      ai_classification: classification,
      ai_confidence: confidence,
      requires_human: !classConfig.autoRespond,
      message_type: classification,
    }).eq("id", messageId);

    // Step 2: Generate response (auto or draft)
    const packageList = (packages || []).map(p => `- ${p.title}: $${p.price}/${p.price_type}, ${p.duration}. ${p.description?.substring(0, 100)}`).join("\n");

    const voiceInstructions = voiceProfile && typeof voiceProfile === "object"
      ? `Tone: ${voiceProfile.tone}. Style: ${voiceProfile.personality_markers}. ${voiceProfile.sample_phrases ? `Phrases they use: "${(voiceProfile.sample_phrases as string[]).join('", "')}"` : ""}`
      : "Tone: warm, professional, knowledgeable.";

    const responsePrompt = `You are responding to a guest message on behalf of ${guideName}, an adventure guide.

${voiceInstructions}

GUIDE'S PACKAGES:
${packageList || "No packages listed yet."}

BOOKED DATES (next 30 days — NOT available):
${bookedDates.length > 0 ? bookedDates.join(", ") : "No bookings yet — wide open."}
${bookingContext}

CONVERSATION HISTORY:
${(threadMsgs || []).map(m => `${m.sender_id === guide.profile_id ? guideName : "Guest"}: ${m.body}`).join("\n")}

GUEST'S MESSAGE:
"${message.body}"

CLASSIFICATION: ${classification} (${classConfig.label})

${classConfig.autoRespond ? `Write a complete response in ${guideName}'s voice. Be helpful, warm, and specific. If they ask about availability, check the booked dates and suggest open dates. If they ask what to bring, reference the specific package. End with a soft call to action (book link, next question, etc.). Keep it 2-4 sentences. DO NOT mention you are AI.` : `Write a DRAFT response for ${guideName} to review before sending. Flag what needs their personal input. Keep it helpful but note "[Guide: please confirm/add details here]" where personal knowledge is needed.`}

Return ONLY the response text, no JSON, no preamble.`;

    const responseResult = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: responsePrompt }],
    });

    const responseText = responseResult.content[0].type === "text" ? responseResult.content[0].text.trim() : "";

    if (classConfig.autoRespond && confidence >= 0.7) {
      // Auto-send the response
      const { data: autoMsg } = await supabase.from("messages").insert({
        thread_id: message.thread_id,
        sender_id: guide.profile_id,
        body: responseText,
        auto_generated: true,
      }).select().single();

      // Log it
      await supabase.from("auto_messages").insert({
        guide_id: guideId,
        trigger_type: `auto_reply_${classification}`,
        body: responseText,
        recipient_name: "Guest",
      });

      // Update original message
      await supabase.from("messages").update({
        auto_responded: true,
        auto_response_id: autoMsg?.id,
      }).eq("id", messageId);

      return NextResponse.json({
        action: "auto_responded",
        classification,
        confidence,
        summary,
        response: responseText,
      });
    } else {
      // Create an action item for the guide
      await supabase.from("action_items").insert({
        guide_id: guideId,
        type: `message_${classification}`,
        priority: (classConfig as any).priority || "normal",
        title: `${classConfig.label}: ${summary.substring(0, 60)}`,
        body: message.body,
        context: { classification, confidence, thread_id: message.thread_id, message_id: messageId },
        thread_id: message.thread_id,
        ai_draft: responseText,
      });

      // Store draft on the message
      await supabase.from("messages").update({ ai_draft: responseText }).eq("id", messageId);

      return NextResponse.json({
        action: "needs_human",
        classification,
        confidence,
        summary,
        draft: responseText,
        priority: (classConfig as any).priority || "normal",
      });
    }
  } catch (e: any) {
    console.error("Auto-respond error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
