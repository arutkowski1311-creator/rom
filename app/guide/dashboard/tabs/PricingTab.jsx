"use client";
import { useState, useEffect } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";

const CONFIDENCE_COLORS = { high: T.green, medium: T.gold, low: T.silver };

export default function PricingTab({ guideId }) {
  const [packages, setPackages] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { loadData(); }, [guideId]);

  const getAuthHeader = async () => {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  };

  const loadData = async () => {
    try {
      const supabase = getSupabase();
      const { data: pkgs } = await supabase
        .from("packages")
        .select("id, title, price, price_type, duration, price_floor, price_ceiling, auto_pricing_enabled")
        .eq("guide_id", guideId)
        .eq("active", true);
      setPackages(pkgs || []);

      const { data: recs } = await supabase
        .from("pricing_recommendations")
        .select("*")
        .eq("guide_id", guideId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      setRecommendations(recs || []);
    } catch (e) { console.error("Load pricing error:", e); }
    setLoading(false);
  };

  const generateRecommendations = async () => {
    setGenerating(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/ai/pricing", {
        method: "POST", headers,
        body: JSON.stringify({ guideId }),
      });
      const data = await res.json();
      if (data.recommendations) {
        setRecommendations(data.recommendations);
      }
    } catch (e) { console.error("Generate pricing error:", e); }
    setGenerating(false);
  };

  const handleAction = async (recId, accept) => {
    setActionLoading(recId);
    try {
      const headers = await getAuthHeader();
      await fetch("/api/pricing/apply", {
        method: "POST", headers,
        body: JSON.stringify({ recommendationId: recId, accept }),
      });
      await loadData();
    } catch (e) { console.error("Apply pricing error:", e); }
    setActionLoading(null);
  };

  const updateBounds = async (pkgId, field, value) => {
    try {
      const supabase = getSupabase();
      await supabase.from("packages").update({ [field]: value || null }).eq("id", pkgId);
      setPackages(prev => prev.map(p => p.id === pkgId ? { ...p, [field]: value || null } : p));
    } catch (e) { console.error("Update bounds error:", e); }
  };

  const toggleAutoPricing = async (pkgId, enabled) => {
    try {
      const supabase = getSupabase();
      await supabase.from("packages").update({ auto_pricing_enabled: enabled }).eq("id", pkgId);
      setPackages(prev => prev.map(p => p.id === pkgId ? { ...p, auto_pricing_enabled: enabled } : p));
    } catch (e) { console.error("Toggle auto-pricing error:", e); }
  };

  if (loading) return <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.muted, padding: 40 }}>Loading pricing data…</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: T.white, fontWeight: 400 }}>Pricing Intelligence</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver, marginTop: 4 }}>AI-powered pricing recommendations based on demand, seasonality, and market data.</div>
        </div>
        <button onClick={generateRecommendations} disabled={generating}
          style={{ background: T.gold, border: "none", borderRadius: 6, padding: "11px 22px", fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: T.ink, cursor: generating ? "not-allowed" : "pointer", opacity: generating ? 0.5 : 1 }}>
          {generating ? "Analyzing…" : "Generate Recommendations"}
        </button>
      </div>

      {/* Pending Recommendations */}
      {recommendations.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Recommendations</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {recommendations.map(rec => {
              const pkg = packages.find(p => p.id === rec.package_id);
              const priceDiff = rec.recommended_price - rec.current_price;
              const pctChange = ((priceDiff / rec.current_price) * 100).toFixed(0);
              return (
                <div key={rec.id} style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 10, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: T.white }}>{pkg?.title || "Package"}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                        <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.muted, textDecoration: "line-through" }}>${rec.current_price}</span>
                        <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.gold, fontWeight: 700 }}>→</span>
                        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.gold }}>${rec.recommended_price}</span>
                        <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: priceDiff > 0 ? T.green : "#aa7a7a" }}>
                          {priceDiff > 0 ? "+" : ""}{pctChange}%
                        </span>
                      </div>
                    </div>
                    <span style={{
                      fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                      color: CONFIDENCE_COLORS[rec.confidence] || T.silver,
                      background: `${CONFIDENCE_COLORS[rec.confidence] || T.silver}28`,
                      border: `1px solid ${CONFIDENCE_COLORS[rec.confidence] || T.silver}`,
                      borderRadius: 3, padding: "3px 8px",
                    }}>{rec.confidence} confidence</span>
                  </div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, lineHeight: 1.6, marginBottom: 14 }}>{rec.reasoning}</div>
                  {rec.signals && (
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
                      {[
                        ["Fill Rate", `${rec.signals.fill_rate}%`],
                        ["Advance", `${rec.signals.avg_advance_days}d`],
                        ["Season", `${rec.signals.seasonal_index}x`],
                        ["Category Avg", `$${rec.signals.category_avg_price}`],
                        ["Rating", `${rec.signals.avg_rating}/5`],
                      ].map(([label, val]) => (
                        <div key={label}>
                          <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: T.muted, textTransform: "uppercase" }}>{label}</div>
                          <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: T.parchment }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => handleAction(rec.id, true)} disabled={actionLoading === rec.id}
                      style={{ background: T.gold, border: "none", borderRadius: 6, padding: "9px 18px", fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: T.ink, cursor: "pointer" }}>
                      Apply ${rec.recommended_price}
                    </button>
                    <button onClick={() => handleAction(rec.id, false)} disabled={actionLoading === rec.id}
                      style={{ background: "transparent", border: `1px solid ${T.wire}`, borderRadius: 6, padding: "9px 18px", fontFamily: FONT_BODY, fontSize: 13, color: T.silver, cursor: "pointer" }}>
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Package Settings */}
      <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Package Price Settings</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {packages.map(pkg => (
          <div key={pkg.id} style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 10, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: T.white }}>{pkg.title}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver }}>Current: ${pkg.price}/{pkg.price_type} · {pkg.duration}</div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={pkg.auto_pricing_enabled || false}
                  onChange={e => toggleAutoPricing(pkg.id, e.target.checked)}
                  style={{ accentColor: T.gold }} />
                <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.ash }}>Auto-adjust</span>
              </label>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: T.muted, textTransform: "uppercase", marginBottom: 4 }}>Price Floor</div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontFamily: FONT_BODY, fontSize: 13, color: T.muted }}>$</span>
                  <input type="number" value={pkg.price_floor || ""} placeholder="Min"
                    onChange={e => updateBounds(pkg.id, "price_floor", e.target.value ? parseFloat(e.target.value) : null)}
                    style={{ width: 120, background: T.lifted, border: `1px solid ${T.wire}`, borderRadius: 5, padding: "8px 10px 8px 24px", fontFamily: FONT_BODY, fontSize: 13, color: T.parchment, outline: "none" }} />
                </div>
              </div>
              <div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: T.muted, textTransform: "uppercase", marginBottom: 4 }}>Price Ceiling</div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontFamily: FONT_BODY, fontSize: 13, color: T.muted }}>$</span>
                  <input type="number" value={pkg.price_ceiling || ""} placeholder="Max"
                    onChange={e => updateBounds(pkg.id, "price_ceiling", e.target.value ? parseFloat(e.target.value) : null)}
                    style={{ width: 120, background: T.lifted, border: `1px solid ${T.wire}`, borderRadius: 5, padding: "8px 10px 8px 24px", fontFamily: FONT_BODY, fontSize: 13, color: T.parchment, outline: "none" }} />
                </div>
              </div>
            </div>
            {pkg.auto_pricing_enabled && (!pkg.price_floor || !pkg.price_ceiling) && (
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: "#aa7a7a", marginTop: 10 }}>
                Set both floor and ceiling to enable auto-pricing safely.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
