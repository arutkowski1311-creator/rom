"use client";
import { useState, useEffect, useRef } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";
import { GoldBtn, Stars } from "@/app/components/ui";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useParams } from "next/navigation";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const DAMAGE_WAIVER_FEE = 49;
const SECURITY_DEPOSIT  = 500;
const PLATFORM_FEE_RATE = 0.06;

// ─── Amenity icon map ─────────────────────────────────────────────────────────
const AMENITY_ICONS = {
  // Kitchen
  "Full kitchen": "🍳", "Coffee maker": "☕", "Dishwasher": "🫧", "Refrigerator": "🧊",
  "Microwave": "📡", "Espresso machine": "☕",
  // Outdoor
  "Hot tub": "♨️", "Fire pit": "🔥", "Deck": "🌄", "Pool": "🏊", "BBQ grill": "🍖",
  "Outdoor shower": "🚿", "Mountain views": "⛰️", "River access": "🏞️", "Lake access": "🏞️",
  // Sleep
  "King bed": "🛏️", "Queen bed": "🛏️", "Bunk beds": "🛏️", "High thread count linens": "🛏️",
  // Adventure
  "Ski-in/ski-out": "⛷️", "Gear storage": "🎒", "Bike storage": "🚵", "Kayak": "🛶",
  "Fishing gear": "🎣", "Trail access": "🥾",
  // Tech
  "Fast WiFi": "📶", "Smart TV": "📺", "Workspace": "💻",
  // Comfort
  "Fireplace": "🔥", "Air conditioning": "❄️", "Heated floors": "🌡️",
  "Washer/Dryer": "🫧", "Pet friendly": "🐾", "EV charger": "⚡",
};

const AMENITY_GROUPS = {
  "Outdoor & Views":    ["Hot tub","Fire pit","Deck","Pool","BBQ grill","Outdoor shower","Mountain views","River access","Lake access","Ski-in/ski-out","Trail access","Kayak","Fishing gear"],
  "Kitchen":            ["Full kitchen","Coffee maker","Dishwasher","Refrigerator","Microwave","Espresso machine"],
  "Sleep & Comfort":    ["King bed","Queen bed","Bunk beds","High thread count linens","Fireplace","Air conditioning","Heated floors","Washer/Dryer"],
  "Adventure Ready":    ["Gear storage","Bike storage"],
  "Tech & Extras":      ["Fast WiFi","Smart TV","Workspace","Pet friendly","EV charger"],
};

function groupAmenities(amenities) {
  const result = {};
  for (const [group, items] of Object.entries(AMENITY_GROUPS)) {
    const matched = (amenities || []).filter(a => items.includes(a));
    const unmatched = (amenities || []).filter(a => !Object.values(AMENITY_GROUPS).flat().includes(a));
    if (matched.length) result[group] = matched;
    if (unmatched.length && !result["Other"]) result["Other"] = unmatched;
  }
  return result;
}

