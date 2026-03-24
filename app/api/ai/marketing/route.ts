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
    const voiceProfile = guide.voice_profile;
    const currentMonth = new Date().toLocaleString("en-US", { month: "long" }).toLowerCase();

    // Map guide category to vertical config slug
    const categoryMap: Record<string, string> = {
      "Fly Fishing": "fly_fishing", "Fishing": "fly_fishing",
      "Hiking": "hiking", "Mountaineering": "hiking",
      "Rock Climbing": "rock_climbing", "Climbing": "rock_climbing",
      "Ice Climbing": "ice_climbing",
      "Backcountry Skiing": "backcountry_skiing", "Skiing": "backcountry_skiing",
      "Food Tour": "food_tour", "Culinary": "food_tour",
      "Wildlife": "wildlife_safari", "Safari": "wildlife_safari",
      "4WD": "four_wheel_drive", "Jeep": "four_wheel_drive",
      "Mountain Biking": "mountain_biking", "MTB": "mountain_biking",
      "Rafting": "whitewater", "Whitewater": "whitewater",
      "Kayaking": "paddling", "Canoeing": "paddling", "Paddling": "paddling",
      "Stargazing": "stargazing", "Astronomy": "stargazing",
      "Photography": "photography",
      "Cultural": "cultural_history", "Historical": "cultural_history",
      "Via Ferrata": "via_ferrata",
      "Hunting": "hunting",
      "Snowmobiling": "snowmobiling",
      "Foraging": "foraging",
      "Brewery": "brewery_tour", "Beer": "brewery_tour",
      "Diving": "whitewater", "Surfing": "whitewater",
      "Camping": "hiking", "Backpacking": "hiking",
      "Sailing": "paddling", "Snowshoeing": "backcountry_skiing",
      "Ice Fishing": "fly_fishing",
    };
    const verticalSlug = categoryMap[activity] || (activity || "").toLowerCase().replace(/[^a-z_]/g, "_").replace(/_+/g, "_");
    const { data: verticalConfig } = await supabase
      .from("vertical_configs").select("*")
      .eq("vertical", verticalSlug).maybeSingle();

    const seasonalHint = verticalConfig?.seasonal_intelligence?.[currentMonth] || "";
    const promptPersonality = verticalConfig?.prompt_personality || "";
    const notePrompt = verticalConfig?.notes_from_guide_prompt || "";

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
${voiceProfile ? `Voice/tone: ${typeof voiceProfile === "object" ? JSON.stringify(voiceProfile) : voiceProfile}` : ""}
Packages: ${packageList || "Not set"}
Guide's profile URL: https://romlife.co/guides/${guide.slug || ""}
${reviewTexts.length > 0 ? `Recent reviews:\n${reviewTexts.slice(0, 3).join("\n---\n")}` : ""}
${context?.topic ? `Focus topic: ${context.topic}` : ""}

CURRENT MONTH: ${currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1)}
${seasonalHint ? `WHAT'S HAPPENING RIGHT NOW (${currentMonth}): ${seasonalHint}` : ""}
${promptPersonality ? `VOICE GUIDANCE: ${promptPersonality}` : ""}

USE YOUR REAL KNOWLEDGE of ${location} to reference actual geography, waterways, trails, terrain, local culture, and seasonal conditions. Be specific — name real places, real species, real conditions. This content should feel like it was written by someone who LIVES there.`;

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
      systemPrompt = `You are an email marketing specialist for outdoor adventure guides. You write newsletters that feel personal, not corporate. The guide's past guests should feel like they got a letter from a friend who happens to know the best spots.

${baseContext}

