// Voice profile schema + helpers.
//
// Captured via the in-dashboard wizard (VoiceTrainer): 4 quick picks plus an
// optional paste-your-posts power-user drawer. Stored in guides.voice_profile
// (JSONB) and guides.voice_examples (TEXT[]). Consumed by ai-prompts.ts.

export const VIBES = [
  { id: "warm_friendly",      label: "Warm & friendly" },
  { id: "expert",             label: "Expert & authoritative" },
  { id: "adventurous",        label: "Adventurous" },
  { id: "calm_reflective",    label: "Calm & reflective" },
  { id: "funny_casual",       label: "Funny & casual" },
  { id: "educational",        label: "Educational" },
  { id: "blunt",              label: "Blunt & no-nonsense" },
] as const;
export type VibeId = (typeof VIBES)[number]["id"];

export const ARCHETYPES = [
  {
    id: "punchy_direct",
    label: "Punchy & direct",
    summary: "Short sentences. Concrete. No fluff.",
    sample: "Caught a 22-inch brown this morning. Madison's fishing well. Two openings next week — drop me a line.",
  },
  {
    id: "lyrical_reflective",
    label: "Lyrical & reflective",
    summary: "Sensory. Patient pacing. Wonder.",
    sample: "Mornings like this are why I keep doing this. The river held its breath at first light, and then it gave.",
  },
  {
    id: "educational_structured",
    label: "Educational & structured",
    summary: "Lists. Reasons. Teaching voice.",
    sample: "Three things to check before fishing the Madison this week: water temp (50–55°F), insect hatches (PMDs starting), and access points.",
  },
  {
    id: "stoked_energetic",
    label: "Stoked & energetic",
    summary: "Momentum. Real enthusiasm — not hype.",
    sample: "Best week of the season. The hatches are popping, the water is right, and I've still got two days open. Let's go.",
  },
] as const;
export type ArchetypeId = (typeof ARCHETYPES)[number]["id"];

export const AVOID_OPTIONS = [
  { id: "exclamation",     label: "Exclamation marks" },
  { id: "hashtag_stuff",   label: "Hashtag stuffing" },
  { id: "corporate",       label: "Corporate-speak" },
  { id: "formal",          label: "Formal / stiff" },
  { id: "hype_words",      label: "“Epic” / “insane” / “unreal”" },
  { id: "hard_sell",       label: "Hard sells" },
  { id: "emojis",          label: "Emojis" },
  { id: "marketing_jargon", label: "Marketing jargon" },
] as const;
export type AvoidId = (typeof AVOID_OPTIONS)[number]["id"];

export interface VoiceProfile {
  schemaVersion: 2;
  vibes: VibeId[];
  archetype: ArchetypeId | null;
  signaturePhrases: string;       // free text — comma-separated phrases
  avoid: AvoidId[];
  // Legacy v1 fields preserved if present (set by older onboarding flows)
  tone?: string;
  vocabulary_level?: string;
  personality_markers?: string;
  sample_phrases?: string[];
}

export function emptyProfile(): VoiceProfile {
  return { schemaVersion: 2, vibes: [], archetype: null, signaturePhrases: "", avoid: [] };
}

export function isV2(p: unknown): p is VoiceProfile {
  return !!p && typeof p === "object" && (p as { schemaVersion?: number }).schemaVersion === 2;
}

// Merge an incoming partial v2 profile onto whatever is already stored,
// preserving legacy v1 fields so nothing is silently dropped.
export function mergeProfile(existing: unknown, incoming: Partial<VoiceProfile>): VoiceProfile {
  const base: Record<string, unknown> = existing && typeof existing === "object" ? { ...(existing as Record<string, unknown>) } : {};
  const validVibes = new Set(VIBES.map((v) => v.id));
  const validAvoid = new Set(AVOID_OPTIONS.map((a) => a.id));
  const validArchetypes = new Set(ARCHETYPES.map((a) => a.id));

  const merged: VoiceProfile = {
    schemaVersion: 2,
    vibes: (incoming.vibes || []).filter((v): v is VibeId => validVibes.has(v as VibeId)).slice(0, 5),
    archetype: incoming.archetype && validArchetypes.has(incoming.archetype) ? incoming.archetype : null,
    signaturePhrases: typeof incoming.signaturePhrases === "string" ? incoming.signaturePhrases.slice(0, 600) : "",
    avoid: (incoming.avoid || []).filter((a): a is AvoidId => validAvoid.has(a as AvoidId)),
  };

  // Preserve any legacy v1 fields silently — they still help the prompt
  if (typeof base.tone === "string") merged.tone = base.tone;
  if (typeof base.vocabulary_level === "string") merged.vocabulary_level = base.vocabulary_level;
  if (typeof base.personality_markers === "string") merged.personality_markers = base.personality_markers;
  if (Array.isArray(base.sample_phrases)) merged.sample_phrases = (base.sample_phrases as unknown[]).filter((s): s is string => typeof s === "string");

  return merged;
}

// Render the profile into prompt text injected by buildBaseContext. Designed
// to read like a brief from a creative director, not a JSON dump.
export function profileToPromptBlock(profile: unknown, examples: string[]): string {
  const p = isV2(profile) ? profile : null;
  const lines: string[] = [];

  if (p) {
    if (p.vibes.length) {
      const labels = p.vibes.map((id) => VIBES.find((v) => v.id === id)?.label).filter(Boolean);
      if (labels.length) lines.push(`Voice vibe: ${labels.join(" + ")}`);
    }
    if (p.archetype) {
      const a = ARCHETYPES.find((x) => x.id === p.archetype);
      if (a) lines.push(`Cadence model: ${a.label} — ${a.summary} Sample: "${a.sample}"`);
    }
    if (p.signaturePhrases.trim()) {
      lines.push(`Signature phrases the guide actually uses (work them in naturally where they fit): ${p.signaturePhrases}`);
    }
    if (p.avoid.length) {
      const labels = p.avoid.map((id) => AVOID_OPTIONS.find((a) => a.id === id)?.label).filter(Boolean);
      if (labels.length) lines.push(`Avoid: ${labels.join(", ")}`);
    }
    if (p.personality_markers) lines.push(`Personality markers (legacy): ${p.personality_markers}`);
    if (Array.isArray(p.sample_phrases) && p.sample_phrases.length) lines.push(`Stock phrases: ${p.sample_phrases.join("; ")}`);
  } else if (profile && typeof profile === "object") {
    // Legacy v1: dump the structured fields
    const v1 = profile as Record<string, unknown>;
    if (typeof v1.tone === "string") lines.push(`Tone: ${v1.tone}`);
    if (typeof v1.personality_markers === "string") lines.push(`Personality: ${v1.personality_markers}`);
    if (Array.isArray(v1.sample_phrases)) lines.push(`Stock phrases: ${(v1.sample_phrases as unknown[]).join("; ")}`);
  }

  if (examples.length) {
    lines.push("");
    lines.push("ACTUAL POSTS THE GUIDE WROTE — clone this rhythm and word choice:");
    examples.slice(0, 3).forEach((e, i) => lines.push(`  Example ${i + 1}: "${e.slice(0, 320)}"`));
  }

  if (!lines.length) return "";
  return `\nVOICE PROFILE:\n${lines.join("\n")}\n`;
}
