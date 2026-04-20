"use client";
import { useState, useEffect, useCallback } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { GoldBtn, SectionCard, SectionHeader } from "@/app/components/ui";
import { getSupabase } from "@/app/lib/supabase-browser";
import Image from "next/image";

const CONTENT_TYPES = [
  { id: "instagram", label: "Instagram Post", icon: "IG", desc: "Image card + caption" },
  { id: "carousel", label: "Carousel", icon: "📑", desc: "Multi-slide swipeable" },
  { id: "reel", label: "Reel / TikTok", icon: "🎬", desc: "Shot-by-shot storyboard" },
  { id: "story", label: "Story", icon: "📱", desc: "Ephemeral sequence" },
  { id: "facebook", label: "Facebook", icon: "FB", desc: "Wide card + post" },
  { id: "blog", label: "Blog / Article", icon: "📝", desc: "Long-form SEO content" },
  { id: "email", label: "Newsletter", icon: "✉", desc: "Branded HTML email" },
  { id: "review_spotlight", label: "Review Card", icon: "⭐", desc: "Guest quote card" },
];

const GOALS = [
  { id: "awareness", label: "Build Awareness", desc: "Tell your story, build brand recognition" },
  { id: "education", label: "Educate", desc: "Share expertise, position as authority" },
  { id: "lead_gen", label: "Generate Leads", desc: "Drive follows, DMs, and email signups" },
  { id: "booking_gen", label: "Drive Bookings", desc: "Convert interest into confirmed trips" },
];

const INTEL_CATEGORIES = {
  seasonal: { label: "Seasonal", color: T.green },
  local_event: { label: "Local Event", color: T.blue },
  news: { label: "News", color: "#7a6a2a" },
  law_change: { label: "Regulation", color: T.red },
  weather: { label: "Weather", color: "#2a6a7a" },
  trend: { label: "Trending", color: "#7a2a6a" },
  review_highlight: { label: "Review", color: T.gold },
  educational: { label: "Educational", color: "#4a7a3a" },
  behind_scenes: { label: "Behind Scenes", color: "#5a5a7a" },
};

const SUB_TABS = ["Create", "Intelligence", "Calendar", "Library"];

const PLATFORM_ICONS = { instagram: "IG", facebook: "FB", email: "✉", tiktok: "TT", reel: "🎬" };

// ─── PHOTO PICKER ────────────────────────────────────────────────────────────
function PhotoPicker({ guidePhotos, stockPhotos, selected, onSelect, onRefreshStock }) {
  const hasGuide = guidePhotos?.length > 0;
  const hasStock = stockPhotos?.length > 0;

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onSelect(url);
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
        Choose Photo
      </div>

      {/* Stock photos — 3 options */}
      {hasStock && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.silver }}>Stock Photos</span>
            {onRefreshStock && <button onClick={onRefreshStock} style={{ background: "none", border: "none", fontFamily: FONT_BODY, fontSize: 11, color: T.gold, cursor: "pointer" }}>↻ New photos</button>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {stockPhotos.slice(0, 3).map((url, i) => (
              <div key={`stock-${i}`} onClick={() => onSelect(url)} style={{
                width: 80, height: 80, borderRadius: 8, overflow: "hidden", cursor: "pointer", flexShrink: 0,
                border: selected === url ? `3px solid ${T.gold}` : `2px solid ${T.wire}`,
                opacity: selected === url ? 1 : 0.6, transition: "all 0.15s",
              }}>
                <Image src={url} alt="" fill style={{ objectFit: "cover" }} sizes="200px" unoptimized />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guide's own photos */}
      {hasGuide && (
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.silver, display: "block", marginBottom: 6 }}>Your Photos</span>
          <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
            {guidePhotos.map((url, i) => (
              <div key={`guide-${i}`} onClick={() => onSelect(url)} style={{
                width: 80, height: 80, borderRadius: 8, overflow: "hidden", cursor: "pointer", flexShrink: 0,
                border: selected === url ? `3px solid ${T.gold}` : `2px solid ${T.wire}`,
                opacity: selected === url ? 1 : 0.6, transition: "all 0.15s",
              }}>
                <Image src={url} alt="" fill style={{ objectFit: "cover" }} sizes="200px" unoptimized />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload from device */}
      <label style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: T.steel, border: `1px dashed ${T.wire}`, borderRadius: 8,
        padding: "8px 14px", cursor: "pointer",
        fontFamily: FONT_BODY, fontSize: 12, color: T.silver,
      }}>
        📁 Upload from device
        <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleUpload} />
      </label>
    </div>
  );
}

// ─── BRANDED CARD PREVIEW ────────────────────────────────────────────────────
function BrandedCardPreview({ headline, subline, guideName, guideLocation, guideActivity, photoUrl, isWide }) {
  const previewW = isWide ? 400 : 280;
  const previewH = isWide ? 210 : 280;
  return (
    <div style={{
      width: previewW, height: previewH, borderRadius: 8, overflow: "hidden",
      position: "relative", background: "#0b1812", flexShrink: 0,
      backgroundImage: photoUrl ? `url(${photoUrl})` : "none",
      backgroundSize: "cover", backgroundPosition: "center",
    }}>
      <div style={{ position: "absolute", inset: 0, background: photoUrl ? "rgba(0,0,0,0.5)" : "linear-gradient(135deg, #0b1812, #081018, #120e04)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)" }} />
      <div style={{ position: "absolute", top: 10, left: 14, background: "rgba(0,0,0,0.5)", borderRadius: 3, padding: "2px 8px" }}>
        <span style={{ fontFamily: FONT_BODY, fontSize: 8, fontWeight: 700, color: T.gold, textTransform: "uppercase" }}>{guideActivity}</span>
      </div>
      <div style={{ position: "absolute", bottom: isWide ? 36 : 50, left: 14, right: 14 }}>
        <div style={{ width: 20, height: 2, background: T.gold, marginBottom: 8 }} />
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: isWide ? 15 : 18, color: "#fff", fontWeight: 700, lineHeight: 1.15, marginBottom: 4 }}>
          {headline || "Your Next Adventure"}
        </div>
        {subline && <div style={{ fontFamily: FONT_BODY, fontSize: isWide ? 9 : 10, color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>{subline}</div>}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "7px 14px", background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: FONT_BODY, fontSize: 8, fontWeight: 700, color: T.gold }}>{guideName} · {guideLocation}</span>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 10, color: T.gold, letterSpacing: "0.12em" }}>RŌM</span>
      </div>
    </div>
  );
}

