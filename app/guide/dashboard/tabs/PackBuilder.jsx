"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { renderSlideToBlob, renderPackToZip, downloadBlob, DIMENSIONS } from "@/app/lib/slide-renderer";

// Builds the brand info expected by slide-renderer from MarketingTab's guideData
function brandFor(guideData) {
  return {
    guideName: guideData?.name || "Guide",
    guideLocation: guideData?.location || "",
    guideActivity: guideData?.activity || "Adventure",
  };
}

function PhotoStrip({ photos, selected, onSelect, label = "Photo" }) {
  if (!photos || photos.length === 0) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        <button onClick={() => onSelect(null)} style={{
          width: 38, height: 38, borderRadius: 4, cursor: "pointer", flexShrink: 0,
          background: T.steel, border: `2px solid ${selected === null ? T.gold : T.wire}`, color: T.muted,
          fontFamily: FONT_BODY, fontSize: 9, fontWeight: 700,
        }}>None</button>
        {photos.slice(0, 8).map((url, i) => (
          <div key={i} onClick={() => onSelect(url)} style={{
            width: 38, height: 38, borderRadius: 4, overflow: "hidden", cursor: "pointer", flexShrink: 0,
            border: selected === url ? `2px solid ${T.gold}` : `1px solid ${T.wire}`,
            opacity: selected === url ? 1 : 0.65, transition: "all 0.15s",
            position: "relative",
          }}>
            <Image src={url} alt="" fill style={{ objectFit: "cover" }} sizes="80px" unoptimized />
          </div>
        ))}
      </div>
    </div>
  );
}

