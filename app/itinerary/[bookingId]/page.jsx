"use client";
import { useState, useEffect } from "react";
import React from "react";
import Image from "next/image";

const GOLD = "#c9973a";
const GOLD_LIGHT = "#c9973a18";
const CREAM = "#faf9f6";
const WARM = "#f4f1ec";
const BORDER = "#e8e5df";
const INK = "#1a1a1a";
const ASH = "#5a5a5a";
const MUTED = "#8a8a8a";
const FONT_D = "'Cormorant Garamond', Georgia, serif";
const FONT_B = "'Barlow', -apple-system, sans-serif";

const weatherIcons = {
  "Clear sky": "☀️", "Mainly clear": "🌤", "Partly cloudy": "⛅",
  "Overcast": "☁️", "Foggy": "🌫", "Light drizzle": "🌦",
  "Light rain": "🌧", "Moderate rain": "🌧", "Heavy rain": "⛈",
  "Light snow": "🌨", "Moderate snow": "❄️", "Rain showers": "🌦",
  "Thunderstorms": "⛈", "Variable": "🌤",
};

// ── Section wrapper ──
function Section({ children, noBorder }) {
  return (
    <div style={{ padding: "40px 0", borderBottom: noBorder ? "none" : `1px solid ${BORDER}` }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: FONT_B, fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 16 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 16, height: 1, background: GOLD, display: "inline-block" }} />
        {children}
        <span style={{ width: 16, height: 1, background: GOLD, display: "inline-block" }} />
      </span>
    </div>
  );
}

