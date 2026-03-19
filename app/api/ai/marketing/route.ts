import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { guideId, contentType, context } = await req.json();

    if (!guideId || !contentType) {
      return NextResponse.json({ error: "guideId and contentType required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Fetch guide data for context
    const { data: guide } = await supabase
      .from("guides")
      .select("*")
      .eq("id", guideId)
      .single();

    if (!guide) {
      return NextResponse.json({ error: "Guide not found" }, { status: 404 });
    }

    // Fetch guide's reviews
    const { data: reviews } = await supabase
      .from("reviews")
      .select("*")
      .eq("guide_id", guideId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Fetch profile name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", guide.profile_id)
      .single();

    const guideName = profile?.full_name || "Guide";
    const reviewTexts = (reviews || []).map((r: any) => r.text || r.body).filter(Boolean);

    const contentPrompts: Record<string, string> = {
      instagram: `Write 3 Instagram caption options for ${guideName}, a ${guide.categories?.[0] || "adventure"} guide in ${guide.location}. Each caption should be 1-3 sentences, feel authentic (not salesy), include relevant hashtags (8-12), and end with a subtle call to action. Use the guide's actual voice from their bio and reviews.`,

      facebook: `Write 3 Facebook post options for ${guideName}, a ${guide.categories?.[0] || "adventure"} guide in ${guide.location}. Each post should be 2-4 sentences, tell a brief story or share insight about their craft, and feel like something a real guide would post. Include a call to action.`,

      email: `Write a short email newsletter (subject line + 3-4 paragraph body) for ${guideName}, a ${guide.categories?.[0] || "adventure"} guide in ${guide.location}. The email should update past guests on seasonal conditions, mention an upcoming opening, and feel personal. Include a subject line that gets opened.`,

      review_spotlight: `Take one of these real guest reviews and reformat it into a shareable social media card caption. Make it feel premium and authentic, highlighting the guest's words. Add a brief introduction from the guide's perspective.`,
    };

    const systemPrompt = `You are a marketing content creator for outdoor adventure guides. You write in a direct, authentic voice — never generic, never salesy. You understand that guides are professionals who earn trust through expertise, not marketing gimmicks. Every piece of content should feel like it came from the guide themselves.

Guide: ${guideName}
Location: ${guide.location}
Activity: ${guide.categories?.join(", ") || "Adventure"}
Bio: ${guide.bio || guide.tagline || ""}
${reviewTexts.length > 0 ? `Recent reviews:\n${reviewTexts.slice(0, 5).join("\n---\n")}` : ""}
${context?.topic ? `Focus topic: ${context.topic}` : ""}

Return your response as JSON with this structure:
{
  "options": [
    { "title": "Option 1 label", "content": "The actual content", "hashtags": ["if applicable"] },
    { "title": "Option 2 label", "content": "The actual content", "hashtags": ["if applicable"] },
    { "title": "Option 3 label", "content": "The actual content", "hashtags": ["if applicable"] }
  ]
}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: contentPrompts[contentType] || contentPrompts.instagram,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON from response
    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { options: [{ title: "Generated", content: text, hashtags: [] }] };
    } catch {
      parsed = { options: [{ title: "Generated", content: text, hashtags: [] }] };
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("AI marketing error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate content" },
      { status: 500 }
    );
  }
}
