"use client";
import { useState, useEffect } from "react";
import { T, FONT_DISPLAY, FONT_BODY, GUEST_SERVICE_FEE_RATE } from "@/app/lib/theme";
import { useCart } from "@/app/lib/cart-context";
import { getSupabase } from "@/app/lib/supabase-browser";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import PaymentMethodSelector from "@/app/components/PaymentMethodSelector";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const TYPE_LABELS = { guide: "Guide Experience", property: "Property Stay", rental: "Rental" };
const TYPE_COLORS = { guide: T.gold, property: T.green, rental: T.blue };

const STRIPE_APPEARANCE = {
  theme: "night",
  variables: { colorPrimary: "#c9973a", colorBackground: "#1f2428", colorText: "#e8e2d8" },
};

// ─── PAYMENT FORM ────────────────────────────────────────────────────────────
function PaymentForm({ label, amount, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [savedPM, setSavedPM] = useState(undefined); // undefined = loading, null = new card, string = PM id

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe) return;
    setProcessing(true);
    setError(null);

    try {
      let result;
      if (savedPM) {
        // Pay with saved card
        result = await stripe.confirmPayment({
          clientSecret: elements ? undefined : undefined,
          confirmParams: { payment_method: savedPM, return_url: window.location.href },
          redirect: "if_required",
        });
        // For saved cards we need to use confirmCardPayment
        result = await stripe.confirmCardPayment(
          // We need the clientSecret from the Elements provider
          document.querySelector("[data-client-secret]")?.dataset?.clientSecret || "",
          { payment_method: savedPM }
        );
      } else {
        // Pay with new card via Elements
        const { error: submitError } = await elements.submit();
        if (submitError) { setError(submitError.message); setProcessing(false); return; }

        result = await stripe.confirmPayment({ elements, redirect: "if_required" });
      }

      if (result.error) {
        setError(result.error.message);
        setProcessing(false);
        if (onError) onError(result.error.message);
      } else if (result.paymentIntent?.status === "succeeded") {
        onSuccess(result.paymentIntent);
      } else {
        setError("Payment is being processed.");
        setProcessing(false);
      }
    } catch (err) {
      setError(err.message || "Payment failed");
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentMethodSelector selectedId={savedPM} onSelect={(id) => setSavedPM(id)} />
      {!savedPM && <PaymentElement options={{ layout: "tabs" }} />}
      {error && (
        <div style={{ marginTop: 12, padding: 10, background: "rgba(231,76,60,0.1)", border: "1px solid #e74c3c", borderRadius: 6, fontFamily: FONT_BODY, fontSize: 13, color: "#e74c3c" }}>
          {error}
        </div>
      )}
      <button type="submit" disabled={!stripe || processing}
        style={{ width: "100%", marginTop: 16, padding: 15, background: T.gold, border: "none", borderRadius: 8, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: T.ink, cursor: "pointer", opacity: processing ? 0.6 : 1 }}>
        {processing ? "Processing..." : `Pay $${(amount / 100).toFixed(2)} — ${label}`}
      </button>
    </form>
  );
}

