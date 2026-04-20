"use client";
import { useState } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function AdditionalPaymentForm({ amount, onSuccess }) {
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
      <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.gold, fontWeight: 700, marginBottom: 12 }}>
        Additional charge: ${(amount / 100).toFixed(2)}
      </div>
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <div style={{ marginTop: 10, fontFamily: FONT_BODY, fontSize: 12, color: "#e74c3c" }}>{error}</div>}
      <button type="submit" disabled={!stripe || processing}
        style={{ width: "100%", marginTop: 14, padding: 13, background: T.gold, border: "none", borderRadius: 8, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: T.ink, cursor: "pointer", opacity: processing ? 0.5 : 1 }}>
        {processing ? "Processing…" : `Pay $${(amount / 100).toFixed(2)} & Confirm`}
      </button>
    </form>
  );
}

export default function ModifyBookingModal({ booking, onClose, onModified }) {
  const [newDate, setNewDate] = useState(booking.trip_date || "");
  const [newGuests, setNewGuests] = useState(booking.guests || 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [priceDiff, setPriceDiff] = useState(0);
  const [success, setSuccess] = useState(false);

  const dateChanged = newDate && newDate !== booking.trip_date;
  const guestsChanged = newGuests !== booking.guests;
  const hasChanges = dateChanged || guestsChanged;

  const getAuthHeader = async () => {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  };

  const handleSubmit = async () => {
    if (!hasChanges) return;
    setLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeader();
      const body = { bookingId: booking.id };
      if (dateChanged) body.newDate = newDate;
      if (guestsChanged) body.newGuests = newGuests;

      const res = await fetch("/api/bookings/modify", {
        method: "POST", headers, body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Modification failed");

      if (data.needsPayment && data.clientSecret) {
        setClientSecret(data.clientSecret);
        setPriceDiff(data.priceDifference);
      } else {
        setSuccess(true);
        if (data.refundAmount > 0) {
          setError(null);
        }
        setTimeout(() => { onModified?.(); onClose(); }, 1500);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handlePaymentSuccess = () => {
    setSuccess(true);
    setClientSecret(null);
    setTimeout(() => { onModified?.(); onClose(); }, 1500);
  };

  // Parse trip_date for display
  const formatDate = (ds) => ds ? new Date(ds + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 250, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)" }} />
      <div style={{ position: "relative", background: T.gunmetal, border: `1px solid ${T.wire}`, borderRadius: 12, padding: "32px 28px", width: "90%", maxWidth: 480, zIndex: 1, boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}>

        {success ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.green, marginBottom: 8 }}>Booking Modified</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver }}>Your changes have been saved. The guide has been notified.</div>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: T.white, marginBottom: 4 }}>Modify Booking</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, marginBottom: 24 }}>
              {booking.package || booking.package_title} · {booking.guide || booking.guide_name}
            </div>

            {/* Date */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Trip Date</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted, marginBottom: 6 }}>
                Current: {formatDate(booking.trip_date)}
              </div>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                min={new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0]}
                style={{
                  width: "100%", boxSizing: "border-box", background: T.steel, border: `1px solid ${dateChanged ? T.gold : T.wire}`,
                  borderRadius: 6, padding: "10px 14px", fontFamily: FONT_BODY, fontSize: 14,
                  color: T.parchment, outline: "none", colorScheme: "dark",
                }}
              />
            </div>

            {/* Guests */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Guests</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => setNewGuests(Math.max(1, newGuests - 1))}
                  style={{ width: 36, height: 36, borderRadius: 6, background: T.steel, border: `1px solid ${T.wire}`, color: T.parchment, fontSize: 18, cursor: "pointer" }}>-</button>
                <span style={{ fontFamily: FONT_BODY, fontSize: 18, fontWeight: 700, color: guestsChanged ? T.gold : T.parchment, minWidth: 30, textAlign: "center" }}>{newGuests}</span>
                <button onClick={() => setNewGuests(newGuests + 1)}
                  style={{ width: 36, height: 36, borderRadius: 6, background: T.steel, border: `1px solid ${T.wire}`, color: T.parchment, fontSize: 18, cursor: "pointer" }}>+</button>
                {guestsChanged && (
                  <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>was {booking.guests}</span>
                )}
              </div>
            </div>

            {/* Additional payment form if needed */}
            {clientSecret && (
              <div style={{ marginBottom: 20, background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: 16 }}>
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "night", variables: { colorPrimary: "#c9973a", colorBackground: "#1f2428", colorText: "#e8e2d8" } } }}>
                  <AdditionalPaymentForm amount={priceDiff} onSuccess={handlePaymentSuccess} />
                </Elements>
              </div>
            )}

            {error && (
              <div style={{ marginBottom: 16, padding: 10, background: T.redGlow, border: `1px solid ${T.red}`, borderRadius: 6, fontFamily: FONT_BODY, fontSize: 13, color: "#d88" }}>
                {error}
              </div>
            )}

            {!clientSecret && (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleSubmit} disabled={!hasChanges || loading}
                  style={{
                    flex: 1, padding: 13, background: hasChanges ? T.gold : T.rim,
                    border: "none", borderRadius: 8, fontFamily: FONT_BODY, fontSize: 14,
                    fontWeight: 700, color: hasChanges ? T.ink : T.muted,
                    cursor: hasChanges && !loading ? "pointer" : "not-allowed",
                  }}>
                  {loading ? "Saving…" : "Save Changes"}
                </button>
                <button onClick={onClose}
                  style={{ padding: "13px 20px", background: "transparent", border: `1px solid ${T.wire}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 14, color: T.silver, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