export default function ItineraryPage({ params }) {
  const { bookingId } = React.use(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => { if (bookingId) fetchItinerary(); }, [bookingId]);

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
    <div style={{ minHeight: "100vh", background: CREAM, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <div onClick={()=>window.location.href="/"} style={{ fontFamily: FONT_D, fontSize: 36, color: GOLD, letterSpacing: "0.16em", cursor: "pointer" }}>RŌM</div>
      <div style={{ width: 40, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
      <div style={{ fontFamily: FONT_B, fontSize: 12, color: MUTED, letterSpacing: "0.08em" }}>Loading your trip plan…</div>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: "100vh", background: CREAM, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, padding: 40 }}>
      <div onClick={()=>window.location.href="/"} style={{ fontFamily: FONT_D, fontSize: 24, color: GOLD, letterSpacing: "0.14em", marginBottom: 8, cursor: "pointer" }}>RŌM</div>
      <div style={{ fontFamily: FONT_D, fontSize: 36, color: INK, fontWeight: 400 }}>Not available yet</div>
      <div style={{ fontFamily: FONT_B, fontSize: 15, color: MUTED, textAlign: "center", maxWidth: 380 }}>Your guide is still putting the finishing touches on your trip plan. Check back soon.</div>
      <button onClick={() => window.location.href = "/dashboard"} style={{ marginTop: 8, background: GOLD, border: "none", borderRadius: 6, padding: "12px 28px", fontFamily: FONT_B, fontSize: 14, fontWeight: 700, color: "#0d1117", cursor: "pointer" }}>Go to Dashboard</button>
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
  const logistics = content.guide_logistics || {};
  const guideName = data?.guide_name || "";
  const guidePhoto = data?.guide_photo || null;
  const guideSlug = data?.guide_slug || "";

  const overrides = content._section_overrides || {};
  const renames = overrides.rename || {};
  const hideSections = overrides.hide_sections || [];
  const conditionsLabel = content._conditions_label || "Current Conditions";
  const label = (section, fallback) => renames[section] || fallback;

  const hasLogistics = logistics.meeting_point && !logistics.meeting_point.includes("[Guide will add");

  return (
    <>
      {/* Dynamic OG meta for share previews */}
      {h.title && (
        <>
          <meta property="og:title" content={h.title} />
          <meta property="og:description" content={h.vibe_statement || `Trip plan with ${guideName} in ${h.location}`} />
          <meta property="og:site_name" content="RŌM" />
          <meta property="og:type" content="article" />
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:title" content={h.title} />
          <meta name="twitter:description" content={h.vibe_statement || `Trip plan with ${guideName}`} />
        </>
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Barlow:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${CREAM};}
        @media print {
          .no-print{display:none!important;}
          body{background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
          *{box-shadow:none!important;}
          .print-break{page-break-before:always;}
          @page{margin:0.6in 0.75in;size:letter;}
        }
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .itin-section { animation: fadeIn 0.5s ease forwards; }
      `}</style>

      {/* ══ STICKY HEADER BAR ══ */}
      <div className="no-print" style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(250,249,246,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BORDER}`, padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontFamily: FONT_D, fontSize: 20, color: GOLD, letterSpacing: "0.14em", cursor: "pointer" }} onClick={() => window.location.href = "/"}>RŌM</div>
          <div style={{ width: 1, height: 16, background: BORDER }} />
          <div style={{ fontFamily: FONT_B, fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: "0.04em" }}>Trip Plan</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={handleShare} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "6px 14px", fontFamily: FONT_B, fontSize: 11, fontWeight: 600, color: ASH, cursor: "pointer" }}>Share</button>
          <button onClick={() => window.print()} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "6px 14px", fontFamily: FONT_B, fontSize: 11, fontWeight: 600, color: ASH, cursor: "pointer" }}>Print / PDF</button>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px 80px" }}>

        {/* ══ HERO ══ */}
        <div className="itin-section" style={{ paddingTop: 56, paddingBottom: 44, borderBottom: `1px solid ${BORDER}`, textAlign: "center" }}>
          {/* Gold decorative element */}
          <div style={{ width: 40, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, margin: "0 auto 20px" }} />
          <div style={{ fontFamily: FONT_B, fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 16 }}>Your Trip Plan</div>
          <h1 style={{ fontFamily: FONT_D, fontSize: "clamp(34px, 7vw, 52px)", color: INK, fontWeight: 400, lineHeight: 1.08, marginBottom: 20 }}>
            {h.title || "Your Adventure"}
          </h1>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
            {h.date && (
              <span style={{ fontFamily: FONT_B, fontSize: 13, color: MUTED, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: GOLD }}>◦</span>
                {new Date(h.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </span>
            )}
            {h.location && (
              <span style={{ fontFamily: FONT_B, fontSize: 13, color: MUTED, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: GOLD }}>◦</span>
                {h.location}
              </span>
            )}
          </div>
          {h.vibe_statement && (
            <p style={{ fontFamily: FONT_D, fontSize: 22, color: "#3a3a3a", fontStyle: "italic", lineHeight: 1.45, maxWidth: 500, margin: "0 auto" }}>
              "{h.vibe_statement}"
            </p>
          )}

          {/* Guide card */}
          {guideName && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 28, padding: "16px 24px", background: WARM, borderRadius: 50, maxWidth: 340, margin: "28px auto 0" }}>
              {guidePhoto ? (
                <Image src={guidePhoto} alt={guideName} width={40} height={40} style={{ borderRadius: "50%", objectFit: "cover", border: `2px solid ${GOLD}` }} unoptimized />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}40, ${GOLD}20)`, border: `2px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_D, fontSize: 18, color: GOLD, fontWeight: 500 }}>
                  {guideName.charAt(0)}
                </div>
              )}
              <div style={{ textAlign: "left" }}>
                <div style={{ fontFamily: FONT_B, fontSize: 14, fontWeight: 600, color: INK }}>{guideName}</div>
                <div style={{ fontFamily: FONT_B, fontSize: 11, color: MUTED }}>Your Guide</div>
              </div>
              {guideSlug && (
                <div style={{ marginLeft: "auto" }}>
                  <a href={`/guides/${guideSlug}`} style={{ fontFamily: FONT_B, fontSize: 11, fontWeight: 600, color: GOLD, textDecoration: "none" }}>View Profile →</a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══ WHY THIS PLAN ══ */}
        {content.why_this_plan && (
          <Section>
            <div style={{ background: `linear-gradient(135deg, ${WARM} 0%, ${CREAM} 100%)`, borderRadius: 12, padding: "24px 28px", borderLeft: `3px solid ${GOLD}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ fontFamily: FONT_B, fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>Built for You</div>
              <p style={{ fontFamily: FONT_B, fontSize: 15, color: "#2a2a2a", lineHeight: 1.65, margin: 0 }}>{content.why_this_plan}</p>
            </div>
          </Section>
        )}

        {/* ══ WEATHER ══ */}
        {weather && (
          <Section>
            <SectionLabel>{label("conditions", conditionsLabel)}</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 16, background: WARM, borderRadius: 10, padding: "16px 20px" }}>
              <span style={{ fontSize: 36 }}>{weatherIcons[weather.condition] || "🌤"}</span>
              <div>
                <div style={{ fontFamily: FONT_B, fontSize: 15, fontWeight: 600, color: INK }}>{weather.condition}</div>
                <div style={{ fontFamily: FONT_B, fontSize: 13, color: MUTED }}>
                  High {weather.high}°F · Low {weather.low}°F · Wind {weather.windSpeed}mph
                  {weather.sunrise && ` · Sunrise ${new Date(weather.sunrise).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* ══ ABOUT THE AREA ══ */}
        {content.about_the_area && (
          <Section>
            <SectionLabel>{content.about_the_area.title || "About the Area"}</SectionLabel>
            <p style={{ fontFamily: FONT_B, fontSize: 15, color: "#2a2a2a", lineHeight: 1.7, marginBottom: 20 }}>
              {content.about_the_area.description}
            </p>
            {content.about_the_area.details?.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                {content.about_the_area.details.map((d, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: WARM, borderRadius: 10, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                    <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{d.icon}</span>
                    <div>
                      <div style={{ fontFamily: FONT_B, fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{d.label}</div>
                      <div style={{ fontFamily: FONT_B, fontSize: 14, color: "#3a3a3a", lineHeight: 1.55 }}>{d.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ══ OVERVIEW ══ */}
        {overview.description && (
          <Section>
            <SectionLabel>Overview</SectionLabel>
            <p style={{ fontFamily: FONT_B, fontSize: 16, color: "#2a2a2a", lineHeight: 1.7, marginBottom: 20 }}>{overview.description}</p>
            {overview.highlights?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {overview.highlights.map((hl, i) => (
                  <span key={i} style={{ fontFamily: FONT_B, fontSize: 12, fontWeight: 600, color: GOLD, background: GOLD_LIGHT, border: `1px solid ${GOLD}30`, borderRadius: 20, padding: "6px 16px" }}>
                    ✦ {hl}
                  </span>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ══ TIMELINE ══ */}
        {timeline.length > 0 && (
          <Section>
            <SectionLabel>{label("timeline", overrides.timeline_label || "Your Day")}</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {timeline.map((block, i) => (
                <div key={i} style={{ display: "flex", gap: 20, paddingBottom: 28, position: "relative" }}>
                  {/* Timeline dot + line */}
                  <div style={{ width: 28, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: i === 0 ? GOLD : CREAM, border: `2px solid ${GOLD}`, boxShadow: i === 0 ? `0 0 0 4px ${GOLD_LIGHT}` : "none", zIndex: 1 }} />
                    {i < timeline.length - 1 && <div style={{ width: 1, flex: 1, background: `linear-gradient(to bottom, ${GOLD}60, ${BORDER})`, marginTop: 4 }} />}
                  </div>
                  <div style={{ flex: 1, paddingTop: 0 }}>
                    {block.time && <div style={{ fontFamily: FONT_B, fontSize: 11, fontWeight: 700, color: GOLD, marginBottom: 4, letterSpacing: "0.02em" }}>{block.time}</div>}
                    <div style={{ fontFamily: FONT_D, fontSize: 21, color: INK, fontWeight: 500, marginBottom: 6, lineHeight: 1.2 }}>{block.title}</div>
                    <div style={{ fontFamily: FONT_B, fontSize: 14, color: ASH, lineHeight: 1.65 }}>{block.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ══ WHAT TO EXPECT ══ */}
        {!hideSections.includes("what_to_expect") && (expect.effort_level || expect.pace || expect.environment) && (
          <Section>
            <SectionLabel>{label("what_to_expect", "What to Expect")}</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              {expect.effort_level && (
                <div style={{ background: WARM, borderRadius: 12, padding: 20, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>💪</div>
                  <div style={{ fontFamily: FONT_B, fontSize: 9, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Effort</div>
                  <div style={{ fontFamily: FONT_D, fontSize: 20, color: INK }}>{expect.effort_level}</div>
                </div>
              )}
              {expect.pace && (
                <div style={{ background: WARM, borderRadius: 12, padding: 20, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>⏱️</div>
                  <div style={{ fontFamily: FONT_B, fontSize: 9, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Pace</div>
                  <div style={{ fontFamily: FONT_B, fontSize: 14, color: "#3a3a3a", lineHeight: 1.5 }}>{expect.pace}</div>
                </div>
              )}
              {expect.environment && (
                <div style={{ background: WARM, borderRadius: 12, padding: 20, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>🌿</div>
                  <div style={{ fontFamily: FONT_B, fontSize: 9, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Environment</div>
                  <div style={{ fontFamily: FONT_B, fontSize: 14, color: "#3a3a3a", lineHeight: 1.5 }}>{expect.environment}</div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* ══ WHAT TO BRING ══ */}
        {bring.length > 0 && (
          <Section>
            <SectionLabel>{label("what_to_bring", "What to Bring")}</SectionLabel>
            <div style={{ background: WARM, borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "grid", gridTemplateColumns: bring.length > 6 ? "1fr 1fr" : "1fr", gap: 10 }}>
                {bring.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${GOLD}50`, flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 9, color: GOLD }}>✦</span>
                    </div>
                    <span style={{ fontFamily: FONT_B, fontSize: 14, color: "#3a3a3a", lineHeight: 1.4 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* ══ NOTES FROM GUIDE ══ */}
        {notes && (
          <Section>
            <SectionLabel>{label("notes_from_guide", "A Note from Your Guide")}</SectionLabel>
            <div style={{ background: "linear-gradient(135deg, #f9f7f2 0%, #f3efe8 100%)", borderRadius: 14, padding: "28px 28px", borderLeft: `3px solid ${GOLD}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)", position: "relative" }}>
              {/* Decorative quote mark */}
              <div style={{ position: "absolute", top: 12, right: 20, fontFamily: FONT_D, fontSize: 64, color: `${GOLD}20`, lineHeight: 1, userSelect: "none" }}>"</div>
              <p style={{ fontFamily: FONT_D, fontSize: 19, color: "#2a2a2a", lineHeight: 1.7, fontStyle: "italic", position: "relative", zIndex: 1 }}>
                {notes}
              </p>
            </div>
          </Section>
        )}

        {/* ══ ADD-ONS ══ */}
        {!hideSections.includes("add_ons") && addOns.length > 0 && (
          <Section>
            <SectionLabel>Optional Add-Ons</SectionLabel>
            {addOns.map((addon, i) => (
              <div key={i} style={{ background: WARM, borderRadius: 10, padding: 16, marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
                <span style={{ fontFamily: FONT_B, fontSize: 14, color: "#2a2a2a" }}>{typeof addon === "string" ? addon : addon.title || addon.name || JSON.stringify(addon)}</span>
              </div>
            ))}
          </Section>
        )}

        {/* ══ LOGISTICS ══ */}
        {hasLogistics && (
          <Section>
            <SectionLabel>Meeting Details</SectionLabel>
            <div style={{ background: WARM, borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "grid", gap: 16 }}>
                {logistics.meeting_point && (
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>📍</span>
                    <div>
                      <div style={{ fontFamily: FONT_B, fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Meeting Point</div>
                      <div style={{ fontFamily: FONT_B, fontSize: 15, color: INK }}>{logistics.meeting_point}</div>
                    </div>
                  </div>
                )}
                {logistics.meeting_time && (
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>🕐</span>
                    <div>
                      <div style={{ fontFamily: FONT_B, fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Time</div>
                      <div style={{ fontFamily: FONT_B, fontSize: 15, color: INK }}>{logistics.meeting_time}</div>
                    </div>
                  </div>
                )}
                {logistics.parking_notes && !logistics.parking_notes.includes("[Guide will add") && (
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>🅿️</span>
                    <div>
                      <div style={{ fontFamily: FONT_B, fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Parking</div>
                      <div style={{ fontFamily: FONT_B, fontSize: 15, color: INK }}>{logistics.parking_notes}</div>
                    </div>
                  </div>
                )}
                {logistics.guide_phone && !logistics.guide_phone.includes("[Guide will add") && (
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>📞</span>
                    <div>
                      <div style={{ fontFamily: FONT_B, fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Guide Contact</div>
                      <div style={{ fontFamily: FONT_B, fontSize: 15, color: INK }}>{logistics.guide_phone}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* ══ AFTER THE EXPERIENCE ══ */}
        <Section noBorder>
          <SectionLabel>After Your Adventure</SectionLabel>
          {after.review_prompt && <p style={{ fontFamily: FONT_B, fontSize: 15, color: ASH, lineHeight: 1.6, marginBottom: 24, textAlign: "center" }}>{after.review_prompt}</p>}
          <div className="no-print" style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            {after.rebook_url && (
              <button onClick={() => window.location.href = after.rebook_url} style={{ background: GOLD, border: "none", borderRadius: 8, padding: "14px 32px", fontFamily: FONT_B, fontSize: 14, fontWeight: 700, color: "#0d1117", cursor: "pointer", boxShadow: "0 2px 8px rgba(201,151,58,0.3)" }}>Book Again</button>
            )}
            <button onClick={handleShare} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "14px 32px", fontFamily: FONT_B, fontSize: 14, fontWeight: 600, color: ASH, cursor: "pointer" }}>Share This Plan</button>
          </div>
        </Section>

        {/* ══ CO-BRANDED FOOTER ══ */}
        <div style={{ padding: "40px 0 20px", textAlign: "center" }}>
          <div style={{ width: 60, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, margin: "0 auto 20px" }} />
          {guideName && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
              {guidePhoto ? (
                <Image src={guidePhoto} alt="" width={28} height={28} style={{ borderRadius: "50%", objectFit: "cover", border: `1.5px solid ${GOLD}40` }} unoptimized />
              ) : (
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${GOLD}20`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_D, fontSize: 14, color: GOLD }}>{guideName.charAt(0)}</div>
              )}
              <span style={{ fontFamily: FONT_B, fontSize: 12, color: MUTED }}>Prepared by <strong style={{ color: ASH }}>{guideName}</strong></span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: FONT_B, fontSize: 10, color: MUTED, letterSpacing: "0.04em" }}>Powered by</span>
            <span style={{ fontFamily: FONT_D, fontSize: 18, color: GOLD, letterSpacing: "0.14em" }}>RŌM</span>
          </div>
          <div style={{ fontFamily: FONT_B, fontSize: 10, color: `${MUTED}80`, letterSpacing: "0.02em" }}>romlife.co</div>
        </div>
      </div>
    </>
  );
}
