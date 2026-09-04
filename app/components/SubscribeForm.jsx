"use client";
// Public newsletter opt-in form. Lives at the foot of a published newsletter
// and on a guide's profile — the only path by which a guide's list grows on
// its own.
import { useState } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";

// Two palettes: the dark site chrome, and the light "paper" of a published
// newsletter page, which sits on its own cream background.
const PALETTES = {
  dark:  { surface: T.steel, border: T.wire, field: T.void,   title: T.parchment, body: T.silver, faint: T.muted,     accent: T.gold, accentText: T.ink, error: T.red },
  paper: { surface: "#ffffff", border: "#d8d3c9", field: "#faf9f6", title: "#1a1a1a", body: "#4a4a4a", faint: "#8a8a8a", accent: "#8a6b2f", accentText: "#ffffff", error: "#a03030" },
};

export default function SubscribeForm({ guideId, guideName, heading, blurb, compact = false, variant = "dark" }) {
  const P = PALETTES[variant] || PALETTES.dark;
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | done | error
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e?.preventDefault();
    if (!email.trim()) return;
    setState("sending"); setError(null);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideId, email, name }),
      });
      const data = await res.json();
      if (data.error) { setState("error"); setError(data.error); return; }
      setState("done");
    } catch (err) {
      setState("error");
      setError(String(err?.message || err));
    }
  };

  const firstName = (guideName || "").split(" ")[0];

  if (state === "done") {
    return (
      <div style={{
        background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10,
        padding: compact ? "20px 22px" : "32px 28px", textAlign: "center",
      }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: compact ? 20 : 26, color: P.accent, marginBottom: 8 }}>
          You&rsquo;re on the list
        </div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: P.body }}>
          {firstName ? `${firstName} will be in touch.` : "Look out for the next one."} Every email has a one-click unsubscribe.
        </div>
      </div>
    );
  }

  const inputStyle = {
    background: P.field, border: `1px solid ${P.border}`, borderRadius: 6,
    padding: "11px 13px", fontFamily: FONT_BODY, fontSize: 14, color: P.title,
    outline: "none", width: "100%",
  };

  return (
    <form onSubmit={submit} style={{
      background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10,
      padding: compact ? "20px 22px" : "32px 28px",
    }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: compact ? 20 : 28, color: P.title, marginBottom: 8, lineHeight: 1.2 }}>
        {heading || (firstName ? `Field notes from ${firstName}` : "Get the newsletter")}
      </div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: P.body, marginBottom: 18, lineHeight: 1.6 }}>
        {blurb || "Stories from the water, conditions worth knowing about, and the occasional open date. No noise."}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          style={{ ...inputStyle, flex: "1 1 160px" }}
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ ...inputStyle, flex: "2 1 220px" }}
        />
      </div>

      {error && (
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: P.error, marginBottom: 10 }}>{error}</div>
      )}

      <button
        type="submit"
        disabled={state === "sending" || !email.trim()}
        style={{
          background: P.accent, color: P.accentText, border: "none", borderRadius: 6,
          padding: "11px 22px", fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700,
          cursor: state === "sending" ? "default" : "pointer",
          opacity: state === "sending" || !email.trim() ? 0.6 : 1,
        }}>
        {state === "sending" ? "Subscribing…" : "Subscribe"}
      </button>

      <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: P.faint, marginTop: 12 }}>
        One-click unsubscribe in every email. Your address is never shared.
      </div>
    </form>
  );
}
