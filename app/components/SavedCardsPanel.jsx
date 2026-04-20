"use client";
import { useState, useEffect } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getSupabase } from "@/app/lib/supabase-browser";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const BRAND_ICONS = {
  visa: "Visa", mastercard: "MC", amex: "Amex", discover: "Disc", diners: "Din", jcb: "JCB", unionpay: "UP",
};

function AddCardForm({ clientSecret, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!stripe || !elements) return;
    setSaving(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) { setError(submitError.message); setSaving(false); return; }

    const { error: confirmError } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message);
      setSaving(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div style={{ background: T.lifted, border: `1px solid ${T.wire}`, borderRadius: 8, padding: 20, marginTop: 16 }}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: T.parchment, marginBottom: 14 }}>Add New Card</div>
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#d44", marginTop: 10 }}>{error}</div>}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={handleSave} disabled={saving || !stripe}
          style={{ background: T.gold, color: T.ink, border: "none", borderRadius: 6, padding: "9px 18px", fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.5 : 1 }}>
          {saving ? "Saving…" : "Save Card"}
        </button>
        <button onClick={onCancel}
          style={{ background: "transparent", color: T.silver, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "9px 18px", fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function SavedCardsPanel() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [setupSecret, setSetupSecret] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { loadCards(); }, []);

  const getAuthHeader = async () => {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  };

  const loadCards = async () => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/payment-methods", { headers });
      const data = await res.json();
      setCards(data.methods || []);
    } catch (e) { console.error("Load cards error:", e); }
    setLoading(false);
  };

  const startAddCard = async () => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/payment-methods", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.clientSecret) {
        setSetupSecret(data.clientSecret);
        setAdding(true);
      }
    } catch (e) { console.error("Start add card error:", e); }
  };

  const onCardAdded = () => {
    setAdding(false);
    setSetupSecret(null);
    loadCards();
  };

  const setDefault = async (pmId) => {
    setActionLoading(pmId);
    try {
      const headers = await getAuthHeader();
      await fetch("/api/payment-methods/default", {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: pmId }),
      });
      await loadCards();
    } catch (e) { console.error("Set default error:", e); }
    setActionLoading(null);
  };

  const removeCard = async (pmId) => {
    setActionLoading(pmId);
    try {
      const headers = await getAuthHeader();
      await fetch("/api/payment-methods", {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: pmId }),
      });
      await loadCards();
    } catch (e) { console.error("Remove card error:", e); }
    setActionLoading(null);
  };

  if (loading) {
    return <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.muted, padding: 20 }}>Loading payment methods…</div>;
  }

  return (
    <div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Payment Methods</div>

      {cards.length === 0 && !adding && (
        <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.muted, marginBottom: 16 }}>
          No saved cards. Add one for faster checkout and automatic balance charges.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {cards.map(c => (
          <div key={c.id} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
            background: T.lifted, border: `1px solid ${c.isDefault ? T.gold : T.wire}`,
            borderRadius: 8,
          }}>
            <div style={{
              background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 4,
              padding: "4px 10px", fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700,
              color: T.parchment, minWidth: 44, textAlign: "center",
            }}>
              {BRAND_ICONS[c.brand] || c.brand}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.parchment }}>
                •••• {c.last4}
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted }}>
                Expires {c.exp_month}/{c.exp_year}
              </div>
            </div>
            {c.isDefault && (
              <span style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: T.gold, background: T.goldGlow, border: `1px solid ${T.gold}`, borderRadius: 3, padding: "2px 8px" }}>Default</span>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              {!c.isDefault && (
                <button onClick={() => setDefault(c.id)} disabled={actionLoading === c.id}
                  style={{ background: "none", border: `1px solid ${T.wire}`, borderRadius: 4, padding: "4px 10px", fontFamily: FONT_BODY, fontSize: 11, color: T.silver, cursor: "pointer" }}>
                  Set default
                </button>
              )}
              <button onClick={() => removeCard(c.id)} disabled={actionLoading === c.id}
                style={{ background: "none", border: `1px solid ${T.wire}`, borderRadius: 4, padding: "4px 10px", fontFamily: FONT_BODY, fontSize: 11, color: "#aa7a7a", cursor: "pointer" }}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {adding && setupSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret: setupSecret, appearance: { theme: "night", variables: { colorPrimary: "#c9973a", colorBackground: "#1f2428", colorText: "#e8e2d8" } } }}>
          <AddCardForm clientSecret={setupSecret} onSuccess={onCardAdded} onCancel={() => { setAdding(false); setSetupSecret(null); }} />
        </Elements>
      ) : (
        <button onClick={startAddCard}
          style={{ marginTop: 14, background: "transparent", border: `1.5px solid ${T.gold}`, borderRadius: 6, padding: "9px 18px", fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: T.gold, cursor: "pointer" }}>
          + Add New Card
        </button>
      )}
    </div>
  );
}