// ─── DOWNLOAD CARD ───────────────────────────────────────────────────────────
function DownloadButton({ headline, subline, guideName, guideLocation, guideActivity, photoUrl, platform }) {
  const [rendering, setRendering] = useState(false);
  const isWide = platform === "facebook";
  const w = isWide ? 1200 : 1080;
  const h = isWide ? 630 : 1080;

  const render = useCallback(async () => {
    setRendering(true);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#0b1812"); grad.addColorStop(0.5, "#081018"); grad.addColorStop(1, "#120e04");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    if (photoUrl) {
      try {
        const img = new Image(); img.crossOrigin = "anonymous";
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = photoUrl; });
        const scale = Math.max(w / img.width, h / img.height);
        ctx.drawImage(img, (w - img.width * scale) / 2, (h - img.height * scale) / 2, img.width * scale, img.height * scale);
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 0, w, h);
      } catch {}
    }
    const tg = ctx.createLinearGradient(0, h * 0.3, 0, h);
    tg.addColorStop(0, "rgba(0,0,0,0)"); tg.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.fillStyle = tg; ctx.fillRect(0, 0, w, h);
    // Margins and sizes
    const mx = isWide ? 60 : 70;
    const headSize = isWide ? 46 : 64;
    const subSize = isWide ? 20 : 26;
    const lineH = isWide ? 54 : 76;
    const subGap = isWide ? 20 : 28;
    const barHeight = isWide ? 60 : 90;

    // Calculate text content height first
    ctx.font = `bold ${headSize}px Georgia, "Times New Roman", serif`;
    const headLines = wrapText(ctx, headline || "Your Next Adventure", w - mx * 2);
    const totalTextHeight = headLines.length * lineH + (subline ? subGap + subSize : 0) + 20;

    // Position text so it ends above the bottom bar
    const headStartY = h - barHeight - totalTextHeight - 20;

    // Gold accent bar above headline
    ctx.fillStyle = "#c9973a"; ctx.fillRect(mx, headStartY - 20, 50, 3);

    // Headline — bold serif with text shadow
    ctx.font = `bold ${headSize}px Georgia, "Times New Roman", serif`;
    ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 16; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 4;
    ctx.fillStyle = "#fff";
    headLines.forEach((line, i) => {
      ctx.fillText(line, mx, headStartY + i * lineH);
    });

    // Subtitle — italic, clearly below headline
    if (subline) {
      ctx.font = `italic ${subSize}px Georgia, "Times New Roman", serif`;
      ctx.fillStyle = "rgba(232,224,208,0.8)";
      ctx.shadowBlur = 10;
      const subY = headStartY + headLines.length * lineH + subGap;
      ctx.fillText(subline, mx, subY);
    }

    // Reset shadow
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    // Bottom bar — guide info + RŌM badge
    const barY = h - barHeight;
    ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0, barY, w, barHeight);
    // Thin gold line at top of bar
    ctx.fillStyle = "#c9973a"; ctx.fillRect(0, barY, w, 2);

    // Guide name · location
    ctx.fillStyle = "rgba(232,224,208,0.9)"; ctx.font = `500 ${isWide ? 16 : 20}px -apple-system, "Helvetica Neue", sans-serif`;
    ctx.fillText(`${guideName || "Guide"}  ·  ${guideLocation || ""}`, mx, barY + (isWide ? 36 : 52));

    // RŌM badge — larger, right aligned
    ctx.textAlign = "right";
    ctx.font = `500 ${isWide ? 30 : 42}px Georgia, "Times New Roman", serif`;
    ctx.fillStyle = "#c9973a";
    ctx.fillText("RŌM", w - mx, barY + (isWide ? 40 : 58));
    ctx.textAlign = "left";

    // Activity badge — top left with rounded corners
    ctx.font = `bold ${isWide ? 12 : 15}px -apple-system, "Helvetica Neue", sans-serif`;
    const badgeText = guideActivity || "Adventure";
    const bw = ctx.measureText(badgeText).width + 28;
    const bx = mx; const by = isWide ? 28 : 42;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    roundRect(ctx, bx, by, bw, isWide ? 28 : 34, 6);
    ctx.fill();
    ctx.fillStyle = "#c9973a";
    ctx.fillText(badgeText, bx + 14, by + (isWide ? 18 : 23));

    canvas.toBlob((blob) => {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `rom-${platform}-${Date.now()}.png`; a.click();
      setRendering(false);
    }, "image/png");
  }, [headline, subline, guideName, guideLocation, guideActivity, photoUrl, platform, w, h, isWide]);

  return (
    <button onClick={render} disabled={rendering} style={{
      background: T.gold, border: "none", borderRadius: 5, padding: "6px 14px",
      fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.ink, cursor: "pointer",
    }}>
      {rendering ? "Rendering…" : `Download ${isWide ? "1200×630" : "1080×1080"}`}
    </button>
  );
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" "); const lines = []; let cur = words[0] || "";
  for (let i = 1; i < words.length; i++) {
    const t = cur + " " + words[i];
    if (ctx.measureText(t).width <= maxWidth) cur = t; else { lines.push(cur); cur = words[i]; }
  }
  lines.push(cur); return lines;
}

