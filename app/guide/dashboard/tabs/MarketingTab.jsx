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

export default function MarketingTab({ guide }) {
  const [selectedType, setSelectedType] = useState("instagram");
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState(null);
  const [copied, setCopied] = useState(null);
  const [history, setHistory] = useState([]);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
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
