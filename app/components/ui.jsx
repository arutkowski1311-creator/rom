"use client";
import { useState, useEffect } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";

// ─── MOBILE HOOK ─────────────────────────────────────────────────────────────
export function useIsMobile(breakpoint = 768) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const c = () => setM(typeof window !== "undefined" && window.innerWidth < breakpoint);
    c();
    window.addEventListener("resize", c);
    return () => window.removeEventListener("resize", c);
  }, [breakpoint]);
  return m;
}

// ─── STARS ───────────────────────────────────────────────────────────────────
export function Stars({ rating, size = 12 }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ fontSize: size, color: i <= Math.round(rating) ? T.gold : T.rim }}>
          ★
        </span>
      ))}
    </span>
  );
}

// ─── STATUS PILL ─────────────────────────────────────────────────────────────
export function StatusPill({ status }) {
  const cfg = {
    pending:   { bg: T.goldGlow,  border: T.gold,  color: T.gold,    label: "Pending" },
    confirmed: { bg: T.blueGlow,  border: T.blue,  color: "#6a9ada", label: "Confirmed" },
    completed: { bg: T.greenGlow, border: T.green, color: "#6aaa84", label: "Completed" },
    cancelled: { bg: T.redGlow,   border: T.red,   color: "#aa7a7a", label: "Cancelled" },
    active:    { bg: T.greenGlow, border: T.green, color: "#6aaa84", label: "Active" },
    past_due:  { bg: T.redGlow,   border: T.red,   color: "#aa7a7a", label: "Past Due" },
  }[status] || { bg: T.goldGlow, border: T.gold, color: T.gold, label: status };

  return (
    <span style={{
      fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700,
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 4, padding: "3px 10px",
      letterSpacing: "0.06em", textTransform: "uppercase",
    }}>
      {cfg.label}
    </span>
  );
}

// ─── GOLD BUTTON ─────────────────────────────────────────────────────────────
export function GoldBtn({ children, onClick, outline, small, disabled, full, type = "button" }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: full ? "100%" : "auto",
        background: outline ? "transparent" : hov && !disabled ? T.goldLt : T.gold,
        color: outline ? (hov ? T.goldLt : T.gold) : T.ink,
        border: `1.5px solid ${hov && !disabled ? T.goldLt : T.gold}`,
        borderRadius: 6,
        padding: small ? "7px 14px" : "11px 22px",
        fontFamily: FONT_BODY, fontSize: small ? 12 : 13, fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

// ─── INPUT ───────────────────────────────────────────────────────────────────
export function Input({ label, value, onChange, placeholder, type = "text", multiline = false, required = false }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{
        fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600,
        color: T.ash, display: "block", marginBottom: 8,
      }}>
        {label}{required && <span style={{ color: T.gold }}> *</span>}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          style={{
            width: "100%", background: T.steel,
            border: `1px solid ${T.wire}`, borderRadius: 8,
            padding: "12px 16px", fontFamily: FONT_BODY, fontSize: 15,
            color: T.parchment, outline: "none", resize: "vertical", lineHeight: 1.6,
          }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%", background: T.steel,
            border: `1px solid ${T.wire}`, borderRadius: 8,
            padding: "12px 16px", fontFamily: FONT_BODY, fontSize: 15,
            color: T.parchment, outline: "none",
          }}
        />
      )}
    </div>
  );
}

// ─── SECTION CARD ────────────────────────────────────────────────────────────
export function SectionCard({ children, style = {} }) {
  return (
    <div style={{
      background: T.steel, border: `1px solid ${T.wire}`,
      borderRadius: 10, padding: 24,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── SECTION HEADER (small caps label) ───────────────────────────────────────
export function SectionHeader({ children }) {
  return (
    <div style={{
      fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700,
      color: T.silver, textTransform: "uppercase",
      letterSpacing: "0.08em", marginBottom: 16,
    }}>
      {children}
    </div>
  );
}

// ─── TIER BADGE ──────────────────────────────────────────────────────────────
export function TierBadge({ tier }) {
  const colors = {
    spark:    { bg: T.lifted, border: T.wire, color: T.silver },
    discover: { bg: T.goldGlow, border: T.gold, color: T.gold },
    immerse:  { bg: "#2a1a4a28", border: "#6a4aaa", color: "#a08ada" },
  }[tier] || { bg: T.lifted, border: T.wire, color: T.silver };

  const label = (tier || "spark").charAt(0).toUpperCase() + (tier || "spark").slice(1);

  return (
    <span style={{
      fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700,
      color: colors.color, background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: 4, padding: "2px 8px",
      letterSpacing: "0.08em", textTransform: "uppercase",
    }}>
      {label}
    </span>
  );
}

// ─── LOADING SKELETON ────────────────────────────────────────────────────────
export function Skeleton({ width = "100%", height = 16, radius = 4 }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: `linear-gradient(90deg, ${T.lifted} 25%, ${T.rim} 50%, ${T.lifted} 75%)`,
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
    }} />
  );
}

// ─── FEATURE GATE OVERLAY ────────────────────────────────────────────────────
export function FeatureGate({ tier, feature, children }) {
  const { canAccessFeature } = require("@/app/lib/theme");
  const hasAccess = canAccessFeature(tier, feature);

  if (hasAccess) return children;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ filter: "blur(3px)", opacity: 0.3, pointerEvents: "none" }}>
        {children}
      </div>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 12,
      }}>
        <div style={{
          fontFamily: FONT_DISPLAY, fontSize: 22, color: T.white,
        }}>
          Upgrade to unlock
        </div>
        <div style={{
          fontFamily: FONT_BODY, fontSize: 13, color: T.silver,
          textAlign: "center", maxWidth: 300,
        }}>
          {feature} requires a Discover or Immerse plan.
        </div>
        <GoldBtn small onClick={() => window.location.href = "/guide/billing"}>
          View Plans
        </GoldBtn>
      </div>
    </div>
  );
}
