"use client";
import { useState } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { GoldBtn, SectionCard, SectionHeader } from "@/app/components/ui";

const CONTENT_TYPES = [
  { id: "instagram", label: "Instagram", icon: "IG" },
  { id: "facebook", label: "Facebook", icon: "FB" },
  { id: "email", label: "Email Newsletter", icon: "EM" },
  { id: "review_spotlight", label: "Review Spotlight", icon: "RS" },
];

const PLATFORM_ICONS = { instagram: "IG", facebook: "FB", email: "✉", tiktok: "TT" };

export default function MarketingTab({ guide, contentQueue: initialQueue = [] }) {
  const [selectedType, setSelectedType] = useState("instagram");
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState(null);
  const [copied, setCopied] = useState(null);
  const [history, setHistory] = useState([]);
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
        setHistory([{ type: selectedType, options: data.options, date: new Date().toISOString() }, ...history]);
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

      {/* Content Type Selector */}
      <SectionCard>
        <SectionHeader>Generate Content</SectionHeader>
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
              width: "100%", background: T.steel, border: `1px solid ${T.wire}`,
              borderRadius: 8, padding: "12px 16px",
              fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, outline: "none",
            }}
          />
        </div>

        <GoldBtn full onClick={handleGenerate} disabled={generating}>
          {generating ? "Generating..." : "Generate Content"}
        </GoldBtn>
      </SectionCard>

      {/* Results */}
      {results && (
        <SectionCard>
          <SectionHeader>Results — pick your favorite</SectionHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {results.map((opt, i) => (
              <div key={i} style={{
                background: T.lifted, borderRadius: 8, padding: 16,
                border: `1px solid ${T.wire}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
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
                      color: copied === i ? T.green : T.ash,
                      cursor: "pointer",
                    }}
                  >
                    {copied === i ? "Copied" : "Copy"}
                  </button>
                </div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {opt.content}
                </div>
                {opt.hashtags?.length > 0 && (
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold, marginTop: 8 }}>
                    {opt.hashtags.map(h => `#${h}`).join(" ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* History */}
      {history.length > 1 && (
        <SectionCard>
          <SectionHeader>Recent Generations</SectionHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {history.slice(1, 6).map((h, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px", borderRadius: 6, background: T.lifted,
              }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash }}>
                  {CONTENT_TYPES.find(ct => ct.id === h.type)?.label || h.type}
                </span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted }}>
                  {new Date(h.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
