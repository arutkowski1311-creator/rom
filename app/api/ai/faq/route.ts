import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    const { guideId, location, categories, bio, businessName } = await req.json();

    if (!guideId) {
      return NextResponse.json({ error: "guideId required" }, { status: 400 });
    }

    const activity = categories?.[0] || "Adventure";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [{
        role: "user",
        content: `Generate 5 FAQ items for an adventure guide's public profile page.

GUIDE CONTEXT:
- Business: ${businessName || "Guide"}
- Activity: ${activity}
- Location: ${location || "Unknown"}
- Bio: ${bio || ""}
- Other activities: ${(categories || []).join(", ")}

Generate questions a potential guest would ACTUALLY ask before booking this specific type of experience in this specific location. The answers should be:
- Written in the guide's voice (warm, expert, direct)
- Specific to the activity and location (not generic)
- Short — 2-3 sentences max per answer
- Helpful for converting a browser into a booker

MUST include questions about:
1. Gear/equipment (what guide provides vs what guest brings)
2. Skill level requirements
3. Weather/cancellation policy
4. What's included in the price
5. One unique question specific to this activity in this location

Return ONLY valid JSON array, no markdown:
[{"q": "Question text?", "a": "Answer text."}]`
      }]
    });

    const text = (response.content[0] as any).text.trim();
    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse FAQ" }, { status: 500 });
    }

    const faq = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ faq });
  } catch (e: any) {
    console.error("FAQ generation error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
