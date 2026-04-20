"use client";
import { useState, useEffect } from "react";
import { T, FONT_BODY } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";

const BRAND_ICONS = {
  visa: "Visa", mastercard: "MC", amex: "Amex", discover: "Disc",
};

export default function PaymentMethodSelector({ onSelect, selectedId }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCards(); }, []);

  const loadCards = async () => {
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
      const res = await fetch("/api/payment-methods", { headers });
      const data = await res.json();
      const methods = data.methods || [];
      setCards(methods);
      // Auto-select default card
      const defaultCard = methods.find(c => c.isDefault);
      if (defaultCard && !selectedId) {
        onSelect(defaultCard.id);
      }
    } catch (e) { console.error("Load cards error:", e); }
    setLoading(false);
  };

  if (loading) return null;
  if (cards.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
        Saved Cards
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {cards.map(c => (
          <label key={c.id} onClick={() => onSelect(c.id)}
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
              background: selectedId === c.id ? T.goldGlow : T.lifted,
              border: `1px solid ${selectedId === c.id ? T.gold : T.wire}`,
              borderRadius: 6, cursor: "pointer", transition: "all 0.15s",
            }}>
            <div style={{
              width: 16, height: 16, borderRadius: "50%",
              border: `2px solid ${selectedId === c.id ? T.gold : T.wire}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {selectedId === c.id && <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.gold }} />}
            </div>
            <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.parchment, background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 3, padding: "2px 8px" }}>
              {BRAND_ICONS[c.brand] || c.brand}
            </span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment }}>•••• {c.last4}</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted }}>{c.exp_month}/{c.exp_year}</span>
            {c.isDefault && <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: T.gold, marginLeft: "auto" }}>Default</span>}
          </label>
        ))}
        <label onClick={() => onSelect(null)}
          style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
            background: selectedId === null ? T.goldGlow : T.lifted,
            border: `1px solid ${selectedId === null ? T.gold : T.wire}`,
            borderRadius: 6, cursor: "pointer", transition: "all 0.15s",
          }}>
          <div style={{
            width: 16, height: 16, borderRadius: "50%",
            border: `2px solid ${selectedId === null ? T.gold : T.wire}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {selectedId === null && <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.gold }} />}
          </div>
          <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment }}>Use a new card</span>
        </label>
      </div>
    </div>
  );
}
