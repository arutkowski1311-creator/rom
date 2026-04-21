"use client";
import { useState, useEffect } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";

function PropertyCard({ property }) {
  const hero = property.photos?.[0] || null;
  const fmtPrice = (n) => n ? `$${Number(n).toLocaleString()}` : "—";

  return (
    <div
      onClick={() => window.location.href = `/properties/${property.slug}`}
      style={{
        background: T.gunmetal,
        borderRadius: 12,
        overflow: "hidden",
        border: `1px solid ${T.wire}`,
        cursor: "pointer",
        transition: "transform 0.2s, border-color 0.2s, box-shadow 0.2s",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.4)`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = T.wire; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Photo */}
      <div style={{
        height: 220,
        background: hero
          ? `url(${hero}) center/cover`
          : `linear-gradient(135deg, #152018 0%, #0b1a24 100%)`,
        position: "relative",
        flexShrink: 0,
      }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, rgba(8,10,11,0.7) 100%)" }} />

        {/* Tags */}
        {property.positioning_tags?.length > 0 && (
          <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {property.positioning_tags.slice(0, 2).map(tag => (
              <span key={tag} style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.gold, background: "rgba(8,10,11,0.75)", border: `1px solid rgba(201,151,58,0.5)`, borderRadius: 4, padding: "3px 8px" }}>{tag}</span>
            ))}
          </div>
        )}

        {/* Price overlay */}
        <div style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(8,10,11,0.85)", borderRadius: 6, padding: "6px 12px" }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: T.white }}>{fmtPrice(property.price_per_night)}</span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.silver, marginLeft: 4 }}>/night</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "18px 20px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.white, lineHeight: 1.2 }}>{property.name}</div>
        {property.tagline && (
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, lineHeight: 1.5 }}>{property.tagline}</div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>📍 {property.location}</span>
          {property.bedrooms && <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>· {property.bedrooms} bed</span>}
          {property.bathrooms && <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>· {property.bathrooms} bath</span>}
          {property.max_guests && <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>· {property.max_guests} guests</span>}
        </div>

        {/* Top amenities */}
        {property.amenities?.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            {property.amenities.slice(0, 4).map(a => (
              <span key={a} style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted, background: T.steel, borderRadius: 4, padding: "3px 8px" }}>{a}</span>
            ))}
            {property.amenities.length > 4 && (
              <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted }}>+{property.amenities.length - 4} more</span>
            )}
          </div>
        )}

        <div style={{ marginTop: "auto", paddingTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold, letterSpacing: "0.06em" }}>View property →</span>
        </div>
      </div>
    </div>
  );
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    supabase
      .from("properties")
      .select("id, slug, name, tagline, location, region, photos, positioning_tags, amenities, price_per_night, bedrooms, bathrooms, max_guests, min_nights")
      .eq("active", true)
      .order("created_at", { ascending: true })
      .then(({ data }) => { setProperties(data || []); setLoading(false); });
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: T.void, color: T.parchment }}>

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, height: 64, background: T.void, borderBottom: `1px solid ${T.wire}`, display: "flex", alignItems: "center" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.gold, letterSpacing: "0.14em", fontWeight: 500, cursor: "pointer" }} onClick={() => window.location.href = "/"}>ROM</div>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <span onClick={() => window.location.href = "/search"} style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.ash, cursor: "pointer" }}>Guides</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.gold, fontWeight: 600 }}>Properties</span>
            <span onClick={() => window.location.href = "/rentals"} style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.ash, cursor: "pointer" }}>Rentals</span>
            <span onClick={() => window.location.href = "/concierge"} style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.ash, cursor: "pointer" }}>Concierge</span>
            <span onClick={() => window.location.href = "/login"} style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.ash, cursor: "pointer" }}>Sign in</span>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 48px" }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: T.gold, marginBottom: 16 }}>
          Curated Properties
        </div>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(36px,5vw,64px)", fontWeight: 400, color: T.white, margin: "0 0 16px", lineHeight: 1.1 }}>
          Hand-selected homes.<br />No compromises.
        </h1>
        <p style={{ fontFamily: FONT_BODY, fontSize: 16, color: T.silver, maxWidth: 560, lineHeight: 1.75, margin: 0 }}>
          Every property in our collection is personally vetted — chosen for character, quality, and proximity to the experiences that make a trip memorable.
        </p>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 420, background: T.gunmetal, borderRadius: 12, border: `1px solid ${T.wire}`, animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.silver, marginBottom: 12 }}>No properties yet</div>
            <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.muted }}>Our curated collection is coming soon.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
            {properties.map(p => <PropertyCard key={p.id} property={p} />)}
          </div>
        )}
      </div>

      {/* Concierge nudge */}
      <div style={{ background: T.carbon, borderTop: `1px solid ${T.wire}`, padding: "48px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.white, marginBottom: 12 }}>Planning a full trip?</div>
          <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver, lineHeight: 1.75, marginBottom: 24 }}>
            Our concierge pairs your property stay with the best local guides, dining, and experiences. Tell us where you're going.
          </p>
          <button onClick={() => window.location.href = "/trips"}
            style={{ padding: "14px 32px", background: T.gold, border: "none", borderRadius: 8, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: T.ink, cursor: "pointer" }}>
            Plan a Trip ✦
          </button>
        </div>
      </div>
    </div>
  );
}
