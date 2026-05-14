// Newsletter content schema. JSON is the source of truth — HTML and the
// in-app preview are derived from this, never the other way around.

export const NEWSLETTER_SCHEMA_VERSION = 1 as const;

export type BlockType =
  | "hero"
  | "conditions"
  | "featured_trip"
  | "local_intel"
  | "testimonial"
  | "gear_tip"
  | "upcoming"
  | "story"
  | "image"
  | "text"
  | "cta";

export interface BlockBase {
  id: string;
  type: BlockType;
  label: string;
  enabled?: boolean;
}

export interface HeroBlock extends BlockBase {
  type: "hero";
  headline: string;
  body: string;
  imageUrl?: string;
}

export interface ConditionsBlock extends BlockBase {
  type: "conditions";
  headline: string;
  body: string;
}

export interface FeaturedTripBlock extends BlockBase {
  type: "featured_trip";
  headline: string;
  body: string;
  price?: string;
  duration?: string;
  imageUrl?: string;
  buttonText: string;
  buttonUrl: string;
}

export interface LocalIntelBlock extends BlockBase {
  type: "local_intel";
  headline: string;
  body: string;
}

export interface TestimonialBlock extends BlockBase {
  type: "testimonial";
  quote: string;
  author: string;
  trip?: string;
}

export interface GearTipBlock extends BlockBase {
  type: "gear_tip";
  headline: string;
  body: string;
  productName?: string;
  productUrl?: string;
}

export interface UpcomingBlock extends BlockBase {
  type: "upcoming";
  headline: string;
  body: string;
}

export interface StoryBlock extends BlockBase {
  type: "story";
  headline: string;
  body: string;
}

export interface ImageBlock extends BlockBase {
  type: "image";
  imageUrl: string;
  caption?: string;
}

export interface TextBlock extends BlockBase {
  type: "text";
  body: string;
}

export interface CTABlock extends BlockBase {
  type: "cta";
  headline: string;
  body: string;
  buttonText: string;
  buttonUrl: string;
}

export type NewsletterBlock =
  | HeroBlock
  | ConditionsBlock
  | FeaturedTripBlock
  | LocalIntelBlock
  | TestimonialBlock
  | GearTipBlock
  | UpcomingBlock
  | StoryBlock
  | ImageBlock
  | TextBlock
  | CTABlock;

export interface NewsletterGuide {
  name: string;
  activity: string;
  location: string;
  bookingUrl: string;
  profilePhotoUrl?: string;
  coverPhotoUrl?: string;
  slug: string;
}

export interface NewsletterBrand {
  primaryColor: string;
  inkColor: string;
  paperColor: string;
}

export const DEFAULT_BRAND: NewsletterBrand = {
  primaryColor: "#c9973a",
  inkColor: "#0d1117",
  paperColor: "#faf9f6",
};

export interface NewsletterContent {
  schemaVersion: typeof NEWSLETTER_SCHEMA_VERSION;
  template: "premium_outdoor_v1" | "minimal_v1";
  subject: string;
  preheader: string;
  guide: NewsletterGuide;
  brand: NewsletterBrand;
  sections: NewsletterBlock[];
  footer: {
    tagline: string;
    unsubscribeUrl?: string;
  };
}

// Refine actions used by per-block AI endpoint
export const REFINE_ACTIONS = [
  "regenerate",
  "shorter",
  "longer",
  "more_exciting",
  "more_professional",
  "more_personal",
  "add_local_flavor",
] as const;

export type RefineAction = (typeof REFINE_ACTIONS)[number];

// Friendly labels for the editor UI
export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: "Main Story",
  conditions: "What's Happening Now",
  featured_trip: "Featured Trip",
  local_intel: "Local Intel",
  testimonial: "Client Quote",
  gear_tip: "Gear Tip",
  upcoming: "Coming Up",
  story: "Story",
  image: "Image",
  text: "Free Text",
  cta: "Booking CTA",
};

export const REFINE_LABELS: Record<RefineAction, string> = {
  regenerate: "Regenerate",
  shorter: "Shorter",
  longer: "Longer",
  more_exciting: "More exciting",
  more_professional: "More professional",
  more_personal: "More personal",
  add_local_flavor: "Add local flavor",
};

let _idCounter = 0;
export function newBlockId(type: BlockType): string {
  _idCounter += 1;
  return `${type}_${Date.now().toString(36)}_${_idCounter}`;
}

