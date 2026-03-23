import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { guideId, answers, saveToProfile } = await req.json();

    if (!guideId || !answers) {
      return NextResponse.json({ error: "guideId and answers required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Fetch guide context
    // Allow "preview" mode during onboarding (guide not yet created)
    let guide: any = null;
    let guideName = "the guide";

    if (guideId !== "preview") {
      const { data: g } = await supabase
        .from("guides")
        .select("*, profiles!guides_profile_id_fkey(full_name)")
        .eq("id", guideId)
        .single();

      if (!g) {
        return NextResponse.json({ error: "Guide not found" }, { status: 404 });
      }
      guide = g;
      guideName = g.profiles?.full_name || "the guide";
    }

    // Build the prompt from interview answers
    const interviewText = Object.entries(answers)
      .map(([q, a]) => `Q: ${q}\nA: ${a}`)
      .join("\n\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: `You are a profile writer for RŌM, a premium adventure guide marketplace. You analyze interview transcripts from guides and generate their public profile content AND an internal voice profile.

Your outputs must:
- Sound like the guide wrote them (first person, their vocabulary, their rhythm)
- Feel authentic and warm, never corporate or generic
- Highlight what makes this specific guide unique
- Be factual — only reference things they actually said

Return ONLY valid JSON with these exact keys:
{
  "bio": "150-200 word About section in guide's first-person voice",
  "headline": "One-line specialty description, max 12 words",
  "specialty_keywords": ["array", "of", "10-15", "SEO", "keywords", "extracted", "from", "responses"],
  "voice_profile": {
    "tone": "2-3 words describing their tone (e.g. 'warm, knowledgeable, understated')",
    "vocabulary_level": "casual / conversational / articulate / technical",
    "personality_markers": "3-5 sentence description of their communication style, vocabulary preferences, and personality",
    "sample_phrases": ["2-3 phrases that capture their voice"]
  }
}`,
      messages: [{
        role: "user",
        content: `Here is the interview transcript for ${guideName}, who is based in ${guide.location || "their area"} and specializes in ${(guide.categories || []).join(", ") || "outdoor adventures"}:

${interviewText}

Generate their profile content and voice profile. Return only the JSON object.`,
      }],
    });

    // Parse AI response
    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    let parsed;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (e) {
      console.error("Failed to parse AI response:", responseText);
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    // Save to profile if requested
    if (saveToProfile) {
      await supabase
        .from("guides")
        .update({
          ai_bio: parsed.bio,
          ai_headline: parsed.headline,
          voice_profile: parsed.voice_profile,
          specialty_keywords: parsed.specialty_keywords,
          onboarding_interview: answers,
          bio: parsed.bio, // also set the main bio field
          tagline: parsed.headline,
        })
        .eq("id", guideId);
    }

    return NextResponse.json({
      bio: parsed.bio,
      headline: parsed.headline,
      voice_profile: parsed.voice_profile,
      specialty_keywords: parsed.specialty_keywords,
    });
  } catch (err: any) {
    console.error("Voice profile generation error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate" }, { status: 500 });
  }
}
