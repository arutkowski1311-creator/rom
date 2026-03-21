"use client";
import { useState, useRef, useCallback } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { GoldBtn, SectionCard, SectionHeader } from "@/app/components/ui";

const CONTENT_TYPES = [
  { id: "instagram", label: "Instagram", icon: "IG", size: "1080×1080" },
  { id: "facebook", label: "Facebook", icon: "FB", size: "1200×630" },
  { id: "email", label: "Email Newsletter", icon: "EM", size: null },
  { id: "review_spotlight", label: "Review Spotlight", icon: "RS", size: "1080×1080" },
];

const PLATFORM_ICONS = { instagram: "IG", facebook: "FB", email: "✉", tiktok: "TT" };

// ─── BRANDED CARD RENDERER ───────────────────────────────────────────────────
function BrandedCard({ headline, subline, guideName, guideLocation, guideActivity, photoUrl, platform, onDownload }) {
  const canvasRef = useRef(null);
  const [rendering, setRendering] = useState(false);

  const isWide = platform === "facebook";
  const w = isWide ? 1200 : 1080;
  const h = isWide ? 630 : 1080;
  const previewW = isWide ? 400 : 300;
  const previewH = isWide ? 210 : 300;

  const renderCard = useCallback(async () => {
    setRendering(true);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    // Background — dark gradient fallback
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#0b1812");
    grad.addColorStop(0.5, "#081018");
    grad.addColorStop(1, "#120e04");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Load photo if available
    if (photoUrl) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = photoUrl;
        });
        // Cover fill
        const scale = Math.max(w / img.width, h / img.height);
        const sw = img.width * scale;
        const sh = img.height * scale;
        ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh);
        // Dark overlay for text readability
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, w, h);
      } catch {
        // Photo failed to load — keep gradient background
      }
    }

    // Bottom gradient for text area
    const textGrad = ctx.createLinearGradient(0, h * 0.4, 0, h);
    textGrad.addColorStop(0, "rgba(0,0,0,0)");
    textGrad.addColorStop(1, "rgba(0,0,0,0.8)");
    ctx.fillStyle = textGrad;
    ctx.fillRect(0, 0, w, h);

    // Gold accent line
    ctx.fillStyle = "#c9973a";
    ctx.fillRect(isWide ? 60 : 80, h - (isWide ? 210 : 380), 50, 3);

    // Headline
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${isWide ? 42 : 64}px Georgia, serif`;
    const headlineLines = wrapText(ctx, headline || "Your Next Adventure", w - (isWide ? 140 : 160));
    headlineLines.forEach((line, i) => {
      ctx.fillText(line, isWide ? 60 : 80, h - (isWide ? 170 : 340) + i * (isWide ? 48 : 72));
    });

    // Subline
    if (subline) {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = `${isWide ? 20 : 28}px -apple-system, sans-serif`;
      const subY = h - (isWide ? 170 : 340) + headlineLines.length * (isWide ? 48 : 72) + (isWide ? 12 : 20);
      const subLines = wrapText(ctx, subline, w - (isWide ? 140 : 160));
      subLines.forEach((line, i) => {
        ctx.fillText(line, isWide ? 60 : 80, subY + i * (isWide ? 26 : 36));
      });
    }

    // Guide info bar at bottom
    const barY = h - (isWide ? 60 : 90);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, barY - 10, w, h - barY + 10);
    ctx.fillStyle = "#c9973a";
    ctx.font = `bold ${isWide ? 16 : 22}px -apple-system, sans-serif`;
    ctx.fillText(`${guideName || "Guide"}  ·  ${guideLocation || ""}`, isWide ? 60 : 80, barY + (isWide ? 18 : 24));

    // RŌM logo
    ctx.fillStyle = "#c9973a";
    ctx.font = `500 ${isWide ? 20 : 28}px Georgia, serif`;
    ctx.textAlign = "right";
    ctx.fillText("RŌM", w - (isWide ? 60 : 80), barY + (isWide ? 18 : 24));
    ctx.textAlign = "left";

    // Top corner — activity badge
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    const badgeW = ctx.measureText(guideActivity || "Adventure").width + 32;
    roundRect(ctx, isWide ? 50 : 70, isWide ? 30 : 50, badgeW, isWide ? 28 : 36, 4);
    ctx.fill();
    ctx.fillStyle = "#c9973a";
    ctx.font = `bold ${isWide ? 12 : 16}px -apple-system, sans-serif`;
    ctx.fillText(guideActivity || "Adventure", isWide ? 66 : 86, isWide ? 49 : 74);

    // Convert to blob and download
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      if (onDownload) onDownload(url);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rom-${platform}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setRendering(false);
    }, "image/png");
  }, [headline, subline, guideName, guideLocation, guideActivity, photoUrl, platform, w, h, isWide, onDownload]);

  return (
    <div>
      {/* Preview card */}
      <div style={{
        width: previewW, height: previewH, borderRadius: 8, overflow: "hidden",
        position: "relative", background: "#0b1812", marginBottom: 12,
        backgroundImage: photoUrl ? `url(${photoUrl})` : "none",
        backgroundSize: "cover", backgroundPosition: "center",
      }}>
        {/* Overlay */}
        <div style={{ position: "absolute", inset: 0, background: photoUrl ? "rgba(0,0,0,0.5)" : "linear-gradient(135deg, #0b1812, #081018, #120e04)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)" }} />

        {/* Activity badge */}
        <div style={{ position: "absolute", top: 12, left: 16, background: "rgba(0,0,0,0.5)", borderRadius: 3, padding: "2px 8px" }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 9, fontWeight: 700, color: T.gold }}>{guideActivity}</span>
        </div>

        {/* Gold accent */}
        <div style={{ position: "absolute", bottom: isWide ? 70 : 120, left: 16, width: 24, height: 2, background: T.gold }} />

        {/* Headline */}
        <div style={{ position: "absolute", bottom: isWide ? 40 : 60, left: 16, right: 16 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: isWide ? 16 : 20, color: "#fff", fontWeight: 700, lineHeight: 1.15, marginBottom: 4 }}>
            {headline || "Your Next Adventure"}
          </div>
          {subline && (
            <div style={{ fontFamily: FONT_BODY, fontSize: isWide ? 9 : 11, color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>
              {subline}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 16px", background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 9, fontWeight: 700, color: T.gold }}>
            {guideName} · {guideLocation}
          </span>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 11, color: T.gold, letterSpacing: "0.12em" }}>RŌM</span>
        </div>
      </div>

      <button onClick={renderCard} disabled={rendering} style={{
        background: "none", border: `1px solid ${T.wire}`, borderRadius: 5,
        padding: "6px 14px", fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700,
        color: T.ash, cursor: "pointer",
      }}>
        {rendering ? "Rendering…" : `Download ${platform === "facebook" ? "1200×630" : "1080×1080"}`}
      </button>
    </div>
  );
}

// Canvas helpers
function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = words[0] || "";
  for (let i = 1; i < words.length; i++) {
    const test = currentLine + " " + words[i];
    if (ctx.measureText(test).width <= maxWidth) {
      currentLine = test;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
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

  const handleGenerate = async () => {
    setGenerating(true);
    setResults(null);
    try {
      const res = await fetch("/api/ai/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideId: guide.id,
          contentType: selectedType,
          context: topic ? { topic } : undefined,
        }),
      });
      const data = await res.json();
      if (data.options) {
        setResults(data.options);
        setGuideData({
          photos: data.guidePhotos || [],
          coverPhoto: data.coverPhoto,
          profilePhoto: data.profilePhoto,
          name: data.guideName,
          location: data.guideLocation,
          activity: data.guideActivity,
        });
      }
    } catch (err) {
      console.error("Generate error:", err);
    }
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
      setEditingContent(null);
      setEditText("");
    } catch (e) {
      console.error("Content action error:", e);
    }
  };

  // Pick a photo for a content card — rotate through gallery
  const getPhotoForIndex = (i) => {
    if (!guideData) return null;
    const photos = [...(guideData.photos || [])];
    if (guideData.coverPhoto) photos.unshift(guideData.coverPhoto);
    if (photos.length === 0) return null;
    return photos[i % photos.length];
  };

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
                        <button onClick={() => handleContentAction(piece.id, "edit", editText)}
                          style={{ background: T.gold, border: "none", borderRadius: 5, padding: "6px 16px", fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.ink, cursor: "pointer" }}>Save & Approve</button>
                        <button onClick={() => { setEditingContent(null); setEditText(""); }}
                          style={{ background: "none", border: `1px solid ${T.wire}`, borderRadius: 5, padding: "6px 16px", fontFamily: FONT_BODY, fontSize: 12, color: T.ash, cursor: "pointer" }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 8, maxHeight: 120, overflow: "hidden" }}>
                        {displayContent}
                      </div>
                      {piece.hashtags?.length > 0 && (
                        <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.gold, marginBottom: 10 }}>
                          {piece.hashtags.map(h => `#${h}`).join(" ")}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => handleContentAction(piece.id, "approve")}
                          style={{ background: T.gold, border: "none", borderRadius: 5, padding: "6px 16px", fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.ink, cursor: "pointer" }}>Approve ✓</button>
                        <button onClick={() => { setEditingContent(piece.id); setEditText(displayContent); }}
                          style={{ background: "none", border: `1px solid ${T.wire}`, borderRadius: 5, padding: "6px 16px", fontFamily: FONT_BODY, fontSize: 12, color: T.ash, cursor: "pointer" }}>Edit</button>
                        <button onClick={() => { navigator.clipboard.writeText(displayContent + (piece.hashtags?.length ? "\n\n" + piece.hashtags.map(h => `#${h}`).join(" ") : "")); }}
                          style={{ background: "none", border: `1px solid ${T.wire}`, borderRadius: 5, padding: "6px 16px", fontFamily: FONT_BODY, fontSize: 12, color: T.ash, cursor: "pointer" }}>Copy</button>
                        <button onClick={() => handleContentAction(piece.id, "skip")}
                          style={{ background: "none", border: `1px solid ${T.rim}`, borderRadius: 5, padding: "6px 16px", fontFamily: FONT_BODY, fontSize: 12, color: T.muted, cursor: "pointer" }}>Skip</button>
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
        <SectionHeader>Generate Content</SectionHeader>
        <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, marginBottom: 16 }}>
          Creates caption + branded image card using your real photos. Co-branded with RŌM.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
          {CONTENT_TYPES.map(ct => (
            <button
              key={ct.id}
              onClick={() => { setSelectedType(ct.id); setResults(null); }}
              style={{
                background: selectedType === ct.id ? T.goldGlow : T.lifted,
                border: `1px solid ${selectedType === ct.id ? T.gold : T.wire}`,
                borderRadius: 8, padding: "14px 12px",
                cursor: "pointer", transition: "all 0.15s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              }}
            >
              <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: selectedType === ct.id ? T.gold : T.muted, letterSpacing: "0.06em" }}>{ct.icon}</span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: selectedType === ct.id ? T.white : T.ash }}>{ct.label}</span>
              {ct.size && <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: T.muted }}>{ct.size}</span>}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Optional: focus topic (e.g., 'spring runoff season', 'beginner tips')"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box", background: T.steel, border: `1px solid ${T.wire}`,
              borderRadius: 8, padding: "12px 16px",
              fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, outline: "none",
            }}
          />
        </div>

        <GoldBtn full onClick={handleGenerate} disabled={generating}>
          {generating ? "Generating content + image cards..." : "Generate Content"}
        </GoldBtn>
      </SectionCard>

      {/* Results with branded cards */}
      {results && (
        <SectionCard>
          <SectionHeader>Your content is ready</SectionHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {results.map((opt, i) => {
              const photo = getPhotoForIndex(i);
              const isEmailType = selectedType === "email";

              return (
                <div key={i} style={{
                  background: T.lifted, borderRadius: 10, padding: 20,
                  border: `1px solid ${T.wire}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {opt.title || `Option ${i + 1}`}
                    </span>
                    <button
                      onClick={() => handleCopy(opt.content + (opt.hashtags?.length ? "\n\n" + opt.hashtags.map(h => `#${h}`).join(" ") : ""), i)}
                      style={{
                        background: copied === i ? T.greenGlow : T.steel,
                        border: `1px solid ${copied === i ? T.green : T.wire}`,
                        borderRadius: 4, padding: "4px 12px",
                        fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700,
                        color: copied === i ? T.green : T.ash, cursor: "pointer",
                      }}
                    >
                      {copied === i ? "Copied!" : "Copy Caption"}
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    {/* Branded image card */}
                    {!isEmailType && (
                      <BrandedCard
                        headline={opt.headline}
                        subline={opt.subline}
                        guideName={guideData?.name}
                        guideLocation={guideData?.location}
                        guideActivity={guideData?.activity}
                        photoUrl={photo}
                        platform={selectedType}
                      />
                    )}

                    {/* Caption */}
                    <div style={{ flex: 1, minWidth: 250 }}>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                        Caption
                      </div>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, lineHeight: 1.65, whiteSpace: "pre-wrap", marginBottom: 10 }}>
                        {opt.content}
                      </div>
                      {opt.hashtags?.length > 0 && (
                        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold, lineHeight: 1.6 }}>
                          {opt.hashtags.map(h => `#${h}`).join(" ")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
