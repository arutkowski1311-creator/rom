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

// ─── Legal text ───────────────────────────────────────────────────────────────
const RENTAL_TERMS = `AUSABLE PONTOON RENTAL — TERMS & CONDITIONS AND LIABILITY WAIVER
Version 2.0 · Effective April 2026

PLEASE READ THIS AGREEMENT CAREFULLY BEFORE COMPLETING YOUR BOOKING. BY SIGNING BELOW, YOU AGREE TO BE LEGALLY BOUND BY THESE TERMS.

─── PART I: RENTAL TERMS & CONDITIONS ──────────────────────────────────────────

1. OPERATOR REQUIREMENTS
The designated operator must be 21 years of age or older and possess a valid New York State Boating Safety Certificate or equivalent recognized certification. Proof of certification may be requested at time of launch. Operating the vessel without valid certification is a violation of New York law and voids all rental agreements and protections.

2. VESSEL USE
The vessel is a 20-foot pontoon boat rated for a maximum of 8 passengers. Exceeding the rated capacity is prohibited by law and voids this agreement. The vessel may only be used on the designated body of water confirmed at booking (Lake Placid or Saranac Lake). Trailering or use on any other waterway is strictly prohibited. The renter shall not modify, alter, or tamper with any mechanical, structural, or safety component of the vessel.

3. ALCOHOL & SUBSTANCES
Operating a vessel under the influence of alcohol or controlled substances is illegal under New York State law (Penal Law §49-A) and strictly prohibited. Any rental found to involve impaired operation will result in immediate termination without refund and potential referral to law enforcement.

4. SAFETY REQUIREMENTS
All passengers are required to wear U.S. Coast Guard-approved personal flotation devices (PFDs) when required by New York State law, and at all times when children under 12 are aboard. Provided PFDs must not be modified or removed from the vessel. The renter is responsible for ensuring all passengers comply with all applicable safety laws.

5. PRE-RENTAL CONDITION ACKNOWLEDGMENT
By completing this booking, the renter acknowledges and agrees that:

  (a) The vessel, motor, trailer, and all associated equipment are represented to be in good operating condition at the time of rental, as verified by the owner prior to each rental period.

  (b) The renter accepts the vessel in its described condition. Any pre-existing damage or deficiencies must be reported to the owner in writing before departure. Failure to report any issue within 15 minutes of launch constitutes acceptance of the vessel as received and creates a rebuttable presumption that any subsequently discovered damage occurred during the renter's possession.

  (c) The renter agrees to conduct a brief walk-through of the vessel, its controls, and safety equipment at the time of pickup and to confirm readiness before departure.

6. DAMAGE, MECHANICAL FAILURE & STRUCTURAL FAILURE DURING RENTAL
The renter is fully and solely responsible for all damage to, and all mechanical or structural failure of, the vessel, motor, trailer, steering system, propeller, hull, deck, or any associated equipment that occurs during the rental period, regardless of cause, including but not limited to:

  — Physical damage caused by collision, grounding, swamping, fire, or impact;
  — Mechanical failure resulting from misuse, overloading, improper operation, introduction of contaminants (including wrong fuel type), running in shallow water, or failure to follow operating instructions;
  — Structural failure caused by overloading, improper docking, beaching the vessel, or dragging the hull;
  — Theft or loss of any provided equipment (cooler, PFDs, anchor, lines, etc.);
  — Any failure that the owner reasonably determines was caused or accelerated by renter conduct during the rental period.

The renter's financial responsibility includes all repair costs as assessed by a licensed marine repair facility, parts, labor, transportation of the vessel, and any other reasonable costs required to restore the vessel to its pre-rental condition. Normal, documented wear and tear is excluded.

The renter expressly agrees that the owner's determination of cause and associated repair costs shall be final and binding for purposes of this agreement, provided such costs are supported by a written repair estimate or invoice.

7. CONSEQUENTIAL DAMAGES — DOWNSTREAM RENTAL IMPACT
If damage, mechanical failure, structural failure, or any other condition caused by the renter during their rental period renders the vessel unavailable for use in subsequent confirmed rental bookings, the renter shall be responsible for:

  (a) The full cost of any refunds issued to subsequent renters who cannot be accommodated due to the vessel's unavailability;
  (b) Any lost rental revenue for rental periods that cannot be rescheduled within 30 days due to the vessel's repair timeline;
  (c) Reasonable costs to expedite repairs in order to minimize disruption to scheduled rentals.

The renter acknowledges that the vessel is a revenue-generating asset and that their responsibility extends to the full downstream economic impact of any damage or failure caused during their rental.

8. INCIDENT REPORTING OBLIGATION
The renter must immediately notify the owner of any incident, accident, mechanical issue, structural concern, or collision occurring during the rental — regardless of perceived severity. Notification must occur as soon as safely possible, and no later than 1 hour after the incident. Failure to report an incident in a timely manner:

  (a) Creates a presumption that the damage or failure was caused by renter negligence;
  (b) Voids any defense the renter may otherwise have regarding pre-existing conditions;
  (c) May constitute grounds for additional charges, legal action, or referral to law enforcement where applicable.

The renter shall not attempt to repair, conceal, or minimize any damage to the vessel. The vessel must be returned in the condition it was found, or the damage disclosed upon return.

9. RECOVERY & TOWING COSTS
If the vessel becomes disabled, grounded, or stranded during the rental period for any reason other than a documented pre-existing mechanical defect, the renter is responsible for all costs associated with recovering, towing, or transporting the vessel back to the launch point or a designated service facility. This includes third-party towing service fees, water rescue costs, and any applicable New York State or USCG administrative fees.

10. RETURN CONDITIONS
The vessel must be returned to the designated launch point in clean condition, with all provided equipment (cooler, PFDs, anchor, lines, etc.) on board and undamaged. Fuel is included — the vessel must not be refueled by the renter. The vessel must be returned by the agreed-upon end time. Late returns will be charged at $100/hour or partial hour beyond the rental period. The renter must remain present for the owner's return inspection.

11. CANCELLATION & WEATHER POLICY
Cancellations made more than 72 hours before the rental date receive a full refund. Cancellations within 72 hours are non-refundable. In the event of severe weather (lightning, sustained winds above 20 mph, or U.S. Coast Guard small craft advisories), the operator reserves the right to reschedule or cancel the rental with a full refund or credit. Renters do not have the right to cancel due to minor weather discomfort (clouds, light rain, mild chop).

12. GOVERNING LAW
This agreement shall be governed by the laws of the State of New York. Any disputes shall be resolved in the courts of Essex County, New York. If any provision of this agreement is found unenforceable, the remaining provisions shall remain in full force and effect.

─── PART II: LIABILITY WAIVER & RELEASE ────────────────────────────────────────

13. ASSUMPTION OF RISK
I understand and acknowledge that boating and water activities involve inherent risks, including but not limited to: drowning, capsizing, collision, personal injury, property damage, and death. These risks exist regardless of the care taken by the vessel owner or operator. I voluntarily assume all such risks on behalf of myself and all passengers in my party.

14. RELEASE OF LIABILITY
In consideration of being permitted to rent and operate the vessel, I, on behalf of myself, my heirs, assigns, and legal representatives, hereby RELEASE, WAIVE, DISCHARGE, AND COVENANT NOT TO SUE Ausable House LLC, RŌM Life, LLC, their owners, members, officers, employees, agents, and successors (collectively, "Released Parties") from any and all liability, claims, demands, actions, or causes of action arising out of or related to any loss, damage, or injury — including death — that may be sustained by me or any member of my party, or to any property, while participating in this rental activity.

15. INDEMNIFICATION
I agree to INDEMNIFY AND HOLD HARMLESS the Released Parties from any loss, liability, damage, cost, or expense — including consequential damages to subsequent renters and lost revenue — that they may incur as a result of any claim made by me, my passengers, or any third party arising from my rental or operation of the vessel.

16. MEDICAL AUTHORIZATION
In the event of a medical emergency involving me or any member of my party, I authorize the Released Parties and any emergency personnel to obtain and provide medical treatment as they deem necessary. I acknowledge that I am responsible for all resulting medical costs.

17. ACKNOWLEDGMENT
I acknowledge that I have read this agreement in its entirety, that I understand its terms, that I am signing it freely and voluntarily, and that I intend it to be a complete and unconditional release of all liability to the greatest extent allowed by law. I further acknowledge that no oral representations, statements, or inducements have been made apart from what is written here. I understand that my liability extends to mechanical and structural failure occurring during my rental period, and to the full downstream economic impact of any vessel unavailability caused by my use.`;