// ─── EMAIL PREVIEW ───────────────────────────────────────────────────────────
function EmailPreview({ option, guideName, guideLocation, guideActivity, guideSlug }) {
  const [copied, setCopied] = useState(false);
  const sections = option.sections || [];
  const bookingUrl = `https://romlife.co/guides/${guideSlug || ""}`;

  const copyHtml = () => {
    const html = generateEmailHtml(option, guideName, guideLocation, guideActivity, bookingUrl);
    navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ border: `1px solid ${T.wire}`, borderRadius: 10, overflow: "hidden", maxWidth: 480 }}>
      {/* Email header */}
      <div style={{ background: "#0d1117", padding: "20px 24px", borderBottom: `1px solid ${T.wire}` }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: T.muted, marginBottom: 4 }}>Subject:</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.white, fontWeight: 600 }}>{option.subject}</div>
        {option.preheader && <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted, marginTop: 4 }}>{option.preheader}</div>}
      </div>

      {/* Email body */}
      <div style={{ background: "#faf9f6", padding: 0 }}>
        {/* Brand header */}
        <div style={{ background: "#0d1117", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: "#c9973a", letterSpacing: "0.14em" }}>RŌM</span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: "#8a96a0" }}>{guideActivity} · {guideLocation}</span>
        </div>

        {sections.map((sec, i) => (
          <div key={i} style={{ padding: sec.type === "hero" ? "32px 24px 24px" : "16px 24px", borderBottom: i < sections.length - 1 ? "1px solid #e8e5df" : "none" }}>
            {sec.type === "hero" && (
              <>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 24, color: "#1a1a1a", fontWeight: 400, lineHeight: 1.2, marginBottom: 10 }}>{sec.headline}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: "#4a4a4a", lineHeight: 1.65 }}>{sec.body}</div>
              </>
            )}
            {sec.type === "conditions" && (
              <>
                <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: "#c9973a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{sec.headline}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: "#4a4a4a", lineHeight: 1.65 }}>{sec.body}</div>
              </>
            )}
            {sec.type === "spotlight" && (
              <div style={{ background: "#f0ede6", borderRadius: 8, padding: 18, border: "1px solid #e0ddd4" }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 17, color: "#1a1a1a", marginBottom: 6 }}>{sec.headline}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: "#4a4a4a", lineHeight: 1.6, marginBottom: 10 }}>{sec.body}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {sec.price && <span style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "#c9973a" }}>{sec.price}</span>}
                  <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: "#c9973a" }}>{sec.cta || "Book Now"} →</span>
                </div>
              </div>
            )}
            {sec.type === "testimonial" && (
              <div style={{ borderLeft: "3px solid #c9973a", paddingLeft: 16, margin: "8px 0" }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 14, color: "#3a3a3a", fontStyle: "italic", lineHeight: 1.6, marginBottom: 6 }}>"{sec.quote}"</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#8a8a8a" }}>— {sec.guest}</div>
              </div>
            )}
            {sec.type === "cta" && (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 18, color: "#1a1a1a", marginBottom: 6 }}>{sec.headline}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: "#4a4a4a", marginBottom: 16 }}>{sec.body}</div>
                <div style={{ display: "inline-block", background: "#c9973a", color: "#0d1117", padding: "12px 28px", borderRadius: 6, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700 }}>
                  {sec.buttonText || "View Availability"}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Footer */}
        <div style={{ background: "#0d1117", padding: "16px 24px", textAlign: "center" }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 14, color: "#c9973a", letterSpacing: "0.12em" }}>RŌM</span>
          <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: "#5a6470", marginTop: 4 }}>The world's best adventure guides, in one place.</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: "12px 16px", display: "flex", gap: 8, borderTop: `1px solid ${T.wire}` }}>
        <button onClick={copyHtml} style={{
          background: copied ? T.greenGlow : T.gold, border: "none", borderRadius: 5,
          padding: "6px 14px", fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700,
          color: copied ? T.green : T.ink, cursor: "pointer",
        }}>
          {copied ? "HTML Copied!" : "Copy HTML"}
        </button>
      </div>
    </div>
  );
}

