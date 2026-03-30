"use client";
import { useState, useRef, useEffect } from "react";
import { T, FONT_BODY } from "@/app/lib/theme";

// Debounce helper
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function LocationAutocomplete({
  value = "",
  onChange,
  onSelect,
  placeholder = "Start typing a location…",
  style = {},
  dark = true,
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef(null);
  const debouncedQuery = useDebounce(query, 300);

  // Sync external value
  useEffect(() => { setQuery(value); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Search on debounced query
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2 || !focused) { setResults([]); return; }
    searchLocations(debouncedQuery);
  }, [debouncedQuery, focused]);

  const searchLocations = async (q) => {
    setLoading(true);
    try {
      // Try Mapbox first if token available
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (mapboxToken) {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${mapboxToken}&types=place,locality,neighborhood,poi&limit=6&language=en`
        );
        const data = await res.json();
        if (data.features?.length > 0) {
          setResults(data.features.map(f => ({
            id: f.id,
            name: f.place_name,
            short: f.text,
            context: f.place_name.replace(f.text + ", ", ""),
            lat: f.center[1],
            lng: f.center[0],
            type: f.place_type?.[0] || "place",
          })));
          setOpen(true);
          setLoading(false);
          return;
        }
      }

      // Fallback to Open-Meteo geocoding (free, no key)
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`
      );
      const data = await res.json();
      if (data.results?.length > 0) {
        setResults(data.results.map(r => ({
          id: r.id,
          name: `${r.name}${r.admin1 ? ", " + r.admin1 : ""}${r.country ? ", " + r.country : ""}`,
          short: r.name,
          context: [r.admin1, r.country].filter(Boolean).join(", "),
          lat: r.latitude,
          lng: r.longitude,
          type: "place",
        })));
        setOpen(true);
      } else {
        setResults([]);
      }
    } catch (e) {
      console.error("Location search error:", e);
      setResults([]);
    }
    setLoading(false);
  };

  const handleSelect = (result) => {
    setQuery(result.name);
    setOpen(false);
    if (onChange) onChange(result.name);
    if (onSelect) onSelect(result);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    if (onChange) onChange(v);
    if (v.length < 2) setOpen(false);
  };

  const colors = dark ? {
    bg: T.steel, border: T.wire, text: T.parchment, placeholder: T.muted,
    dropBg: T.carbon, dropBorder: T.wire, itemHover: T.lifted,
    itemText: T.white, itemSub: T.silver, highlight: T.gold,
  } : {
    bg: "#ffffff", border: "#e0e0e0", text: "#1a1a1a", placeholder: "#999",
    dropBg: "#ffffff", dropBorder: "#e0e0e0", itemHover: "#f5f5f5",
    itemText: "#1a1a1a", itemSub: "#666", highlight: "#C9A55C",
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%", ...style }}>
      <input
        value={query}
        onChange={handleChange}
        onFocus={() => { setFocused(true); if (results.length > 0) setOpen(true); }}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        placeholder={placeholder}
        style={{
          width: "100%", boxSizing: "border-box",
          background: colors.bg, border: `1px solid ${colors.border}`,
          borderRadius: 8, padding: "12px 16px",
          fontFamily: FONT_BODY, fontSize: 15, color: colors.text,
          outline: "none",
        }}
      />
      {loading && (
        <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontFamily: FONT_BODY, fontSize: 11, color: colors.highlight }}>
          ...
        </div>
      )}
      {open && results.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
          background: colors.dropBg, border: `1px solid ${colors.dropBorder}`,
          borderRadius: "0 0 8px 8px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          maxHeight: 280, overflowY: "auto",
        }}>
          {results.map((r, i) => (
            <div
              key={r.id || i}
              onClick={() => handleSelect(r)}
              style={{
                padding: "12px 16px", cursor: "pointer",
                borderBottom: i < results.length - 1 ? `1px solid ${dark ? T.rim : "#f0f0f0"}` : "none",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = colors.itemHover}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: colors.itemText, fontWeight: 500 }}>
                📍 {r.short}
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: colors.itemSub, marginTop: 2 }}>
                {r.context}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
