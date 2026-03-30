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

    let guide: any = null;
    let guideName = "the guide";

    if (guideId !== "preview") {
      const { data: g } = await supabase
        .from("guides")
        .select("*, profiles!guides_profile_id_fkey(full_name)")
        .eq("id", guideId)
        .single();
      if (!g) return NextResponse.json({ error: "Guide not found" }, { status: 404 });
      guide = g;
      guideName = g.profiles?.full_name || "the guide";
    }

    const interviewText = Object.entries(answers)
      .map(([q, a]) => `Q: ${q}\nA: ${a}`)
      .join("\n\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: `You are the profile engine for RŌM, a premium adventure guide marketplace. You take raw interview transcripts from guides and build their ENTIRE public presence — the kind of profile that makes someone book immediately.

Your job is to deeply analyze everything the guide said — their words, their passion, their knowledge, their personality — and create a profile that feels like a professional copywriter spent a week with this person.

CRITICAL RULES:
- Write in the guide's voice. Match their vocabulary, rhythm, and energy level.
- Be specific. Use the actual activities, locations, species, terrain, techniques they mentioned.
- Never be generic. "Passionate about the outdoors" is worthless. "14 years reading water on the Ausable" is gold.
- Research the area they describe. Use your real knowledge of their region — the actual rivers, peaks, trails, ecosystems, history. Name real geographic features.
- The bio should tell a story, not list credentials.
- The tagline should stop someone scrolling.
- The FAQ should answer what a real guest would actually ask about THIS specific guide in THIS specific location.
- The about_the_area section should make someone want to visit even before they book.

Return ONLY valid JSON with these exact keys:
{
  "bio": "200-250 word About section. First person. Tells a story — how they got here, what they do, why it matters. Must reference specific locations, techniques, or details from their answers. Should have 2-3 paragraphs. Must feel like the guide wrote it themselves after careful thought.",

  "headline": "8-12 word specialty description. Punchy, specific, memorable. Not generic — reference their actual location or specialty.",

  "tagline": "One sentence that captures the vibe of working with this guide. Should make someone feel something.",

  "categories_suggested": ["Array of 1-3 activity categories that match what they described. Use these exact names: Fly Fishing, Hunting, Hiking, Rock Climbing, Kayaking, Surfing, Diving, Wildlife, Photography, Sailing, Camping, Snowshoeing, Ice Fishing, Backpacking, Mountain Biking"],

  "location_extracted": "City, State format extracted from their answers (e.g. 'Lake Placid, NY')",

  "featured_locations": "Comma-separated list of specific trails, rivers, peaks, lakes, venues they mentioned or that are relevant to their area and activity",

  "about_the_area": {
    "title": "About [Area Name]",
    "description": "3-4 sentences about the REAL geography, ecology, and significance of this area for their activity. Use real facts. Name real features. Make someone understand why THIS place is special for THIS activity.",
    "details": [
      {"icon": "🏔️", "label": "Terrain", "value": "Specific terrain description for this area"},
      {"icon": "🌡️", "label": "Best Season", "value": "When and why this area is at its best for this activity"},
      {"icon": "📜", "label": "Local Significance", "value": "One compelling fact about why this area matters for this activity — historical, ecological, or cultural"}
    ]
  },

  "faq": [
    {"q": "Question a real guest would ask about THIS guide", "a": "Answer that sounds like this guide talking — direct, helpful, in their voice"},
    {"q": "Another real question specific to their activity and location", "a": "Another answer in their voice"},
    {"q": "Third question", "a": "Third answer"},
    {"q": "Fourth question", "a": "Fourth answer"}
  ],

  "specialty_keywords": ["12-15 SEO keywords. Mix of: activity terms, location terms, technique terms, species/terrain terms. All lowercase."],

  "voice_profile": {
    "tone": "2-3 words describing their communication tone",
    "vocabulary_level": "casual / conversational / articulate / technical",
    "personality_markers": "3-5 sentence description of how this person communicates. What words do they use? What's their energy? How do they make people feel? What would it be like to get a text from them?",
    "sample_phrases": ["3-4 short phrases that capture exactly how this guide talks, based on their actual words in the interview"]
  },

  "meta_description": "155-character SEO meta description for their profile page. Include location + activity + one compelling detail."
}`,
      messages: [{
        role: "user",
        content: `Here is the interview transcript for ${guideName}:

${interviewText}

Analyze deeply. Extract everything — the locations, the passion, the expertise, the personality. Then build their complete profile. This should look like a $5,000 website was built for them in 3 minutes.

Return only the JSON object.`,
      }],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (e) {
      console.error("Failed to parse AI response:", responseText.substring(0, 500));
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    // Save to profile if requested and guide exists
    if (saveToProfile && guideId !== "preview") {
      const updates: any = {
        ai_bio: parsed.bio,
        ai_headline: parsed.headline,
        voice_profile: parsed.voice_profile,
        specialty_keywords: parsed.specialty_keywords,
        onboarding_interview: answers,
        bio: parsed.bio,
        tagline: parsed.headline,
        faq: parsed.faq || [],
      };
      // Only update location if extracted and guide doesn't have one
      if (parsed.location_extracted && !guide?.location) {
        updates.location = parsed.location_extracted;
      }
      if (parsed.featured_locations) {
        updates.featured_locations = parsed.featured_locations;
      }
      if (parsed.categories_suggested?.length > 0 && (!guide?.categories || guide.categories.length === 0)) {
        updates.categories = parsed.categories_suggested;
      }

      await supabase.from("guides").update(updates).eq("id", guideId);
    }

    return NextResponse.json({
      bio: parsed.bio,
      headline: parsed.headline,
      tagline: parsed.tagline,
      voice_profile: parsed.voice_profile,
      specialty_keywords: parsed.specialty_keywords,
      categories_suggested: parsed.categories_suggested || [],
      location_extracted: parsed.location_extracted || "",
      featured_locations: parsed.featured_locations || "",
      about_the_area: parsed.about_the_area || null,
      faq: parsed.faq || [],
      meta_description: parsed.meta_description || "",
    });
  } catch (err: any) {
    console.error("Voice profile generation error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate" }, { status: 500 });
  }
}
