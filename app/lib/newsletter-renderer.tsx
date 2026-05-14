// React renderer for NewsletterContent. Used by:
//   - The in-app editor preview (NewsletterEditor)
//   - The public web page at /newsletter/[id]
//
// Visually mirrors the email HTML in newsletter-html.ts. Email clients are the
// strict floor; this renderer can layer on richer hover/responsive behavior.

import type {
  NewsletterContent,
  NewsletterBlock,
} from "./newsletter-schema";

const F_DISPLAY = `'Cormorant Garamond', Georgia, "Times New Roman", serif`;
const F_BODY = `'Barlow', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;

interface BlockProps {
  block: NewsletterBlock;
  brand: NewsletterContent["brand"];
}

function Block({ block, brand }: BlockProps) {
  if (block.enabled === false) return null;

  switch (block.type) {
    case "hero":
      return (
        <div>
          {block.imageUrl && (
            <img src={block.imageUrl} alt="" style={{ display: "block", width: "100%", height: "auto" }} />
          )}
          <div style={{ padding: "32px 28px 12px", background: brand.paperColor }}>
            <h1 style={{ margin: "0 0 12px", fontFamily: F_DISPLAY, fontSize: 28, lineHeight: 1.2, fontWeight: 400, color: "#1a1a1a" }}>{block.headline}</h1>
            <div style={{ fontFamily: F_BODY, fontSize: 15, lineHeight: 1.65, color: "#4a4a4a", whiteSpace: "pre-wrap" }}>{block.body}</div>
          </div>
        </div>
      );

    case "conditions":
      return (
        <div style={{ padding: "18px 28px", background: brand.paperColor }}>
          <div style={{ fontFamily: F_BODY, fontSize: 11, fontWeight: 700, color: brand.primaryColor, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>{block.headline}</div>
          <div style={{ fontFamily: F_BODY, fontSize: 14, lineHeight: 1.7, color: "#3a3a3a", whiteSpace: "pre-wrap" }}>{block.body}</div>
        </div>
      );

    case "featured_trip": {
      const meta = [block.duration, block.price].filter(Boolean).join(" · ");
      return (
        <div style={{ padding: "12px 28px", background: brand.paperColor }}>
          <div style={{ background: "#f0ede6", borderRadius: 8, overflow: "hidden", border: "1px solid #e0ddd4" }}>
            {block.imageUrl && <img src={block.imageUrl} alt="" style={{ display: "block", width: "100%", height: "auto" }} />}
            <div style={{ padding: "18px 20px" }}>
              <div style={{ fontFamily: F_BODY, fontSize: 10, fontWeight: 700, color: brand.primaryColor, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Featured Trip</div>
              <h3 style={{ margin: "0 0 8px", fontFamily: F_DISPLAY, fontSize: 20, lineHeight: 1.25, color: "#1a1a1a", fontWeight: 500 }}>{block.headline}</h3>
              {meta && <div style={{ fontFamily: F_BODY, fontSize: 12, color: "#7a7a7a", marginBottom: 10 }}>{meta}</div>}
              <div style={{ fontFamily: F_BODY, fontSize: 14, lineHeight: 1.65, color: "#4a4a4a", marginBottom: 14, whiteSpace: "pre-wrap" }}>{block.body}</div>
              <a href={block.buttonUrl} style={{ display: "inline-block", background: brand.primaryColor, color: brand.inkColor, padding: "11px 24px", fontFamily: F_BODY, fontSize: 14, fontWeight: 700, textDecoration: "none", borderRadius: 6 }}>{block.buttonText}</a>
            </div>
          </div>
        </div>
      );
    }

    case "local_intel":
      return (
        <div style={{ padding: "18px 28px", background: brand.paperColor }}>
          <div style={{ borderLeft: `3px solid ${brand.primaryColor}`, paddingLeft: 16 }}>
            <div style={{ fontFamily: F_BODY, fontSize: 11, fontWeight: 700, color: brand.primaryColor, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{block.headline}</div>
            <div style={{ fontFamily: F_BODY, fontSize: 14, lineHeight: 1.7, color: "#3a3a3a", whiteSpace: "pre-wrap" }}>{block.body}</div>
          </div>
        </div>
      );

    case "testimonial":
      return (
        <div style={{ padding: "24px 28px", background: brand.paperColor }}>
          <div style={{ fontFamily: F_DISPLAY, fontSize: 18, lineHeight: 1.55, color: "#2a2a2a", fontStyle: "italic", marginBottom: 10 }}>“{block.quote}”</div>
          <div style={{ fontFamily: F_BODY, fontSize: 12, color: "#7a7a7a" }}>— {block.author}{block.trip && ` · ${block.trip}`}</div>
        </div>
      );

    case "gear_tip":
      return (
        <div style={{ padding: "18px 28px", background: brand.paperColor }}>
          <div style={{ fontFamily: F_BODY, fontSize: 11, fontWeight: 700, color: brand.primaryColor, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{block.headline}</div>
          <div style={{ fontFamily: F_BODY, fontSize: 14, lineHeight: 1.65, color: "#3a3a3a", marginBottom: 6, whiteSpace: "pre-wrap" }}>{block.body}</div>
          {block.productUrl
            ? <a href={block.productUrl} style={{ fontFamily: F_BODY, fontSize: 13, color: brand.primaryColor, textDecoration: "underline" }}>{block.productName || "See it"}</a>
            : block.productName && <span style={{ fontFamily: F_BODY, fontSize: 13, color: "#5a5a5a" }}>{block.productName}</span>}
        </div>
      );

    case "upcoming":
      return (
        <div style={{ padding: "18px 28px", background: brand.paperColor }}>
          <div style={{ fontFamily: F_BODY, fontSize: 11, fontWeight: 700, color: brand.primaryColor, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{block.headline}</div>
          <div style={{ fontFamily: F_BODY, fontSize: 14, lineHeight: 1.65, color: "#3a3a3a", whiteSpace: "pre-wrap" }}>{block.body}</div>
        </div>
      );

    case "story":
      return (
        <div style={{ padding: "24px 28px", background: brand.paperColor }}>
          <h2 style={{ margin: "0 0 10px", fontFamily: F_DISPLAY, fontSize: 22, lineHeight: 1.25, color: "#1a1a1a", fontWeight: 500 }}>{block.headline}</h2>
          <div style={{ fontFamily: F_BODY, fontSize: 14, lineHeight: 1.7, color: "#3a3a3a", whiteSpace: "pre-wrap" }}>{block.body}</div>
        </div>
      );

    case "image":
      if (!block.imageUrl) return null;
      return (
        <div style={{ padding: "12px 28px", background: brand.paperColor }}>
          <img src={block.imageUrl} alt={block.caption || ""} style={{ display: "block", width: "100%", height: "auto", borderRadius: 6 }} />
          {block.caption && <div style={{ fontFamily: F_BODY, fontSize: 11, color: "#8a8a8a", marginTop: 8, textAlign: "center", fontStyle: "italic" }}>{block.caption}</div>}
        </div>
      );

    case "text":
      return (
        <div style={{ padding: "14px 28px", background: brand.paperColor }}>
          <div style={{ fontFamily: F_BODY, fontSize: 14, lineHeight: 1.7, color: "#3a3a3a", whiteSpace: "pre-wrap" }}>{block.body}</div>
        </div>
      );

    case "cta":
      return (
        <div style={{ padding: "32px 28px", background: brand.paperColor, textAlign: "center" }}>
          <h3 style={{ margin: "0 0 8px", fontFamily: F_DISPLAY, fontSize: 22, lineHeight: 1.25, color: "#1a1a1a", fontWeight: 500 }}>{block.headline}</h3>
          <div style={{ fontFamily: F_BODY, fontSize: 14, lineHeight: 1.6, color: "#4a4a4a", marginBottom: 18, whiteSpace: "pre-wrap" }}>{block.body}</div>
          <a href={block.buttonUrl} style={{ display: "inline-block", background: brand.primaryColor, color: brand.inkColor, padding: "14px 32px", fontFamily: F_BODY, fontSize: 15, fontWeight: 700, textDecoration: "none", borderRadius: 6, letterSpacing: "0.02em" }}>{block.buttonText}</a>
        </div>
      );
  }
}

function shouldDividerBefore(prev: NewsletterBlock | undefined, current: NewsletterBlock): boolean {
  if (!prev) return false;
  if (prev.type === "hero" || current.type === "hero") return false;
  if (prev.type === "image" || current.type === "image") return false;
  if (current.type === "cta") return false;
  return true;
}

interface NewsletterRendererProps {
  content: NewsletterContent;
  // "page" frames it for a public web view (centered card on neutral bg, full responsive)
  // "preview" embeds it for the editor preview pane (no outer frame)
  mode?: "page" | "preview";
  maxWidth?: number;
}

export function NewsletterRenderer({ content, mode = "preview", maxWidth = 600 }: NewsletterRendererProps) {
  const { brand, guide, sections, footer } = content;
  const enabled = sections.filter((s) => s.enabled !== false);

  const card = (
    <div style={{ background: brand.paperColor, borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", maxWidth, width: "100%" }}>
      {/* Brand header */}
      <div style={{ background: brand.inkColor, padding: "18px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: F_DISPLAY, fontSize: 20, color: brand.primaryColor, letterSpacing: "0.16em" }}>RŌM</span>
        <span style={{ fontFamily: F_BODY, fontSize: 11, color: "#8a96a0" }}>{guide.activity} · {guide.location}</span>
      </div>

      {enabled.map((block, i) => (
        <div key={block.id}>
          {shouldDividerBefore(enabled[i - 1], block) && (
            <div style={{ padding: "0 28px", background: brand.paperColor }}>
              <div style={{ height: 1, background: "#e8e5df" }} />
            </div>
          )}
          <Block block={block} brand={brand} />
        </div>
      ))}

      {/* Footer */}
      <div style={{ background: brand.inkColor, padding: "24px 28px", textAlign: "center" }}>
        <div style={{ fontFamily: F_DISPLAY, fontSize: 16, color: brand.primaryColor, letterSpacing: "0.14em", marginBottom: 6 }}>RŌM</div>
        <div style={{ fontFamily: F_BODY, fontSize: 11, color: "#8a96a0", marginBottom: 10 }}>{footer.tagline}</div>
        <div style={{ fontFamily: F_BODY, fontSize: 11, color: "#5a6470" }}>
          <a href={guide.bookingUrl} style={{ color: brand.primaryColor, textDecoration: "none" }}>View {guide.name}&apos;s availability</a>
          {footer.unsubscribeUrl && (
            <>
              {" · "}
              <a href={footer.unsubscribeUrl} style={{ color: "#8a96a0", textDecoration: "underline" }}>Unsubscribe</a>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (mode === "page") {
    return (
      <div style={{ background: "#e8e5df", minHeight: "100vh", padding: "32px 12px", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
        {card}
      </div>
    );
  }
  return card;
}