function generateEmailHtml(option, guideName, guideLocation, guideActivity, bookingUrl) {
  const sections = (option.sections || []).map(sec => {
    if (sec.type === "hero") return `<tr><td style="padding:32px 24px 24px"><h1 style="font-family:Georgia,serif;font-size:24px;color:#1a1a1a;margin:0 0 10px">${sec.headline}</h1><p style="font-family:-apple-system,sans-serif;font-size:14px;color:#4a4a4a;line-height:1.65;margin:0">${sec.body}</p></td></tr>`;
    if (sec.type === "conditions") return `<tr><td style="padding:16px 24px"><p style="font-family:-apple-system,sans-serif;font-size:11px;font-weight:700;color:#c9973a;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px">${sec.headline}</p><p style="font-family:-apple-system,sans-serif;font-size:13px;color:#4a4a4a;line-height:1.65;margin:0">${sec.body}</p></td></tr>`;
    if (sec.type === "spotlight") return `<tr><td style="padding:16px 24px"><div style="background:#f0ede6;border-radius:8px;padding:18px;border:1px solid #e0ddd4"><h3 style="font-family:Georgia,serif;font-size:17px;color:#1a1a1a;margin:0 0 6px">${sec.headline}</h3><p style="font-family:-apple-system,sans-serif;font-size:13px;color:#4a4a4a;line-height:1.6;margin:0 0 10px">${sec.body}</p>${sec.price ? `<span style="font-family:Georgia,serif;font-size:20px;color:#c9973a">${sec.price}</span>` : ""}</div></td></tr>`;
    if (sec.type === "testimonial") return `<tr><td style="padding:16px 24px"><div style="border-left:3px solid #c9973a;padding-left:16px"><p style="font-family:Georgia,serif;font-size:14px;color:#3a3a3a;font-style:italic;line-height:1.6;margin:0 0 6px">"${sec.quote}"</p><p style="font-family:-apple-system,sans-serif;font-size:12px;color:#8a8a8a;margin:0">— ${sec.guest}</p></div></td></tr>`;
    if (sec.type === "cta") return `<tr><td style="padding:16px 24px;text-align:center"><h3 style="font-family:Georgia,serif;font-size:18px;color:#1a1a1a;margin:0 0 6px">${sec.headline}</h3><p style="font-family:-apple-system,sans-serif;font-size:13px;color:#4a4a4a;margin:0 0 16px">${sec.body}</p><a href="${bookingUrl}" style="display:inline-block;background:#c9973a;color:#0d1117;padding:12px 28px;border-radius:6px;font-family:-apple-system,sans-serif;font-size:14px;font-weight:700;text-decoration:none">${sec.buttonText || "View Availability"}</a></td></tr>`;
    return "";
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#e8e5df"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px"><table width="600" cellpadding="0" cellspacing="0" style="background:#faf9f6;border-radius:8px;overflow:hidden"><tr><td style="background:#0d1117;padding:16px 24px"><table width="100%"><tr><td style="font-family:Georgia,serif;font-size:18px;color:#c9973a;letter-spacing:0.14em">RŌM</td><td align="right" style="font-family:-apple-system,sans-serif;font-size:10px;color:#8a96a0">${guideActivity} · ${guideLocation}</td></tr></table></td></tr>${sections}<tr><td style="background:#0d1117;padding:16px 24px;text-align:center"><span style="font-family:Georgia,serif;font-size:14px;color:#c9973a;letter-spacing:0.12em">RŌM</span><p style="font-family:-apple-system,sans-serif;font-size:10px;color:#5a6470;margin:4px 0 0">The world's best adventure guides, in one place.</p></td></tr></table></td></tr></table></body></html>`;
}

// ─── REEL STORYBOARD ─────────────────────────────────────────────────────────
function ReelStoryboard({ option }) {
  const [copied, setCopied] = useState(false);
  const shots = option.shots || [];

  const copyScript = () => {
    let text = `REEL: ${option.title}\nDuration: ${option.duration || "30s"}\nMusic: ${option.musicVibe || "N/A"}\nHook: ${option.hook || ""}\n\n`;
    shots.forEach((s, i) => {
      text += `[${s.time}] ${s.visual}${s.textOverlay ? `\n  TEXT: "${s.textOverlay}"` : ""}${s.transition ? ` → ${s.transition}` : ""}\n`;
    });
    text += `\nCaption: ${option.caption || ""}\n${(option.hashtags || []).map(h => `#${h.replace(/^#+/, "")}`).join(" ")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ border: `1px solid ${T.wire}`, borderRadius: 10, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: T.void, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: T.white }}>{option.title}</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted, marginTop: 2 }}>{option.duration || "30s"} · {option.musicVibe || "Music TBD"}</div>
        </div>
        <div style={{ background: T.goldGlow, border: `1px solid ${T.gold}`, borderRadius: 4, padding: "4px 10px" }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: T.gold }}>🎬 REEL</span>
        </div>
      </div>

      {/* Hook callout */}
      {option.hook && (
        <div style={{ background: T.goldGlow, padding: "10px 20px", borderBottom: `1px solid ${T.wire}` }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em" }}>Hook (first 2 sec): </span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment }}>{option.hook}</span>
        </div>
      )}

      {/* Shot list */}
      <div style={{ padding: "4px 0" }}>
        {shots.map((shot, i) => (
          <div key={i} style={{ padding: "12px 20px", borderBottom: i < shots.length - 1 ? `1px solid ${T.rim}` : "none", display: "flex", gap: 14 }}>
            <div style={{ minWidth: 70, flexShrink: 0 }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.gold }}>{shot.time}</div>
              {shot.transition && <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: T.muted, marginTop: 2 }}>→ {shot.transition}</div>}
            </div>
            <div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment, lineHeight: 1.5 }}>{shot.visual}</div>
              {shot.textOverlay && (
                <div style={{ marginTop: 6, background: T.void, borderRadius: 4, padding: "4px 10px", display: "inline-block" }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.white }}>TEXT: </span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold }}>"{shot.textOverlay}"</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Caption */}
      {option.caption && (
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.wire}`, background: T.lifted }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Caption</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment, lineHeight: 1.6 }}>{option.caption}</div>
          {option.hashtags?.length > 0 && (
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.gold, marginTop: 6 }}>{option.hashtags.map(h => `#${h.replace(/^#+/, "")}`).join(" ")}</div>
          )}
        </div>
      )}

      {/* Filming tip */}
      {option.tip && (
        <div style={{ padding: "10px 20px", background: T.greenGlow, borderTop: `1px solid ${T.wire}` }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: "#4ade80" }}>TIP: </span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.ash }}>{option.tip}</span>
        </div>
      )}

      <div style={{ padding: "10px 16px", display: "flex", gap: 8, borderTop: `1px solid ${T.wire}` }}>
        <button onClick={copyScript} style={{
          background: copied ? "#1a3a2a" : T.steel, border: `1px solid ${copied ? "#4ade80" : T.wire}`,
          borderRadius: 5, padding: "6px 14px", fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700,
          color: copied ? "#4ade80" : T.ash, cursor: "pointer",
        }}>
          {copied ? "Copied!" : "Copy Script"}
        </button>
      </div>
    </div>
  );
}

