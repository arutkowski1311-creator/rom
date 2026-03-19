// ─── ROM DESIGN SYSTEM ───────────────────────────────────────────────────────
// Single source of truth for colors, fonts, and tier configuration.

export const T = {
  void:      "#080a0b",
  carbon:    "#0f1214",
  gunmetal:  "#171b1e",
  steel:     "#1f2428",
  lifted:    "#272c31",
  rim:       "#323840",
  wire:      "#424c54",
  muted:     "#5a6470",
  silver:    "#8a96a0",
  ash:       "#b8c2ca",
  parchment: "#e8e2d8",
  white:     "#f5f2ee",
  gold:      "#c9973a",
  goldLt:    "#e0b050",
  goldDk:    "#a07828",
  goldGlow:  "#c9973a28",
  ink:       "#080a0b",
  green:     "#3a7a54",
  greenGlow: "#3a7a5428",
  red:       "#8a3a3a",
  redGlow:   "#8a3a3a28",
  blue:      "#2a4a7a",
  blueGlow:  "#2a4a7a28",
};

export const FONT_DISPLAY = "'Cormorant Garamond', Georgia, serif";
export const FONT_BODY    = "'Barlow', system-ui, sans-serif";

// ─── TIER CONFIGURATION ──────────────────────────────────────────────────────
export const TIERS = {
  spark: {
    id: "spark",
    name: "Spark",
    monthlyPrice: 9,
    commissionRate: 0.20,
    features: [
      "Profile & booking",
      "Email confirmations",
      "Basic dashboard",
      "Availability calendar",
      "Messaging",
    ],
    locked: ["Finances", "Marketing Hub", "Analytics", "CRM", "Widgets", "Tax Center"],
  },
  discover: {
    id: "discover",
    name: "Discover",
    monthlyPrice: 29,
    commissionRate: 0.15,
    features: [
      "Everything in Spark",
      "Finances dashboard",
      "Marketing Hub + AI content",
      "Expense & mileage tracking",
      "Tax center + 1099 export",
      "Trip Journal",
    ],
    locked: ["Analytics", "CRM", "Widgets"],
  },
  immerse: {
    id: "immerse",
    name: "Immerse",
    monthlyPrice: 59,
    commissionRate: 0.12,
    features: [
      "Everything in Discover",
      "Analytics dashboard",
      "Guest CRM",
      "Embeddable widgets",
      "Priority support",
      "Insurance facilitation",
    ],
    locked: [],
  },
};

// Which tier unlocks which dashboard tabs
export const TIER_GATES = {
  Finances:  ["discover", "immerse"],
  Marketing: ["discover", "immerse"],
  Analytics: ["immerse"],
  CRM:       ["immerse"],
};

export function getTierConfig(tierName) {
  return TIERS[tierName] || TIERS.spark;
}

export function canAccessFeature(guideTier, feature) {
  const gates = TIER_GATES[feature];
  if (!gates) return true; // no gate = everyone can access
  return gates.includes(guideTier || "spark");
}
