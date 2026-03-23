import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Fetch photos from Unsplash or fallback
async function fetchStockPhotos(query: string, count = 6): Promise<string[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${key}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((p: any) => p.urls?.regular).filter(Boolean);
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { guideId, contentType, context } = await req.json();

    if (!guideId || !contentType) {
      return NextResponse.json({ error: "guideId and contentType required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: guide } = await supabase
      .from("guides").select("*").eq("id", guideId).single();
    if (!guide) return NextResponse.json({ error: "Guide not found" }, { status: 404 });

    const { data: reviews } = await supabase
      .from("reviews").select("*").eq("guide_id", guideId)
      .order("created_at", { ascending: false }).limit(10);

    const { data: profile } = await supabase
      .from("profiles").select("full_name").eq("id", guide.profile_id).single();

    const { data: packages } = await supabase
      .from("packages").select("title, price, duration, description")
      .eq("guide_id", guideId).eq("active", true).limit(5);

    const guideName = profile?.full_name || "Guide";
    const activity = guide.categories?.[0] || "Adventure";
    const location = guide.location || "";
    const reviewTexts = (reviews || []).map((r: any) => r.text || r.body).filter(Boolean);
    const packageList = (packages || []).map((p: any) => `${p.title} ($${p.price}, ${p.duration})`).join("; ");

    // Fetch stock photos based on guide's activity + location
    const photoQuery = `${activity} ${location}`.trim();
    const stockPhotos = await fetchStockPhotos(photoQuery);

    // Guide's own photos
    const guidePhotos = [
      ...(guide.gallery_photos || []),
      guide.cover_photo_url,
      guide.profile_photo_url,
    ].filter(Boolean);

    // Content type specific prompts and response formats
    let systemPrompt: string;
    let userPrompt: string;

    const baseContext = `Guide: ${guideName}
Location: ${location}
Activity: ${guide.categories?.join(", ") || "Adventure"}
Bio: ${guide.bio || guide.tagline || ""}
Packages: ${packageList || "Not set"}
${reviewTexts.length > 0 ? `Recent reviews:\n${reviewTexts.slice(0, 3).join("\n---\n")}` : ""}
${context?.topic ? `Focus topic: ${context.topic}` : ""}`;

    if (contentType === "reel") {
      systemPrompt = `You are a short-form video strategist for outdoor adventure guides. You create reel/TikTok storyboards that guides can film with their phone. You understand that guides have incredible footage — they just need structure.

${baseContext}

Return JSON:
{
  "options": [
    {
      "title": "Reel concept name",
      "duration": "30s",
      "hook": "The opening 2 seconds that stops the scroll",
      "musicVibe": "Suggested music style (e.g., 'Ambient acoustic, building energy')",
      "shots": [
        { "time": "0:00-0:03", "visual": "What to film", "textOverlay": "Text on screen or null", "transition": "cut/fade/swipe" },
        { "time": "0:03-0:08", "visual": "What to film", "textOverlay": null, "transition": "cut" }
      ],
      "caption": "Post caption for the reel",
      "hashtags": ["relevant", "hashtags"],
      "headline": "Bold headline for thumbnail (max 6 words)",
      "tip": "One filming tip for this reel"
    }
  ]
}

Create 3 reel concepts. Each should be 15-45 seconds. Mix formats: one storytelling, one educational/tip, one showcase. Every reel must have a hook in the first 2 seconds. Text overlays should be punchy — 3-6 words max.`;

      userPrompt = `Create 3 reel storyboards for ${guideName}. They guide ${activity} in ${location}. Make these filmable with a phone — no fancy equipment needed.`;

    } else if (contentType === "email") {
      systemPrompt = `You are an email marketing specialist for outdoor adventure guides. You write newsletters that feel personal, not corporate. The guide's past guests should feel like they got a letter from a friend who happens to know the best fishing spots.

${baseContext}

Return JSON:
{
  "options": [
    {
      "title": "Email concept name",
      "subject": "Email subject line (max 50 chars, no spam words)",
      "preheader": "Preview text shown in inbox (max 90 chars)",
      "sections": [
        { "type": "hero", "headline": "Big bold headline", "body": "1-2 sentence intro" },
        { "type": "conditions", "headline": "Section headline", "body": "Current conditions update — what's happening on the water/trail/mountain right now" },
        { "type": "spotlight", "headline": "Featured trip or package name", "body": "Description with specific dates/availability", "price": "$275", "cta": "Book This Trip" },
        { "type": "testimonial", "quote": "A real or realistic guest quote", "guest": "Guest Name" },
        { "type": "cta", "headline": "Don't wait", "body": "Closing urgency line", "buttonText": "View Availability", "buttonUrl": "https://romlife.co/guides/SLUG" }
      ],
      "headline": "Short headline for preview card (max 8 words)"
    }
  ]
}

Create 2 email newsletter options. Each should have 4-6 sections. The tone should match the guide's voice. Include real package names and prices if available. The hero section sets the mood — seasonal, specific, evocative.`;

      userPrompt = `Create 2 email newsletter options for ${guideName} to send to past guests. Current month: ${new Date().toLocaleString("en-US", { month: "long" })}. Make them want to book again.`;

    } else {
      // Instagram, Facebook, Review Spotlight
      systemPrompt = `You are a marketing content creator for outdoor adventure guides. You write in a direct, authentic voice — never generic, never salesy. Every piece of content should feel like it came from the guide themselves.

${baseContext}

Return JSON:
{
  "options": [
    { "title": "Option label", "content": "The caption", "hashtags": ["if applicable"], "headline": "Bold headline for image card (max 8 words)", "subline": "One supporting sentence for image card" }
  ]
}

The headline and subline will be overlaid on photos as a branded content card. Keep the headline punchy — it needs to stop someone scrolling.`;

      const contentPrompts: Record<string, string> = {
        instagram: `Write 3 Instagram caption options for ${guideName}. Each: 1-3 sentences, authentic voice, 8-12 hashtags, subtle CTA.`,
        facebook: `Write 3 Facebook post options for ${guideName}. Each: 2-4 sentences, tell a story or share insight, include CTA.`,
        review_spotlight: `Take one of the real guest reviews and create 3 shareable social card captions. Highlight the guest's words. Add brief guide-perspective intro.`,
      };

      userPrompt = contentPrompts[contentType] || contentPrompts.instagram;
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { options: [{ title: "Generated", content: text }] };
    } catch {
      parsed = { options: [{ title: "Generated", content: text }] };
    }

    // Attach photos and guide info
    parsed.guidePhotos = guidePhotos;
    parsed.stockPhotos = stockPhotos;
    parsed.guideName = guideName;
    parsed.guideLocation = location;
    parsed.guideActivity = activity;
    parsed.guideSlug = guide.slug || "";

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("AI marketing error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate content" }, { status: 500 });
  }
}
