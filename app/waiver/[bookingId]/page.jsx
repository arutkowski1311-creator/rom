"use client";
import { useState, useEffect } from "react";
import React from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";

export default function WaiverPage({ params }) {
  const { bookingId } = React.use(params);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [guideName, setGuideName] = useState("");
  const [waiverContent, setWaiverContent] = useState("");
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Form state
  const [legalName, setLegalName] = useState("");
  const [signature, setSignature] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (bookingId) loadWaiver();
  }, [bookingId]);

  const loadWaiver = async () => {
    try {
      const supabase = getSupabase();

      // Fetch booking
      const { data: b } = await supabase
        .from("bookings")
        .select("id, guide_id, guest_id, guest_name, guest_email, package_title, trip_date, waiver_signed, status")
        .eq("id", bookingId)
        .single();

      if (!b) { setNotFound(true); setLoading(false); return; }
      setBooking(b);

      if (b.waiver_signed) { setAlreadySigned(true); setLoading(false); return; }

      // Get guide name
      const { data: guide } = await supabase.from("guides").select("profile_id").eq("id", b.guide_id).single();
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", guide?.profile_id).single();
      setGuideName(profile?.full_name || "your guide");

      // Pre-fill guest name
      if (b.guest_name) setLegalName(b.guest_name);

      // Get waiver template
      const res = await fetch(`/api/waivers?guideId=${b.guide_id}`);
      const data = await res.json();
      if (data.templates?.length > 0) {
        setWaiverContent(data.templates[0].content);
      }
    } catch (e) {
      console.error("Waiver load error:", e);
      setNotFound(true);
    }
    setLoading(false);
  };

  const handleSign = async () => {
    if (!legalName || !signature || !agreed) {
      setError("Please fill in your legal name, type your signature, and agree to the terms.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/waivers/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          guestName: legalName,
          guestEmail: booking?.guest_email,
          signatureText: signature,
          emergencyContactName: emergencyName || null,
          emergencyContactPhone: emergencyPhone || null,
          emergencyContactRelation: emergencyRelation || null,
          medicalNotes: medicalNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sign waiver");
      setDone(true);
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  // Styles
  const input = { width: "100%", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: "12px 16px", fontFamily: FONT_BODY, fontSize: 15, color: T.parchment, outline: "none", boxSizing: "border-box" };
  const label = { fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: T.ash, display: "block", marginBottom: 8 };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.void, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: T.gold, letterSpacing: "0.14em" }}>RŌM</div>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: "100vh", background: T.void, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: T.white }}>Waiver not found</div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver }}>This link may have expired or the booking doesn't exist.</div>
    </div>
  );

  if (alreadySigned) return (
    <div style={{ minHeight: "100vh", background: T.void, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 40 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.greenGlow, border: `2px solid ${T.green}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: T.green }}>✓</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: T.white }}>Waiver already signed</div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver, textAlign: "center" }}>
        You've already signed the waiver for {booking?.package_title || "this trip"}. You're all set.
      </div>
      <button onClick={() => window.location.href = "/dashboard"} style={{ marginTop: 12, background: T.gold, border: "none", borderRadius: 6, padding: "12px 28px", fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: T.ink, cursor: "pointer" }}>Go to Dashboard</button>
    </div>
  );

  if (done) return (
    <div style={{ minHeight: "100vh", background: T.void, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 40 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.greenGlow, border: `2px solid ${T.green}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: T.green }}>✓</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: T.white }}>Waiver signed</div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver, textAlign: "center", maxWidth: 400 }}>
        You're all set for {booking?.package_title || "your trip"} with {guideName} on {new Date(booking?.trip_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
      </div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.muted, marginTop: 8 }}>A confirmation has been sent to your email.</div>
      <button onClick={() => window.location.href = "/dashboard"} style={{ marginTop: 16, background: T.gold, border: "none", borderRadius: 6, padding: "12px 28px", fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: T.ink, cursor: "pointer" }}>Go to Dashboard</button>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Barlow:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.void};}
        input::placeholder,textarea::placeholder{color:${T.muted}!important;}
      `}</style>

      {/* Nav */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 64, background: T.void, borderBottom: `1px solid ${T.wire}`, display: "flex", alignItems: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div onClick={() => window.location.href = "/"} style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.gold, letterSpacing: "0.16em", cursor: "pointer" }}>RŌM</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver }}>Liability Waiver</div>
        </div>
      </div>

      <div style={{ minHeight: "100vh", paddingTop: 64, display: "flex", justifyContent: "center", padding: "100px 24px 60px" }}>
        <div style={{ width: "100%", maxWidth: 640 }}>
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 42, color: T.white, fontWeight: 400, marginBottom: 8 }}>Sign your waiver</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver, lineHeight: 1.6 }}>
              Required for {booking?.package_title || "your trip"} with {guideName} on {new Date(booking?.trip_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}.
            </div>
          </div>

          {/* Waiver Text */}
          <div style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 10, padding: 28, marginBottom: 24, maxHeight: 400, overflowY: "auto" }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Liability Waiver</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.ash, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{waiverContent}</div>
          </div>

          {/* Legal Name */}
          <div style={{ marginBottom: 20 }}>
            <label style={label}>Legal Full Name *</label>
            <input value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="As it appears on your ID" style={input} />
          </div>

          {/* Emergency Contact */}
          <div style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Emergency Contact</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={label}>Name *</label>
                <input value={emergencyName} onChange={e => setEmergencyName(e.target.value)} placeholder="Contact name" style={input} />
              </div>
              <div>
                <label style={label}>Phone *</label>
                <input value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} placeholder="(555) 123-4567" style={input} />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={label}>Relationship</label>
              <input value={emergencyRelation} onChange={e => setEmergencyRelation(e.target.value)} placeholder="e.g. Spouse, Parent, Friend" style={input} />
            </div>
          </div>

          {/* Medical Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={label}>Medical Conditions or Allergies (optional)</label>
            <textarea value={medicalNotes} onChange={e => setMedicalNotes(e.target.value)} rows={3} placeholder="Any conditions we should know about…"
              style={{ ...input, resize: "vertical", lineHeight: 1.6 }} />
          </div>

          {/* Signature */}
          <div style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Electronic Signature</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, marginBottom: 16, lineHeight: 1.6 }}>
              Type your full legal name below as your electronic signature. This constitutes a legally binding agreement.
            </div>
            <input
              value={signature} onChange={e => setSignature(e.target.value)}
              placeholder="Type your full name"
              style={{ ...input, fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontStyle: "italic", textAlign: "center", padding: "18px 16px", borderColor: signature ? T.gold : T.wire }}
            />
            {signature && (
              <div style={{ textAlign: "center", marginTop: 12, fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>
                Signed as: <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontStyle: "italic", color: T.parchment }}>{signature}</span>
              </div>
            )}
          </div>

          {/* Agreement checkbox */}
          <div onClick={() => setAgreed(!agreed)} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 24, cursor: "pointer", padding: "12px 0" }}>
            <div style={{
              width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 2,
              border: `2px solid ${agreed ? T.gold : T.wire}`,
              background: agreed ? T.gold : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {agreed && <span style={{ color: T.ink, fontSize: 12, fontWeight: 700 }}>✓</span>}
            </div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.ash, lineHeight: 1.6 }}>
              I have read and understand the liability waiver above. I confirm that I am at least 18 years old (or signing as the parent/legal guardian of a minor participant) and I agree to all terms.
            </div>
          </div>

          {error && (
            <div style={{ background: T.redGlow, border: `1px solid ${T.red}`, borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontFamily: FONT_BODY, fontSize: 14, color: "#f08080" }}>{error}</div>
          )}

          {/* Submit */}
          <button onClick={handleSign} disabled={submitting || !agreed || !legalName || !signature}
            style={{
              width: "100%", padding: "16px", background: T.gold, border: "none", borderRadius: 8,
              fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, color: T.ink, cursor: "pointer",
              opacity: (submitting || !agreed || !legalName || !signature) ? 0.5 : 1,
              marginBottom: 16,
            }}>
            {submitting ? "Signing…" : "Sign Waiver"}
          </button>

          <div style={{ textAlign: "center", fontFamily: FONT_BODY, fontSize: 12, color: T.muted, lineHeight: 1.6, marginBottom: 40 }}>
            🔒 Your signature is encrypted and stored securely. A copy will be emailed to you.
          </div>
        </div>
      </div>
    </>
  );
}
