import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    const { section, currentText, instruction } = await req.json();

    if (!currentText || !instruction) {
      return NextResponse.json({ error: "Missing currentText or instruction" }, { status: 400 });
    }

    const prompt = `You are rewriting a single section of a premium guest itinerary for RŌM, an adventure guide marketplace.

CURRENT TEXT:
"${currentText}"

INSTRUCTION FROM THE GUIDE:
${instruction}

RULES:
- Rewrite the text following the guide's instruction exactly
- Keep roughly the same length (±20%)
- Maintain the warm, expert, personal tone — never corporate
- Keep any guest names or specific references from the original
- Do NOT add specific location names, trailheads, or meeting points
- Do NOT add specific statistics unless they were in the original
- Return ONLY the rewritten text — no quotes, no explanation, no preamble
- The output should be ready to drop directly into the itinerary`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const rewritten = response.content[0].type === "text" ? response.content[0].text.trim() : "";

    // Strip any surrounding quotes the model might add
    const cleaned = rewritten.replace(/^["']|["']$/g, "");

    return NextResponse.json({ rewritten: cleaned });
  } catch (e: any) {
    console.error("Rewrite error:", e);
    return NextResponse.json({ error: e.message || "Rewrite failed" }, { status: 500 });
  }
}
