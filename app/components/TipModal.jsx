"use client";
import { useState } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const TIP_PRESETS = [
  { label: "$10", amount: 1000 },
  { label: "$20", amount: 2000 },
  { label: "$50", amount: 5000 },
  { label: "$100", amount: 10000 },
];

function TipPaymentForm({ amount, guideName, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) { setError(submitError.message); setProcessing(false); return; }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements, redirect: "if_required",
    });

    if (confirmError) { setError(confirmError.message); setProcessing(false); }
    else if (paymentIntent?.status === "succeeded") onSuccess();
    else { setError("Processing…"); setProcessing(false); }
  };

  return (
    <form onSubmit={handlePay}>
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <div style={{ marginTop: 10, fontFamily: FONT_BODY, fontSize: 12, color: "#e74c3c" }}>{error}</div>}
      <button type="submit" disabled={!stripe || processing}
        style={{ width: "100%", marginTop: 16, padding: 14, background: T.gold, border: "none", borderRadius: 8, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: T.ink, cursor: "pointer", opacity: processing ? 0.5 : 1 }}>
        {processing ? "Sending…" : `Send $${(amount / 100).toFixed(0)} Tip to ${guideName}`}
      </button>
    </form>
  );
}

export default function TipModal({ booking, onClose, onTipped }) {
  const [selectedAmount, setSelectedAmount] = useState(2000); // $20 default
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const tipAmount = useCustom ? Math.round(parseFloat(customAmount || "0") * 100) : selectedAmount;
  const guideName = booking.guide || booking.guide_name || "your guide";

  const getAuthHeader = async () => {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  };

  const handleContinue = async () => {
    if (tipAmount < 100) { setError("Minimum tip is $1"); return; }
    setLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/bookings/tip", {
        method: "POST",
        headers,
        body: JSON.stringify({ bookingId: booking.id, amount: tipAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setClientSecret(data.clientSecret);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleSuccess = () => {
    setSuccess(true);
    setTimeout(() => { onTipped?.(); onClose(); }, 2000);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 250, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)" }} />
      <div style={{ position: "relative", background: T.gunmetal, border: `1px solid ${T.wire}`, borderRadius: 12, padding: "32px 28px", width: "90%", maxWidth: 440, zIndex: 1, boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}>

        {success ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: T.gold, marginBottom: 8 }}>Tip Sent!</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.ash }}>
              ${(tipAmount / 100).toFixed(0)} has been sent to {guideName}. 100% goes directly to them.
            </div>
          </div>
        ) : clientSecret ? (
          <>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.white, marginBottom: 4 }}>Send ${(tipAmount / 100).toFixed(0)} Tip</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, marginBottom: 20 }}>100% goes directly to {guideName}</div>
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "night", variables: { colorPrimary: "#c9973a", colorBackground: "#1f2428", colorText: "#e8e2d8" } } }}>
              <TipPaymentForm amount={tipAmount} guideName={guideName} onSuccess={handleSuccess} />
            </Elements>
            <button onClick={() => { setClientSecret(null); }}
              style={{ width: "100%", marginTop: 10, padding: 10, background: "transparent", border: "none", fontFamily: FONT_BODY, fontSize: 13, color: T.muted, cursor: "pointer" }}>
              ← Change amount
            </button>
          </>
        ) : (
          <>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: T.white, marginBottom: 4 }}>Leave a Tip</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, marginBottom: 6 }}>
              for {guideName}
            </div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted, marginBottom: 20 }}>
              {booking.package || booking.package_title} · 100% goes directly to your guide
            </div>

            {/* Preset amounts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {TIP_PRESETS.map(p => (
                <button key={p.amount}
                  onClick={() => { setSelectedAmount(p.amount); setUseCustom(false); }}
                  style={{
                    padding: "14px 0", borderRadius: 8,
                    background: !useCustom && selectedAmount === p.amount ? T.goldGlow : T.steel,
                    border: `1.5px solid ${!useCustom && selectedAmount === p.amount ? T.gold : T.wire}`,
                    fontFamily: FONT_DISPLAY, fontSize: 22, color: !useCustom && selectedAmount === p.amount ? T.gold : T.parchment,
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <label onClick={() => setUseCustom(true)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <div style={{
                  width: 16, height: 16, borderRadius: "50%",
                  border: `2px solid ${useCustom ? T.gold : T.wire}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {useCustom && <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.gold }} />}
                </div>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash }}>Custom</span>
              </label>
              <div style={{ position: "relative", flex: 1 }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontFamily: FONT_BODY, fontSize: 15, color: T.muted }}>$</span>
                <input
                  type="number" min="1" step="1" value={customAmount}
                  onFocus={() => setUseCustom(true)}
                  onChange={e => { setCustomAmount(e.target.value); setUseCustom(true); }}
                  placeholder="0"
                  style={{
                    width: "100%", boxSizing: "border-box", background: T.steel,
                    border: `1px solid ${useCustom ? T.gold : T.wire}`, borderRadius: 6,
                    padding: "10px 14px 10px 28px", fontFamily: FONT_BODY, fontSize: 15,
                    color: T.parchment, outline: "none",
                  }}
                />
              </div>
            </div>

            {error && (
              <div style={{ marginBottom: 14, fontFamily: FONT_BODY, fontSize: 12, color: "#e74c3c" }}>{error}</div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleContinue} disabled={tipAmount < 100 || loading}
                style={{
                  flex: 1, padding: 14, background: tipAmount >= 100 ? T.gold : T.rim,
                  border: "none", borderRadius: 8, fontFamily: FONT_BODY, fontSize: 15,
                  fontWeight: 700, color: tipAmount >= 100 ? T.ink : T.muted,
                  cursor: tipAmount >= 100 && !loading ? "pointer" : "not-allowed",
                }}>
                {loading ? "Setting up…" : `Send $${(tipAmount / 100).toFixed(0)} Tip`}
              </button>
              <button onClick={onClose}
                style={{ padding: "14px 20px", background: "transparent", border: `1px solid ${T.wire}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 14, color: T.silver, cursor: "pointer" }}>
                Skip
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
