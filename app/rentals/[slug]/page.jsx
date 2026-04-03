"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";
import { GoldBtn } from "@/app/components/ui";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
const PLATFORM_FEE_RATE = 0.06;

// ─── Stripe form ──────────────────────────────────────────────────────────────
function RentalPaymentForm({ total, onSuccess, onError }) {
  const stripe    = useStripe();
  const elements  = useElements();
  const [processing, setProcessing] = useState(false);
  const [err, setErr] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true); setErr(null);
    const { error: submitErr } = await elements.submit();
    if (submitErr) { setErr(submitErr.message); setProcessing(false); return; }
    const { error: confirmErr, paymentIntent } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (confirmErr) { setErr(confirmErr.message); setProcessing(false); if (onError) onError(confirmErr.message); }
    else if (paymentIntent?.status === "succeeded") onSuccess(paymentIntent);
    else { setErr("Payment processing — confirmation coming shortly."); setProcessing(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement options={{ layout: "tabs" }} />
      {err && <div style={{ marginTop: 12, padding: 10, background: "rgba(138,58,58,0.15)", border: `1px solid ${T.red}`, borderRadius: 6, fontFamily: FONT_BODY, fontSize: 13, color: "#e07070" }}>{err}</div>}
      <button type="submit" disabled={!stripe || processing}
        style={{ width: "100%", marginTop: 16, padding: 15, background: T.gold, border: "none", borderRadius: 8, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: T.ink, cursor: "pointer", opacity: processing ? 0.6 : 1 }}>
        {processing ? "Processing…" : `Pay $${(total / 100).toLocaleString()}`}
      </button>
    </form>
  );
}

