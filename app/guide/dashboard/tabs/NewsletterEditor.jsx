"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { GoldBtn } from "@/app/components/ui";
import { getSupabase } from "@/app/lib/supabase-browser";
import {
  REFINE_ACTIONS,
  REFINE_LABELS,
  BLOCK_LABELS,
  createDefaultBlock,
  newBlockId,
} from "@/app/lib/newsletter-schema";
import { NewsletterRenderer } from "@/app/lib/newsletter-renderer";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const REFINE_ICONS = {
  regenerate: "↻",
  shorter: "−",
  longer: "+",
  more_exciting: "⚡",
  more_professional: "◆",
  more_personal: "❤",
  add_local_flavor: "📍",
};

async function authHeader() {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

function fieldStyle(extra = {}) {
  return {
    width: "100%",
    boxSizing: "border-box",
    background: T.steel,
    border: `1px solid ${T.wire}`,
    borderRadius: 6,
    padding: "8px 10px",
    fontFamily: FONT_BODY,
    fontSize: 13,
    color: T.parchment,
    outline: "none",
    lineHeight: 1.5,
    ...extra,
  };
}

function smallLabel(text) {
  return (
    <div style={{ fontFamily: FONT_BODY, fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
      {text}
    </div>
  );
}

// ─── BLOCK FIELD EDITORS ─────────────────────────────────────────────────────
function BlockFields({ block, onPatch }) {
  const patch = (k, v) => onPatch({ [k]: v });

  switch (block.type) {
    case "hero":
    case "story":
      return (
        <>
          {smallLabel("Headline")}
          <input value={block.headline} onChange={(e) => patch("headline", e.target.value)} style={fieldStyle({ marginBottom: 8 })} />
          {smallLabel("Body")}
          <textarea rows={4} value={block.body} onChange={(e) => patch("body", e.target.value)} style={fieldStyle({ resize: "vertical", lineHeight: 1.55 })} />
        </>
      );
    case "conditions":
    case "local_intel":
    case "upcoming":
      return (
        <>
          {smallLabel("Headline")}
          <input value={block.headline} onChange={(e) => patch("headline", e.target.value)} style={fieldStyle({ marginBottom: 8 })} />
          {smallLabel("Body")}
          <textarea rows={3} value={block.body} onChange={(e) => patch("body", e.target.value)} style={fieldStyle({ resize: "vertical", lineHeight: 1.55 })} />
        </>
      );
    case "featured_trip":
      return (
        <>
          {smallLabel("Headline")}
          <input value={block.headline} onChange={(e) => patch("headline", e.target.value)} style={fieldStyle({ marginBottom: 8 })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div>
              {smallLabel("Price")}
              <input value={block.price || ""} onChange={(e) => patch("price", e.target.value)} placeholder="$450" style={fieldStyle()} />
            </div>
            <div>
              {smallLabel("Duration")}
              <input value={block.duration || ""} onChange={(e) => patch("duration", e.target.value)} placeholder="Half day" style={fieldStyle()} />
            </div>
          </div>
          {smallLabel("Body")}
          <textarea rows={3} value={block.body} onChange={(e) => patch("body", e.target.value)} style={fieldStyle({ resize: "vertical", marginBottom: 8 })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
            <div>
              {smallLabel("Button text")}
              <input value={block.buttonText} onChange={(e) => patch("buttonText", e.target.value)} style={fieldStyle()} />
            </div>
            <div>
              {smallLabel("Button URL")}
              <input value={block.buttonUrl} onChange={(e) => patch("buttonUrl", e.target.value)} style={fieldStyle()} />
            </div>
          </div>
        </>
      );
    case "testimonial":
      return (
        <>
          {smallLabel("Quote")}
          <textarea rows={3} value={block.quote} onChange={(e) => patch("quote", e.target.value)} style={fieldStyle({ resize: "vertical", marginBottom: 8, fontStyle: "italic" })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              {smallLabel("Author")}
              <input value={block.author} onChange={(e) => patch("author", e.target.value)} style={fieldStyle()} />
            </div>
            <div>
              {smallLabel("Trip (optional)")}
              <input value={block.trip || ""} onChange={(e) => patch("trip", e.target.value)} style={fieldStyle()} />
            </div>
          </div>
        </>
      );
    case "gear_tip":
      return (
        <>
          {smallLabel("Headline")}
          <input value={block.headline} onChange={(e) => patch("headline", e.target.value)} style={fieldStyle({ marginBottom: 8 })} />
          {smallLabel("Body")}
          <textarea rows={3} value={block.body} onChange={(e) => patch("body", e.target.value)} style={fieldStyle({ resize: "vertical", marginBottom: 8 })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              {smallLabel("Product name (optional)")}
              <input value={block.productName || ""} onChange={(e) => patch("productName", e.target.value)} style={fieldStyle()} />
            </div>
            <div>
              {smallLabel("Product URL (optional)")}
              <input value={block.productUrl || ""} onChange={(e) => patch("productUrl", e.target.value)} style={fieldStyle()} />
            </div>
          </div>
        </>
      );
    case "image":
      return (
        <>
          {smallLabel("Image URL")}
          <input value={block.imageUrl} onChange={(e) => patch("imageUrl", e.target.value)} style={fieldStyle({ marginBottom: 8 })} />
          {smallLabel("Caption (optional)")}
          <input value={block.caption || ""} onChange={(e) => patch("caption", e.target.value)} style={fieldStyle()} />
        </>
      );
    case "text":
      return (
        <>
          {smallLabel("Body")}
          <textarea rows={4} value={block.body} onChange={(e) => patch("body", e.target.value)} style={fieldStyle({ resize: "vertical", lineHeight: 1.55 })} />
        </>
      );
    case "cta":
      return (
        <>
          {smallLabel("Headline")}
          <input value={block.headline} onChange={(e) => patch("headline", e.target.value)} style={fieldStyle({ marginBottom: 8 })} />
          {smallLabel("Body")}
          <textarea rows={2} value={block.body} onChange={(e) => patch("body", e.target.value)} style={fieldStyle({ resize: "vertical", marginBottom: 8 })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
            <div>
              {smallLabel("Button text")}
              <input value={block.buttonText} onChange={(e) => patch("buttonText", e.target.value)} style={fieldStyle()} />
            </div>
            <div>
              {smallLabel("Button URL")}
              <input value={block.buttonUrl} onChange={(e) => patch("buttonUrl", e.target.value)} style={fieldStyle()} />
            </div>
          </div>
        </>
      );
    default:
      return null;
  }
}

// ─── BLOCK CARD ──────────────────────────────────────────────────────────────
function BlockCard({ block, guideId, contentRef, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [refining, setRefining] = useState(null); // action name in flight
  const [open, setOpen] = useState(true);

  const refine = useCallback(async (action) => {
    setRefining(action);
    try {
      const headers = await authHeader();
      const res = await fetch("/api/ai/marketing/refine", {
        method: "POST",
        headers,
        body: JSON.stringify({ guideId, content: contentRef.current, blockId: block.id, action }),
      });
      const data = await res.json();
      if (data.error) {
        console.error(data.error);
      } else if (data.block) {
        onChange(data.block);
      }
    } catch (err) {
      console.error("Refine failed:", err);
    }
    setRefining(null);
  }, [guideId, block.id, contentRef, onChange]);

  const enabled = block.enabled !== false;

  return (
    <div style={{
      background: enabled ? T.steel : T.lifted,
      border: `1px solid ${enabled ? T.wire : T.rim}`,
      borderRadius: 8,
      padding: 14,
      opacity: enabled ? 1 : 0.55,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: open ? 12 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Collapse" : "Expand"}
            style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}
          >
            {open ? "▾" : "▸"}
          </button>
          <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {block.label || BLOCK_LABELS[block.type] || block.type}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={onMoveUp} disabled={isFirst} title="Move up"
            style={{ background: "none", border: `1px solid ${T.rim}`, borderRadius: 4, padding: "2px 7px", color: isFirst ? T.rim : T.silver, cursor: isFirst ? "not-allowed" : "pointer", fontSize: 11 }}>↑</button>
          <button onClick={onMoveDown} disabled={isLast} title="Move down"
            style={{ background: "none", border: `1px solid ${T.rim}`, borderRadius: 4, padding: "2px 7px", color: isLast ? T.rim : T.silver, cursor: isLast ? "not-allowed" : "pointer", fontSize: 11 }}>↓</button>
          <button onClick={() => onChange({ ...block, enabled: !enabled })} title={enabled ? "Hide from newsletter" : "Show in newsletter"}
            style={{ background: "none", border: `1px solid ${enabled ? T.green : T.rim}`, borderRadius: 4, padding: "2px 7px", color: enabled ? T.green : T.muted, cursor: "pointer", fontSize: 10, fontWeight: 700 }}>{enabled ? "ON" : "OFF"}</button>
          <button onClick={onRemove} title="Remove block"
            style={{ background: "none", border: `1px solid ${T.rim}`, borderRadius: 4, padding: "2px 7px", color: T.muted, cursor: "pointer", fontSize: 11 }}>×</button>
        </div>
      </div>

      {open && (
        <>
          <BlockFields block={block} onPatch={(patch) => onChange({ ...block, ...patch })} />

          {/* Per-block refine actions */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${T.rim}` }}>
            {smallLabel("AI refine")}
            <div style={{ width: "100%", display: "flex", flexWrap: "wrap", gap: 4 }}>
              {REFINE_ACTIONS.map((action) => {
                const isRefining = refining === action;
                return (
                  <button
                    key={action}
                    onClick={() => refine(action)}
                    disabled={!!refining}
                    style={{
                      background: isRefining ? T.gold : "transparent",
                      color: isRefining ? T.ink : T.silver,
                      border: `1px solid ${isRefining ? T.gold : T.wire}`,
                      borderRadius: 4,
                      padding: "4px 8px",
                      fontFamily: FONT_BODY,
                      fontSize: 11,
                      fontWeight: isRefining ? 700 : 500,
                      cursor: refining ? "default" : "pointer",
                      opacity: refining && !isRefining ? 0.4 : 1,
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                    title={REFINE_LABELS[action]}
                  >
                    <span style={{ fontSize: 12 }}>{REFINE_ICONS[action]}</span>
                    {isRefining ? "…" : REFINE_LABELS[action]}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── ADD BLOCK MENU ──────────────────────────────────────────────────────────
function AddBlockMenu({ guide, onAdd }) {
  const [open, setOpen] = useState(false);
  const types = ["hero", "conditions", "local_intel", "featured_trip", "testimonial", "gear_tip", "story", "upcoming", "image", "text", "cta"];
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen((v) => !v)} style={{
        width: "100%",
        background: T.lifted, border: `1px dashed ${T.wire}`, borderRadius: 8,
        padding: "10px 14px", fontFamily: FONT_BODY, fontSize: 12, color: T.silver,
        cursor: "pointer",
      }}>
        + Add block
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, zIndex: 20, background: T.gunmetal, border: `1px solid ${T.wire}`, borderRadius: 6, padding: 4, boxShadow: "0 6px 16px rgba(0,0,0,0.4)" }}>
          {types.map((t) => (
            <button key={t} onClick={() => { onAdd(createDefaultBlock(t, guide)); setOpen(false); }} style={{
              display: "block", width: "100%", textAlign: "left",
              background: "none", border: "none", padding: "7px 10px",
              fontFamily: FONT_BODY, fontSize: 12, color: T.parchment, cursor: "pointer",
              borderRadius: 4,
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = T.lifted}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              {BLOCK_LABELS[t]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SEND TO CLIENTS PANEL ───────────────────────────────────────────────────
function SendToClientsPanel({ contentRef, savedId, onSavedIdChange, save }) {
  const [counts, setCounts] = useState({ active: 0, total: 0 });
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const [showCsv, setShowCsv] = useState(false);
  const [sendState, setSendState] = useState("idle"); // idle | confirming | sending | done | error
  const [sendResult, setSendResult] = useState(null);

  const refreshCounts = useCallback(async () => {
    try {
      const headers = await authHeader();
      const res = await fetch("/api/guide/subscribers", { headers });
      const data = await res.json();
      if (data.counts) setCounts(data.counts);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { refreshCounts(); }, [refreshCounts]);

  const importCsv = useCallback(async () => {
    setImporting(true); setImportMsg(null);
    try {
      const headers = await authHeader();
      const res = await fetch("/api/guide/subscribers", {
        method: "POST", headers, body: JSON.stringify({ csv: csvText, source: "csv_import" }),
      });
      const data = await res.json();
      if (data.error) setImportMsg({ kind: "error", text: data.error });
      else {
        setImportMsg({ kind: "ok", text: `Added ${data.added}. Total active: ${data.activeCount}` });
        setCsvText("");
        setCounts((c) => ({ ...c, active: data.activeCount }));
      }
    } catch (err) {
      setImportMsg({ kind: "error", text: String(err?.message || err) });
    }
    setImporting(false);
  }, [csvText]);

  const sendCampaign = useCallback(async () => {
    setSendState("sending"); setSendResult(null);
    try {
      // Auto-save first to get an id and persist current state
      let id = savedId;
      if (!id) {
        const saved = await save({ publish: true });
        if (!saved?.id) { setSendState("error"); return; }
        id = saved.id;
        onSavedIdChange?.(id);
      } else {
        await save();
      }
      const headers = await authHeader();
      const res = await fetch("/api/content/newsletter/send-campaign", {
        method: "POST", headers,
        body: JSON.stringify({ newsletterId: id }),
      });
      const data = await res.json();
      if (data.error) { setSendState("error"); setSendResult({ error: data.error }); return; }
      setSendState("done");
      setSendResult({ sent: data.sent, failed: data.failed, total: data.total });
    } catch (err) {
      console.error(err);
      setSendState("error");
      setSendResult({ error: String(err?.message || err) });
    }
  }, [save, savedId, onSavedIdChange]);

  return (
    <div style={{ background: T.gunmetal, borderTop: `1px solid ${T.wire}`, padding: "14px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Send to Clients</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment }}>
            <strong style={{ color: T.gold }}>{counts.active}</strong> active subscriber{counts.active === 1 ? "" : "s"}
            {counts.total > counts.active && <span style={{ color: T.muted }}> · {counts.total - counts.active} unsubscribed</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => setShowCsv((v) => !v)} style={{
            background: "none", border: `1px solid ${T.wire}`, borderRadius: 5,
            padding: "7px 12px", fontFamily: FONT_BODY, fontSize: 12, color: T.ash, cursor: "pointer",
          }}>{showCsv ? "Hide Import" : "Import Contacts (CSV)"}</button>
          {sendState === "confirming" ? (
            <>
              <button onClick={sendCampaign} style={{
                background: "#aa3a3a", border: "none", borderRadius: 5,
                padding: "7px 14px", fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer",
              }}>Confirm — Send to {counts.active}</button>
              <button onClick={() => setSendState("idle")} style={{
                background: "none", border: `1px solid ${T.rim}`, borderRadius: 5,
                padding: "7px 12px", fontFamily: FONT_BODY, fontSize: 12, color: T.muted, cursor: "pointer",
              }}>Cancel</button>
            </>
          ) : (
            <button onClick={() => counts.active > 0 ? setSendState("confirming") : null}
              disabled={counts.active === 0 || sendState === "sending"}
              style={{
                background: counts.active === 0 ? T.lifted : T.gold,
                border: "none", borderRadius: 5,
                padding: "7px 14px", fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700,
                color: counts.active === 0 ? T.muted : T.ink,
                cursor: counts.active === 0 ? "not-allowed" : "pointer",
                opacity: sendState === "sending" ? 0.6 : 1,
              }}>
              {sendState === "sending" ? "Sending…"
                : sendState === "done" ? "Sent ✓"
                : counts.active === 0 ? "No subscribers yet"
                : `Send to ${counts.active} client${counts.active === 1 ? "" : "s"}`}
            </button>
          )}
        </div>
      </div>

      {sendResult && sendState === "done" && (
        <div style={{ marginTop: 10, padding: 10, background: T.greenGlow, border: `1px solid ${T.green}`, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 12, color: T.green }}>
          Delivered to {sendResult.sent} of {sendResult.total} recipients{sendResult.failed > 0 ? ` (${sendResult.failed} failed)` : ""}.
        </div>
      )}
      {sendResult?.error && (
        <div style={{ marginTop: 10, padding: 10, background: T.redGlow, border: `1px solid ${T.red}`, borderRadius: 4, fontFamily: FONT_BODY, fontSize: 12, color: "#aa7a7a" }}>
          {sendResult.error}
        </div>
      )}

      {showCsv && (
        <div style={{ marginTop: 12, padding: 12, background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.silver, marginBottom: 8 }}>
            Paste CSV. Format: <code style={{ background: T.lifted, padding: "1px 6px", borderRadius: 3, color: T.ash }}>email, name, tags</code> (tags separated by ; or |). Header row optional.
          </div>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={5}
            placeholder="jane@example.com, Jane Smith, vip;past_guest&#10;mike@example.com, Mike Chen"
            style={{
              width: "100%", boxSizing: "border-box",
              background: T.gunmetal, border: `1px solid ${T.wire}`,
              borderRadius: 5, padding: "8px 10px",
              fontFamily: "ui-monospace, monospace", fontSize: 12, color: T.parchment,
              outline: "none", resize: "vertical", lineHeight: 1.5,
            }}
          />
          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted }}>Only import people who consented to receive emails from you.</span>
            <button onClick={importCsv} disabled={importing || !csvText.trim()} style={{
              background: T.gold, border: "none", borderRadius: 5,
              padding: "6px 14px", fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.ink,
              cursor: !csvText.trim() ? "not-allowed" : "pointer", opacity: !csvText.trim() ? 0.5 : 1,
            }}>{importing ? "Importing…" : "Import"}</button>
          </div>
          {importMsg && (
            <div style={{ marginTop: 8, fontFamily: FONT_BODY, fontSize: 11, color: importMsg.kind === "error" ? "#aa7a7a" : T.green }}>
              {importMsg.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN EDITOR ─────────────────────────────────────────────────────────────
export default function NewsletterEditor({ initialContent, guideId, onClose }) {
  const [content, setContent] = useState(initialContent);
  const [savedId, setSavedId] = useState(null);
  const [publicSlug, setPublicSlug] = useState(null);
  const [savingState, setSavingState] = useState("idle"); // idle | saving | saved | error
  const [sendState, setSendState] = useState("idle");
  const [copied, setCopied] = useState(null);
  const [shareLink, setShareLink] = useState(null);

  // Keep a ref so the per-block AI refinement always sends the live state
  const contentRef = useMemo(() => ({ current: content }), []);
  useEffect(() => { contentRef.current = content; }, [content, contentRef]);

  const updateBlock = useCallback((blockId, next) => {
    setContent((c) => ({ ...c, sections: c.sections.map((b) => (b.id === blockId ? { ...next, id: blockId, type: b.type, label: b.label } : b)) }));
  }, []);

  const removeBlock = useCallback((blockId) => {
    setContent((c) => ({ ...c, sections: c.sections.filter((b) => b.id !== blockId) }));
  }, []);

  const addBlock = useCallback((block) => {
    setContent((c) => ({ ...c, sections: [...c.sections, { ...block, id: block.id || newBlockId(block.type) }] }));
  }, []);

  const moveBlock = useCallback((blockId, dir) => {
    setContent((c) => {
      const i = c.sections.findIndex((b) => b.id === blockId);
      if (i < 0) return c;
      const j = i + dir;
      if (j < 0 || j >= c.sections.length) return c;
      const next = [...c.sections];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...c, sections: next };
    });
  }, []);

  const updateMeta = useCallback((patch) => setContent((c) => ({ ...c, ...patch })), []);

  const save = useCallback(async (opts = {}) => {
    setSavingState("saving");
    try {
      const headers = await authHeader();
      const url = opts.publish ? "/api/content/newsletter?action=publish" : "/api/content/newsletter";
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ id: savedId, content }),
      });
      const data = await res.json();
      if (data.error) { setSavingState("error"); return null; }
      if (data.newsletter?.id) setSavedId(data.newsletter.id);
      if (data.newsletter?.public_slug) setPublicSlug(data.newsletter.public_slug);
      setSavingState("saved");
      setTimeout(() => setSavingState("idle"), 1500);
      return data.newsletter;
    } catch (err) {
      console.error(err);
      setSavingState("error");
      return null;
    }
  }, [content, savedId]);

  const sendTest = useCallback(async () => {
    setSendState("sending");
    try {
      const headers = await authHeader();
      const res = await fetch("/api/content/newsletter/send-test", {
        method: "POST", headers, body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.error) { console.error(data.error); setSendState("error"); setTimeout(() => setSendState("idle"), 2000); return; }
      setSendState("sent");
      setTimeout(() => setSendState("idle"), 2500);
    } catch (err) {
      console.error(err);
      setSendState("error");
      setTimeout(() => setSendState("idle"), 2000);
    }
  }, [content]);

  const copyHtml = useCallback(async () => {
    // Render fresh HTML server-side via the lib (call into a small endpoint or import dynamically)
    // To avoid a roundtrip, dynamically import the renderer
    const { renderNewsletterHtml } = await import("@/app/lib/newsletter-html");
    navigator.clipboard.writeText(renderNewsletterHtml(content));
    setCopied("html");
    setTimeout(() => setCopied(null), 2000);
  }, [content]);

  const getShareLink = useCallback(async () => {
    const result = await save({ publish: true });
    if (!result) return;
    const slugOrId = result.public_slug || result.id;
    if (!slugOrId) return;
    const link = `${window.location.origin}/newsletter/${slugOrId}`;
    setShareLink(link);
    navigator.clipboard.writeText(link);
    setCopied("link");
    setTimeout(() => setCopied(null), 2500);
  }, [save]);

  return (
    <div style={{ background: T.gunmetal, border: `1px solid ${T.wire}`, borderRadius: 12, overflow: "hidden" }}>
      {/* ── Header / actions ── */}
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.wire}`, background: T.steel, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: T.white }}>Newsletter Editor</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.silver, marginTop: 2 }}>
            {savingState === "saving" ? "Saving…"
              : savingState === "saved" ? "Saved ✓"
              : savingState === "error" ? "Save failed"
              : savedId ? "Auto-saves on action" : "Unsaved draft"}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button onClick={() => save()} disabled={savingState === "saving"}
            style={{ background: "none", border: `1px solid ${T.wire}`, borderRadius: 5, padding: "7px 12px", fontFamily: FONT_BODY, fontSize: 12, color: T.ash, cursor: "pointer" }}>
            {savingState === "saving" ? "Saving…" : "Save Draft"}
          </button>
          <button onClick={sendTest} disabled={sendState === "sending"}
            style={{ background: "none", border: `1px solid ${T.wire}`, borderRadius: 5, padding: "7px 12px", fontFamily: FONT_BODY, fontSize: 12, color: T.ash, cursor: "pointer" }}>
            {sendState === "sending" ? "Sending…" : sendState === "sent" ? "Sent ✓" : sendState === "error" ? "Failed" : "Send Test to Me"}
          </button>
          <button onClick={copyHtml}
            style={{ background: "none", border: `1px solid ${T.wire}`, borderRadius: 5, padding: "7px 12px", fontFamily: FONT_BODY, fontSize: 12, color: copied === "html" ? T.green : T.ash, cursor: "pointer" }}>
            {copied === "html" ? "HTML Copied ✓" : "Copy HTML"}
          </button>
          <button onClick={getShareLink}
            style={{ background: "none", border: `1px solid ${T.gold}`, borderRadius: 5, padding: "7px 12px", fontFamily: FONT_BODY, fontSize: 12, color: copied === "link" ? T.green : T.gold, cursor: "pointer" }}>
            {copied === "link" ? "Link Copied ✓" : "Get Shareable Link"}
          </button>
          {onClose && (
            <button onClick={onClose} title="Close editor"
              style={{ background: "none", border: `1px solid ${T.rim}`, borderRadius: 5, padding: "7px 10px", fontFamily: FONT_BODY, fontSize: 12, color: T.muted, cursor: "pointer" }}>×</button>
          )}
        </div>
      </div>

      {shareLink && (
        <div style={{ padding: "10px 18px", background: T.goldGlow, borderBottom: `1px solid ${T.gold}` }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Public Link</div>
          <a href={shareLink} target="_blank" rel="noopener noreferrer" style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.parchment, wordBreak: "break-all" }}>{shareLink}</a>
        </div>
      )}

      {/* ── Subject / preheader ── */}
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.wire}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: T.gunmetal }}>
        <div>
          {smallLabel("Subject")}
          <input value={content.subject} onChange={(e) => updateMeta({ subject: e.target.value })} maxLength={80} style={fieldStyle()} />
        </div>
        <div>
          {smallLabel("Preheader (inbox preview)")}
          <input value={content.preheader} onChange={(e) => updateMeta({ preheader: e.target.value })} maxLength={120} style={fieldStyle()} />
        </div>
      </div>

      {/* ── Two-pane: preview + blocks ── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 0 }}>
        {/* Preview pane */}
        <div style={{ borderRight: `1px solid ${T.wire}`, padding: 18, background: "#1a1c1e", overflow: "auto", maxHeight: "75vh" }}>
          {smallLabel("Live Preview")}
          <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
            <NewsletterRenderer content={content} mode="preview" maxWidth={520} />
          </div>
        </div>

        {/* Blocks pane */}
        <div style={{ padding: 18, overflow: "auto", maxHeight: "75vh", display: "flex", flexDirection: "column", gap: 8 }}>
          {smallLabel(`Blocks (${content.sections.length})`)}
          {content.sections.map((block, i) => (
            <BlockCard
              key={block.id}
              block={block}
              guideId={guideId}
              contentRef={contentRef}
              onChange={(next) => updateBlock(block.id, next)}
              onRemove={() => removeBlock(block.id)}
              onMoveUp={() => moveBlock(block.id, -1)}
              onMoveDown={() => moveBlock(block.id, 1)}
              isFirst={i === 0}
              isLast={i === content.sections.length - 1}
            />
          ))}
          <AddBlockMenu guide={content.guide} onAdd={addBlock} />
        </div>
      </div>

      {/* Send to Clients */}
      <SendToClientsPanel
        contentRef={contentRef}
        savedId={savedId}
        onSavedIdChange={setSavedId}
        save={save}
      />
    </div>
  );
}
