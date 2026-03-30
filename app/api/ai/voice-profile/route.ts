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
      system: `You are the profile engine for RŌM, a premium experience guide marketplace. RŌM serves ALL types of guides — not just outdoor adventure. Guides on the platform include:

OUTDOOR: fly fishing, hunting, hiking, rock climbing, kayaking, surfing, diving, backcountry skiing, snowmobiling, whitewater rafting, ice climbing, horseback riding, via ferrata
CULTURAL & URBAN: food tours, wine tours, brewery tours, walking tours, historical tours, cultural tours, art tours, museum tours
NATURE & EDUCATION: wildlife photography, stargazing, foraging, birdwatching
MOTOR & SPECIALTY: 4WD/Jeep tours, ATV tours, scenic flights
WELLNESS: yoga retreats, meditation experiences

You take raw interview transcripts from ANY type of guide and build their ENTIRE public presence — the kind of profile that makes someone book immediately. Adapt your language, tone, and area research to match what this guide actually does. A food tour guide in Charleston needs restaurant culture and culinary history. A fly fishing guide in Montana needs river systems and hatch charts. A historical walking tour guide in Boston needs Colonial history and architecture.

Your job is to deeply analyze everything the guide said — their words, their passion, their knowledge, their personality — and create a profile that feels like a professional copywriter spent a week with this person.

WRITING STANDARD:
Write at the level of a New York Times feature writer — engaging, vivid, precise. Every sentence should earn its place. The prose should make someone lean forward, not skim. Use concrete details, sensory language, and narrative tension. No filler. No clichés. No "passionate" or "dedicated" or "experienced professional." Show, don't tell.

CRITICAL RULES:
- Write in the guide's voice but ELEVATE it. Take their natural way of speaking and make it sing. If they're understated, be elegantly understated. If they're energetic, be infectiously energetic. Match their register but sharpen every line.
- Be surgically specific. Use the actual activities, locations, species, terrain, techniques they mentioned. "14 years reading water on the Ausable" is infinitely better than "experienced guide."
- Research the area deeply. Use your real knowledge of their region — the actual rivers, peaks, trails, ecosystems, geological history, cultural significance. Name real geographic features. Include details that only someone who truly knows the area would mention.
- The bio should read like the opening of a great magazine profile — a story that hooks you in the first sentence and makes you want to meet this person.
- The tagline should stop someone mid-scroll. It should be the kind of line you'd remember after reading it once.
- The headline should work as a search result AND as a first impression — specific enough to find, compelling enough to click.
- The FAQ should answer real guest concerns with the guide's actual personality — direct, helpful, human. Not corporate FAQ language.
- The about_the_area section should make someone want to visit this place even if they never book — the kind of writing that sells a destination.
- Extract years of experience from their answers (they were asked directly). Use this to establish credibility without bragging.

Return ONLY valid JSON with these exact keys:
{
  "bio": "200-250 word About section. First person. Written like the opening paragraphs of a NYT travel feature — but in the guide's voice. Start with a hook that pulls the reader in. Paint the place in 2-3 sentences. Then reveal what this guide does and why it matters. Reference specific locations, techniques, years of experience, or moments from their interview. 2-3 paragraphs. Must feel like the guide sat down with a great writer and this is what came out.",

  "headline": "8-12 word specialty description. The kind of line that works as a Google search result AND makes someone click. Must reference their actual location or specialty. No generic words.",

  "tagline": "One sentence that captures the entire vibe of working with this guide. The kind of sentence a guest would quote to a friend when recommending them. Should create a feeling — anticipation, trust, excitement, curiosity.",

  "years_experience": "Number extracted from their interview answers. If they said '15 years' return 15. If they said 'since 2010' calculate from current year. If unclear, return null.",

  "categories_suggested": ["Array of 1-3 activity categories that match what they described. Use these exact names: Fly Fishing, Hunting, Hiking, Rock Climbing, Kayaking, Surfing, Diving, Wildlife, Sailing, Camping, Snowshoeing, Ice Fishing, Backpacking, Mountain Biking, Backcountry Skiing, Snowmobiling, Whitewater Rafting, Ice Climbing, Via Ferrata, Horseback Riding, Food Tour, Wine & Spirits, Brewery Tour, Walking Tour, Historical Tour, Cultural Tour, Art Tour, Museum Tour, Photography, Stargazing, Foraging, Birdwatching, 4WD & Jeep Tour, ATV Tour, Scenic Flight, Yoga & Wellness, Meditation Retreat"],

  "location_extracted": "City, State format extracted from their answers (e.g. 'Lake Placid, NY')",

  "featured_locations": "Comma-separated list of specific trails, rivers, peaks, lakes, venues they mentioned or that are relevant to their area and activity",

  "about_the_area": {
    "title": "About [Actual Area Name — be specific]",
    "description": "3-4 sentences written like travel journalism. Paint the place — its geography, its character, why it draws people. Use real place names, real ecological details, real history. This should make someone who has never been there feel like they can see it. A food tour guide's area description should talk about the culinary culture, the neighborhoods, the food history. A fishing guide's should talk about the water, the species, the terrain.",
    "details": [
      {"icon": "contextual emoji", "label": "Contextual label for this guide type", "value": "Specific, factual detail — not generic. For hiking: actual elevation and terrain type. For food tours: cuisine style and neighborhood character. For fishing: water type and primary species."},
      {"icon": "contextual emoji", "label": "Best Time", "value": "When and exactly WHY this area peaks for this activity — specific months and what happens then"},
      {"icon": "contextual emoji", "label": "What Makes It Special", "value": "One fact that would make someone say 'I didn't know that' — historical, ecological, cultural, or culinary. The kind of detail a great travel writer would surface."}
    ]
  },

  "faq": [
    {"q": "The #1 question guests actually ask before booking this type of experience in this location", "a": "Answer in the guide's voice — direct, warm, helpful. Not corporate."},
    {"q": "A practical logistics question specific to their activity", "a": "Clear, specific answer"},
    {"q": "A question about skill level or preparation", "a": "Reassuring but honest answer"},
    {"q": "A question about what's included or what to expect", "a": "Detailed, no-surprises answer"}
  ],

  "specialty_keywords": ["12-15 SEO keywords. Mix of: specific activity terms, location + activity combos, technique terms, species/terrain terms. All lowercase. Think about what someone would actually Google to find this guide."],

  "voice_profile": {
    "tone": "2-3 words describing their communication tone",
    "vocabulary_level": "casual / conversational / articulate / technical",
    "personality_markers": "3-5 sentence description of how this person communicates. What words do they use? What's their energy? How do they make people feel? What would it be like to get a text from them the night before a trip?",
    "sample_phrases": ["3-4 short phrases pulled directly from or inspired by their actual interview answers — the lines that reveal who they are"]
  },

  "meta_description": "155-character SEO meta description. Must include location + activity + one detail that makes someone click. Write it like a Google result you'd actually click on."
}`,
      messages: [{
        role: "user",
        content: `Here is the interview transcript for ${guideName}:

${interviewText}

Analyze this interview like a top-tier feature writer preparing a profile. Find the story — the moment they became who they are, the place that shaped them, the thing they know that nobody else does. Extract the locations, the years of experience, the passion, the expertise, the personality.

Then build their complete profile. Every line should be specific enough to prove this isn't a template. The bio should read like the opening of a great magazine feature. The tagline should be quotable. The About the Area section should sell the destination. The FAQ should sound like a real person talking.

This guide answered honestly. Honor that by writing something they'd be proud to show their best client.

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
      if (parsed.years_experience && !isNaN(parseInt(parsed.years_experience))) {
        updates.years_experience = parseInt(parsed.years_experience);
      }
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
      years_experience: parsed.years_experience || null,
    });
  } catch (err: any) {
    console.error("Voice profile generation error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate" }, { status: 500 });
  }
}