// ─── INTELLIGENCE VIEW ──────────────────────────────────────────────────────
function IntelligenceView({ guideId }) {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { loadIntel(); }, [guideId]);

  const getAuthHeader = async () => {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  };

  const loadIntel = async () => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/ai/content-intelligence?guideId=${guideId}`, { headers });
      const data = await res.json();
      setOpportunities(data.opportunities || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const generateIntel = async () => {
    setGenerating(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/ai/content-intelligence", {
        method: "POST", headers, body: JSON.stringify({ guideId }),
      });
      const data = await res.json();
      setOpportunities(data.opportunities || []);
    } catch (e) { console.error(e); }
    setGenerating(false);
  };

  const dismissIntel = async (id) => {
    const supabase = getSupabase();
    await supabase.from("content_intelligence").update({ status: "dismissed" }).eq("id", id);
    setOpportunities(prev => prev.filter(o => o.id !== id));
  };

  if (loading) return <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.muted, padding: 40 }}>Loading intelligence…</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver }}>Content opportunities based on your location, activity, season, and business data.</div>
        </div>
        <button onClick={generateIntel} disabled={generating}
          style={{ background: T.gold, border: "none", borderRadius: 6, padding: "10px 20px", fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: T.ink, cursor: generating ? "not-allowed" : "pointer", opacity: generating ? 0.5 : 1, flexShrink: 0 }}>
          {generating ? "Scanning…" : "Scan for Opportunities"}
        </button>
      </div>
      {opportunities.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 10 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.silver, marginBottom: 8 }}>No opportunities yet</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.muted }}>Click "Scan for Opportunities" to generate content ideas based on what's happening right now.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {opportunities.map(opp => {
            const cat = INTEL_CATEGORIES[opp.category] || { label: opp.category, color: T.silver };
            return (
              <div key={opp.id} style={{ background: T.steel, border: `1px solid ${T.wire}`, borderLeft: `3px solid ${cat.color}`, borderRadius: 8, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: cat.color, background: `${cat.color}28`, borderRadius: 3, padding: "2px 8px", marginRight: 8 }}>{cat.label}</span>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: T.muted }}>{Math.round((opp.relevance_score || 0) * 100)}% relevant</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(opp.suggested_types || []).map(t => (
                      <span key={t} style={{ fontFamily: FONT_BODY, fontSize: 9, color: T.muted, background: T.lifted, borderRadius: 3, padding: "1px 6px" }}>{t}</span>
                    ))}
                  </div>
                </div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: T.white, marginBottom: 4 }}>{opp.title}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, lineHeight: 1.6, marginBottom: 8 }}>{opp.summary}</div>
                {opp.suggested_angle && (
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold, fontStyle: "italic", marginBottom: 10 }}>Angle: {opp.suggested_angle}</div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { /* Will be handled by parent to switch to Create with this intel pre-loaded */ }}
                    style={{ background: T.gold, border: "none", borderRadius: 5, padding: "6px 16px", fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.ink, cursor: "pointer" }}>Create Content</button>
                  <button onClick={() => dismissIntel(opp.id)}
                    style={{ background: "none", border: `1px solid ${T.rim}`, borderRadius: 5, padding: "6px 16px", fontFamily: FONT_BODY, fontSize: 12, color: T.muted, cursor: "pointer" }}>Dismiss</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── CALENDAR VIEW ──────────────────────────────────────────────────────────
function CalendarView({ guideId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d;
  });

  useEffect(() => { loadCalendar(); }, [guideId, currentWeekStart]);

  const getAuthHeader = async () => {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  };

  const loadCalendar = async () => {
    try {
      const start = currentWeekStart.toISOString().split("T")[0];
      const end = new Date(currentWeekStart.getTime() + 6 * 86400000).toISOString().split("T")[0];
      const headers = await getAuthHeader();
      const res = await fetch(`/api/content/calendar?guideId=${guideId}&start=${start}&end=${end}`, { headers });
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart); d.setDate(d.getDate() + i); return d;
  });

  const prevWeek = () => { const d = new Date(currentWeekStart); d.setDate(d.getDate() - 7); setCurrentWeekStart(d); };
  const nextWeek = () => { const d = new Date(currentWeekStart); d.setDate(d.getDate() + 7); setCurrentWeekStart(d); };

  const daysSincePost = entries.length > 0 ? Math.floor((Date.now() - new Date(entries[entries.length - 1]?.scheduled_date).getTime()) / 86400000) : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver }}>Plan and schedule your content cadence.</div>
        {daysSincePost !== null && daysSincePost > 7 && (
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#aa7a7a", background: T.redGlow, border: `1px solid ${T.red}`, borderRadius: 4, padding: "4px 10px" }}>
            {daysSincePost} days since last scheduled post
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={prevWeek} style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "6px 12px", fontFamily: FONT_BODY, fontSize: 12, color: T.silver, cursor: "pointer" }}>← Prev</button>
        <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, color: T.parchment }}>
          {currentWeekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
        <button onClick={nextWeek} style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "6px 12px", fontFamily: FONT_BODY, fontSize: 12, color: T.silver, cursor: "pointer" }}>Next →</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {weekDays.map(day => {
          const dateStr = day.toISOString().split("T")[0];
          const dayEntries = entries.filter(e => e.scheduled_date === dateStr);
          const isToday = dateStr === new Date().toISOString().split("T")[0];
          return (
            <div key={dateStr} style={{
              background: isToday ? T.goldGlow : T.steel,
              border: `1px solid ${isToday ? T.gold : T.wire}`,
              borderRadius: 8, padding: 12, minHeight: 100,
            }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: isToday ? T.gold : T.silver, textTransform: "uppercase", marginBottom: 4 }}>
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, color: isToday ? T.gold : T.parchment, marginBottom: 8 }}>
                {day.getDate()}
              </div>
              {dayEntries.map(e => (
                <div key={e.id} style={{ background: T.lifted, borderRadius: 4, padding: "4px 6px", marginBottom: 4, fontFamily: FONT_BODY, fontSize: 10, color: T.ash }}>
                  <span style={{ color: T.gold, fontWeight: 700, marginRight: 4 }}>{e.platform}</span>
                  {e.status === "posted" ? "Posted" : e.content_pieces?.title || "Content"}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── LIBRARY VIEW ───────────────────────────────────────────────────────────
function LibraryView({ guideId }) {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: "", status: "", goal: "" });

  useEffect(() => { loadLibrary(); }, [guideId, filter]);

  const getAuthHeader = async () => {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  };

  const loadLibrary = async () => {
    try {
      const params = new URLSearchParams({ guideId });
      if (filter.type) params.set("type", filter.type);
      if (filter.status) params.set("status", filter.status);
      if (filter.goal) params.set("goal", filter.goal);
      const headers = await getAuthHeader();
      const res = await fetch(`/api/content/library?${params}`, { headers });
      const data = await res.json();
      setContent(data.content || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const markPosted = async (id) => {
    try {
      const headers = await getAuthHeader();
      await fetch("/api/content/library", {
        method: "PUT", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: id, status: "published", performance: { posted_at: new Date().toISOString() } }),
      });
      loadLibrary();
    } catch (e) { console.error(e); }
  };

  return (
    <div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, marginBottom: 16 }}>All your generated content in one place. Filter, reuse, and track performance.</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <select value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}
          style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "7px 12px", fontFamily: FONT_BODY, fontSize: 12, color: T.ash, outline: "none" }}>
          <option value="">All Types</option>
          {CONTENT_TYPES.map(ct => <option key={ct.id} value={ct.id}>{ct.label}</option>)}
        </select>
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "7px 12px", fontFamily: FONT_BODY, fontSize: 12, color: T.ash, outline: "none" }}>
          <option value="">All Status</option>
          {["pending", "approved", "published", "skipped"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select value={filter.goal} onChange={e => setFilter(f => ({ ...f, goal: e.target.value }))}
          style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "7px 12px", fontFamily: FONT_BODY, fontSize: 12, color: T.ash, outline: "none" }}>
          <option value="">All Goals</option>
          {GOALS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.muted, padding: 40 }}>Loading library…</div>
      ) : content.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 10 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.silver, marginBottom: 8 }}>No content yet</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.muted }}>Generate content from the Create tab to build your library.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {content.map(piece => (
            <div key={piece.id} style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: "14px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: T.gold, background: T.goldGlow, borderRadius: 3, padding: "2px 8px" }}>
                    {piece.content_type || piece.type || piece.platform}
                  </span>
                  {piece.goal && <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: T.silver, background: T.lifted, borderRadius: 3, padding: "2px 8px" }}>{piece.goal}</span>}
                  <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: piece.status === "published" ? T.green : piece.status === "approved" ? T.gold : T.muted }}>
                    {piece.status}
                  </span>
                </div>
                <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: T.muted }}>{new Date(piece.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment, lineHeight: 1.5, maxHeight: 60, overflow: "hidden" }}>
                {piece.title || piece.content?.slice(0, 200)}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => navigator.clipboard.writeText(piece.content || "")}
                  style={{ background: "none", border: `1px solid ${T.wire}`, borderRadius: 4, padding: "4px 12px", fontFamily: FONT_BODY, fontSize: 11, color: T.ash, cursor: "pointer" }}>Copy</button>
                {piece.status !== "published" && (
                  <button onClick={() => markPosted(piece.id)}
                    style={{ background: "none", border: `1px solid ${T.green}`, borderRadius: 4, padding: "4px 12px", fontFamily: FONT_BODY, fontSize: 11, color: T.green, cursor: "pointer" }}>Mark as Posted</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function MarketingTab({ guide, contentQueue: initialQueue = [] }) {
  const [subTab, setSubTab] = useState("Create");
  const [selectedType, setSelectedType] = useState("instagram");
  const [selectedGoal, setSelectedGoal] = useState("");
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState(null);
  const [guideData, setGuideData] = useState(null);
  const [copied, setCopied] = useState(null);
  const [queue, setQueue] = useState(initialQueue);
  const [editingContent, setEditingContent] = useState(null);
  const [editText, setEditText] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState({});
  const [reviews, setReviews] = useState([]);
  const [reviewContentMode, setReviewContentMode] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);

  const guideId = guide?.id;

  useEffect(() => { loadReviews(); }, [guideId]);

  const loadReviews = async () => {
    if (!guideId) return;
    const supabase = getSupabase();
    const { data } = await supabase.from("reviews").select("id, rating, body, trip_label, created_at")
      .eq("guide_id", guideId).gte("rating", 4).order("created_at", { ascending: false }).limit(10);
    setReviews(data || []);
  };

  const getAuthHeader = async () => {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setResults(null);
    setSelectedPhotos({});
    try {
      const res = await fetch("/api/ai/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideId, contentType: selectedType,
          goal: selectedGoal || undefined,
          topic: topic || undefined,
          context: topic ? { topic } : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) { console.error(data.error); setGenerating(false); return; }
      if (data.options) {
        setResults(data.options);
        setGuideData({
          photos: data.guidePhotos || [], stockPhotos: data.stockPhotos || [],
          name: data.guideName, location: data.guideLocation,
          activity: data.guideActivity, slug: data.guideSlug,
        });
        const allPhotos = [...(data.guidePhotos || []), ...(data.stockPhotos || [])];
        const initial = {};
        data.options.forEach((_, i) => { initial[i] = allPhotos[i % allPhotos.length] || null; });
        setSelectedPhotos(initial);
      }
    } catch (err) { console.error("Generate error:", err); }
    setGenerating(false);
  };

  const handleReviewToContent = async (reviewId) => {
    setGenerating(true);
    setResults(null);
    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/content/review-to-content", {
        method: "POST", headers,
        body: JSON.stringify({ reviewId, guideId, contentType: selectedType, goal: selectedGoal }),
      });
      const data = await res.json();
      if (data.options) {
        setResults(data.options);
        // Also fetch photos
        const photoRes = await fetch("/api/ai/marketing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideId, contentType: "instagram", context: { topic: "review" } }),
        });
        const photoData = await photoRes.json();
        setGuideData({
          photos: photoData.guidePhotos || [], stockPhotos: photoData.stockPhotos || [],
          name: photoData.guideName, location: photoData.guideLocation,
          activity: photoData.guideActivity, slug: photoData.guideSlug,
        });
      }
    } catch (err) { console.error(err); }
    setGenerating(false);
    setReviewContentMode(false);
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleContentAction = async (contentId, action, edited) => {
    try {
      await fetch("/api/content/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, action, editedContent: edited }),
      });
      setQueue(q => q.filter(c => c.id !== contentId));
      setEditingContent(null); setEditText("");
    } catch (e) { console.error(e); }
  };

  const isReel = selectedType === "reel";
  const isEmail = selectedType === "email";
  const isBlog = selectedType === "blog";
  const isCarousel = selectedType === "carousel";
  const isStory = selectedType === "story";
  const isVisual = !isReel && !isEmail && !isBlog;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Sub-navigation */}
      <div style={{ display: "flex", gap: 4, background: T.void, borderRadius: 8, padding: 4 }}>
        {SUB_TABS.map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{
            flex: 1, padding: "10px 0", background: subTab === t ? T.steel : "transparent",
            border: "none", borderRadius: 6,
            fontFamily: FONT_BODY, fontSize: 13, fontWeight: subTab === t ? 700 : 400,
            color: subTab === t ? T.gold : T.silver, cursor: "pointer",
          }}>{t}{t === "Create" && queue.length > 0 ? ` (${queue.length})` : ""}</button>
        ))}
      </div>

      {/* ── INTELLIGENCE TAB ── */}
      {subTab === "Intelligence" && <IntelligenceView guideId={guideId} />}

      {/* ── CALENDAR TAB ── */}
      {subTab === "Calendar" && <CalendarView guideId={guideId} />}

      {/* ── LIBRARY TAB ── */}
      {subTab === "Library" && <LibraryView guideId={guideId} />}

      {/* ── CREATE TAB ── */}
      {subTab === "Create" && (
        <>
          {/* Content Queue */}
          {queue.length > 0 && (
            <SectionCard>
              <SectionHeader>Content Queue — {queue.length} piece{queue.length !== 1 ? "s" : ""} ready</SectionHeader>
              <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, marginBottom: 16 }}>
                Your weekly content is ready. Approve to use, edit to customize, or skip.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {queue.map(piece => {
                  const isEditing = editingContent === piece.id;
                  const displayContent = piece.type === "email" ? (() => {
                    try { const p = JSON.parse(piece.content); return `Subject: ${p.subject}\n\n${p.body}`; } catch { return piece.content; }
                  })() : piece.content;
                  return (
                    <div key={piece.id} style={{ background: T.lifted, border: `1px solid ${T.wire}`, borderRadius: 8, padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: T.gold, background: T.goldGlow, borderRadius: 3, padding: "2px 8px" }}>
                          {piece.platform}
                        </span>
                      </div>
                      {isEditing ? (
                        <div>
                          <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={5}
                            style={{ width: "100%", boxSizing: "border-box", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "10px 12px", fontFamily: FONT_BODY, fontSize: 13, color: T.parchment, outline: "none", resize: "vertical", lineHeight: 1.6, marginBottom: 10 }} />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => handleContentAction(piece.id, "edit", editText)} style={{ background: T.gold, border: "none", borderRadius: 5, padding: "6px 16px", fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.ink, cursor: "pointer" }}>Save & Approve</button>
                            <button onClick={() => { setEditingContent(null); setEditText(""); }} style={{ background: "none", border: `1px solid ${T.wire}`, borderRadius: 5, padding: "6px 16px", fontFamily: FONT_BODY, fontSize: 12, color: T.ash, cursor: "pointer" }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 8, maxHeight: 120, overflow: "hidden" }}>{displayContent}</div>
                          {piece.hashtags?.length > 0 && <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.gold, marginBottom: 10 }}>{piece.hashtags.map(h => `#${h.replace(/^#+/, "")}`).join(" ")}</div>}
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => handleContentAction(piece.id, "approve")} style={{ background: T.gold, border: "none", borderRadius: 5, padding: "6px 16px", fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.ink, cursor: "pointer" }}>Approve</button>
                            <button onClick={() => { setEditingContent(piece.id); setEditText(displayContent); }} style={{ background: "none", border: `1px solid ${T.wire}`, borderRadius: 5, padding: "6px 16px", fontFamily: FONT_BODY, fontSize: 12, color: T.ash, cursor: "pointer" }}>Edit</button>
                            <button onClick={() => handleContentAction(piece.id, "skip")} style={{ background: "none", border: `1px solid ${T.rim}`, borderRadius: 5, padding: "6px 16px", fontFamily: FONT_BODY, fontSize: 12, color: T.muted, cursor: "pointer" }}>Skip</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* Review-to-Content */}
          {reviews.length > 0 && (
            <SectionCard>
              <SectionHeader>Turn Reviews into Content</SectionHeader>
              <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, marginBottom: 12 }}>One-click: pick a great review and turn it into a post, carousel, reel, or blog.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {reviews.slice(0, 3).map(r => (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: T.lifted, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "10px 14px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment, lineHeight: 1.5 }}>"{r.body?.slice(0, 120)}…"</div>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted, marginTop: 2 }}>{r.rating}/5 · {r.trip_label}</div>
                    </div>
                    <button onClick={() => handleReviewToContent(r.id)}
                      style={{ background: T.gold, border: "none", borderRadius: 5, padding: "6px 14px", fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.ink, cursor: "pointer", flexShrink: 0, marginLeft: 12 }}>
                      Create Content
                    </button>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Content Studio */}
          <SectionCard>
            <SectionHeader>Content Studio</SectionHeader>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, marginBottom: 16 }}>
              AI-powered content using your real photos and voice. Choose your format, goal, and topic.
            </div>

            {/* Step 1: Content Type */}
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>1. Choose Format</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8, marginBottom: 20 }}>
              {CONTENT_TYPES.map(ct => (
                <button key={ct.id} onClick={() => { setSelectedType(ct.id); setResults(null); }}
                  style={{
                    background: selectedType === ct.id ? T.goldGlow : T.lifted,
                    border: `1px solid ${selectedType === ct.id ? T.gold : T.wire}`,
                    borderRadius: 8, padding: "10px 8px", cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  }}>
                  <span style={{ fontSize: 14 }}>{ct.icon}</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600, color: selectedType === ct.id ? T.white : T.ash }}>{ct.label}</span>
                </button>
              ))}
            </div>

            {/* Step 2: Goal */}
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>2. Choose Goal</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginBottom: 20 }}>
              {GOALS.map(g => (
                <button key={g.id} onClick={() => setSelectedGoal(selectedGoal === g.id ? "" : g.id)}
                  style={{
                    background: selectedGoal === g.id ? T.goldGlow : T.lifted,
                    border: `1px solid ${selectedGoal === g.id ? T.gold : T.wire}`,
                    borderRadius: 8, padding: "10px 12px", cursor: "pointer", textAlign: "left",
                  }}>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: selectedGoal === g.id ? T.white : T.ash }}>{g.label}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 9, color: T.muted, marginTop: 2 }}>{g.desc}</div>
                </button>
              ))}
            </div>

            {/* Step 3: Topic */}
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>3. Topic (optional)</div>
            <div style={{ marginBottom: 20 }}>
              <input type="text" placeholder="e.g., 'spring runoff fishing tips', 'why book a guide', 'fall colors on the Madison'"
                value={topic} onChange={e => setTopic(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: "12px 16px", fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, outline: "none" }} />
            </div>

            <GoldBtn full onClick={handleGenerate} disabled={generating}>
              {generating ? "Creating 2 options…" : "Generate Content"}
            </GoldBtn>
          </SectionCard>

          {/* Results */}
          {results && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Pick your favorite — or remix for a new spin
              </div>
              {results.map((opt, i) => (
                <SectionCard key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {opt.title || `Option ${i + 1}`}
                    </span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => handleCopy(
                        (opt.content || "") + (opt.hashtags?.length ? "\n\n" + opt.hashtags.map(h => `#${h.replace(/^#+/, "")}`).join(" ") : ""), i
                      )}
                        style={{ background: copied === i ? "#1a3a2a" : T.steel, border: `1px solid ${copied === i ? "#4ade80" : T.wire}`, borderRadius: 4, padding: "4px 12px", fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: copied === i ? "#4ade80" : T.ash, cursor: "pointer" }}>
                        {copied === i ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* REEL STORYBOARD */}
                  {isReel && <ReelStoryboard option={opt} />}

                  {/* EMAIL NEWSLETTER */}
                  {isEmail && guideData && (
                    <EmailPreview option={opt} guideName={guideData.name} guideLocation={guideData.location} guideActivity={guideData.activity} guideSlug={guideData.slug} />
                  )}

                  {/* BLOG */}
                  {isBlog && (
                    <div>
                      {opt.meta_description && <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted, fontStyle: "italic", marginBottom: 12 }}>{opt.meta_description}</div>}
                      <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{opt.content}</div>
                    </div>
                  )}

                  {/* CAROUSEL */}
                  {isCarousel && opt.slides && (
                    <div>
                      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 10, marginBottom: 12 }}>
                        {opt.slides.map((slide, si) => (
                          <div key={si} style={{ minWidth: 200, background: T.lifted, border: `1px solid ${T.wire}`, borderRadius: 8, padding: 14, flexShrink: 0 }}>
                            <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: T.muted, marginBottom: 4 }}>Slide {si + 1}</div>
                            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: T.white, marginBottom: 4 }}>{slide.headline}</div>
                            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.ash, lineHeight: 1.5 }}>{slide.body}</div>
                            {slide.visual_direction && <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: T.muted, fontStyle: "italic", marginTop: 6 }}>{slide.visual_direction}</div>}
                          </div>
                        ))}
                      </div>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, lineHeight: 1.65, marginBottom: 8 }}>{opt.content}</div>
                      {opt.hashtags?.length > 0 && <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold }}>{opt.hashtags.map(h => `#${h.replace(/^#+/, "")}`).join(" ")}</div>}
                    </div>
                  )}

                  {/* STORY */}
                  {isStory && opt.frames && (
                    <div>
                      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10 }}>
                        {opt.frames.map((frame, fi) => (
                          <div key={fi} style={{ minWidth: 160, background: T.lifted, border: `1px solid ${T.wire}`, borderRadius: 8, padding: 12, flexShrink: 0 }}>
                            <div style={{ fontFamily: FONT_BODY, fontSize: 9, color: T.gold, textTransform: "uppercase", marginBottom: 4 }}>{frame.type}</div>
                            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.parchment, lineHeight: 1.5 }}>{frame.content}</div>
                            {frame.sticker && <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: T.muted, marginTop: 4 }}>{frame.sticker}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* VISUAL CONTENT (IG, FB, Review) */}
                  {isVisual && !isCarousel && !isStory && (
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                      <div>
                        <PhotoPicker
                          guidePhotos={guideData?.photos}
                          stockPhotos={guideData?.stockPhotos}
                          selected={selectedPhotos[i]}
                          onSelect={(url) => setSelectedPhotos(p => ({ ...p, [i]: url }))}
                        />
                        <BrandedCardPreview
                          headline={opt.headline} subline={opt.subline}
                          guideName={guideData?.name} guideLocation={guideData?.location}
                          guideActivity={guideData?.activity} photoUrl={selectedPhotos[i]}
                          isWide={selectedType === "facebook"}
                        />
                        <div style={{ marginTop: 10 }}>
                          <DownloadButton
                            headline={opt.headline} subline={opt.subline}
                            guideName={guideData?.name} guideLocation={guideData?.location}
                            guideActivity={guideData?.activity} photoUrl={selectedPhotos[i]}
                            platform={selectedType}
                          />
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Caption</div>
                        <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, lineHeight: 1.65, whiteSpace: "pre-wrap", marginBottom: 10 }}>{opt.content}</div>
                        {opt.hashtags?.length > 0 && <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold, lineHeight: 1.6 }}>{opt.hashtags.map(h => `#${h.replace(/^#+/, "")}`).join(" ")}</div>}
                      </div>
                    </div>
                  )}
                </SectionCard>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