// ─── Booking panel ────────────────────────────────────────────────────────────
function BookingPanel({ rental, blockedDates, onClose }) {
  const [step, setStep]               = useState(1);
  const [rentalDate, setRentalDate]   = useState("");
  const [duration, setDuration]       = useState("full_day");
  const [destination, setDestination] = useState(rental.destinations?.[0] || "");
  const [driver, setDriver]           = useState(false);
  const [passengers, setPassengers]   = useState(2);
  const [requests, setRequests]       = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [clientSecret, setClientSecret]   = useState(null);
  const [confirmCode, setConfirmCode]     = useState("");
  const [bookingId, setBookingId]         = useState(null);
  const [confirmed, setConfirmed]         = useState(false);
  const [authError, setAuthError]         = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [payError, setPayError]           = useState(null);

  const basePrice   = duration === "half_day" ? (rental.half_day_price || 0) : (rental.full_day_price || 0);
  const driverFee   = driver ? (rental.driver_addon_price || 0) : 0;
  const platformFee = Math.round((basePrice + driverFee) * (rental.platform_fee_rate || PLATFORM_FEE_RATE));
  const total       = basePrice + driverFee + platformFee;

  const isBlocked = (ds) => blockedDates.includes(ds);
  const isPast    = (ds) => new Date(ds + "T12:00:00") < new Date();
  const fmtMoney  = (n) => `$${Number(n).toLocaleString()}`;
  const fmtDate   = (ds) => ds ? new Date(ds + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "—";

  const handlePreparePayment = async () => {
    setSubmitting(true); setPayError(null);
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAuthError(true); setSubmitting(false); return; }
      const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single();

      const res = await fetch("/api/rentals/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rentalId:        rental.id,
          rentalDate,
          duration,
          destination,
          driverRequested: driver,
          passengers,
          basePrice:       Math.round(basePrice * 100),
          driverFee:       Math.round(driverFee * 100),
          platformFee:     Math.round(platformFee * 100),
          total:           Math.round(total * 100),
          guestEmail:      profile?.email || user.email,
          specialRequests: requests,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setPayError(data.error || "Failed to initialize payment."); setSubmitting(false); return; }

      await getSupabase().from("rental_bookings").update({ guest_id: user.id }).eq("id", data.bookingId);

      setClientSecret(data.clientSecret);
      setBookingId(data.bookingId);
      setConfirmCode(data.confirmCode);
      setStep(3);
    } catch (e) {
      setPayError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  const handlePaymentSuccess = async () => {
    const supabase = getSupabase();
    await supabase.from("rental_blocks").insert({ rental_id: rental.id, block_date: rentalDate, source: "booking" });
    setConfirmed(true);
  };

  // Auth wall
  if (authError) return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,0.75)" }} />
      <div style={{ width: "100%", maxWidth: 480, background: T.carbon, height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 40, borderLeft: `2px solid ${T.wire}` }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: T.white }}>Sign in to book</div>
        <button onClick={() => window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`}
          style={{ width: "100%", padding: 15, background: T.gold, border: "none", borderRadius: 8, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: T.ink, cursor: "pointer" }}>
          Sign In / Create Account
        </button>
        <button onClick={() => setAuthError(false)} style={{ background: "none", border: "none", color: T.muted, fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer" }}>← Back</button>
      </div>
    </div>
  );

  // Confirmed
  if (confirmed) return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,0.75)" }} />
      <div style={{ width: "100%", maxWidth: 480, background: T.carbon, height: "100vh", overflowY: "auto", borderLeft: `2px solid ${T.wire}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 40 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.greenGlow, border: `2px solid ${T.green}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: T.green }}>✓</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: T.white, textAlign: "center" }}>You're booked</div>
        <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver, textAlign: "center", lineHeight: 1.75 }}>
          Your pontoon rental is confirmed. We'll reach out to coordinate trailering and launch details.
        </p>
        <div style={{ width: "100%", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: 20 }}>
          {[
            ["Confirmation", confirmCode],
            ["Date", fmtDate(rentalDate)],
            ["Duration", duration === "half_day" ? "Half Day" : "Full Day"],
            ["Destination", destination],
            ["Driver", driver ? `Included (+$${rental.driver_addon_price})` : "Self-guided"],
            ["Total", fmtMoney(total)],
          ].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.rim}` }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver }}>{l}</span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
        <button onClick={() => window.location.href = "/dashboard"}
          style={{ width: "100%", padding: 14, background: T.gold, border: "none", borderRadius: 8, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: T.ink, cursor: "pointer" }}>
          View in Dashboard →
        </button>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer" }}>Close</button>
      </div>
    </div>
  );

  const canAdvance1 = rentalDate && destination && !isBlocked(rentalDate) && !isPast(rentalDate);
  const canAdvance2 = termsAccepted;
  const stepLabels  = ["Select", "Review", "Pay"];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,0.75)" }} />
      <div style={{ width: "100%", maxWidth: 480, background: T.carbon, height: "100vh", overflowY: "auto", borderLeft: `2px solid ${T.wire}`, display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "24px 28px 16px", borderBottom: `1px solid ${T.wire}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.white }}>Book Your Rental</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.silver, fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", padding: "12px 28px", borderBottom: `1px solid ${T.rim}` }}>
          {stepLabels.map((label, i) => (
            <div key={label} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: step > i + 1 ? T.green : step === i + 1 ? T.gold : T.steel, margin: "0 auto 4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: step === i + 1 ? T.ink : step > i + 1 ? "#fff" : T.muted }}>
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: step === i + 1 ? T.gold : T.muted }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>

          {/* ── Step 1: Select ── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: T.white }}>Choose Your Day</div>

              {/* Date */}
              <div>
                <label style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, display: "block", marginBottom: 8 }}>Date</label>
                <input type="date" value={rentalDate} onChange={e => setRentalDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  style={{ width: "100%", padding: "12px 14px", background: T.gunmetal, border: `1px solid ${rentalDate && isBlocked(rentalDate) ? T.red : T.wire}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, boxSizing: "border-box", colorScheme: "dark" }} />
                {rentalDate && isBlocked(rentalDate) && (
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#e07070", marginTop: 6 }}>That date is already booked. Please choose another.</div>
                )}
              </div>

              {/* Duration */}
              <div>
                <label style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, display: "block", marginBottom: 10 }}>Duration</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    ["half_day", "Half Day", rental.half_day_price],
                    ["full_day", "Full Day", rental.full_day_price],
                  ].map(([val, label, price]) => (
                    <div key={val} onClick={() => setDuration(val)}
                      style={{ padding: "16px 14px", background: duration === val ? T.steel : T.gunmetal, border: `1px solid ${duration === val ? T.gold : T.wire}`, borderRadius: 10, cursor: "pointer", textAlign: "center" }}>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, color: duration === val ? T.gold : T.parchment }}>{label}</div>
                      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.white, marginTop: 4 }}>${price?.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Destination */}
              {rental.destinations?.length > 1 && (
                <div>
                  <label style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, display: "block", marginBottom: 10 }}>Destination</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {rental.destinations.map(dest => (
                      <div key={dest} onClick={() => setDestination(dest)}
                        style={{ padding: "14px 16px", background: destination === dest ? T.steel : T.gunmetal, border: `1px solid ${destination === dest ? T.gold : T.wire}`, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${destination === dest ? T.gold : T.wire}`, background: destination === dest ? T.gold : "none", flexShrink: 0 }} />
                        <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: destination === dest ? T.parchment : T.silver }}>{dest}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted, marginTop: 8 }}>
                    Boat is trailered to your chosen lake — included in the price.
                  </div>
                </div>
              )}

              {/* Driver add-on */}
              {rental.driver_addon_price > 0 && (
                <div onClick={() => setDriver(v => !v)}
                  style={{ padding: 16, background: driver ? T.steel : T.gunmetal, border: `1px solid ${driver ? T.gold : T.wire}`, borderRadius: 10, cursor: "pointer", display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 22, height: 22, borderRadius: 4, background: driver ? T.gold : "none", border: `2px solid ${driver ? T.gold : T.wire}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: T.ink, fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                    {driver ? "✓" : ""}
                  </div>
                  <div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, color: T.parchment }}>Add a Captain · +${rental.driver_addon_price}</div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, marginTop: 4, lineHeight: 1.6 }}>
                      Sit back while our experienced captain handles the boat. Ideal for first-timers or anyone who'd rather just enjoy the day.
                    </div>
                  </div>
                </div>
              )}

              {/* Passengers */}
              <div>
                <label style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, display: "block", marginBottom: 8 }}>Passengers (max {rental.capacity})</label>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <button onClick={() => setPassengers(p => Math.max(1, p - 1))}
                    style={{ width: 34, height: 34, borderRadius: "50%", background: T.steel, border: `1px solid ${T.wire}`, color: T.white, fontSize: 18, cursor: "pointer" }}>−</button>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 18, color: T.white, minWidth: 20, textAlign: "center" }}>{passengers}</span>
                  <button onClick={() => setPassengers(p => Math.min(rental.capacity || 8, p + 1))}
                    style={{ width: 34, height: 34, borderRadius: "50%", background: T.steel, border: `1px solid ${T.wire}`, color: T.white, fontSize: 18, cursor: "pointer" }}>+</button>
                </div>
              </div>

              {/* Price preview */}
              <div style={{ background: T.gunmetal, borderRadius: 8, padding: 14, border: `1px solid ${T.wire}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver }}>{duration === "half_day" ? "Half day" : "Full day"}</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment }}>${basePrice.toLocaleString()}</span>
                </div>
                {driver && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver }}>Captain</span>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment }}>+${driverFee}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: `1px solid ${T.rim}` }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: T.white }}>Estimated Total</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: T.gold }}>${total.toLocaleString()}</span>
                </div>
              </div>

              <GoldBtn disabled={!canAdvance1} onClick={() => setStep(2)}>Review Booking →</GoldBtn>
            </div>
          )}

          {/* ── Step 2: Review & Terms ── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: T.white }}>Review & Confirm</div>

              {/* Summary */}
              <div style={{ background: T.gunmetal, borderRadius: 10, padding: 18, border: `1px solid ${T.wire}` }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: T.gold, marginBottom: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>Booking Summary</div>
                {[
                  ["Date", fmtDate(rentalDate)],
                  ["Duration", duration === "half_day" ? "Half Day" : "Full Day"],
                  ["Destination", destination],
                  ["Passengers", passengers],
                  ["Captain", driver ? `Yes (+$${rental.driver_addon_price})` : "Self-guided"],
                  [`Base rate`, `$${basePrice.toLocaleString()}`],
                  [`Platform fee (${Math.round((rental.platform_fee_rate || PLATFORM_FEE_RATE) * 100)}%)`, `$${platformFee.toLocaleString()}`],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.rim}` }}>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver }}>{l}</span>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12 }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: T.white }}>Total</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: T.gold }}>${total.toLocaleString()}</span>
                </div>
              </div>

              {/* What's included */}
              {rental.includes?.length > 0 && (
                <div style={{ background: T.gunmetal, borderRadius: 8, padding: 14, border: `1px solid ${T.wire}` }}>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: T.gold, marginBottom: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>What's Included</div>
                  {rental.includes.map(item => (
                    <div key={item} style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, padding: "4px 0" }}>✓ {item}</div>
                  ))}
                </div>
              )}

              {/* Special requests */}
              <div>
                <label style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, display: "block", marginBottom: 8 }}>Special requests (optional)</label>
                <textarea value={requests} onChange={e => setRequests(e.target.value)} rows={2}
                  placeholder="Any notes for the team…"
                  style={{ width: "100%", background: T.gunmetal, border: `1px solid ${T.wire}`, borderRadius: 8, padding: "10px 12px", fontFamily: FONT_BODY, fontSize: 13, color: T.parchment, resize: "vertical", boxSizing: "border-box" }} />
              </div>

              {/* Terms */}
              <div onClick={() => setTermsAccepted(v => !v)} style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
                <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${termsAccepted ? T.gold : T.wire}`, background: termsAccepted ? T.gold : "none", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.ink, fontSize: 12, fontWeight: 700 }}>
                  {termsAccepted ? "✓" : ""}
                </div>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, lineHeight: 1.6 }}>
                  I agree to RŌM's rental terms. I understand the rental is non-refundable within 48 hours of departure. All passengers must wear life preservers when required by law.
                </span>
              </div>

              {payError && <div style={{ padding: 12, background: "rgba(138,58,58,0.15)", border: `1px solid ${T.red}`, borderRadius: 6, fontFamily: FONT_BODY, fontSize: 13, color: "#e07070" }}>{payError}</div>}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: 13, background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 14, color: T.silver, cursor: "pointer" }}>← Back</button>
                <GoldBtn disabled={!canAdvance2 || submitting} onClick={handlePreparePayment} style={{ flex: 2 }}>
                  {submitting ? "Preparing…" : "Proceed to Payment →"}
                </GoldBtn>
              </div>
            </div>
          )}

          {/* ── Step 3: Payment ── */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: T.white }}>Secure Payment</div>
              <div style={{ background: T.gunmetal, borderRadius: 8, padding: 14, border: `1px solid ${T.wire}`, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver }}>Total due today</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, color: T.gold }}>${total.toLocaleString()}</span>
              </div>
              {clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "night", variables: { colorPrimary: T.gold, colorBackground: T.gunmetal, colorText: T.parchment, fontFamily: FONT_BODY } } }}>
                  <RentalPaymentForm total={Math.round(total * 100)} onSuccess={handlePaymentSuccess} onError={e => setPayError(e)} />
                </Elements>
              ) : (
                <div style={{ textAlign: "center", padding: 40, color: T.muted, fontFamily: FONT_BODY }}>Loading payment…</div>
              )}
              {payError && <div style={{ padding: 12, background: "rgba(138,58,58,0.15)", border: `1px solid ${T.red}`, borderRadius: 6, fontFamily: FONT_BODY, fontSize: 13, color: "#e07070" }}>{payError}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RentalPage() {
  const { slug } = useParams();
  const [rental, setRental]           = useState(null);
  const [blockedDates, setBlockedDates] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [photoIdx, setPhotoIdx]       = useState(0);

  useEffect(() => {
    if (!slug) return;
    const supabase = getSupabase();
    supabase.from("rentals").select("*").eq("slug", slug).eq("active", true).single()
      .then(({ data }) => { setRental(data); setLoading(false); });
  }, [slug]);

  useEffect(() => {
    if (!rental?.id) return;
    const supabase = getSupabase();
    supabase.from("rental_blocks").select("block_date").eq("rental_id", rental.id)
      .then(({ data }) => setBlockedDates((data || []).map(r => r.block_date)));
  }, [rental?.id]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.void, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.silver }}>Loading…</div>
    </div>
  );

  if (!rental) return (
    <div style={{ minHeight: "100vh", background: T.void, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.silver }}>Rental not found.</div>
    </div>
  );

  const photos = rental.photos || [];

  return (
    <div style={{ minHeight: "100vh", background: T.void, color: T.parchment }}>

      {/* Hero */}
      <div style={{ position: "relative", height: "65vh", minHeight: 420, overflow: "hidden" }}>
        {photos.length > 0 ? (
          <>
            <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${photos[photoIdx]})`, backgroundSize: "cover", backgroundPosition: "center" }} />
            {photos.length > 1 && (
              <>
                <button onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)}
                  style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", color: T.white, fontSize: 22, width: 40, height: 40, borderRadius: "50%", cursor: "pointer" }}>‹</button>
                <button onClick={() => setPhotoIdx(i => (i + 1) % photos.length)}
                  style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", color: T.white, fontSize: 22, width: 40, height: 40, borderRadius: "50%", cursor: "pointer" }}>›</button>
              </>
            )}
          </>
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0b1a24 0%, #152018 100%)" }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(8,10,11,0.2), rgba(8,10,11,0.75) 80%, rgba(8,10,11,1))" }} />

        {/* Back */}
        <button onClick={() => window.location.href = "/rentals"}
          style={{ position: "absolute", top: 20, left: 20, background: "rgba(0,0,0,0.5)", border: "none", color: T.white, fontFamily: FONT_BODY, fontSize: 13, padding: "8px 14px", borderRadius: 6, cursor: "pointer" }}>
          ← Rentals
        </button>

        {/* Hero text */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 40px 48px" }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: T.gold, marginBottom: 12 }}>
            {rental.vessel_length} {rental.vessel_type}
          </div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(32px,5vw,60px)", color: T.white, margin: "0 0 8px", fontWeight: 400, lineHeight: 1.1 }}>{rental.name}</h1>
          {rental.tagline && <p style={{ fontFamily: FONT_BODY, fontSize: 16, color: T.ash, margin: "0 0 16px" }}>{rental.tagline}</p>}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver }}>📍 {rental.location}</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver }}>Up to {rental.capacity} passengers</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>

        {/* Pricing + CTA */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, padding: "32px 0", borderBottom: `1px solid ${T.wire}` }}>
          <div style={{ display: "flex", gap: 32 }}>
            {rental.half_day_price && (
              <div>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: T.white }}>${rental.half_day_price.toLocaleString()}</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver, marginLeft: 6 }}>half day</span>
              </div>
            )}
            {rental.full_day_price && (
              <div>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: T.white }}>${rental.full_day_price.toLocaleString()}</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver, marginLeft: 6 }}>full day</span>
              </div>
            )}
          </div>
          <button onClick={() => setBookingOpen(true)}
            style={{ padding: "14px 32px", background: T.gold, border: "none", borderRadius: 8, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: T.ink, cursor: "pointer" }}>
            Book This Boat
          </button>
        </div>

        {/* Description */}
        {rental.description && (
          <div style={{ padding: "32px 0", borderBottom: `1px solid ${T.wire}` }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.white, margin: "0 0 16px", fontWeight: 400 }}>About This Rental</h2>
            <p style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.ash, lineHeight: 1.8 }}>{rental.description}</p>
          </div>
        )}

        {/* What's included */}
        {rental.includes?.length > 0 && (
          <div style={{ padding: "32px 0", borderBottom: `1px solid ${T.wire}` }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.white, margin: "0 0 20px", fontWeight: 400 }}>What's Included</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {rental.includes.map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: T.gunmetal, borderRadius: 8, border: `1px solid ${T.rim}` }}>
                  <span style={{ color: T.gold }}>✓</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Destinations */}
        {rental.destinations?.length > 0 && (
          <div style={{ padding: "32px 0", borderBottom: `1px solid ${T.wire}` }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.white, margin: "0 0 8px", fontWeight: 400 }}>Destinations</h2>
            <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver, margin: "0 0 20px", lineHeight: 1.6 }}>
              We trailer the boat to your chosen lake — no additional charge.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {rental.destinations.map(dest => (
                <div key={dest} style={{ padding: "12px 20px", background: T.gunmetal, border: `1px solid ${T.wire}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 14, color: T.parchment }}>
                  🏞️ {dest}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Captain add-on */}
        {rental.driver_addon_price > 0 && (
          <div style={{ padding: "32px 0", borderBottom: `1px solid ${T.wire}` }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.white, margin: "0 0 16px", fontWeight: 400 }}>Add a Captain</h2>
            <div style={{ background: T.gunmetal, borderRadius: 10, padding: 20, border: `1px solid ${T.wire}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, color: T.parchment, marginBottom: 6 }}>Experienced Captain · +${rental.driver_addon_price}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, lineHeight: 1.6 }}>Sit back and relax while our captain handles navigation. Great for first-timers or groups who want to focus on the day, not the boat.</div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div style={{ padding: "40px 0 60px", textAlign: "center" }}>
          <button onClick={() => setBookingOpen(true)}
            style={{ padding: "16px 48px", background: T.gold, border: "none", borderRadius: 8, fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, color: T.ink, cursor: "pointer" }}>
            Book This Boat
          </button>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted, marginTop: 10 }}>Limited availability — dates fill quickly in summer</div>
        </div>
      </div>

      {bookingOpen && <BookingPanel rental={rental} blockedDates={blockedDates} onClose={() => setBookingOpen(false)} />}
    </div>
  );
}
