import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { loadGuideContext, buildBaseContext } from "@/app/lib/ai-prompts";
import { fetchStockPhotos } from "@/app/lib/stock-photos";
import {
  validateNewsletterContent,
  NEWSLETTER_SCHEMA_VERSION,
  newBlockId,
  type NewsletterContent,
  DEFAULT_BRAND,
} from "@/app/lib/newsletter-schema";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-20250514";

function extractJson(text: string): unknown {
  // Tolerant JSON extraction. Models sometimes wrap output in prose or fence it.
  const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  const candidate = fenced?.[1] || text.match(/\{[\s\S]*\}/)?.[0] || text;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function goalPromptFor(goal?: string): string {
  switch (goal) {
    case "booking_gen": return "Goal: DRIVE BOOKINGS. Strong CTA with seasonal urgency. Reference real availability windows.";
    case "lead_gen": return "Goal: GENERATE LEADS. Encourage follow, DM, or email signup. Create curiosity by withholding the punchline.";
    case "education": return "Goal: EDUCATE. Teach something concrete and useful. Position the guide as the local authority.";
    default: return "Goal: BUILD AWARENESS. Tell a story rooted in place. Make people remember this guide and this location.";
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Email (newsletter) — emits strict NewsletterContent JSON
// ────────────────────────────────────────────────────────────────────────────
function buildNewsletterPrompt(ctxText: string, ctx: { location: string; currentMonth: string; bookingUrl: string; seasonalHint: string }): { system: string; user: string } {
  const system = `You are an email newsletter writer for outdoor adventure guides. Your newsletters feel like a letter from a friend who happens to know the best spots — not a corporate marketing email.

${ctxText}

You will return a strict NewsletterContent JSON object. Do NOT return HTML. The app renders the JSON into a branded responsive email template.

Return JSON exactly matching this shape:
{
  "options": [
    {
      "schemaVersion": 1,
      "template": "premium_outdoor_v1",
      "subject": "Compelling subject line, max 50 chars, no spam words, no emojis",
      "preheader": "Preview text shown in inbox, max 90 chars, expands the subject",
      "sections": [
        { "type": "hero", "label": "Main Story", "headline": "Big seasonal headline that sets the scene", "body": "2-4 sentences. Reference what's happening RIGHT NOW in ${ctx.location}. Make the reader feel they're missing something." },
        { "type": "conditions", "label": "What's Happening Now", "headline": "Conditions Report", "body": "3-5 sentences of REAL current conditions. Name specific waterways/trails/peaks. What's running, what's biting, what's blooming, what's optimal. Reference actual ${ctx.location} geography." },
        { "type": "featured_trip", "label": "Featured Trip", "headline": "Real package title from the guide's actual packages", "body": "2-3 sentences selling the experience — the feel, not the logistics", "price": "Real $X price from the guide's packages, formatted as '$450' or 'From $450'", "duration": "Real duration like 'Half day' or '8 hours'", "buttonText": "Book This Trip", "buttonUrl": "${ctx.bookingUrl}" },
        { "type": "local_intel", "label": "Local Intel", "headline": "Punchy intel headline", "body": "2-3 sentences of insider knowledge — a new access point, a regulation change, an unwritten rule, what locals know that visitors miss" },
        { "type": "testimonial", "label": "Client Quote", "quote": "Use a REAL quote from the guest reviews provided in context, verbatim. Never fabricate.", "author": "Guest name from the actual review", "trip": "Trip label if available" },
        { "type": "gear_tip", "label": "Gear Tip", "headline": "Specific, season-relevant gear callout", "body": "2 sentences of genuine recommendation from experience. Not a sales pitch." },
        { "type": "upcoming", "label": "Coming Up", "headline": "What's on the horizon", "body": "2-3 sentences about next month's conditions, upcoming events, seasonal transitions. Create anticipation." },
        { "type": "cta", "label": "Booking CTA", "headline": "Closing headline", "body": "1-2 sentences of warm urgency — not 'book now or miss out', more like 'the window is open and I'd love to get you out here'", "buttonText": "View Availability", "buttonUrl": "${ctx.bookingUrl}" }
      ]
    }
  ]
}

NON-NEGOTIABLE RULES:
- Every block MUST include the "type" and "label" fields exactly as shown
- Each newsletter MUST have at minimum: hero, conditions, featured_trip, local_intel, cta (5 blocks). Aim for 7-8 blocks total.
- Use real package data — never invent prices or trip names
- Use real review quotes verbatim — if no reviews available, OMIT the testimonial block (do not fabricate a quote)
- Reference real ${ctx.location} geography by name
- Never use corporate language: leverage, optimize, journey, solutions, unleash, elevate
- Subject line must NOT contain emojis, exclamation marks, or words like "FREE", "URGENT", "DON'T MISS"
- Body copy is conversational — it's the guide writing to a guest, not a brand writing to a customer

Generate 2 distinct newsletter options:
- Option 1: "Conditions-forward" — leads with what's happening NOW in ${ctx.currentMonth}
- Option 2: "Plan-ahead" — leads with what's coming next month / next season`;

  const user = `Write 2 newsletters for this guide to send to past guests. Make them so good people forward them. Each must have 7-8 substantial blocks with real geographic detail about ${ctx.location}. Current month: ${ctx.currentMonth}. ${ctx.seasonalHint ? `Seasonal context: ${ctx.seasonalHint}` : ""}

Return ONLY the JSON object. No prose, no fenced code block, no commentary.`;

  return { system, user };
}

function attachIdsAndDefaults(content: unknown, guideContext: { name: string; activity: string; location: string; bookingUrl: string; slug: string; coverPhotoUrl?: string; profilePhotoUrl?: string }): NewsletterContent {
  // Add stable ids to each block before validation, fill in guide/brand fields
  // the model isn't asked to provide.
  const c = content as Partial<NewsletterContent> & { sections?: Array<Record<string, unknown>> };
  const sections = (c.sections || []).map((s) => ({
    ...s,
    id: typeof s.id === "string" ? s.id : newBlockId((s.type as never) || "text"),
    enabled: s.enabled !== false,
  }));
  const merged: unknown = {
    schemaVersion: NEWSLETTER_SCHEMA_VERSION,
    template: c.template || "premium_outdoor_v1",
    subject: c.subject,
    preheader: c.preheader,
    guide: {
      name: guideContext.name,
      activity: guideContext.activity,
      location: guideContext.location,
      bookingUrl: guideContext.bookingUrl,
      slug: guideContext.slug,
      coverPhotoUrl: guideContext.coverPhotoUrl,
      profilePhotoUrl: guideContext.profilePhotoUrl,
    },
    brand: { ...DEFAULT_BRAND, ...(c.brand || {}) },
    sections,
    footer: c.footer || { tagline: "The world's best adventure guides, in one place." },
  };
  return validateNewsletterContent(merged);
}

// ────────────────────────────────────────────────────────────────────────────
// Other content types (carousel, reel, story, blog, instagram, facebook, review)
// Will be rebuilt in Stage 2/3. For now: keep emitting structured options[] with
// the same fields the existing UI consumes.
// ────────────────────────────────────────────────────────────────────────────
function buildOtherPrompt(contentType: string, ctxText: string, ctx: { location: string; currentMonth: string; bookingUrl: string; seasonalHint: string; guideName: string; activity: string }, goal: string | undefined, topic: string | undefined): { system: string; user: string } {
  const goalLine = goalPromptFor(goal);

  if (contentType === "reel") {
    return {
      system: `You are a short-form video strategist for outdoor adventure guides. You create reel/TikTok storyboards that guides can film with their phone — ready-to-shoot, no fancy equipment needed.

${ctxText}
${goalLine}

Return JSON exactly:
{
  "options": [
    {
      "title": "Reel concept name",
      "duration": "30s",
      "hook": "The opening 2 seconds that stops the scroll — a question, contradiction, or jaw-dropping image cue",
      "musicVibe": "Specific music guidance: tempo, genre, energy arc (e.g., 'ambient acoustic, slow build, drop at 0:18')",
      "shots": [
        { "time": "0:00-0:03", "visual": "Specific filmable moment — name the angle, the subject, what's in frame", "textOverlay": "On-screen text 3-6 words max, or null", "transition": "cut/whip pan/fade/match cut" }
      ],
      "caption": "Post caption (3-5 sentences) — story-driven, not feature-driven. End with a question or soft CTA.",
      "hashtags": ["12 hashtags without # symbol — 3 high reach, 5 medium, 4 niche/local"],
      "headline": "Bold cover-frame headline (max 6 words)",
      "tip": "One specific filming tip — gear, time of day, framing trick, audio note"
    }
  ]
}

Create 3 distinct reel concepts:
- One STORYTELLING reel (8-12 shots): a mini-narrative arc — setup, tension, payoff. Use real places.
- One EDUCATIONAL reel (6-10 shots): teach a specific skill or insight. "Most people don't realize..." or "Three things I check before..."
- One SHOWCASE reel (6-8 shots): the experience itself — sensory, atmospheric, transports the viewer

Every reel: 18-45s total. Hook in first 2s — text overlay or arresting visual. Each shot must be 2-5s. Text overlays 3-6 words. Reference real ${ctx.location} geography. Filming tip must be actionable, not generic.`,
      user: `Create 3 reel storyboards for ${ctx.guideName} guiding ${ctx.activity} in ${ctx.location}. ${topic ? `Topic: ${topic}.` : ""} ${ctx.seasonalHint || ""} Make these production-ready — the guide opens this and starts shooting.`,
    };
  }

  if (contentType === "blog") {
    return {
      system: `You are a blog content strategist for outdoor adventure guides. Write long-form content that positions the guide as the local authority — the kind of article that ranks on Google AND gets bookmarked.

${ctxText}
${goalLine}

Return JSON:
{
  "options": [
    {
      "title": "SEO-friendly compelling title (50-70 chars). Include the location.",
      "meta_description": "155-char SEO meta description with target keyword + benefit",
      "content": "Full blog post in markdown. 1500-2200 words. Structure: opening hook paragraph (no header) → ## H2 sections (5-8 of them) → bullet lists where natural → final ## section is a CTA pointing to ${ctx.bookingUrl}. Reference ${ctx.location} place names by name throughout. Include specific gear, conditions, seasons, prices where relevant. Cite the guide's own experience where it adds authority.",
      "hashtags": ["10 SEO keyword tags without # — long-tail phrases, location modifiers"],
      "headline": "Short headline for social sharing (max 8 words)",
      "subline": "One-sentence preview that creates curiosity",
      "outline": ["H2 1", "H2 2", "..."]
    }
  ]
}

Create 2 blog posts:
- Post 1: EDUCATIONAL/HOW-TO. Concrete skills, gear, technique, or process. Title pattern: "How to / Best / Ultimate Guide to" — but specific, not generic. 1500-2200 words.
- Post 2: STORYTELLING/NARRATIVE. A specific trip, a particular day, a memorable client moment. First-person. 1500-2000 words. Title pattern: "The day / Why / What I learned" — sensory, evocative.

NON-NEGOTIABLE:
- Real ${ctx.location} geography by name (rivers, peaks, trails, towns, neighborhoods)
- At least one specific anecdote per post
- No generic openings ("In recent years..." "When it comes to..." — banned)
- No filler transitions ("Furthermore", "Additionally" — banned)
- End with a CTA section that points to ${ctx.bookingUrl} naturally, not as a hard sell`,
      user: `Write 2 blog posts for ${ctx.guideName}, a ${ctx.activity} guide in ${ctx.location}. ${topic ? `Topic: ${topic}` : `Use seasonal context for ${ctx.currentMonth}.`} ${ctx.seasonalHint || ""} 1500-2200 words each. Bookmarkable, not skimmable.`,
    };
  }

  if (contentType === "carousel") {
    return {
      system: `You are an Instagram carousel creator for outdoor guides. Carousels get 3x engagement when each slide earns the swipe — slide 1 is the promise, every slide after pays it off, the last delivers the action.

${ctxText}
${goalLine}

Return JSON:
{
  "options": [
    {
      "title": "Carousel concept name",
      "slides": [
        { "slide_number": 1, "role": "hook", "headline": "Scroll-stopping hook (max 7 words). Bold claim, contradiction, or curiosity gap.", "body": "1-2 sentences expanding the hook — earn the swipe.", "visual_direction": "Specific photo type with framing/lighting note" },
        { "slide_number": 2, "role": "context", "headline": "Why this matters (max 8 words)", "body": "2-3 sentences setting the stakes or backstory. Reference ${ctx.location} geography by name.", "visual_direction": "..." },
        { "slide_number": 3, "role": "insight_1", "headline": "First insight headline", "body": "2-3 sentences with concrete detail — names, numbers, specifics", "visual_direction": "..." },
        { "slide_number": 4, "role": "insight_2", "headline": "Second insight", "body": "...", "visual_direction": "..." },
        { "slide_number": 5, "role": "insight_3", "headline": "Third insight or 'pro tip'", "body": "...", "visual_direction": "..." },
        { "slide_number": 6, "role": "story", "headline": "A specific moment", "body": "2-3 sentences of a real anecdote that makes the abstract concrete. First-person.", "visual_direction": "..." },
        { "slide_number": 7, "role": "cta", "headline": "Closing CTA headline", "body": "Clear, warm ask. Mention ${ctx.bookingUrl} naturally.", "visual_direction": "Booking-feel image" }
      ],
      "content": "Post caption (4-6 sentences). Open with a hook that complements (not duplicates) slide 1. End with a soft CTA + a question to prompt comments.",
      "hashtags": ["12 hashtags without # — 3 high reach (1M+), 5 medium (100K-1M), 4 niche/local (<100K)"],
      "headline": "Carousel title for the preview card",
      "subline": "One-sentence hook"
    }
  ]
}

Create 2 distinct carousels with 7 slides each. Each slide must have a "slide_number" and "role". Body copy on every slide is 2-3 sentences MINIMUM — not a fragment. Each slide should earn its place. Reference real ${ctx.location} place names. No generic stock copy.`,
      user: `Create 2 Instagram carousels for ${ctx.guideName}. ${topic ? `Topic: ${topic}` : `Seasonal focus for ${ctx.currentMonth}.`} ${ctx.seasonalHint || ""} 7 substantive slides each — these should make people stop scrolling, swipe through, and DM the guide.`,
    };
  }

  if (contentType === "story") {
    return {
      system: `You are an Instagram Story creator for outdoor guides. Stories feel raw, immediate, and personal — the guide is talking directly to the viewer between swipes. Less polished than a feed post, more in-the-moment.

${ctxText}
${goalLine}

Return JSON:
{
  "options": [
    {
      "title": "Story sequence name",
      "frames": [
        { "frame_number": 1, "type": "text|photo|poll|question|countdown|quiz|slider|link", "content": "Frame copy — 1-2 short sentences, conversational, like a text to a friend", "visual_direction": "Specific photo/video — what's in frame, lighting, time of day", "sticker": "Optional sticker/widget instruction (e.g., 'Poll: This or that — Sunrise / Sunset')", "duration_seconds": 5 }
      ],
      "content": "Brief description of the full sequence (1-2 sentences) — what arc does it create?",
      "headline": "Preview title",
      "subline": "What this sequence achieves",
      "filming_notes": "1-2 sentences of practical guidance for shooting this — e.g., 'Shoot all 6 frames in one outing, mix vertical video with stills'"
    }
  ]
}

Create 2 distinct story sequences with 6-8 frames each. Required mix: at least one interactive element (poll/question/quiz/slider) per sequence, at least one photo frame, at least one short video direction frame. Each sequence is a mini-arc — not just isolated frames.

Sequence 1: BEHIND-THE-SCENES — what the guide is seeing/feeling/doing right now in ${ctx.location} this ${ctx.currentMonth}.
Sequence 2: TEACHING/Q&A — guide answers a common question or shares a tip via interactive stickers.

Reference real ${ctx.location} geography. Use first-person voice. No corporate language.`,
      user: `Create 2 Instagram Story sequences for ${ctx.guideName} guiding ${ctx.activity} in ${ctx.location}. ${topic ? `Topic: ${topic}` : `Lean into what's happening right now this ${ctx.currentMonth}.`} ${ctx.seasonalHint || ""} 6-8 frames each. Production-ready — guide opens this and starts shooting.`,
    };
  }

  // Instagram, Facebook, review_spotlight
  const formatHints: Record<string, string> = {
    instagram: `Write 3 Instagram caption options. EACH ONE 4-7 sentences (substantial — not a one-liner). Open with a hook, develop one specific moment or insight, end with a soft CTA + a question to prompt comments. Reference ${ctx.location} geography by name.

HASHTAG STRATEGY (12 per post — return WITHOUT # symbol):
- 3 HIGH REACH (1M+): broad activity tags (e.g., flyfishing, adventure)
- 5 MEDIUM REACH (100K-1M): activity + region (e.g., montanaflyfishing, troutfishing)
- 4 NICHE/LOCAL (<100K): hyper-specific (e.g., bozemanfishing, madisonrivertrout)
Include the guide's city/region in 2+ tags.`,
    facebook: `Write 3 Facebook post options. EACH 5-8 sentences. Facebook audiences read longer copy than IG — tell a real story with a beginning/middle/end. Reference ${ctx.location} geography. Include a clear CTA. No fake hooks ("You won't believe..." — banned).`,
    review_spotlight: `Take ONE specific real guest review (verbatim quote — never fabricate) and create 3 distinct shareable card captions around it. Each caption: 3-5 sentences. Open with the guide's perspective on the experience that earned the review (the day, the moment, what made it work), then transition into the guest's words. End with a soft CTA. Use the actual guest name.`,
  };

  return {
    system: `You are a marketing content writer for outdoor adventure guides. Direct, authentic voice — like a guide texting a friend, not a brand pitching a customer. Never generic. Never salesy. Never use jargon (leverage, unleash, optimize, journey, solutions, elevate — banned).

${ctxText}
${goalLine}

Return JSON:
{
  "options": [
    {
      "title": "Option label (3-6 words describing the angle)",
      "content": "The full caption — substantive copy per the format-specific length guidance below",
      "hashtags": ["without hash symbol"],
      "headline": "Bold image-card headline (max 8 words) — the words that overlay the photo",
      "subline": "Supporting line for image card (one sentence)"
    }
  ]
}

The headline/subline overlay on a branded photo card. Caption goes in the post itself.

NON-NEGOTIABLE:
- Each option must feel distinctly different in angle (not 3 variations of the same idea)
- Reference real ${ctx.location} place names, not generic phrases like "the area" or "out here"
- First-person where natural — "I" or "we", not always "you"
- Specifics beat adjectives: "the riffle below the bridge" beats "a beautiful spot"`,
    user: (formatHints[contentType] || formatHints.instagram) + (ctx.seasonalHint ? `\n\nSEASONAL CONTEXT FOR ${ctx.currentMonth.toUpperCase()}: ${ctx.seasonalHint}\nUse this for timely specificity.` : ""),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// POST
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { guideId, contentType, context, goal, topic } = await req.json();

    if (!guideId || !contentType) {
      return NextResponse.json({ error: "guideId and contentType required" }, { status: 400 });
    }

    const ctx = await loadGuideContext(guideId);
    const baseContext = buildBaseContext(ctx, { topic: topic || context?.topic });

    const { system, user } = contentType === "email"
      ? buildNewsletterPrompt(baseContext, { location: ctx.location, currentMonth: ctx.currentMonth, bookingUrl: ctx.bookingUrl, seasonalHint: ctx.seasonalHint })
      : buildOtherPrompt(contentType, baseContext, { location: ctx.location, currentMonth: ctx.currentMonth, bookingUrl: ctx.bookingUrl, seasonalHint: ctx.seasonalHint, guideName: ctx.guideName, activity: ctx.activity }, goal, topic);

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: contentType === "email" ? 6000 : contentType === "blog" ? 4500 : 2500,
      system,
      messages: [{ role: "user", content: user }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJson(text);
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({ error: "Model returned invalid JSON", raw: text.slice(0, 500) }, { status: 502 });
    }

    const stockPhotos = await fetchStockPhotos(`${ctx.activity} ${ctx.location}`.trim());

    if (contentType === "email") {
      // Validate each option against the schema
      const optionsRaw = (parsed as { options?: unknown[] }).options || [];
      const validated: NewsletterContent[] = [];
      for (const opt of optionsRaw) {
        try {
          validated.push(attachIdsAndDefaults(opt, {
            name: ctx.guideName,
            activity: ctx.activity,
            location: ctx.location,
            bookingUrl: ctx.bookingUrl,
            slug: ctx.slug,
            coverPhotoUrl: ctx.coverPhotoUrl,
            profilePhotoUrl: ctx.profilePhotoUrl,
          }));
        } catch (err) {
          console.error("Newsletter validation failed:", err);
        }
      }
      if (validated.length === 0) {
        return NextResponse.json({ error: "No valid newsletter options returned" }, { status: 502 });
      }
      return NextResponse.json({
        options: validated,
        guidePhotos: ctx.guidePhotos,
        stockPhotos,
        guideName: ctx.guideName,
        guideLocation: ctx.location,
        guideActivity: ctx.activity,
        guideSlug: ctx.slug,
      });
    }

    // Other content types — pass through with guide info
    return NextResponse.json({
      ...(parsed as Record<string, unknown>),
      guidePhotos: ctx.guidePhotos,
      stockPhotos,
      guideName: ctx.guideName,
      guideLocation: ctx.location,
      guideActivity: ctx.activity,
      guideSlug: ctx.slug,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate content";
    console.error("AI marketing error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
