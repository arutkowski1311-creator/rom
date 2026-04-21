"use client";
import { useState, useEffect } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";

export default function GroupBookingPage() {
  const [step, setStep] = useState(1);
  const [guides, setGuides] = useState([]);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [headcount, setHeadcount] = useState(10);
  const [companyName, setCompanyName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [preferredDates, setPreferredDates] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [guideSearch, setGuideSearch] = useState("");
  const [packages, setPackages] = useState([]);

  useEffect(() => { searchGuides(); }, [guideSearch]);

  const searchGuides = async () => {
    const supabase = getSupabase();
    let q = supabase.from("guides").select("id, slug, business_name, display_name, location, categories, rating, review_count, profile_id").eq("status", "active");
    if (guideSearch) q = q.or(`business_name.ilike.%${guideSearch}%,display_name.ilike.%${guideSearch}%,location.ilike.%${guideSearch}%`);
    const { data } = await q.order("rating", { ascending: false }).limit(20);
    setGuides(data || []);
  };

  const selectGuide = async (guide) => {
    setSelectedGuide(guide);
    const supabase = getSupabase();
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", guide.profile_id).single();
    guide.name = profile?.full_name || guide.business_name || guide.display_name || "Guide";
    const { data: pkgs } = await supabase.from("packages").select("id, title, price, price_type, duration, group_discount_tiers").eq("guide_id", guide.id).eq("active", true);
    setPackages(pkgs || []);
    setStep(2);
  };

  const submit = async () => {
    if (!selectedGuide || !groupName || !headcount || !billingEmail) { setError("Please fill all required fields"); return; }
    setSubmitting(true); setError("");
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = `/login?redirect=${encodeURIComponent("/group-booking")}`; return; }
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/group-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({
          guideId: selectedGuide.id,
          packageId: selectedPackage?.id || null,
          groupName, headcount, companyName, billingEmail,
          preferredDates: preferredDates ? preferredDates.split(",").map(d => d.trim()) : [],
          specialRequests,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSubmitted(true);
    } catch (err) { setError(err.message); }
    setSubmitting(false);
  };

  const getDiscount = (pkg) => {
    if (!pkg?.group_discount_tiers?.length) return 0;
    const tiers = [...pkg.group_discount_tiers].sort((a, b) => b.min_guests - a.min_guests);
    const tier = tiers.find(t => headcount >= t.min_guests);
    return tier?.discount_pct || 0;
  };

  if (submitted) {
    return (
      <div style={{ background: T.void, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 500, padding: 40 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 40, color: T.gold, marginBottom: 12 }}>Inquiry Sent</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 16, color: T.ash, marginBottom: 32, lineHeight: 1.7 }}>
            Your group booking request for <strong style={{ color: T.parchment }}>{groupName}</strong> has been sent to {selectedGuide.name}. They'll review and respond with a quote.
          </div>
          <button onClick={() => window.location.href = "/dashboard"} style={{ background: T.gold, border: "none", borderRadius: 6, padding: "14px 28px", fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: T.ink, cursor: "pointer" }}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Barlow:wght@400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{background:${T.void};}::placeholder{color:${T.muted};}`}</style>

      <div style={{ position: "sticky", top: 0, zIndex: 100, background: T.void, borderBottom: `1px solid ${T.wire}`, height: 64, display: "flex", alignItems: "center" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 40px", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: T.gold, letterSpacing: "0.14em", fontWeight: 500, cursor: "pointer" }} onClick={() => window.location.href = "/"}>ROM</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver }}>Group Booking</div>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 40, color: T.white, marginBottom: 8 }}>Group & Corporate Booking</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver, marginBottom: 36 }}>
          Planning a team outing, corporate retreat, or large group experience? Submit an inquiry and your guide will provide a custom quote.
        </div>

        {/* Step indicators */}
        <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
          {["Select Guide", "Group Details", "Submit"].map((label, idx) => (
            <div key={idx} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 3, borderRadius: 2, background: step > idx ? T.gold : T.rim, marginBottom: 6 }} />
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: step > idx ? T.gold : T.muted }}>{label}</div>
            </div>
          ))}
        </div>

        {error && <div style={{ marginBottom: 20, padding: 14, background: T.redGlow, border: `1px solid ${T.red}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 13, color: "#d88" }}>{error}</div>}

        {/* Step 1: Select Guide */}
        {step === 1 && (
          <div>
            <input value={guideSearch} onChange={e => setGuideSearch(e.target.value)} placeholder="Search by guide name or location…"
              style={{ width: "100%", boxSizing: "border-box", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: "12px 16px", fontFamily: FONT_BODY, fontSize: 15, color: T.parchment, outline: "none", marginBottom: 20 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {guides.map(g => (
                <div key={g.id} onClick={() => selectGuide(g)}
                  style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: "16px 20px", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = T.lifted}
                  onMouseLeave={e => e.currentTarget.style.background = T.steel}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: T.white }}>{g.business_name || g.display_name || "Guide"}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.silver, marginTop: 2 }}>{g.location} · {g.categories?.join(", ")} · {g.rating}/5 ({g.review_count} reviews)</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Group Details */}
        {step === 2 && selectedGuide && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: T.steel, border: `1px solid ${T.gold}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.gold, textTransform: "uppercase" }}>Selected Guide</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: T.white, marginTop: 4 }}>{selectedGuide.name}</div>
            </div>

            {packages.length > 0 && (
              <div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Package (optional)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {packages.map(p => {
                    const disc = getDiscount(p);
                    return (
                      <div key={p.id} onClick={() => setSelectedPackage(selectedPackage?.id === p.id ? null : p)}
                        style={{ background: selectedPackage?.id === p.id ? T.goldGlow : T.steel, border: `1px solid ${selectedPackage?.id === p.id ? T.gold : T.wire}`, borderRadius: 6, padding: "12px 16px", cursor: "pointer" }}>
                        <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.parchment }}>{p.title} — ${p.price}/{p.price_type}</div>
                        {disc > 0 && <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.green, marginTop: 2 }}>{disc}% group discount applies</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {[
              ["Group Name *", groupName, setGroupName, "e.g. Johnson Family Reunion"],
              ["Company (optional)", companyName, setCompanyName, "e.g. Acme Corp"],
              ["Billing Email *", billingEmail, setBillingEmail, "invoices@company.com"],
              ["Preferred Dates", preferredDates, setPreferredDates, "e.g. June 15, June 22, July 4"],
            ].map(([label, val, setter, ph]) => (
              <div key={label}>
                <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</div>
                <input value={val} onChange={e => setter(e.target.value)} placeholder={ph}
                  onKeyDown={e => e.key === "Enter" && submit()}
                  style={{ width: "100%", boxSizing: "border-box", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "10px 14px", fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, outline: "none" }} />
              </div>
            ))}

            <div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Group Size *</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => setHeadcount(Math.max(2, headcount - 1))} style={{ width: 36, height: 36, borderRadius: 6, background: T.steel, border: `1px solid ${T.wire}`, color: T.parchment, fontSize: 18, cursor: "pointer" }}>-</button>
                <span style={{ fontFamily: FONT_BODY, fontSize: 22, fontWeight: 700, color: T.gold, minWidth: 40, textAlign: "center" }}>{headcount}</span>
                <button onClick={() => setHeadcount(headcount + 1)} style={{ width: 36, height: 36, borderRadius: 6, background: T.steel, border: `1px solid ${T.wire}`, color: T.parchment, fontSize: 18, cursor: "pointer" }}>+</button>
                <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>guests</span>
              </div>
            </div>

            <div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Special Requests</div>
              <textarea value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} rows={3} placeholder="Dietary needs, accessibility, custom activities…"
                style={{ width: "100%", boxSizing: "border-box", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "10px 14px", fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, outline: "none", resize: "vertical" }} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={submit} disabled={submitting || !groupName || !billingEmail}
                style={{ flex: 1, padding: 14, background: groupName && billingEmail ? T.gold : T.rim, border: "none", borderRadius: 8, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: groupName && billingEmail ? T.ink : T.muted, cursor: groupName && billingEmail ? "pointer" : "not-allowed" }}>
                {submitting ? "Submitting…" : "Submit Group Inquiry"}
              </button>
              <button onClick={() => { setStep(1); setSelectedGuide(null); setSelectedPackage(null); }}
                style={{ padding: "14px 20px", background: "transparent", border: `1px solid ${T.wire}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 14, color: T.silver, cursor: "pointer" }}>Back</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