Return JSON:
{
  "options": [
    {
      "title": "Email concept name",
      "subject": "Email subject line (max 50 chars, compelling, no spam words)",
      "preheader": "Preview text shown in inbox (max 90 chars)",
      "sections": [
        { "type": "hero", "headline": "Big bold seasonal headline", "body": "2-3 sentences setting the scene. Reference what's happening RIGHT NOW in ${location} — conditions, season, weather, what's biting/blooming/running. Make the reader feel like they're missing something." },
        { "type": "conditions_report", "headline": "What's Happening Right Now", "body": "3-4 sentences of REAL current conditions for ${activity} in ${location} this ${currentMonth}. Reference specific waterways, trails, or terrain. What species are active? What conditions are optimal? What's the window? This section should make someone who's been here before say 'I need to get back.'" },
        { "type": "featured_trip", "headline": "Featured package name", "body": "2-3 sentences selling the experience (not the logistics). Paint a picture of what the day feels like.", "price": "Real price from packages", "cta": "Book This Trip", "ctaUrl": "https://romlife.co/guides/${guide.slug || ""}" },
        { "type": "local_intel", "headline": "Local Intel", "body": "2-3 sentences of insider knowledge — a new access point, a regulation change, a seasonal tip, what the locals know that visitors don't. This is the section that makes the newsletter worth opening." },
        { "type": "testimonial", "quote": "A real guest review quote if available, or a realistic one", "guest": "Guest Name", "trip": "Trip they took" },
        { "type": "gear_tip", "headline": "Gear Corner", "body": "One specific gear recommendation relevant to the season. Not a sales pitch — a genuine suggestion from experience." },
        { "type": "upcoming", "headline": "Coming Up", "body": "What's on the horizon — next month's conditions, upcoming events, seasonal transitions. Create anticipation for what's next." },
        { "type": "cta", "headline": "Closing headline", "body": "1-2 sentences of warm urgency. Not 'book now or miss out' — more like 'the window is open and I'd love to get you out here.'", "buttonText": "View Availability", "buttonUrl": "https://romlife.co/guides/${guide.slug || ""}" }
      ],
      "headline": "Short headline for preview card (max 8 words)"
    }
  ]
}

RULES FOR NEWSLETTERS:
- Every newsletter must have 7-8 sections minimum — this should feel SUBSTANTIAL, like a letter worth reading
- The conditions report is the centerpiece — it must reference REAL geography and conditions for ${location}
- Use the guide's voice throughout — warm, expert, personal
- Include at least one specific package with real price
- The local intel section is what makes people open the NEXT newsletter — give genuine insider knowledge
- Never use corporate language (leverage, optimize, solutions) — write like a human
- Reference the current month and season specifically
- If you have real review quotes, use them verbatim

Create 2 email newsletter options. Each MUST have 7-8 sections. One newsletter focused on "what's happening now" (conditions-forward), one focused on "plan ahead" (upcoming season preview).`;

      userPrompt = `Create 2 beefy email newsletters for ${guideName} to send to past guests. Current month: ${currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1)}. ${seasonalHint ? `Seasonal context: ${seasonalHint}` : ""} Make these newsletters so good that people forward them to friends. Each must have 7-8 substantial sections with real geographic and seasonal detail about ${location}.`;

    } else {
      // Instagram, Facebook, Review Spotlight
      systemPrompt = `You are a marketing content creator for outdoor adventure guides. You write in a direct, authentic voice — never generic, never salesy. Every piece of content should feel like it came from the guide themselves.

${baseContext}

Return JSON:
{
  "options": [
    { "title": "Option label", "content": "The caption", "hashtags": ["without hash symbol", "just the word"], "headline": "Bold headline for image card (max 8 words)", "subline": "One supporting sentence for image card" }
  ]
}

The headline and subline will be overlaid on photos as a branded content card. Keep the headline punchy — it needs to stop someone scrolling.`;

      const contentPrompts: Record<string, string> = {
        instagram: `Write 3 Instagram caption options for ${guideName}. Each: 1-3 sentences, authentic voice, subtle CTA.

HASHTAG STRATEGY (critical for reach — generate exactly 12 per post):
- 3 HIGH REACH (1M+ posts): broad activity hashtags like flyfishing, adventure, outdoors
- 5 MEDIUM REACH (100K-1M): specific activity + region like montanaflyfishing, troutfishing
- 4 NICHE/LOCAL (<100K): hyper-specific location + activity like bozemanfishing, madisonrivertrout
Return hashtags WITHOUT the # symbol. Never use banned/spammy tags (follow, like4like, instagood). Include guide's city in at least 2 tags.`,
        facebook: `Write 3 Facebook post options for ${guideName}. Each: 2-4 sentences, tell a story or share insight, include CTA.`,
        review_spotlight: `Take one of the real guest reviews and create 3 shareable social card captions. Highlight the guest's words. Add brief guide-perspective intro.`,
      };

      userPrompt = (contentPrompts[contentType] || contentPrompts.instagram) +
        (seasonalHint ? `\n\nSEASONAL CONTEXT FOR ${currentMonth.toUpperCase()}: ${seasonalHint}\nUse this to make the content timely and specific to what's happening RIGHT NOW.` : "");
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: contentType === "email" ? 4500 : 2500,
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
