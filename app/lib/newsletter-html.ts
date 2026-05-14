// Render a NewsletterContent JSON object to email-safe HTML.
// Email clients are fragile — table layout, inline styles, no flexbox/grid,
// 600px max width, web-safe fonts.

import type {
  NewsletterContent,
  NewsletterBlock,
  HeroBlock,
  ConditionsBlock,
  FeaturedTripBlock,
  LocalIntelBlock,
  TestimonialBlock,
  GearTipBlock,
  UpcomingBlock,
  StoryBlock,
  ImageBlock,
  TextBlock,
  CTABlock,
} from "./newsletter-schema";

function esc(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nl2br(s: string): string {
  return esc(s).replace(/\n/g, "<br />");
}

const F_DISPLAY = `Georgia, "Times New Roman", serif`;
const F_BODY = `-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;

// ─── BLOCK RENDERERS ─────────────────────────────────────────────────────────
function renderHero(b: HeroBlock, brand: NewsletterContent["brand"]): string {
  const img = b.imageUrl
    ? `<tr><td style="padding:0">
        <img src="${esc(b.imageUrl)}" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;border:0" />
       </td></tr>`
    : "";
  return `${img}
    <tr><td style="padding:32px 28px 12px;background:${brand.paperColor}">
      <h1 style="margin:0 0 12px;font-family:${F_DISPLAY};font-size:28px;line-height:1.2;font-weight:400;color:#1a1a1a">${esc(b.headline)}</h1>
      <div style="margin:0;font-family:${F_BODY};font-size:15px;line-height:1.65;color:#4a4a4a">${nl2br(b.body)}</div>
    </td></tr>`;
}

function renderConditions(b: ConditionsBlock, brand: NewsletterContent["brand"]): string {
  return `<tr><td style="padding:18px 28px;background:${brand.paperColor}">
    <div style="font-family:${F_BODY};font-size:11px;font-weight:700;color:${brand.primaryColor};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px">${esc(b.headline)}</div>
    <div style="font-family:${F_BODY};font-size:14px;line-height:1.7;color:#3a3a3a">${nl2br(b.body)}</div>
  </td></tr>`;
}

function renderFeaturedTrip(b: FeaturedTripBlock, brand: NewsletterContent["brand"]): string {
  const img = b.imageUrl
    ? `<img src="${esc(b.imageUrl)}" width="544" alt="" style="display:block;width:100%;max-width:544px;height:auto;border:0;border-radius:8px 8px 0 0" />`
    : "";
  const meta = [b.duration, b.price].filter(Boolean).map(esc).join(" · ");
  return `<tr><td style="padding:12px 28px;background:${brand.paperColor}">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f0ede6;border-radius:8px;overflow:hidden;border:1px solid #e0ddd4">
      ${img ? `<tr><td>${img}</td></tr>` : ""}
      <tr><td style="padding:18px 20px">
        <div style="font-family:${F_BODY};font-size:10px;font-weight:700;color:${brand.primaryColor};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Featured Trip</div>
        <h3 style="margin:0 0 8px;font-family:${F_DISPLAY};font-size:20px;line-height:1.25;color:#1a1a1a;font-weight:500">${esc(b.headline)}</h3>
        ${meta ? `<div style="font-family:${F_BODY};font-size:12px;color:#7a7a7a;margin-bottom:10px">${meta}</div>` : ""}
        <div style="font-family:${F_BODY};font-size:14px;line-height:1.65;color:#4a4a4a;margin-bottom:14px">${nl2br(b.body)}</div>
        <table cellpadding="0" cellspacing="0" border="0">
          <tr><td style="background:${brand.primaryColor};border-radius:6px">
            <a href="${esc(b.buttonUrl)}" style="display:inline-block;padding:11px 24px;font-family:${F_BODY};font-size:14px;font-weight:700;color:${brand.inkColor};text-decoration:none">${esc(b.buttonText)}</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>`;
}

function renderLocalIntel(b: LocalIntelBlock, brand: NewsletterContent["brand"]): string {
  return `<tr><td style="padding:18px 28px;background:${brand.paperColor}">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td style="border-left:3px solid ${brand.primaryColor};padding-left:16px">
        <div style="font-family:${F_BODY};font-size:11px;font-weight:700;color:${brand.primaryColor};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">${esc(b.headline)}</div>
        <div style="font-family:${F_BODY};font-size:14px;line-height:1.7;color:#3a3a3a">${nl2br(b.body)}</div>
      </td></tr>
    </table>
  </td></tr>`;
}

function renderTestimonial(b: TestimonialBlock, brand: NewsletterContent["brand"]): string {
  return `<tr><td style="padding:24px 28px;background:${brand.paperColor}">
    <div style="font-family:${F_DISPLAY};font-size:18px;line-height:1.55;color:#2a2a2a;font-style:italic;margin-bottom:10px">&ldquo;${esc(b.quote)}&rdquo;</div>
    <div style="font-family:${F_BODY};font-size:12px;color:#7a7a7a">— ${esc(b.author)}${b.trip ? ` · ${esc(b.trip)}` : ""}</div>
  </td></tr>`;
}

function renderGearTip(b: GearTipBlock, brand: NewsletterContent["brand"]): string {
  const link = b.productUrl
    ? `<a href="${esc(b.productUrl)}" style="font-family:${F_BODY};font-size:13px;color:${brand.primaryColor};text-decoration:underline">${esc(b.productName || "See it")}</a>`
    : (b.productName ? `<span style="font-family:${F_BODY};font-size:13px;color:#5a5a5a">${esc(b.productName)}</span>` : "");
  return `<tr><td style="padding:18px 28px;background:${brand.paperColor}">
    <div style="font-family:${F_BODY};font-size:11px;font-weight:700;color:${brand.primaryColor};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">${esc(b.headline)}</div>
    <div style="font-family:${F_BODY};font-size:14px;line-height:1.65;color:#3a3a3a;margin-bottom:6px">${nl2br(b.body)}</div>
    ${link}
  </td></tr>`;
}

function renderUpcoming(b: UpcomingBlock, brand: NewsletterContent["brand"]): string {
  return `<tr><td style="padding:18px 28px;background:${brand.paperColor}">
    <div style="font-family:${F_BODY};font-size:11px;font-weight:700;color:${brand.primaryColor};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">${esc(b.headline)}</div>
    <div style="font-family:${F_BODY};font-size:14px;line-height:1.65;color:#3a3a3a">${nl2br(b.body)}</div>
  </td></tr>`;
}

function renderStory(b: StoryBlock, brand: NewsletterContent["brand"]): string {
  return `<tr><td style="padding:24px 28px;background:${brand.paperColor}">
    <h2 style="margin:0 0 10px;font-family:${F_DISPLAY};font-size:22px;line-height:1.25;color:#1a1a1a;font-weight:500">${esc(b.headline)}</h2>
    <div style="font-family:${F_BODY};font-size:14px;line-height:1.7;color:#3a3a3a">${nl2br(b.body)}</div>
  </td></tr>`;
}

function renderImage(b: ImageBlock, brand: NewsletterContent["brand"]): string {
  if (!b.imageUrl) return "";
  return `<tr><td style="padding:12px 28px;background:${brand.paperColor}">
    <img src="${esc(b.imageUrl)}" width="544" alt="${esc(b.caption || "")}" style="display:block;width:100%;max-width:544px;height:auto;border:0;border-radius:6px" />
    ${b.caption ? `<div style="font-family:${F_BODY};font-size:11px;color:#8a8a8a;margin-top:8px;text-align:center;font-style:italic">${esc(b.caption)}</div>` : ""}
  </td></tr>`;
}

function renderText(b: TextBlock, brand: NewsletterContent["brand"]): string {
  return `<tr><td style="padding:14px 28px;background:${brand.paperColor}">
    <div style="font-family:${F_BODY};font-size:14px;line-height:1.7;color:#3a3a3a">${nl2br(b.body)}</div>
  </td></tr>`;
}

function renderCTA(b: CTABlock, brand: NewsletterContent["brand"]): string {
  return `<tr><td style="padding:32px 28px;background:${brand.paperColor};text-align:center">
    <h3 style="margin:0 0 8px;font-family:${F_DISPLAY};font-size:22px;line-height:1.25;color:#1a1a1a;font-weight:500">${esc(b.headline)}</h3>
    <div style="font-family:${F_BODY};font-size:14px;line-height:1.6;color:#4a4a4a;margin-bottom:18px">${nl2br(b.body)}</div>
    <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto">
      <tr><td style="background:${brand.primaryColor};border-radius:6px">
        <a href="${esc(b.buttonUrl)}" style="display:inline-block;padding:14px 32px;font-family:${F_BODY};font-size:15px;font-weight:700;color:${brand.inkColor};text-decoration:none;letter-spacing:0.02em">${esc(b.buttonText)}</a>
      </td></tr>
    </table>
  </td></tr>`;
}

function renderBlock(block: NewsletterBlock, brand: NewsletterContent["brand"]): string {
  if (block.enabled === false) return "";
  switch (block.type) {
    case "hero": return renderHero(block, brand);
    case "conditions": return renderConditions(block, brand);
    case "featured_trip": return renderFeaturedTrip(block, brand);
    case "local_intel": return renderLocalIntel(block, brand);
    case "testimonial": return renderTestimonial(block, brand);
    case "gear_tip": return renderGearTip(block, brand);
    case "upcoming": return renderUpcoming(block, brand);
    case "story": return renderStory(block, brand);
    case "image": return renderImage(block, brand);
    case "text": return renderText(block, brand);
    case "cta": return renderCTA(block, brand);
  }
}

// Insert thin divider between sections (skipped before/after hero/cta/image)
function divider(brand: NewsletterContent["brand"]): string {
  return `<tr><td style="padding:0 28px;background:${brand.paperColor}">
    <div style="height:1px;background:#e8e5df;margin:0"></div>
  </td></tr>`;
}

function shouldDividerBefore(prev: NewsletterBlock | undefined, current: NewsletterBlock): boolean {
  if (!prev) return false;
  if (prev.type === "hero" || current.type === "hero") return false;
  if (prev.type === "image" || current.type === "image") return false;
  if (current.type === "cta") return false;
  return true;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export function renderNewsletterHtml(content: NewsletterContent): string {
  const { brand, guide, sections, subject, preheader, footer } = content;

  const enabled = sections.filter((s) => s.enabled !== false);
  const sectionRows: string[] = [];
  enabled.forEach((block, i) => {
    if (shouldDividerBefore(enabled[i - 1], block)) sectionRows.push(divider(brand));
    sectionRows.push(renderBlock(block, brand));
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#e8e5df;-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#e8e5df;opacity:0">${esc(preheader)}</div>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#e8e5df">
  <tr><td align="center" style="padding:24px 12px">
    <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:${brand.paperColor};border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06)">

      <tr><td style="background:${brand.inkColor};padding:18px 28px">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="font-family:${F_DISPLAY};font-size:20px;color:${brand.primaryColor};letter-spacing:0.16em">RŌM</td>
            <td align="right" style="font-family:${F_BODY};font-size:11px;color:#8a96a0">${esc(guide.activity)} · ${esc(guide.location)}</td>
          </tr>
        </table>
      </td></tr>

      ${sectionRows.join("\n")}

      <tr><td style="background:${brand.inkColor};padding:24px 28px;text-align:center">
        <div style="font-family:${F_DISPLAY};font-size:16px;color:${brand.primaryColor};letter-spacing:0.14em;margin-bottom:6px">RŌM</div>
        <div style="font-family:${F_BODY};font-size:11px;color:#8a96a0;margin-bottom:10px">${esc(footer.tagline)}</div>
        <div style="font-family:${F_BODY};font-size:11px;color:#5a6470">
          <a href="${esc(guide.bookingUrl)}" style="color:${brand.primaryColor};text-decoration:none">View ${esc(guide.name)}'s availability</a>
          ${footer.unsubscribeUrl ? ` &nbsp;·&nbsp; <a href="${esc(footer.unsubscribeUrl)}" style="color:#8a96a0;text-decoration:underline">Unsubscribe</a>` : ""}
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// Plain-text fallback for accessibility / spam scoring
export function renderNewsletterText(content: NewsletterContent): string {
  const lines: string[] = [];
  lines.push(content.subject);
  lines.push("=".repeat(Math.min(content.subject.length, 60)));
  lines.push("");
  lines.push(content.preheader);
  lines.push("");

  for (const block of content.sections) {
    if (block.enabled === false) continue;
    switch (block.type) {
      case "hero":
      case "story":
        lines.push(block.headline.toUpperCase()); lines.push(""); lines.push(block.body); break;
      case "conditions":
      case "local_intel":
      case "gear_tip":
      case "upcoming":
        lines.push(`[${block.headline.toUpperCase()}]`); lines.push(block.body);
        if (block.type === "gear_tip" && block.productName) lines.push(`> ${block.productName}${block.productUrl ? ` — ${block.productUrl}` : ""}`);
        break;
      case "featured_trip":
        lines.push(`FEATURED: ${block.headline}`);
        if (block.duration || block.price) lines.push([block.duration, block.price].filter(Boolean).join(" · "));
        lines.push(block.body); lines.push(`${block.buttonText}: ${block.buttonUrl}`); break;
      case "testimonial":
        lines.push(`"${block.quote}"`); lines.push(`— ${block.author}${block.trip ? ` · ${block.trip}` : ""}`); break;
      case "image":
        if (block.caption) lines.push(`[Image: ${block.caption}]`); break;
      case "text":
        lines.push(block.body); break;
      case "cta":
        lines.push(block.headline); lines.push(block.body); lines.push(`${block.buttonText}: ${block.buttonUrl}`); break;
    }
    lines.push("");
  }

  lines.push("--");
  lines.push(content.footer.tagline);
  lines.push(content.guide.bookingUrl);
  if (content.footer.unsubscribeUrl) { lines.push(""); lines.push(`Unsubscribe: ${content.footer.unsubscribeUrl}`); }
  return lines.join("\n");
}
