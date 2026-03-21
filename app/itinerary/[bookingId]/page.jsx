"use client";
import { useState, useEffect } from "react";
import React from "react";

const GOLD = "#c9973a";
const FONT_D = "'Cormorant Garamond', Georgia, serif";
const FONT_B = "'Barlow', -apple-system, sans-serif";

const weatherIcons = {
  "Clear sky": "☀️", "Mainly clear": "🌤", "Partly cloudy": "⛅",
  "Overcast": "☁️", "Foggy": "🌫", "Light drizzle": "🌦",
  "Light rain": "🌧", "Moderate rain": "🌧", "Heavy rain": "⛈",
  "Light snow": "🌨", "Moderate snow": "❄️", "Rain showers": "🌦",
  "Thunderstorms": "⛈", "Variable": "🌤",
};

export default function ItineraryPage({ params }) {
  const { bookingId } = React.use(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (bookingId) fetchItinerary();
  }, [bookingId]);

  const fetchItinerary = async () => {
    try {
      const res = await fetch(`/api/itineraries?booking_id=${bookingId}`);
      const d = await res.json();
      if (!d || d.error || d.status !== "published") { setNotFound(true); }
      else setData(d);
    } catch { setNotFound(true); }
    setLoading(false);
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: content?.header?.title || "My Trip Plan", url });
    else { navigator.clipboard.writeText(url); alert("Link copied!"); }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#faf9f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: FONT_D, fontSize: 32, color: GOLD, letterSpacing: "0.14em" }}>RŌM</div>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: "100vh", background: "#faf9f6", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 40 }}>
      <div style={{ fontFamily: FONT_D, fontSize: 36, color: "#1a1a1a" }}>Not available yet</div>
      <div style={{ fontFamily: FONT_B, fontSize: 15, color: "#8a8a8a", textAlign: "center" }}>Your guide is still putting the finishing touches on your trip plan. Check back soon.</div>
      <button onClick={() => window.location.href = "/dashboard"} style={{ marginTop: 16, background: GOLD, border: "none", borderRadius: 6, padding: "12px 28px", fontFamily: FONT_B, fontSize: 14, fontWeight: 700, color: "#0d1117", cursor: "pointer" }}>Go to Dashboard</button>
    </div>
  );

  const content = data?.content || {};
  const weather = data?.weather_data;
  const h = content.header || {};
  const overview = content.overview || {};
  const timeline = content.timeline || [];
  const expect = content.what_to_expect || {};
  const bring = content.what_to_bring || [];
  const notes = content.notes_from_guide || "";
  const addOns = content.add_ons || [];
  const after = content.after_experience || {};

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Barlow:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#faf9f6;}
        @media print { .no-print { display:none!important; } body { background:#fff; } }
      `}</style>

      {/* Header bar */}
      <div className="no-print" style={{ position: "sticky", top: 0, zIndex: 100, background: "#faf9f6", borderBottom: "1px solid #e8e5df", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: FONT_D, fontSize: 22, color: GOLD, letterSpacing: "0.14em", cursor: "pointer" }} onClick={() => window.location.href = "/"}>RŌM</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleShare} style={{ background: "none", border: "1px solid #d4d0c8", borderRadius: 6, padding: "6px 14px", fontFamily: FONT_B, fontSize: 12, fontWeight: 600, color: "#4a4a4a", cursor: "pointer" }}>Share</button>
          <button onClick={() => window.print()} style={{ background: "none", border: "1px solid #d4d0c8", borderRadius: 6, padding: "6px 14px", fontFamily: FONT_B, fontSize: 12, fontWeight: 600, color: "#4a4a4a", cursor: "pointer" }}>Print / PDF</button>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px 80px" }}>

        {/* ── HERO ── */}
        <div style={{ padding: "48px 0 40px", borderBottom: "1px solid #e8e5df" }}>
          <div style={{ fontFamily: FONT_B, fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 12 }}>Your Trip Plan</div>
          <h1 style={{ fontFamily: FONT_D, fontSize: "clamp(32px, 6vw, 48px)", color: "#1a1a1a", fontWeight: 400, lineHeight: 1.1, marginBottom: 16 }}>{h.title || "Your Adventure"}</h1>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            {h.date && <span style={{ fontFamily: FONT_B, fontSize: 14, color: "#6a6a6a" }}>📅 {new Date(h.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>}
            {h.location && <span style={{ fontFamily: FONT_B, fontSize: 14, color: "#6a6a6a" }}>📍 {h.location}</span>}
          </div>
          {h.vibe_statement && <p style={{ fontFamily: FONT_D, fontSize: 20, color: "#3a3a3a", fontStyle: "italic", lineHeight: 1.5 }}>{h.vibe_statement}</p>}
        </div>

        {/* ── WEATHER ── */}
        {weather && (
          <div style={{ padding: "20px 0", borderBottom: "1px solid #e8e5df", display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 32 }}>{weatherIcons[weather.condition] || "🌤"}</span>
            <div>
              <div style={{ fontFamily: FONT_B, fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>{weather.condition}</div>
              <div style={{ fontFamily: FONT_B, fontSize: 13, color: "#6a6a6a" }}>
                High {weather.high}°F · Low {weather.low}°F · Wind {weather.windSpeed}mph
              </div>
            </div>
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {overview.description && (
          <div style={{ padding: "36px 0 32px", borderBottom: "1px solid #e8e5df" }}>
            <div style={{ fontFamily: FONT_B, fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>Overview</div>
            <p style={{ fontFamily: FONT_B, fontSize: 16, color: "#2a2a2a", lineHeight: 1.7, marginBottom: 16 }}>{overview.description}</p>
            {overview.highlights?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {overview.highlights.map((hl, i) => (
                  <span key={i} style={{ fontFamily: FONT_B, fontSize: 12, fontWeight: 600, color: GOLD, background: "#c9973a15", borderRadius: 20, padding: "5px 14px" }}>{hl}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TIMELINE ── */}
        {timeline.length > 0 && (
          <div style={{ padding: "36px 0 32px", borderBottom: "1px solid #e8e5df" }}>
            <div style={{ fontFamily: FONT_B, fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 20 }}>Your Day</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {timeline.map((block, i) => (
                <div key={i} style={{ display: "flex", gap: 20, paddingBottom: 24, position: "relative" }}>
                  {/* Timeline line */}
                  <div style={{ width: 24, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: GOLD, border: "2px solid #faf9f6", boxShadow: `0 0 0 2px ${GOLD}`, zIndex: 1 }} />
                    {i < timeline.length - 1 && <div style={{ width: 1, flex: 1, background: "#e0ddd4", marginTop: 4 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: i < timeline.length - 1 ? 8 : 0 }}>
                    {block.time && <div style={{ fontFamily: FONT_B, fontSize: 12, fontWeight: 700, color: GOLD, marginBottom: 4 }}>{block.time}</div>}
                    <div style={{ fontFamily: FONT_D, fontSize: 20, color: "#1a1a1a", fontWeight: 500, marginBottom: 4 }}>{block.title}</div>
                    <div style={{ fontFamily: FONT_B, fontSize: 14, color: "#5a5a5a", lineHeight: 1.6 }}>{block.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── WHAT TO EXPECT ── */}
        {(expect.effort_level || expect.pace || expect.environment) && (
          <div style={{ padding: "36px 0 32px", borderBottom: "1px solid #e8e5df" }}>
            <div style={{ fontFamily: FONT_B, fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>What to Expect</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
              {expect.effort_level && (
                <div style={{ background: "#f4f1ec", borderRadius: 8, padding: 16 }}>
                  <div style={{ fontFamily: FONT_B, fontSize: 11, fontWeight: 700, color: "#8a8a8a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Effort</div>
                  <div style={{ fontFamily: FONT_D, fontSize: 18, color: "#1a1a1a" }}>{expect.effort_level}</div>
                </div>
              )}
              {expect.pace && (
                <div style={{ background: "#f4f1ec", borderRadius: 8, padding: 16 }}>
                  <div style={{ fontFamily: FONT_B, fontSize: 11, fontWeight: 700, color: "#8a8a8a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Pace</div>
                  <div style={{ fontFamily: FONT_B, fontSize: 14, color: "#3a3a3a", lineHeight: 1.5 }}>{expect.pace}</div>
                </div>
              )}
              {expect.environment && (
                <div style={{ background: "#f4f1ec", borderRadius: 8, padding: 16 }}>
                  <div style={{ fontFamily: FONT_B, fontSize: 11, fontWeight: 700, color: "#8a8a8a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Environment</div>
                  <div style={{ fontFamily: FONT_B, fontSize: 14, color: "#3a3a3a", lineHeight: 1.5 }}>{expect.environment}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── WHAT TO BRING ── */}
        {bring.length > 0 && (
          <div style={{ padding: "36px 0 32px", borderBottom: "1px solid #e8e5df" }}>
            <div style={{ fontFamily: FONT_B, fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>What to Bring</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {bring.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, border: "1.5px solid #d4d0c8", flexShrink: 0 }} />
                  <span style={{ fontFamily: FONT_B, fontSize: 14, color: "#3a3a3a" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── NOTES FROM GUIDE ── */}
        {notes && (
          <div style={{ padding: "36px 0 32px", borderBottom: "1px solid #e8e5df" }}>
            <div style={{ fontFamily: FONT_B, fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>A Note from Your Guide</div>
            <div style={{ background: "#f4f1ec", borderRadius: 10, padding: 24, borderLeft: `3px solid ${GOLD}` }}>
              <p style={{ fontFamily: FONT_D, fontSize: 18, color: "#2a2a2a", lineHeight: 1.65, fontStyle: "italic" }}>{notes}</p>
            </div>
          </div>
        )}

        {/* ── ADD-ONS ── */}
        {addOns.length > 0 && (
          <div style={{ padding: "36px 0 32px", borderBottom: "1px solid #e8e5df" }}>
            <div style={{ fontFamily: FONT_B, fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>Optional Add-Ons</div>
            {addOns.map((addon, i) => (
              <div key={i} style={{ background: "#f4f1ec", borderRadius: 8, padding: 16, marginBottom: 8 }}>
                <span style={{ fontFamily: FONT_B, fontSize: 14, color: "#2a2a2a" }}>{typeof addon === "string" ? addon : addon.title || addon.name || JSON.stringify(addon)}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── AFTER THE EXPERIENCE ── */}
        <div style={{ padding: "36px 0 32px" }}>
          <div style={{ fontFamily: FONT_B, fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>After Your Adventure</div>
          {after.review_prompt && <p style={{ fontFamily: FONT_B, fontSize: 15, color: "#4a4a4a", lineHeight: 1.6, marginBottom: 20 }}>{after.review_prompt}</p>}
          <div className="no-print" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {after.rebook_url && (
              <button onClick={() => window.location.href = after.rebook_url} style={{ background: GOLD, border: "none", borderRadius: 6, padding: "12px 24px", fontFamily: FONT_B, fontSize: 14, fontWeight: 700, color: "#0d1117", cursor: "pointer" }}>Book Again</button>
            )}
            <button onClick={handleShare} style={{ background: "none", border: `1px solid #d4d0c8`, borderRadius: 6, padding: "12px 24px", fontFamily: FONT_B, fontSize: 14, fontWeight: 600, color: "#4a4a4a", cursor: "pointer" }}>Share This Plan</button>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ padding: "24px 0", borderTop: "1px solid #e8e5df", textAlign: "center" }}>
          <div style={{ fontFamily: FONT_D, fontSize: 18, color: GOLD, letterSpacing: "0.14em", marginBottom: 4 }}>RŌM</div>
          <div style={{ fontFamily: FONT_B, fontSize: 11, color: "#8a8a8a" }}>The world's best adventure guides, in one place.</div>
        </div>
      </div>
    </>
  );
}
