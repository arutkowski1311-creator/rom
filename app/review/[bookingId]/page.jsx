"use client";
import { useState, useEffect } from "react";
import React from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";

export default function ReviewPage({ params }) {
  const { bookingId } = React.use(params);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [guideName, setGuideName] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Form state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (bookingId) loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAuthError(true); setLoading(false); return; }

      const { data: b } = await supabase
        .from("bookings")
        .select("id, guide_id, guest_id, guest_name, package_title, trip_date, status")
        .eq("id", bookingId)
        .single();

      if (!b) { setNotFound(true); setLoading(false); return; }
      if (b.guest_id !== user.id) { setNotFound(true); setLoading(false); return; }
      setBooking(b);

      // Check if already reviewed
      const { data: existing } = await supabase
        .from("reviews")
        .select("id")
        .eq("booking_id", bookingId)
        .single();
      if (existing) { setAlreadyReviewed(true); setLoading(false); return; }

      // Get guide name
      const { data: guide } = await supabase.from("guides").select("profile_id").eq("id", b.guide_id).single();
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", guide?.profile_id).single();
      setGuideName(profile?.full_name || "your guide");
    } catch (e) {
      console.error("Review page load error:", e);
      setNotFound(true);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!rating || text.length < 20) {
      setError("Please select a rating and write at least 20 characters.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

      // Insert review
      await supabase.from("reviews").insert({
        guide_id: booking.guide_id,
        reviewer_id: user.id,
        booking_id: bookingId,
        rating,
        body: text,
        trip_label: booking.package_title || "",
        solicited: true,
      });

      // Update guide's rating and review count
      const { data: allReviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("guide_id", booking.guide_id);
      if (allReviews?.length) {
        const avg = (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(2);
        await supabase.from("guides").update({
          rating: avg,
          review_count: allReviews.length,
        }).eq("id", booking.guide_id);
      }

      // Notify guide
      await supabase.from("guide_notifications").insert({
        guide_id: booking.guide_id,
        type: "review_received",
        title: `${profile?.full_name || "A guest"} left you a ${rating}-star review`,
        body: text.length > 100 ? text.substring(0, 100) + "…" : text,
        metadata: { booking_id: bookingId, rating },
      });

      // Email notification
      fetch("/api/reviews/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideId: booking.guide_id, reviewerName: profile?.full_name || "Guest", rating, body: text, tripLabel: booking.package_title }),
      }).catch(console.error);

      setDone(true);
    } catch (e) {
      setError(e.message || "Something went wrong.");
    }
    setSubmitting(false);
  };

  const LABELS = ["", "Poor", "Below average", "Good", "Great", "Outstanding"];

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.void, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: T.gold, letterSpacing: "0.14em" }}>RŌM</div>
    </div>
  );

  if (authError) return (
    <div style={{ minHeight: "100vh", background: T.void, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 40 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: T.white }}>Sign in to leave a review</div>
      <button onClick={() => window.location.href = `/login?redirect=${encodeURIComponent(`/review/${bookingId}`)}`}
        style={{ marginTop: 12, background: T.gold, border: "none", borderRadius: 6, padding: "12px 28px", fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: T.ink, cursor: "pointer" }}>Sign In</button>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: "100vh", background: T.void, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: T.white }}>Review not found</div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver }}>This booking doesn't exist or isn't yours.</div>
    </div>
  );

  if (alreadyReviewed) return (
    <div style={{ minHeight: "100vh", background: T.void, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 40 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.greenGlow, border: `2px solid ${T.green}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: T.green }}>✓</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: T.white }}>Already reviewed</div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver }}>You've already left a review for this trip. Thank you!</div>
      <button onClick={() => window.location.href = "/dashboard"} style={{ marginTop: 12, background: T.gold, border: "none", borderRadius: 6, padding: "12px 28px", fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: T.ink, cursor: "pointer" }}>Go to Dashboard</button>
    </div>
  );

  if (done) return (
    <div style={{ minHeight: "100vh", background: T.void, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 40 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.greenGlow, border: `2px solid ${T.green}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: T.green }}>✓</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: T.white }}>Thank you!</div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver, textAlign: "center", maxWidth: 400 }}>
        Your review of {guideName} has been posted. It helps other travelers find great experiences.
      </div>
      <button onClick={() => window.location.href = "/dashboard"} style={{ marginTop: 16, background: T.gold, border: "none", borderRadius: 6, padding: "12px 28px", fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: T.ink, cursor: "pointer" }}>Go to Dashboard</button>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Barlow:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.void};}
        ::placeholder{color:${T.muted}!important;}
      `}</style>

      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 64, background: T.void, borderBottom: `1px solid ${T.wire}`, display: "flex", alignItems: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 24px", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div onClick={() => window.location.href = "/"} style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.gold, letterSpacing: "0.16em", cursor: "pointer" }}>RŌM</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver }}>Leave a Review</div>
        </div>
      </div>

      <div style={{ minHeight: "100vh", paddingTop: 64, display: "flex", justifyContent: "center", padding: "100px 24px 60px" }}>
        <div style={{ width: "100%", maxWidth: 540 }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 42, color: T.white, fontWeight: 400, marginBottom: 8 }}>How was your trip?</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver, lineHeight: 1.6 }}>
              {booking?.package_title || "Your trip"} with {guideName} on {new Date(booking?.trip_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>

          {/* Rating */}
          <div style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 10, padding: 28, marginBottom: 20, textAlign: "center" }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Your Rating</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <span key={i} onMouseEnter={() => setHoverRating(i)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(i)}
                  style={{ fontSize: 44, cursor: "pointer", color: i <= (hoverRating || rating) ? T.gold : T.wire, transition: "color 0.1s, transform 0.1s", transform: i <= (hoverRating || rating) ? "scale(1.1)" : "scale(1)" }}>★</span>
              ))}
            </div>
            {(hoverRating || rating) > 0 && (
              <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.gold, marginTop: 12, fontWeight: 600 }}>{LABELS[hoverRating || rating]}</div>
            )}
          </div>

          {/* Review text */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Your Review</div>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={6}
              placeholder="Tell future guests what made this trip worth booking — what you caught, what surprised you, what you'd tell a friend."
              style={{ width: "100%", boxSizing: "border-box", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: "14px 16px", fontFamily: FONT_BODY, fontSize: 15, color: T.parchment, outline: "none", resize: "vertical", lineHeight: 1.7 }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: text.length < 20 ? T.muted : T.green }}>{text.length < 20 ? `${20 - text.length} more characters needed` : "✓ Good to go"}</span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted }}>{text.length} / 1000</span>
            </div>
          </div>

          {error && (
            <div style={{ background: T.redGlow, border: `1px solid ${T.red}`, borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontFamily: FONT_BODY, fontSize: 14, color: "#f08080" }}>{error}</div>
          )}

          <button onClick={handleSubmit} disabled={submitting || !rating || text.length < 20}
            style={{
              width: "100%", padding: "16px", background: T.gold, border: "none", borderRadius: 8,
              fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, color: T.ink, cursor: "pointer",
              opacity: (submitting || !rating || text.length < 20) ? 0.5 : 1, marginBottom: 12,
            }}>
            {submitting ? "Submitting…" : "Submit Review"}
          </button>

          <div style={{ textAlign: "center" }}>
            <button onClick={() => window.location.href = "/dashboard"} style={{ background: "none", border: "none", fontFamily: FONT_BODY, fontSize: 13, color: T.muted, cursor: "pointer" }}>Skip — I'll do this later</button>
          </div>
        </div>
      </div>
    </>
  );
}