// ─── MAIN CHECKOUT PAGE ──────────────────────────────────────────────────────
export default function CartCheckout() {
  const { items, tripName, tripPlanId, clearCart } = useCart();
  const [step, setStep] = useState("review"); // review | paying | done
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tripBookings, setTripBookings] = useState([]);
  const [paymentQueue, setPaymentQueue] = useState([]);
  const [currentPayIdx, setCurrentPayIdx] = useState(0);
  const [clientSecrets, setClientSecrets] = useState({});
  const [completedPayments, setCompletedPayments] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent("/cart/checkout")}`;
      return;
    }
    setUser(user);
    setLoading(false);
  };

  const getAuthHeader = async () => {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  };

  // Step 1: Create bookings then build payment queue
  const startCheckout = async () => {
    setError(null);
    setStep("paying");

    try {
      const headers = await getAuthHeader();

      // Create trip + bookings
      const res = await fetch("/api/cart/checkout", {
        method: "POST",
        headers,
        body: JSON.stringify({ items, tripName, tripPlanId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create bookings");

      setTripBookings(data.bookings);

      // Build payment queue — one entry per booking that needs payment
      const queue = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const booking = data.bookings[i];
        if (!booking) continue;

        if (item.type === "guide") {
          const depositCents = Math.round((item.totalPrice || 0) * 0.25);
          queue.push({
            label: `${item.guideName} — Deposit`,
            amount: depositCents,
            bookingId: booking.bookingId,
            item,
            apiRoute: "/api/stripe/create-payment-intent",
            body: {
              bookingId: booking.bookingId,
              amount: depositCents,
              guideId: item.guideId,
              guestEmail: user.email,
              type: "deposit",
            },
          });
        } else if (item.type === "property") {
          queue.push({
            label: `${item.propertyName} — Full Payment`,
            amount: item.total,
            bookingId: booking.bookingId,
            item,
            apiRoute: "/api/properties/create-payment-intent",
            body: {
              propertyId: item.propertyId,
              checkIn: item.checkIn,
              checkOut: item.checkOut,
              guests: item.guests,
              nights: item.nights,
              baseTotal: item.baseTotal,
              cleaningFee: item.cleaningFee,
              platformFee: item.platformFee,
              damageWaiver: item.damageWaiver,
              taxAmount: item.taxAmount,
              total: item.total,
              securityDeposit: item.securityDeposit || 50000,
              damageWaiverOpted: item.damageWaiverOpted || false,
              specialRequests: item.specialRequests || "",
              guestEmail: user.email,
            },
          });
        } else if (item.type === "rental") {
          queue.push({
            label: `${item.rentalName} — Full Payment`,
            amount: item.total,
            bookingId: booking.bookingId,
            item,
            apiRoute: "/api/rentals/create-payment-intent",
            body: {
              rentalId: item.rentalId,
              rentalDate: item.rentalDate,
              duration: item.duration,
              destination: item.destination || "",
              passengers: item.passengers || 1,
              basePrice: item.basePrice,
              platformFee: item.platformFee,
              total: item.total,
              guestEmail: user.email,
              specialRequests: item.specialRequests || "",
            },
          });
        }
      }

      setPaymentQueue(queue);
      setCurrentPayIdx(0);

      // Create first payment intent
      if (queue.length > 0) {
        await createPaymentIntent(queue[0]);
      }
    } catch (err) {
      setError(err.message);
      setStep("review");
    }
  };

  const createPaymentIntent = async (queueItem) => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(queueItem.apiRoute, {
        method: "POST",
        headers,
        body: JSON.stringify(queueItem.body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create payment");

      setClientSecrets(prev => ({ ...prev, [queueItem.bookingId]: data.clientSecret }));
    } catch (err) {
      setError(`Payment setup failed for ${queueItem.label}: ${err.message}`);
    }
  };

  const handlePaymentSuccess = async (paymentIntent) => {
    const completed = [...completedPayments, paymentQueue[currentPayIdx]];
    setCompletedPayments(completed);

    const nextIdx = currentPayIdx + 1;
    if (nextIdx < paymentQueue.length) {
      setCurrentPayIdx(nextIdx);
      await createPaymentIntent(paymentQueue[nextIdx]);
    } else {
      // All payments done
      setStep("done");
      clearCart();
    }
  };

  if (loading) {
    return (
      <div style={{ background: T.void, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 16, color: T.silver }}>Loading…</div>
      </div>
    );
  }

  if (items.length === 0 && step !== "done") {
    return (
      <div style={{ background: T.void, minHeight: "100vh" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: T.white, marginBottom: 12 }}>Your cart is empty</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver, marginBottom: 32 }}>Browse guides, properties, or rentals to start building your trip.</div>
          <button onClick={() => window.location.href = "/search"} style={{ background: T.gold, color: T.ink, border: "none", borderRadius: 6, padding: "14px 28px", fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Explore Guides</button>
        </div>
      </div>
    );
  }

  const totalCents = items.reduce((sum, item) => sum + (item.type === "guide" ? (item.totalPrice || 0) : (item.total || 0)), 0);
  const depositTotal = items.reduce((sum, item) => {
    if (item.type === "guide") return sum + Math.round((item.totalPrice || 0) * 0.25);
    return sum + (item.total || 0);
  }, 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Barlow:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.void};}
      `}</style>

      {/* NAV */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: T.void, borderBottom: `1px solid ${T.wire}`, height: 64, display: "flex", alignItems: "center" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 40px", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: T.gold, letterSpacing: "0.14em", fontWeight: 500, cursor: "pointer" }} onClick={() => window.location.href = "/"}>ROM</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver }}>Checkout</div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* ── STEP: REVIEW ── */}
        {step === "review" && (
          <>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: T.white, marginBottom: 8 }}>
              {tripName || "Your Trip"}
            </div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver, marginBottom: 32 }}>
              {items.length} item{items.length !== 1 ? "s" : ""} — Review and confirm below
            </div>

            {error && (
              <div style={{ marginBottom: 20, padding: 14, background: T.redGlow, border: `1px solid ${T.red}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 13, color: "#d88" }}>
                {error}
              </div>
            )}

            {/* Multi-guide conflict warnings */}
            {(() => {
              const guideItems = items.filter(i => i.type === "guide" && i.date);
              const dateGroups = {};
              guideItems.forEach(i => { dateGroups[i.date] = (dateGroups[i.date] || []).concat(i); });
              const conflicts = Object.entries(dateGroups).filter(([, group]) => group.length > 1);
              if (conflicts.length === 0) return null;
              return (
                <div style={{ marginBottom: 20, padding: 16, background: T.goldGlow, border: `1px solid ${T.gold}`, borderRadius: 8 }}>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: T.gold, marginBottom: 6 }}>Scheduling Notice</div>
                  {conflicts.map(([date, group]) => (
                    <div key={date} style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, marginBottom: 4 }}>
                      You have {group.length} guide experiences on <strong style={{ color: T.parchment }}>{date}</strong>: {group.map(g => g.guideName).join(" & ")}.
                    </div>
                  ))}
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.silver, marginTop: 8 }}>
                    Each booking is independent. If you miss one, that deposit is non-refundable. Consider adjusting dates if timing is tight.
                  </div>
                </div>
              );
            })()}

            <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
              {/* Items list */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                {items.map((item, idx) => {
                  const name = item.type === "guide" ? item.guideName : item.type === "property" ? item.propertyName : item.rentalName;
                  const subtitle = item.type === "guide"
                    ? `${item.packageTitle} · ${item.date} · ${item.guests} guest${item.guests !== 1 ? "s" : ""}`
                    : item.type === "property"
                    ? `${item.checkIn} → ${item.checkOut} · ${item.nights} night${item.nights !== 1 ? "s" : ""}`
                    : `${item.rentalDate} · ${item.duration === "half_day" ? "Half Day" : "Full Day"}`;
                  const price = item.type === "guide" ? item.totalPrice : item.total;
                  const deposit = item.type === "guide" ? Math.round(price * 0.25) : price;

                  return (
                    <div key={idx} style={{ background: T.steel, border: `1px solid ${T.wire}`, borderLeft: `3px solid ${TYPE_COLORS[item.type]}`, borderRadius: 8, padding: "20px 22px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <span style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: TYPE_COLORS[item.type], textTransform: "uppercase", letterSpacing: "0.08em" }}>
                            {TYPE_LABELS[item.type]}
                          </span>
                          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.white, marginTop: 4 }}>{name}</div>
                          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, marginTop: 4 }}>{subtitle}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.gold }}>${(price / 100).toFixed(0)}</div>
                          {item.type === "guide" && (
                            <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.silver, marginTop: 4 }}>
                              ${(deposit / 100).toFixed(0)} deposit due now
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary sidebar */}
              <div style={{ width: 300, flexShrink: 0, background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 10, padding: 24, position: "sticky", top: 88 }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Order Summary</div>

                {items.map((item, idx) => {
                  const name = item.type === "guide" ? item.guideName : item.type === "property" ? item.propertyName : item.rentalName;
                  const price = item.type === "guide" ? item.totalPrice : item.total;
                  return (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.ash, flex: 1, marginRight: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                      <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.parchment, flexShrink: 0 }}>${(price / 100).toFixed(0)}</span>
                    </div>
                  );
                })}

                <div style={{ borderTop: `1px solid ${T.wire}`, margin: "12px 0", paddingTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver }}>Trip Total</span>
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.white }}>${(totalCents / 100).toFixed(0)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: T.gold }}>Due Now</span>
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.gold }}>${(depositTotal / 100).toFixed(0)}</span>
                  </div>
                  {items.some(i => i.type === "guide") && (
                    <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted, marginTop: 8 }}>
                      Guide deposits are 25%. Balance is charged 14 days before your trip.
                    </div>
                  )}
                </div>

                <button onClick={startCheckout}
                  style={{ width: "100%", marginTop: 16, background: T.gold, color: T.ink, border: "none", borderRadius: 6, padding: "14px 0", fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                  Continue to Payment
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP: PAYING ── */}
        {step === "paying" && paymentQueue.length > 0 && (
          <>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: T.white, marginBottom: 8 }}>Payment</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver, marginBottom: 32 }}>
              Payment {currentPayIdx + 1} of {paymentQueue.length}
              {completedPayments.length > 0 && ` — ${completedPayments.length} completed`}
            </div>

            {error && (
              <div style={{ marginBottom: 20, padding: 14, background: T.redGlow, border: `1px solid ${T.red}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 13, color: "#d88" }}>
                {error}
              </div>
            )}

            {/* Progress */}
            <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
              {paymentQueue.map((q, idx) => (
                <div key={idx} style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: idx < currentPayIdx ? T.green : idx === currentPayIdx ? T.gold : T.rim,
                }} />
              ))}
            </div>

            {/* Current payment */}
            {(() => {
              const current = paymentQueue[currentPayIdx];
              const secret = clientSecrets[current?.bookingId];
              if (!current || !secret) {
                return <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver }}>Setting up payment…</div>;
              }

              return (
                <div style={{ maxWidth: 500 }}>
                  <div style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                      {current.label}
                    </div>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.gold }}>
                      ${(current.amount / 100).toFixed(2)}
                    </div>
                  </div>

                  <Elements stripe={stripePromise} options={{ clientSecret: secret, appearance: STRIPE_APPEARANCE }} key={secret}>
                    <PaymentForm
                      label={current.label}
                      amount={current.amount}
                      onSuccess={handlePaymentSuccess}
                      onError={(msg) => setError(msg)}
                    />
                  </Elements>
                </div>
              );
            })()}
          </>
        )}

        {/* ── STEP: DONE ── */}
        {step === "done" && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 44, color: T.gold, marginBottom: 12 }}>Trip Booked</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 16, color: T.ash, marginBottom: 36 }}>
              Your trip is confirmed. You'll receive confirmation emails for each booking.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 500, margin: "0 auto", marginBottom: 36 }}>
              {tripBookings.map((b, idx) => (
                <div key={idx} style={{ background: T.steel, border: `1px solid ${T.wire}`, borderLeft: `3px solid ${T.green}`, borderRadius: 8, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: T.silver, textTransform: "uppercase" }}>{b.type}</span>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, marginTop: 2 }}>{b.confirmCode}</div>
                  </div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.green, fontWeight: 600 }}>Confirmed</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={() => window.location.href = "/dashboard"} style={{ background: T.gold, color: T.ink, border: "none", borderRadius: 6, padding: "14px 28px", fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>View My Trips</button>
              <button onClick={() => window.location.href = "/search"} style={{ background: "transparent", color: T.gold, border: `1.5px solid ${T.gold}`, borderRadius: 6, padding: "14px 28px", fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Keep Exploring</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
