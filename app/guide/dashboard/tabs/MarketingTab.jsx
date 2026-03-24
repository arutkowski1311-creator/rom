"use client";
import { useState, useCallback } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { GoldBtn, SectionCard, SectionHeader } from "@/app/components/ui";

const CONTENT_TYPES = [
  { id: "instagram", label: "Instagram", icon: "IG", desc: "Image card + caption" },
  { id: "facebook", label: "Facebook", icon: "FB", desc: "Wide card + post" },
  { id: "reel", label: "Reel / TikTok", icon: "🎬", desc: "Shot-by-shot storyboard" },
  { id: "email", label: "Newsletter", icon: "✉", desc: "Branded HTML email" },
  { id: "review_spotlight", label: "Review Card", icon: "⭐", desc: "Guest quote card" },
];

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
                <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
    text += `\nCaption: ${option.caption || ""}\n${(option.hashtags || []).map(h => `#${h}`).join(" ")}`;
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
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.gold, marginTop: 6 }}>{option.hashtags.map(h => `#${h}`).join(" ")}</div>
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

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function MarketingTab({ guide, contentQueue: initialQueue = [] }) {
  const [selectedType, setSelectedType] = useState("instagram");
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState(null);
  const [guideData, setGuideData] = useState(null);
  const [copied, setCopied] = useState(null);
  const [queue, setQueue] = useState(initialQueue);
  const [editingContent, setEditingContent] = useState(null);
  const [editText, setEditText] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState({});

  const handleGenerate = async () => {
    setGenerating(true);
    setResults(null);
    setSelectedPhotos({});
    try {
      const res = await fetch("/api/ai/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideId: guide.id, contentType: selectedType, context: topic ? { topic } : undefined }),
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
        // Auto-select first photo for each option
        const allPhotos = [...(data.guidePhotos || []), ...(data.stockPhotos || [])];
        const initial = {};
        data.options.forEach((_, i) => { initial[i] = allPhotos[i % allPhotos.length] || null; });
        setSelectedPhotos(initial);
      }
    } catch (err) { console.error("Generate error:", err); }
    setGenerating(false);
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
  const isVisual = !isReel && !isEmail;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
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
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: T.gold, background: T.goldGlow, borderRadius: 3, padding: "2px 8px" }}>
                        {PLATFORM_ICONS[piece.platform] || piece.platform}
                      </span>
                      <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>
                        {new Date(piece.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
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
                      {piece.hashtags?.length > 0 && <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.gold, marginBottom: 10 }}>{piece.hashtags.map(h => `#${h}`).join(" ")}</div>}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => handleContentAction(piece.id, "approve")} style={{ background: T.gold, border: "none", borderRadius: 5, padding: "6px 16px", fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.ink, cursor: "pointer" }}>Approve ✓</button>
                        <button onClick={() => { setEditingContent(piece.id); setEditText(displayContent); }} style={{ background: "none", border: `1px solid ${T.wire}`, borderRadius: 5, padding: "6px 16px", fontFamily: FONT_BODY, fontSize: 12, color: T.ash, cursor: "pointer" }}>Edit</button>
                        <button onClick={() => { navigator.clipboard.writeText(displayContent + (piece.hashtags?.length ? "\n\n" + piece.hashtags.map(h => `#${h}`).join(" ") : "")); }} style={{ background: "none", border: `1px solid ${T.wire}`, borderRadius: 5, padding: "6px 16px", fontFamily: FONT_BODY, fontSize: 12, color: T.ash, cursor: "pointer" }}>Copy</button>
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

      {/* Generate */}
      <SectionCard>
        <SectionHeader>Content Studio</SectionHeader>
        <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, marginBottom: 16 }}>
          AI-powered content using your real photos and voice. Co-branded with RŌM.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 16 }}>
          {CONTENT_TYPES.map(ct => (
            <button key={ct.id} onClick={() => { setSelectedType(ct.id); setResults(null); }}
              style={{
                background: selectedType === ct.id ? T.goldGlow : T.lifted,
                border: `1px solid ${selectedType === ct.id ? T.gold : T.wire}`,
                borderRadius: 8, padding: "12px 10px", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}>
              <span style={{ fontSize: 16 }}>{ct.icon}</span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: selectedType === ct.id ? T.white : T.ash }}>{ct.label}</span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 9, color: T.muted }}>{ct.desc}</span>
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <input type="text" placeholder="Optional: focus topic (e.g., 'spring runoff', 'beginner tips', 'fall colors')"
            value={topic} onChange={e => setTopic(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: "12px 16px", fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, outline: "none" }} />
        </div>

        <GoldBtn full onClick={handleGenerate} disabled={generating}>
          {generating ? (isReel ? "Writing storyboard..." : isEmail ? "Designing newsletter..." : "Generating content + visuals...") : "Generate Content"}
        </GoldBtn>
      </SectionCard>

      {/* Results */}
      {results && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {results.map((opt, i) => (
            <SectionCard key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {opt.title || `Option ${i + 1}`}
                </span>
                {!isReel && !isEmail && (
                  <button onClick={() => handleCopy(opt.content + (opt.hashtags?.length ? "\n\n" + opt.hashtags.map(h => `#${h}`).join(" ") : ""), i)}
                    style={{ background: copied === i ? "#1a3a2a" : T.steel, border: `1px solid ${copied === i ? "#4ade80" : T.wire}`, borderRadius: 4, padding: "4px 12px", fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: copied === i ? "#4ade80" : T.ash, cursor: "pointer" }}>
                    {copied === i ? "Copied!" : "Copy Caption"}
                  </button>
                )}
              </div>

              {/* REEL STORYBOARD */}
              {isReel && <ReelStoryboard option={opt} />}

              {/* EMAIL NEWSLETTER */}
              {isEmail && guideData && (
                <EmailPreview option={opt} guideName={guideData.name} guideLocation={guideData.location} guideActivity={guideData.activity} guideSlug={guideData.slug} />
              )}

              {/* VISUAL CONTENT (IG, FB, Review) */}
              {isVisual && (
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
                    {opt.hashtags?.length > 0 && <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold, lineHeight: 1.6 }}>{opt.hashtags.map(h => `#${h}`).join(" ")}</div>}
                  </div>
                </div>
              )}
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