// ─── Stripe form ──────────────────────────────────────────────────────────────
function RentalPaymentForm({ total, onSuccess, onError }) {
  const stripe   = useStripe();
  const elements = useElements();
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
  const [passengers, setPassengers]   = useState(2);
  const [requests, setRequests]       = useState("");

  // Waiver fields
  const [legalName, setLegalName]             = useState("");
  const [signatureText, setSignatureText]     = useState("");
  const [emergencyName, setEmergencyName]     = useState("");
  const [emergencyPhone, setEmergencyPhone]   = useState("");
  const [termsRead, setTermsRead]               = useState(false);
  const [waiverSigned, setWaiverSigned]         = useState(false);
  const [certConfirmed, setCertConfirmed]       = useState(false);
  const [ageConfirmed, setAgeConfirmed]         = useState(false);
  const [conditionConfirmed, setConditionConfirmed] = useState(false);
  const [damageConfirmed, setDamageConfirmed]   = useState(false);

  // Payment
  const [clientSecret, setClientSecret]       = useState(null);
  const [confirmCode, setConfirmCode]         = useState("");
  const [bookingId, setBookingId]             = useState(null);
  const [rentalId, setRentalId]               = useState(null);
  const [guestId, setGuestId]                 = useState(null);
  const [guestEmail, setGuestEmail]           = useState("");
  const [confirmed, setConfirmed]             = useState(false);
  const [authError, setAuthError]             = useState(false);
  const [submitting, setSubmitting]           = useState(false);
  const [waiverSubmitting, setWaiverSubmitting] = useState(false);
  const [payError, setPayError]               = useState(null);

  const basePrice   = duration === "half_day" ? (rental.half_day_price || 0) : (rental.full_day_price || 0);
  const platformFee = Math.round(basePrice * (rental.platform_fee_rate || PLATFORM_FEE_RATE));
  const total       = basePrice + platformFee;

  const isBlocked   = (ds) => blockedDates.includes(ds);
  const isPast      = (ds) => new Date(ds + "T12:00:00") < new Date();
  const fmtMoney    = (n) => `$${Number(n).toLocaleString()}`;
  const fmtDate     = (ds) => ds ? new Date(ds + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "—";

  const canAdvance1 = rentalDate && destination && !isBlocked(rentalDate) && !isPast(rentalDate);
  const canAdvance2 = termsRead && waiverSigned && certConfirmed && ageConfirmed &&
                      conditionConfirmed && damageConfirmed &&
                      legalName.trim().length > 3 && signatureText.trim().length > 3 &&
                      emergencyName.trim().length > 1 && emergencyPhone.trim().length > 6;

  // Step 2 → 3: Submit waiver, then create payment intent
  const handleWaiverAndPay = async () => {
    setWaiverSubmitting(true); setPayError(null);
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAuthError(true); setWaiverSubmitting(false); return; }
      const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single();
      const email = profile?.email || user.email;
      setGuestId(user.id);
      setGuestEmail(email);

      // Create booking + payment intent first
      const piRes = await fetch("/api/rentals/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rentalId:        rental.id,
          rentalDate,
          duration,
          destination,
          passengers,
          basePrice:       Math.round(basePrice * 100),
          driverFee:       0,
          platformFee:     Math.round(platformFee * 100),
          total:           Math.round(total * 100),
          guestEmail:      email,
          specialRequests: requests,
        }),
      });
      const piData = await piRes.json();
      if (!piRes.ok) { setPayError(piData.error || "Failed to initialize payment."); setWaiverSubmitting(false); return; }

      // Assign guest_id
      await supabase.from("rental_bookings").update({ guest_id: user.id }).eq("id", piData.bookingId);

      // Sign waiver
      const wRes = await fetch("/api/rentals/sign-waiver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId:            piData.bookingId,
          rentalId:             rental.id,
          guestId:              user.id,
          guestLegalName:       legalName,
          guestEmail:           email,
          signatureText,
          emergencyContactName: emergencyName,
          emergencyContactPhone:emergencyPhone,
          participantCount:     passengers,
          minorParticipants:    [],
          waiverContent:        RENTAL_TERMS,
        }),
      });
      if (!wRes.ok) { const wd = await wRes.json(); setPayError(wd.error || "Failed to record waiver."); setWaiverSubmitting(false); return; }

      setClientSecret(piData.clientSecret);
      setBookingId(piData.bookingId);
      setRentalId(rental.id);
      setConfirmCode(piData.confirmCode);
      setStep(3);
    } catch (e) {
      setPayError("Something went wrong. Please try again.");
    }
    setWaiverSubmitting(false);
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
      <div style={{ width: "100%", maxWidth: 500, background: T.carbon, height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 40, borderLeft: `2px solid ${T.wire}` }}>
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
      <div style={{ width: "100%", maxWidth: 500, background: T.carbon, height: "100vh", overflowY: "auto", borderLeft: `2px solid ${T.wire}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 40 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.greenGlow, border: `2px solid ${T.green}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: T.green }}>✓</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: T.white, textAlign: "center" }}>You're booked</div>
        <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver, textAlign: "center", lineHeight: 1.75 }}>
          Your pontoon rental is confirmed and your waiver is on file. We'll reach out to coordinate trailering and launch details.
        </p>
        <div style={{ width: "100%", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: 20 }}>
          {[
            ["Confirmation", confirmCode],
            ["Date", fmtDate(rentalDate)],
            ["Duration", duration === "half_day" ? "Half Day" : "Full Day"],
            ["Destination", destination],
            ["Passengers", passengers],
            ["Total charged", fmtMoney(total)],
            ["Waiver", "Signed & on file ✓"],
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

  const stepLabels = ["Select", "Waiver", "Pay"];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,0.75)" }} />
      <div style={{ width: "100%", maxWidth: 520, background: T.carbon, height: "100vh", overflowY: "auto", borderLeft: `2px solid ${T.wire}`, display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "24px 28px 16px", borderBottom: `1px solid ${T.wire}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.white }}>Book Your Rental</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.silver, fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        {/* Step indicators */}
        <div style={{ display: "flex", padding: "12px 28px", borderBottom: `1px solid ${T.rim}`, flexShrink: 0 }}>
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
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#e07070", marginTop: 6 }}>That date is already booked — please choose another.</div>
                )}
              </div>

              {/* Duration */}
              <div>
                <label style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, display: "block", marginBottom: 10 }}>Duration</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[["half_day", "Half Day", rental.half_day_price], ["full_day", "Full Day", rental.full_day_price]].map(([val, label, price]) => (
                    <div key={val} onClick={() => setDuration(val)}
                      style={{ padding: "16px 14px", background: duration === val ? T.steel : T.gunmetal, border: `1px solid ${duration === val ? T.gold : T.wire}`, borderRadius: 10, cursor: "pointer", textAlign: "center" }}>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, color: duration === val ? T.gold : T.parchment }}>{label}</div>
                      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: T.white, marginTop: 4 }}>${price?.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Destination */}
              {rental.destinations?.length > 0 && (
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
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted, marginTop: 8 }}>Trailering to your chosen lake is included.</div>
                </div>
              )}

              {/* Passengers */}
              <div>
                <label style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, display: "block", marginBottom: 8 }}>Passengers (max {rental.capacity})</label>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <button onClick={() => setPassengers(p => Math.max(1, p - 1))} style={{ width: 34, height: 34, borderRadius: "50%", background: T.steel, border: `1px solid ${T.wire}`, color: T.white, fontSize: 18, cursor: "pointer" }}>−</button>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 18, color: T.white, minWidth: 20, textAlign: "center" }}>{passengers}</span>
                  <button onClick={() => setPassengers(p => Math.min(rental.capacity || 8, p + 1))} style={{ width: 34, height: 34, borderRadius: "50%", background: T.steel, border: `1px solid ${T.wire}`, color: T.white, fontSize: 18, cursor: "pointer" }}>+</button>
                </div>
              </div>

              {/* Special requests */}
              <div>
                <label style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, display: "block", marginBottom: 8 }}>Notes (optional)</label>
                <textarea value={requests} onChange={e => setRequests(e.target.value)} rows={2} placeholder="Anything we should know…"
                  style={{ width: "100%", background: T.gunmetal, border: `1px solid ${T.wire}`, borderRadius: 8, padding: "10px 12px", fontFamily: FONT_BODY, fontSize: 13, color: T.parchment, resize: "vertical", boxSizing: "border-box" }} />
              </div>

              {/* Price preview */}
              <div style={{ background: T.gunmetal, borderRadius: 8, padding: 14, border: `1px solid ${T.wire}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver }}>{duration === "half_day" ? "Half day" : "Full day"}</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment }}>${basePrice.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver }}>Platform fee ({Math.round((rental.platform_fee_rate || PLATFORM_FEE_RATE) * 100)}%)</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment }}>${platformFee.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: `1px solid ${T.rim}` }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: T.white }}>Total</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: T.gold }}>${total.toLocaleString()}</span>
                </div>
              </div>

              <GoldBtn disabled={!canAdvance1} onClick={() => setStep(2)}>Continue to Waiver →</GoldBtn>
            </div>
          )}

          {/* ── Step 2: Waiver ── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: T.white, marginBottom: 6 }}>Liability Waiver & Terms</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, lineHeight: 1.6 }}>
                  This waiver is legally binding. Read it fully before signing. Your signature is recorded with a timestamp and tied to your booking.
                </div>
              </div>

              {/* Terms scroll box */}
              <div style={{ background: T.gunmetal, border: `1px solid ${T.wire}`, borderRadius: 8, padding: "14px 16px", maxHeight: 220, overflowY: "auto" }}>
                <pre style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.silver, whiteSpace: "pre-wrap", lineHeight: 1.7, margin: 0 }}>{RENTAL_TERMS}</pre>
              </div>

              {/* Mandatory confirmations */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  [certConfirmed,      setCertConfirmed,      "I confirm that the designated operator holds a valid New York State Boating Safety Certificate or equivalent."],
                  [ageConfirmed,       setAgeConfirmed,       "I confirm that the designated operator is 21 years of age or older."],
                  [conditionConfirmed, setConditionConfirmed, "I acknowledge that the vessel is represented to be in good operating condition. I will inspect the vessel before departure and report any pre-existing issues within 15 minutes of launch. Failure to report constitutes acceptance of the vessel as received."],
                  [damageConfirmed,    setDamageConfirmed,    "I understand that I am fully responsible for all damage, mechanical failure, and structural failure that occurs during my rental period, and for any refunds or lost revenue owed to subsequent renters if the vessel is rendered unavailable as a result of my use."],
                  [termsRead,          setTermsRead,          "I have read the full Terms & Conditions and Liability Waiver above in their entirety and agree to be legally bound by all provisions, including Sections 5–9 covering vessel condition, damage, downstream rental impact, incident reporting, and recovery costs."],
                ].map(([val, setter, text], i) => (
                  <div key={i} onClick={() => setter(v => !v)} style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
                    <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${val ? T.gold : T.wire}`, background: val ? T.gold : "none", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.ink, fontSize: 12, fontWeight: 700 }}>
                      {val ? "✓" : ""}
                    </div>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, lineHeight: 1.6 }}>{text}</span>
                  </div>
                ))}
              </div>

              {/* Legal name */}
              <div>
                <label style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, display: "block", marginBottom: 8 }}>Your legal name <span style={{ color: T.red }}>*</span></label>
                <input value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="First Last"
                  style={{ width: "100%", padding: "12px 14px", background: T.gunmetal, border: `1px solid ${T.wire}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, boxSizing: "border-box" }} />
              </div>

              {/* Typed signature */}
              <div>
                <label style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, display: "block", marginBottom: 8 }}>
                  Type your full name as your legal signature <span style={{ color: T.red }}>*</span>
                </label>
                <input value={signatureText} onChange={e => setSignatureText(e.target.value)} placeholder="Sign here — type your full legal name"
                  style={{ width: "100%", padding: "12px 14px", background: T.gunmetal, border: `1px solid ${signatureText ? T.gold : T.wire}`, borderRadius: 8, fontFamily: "'Courier New', monospace", fontSize: 15, color: T.gold, boxSizing: "border-box", letterSpacing: "0.04em" }} />
                <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted, marginTop: 6 }}>
                  By typing your name you are providing a legally binding electronic signature under the E-SIGN Act.
                </div>
              </div>

              {/* Emergency contact */}
              <div>
                <label style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, display: "block", marginBottom: 8 }}>Emergency contact name <span style={{ color: T.red }}>*</span></label>
                <input value={emergencyName} onChange={e => setEmergencyName(e.target.value)} placeholder="Full name"
                  style={{ width: "100%", padding: "12px 14px", background: T.gunmetal, border: `1px solid ${T.wire}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, boxSizing: "border-box", marginBottom: 10 }} />
                <label style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, display: "block", marginBottom: 8 }}>Emergency contact phone <span style={{ color: T.red }}>*</span></label>
                <input value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} placeholder="(555) 000-0000" type="tel"
                  style={{ width: "100%", padding: "12px 14px", background: T.gunmetal, border: `1px solid ${T.wire}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, boxSizing: "border-box" }} />
              </div>

              {payError && <div style={{ padding: 12, background: "rgba(138,58,58,0.15)", border: `1px solid ${T.red}`, borderRadius: 6, fontFamily: FONT_BODY, fontSize: 13, color: "#e07070" }}>{payError}</div>}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: 13, background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 14, color: T.silver, cursor: "pointer" }}>← Back</button>
                <GoldBtn disabled={!canAdvance2 || waiverSubmitting} onClick={handleWaiverAndPay} style={{ flex: 2 }}>
                  {waiverSubmitting ? "Processing…" : "Sign & Proceed to Payment →"}
                </GoldBtn>
              </div>
            </div>
          )}

          {/* ── Step 3: Payment ── */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: T.white }}>Secure Payment</div>

              {/* Waiver confirmation badge */}
              <div style={{ background: T.greenGlow, border: `1px solid ${T.green}40`, borderRadius: 8, padding: "12px 16px", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: T.green, fontSize: 16 }}>✓</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash }}>Waiver signed and on file as <strong>{legalName}</strong></span>
              </div>

              <div style={{ background: T.gunmetal, borderRadius: 8, padding: 14, border: `1px solid ${T.wire}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver }}>{fmtDate(rentalDate)} · {duration === "half_day" ? "Half Day" : "Full Day"} · {destination}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: `1px solid ${T.rim}` }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: T.white }}>Total due today</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, color: T.gold }}>${total.toLocaleString()}</span>
                </div>
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
  const [rental, setRental]             = useState(null);
  const [blockedDates, setBlockedDates] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [bookingOpen, setBookingOpen]   = useState(false);
  const [photoIdx, setPhotoIdx]         = useState(0);
  const [showFullTerms, setShowFullTerms] = useState(false);

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
                <button onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", color: T.white, fontSize: 22, width: 40, height: 40, borderRadius: "50%", cursor: "pointer" }}>‹</button>
                <button onClick={() => setPhotoIdx(i => (i + 1) % photos.length)} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", color: T.white, fontSize: 22, width: 40, height: 40, borderRadius: "50%", cursor: "pointer" }}>›</button>
              </>
            )}
          </>
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0b1a24 0%, #152018 100%)" }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(8,10,11,0.2), rgba(8,10,11,0.75) 80%, rgba(8,10,11,1))" }} />
        <button onClick={() => window.location.href = "/rentals"} style={{ position: "absolute", top: 20, left: 20, background: "rgba(0,0,0,0.5)", border: "none", color: T.white, fontFamily: FONT_BODY, fontSize: 13, padding: "8px 14px", borderRadius: 6, cursor: "pointer" }}>← Rentals</button>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 40px 48px" }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: T.gold, marginBottom: 12 }}>{rental.vessel_length} {rental.vessel_type}</div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(32px,5vw,60px)", color: T.white, margin: "0 0 8px", fontWeight: 400, lineHeight: 1.1 }}>{rental.name}</h1>
          {rental.tagline && <p style={{ fontFamily: FONT_BODY, fontSize: 16, color: T.ash, margin: "0 0 16px" }}>{rental.tagline}</p>}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver }}>📍 {rental.location}</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver }}>Up to {rental.capacity} passengers</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>

        {/* Pricing + CTA */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, padding: "32px 0", borderBottom: `1px solid ${T.wire}` }}>
          <div style={{ display: "flex", gap: 32 }}>
            {rental.half_day_price && <div><span style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: T.white }}>${rental.half_day_price.toLocaleString()}</span><span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver, marginLeft: 6 }}>half day</span></div>}
            {rental.full_day_price && <div><span style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: T.white }}>${rental.full_day_price.toLocaleString()}</span><span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver, marginLeft: 6 }}>full day</span></div>}
          </div>
          <button onClick={() => setBookingOpen(true)} style={{ padding: "14px 32px", background: T.gold, border: "none", borderRadius: 8, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: T.ink, cursor: "pointer" }}>Book This Boat</button>
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
            <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver, margin: "0 0 20px" }}>We trailer the boat to your chosen lake — no additional charge.</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {rental.destinations.map(dest => (
                <div key={dest} style={{ padding: "12px 20px", background: T.gunmetal, border: `1px solid ${T.wire}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 14, color: T.parchment }}>🏞️ {dest}</div>
              ))}
            </div>
          </div>
        )}

        {/* Requirements */}
        <div style={{ padding: "32px 0", borderBottom: `1px solid ${T.wire}` }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.white, margin: "0 0 16px", fontWeight: 400 }}>Operator Requirements</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              ["21+", "The designated operator must be 21 years of age or older."],
              ["NYS Cert", "A valid New York State Boating Safety Certificate (or equivalent) is required to operate."],
              ["No alcohol", "Operating under the influence of alcohol or substances is illegal and grounds for immediate termination without refund."],
              ["8 max", "Maximum of 8 passengers. Exceeding capacity voids the rental agreement."],
            ].map(([badge, text]) => (
              <div key={badge} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "12px 16px", background: T.gunmetal, borderRadius: 8, border: `1px solid ${T.rim}` }}>
                <div style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 4, padding: "3px 8px", fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.gold, whiteSpace: "nowrap", flexShrink: 0 }}>{badge}</div>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, lineHeight: 1.6 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Terms & Conditions summary */}
        <div style={{ padding: "32px 0", borderBottom: `1px solid ${T.wire}` }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.white, margin: "0 0 16px", fontWeight: 400 }}>Terms & Conditions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["Vessel condition", "You inspect and accept the vessel before departure. Any pre-existing damage must be reported within 15 minutes of launch — after that, you own it."],
              ["Damage & failure", "You are responsible for all damage, mechanical failure, and structural failure occurring during your rental, regardless of cause."],
              ["Downstream impact", "If damage during your rental forces us to refund a subsequent booking, you are responsible for that refund and any lost revenue."],
              ["Incident reporting", "Any incident must be reported within 1 hour. Failure to report creates a presumption of renter fault."],
              ["Recovery costs", "If the vessel must be towed or recovered due to your rental, you pay all associated costs."],
              ["Cancellation", "Full refund if cancelled 72+ hours before rental date. Non-refundable within 72 hours."],
              ["Late return", "$100/hour or partial hour past agreed return time."],
              ["Weather", "Severe weather (lightning, winds 20+ mph, USCG advisory) — full refund or reschedule. Minor discomfort is not a cancellation reason."],
            ].map(([heading, text]) => (
              <div key={heading} style={{ padding: "12px 16px", background: T.gunmetal, borderRadius: 8, border: `1px solid ${T.rim}` }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.gold, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{heading}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, lineHeight: 1.6 }}>{text}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setShowFullTerms(v => !v)}
            style={{ marginTop: 14, background: "none", border: "none", fontFamily: FONT_BODY, fontSize: 13, color: T.gold, cursor: "pointer", padding: 0 }}>
            {showFullTerms ? "Hide full agreement ↑" : "Read full Terms & Liability Waiver ↓"}
          </button>
          {showFullTerms && (
            <div style={{ marginTop: 14, background: T.gunmetal, border: `1px solid ${T.wire}`, borderRadius: 8, padding: 16, maxHeight: 340, overflowY: "auto" }}>
              <pre style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.silver, whiteSpace: "pre-wrap", lineHeight: 1.7, margin: 0 }}>{RENTAL_TERMS}</pre>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div style={{ padding: "40px 0 60px", textAlign: "center" }}>
          <button onClick={() => setBookingOpen(true)} style={{ padding: "16px 48px", background: T.gold, border: "none", borderRadius: 8, fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, color: T.ink, cursor: "pointer" }}>Book This Boat</button>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted, marginTop: 10 }}>Signed liability waiver required at checkout · Limited availability</div>
        </div>
      </div>

      {bookingOpen && <BookingPanel rental={rental} blockedDates={blockedDates} onClose={() => setBookingOpen(false)} />}
    </div>
  );
}
