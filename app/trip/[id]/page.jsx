"use client";
import { useState, useEffect } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";
import { GoldBtn, useIsMobile } from "@/app/components/ui";
import React from "react";

export default function SharedTripPage({ params }) {
  const { id } = React.use(params);
  const isMobile = useIsMobile();
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadTrip(id);
  }, [id]);

  const loadTrip = async (token) => {
    try {
      const supabase = getSupabase();
      // Try share_token first, then fall back to id
      let { data, error } = await supabase
        .from("trip_plans")
        .select("itinerary, destination, date_start, date_end, group_size")
        .eq("share_token", token)
        .single();

      if (error || !data) {
        ({ data, error } = await supabase
          .from("trip_plans")
          .select("itinerary, destination, date_start, date_end, group_size")
          .eq("id", token)
          .single());
      }

      if (error || !data || !data.itinerary) {
        setNotFound(true);
      } else {
        setItinerary(data.itinerary);
      }
    } catch (e) {
      console.error("Load trip error:", e);
      setNotFound(true);
    }
    setLoading(false);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.void, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: T.gold, letterSpacing: "0.14em" }}>RŌM</div>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: "100vh", background: T.void, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 48, color: T.white, fontWeight: 300 }}>Trip not found</div>
      <button onClick={() => window.location.href = "/concierge"} style={{ background: T.gold, border: "none", borderRadius: 6, padding: "11px 24px", fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: T.ink, cursor: "pointer" }}>Plan Your Own Trip</button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.void, color: T.parchment }}>
      {/* Header */}
      <div style={{ background: T.carbon, borderBottom: `1px solid ${T.wire}`, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.gold, letterSpacing: "0.12em", cursor: "pointer" }} onClick={() => window.location.href = "/"}>RŌM</div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => window.print()} className="no-print" style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "8px 16px", fontFamily: FONT_BODY, fontSize: 13, color: T.ash, cursor: "pointer" }}>Print</button>
          <button onClick={() => window.location.href = "/concierge"} className="no-print" style={{ background: T.gold, border: "none", borderRadius: 6, padding: "8px 16px", fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: T.ink, cursor: "pointer" }}>Plan Your Own</button>
        </div>
      </div>

      <div className="print-content" style={{ maxWidth: 800, margin: "0 auto", padding: isMobile ? "24px 16px" : "40px 24px" }}>
        {/* Trip Title */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 28 : 36, color: T.white, lineHeight: 1.2, marginBottom: 8 }}>{itinerary.title}</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.ash, lineHeight: 1.6 }}>{itinerary.summary}</div>
        </div>

        {/* Guide Match */}
        {itinerary.guide && itinerary.guide.name && (
          <div style={{ background: T.steel, border: `1px solid ${T.gold}`, borderRadius: 12, padding: 24, marginBottom: 28 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Guide Match</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.white, marginBottom: 4 }}>{itinerary.guide.name}</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.ash, marginBottom: 12 }}>{itinerary.guide.reason}</div>
            {itinerary.guide.slug && (
              <GoldBtn onClick={() => window.location.href = `/guides/${itinerary.guide.slug}`}>View Profile & Book</GoldBtn>
            )}
          </div>
        )}

        {/* Flights */}
        {itinerary.flights && itinerary.flights.recommendation && (
          <div style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{"\u{2708}\u{FE0F}"} Flights</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.white, marginBottom: 4 }}>{itinerary.flights.recommendation}</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.gold }}>{itinerary.flights.estimatedCost}</div>
          </div>
        )}

        {/* Day-by-Day */}
        {itinerary.days?.map((day, i) => (
          <div key={i} style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.white, marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.gold, background: T.goldGlow, border: `1px solid ${T.gold}`, borderRadius: 4, padding: "2px 8px" }}>Day {day.dayNumber || i + 1}</span>
              {day.title}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 16, borderLeft: `2px solid ${T.wire}` }}>
              {["morning", "afternoon", "evening"].map(period => {
                const block = day[period];
                if (!block || !block.name) return null;
                const periodLabel = period.charAt(0).toUpperCase() + period.slice(1);
                return (
                  <div key={period} style={{ background: T.steel, borderRadius: 8, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.gold }}>{periodLabel}</span>
                      {block.estimatedCost && <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.silver }}>{block.estimatedCost}</span>}
                    </div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.white, fontWeight: 600 }}>{block.name}</div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, marginTop: 4, lineHeight: 1.5 }}>{block.description}</div>
                  </div>
                );
              })}
              {/* Legacy fallback */}
              {!day.morning && !day.afternoon && !day.evening && day.activities?.map((act, j) => (
                <div key={j} style={{ background: T.steel, borderRadius: 8, padding: 14 }}>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.gold, marginBottom: 4 }}>{act.time}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.white, fontWeight: 600 }}>{act.name}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, marginTop: 4 }}>{act.description}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Lodging */}
        {itinerary.lodging?.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Lodging</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {itinerary.lodging.map((l, i) => (
                <div key={i} style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: 16 }}>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.white, fontWeight: 600 }}>{l.name}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold, marginTop: 2 }}>{l.type} {l.pricePerNight ? `\u00B7 ${l.pricePerNight}/night` : ""}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, marginTop: 6 }}>{l.reason}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dining */}
        {itinerary.dining?.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Dining</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {itinerary.dining.map((d, i) => (
                <div key={i} style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: 16 }}>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.white, fontWeight: 600 }}>{d.name}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold, marginTop: 2 }}>{d.cuisine} {d.priceRange ? `\u00B7 ${d.priceRange}` : ""}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, marginTop: 6 }}>{d.reason}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gear & Tips */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 28 }}>
          {itinerary.gear?.length > 0 && (
            <div style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Gear</div>
              {itinerary.gear.map((g, i) => <div key={i} style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, padding: "4px 0" }}>{"\u2022"} {g}</div>)}
            </div>
          )}
          {itinerary.localTips?.length > 0 && (
            <div style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Local Tips</div>
              {itinerary.localTips.map((t, i) => <div key={i} style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, padding: "4px 0" }}>{"\u2022"} {t}</div>)}
            </div>
          )}
        </div>

        {/* Budget Summary */}
        {itinerary.budgetSummary && (
          <div style={{ background: T.goldGlow, border: `1px solid ${T.gold}`, borderRadius: 10, padding: 20, marginBottom: 28 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Budget Summary</div>
            {Object.entries(itinerary.budgetSummary).filter(([k]) => k !== "overBudget").map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: k === "total" ? T.white : T.ash, fontWeight: k === "total" ? 700 : 400, textTransform: "capitalize" }}>{k}</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: k === "total" ? T.white : T.parchment, fontWeight: k === "total" ? 700 : 600 }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Watermark */}
        <div style={{ textAlign: "center", padding: "20px 0 40px", opacity: 0.5 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: T.gold, letterSpacing: "0.12em" }}>Built with RŌM</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted, marginTop: 4 }}>romlife.co/concierge</div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-content { max-width: 100% !important; padding: 20px !important; }
          .print-content * { color: #222 !important; background: white !important; border-color: #ddd !important; }
        }
      `}</style>
    </div>
  );
}