// Validate at the boundary — anything coming from the AI or DB must pass through
// here before it's allowed into the editor. Throws on missing required fields.
export function validateNewsletterContent(input: unknown): NewsletterContent {
  if (!input || typeof input !== "object") throw new Error("Newsletter content must be an object");
  const c = input as Partial<NewsletterContent>;

  if (c.schemaVersion !== NEWSLETTER_SCHEMA_VERSION) {
    throw new Error(`Unsupported schema version: ${c.schemaVersion}`);
  }
  if (!c.subject || !c.preheader) throw new Error("subject and preheader required");
  if (!c.guide || !c.guide.name) throw new Error("guide.name required");
  if (!Array.isArray(c.sections) || c.sections.length === 0) throw new Error("sections required");

  const sections = c.sections.map(validateBlock);

  return {
    schemaVersion: NEWSLETTER_SCHEMA_VERSION,
    template: c.template || "premium_outdoor_v1",
    subject: c.subject,
    preheader: c.preheader,
    guide: {
      name: c.guide.name,
      activity: c.guide.activity || "",
      location: c.guide.location || "",
      bookingUrl: c.guide.bookingUrl || "",
      profilePhotoUrl: c.guide.profilePhotoUrl,
      coverPhotoUrl: c.guide.coverPhotoUrl,
      slug: c.guide.slug || "",
    },
    brand: { ...DEFAULT_BRAND, ...(c.brand || {}) },
    sections,
    footer: {
      tagline: c.footer?.tagline || "The world's best adventure guides, in one place.",
      unsubscribeUrl: c.footer?.unsubscribeUrl,
    },
  };
}

function validateBlock(input: unknown): NewsletterBlock {
  if (!input || typeof input !== "object") throw new Error("Block must be an object");
  const b = input as Partial<NewsletterBlock> & { type?: BlockType };
  if (!b.type) throw new Error("Block missing type");
  const id = b.id || newBlockId(b.type);
  const label = b.label || BLOCK_LABELS[b.type] || b.type;
  const enabled = b.enabled !== false;

  switch (b.type) {
    case "hero":
      return { id, type: "hero", label, enabled, headline: (b as HeroBlock).headline || "", body: (b as HeroBlock).body || "", imageUrl: (b as HeroBlock).imageUrl };
    case "conditions":
      return { id, type: "conditions", label, enabled, headline: (b as ConditionsBlock).headline || "", body: (b as ConditionsBlock).body || "" };
    case "featured_trip": {
      const ft = b as FeaturedTripBlock;
      return { id, type: "featured_trip", label, enabled, headline: ft.headline || "", body: ft.body || "", price: ft.price, duration: ft.duration, imageUrl: ft.imageUrl, buttonText: ft.buttonText || "Book This Trip", buttonUrl: ft.buttonUrl || "" };
    }
    case "local_intel":
      return { id, type: "local_intel", label, enabled, headline: (b as LocalIntelBlock).headline || "", body: (b as LocalIntelBlock).body || "" };
    case "testimonial": {
      const t = b as TestimonialBlock;
      return { id, type: "testimonial", label, enabled, quote: t.quote || "", author: t.author || "", trip: t.trip };
    }
    case "gear_tip": {
      const g = b as GearTipBlock;
      return { id, type: "gear_tip", label, enabled, headline: g.headline || "", body: g.body || "", productName: g.productName, productUrl: g.productUrl };
    }
    case "upcoming":
      return { id, type: "upcoming", label, enabled, headline: (b as UpcomingBlock).headline || "", body: (b as UpcomingBlock).body || "" };
    case "story":
      return { id, type: "story", label, enabled, headline: (b as StoryBlock).headline || "", body: (b as StoryBlock).body || "" };
    case "image":
      return { id, type: "image", label, enabled, imageUrl: (b as ImageBlock).imageUrl || "", caption: (b as ImageBlock).caption };
    case "text":
      return { id, type: "text", label, enabled, body: (b as TextBlock).body || "" };
    case "cta": {
      const ct = b as CTABlock;
      return { id, type: "cta", label, enabled, headline: ct.headline || "", body: ct.body || "", buttonText: ct.buttonText || "View Availability", buttonUrl: ct.buttonUrl || "" };
    }
    default:
      throw new Error(`Unknown block type: ${(b as { type: string }).type}`);
  }
}

// Block factory — used when the user adds a new block in the editor
export function createDefaultBlock(type: BlockType, guide: NewsletterGuide): NewsletterBlock {
  const id = newBlockId(type);
  const label = BLOCK_LABELS[type];
  switch (type) {
    case "hero": return { id, type, label, enabled: true, headline: "", body: "" };
    case "conditions": return { id, type, label, enabled: true, headline: "What's Happening Now", body: "" };
    case "featured_trip": return { id, type, label, enabled: true, headline: "", body: "", buttonText: "Book This Trip", buttonUrl: guide.bookingUrl };
    case "local_intel": return { id, type, label, enabled: true, headline: "Local Intel", body: "" };
    case "testimonial": return { id, type, label, enabled: true, quote: "", author: "" };
    case "gear_tip": return { id, type, label, enabled: true, headline: "Gear Corner", body: "" };
    case "upcoming": return { id, type, label, enabled: true, headline: "Coming Up", body: "" };
    case "story": return { id, type, label, enabled: true, headline: "", body: "" };
    case "image": return { id, type, label, enabled: true, imageUrl: "" };
    case "text": return { id, type, label, enabled: true, body: "" };
    case "cta": return { id, type, label, enabled: true, headline: "", body: "", buttonText: "View Availability", buttonUrl: guide.bookingUrl };
  }
}
