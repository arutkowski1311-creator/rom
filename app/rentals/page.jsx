"use client";
import { useState, useEffect } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";

function RentalCard({ rental }) {
  const hero = rental.photos?.[0] || null;

  return (
    <div onClick={() => window.location.href = `/rentals/${rental.slug}`}
      style={{ background: T.gunmetal, borderRadius: 12, overflow: "hidden", border: `1px solid ${T.wire}`, cursor: "pointer", transition: "transform 0.2s, border-color 0.2s, box-shadow 0.2s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = T.wire; e.currentTarget.style.boxShadow = "none"; }}>

      {/* Photo */}
      <div style={{ height: 200, background: hero ? `url(${hero}) center/cover` : "linear-gradient(135deg, #0b1a24 0%, #152018 100%)", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, rgba(8,10,11,0.65) 100%)" }} />
        <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(8,10,11,0.75)", border: `1px solid ${T.wire}`, borderRadius: 5, padding: "4px 10px", fontFamily: FONT_BODY, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: T.gold }}>
          {rental.vessel_length} {rental.vessel_type}
        </div>
        <div style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(8,10,11,0.85)", borderRadius: 6, padding: "6px 12px", textAlign: "right" }}>
          {rental.half_day_price && <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.silver }}>from</div>}
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.white }}>${(rental.half_day_price || rental.full_day_price || 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "18px 20px 20px" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.white, marginBottom: 6 }}>{rental.name}</div>
        {rental.tagline && <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, marginBottom: 10, lineHeight: 1.5 }}>{rental.tagline}</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {rental.destinations?.map(d => (
            <span key={d} style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted, background: T.steel, borderRadius: 4, padding: "3px 8px" }}>🏞️ {d}</span>
          ))}
          {rental.capacity && <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted, background: T.steel, borderRadius: 4, padding: "3px 8px" }}>Up to {rental.capacity} passengers</span>}
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {rental.half_day_price && <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.silver }}>Half day · <strong style={{ color: T.parchment }}>${rental.half_day_price.toLocaleString()}</strong></span>}
          {rental.full_day_price && <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.silver }}>Full day · <strong style={{ color: T.parchment }}>${rental.full_day_price.toLocaleString()}</strong></span>}
        </div>
      </div>
    </div>
  );
}

export default function RentalsPage() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.from("rentals").select("id, slug, name, tagline, location, photos, vessel_type, vessel_length, capacity, destinations, half_day_price, full_day_price, driver_addon_price")
      .eq("active", true).order("created_at", { ascending: true })
      .then(({ data }) => { setRentals(data || []); setLoading(false); });
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: T.void, color: T.parchment }}>

      {/* Header */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 24px 48px" }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: T.gold, marginBottom: 16 }}>Boat Rentals</div>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(36px,5vw,64px)", fontWeight: 400, color: T.white, margin: "0 0 16px", lineHeight: 1.1 }}>
          Get out on the water.
        </h1>
        <p style={{ fontFamily: FONT_BODY, fontSize: 16, color: T.silver, maxWidth: 520, lineHeight: 1.75, margin: 0 }}>
          20-foot pontoon, trailered to Lake Placid or Saranac Lake. Gas, cooler, and life preservers included. NYS Boating Safety Certificate required to operate.
        </p>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
            {[1, 2].map(i => <div key={i} style={{ height: 360, background: T.gunmetal, borderRadius: 12, border: `1px solid ${T.wire}` }} />)}
          </div>
        ) : rentals.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.silver }}>Coming soon</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
            {rentals.map(r => <RentalCard key={r.id} rental={r} />)}
          </div>
        )}
      </div>

      {/* Add-on nudge */}
      <div style={{ background: T.carbon, borderTop: `1px solid ${T.wire}`, padding: "48px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.white, marginBottom: 12 }}>Staying at the Ausable House?</div>
          <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver, lineHeight: 1.75, marginBottom: 24 }}>
            Add a boat rental to your stay — we'll coordinate everything around your check-in and check-out.
          </p>
          <button onClick={() => window.location.href = "/properties/ausable-house"}
            style={{ padding: "14px 32px", background: "none", border: `1px solid ${T.gold}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 14, color: T.gold, cursor: "pointer" }}>
            View the Ausable House →
          </button>
        </div>
      </div>
    </div>
  );
}