// ─── Stripe payment form ──────────────────────────────────────────────────────
function PropertyPaymentForm({ total, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [err, setErr] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setErr(null);

    const { error: submitErr } = await elements.submit();
    if (submitErr) { setErr(submitErr.message); setProcessing(false); return; }

    const { error: confirmErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (confirmErr) {
      setErr(confirmErr.message);
      setProcessing(false);
      if (onError) onError(confirmErr.message);
    } else if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "requires_capture") {
      onSuccess(paymentIntent);
    } else {
      setErr("Payment is processing — you'll receive a confirmation shortly.");
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement options={{ layout: "tabs" }} />
      {err && (
        <div style={{ marginTop: 12, padding: 10, background: "rgba(138,58,58,0.15)", border: `1px solid ${T.red}`, borderRadius: 6, fontFamily: FONT_BODY, fontSize: 13, color: "#e07070" }}>
          {err}
        </div>
      )}
      <button type="submit" disabled={!stripe || processing}
        style={{ width: "100%", marginTop: 16, padding: 15, background: T.gold, border: "none", borderRadius: 8, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: T.ink, cursor: "pointer", opacity: processing ? 0.6 : 1 }}>
        {processing ? "Processing…" : `Pay $${(total/100).toLocaleString()}`}
      </button>
    </form>
  );
}

// ─── Mini calendar ────────────────────────────────────────────────────────────
function AvailabilityCalendar({ blocks, checkIn, checkOut, onSelectDate, selecting }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear]   = useState(now.getFullYear());
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

  const firstDay     = new Date(year, month, 1).getDay();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const toStr = (y, m, d) => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  const isBlocked = (d) => {
    if (!d) return false;
    const ds = toStr(year, month, d);
    return blocks.some(b => b.start_date <= ds && ds <= b.end_date);
  };

  const isPast = (d) => {
    if (!d) return false;
    const today = new Date(); today.setHours(0,0,0,0);
    return new Date(toStr(year, month, d)) < today;
  };

  const isCheckIn  = (d) => d && checkIn  === toStr(year, month, d);
  const isCheckOut = (d) => d && checkOut === toStr(year, month, d);

  const isInRange = (d) => {
    if (!d || !checkIn || !checkOut) return false;
    const ds = toStr(year, month, d);
    return ds > checkIn && ds < checkOut;
  };

  const handleDay = (d) => {
    if (!d || isBlocked(d) || isPast(d) || !selecting) return;
    onSelectDate(toStr(year, month, d));
  };

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };

  return (
    <div style={{ background: T.gunmetal, borderRadius: 10, padding: 20, border: `1px solid ${T.wire}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button onClick={prev} style={{ background: "none", border: "none", color: T.silver, cursor: "pointer", fontSize: 18 }}>‹</button>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: T.white }}>{MONTHS[month]} {year}</span>
        <button onClick={next} style={{ background: "none", border: "none", color: T.silver, cursor: "pointer", fontSize: 18 }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 8 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontFamily: FONT_BODY, fontSize: 11, color: T.muted, padding: "4px 0" }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {cells.map((d, i) => {
          const blocked = isBlocked(d);
          const past    = isPast(d);
          const ci      = isCheckIn(d);
          const co      = isCheckOut(d);
          const inRange = isInRange(d);
          const disabled = !d || blocked || past;

          let bg = "transparent";
          let color = d ? (disabled ? T.wire : T.parchment) : "transparent";
          let borderRadius = 4;
          if (ci || co) { bg = T.gold; color = T.ink; borderRadius = 4; }
          if (inRange)  { bg = T.goldGlow; }
          if (blocked)  { color = T.wire; textDecoration = "line-through"; }

          return (
            <div key={i} onClick={() => handleDay(d)}
              style={{ textAlign: "center", padding: "7px 0", fontFamily: FONT_BODY, fontSize: 13, color, background: bg, borderRadius, cursor: disabled ? "default" : "pointer", opacity: past ? 0.35 : 1, textDecoration: blocked && d ? "line-through" : "none" }}>
              {d || ""}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
        {[["Available","#3a7a54"],["Blocked",T.wire],["Selected",T.gold]].map(([label, color]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Booking panel ────────────────────────────────────────────────────────────
function BookingPanel({ property, blocks, onClose }) {
  const [step, setStep]               = useState(1);
  const [checkIn, setCheckIn]         = useState(null);
  const [checkOut, setCheckOut]       = useState(null);
  const [selectingField, setSelectingField] = useState("in"); // "in" | "out"
  const [guestCount, setGuestCount]   = useState(2);
  const [damageWaiver, setDamageWaiver] = useState(false);
  const [requests, setRequests]       = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [bookingId, setBookingId]     = useState(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [confirmed, setConfirmed]     = useState(false);
  const [authError, setAuthError]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [payError, setPayError]       = useState(null);

  const nights = checkIn && checkOut
    ? Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000)
    : 0;

  const baseTotal    = nights * (property.price_per_night || 0);
  const cleaningFee  = property.cleaning_fee || 0;
  const platformFee  = Math.round(baseTotal * (property.platform_fee_rate || PLATFORM_FEE_RATE));
  const waiverFee    = damageWaiver ? DAMAGE_WAIVER_FEE : 0;
  const total        = baseTotal + cleaningFee + platformFee + waiverFee;
  const depositHold  = SECURITY_DEPOSIT;

  const handleDateSelect = (dateStr) => {
    if (selectingField === "in" || !checkIn) {
      setCheckIn(dateStr); setCheckOut(null); setSelectingField("out");
    } else {
      if (dateStr <= checkIn) { setCheckIn(dateStr); setCheckOut(null); setSelectingField("out"); return; }
      // Validate min nights
      const n = Math.round((new Date(dateStr) - new Date(checkIn)) / 86400000);
      if (n < (property.min_nights || 2)) {
        alert(`Minimum stay is ${property.min_nights || 2} nights.`); return;
      }
      setCheckOut(dateStr); setSelectingField("in");
    }
  };

  const handlePreparePayment = async () => {
    setSubmitting(true);
    setPayError(null);
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAuthError(true); setSubmitting(false); return; }

      const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single();

      const res = await fetch("/api/properties/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId:       property.id,
          checkIn,
          checkOut,
          guests:           guestCount,
          nights,
          baseTotal:        Math.round(baseTotal * 100),
          cleaningFee:      Math.round(cleaningFee * 100),
          platformFee:      Math.round(platformFee * 100),
          damageWaiver:     Math.round(waiverFee * 100),
          taxAmount:        0,
          total:            Math.round(total * 100),
          securityDeposit:  Math.round(depositHold * 100),
          damageWaiverOpted: damageWaiver,
          specialRequests:  requests,
          guestEmail:       profile?.email || user.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setPayError(data.error || "Failed to initialize payment."); setSubmitting(false); return; }

      // Assign guest_id now that we have user
      const supabaseAdmin = getSupabase();
      await supabaseAdmin.from("property_bookings").update({ guest_id: user.id }).eq("id", data.bookingId);

      setClientSecret(data.clientSecret);
      setBookingId(data.bookingId);
      setConfirmCode(data.confirmCode);
      setStep(4);
    } catch (e) {
      setPayError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  const handlePaymentSuccess = async () => {
    // Block the dates
    const supabase = getSupabase();
    await supabase.from("property_blocks").insert({
      property_id: property.id,
      start_date:  checkIn,
      end_date:    checkOut,
      source:      "booking",
    });
    setConfirmed(true);
  };

  const fmtDate = (ds) => ds ? new Date(ds + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
  const fmtCurrency = (n) => n ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "$0";

  // Auth wall
  if (authError) return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,0.75)" }} />
      <div style={{ width: "100%", maxWidth: 520, background: T.carbon, height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 40, borderLeft: `2px solid ${T.wire}` }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: T.white, textAlign: "center" }}>Sign in to book</div>
        <p style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver, textAlign: "center", lineHeight: 1.7 }}>Create a free account to reserve this property.</p>
        <button onClick={() => window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`}
          style={{ width: "100%", padding: 15, background: T.gold, border: "none", borderRadius: 8, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: T.ink, cursor: "pointer" }}>
          Sign In / Create Account
        </button>
        <button onClick={() => setAuthError(false)} style={{ background: "none", border: "none", color: T.muted, fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer" }}>← Back</button>
      </div>
    </div>
  );

  // Confirmation
  if (confirmed) return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,0.75)" }} />
      <div style={{ width: "100%", maxWidth: 520, background: T.carbon, height: "100vh", overflowY: "auto", borderLeft: `2px solid ${T.wire}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 40 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.greenGlow, border: `2px solid ${T.green}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: T.green }}>✓</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: T.white, textAlign: "center" }}>You're confirmed</div>
        <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver, textAlign: "center", lineHeight: 1.75 }}>
          Your stay at <strong style={{ color: T.parchment }}>{property.name}</strong> is booked. A $500 security hold has been placed and will auto-release 48 hours after checkout.
        </p>
        <div style={{ width: "100%", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: 20 }}>
          {[
            ["Confirmation", confirmCode],
            ["Check-in", fmtDate(checkIn)],
            ["Check-out", fmtDate(checkOut)],
            ["Guests", guestCount],
            ["Nights", nights],
            ["Total charged", fmtCurrency(total)],
            ["Security hold", `${fmtCurrency(depositHold)} (auto-released)`],
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

  const stepLabels = ["Dates", "Add-ons", "Review", "Payment"];
  const canAdvance1 = checkIn && checkOut && nights >= (property.min_nights || 2);
  const canAdvance3 = termsAccepted;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,0.75)" }} />
      <div style={{ width: "100%", maxWidth: 520, background: T.carbon, height: "100vh", overflowY: "auto", borderLeft: `2px solid ${T.wire}`, display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "24px 28px 16px", borderBottom: `1px solid ${T.wire}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.white }}>Book Your Stay</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.silver, fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        {/* Step indicators */}
        <div style={{ display: "flex", padding: "12px 28px", gap: 0, borderBottom: `1px solid ${T.rim}` }}>
          {stepLabels.map((label, i) => (
            <div key={label} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: step > i + 1 ? T.green : step === i + 1 ? T.gold : T.steel, margin: "0 auto 4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: step === i + 1 ? T.ink : step > i + 1 ? "#fff" : T.muted }}>
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: step === i + 1 ? T.gold : T.muted }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>

          {/* ── Step 1: Dates & Guests ── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: T.white }}>Select Your Dates</div>

              {/* Date display */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[["Check-in", checkIn, "in"], ["Check-out", checkOut, "out"]].map(([label, val, field]) => (
                  <div key={label} onClick={() => setSelectingField(field)}
                    style={{ padding: "12px 14px", background: selectingField === field ? T.steel : T.gunmetal, border: `1px solid ${selectingField === field ? T.gold : T.wire}`, borderRadius: 8, cursor: "pointer" }}>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: val ? T.parchment : T.silver }}>{val ? fmtDate(val) : "Select date"}</div>
                  </div>
                ))}
              </div>

              <AvailabilityCalendar
                blocks={blocks}
                checkIn={checkIn}
                checkOut={checkOut}
                onSelectDate={handleDateSelect}
                selecting={true}
              />

              {/* Guest count */}
              <div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, marginBottom: 8 }}>Guests (max {property.max_guests})</div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <button onClick={() => setGuestCount(g => Math.max(1, g - 1))}
                    style={{ width: 34, height: 34, borderRadius: "50%", background: T.steel, border: `1px solid ${T.wire}`, color: T.white, fontSize: 18, cursor: "pointer" }}>−</button>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 18, color: T.white, minWidth: 20, textAlign: "center" }}>{guestCount}</span>
                  <button onClick={() => setGuestCount(g => Math.min(property.max_guests || 12, g + 1))}
                    style={{ width: 34, height: 34, borderRadius: "50%", background: T.steel, border: `1px solid ${T.wire}`, color: T.white, fontSize: 18, cursor: "pointer" }}>+</button>
                </div>
              </div>

              {nights > 0 && (
                <div style={{ background: T.gunmetal, borderRadius: 8, padding: 14, border: `1px solid ${T.wire}` }}>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver }}>
                    {fmtCurrency(property.price_per_night)} × {nights} nights = <strong style={{ color: T.parchment }}>{fmtCurrency(baseTotal)}</strong>
                  </div>
                </div>
              )}

              <GoldBtn disabled={!canAdvance1} onClick={() => setStep(2)}>
                Continue →
              </GoldBtn>
            </div>
          )}

          {/* ── Step 2: Add-ons ── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: T.white }}>Protect Your Stay</div>

              {/* Damage waiver */}
              <div onClick={() => setDamageWaiver(v => !v)}
                style={{ padding: 18, background: damageWaiver ? T.steel : T.gunmetal, border: `1px solid ${damageWaiver ? T.gold : T.wire}`, borderRadius: 10, cursor: "pointer", display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 22, height: 22, borderRadius: 4, background: damageWaiver ? T.gold : "none", border: `2px solid ${damageWaiver ? T.gold : T.wire}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: T.ink, fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                  {damageWaiver ? "✓" : ""}
                </div>
                <div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, color: T.parchment }}>Damage Protection · $49</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, marginTop: 4, lineHeight: 1.6 }}>
                    Covers accidental damage up to $1,500. If something breaks, we handle it — no awkward conversations with the host.
                  </div>
                </div>
              </div>

              {/* House notes */}
              {property.house_notes && (
                <div style={{ background: T.gunmetal, borderRadius: 8, padding: 16, border: `1px solid ${T.wire}` }}>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: T.gold, marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>House Notes</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, lineHeight: 1.7 }}>{property.house_notes}</div>
                </div>
              )}

              {/* Special requests */}
              <div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, marginBottom: 8 }}>Special requests (optional)</div>
                <textarea value={requests} onChange={e => setRequests(e.target.value)} rows={3}
                  placeholder="Early check-in, specific bedding preferences, etc."
                  style={{ width: "100%", background: T.gunmetal, border: `1px solid ${T.wire}`, borderRadius: 8, padding: "10px 12px", fontFamily: FONT_BODY, fontSize: 13, color: T.parchment, resize: "vertical", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: 13, background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 14, color: T.silver, cursor: "pointer" }}>← Back</button>
                <GoldBtn onClick={() => setStep(3)} style={{ flex: 2 }}>Review Booking →</GoldBtn>
              </div>
            </div>
          )}

          {/* ── Step 3: Review & Terms ── */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: T.white }}>Review & Confirm</div>

              {/* Price breakdown */}
              <div style={{ background: T.gunmetal, borderRadius: 10, padding: 18, border: `1px solid ${T.wire}` }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: T.gold, marginBottom: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>Price Breakdown</div>
                {[
                  [`$${(property.price_per_night||0).toLocaleString()} × ${nights} nights`, fmtCurrency(baseTotal)],
                  cleaningFee > 0 ? ["Cleaning fee", fmtCurrency(cleaningFee)] : null,
                  [`Platform fee (${Math.round((property.platform_fee_rate||PLATFORM_FEE_RATE)*100)}%)`, fmtCurrency(platformFee)],
                  damageWaiver ? ["Damage waiver", fmtCurrency(waiverFee)] : null,
                  ["Taxes", "Calculated at checkout"],
                ].filter(Boolean).map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.rim}` }}>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver }}>{l}</span>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12 }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: T.white }}>Total</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: T.gold }}>{fmtCurrency(total)}</span>
                </div>
              </div>

              {/* Security deposit notice */}
              <div style={{ background: `${T.blue}20`, border: `1px solid ${T.blue}60`, borderRadius: 8, padding: 14, fontFamily: FONT_BODY, fontSize: 13, color: T.ash, lineHeight: 1.6 }}>
                <strong style={{ color: T.parchment }}>Security deposit: $500 hold</strong><br />
                A $500 authorization hold will be placed on your card and automatically released 48 hours after checkout, provided no damage is reported.
              </div>

              {/* T&C */}
              <div onClick={() => setTermsAccepted(v => !v)}
                style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
                <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${termsAccepted ? T.gold : T.wire}`, background: termsAccepted ? T.gold : "none", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.ink, fontSize: 12, fontWeight: 700 }}>
                  {termsAccepted ? "✓" : ""}
                </div>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, lineHeight: 1.6 }}>
                  I agree to the RŌM <span style={{ color: T.gold, textDecoration: "underline", cursor: "pointer" }}>Terms & Conditions</span> and cancellation policy. I understand the security deposit hold and rental agreement.
                </span>
              </div>

              {payError && (
                <div style={{ padding: 12, background: "rgba(138,58,58,0.15)", border: `1px solid ${T.red}`, borderRadius: 6, fontFamily: FONT_BODY, fontSize: 13, color: "#e07070" }}>{payError}</div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(2)} style={{ flex: 1, padding: 13, background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 14, color: T.silver, cursor: "pointer" }}>← Back</button>
                <GoldBtn disabled={!canAdvance3 || submitting} onClick={handlePreparePayment} style={{ flex: 2 }}>
                  {submitting ? "Preparing…" : "Proceed to Payment →"}
                </GoldBtn>
              </div>
            </div>
          )}

          {/* ── Step 4: Payment ── */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: T.white }}>Secure Payment</div>
              <div style={{ background: T.gunmetal, borderRadius: 8, padding: 14, border: `1px solid ${T.wire}` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver }}>Total due today</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, color: T.gold }}>{fmtCurrency(total)}</span>
                </div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted, marginTop: 6 }}>+ $500 security hold (auto-released)</div>
              </div>

              {clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "night", variables: { colorPrimary: T.gold, colorBackground: T.gunmetal, colorText: T.parchment, fontFamily: FONT_BODY } } }}>
                  <PropertyPaymentForm
                    total={Math.round(total * 100)}
                    onSuccess={handlePaymentSuccess}
                    onError={(e) => setPayError(e)}
                  />
                </Elements>
              ) : (
                <div style={{ textAlign: "center", padding: 40, color: T.muted, fontFamily: FONT_BODY }}>Loading payment form…</div>
              )}

              {payError && (
                <div style={{ padding: 12, background: "rgba(138,58,58,0.15)", border: `1px solid ${T.red}`, borderRadius: 6, fontFamily: FONT_BODY, fontSize: 13, color: "#e07070" }}>{payError}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PropertyPage() {
  const { slug } = useParams();
  const [property, setProperty] = useState(null);
  const [blocks, setBlocks]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const autoSlide = useRef(null);

  useEffect(() => {
    if (!slug) return;
    const supabase = getSupabase();
    supabase.from("properties").select("*").eq("slug", slug).eq("active", true).single()
      .then(({ data }) => { setProperty(data); setLoading(false); });
    supabase.from("property_blocks").select("start_date, end_date, source")
      .eq("property_id", slug) // will refetch below once we have the real id
      .then(({ data }) => setBlocks(data || []));
  }, [slug]);

  // Re-fetch blocks by property id once we have it
  useEffect(() => {
    if (!property?.id) return;
    const supabase = getSupabase();
    supabase.from("property_blocks").select("start_date, end_date, source").eq("property_id", property.id)
      .then(({ data }) => setBlocks(data || []));
  }, [property?.id]);

  // Photo auto-advance
  useEffect(() => {
    if (!property?.photos?.length) return;
    autoSlide.current = setInterval(() => {
      setPhotoIdx(i => (i + 1) % property.photos.length);
    }, 5000);
    return () => clearInterval(autoSlide.current);
  }, [property?.photos?.length]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.void, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.silver }}>Loading…</div>
    </div>
  );

  if (!property) return (
    <div style={{ minHeight: "100vh", background: T.void, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.silver }}>Property not found.</div>
    </div>
  );

  const photos     = property.photos || [];
  const amenGroups = groupAmenities(property.amenities);
  const fmtPrice   = (n) => n ? `$${Number(n).toLocaleString()}` : "—";

  return (
    <div style={{ minHeight: "100vh", background: T.void, color: T.parchment }}>

      {/* ── Hero carousel ─────────────────────────────────────────────────── */}
      <div style={{ position: "relative", height: "75vh", minHeight: 480, overflow: "hidden" }}>
        {photos.length > 0 ? (
          <>
            <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${photos[photoIdx]})`, backgroundSize: "cover", backgroundPosition: "center", transition: "opacity 0.8s" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(8,10,11,0.2) 0%, rgba(8,10,11,0.7) 70%, rgba(8,10,11,1) 100%)" }} />
          </>
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #152018 0%, #0b1a24 100%)" }} />
        )}

        {/* Photo dots */}
        {photos.length > 1 && (
          <div style={{ position: "absolute", bottom: 140, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
            {photos.map((_, i) => (
              <div key={i} onClick={() => setPhotoIdx(i)}
                style={{ width: i === photoIdx ? 24 : 8, height: 8, borderRadius: 4, background: i === photoIdx ? T.gold : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "width 0.3s" }} />
            ))}
          </div>
        )}

        {/* Photo nav arrows */}
        {photos.length > 1 && (
          <>
            <button onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)}
              style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", color: T.white, fontSize: 24, width: 44, height: 44, borderRadius: "50%", cursor: "pointer" }}>‹</button>
            <button onClick={() => setPhotoIdx(i => (i + 1) % photos.length)}
              style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", color: T.white, fontSize: 24, width: 44, height: 44, borderRadius: "50%", cursor: "pointer" }}>›</button>
          </>
        )}

        {/* Hero text */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 40px 48px" }}>
          {/* Positioning tags */}
          {property.positioning_tags?.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {property.positioning_tags.map(tag => (
                <span key={tag} style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: T.gold, background: "rgba(201,151,58,0.15)", border: `1px solid rgba(201,151,58,0.4)`, borderRadius: 4, padding: "4px 10px" }}>{tag}</span>
              ))}
            </div>
          )}
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(32px,5vw,60px)", fontWeight: 400, color: T.white, margin: "0 0 8px", lineHeight: 1.1 }}>{property.name}</h1>
          {property.tagline && <p style={{ fontFamily: FONT_BODY, fontSize: 16, color: T.ash, margin: "0 0 16px", lineHeight: 1.5 }}>{property.tagline}</p>}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver }}>📍 {property.location}</span>
            {property.bedrooms && <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver }}>{property.bedrooms} bed</span>}
            {property.bathrooms && <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver }}>{property.bathrooms} bath</span>}
            {property.max_guests && <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver }}>Up to {property.max_guests} guests</span>}
          </div>
        </div>

        {/* Back nav */}
        <button onClick={() => window.location.href = "/properties"}
          style={{ position: "absolute", top: 20, left: 20, background: "rgba(0,0,0,0.5)", border: "none", color: T.white, fontFamily: FONT_BODY, fontSize: 13, padding: "8px 14px", borderRadius: 6, cursor: "pointer" }}>
          ← Properties
        </button>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>

        {/* Pricing + CTA strip */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, padding: "32px 0", borderBottom: `1px solid ${T.wire}` }}>
          <div>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 42, color: T.white }}>{fmtPrice(property.price_per_night)}</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 16, color: T.silver, marginLeft: 6 }}>/night</span>
            {property.min_nights > 1 && (
              <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.muted, marginTop: 4 }}>{property.min_nights}-night minimum</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => { window.location.href = `/trips?prefill_location=${encodeURIComponent(property.location || "")}`; }}
              style={{ padding: "12px 20px", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 14, color: T.silver, cursor: "pointer" }}>
              Plan Your Stay ✦
            </button>
            <button onClick={() => setBookingOpen(true)}
              style={{ padding: "14px 28px", background: T.gold, border: "none", borderRadius: 8, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: T.ink, cursor: "pointer" }}>
              Book This Property
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 0, padding: "24px 0", borderBottom: `1px solid ${T.wire}` }}>
          {[
            property.bedrooms    ? [String(property.bedrooms),    "Bedrooms"]                  : null,
            property.bathrooms   ? [String(property.bathrooms),   "Bathrooms"]                 : null,
            property.max_guests  ? [String(property.max_guests),  "Max Guests"]                : null,
            property.min_nights  ? [`${property.min_nights}+`,    "Night Minimum"]             : null,
            property.cushion_days? [`${property.cushion_days}d`,  "Between Bookings"]          : null,
          ].filter(Boolean).map(([val, label]) => (
            <div key={label} style={{ textAlign: "center", padding: "8px 4px", borderRight: `1px solid ${T.wire}` }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.white }}>{val}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        {property.description && (
          <div style={{ padding: "32px 0", borderBottom: `1px solid ${T.wire}` }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.white, margin: "0 0 16px", fontWeight: 400 }}>About This Property</h2>
            <p style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.ash, lineHeight: 1.8, whiteSpace: "pre-line" }}>{property.description}</p>
          </div>
        )}

        {/* Amenities */}
        {Object.keys(amenGroups).length > 0 && (
          <div style={{ padding: "32px 0", borderBottom: `1px solid ${T.wire}` }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.white, margin: "0 0 24px", fontWeight: 400 }}>What's Included</h2>
            {Object.entries(amenGroups).map(([group, items]) => (
              <div key={group} style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: T.gold, marginBottom: 12 }}>{group}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                  {items.map(a => (
                    <div key={a} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: T.gunmetal, borderRadius: 8, border: `1px solid ${T.rim}` }}>
                      <span style={{ fontSize: 18 }}>{AMENITY_ICONS[a] || "✦"}</span>
                      <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment }}>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Availability calendar (read-only) */}
        <div style={{ padding: "32px 0", borderBottom: `1px solid ${T.wire}` }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.white, margin: "0 0 8px", fontWeight: 400 }}>Availability</h2>
          <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver, margin: "0 0 20px" }}>Gray dates are already booked or blocked.</p>
          <AvailabilityCalendar blocks={blocks} checkIn={null} checkOut={null} onSelectDate={() => {}} selecting={false} />
        </div>

        {/* Boat rental add-on — shown for Ausable House */}
        {property.slug === "ausable-house" && (
          <div style={{ padding: "40px 0", borderBottom: `1px solid ${T.wire}` }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: T.gold, marginBottom: 14 }}>Add to Your Stay</div>
            <div style={{ background: T.gunmetal, border: `1px solid ${T.wire}`, borderRadius: 12, padding: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
              <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                <div style={{ fontSize: 36 }}>⛵</div>
                <div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.white, marginBottom: 6 }}>20ft Pontoon Boat Rental</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, lineHeight: 1.6, maxWidth: 420 }}>
                    Lake Placid or Saranac Lake. Gas, cooler, life preservers, and trailering to your chosen destination all included. NYS Boating Safety Certificate required to operate.
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment }}>Half day <strong style={{ color: T.gold }}>$400</strong></span>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment }}>Full day <strong style={{ color: T.gold }}>$600</strong></span>
                  </div>
                </div>
              </div>
              <button onClick={() => window.location.href = "/rentals/ausable-pontoon"}
                style={{ padding: "12px 24px", background: T.gold, border: "none", borderRadius: 8, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: T.ink, cursor: "pointer", flexShrink: 0 }}>
                Book the Boat →
              </button>
            </div>
          </div>
        )}

        {/* Concierge CTA */}
        <div style={{ padding: "40px 0", textAlign: "center", borderBottom: `1px solid ${T.wire}` }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: T.white, margin: "0 0 12px", fontWeight: 400 }}>Make the most of your stay</h2>
          <p style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver, margin: "0 0 24px", lineHeight: 1.7 }}>
            Let our AI concierge build a full trip itinerary around your dates — local guides, dining, hidden spots, and everything in between.
          </p>
          <button onClick={() => window.location.href = `/trips?prefill_location=${encodeURIComponent(property.location || "")}`}
            style={{ padding: "14px 32px", background: "none", border: `1px solid ${T.gold}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 15, color: T.gold, cursor: "pointer", letterSpacing: "0.04em" }}>
            Plan Your Stay ✦
          </button>
        </div>

        {/* Bottom CTA */}
        <div style={{ padding: "40px 0 60px", textAlign: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.white, marginBottom: 8 }}>{fmtPrice(property.price_per_night)}<span style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver }}>/night</span></div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.muted, marginBottom: 20 }}>Platform fee ~{Math.round((property.platform_fee_rate || PLATFORM_FEE_RATE) * 100)}% · No hidden fees</div>
          <button onClick={() => setBookingOpen(true)}
            style={{ padding: "16px 48px", background: T.gold, border: "none", borderRadius: 8, fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, color: T.ink, cursor: "pointer" }}>
            Book This Property
          </button>
        </div>
      </div>

      {/* Booking panel */}
      {bookingOpen && (
        <BookingPanel property={property} blocks={blocks} onClose={() => setBookingOpen(false)} />
      )}
    </div>
  );
}
