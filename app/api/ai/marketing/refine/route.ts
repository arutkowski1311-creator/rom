import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { loadGuideContext, buildBaseContext } from "@/app/lib/ai-prompts";
import {
  REFINE_ACTIONS,
  validateNewsletterContent,
  type NewsletterContent,
  type NewsletterBlock,
  type RefineAction,
} from "@/app/lib/newsletter-schema";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function actionInstruction(action: RefineAction): string {
  switch (action) {
    case "regenerate": return "Rewrite this block from scratch with the same structural shape but a fresh angle. Keep the type, label, id, and any URLs unchanged.";
    case "shorter": return "Rewrite this block ~30% shorter. Cut filler, keep the strongest sentence. Preserve all structural fields.";
    case "longer": return "Rewrite this block ~50% longer. Add specific detail (geography, conditions, sensory texture). Don't pad — earn every word.";
    case "more_exciting": return "Rewrite this block with more energy and forward motion. Stronger verbs, tighter sentences, vivid imagery. Avoid hype words like 'epic' or 'insane'.";
    case "more_professional": return "Rewrite this block in a more polished, authoritative tone. Trim emotional language. Convey expertise.";
    case "more_personal": return "Rewrite this block in the guide's first-person voice. Reference what they personally see, feel, or do.";
    case "add_local_flavor": return "Rewrite this block adding more specific local detail — actual place names, species, terrain features, weather patterns, local culture. Names beat adjectives.";
  }
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  const candidate = fenced?.[1] || text.match(/\{[\s\S]*\}/)?.[0] || text;
  try { return JSON.parse(candidate); } catch { return null; }
}

function findBlock(content: NewsletterContent, blockId: string): NewsletterBlock | null {
  return content.sections.find((b) => b.id === blockId) || null;
}

function blockSchemaHint(block: NewsletterBlock): string {
  // Tell the model exactly which fields to return for this block type
  switch (block.type) {
    case "hero": return `{ "type": "hero", "id": "${block.id}", "label": "${block.label}", "headline": "...", "body": "..." }`;
    case "conditions":
    case "local_intel":
    case "gear_tip":
    case "upcoming":
    case "story": return `{ "type": "${block.type}", "id": "${block.id}", "label": "${block.label}", "headline": "...", "body": "..." }`;
    case "featured_trip": return `{ "type": "featured_trip", "id": "${block.id}", "label": "${block.label}", "headline": "...", "body": "...", "price": "${block.price || ""}", "duration": "${block.duration || ""}", "buttonText": "${block.buttonText}", "buttonUrl": "${block.buttonUrl}" }`;
    case "testimonial": return `{ "type": "testimonial", "id": "${block.id}", "label": "${block.label}", "quote": "...", "author": "${block.author}", "trip": "${block.trip || ""}" }`;
    case "image": return `{ "type": "image", "id": "${block.id}", "label": "${block.label}", "imageUrl": "${block.imageUrl}", "caption": "..." }`;
    case "text": return `{ "type": "text", "id": "${block.id}", "label": "${block.label}", "body": "..." }`;
    case "cta": return `{ "type": "cta", "id": "${block.id}", "label": "${block.label}", "headline": "...", "body": "...", "buttonText": "${block.buttonText}", "buttonUrl": "${block.buttonUrl}" }`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { guideId, content, blockId, action, instructions } = await req.json();

    if (!guideId || !content || !blockId || !action) {
      return NextResponse.json({ error: "guideId, content, blockId, action required" }, { status: 400 });
    }
    if (!REFINE_ACTIONS.includes(action)) {
      return NextResponse.json({ error: `Invalid action. Must be one of: ${REFINE_ACTIONS.join(", ")}` }, { status: 400 });
    }

    const validated = validateNewsletterContent(content);
    const block = findBlock(validated, blockId);
    if (!block) return NextResponse.json({ error: "Block not found in content" }, { status: 404 });

    const ctx = await loadGuideContext(guideId);
    const baseContext = buildBaseContext(ctx);
    const actionLine = actionInstruction(action);
    const schemaHint = blockSchemaHint(block);

    const surroundingContext = validated.sections
      .filter((b) => b.id !== blockId && b.enabled !== false)
      .map((b) => {
        if (b.type === "testimonial") return `[${b.label}] "${b.quote}" — ${b.author}`;
        if (b.type === "image") return `[${b.label}] (image)`;
        if ("headline" in b) return `[${b.label}] ${b.headline}: ${"body" in b ? String(b.body).slice(0, 120) : ""}`;
        if (b.type === "text") return `[${b.label}] ${b.body.slice(0, 120)}`;
        return "";
      })
      .filter(Boolean)
      .join("\n");

    const system = `You are editing a single block of an outdoor adventure newsletter. ${actionLine}

${baseContext}

OTHER BLOCKS IN THIS NEWSLETTER (don't repeat their content — your block must be distinct):
${surroundingContext || "(no other blocks)"}

CURRENT BLOCK TO REWRITE:
${JSON.stringify(block, null, 2)}

${instructions ? `\nADDITIONAL USER INSTRUCTIONS:\n${instructions}\n` : ""}

Return ONLY the updated block JSON in this exact shape (no prose, no fences):
${schemaHint}

Preserve the id and type fields exactly. Preserve any buttonUrl unchanged.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: `Apply: ${action}. Return only the updated JSON block.` }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJson(text);
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({ error: "Model returned invalid JSON", raw: text.slice(0, 400) }, { status: 502 });
    }

    // Stitch the refined block back into the content and re-validate
    const refined = parsed as Record<string, unknown>;
    refined.id = block.id;
    refined.type = block.type;
    refined.label = block.label;
    if (block.enabled !== undefined) refined.enabled = block.enabled;
    // Preserve URLs the model shouldn't touch
    if (block.type === "featured_trip") refined.buttonUrl = block.buttonUrl;
    if (block.type === "cta") refined.buttonUrl = block.buttonUrl;

    const newSections = validated.sections.map((b) => (b.id === blockId ? refined : b));
    const newContent = validateNewsletterContent({ ...validated, sections: newSections });

    return NextResponse.json({ block: newContent.sections.find((b) => b.id === blockId), content: newContent });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Refine failed";
    console.error("Refine error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