// Generic pack builder for carousels (square) or stories (portrait).
// Pass `entries` shaped as: [{ headline, body, role?, slideNumber?, visualDirection? }, ...]
export default function PackBuilder({
  format,                // "square" | "portrait"
  entries,               // array of slide/frame inputs
  guideData,
  caption,               // post caption (optional)
  hashtags,              // array of hashtag strings
  tip,                   // filming/posting tip (optional)
  filenamePrefix = "rom-pack",
  formatLabel = "Slide", // "Slide" or "Frame"
}) {
  const photos = useMemo(() => [
    ...(guideData?.photos || []),
    ...(guideData?.stockPhotos || []),
  ], [guideData]);

  // Per-entry photo selection. Default: spread photos across entries.
  const [selectedPhotos, setSelectedPhotos] = useState(() => {
    const out = {};
    entries.forEach((_, i) => { out[i] = photos[i % Math.max(photos.length, 1)] || null; });
    return out;
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [downloadState, setDownloadState] = useState("idle"); // idle | rendering | done | error

  const dims = DIMENSIONS[format];
  const aspect = dims.w / dims.h;

  // Render the active entry's preview whenever it changes
  useEffect(() => {
    let cancelled = false;
    let url = null;
    const render = async () => {
      try {
        const entry = entries[activeIndex];
        const blob = await renderSlideToBlob({
          ...entry,
          slideNumber: entry.slideNumber || activeIndex + 1,
          totalSlides: entries.length,
          photoUrl: selectedPhotos[activeIndex] || undefined,
        }, { format, brand: brandFor(guideData) });
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } catch (err) {
        console.error("Slide preview error:", err);
      }
    };
    render();
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [activeIndex, entries, selectedPhotos, format, guideData]);

  const downloadOne = useCallback(async () => {
    setBusy(true);
    try {
      const entry = entries[activeIndex];
      const blob = await renderSlideToBlob({
        ...entry,
        slideNumber: entry.slideNumber || activeIndex + 1,
        totalSlides: entries.length,
        photoUrl: selectedPhotos[activeIndex] || undefined,
      }, { format, brand: brandFor(guideData) });
      const num = String(activeIndex + 1).padStart(2, "0");
      downloadBlob(blob, `${filenamePrefix}-${formatLabel.toLowerCase()}-${num}.png`);
    } catch (err) {
      console.error(err);
    }
    setBusy(false);
  }, [activeIndex, entries, selectedPhotos, format, guideData, filenamePrefix, formatLabel]);

  const downloadPack = useCallback(async () => {
    setDownloadState("rendering");
    try {
      const slides = entries.map((entry, i) => ({
        ...entry,
        slideNumber: entry.slideNumber || i + 1,
        photoUrl: selectedPhotos[i] || undefined,
      }));
      const zip = await renderPackToZip(
        slides,
        { format, brand: brandFor(guideData) },
        { caption, hashtags, tip, filenamePrefix },
      );
      downloadBlob(zip, `${filenamePrefix}.zip`);
      setDownloadState("done");
      setTimeout(() => setDownloadState("idle"), 2500);
    } catch (err) {
      console.error("Pack download failed:", err);
      setDownloadState("error");
      setTimeout(() => setDownloadState("idle"), 2500);
    }
  }, [entries, selectedPhotos, format, guideData, caption, hashtags, tip, filenamePrefix]);

  const previewW = format === "portrait" ? 220 : 320;
  const previewH = previewW / aspect;

  return (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
      {/* Left: live preview */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ width: previewW, height: previewH, background: T.lifted, border: `1px solid ${T.wire}`, borderRadius: 6, overflow: "hidden", position: "relative", flexShrink: 0 }}>
          {previewUrl
            ? <img src={previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: T.muted, fontFamily: FONT_BODY, fontSize: 12 }}>Rendering…</div>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={downloadOne} disabled={busy} style={{
            background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 5,
            padding: "6px 12px", fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700,
            color: T.ash, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1,
          }}>
            {busy ? "…" : `Download ${formatLabel}`}
          </button>
          <button onClick={downloadPack} disabled={downloadState === "rendering"} style={{
            background: downloadState === "done" ? T.greenGlow : T.gold,
            border: "none", borderRadius: 5,
            padding: "6px 14px", fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700,
            color: downloadState === "done" ? T.green : T.ink,
            cursor: downloadState === "rendering" ? "default" : "pointer",
            opacity: downloadState === "rendering" ? 0.7 : 1,
          }}>
            {downloadState === "rendering" ? "Rendering pack…"
              : downloadState === "done" ? "Pack Downloaded ✓"
              : downloadState === "error" ? "Failed — retry?"
              : `Download Pack (${entries.length} ${formatLabel.toLowerCase()}s + caption.txt)`}
          </button>
        </div>
      </div>

      {/* Right: entry list with thumbnails + photo picker per entry */}
      <div style={{ flex: "1 1 280px", minWidth: 260, maxHeight: 480, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {entries.map((entry, i) => {
          const active = i === activeIndex;
          return (
            <div key={i} onClick={() => setActiveIndex(i)} style={{
              background: active ? T.steel : T.lifted,
              border: `1px solid ${active ? T.gold : T.wire}`,
              borderRadius: 6,
              padding: 10,
              cursor: "pointer",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: active ? T.gold : T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {formatLabel} {i + 1}{entry.role ? ` · ${entry.role}` : ""}
                </span>
                {active && <span style={{ fontFamily: FONT_BODY, fontSize: 9, color: T.gold }}>EDITING</span>}
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, color: T.white, marginBottom: 4, lineHeight: 1.25 }}>{entry.headline}</div>
              {entry.body && (
                <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.ash, lineHeight: 1.5, maxHeight: 56, overflow: "hidden" }}>{entry.body}</div>
              )}
              {entry.visualDirection && (
                <div style={{ fontFamily: FONT_BODY, fontSize: 9, color: T.muted, fontStyle: "italic", marginTop: 4 }}>{entry.visualDirection}</div>
              )}
              {active && (
                <PhotoStrip
                  photos={photos}
                  selected={selectedPhotos[i] || null}
                  onSelect={(url) => setSelectedPhotos((p) => ({ ...p, [i]: url }))}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
