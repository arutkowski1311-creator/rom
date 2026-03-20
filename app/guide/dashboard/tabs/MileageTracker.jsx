"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { GoldBtn, SectionCard, SectionHeader } from "@/app/components/ui";
import dynamic from "next/dynamic";

// ─── Haversine distance (meters) ──────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function metersToMiles(m) {
  return m * 0.000621371;
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const IRS_MILEAGE_RATE = 0.70;

// ─── Map Component (dynamic, no SSR) ─────────────────────────────────────────
const TrackingMap = dynamic(() => import("./TrackingMap"), { ssr: false });

// ─── Export helper: capture map + branded overlay ─────────────────────────────
async function captureRouteImage(mapContainerEl, { miles, duration, date, description }) {
  const html2canvas = (await import("html2canvas")).default;

  // Capture the map at higher resolution
  const mapCanvas = await html2canvas(mapContainerEl, {
    useCORS: true,
    allowTaint: true,
    scale: 2,
    backgroundColor: "#0a0a0a",
    logging: false,
    width: mapContainerEl.offsetWidth,
    height: mapContainerEl.offsetHeight,
  });

  // Build final canvas with branded overlay
  const OUTPUT_W = 1080;
  const mapAspect = mapContainerEl.offsetHeight / mapContainerEl.offsetWidth;
  const mapH = Math.round(OUTPUT_W * mapAspect);
  const overlayH = 100;
  const totalH = mapH + overlayH;

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_W;
  canvas.height = totalH;
  const ctx = canvas.getContext("2d");

  // Draw map image scaled to output width
  ctx.drawImage(mapCanvas, 0, 0, OUTPUT_W, mapH);

  // Draw branded overlay bar
  ctx.fillStyle = "#111416";
  ctx.fillRect(0, mapH, OUTPUT_W, overlayH);

  // Gold top border on overlay
  ctx.fillStyle = "#c9973a";
  ctx.fillRect(0, mapH, OUTPUT_W, 2);

  // Stats text
  ctx.fillStyle = "#c9973a";
  ctx.font = "bold 32px Barlow, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  const cy = mapH + overlayH / 2;

  // Miles
  ctx.fillText(`${miles} mi`, 32, cy - 14);
  ctx.fillStyle = "#8a96a0";
  ctx.font = "600 16px Barlow, system-ui, sans-serif";
  ctx.fillText("DISTANCE", 32, cy + 18);

  // Duration
  ctx.fillStyle = "#f5f2ee";
  ctx.font = "bold 32px Barlow, system-ui, sans-serif";
  ctx.fillText(duration, 250, cy - 14);
  ctx.fillStyle = "#8a96a0";
  ctx.font = "600 16px Barlow, system-ui, sans-serif";
  ctx.fillText("DURATION", 250, cy + 18);

  // Deduction
  const deduction = (parseFloat(miles) * IRS_MILEAGE_RATE).toFixed(2);
  ctx.fillStyle = "#4ade80";
  ctx.font = "bold 32px Barlow, system-ui, sans-serif";
  ctx.fillText(`$${deduction}`, 480, cy - 14);
  ctx.fillStyle = "#8a96a0";
  ctx.font = "600 16px Barlow, system-ui, sans-serif";
  ctx.fillText("DEDUCTION", 480, cy + 18);

  // ROM branding + date on right
  ctx.fillStyle = "#c9973a";
  ctx.font = "bold 24px Cormorant Garamond, Georgia, serif";
  ctx.textAlign = "right";
  ctx.fillText("ROM", OUTPUT_W - 32, cy - 14);
  ctx.fillStyle = "#5a6470";
  ctx.font = "600 14px Barlow, system-ui, sans-serif";
  ctx.fillText(`${description || "Trip"} \u00b7 ${date}`, OUTPUT_W - 32, cy + 18);
  ctx.textAlign = "left";

  return canvas.toDataURL("image/png");
}

// ─── Download helper ──────────────────────────────────────────────────────────
function downloadDataURL(dataURL, filename) {
  const a = document.createElement("a");
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function MileageTracker({ guideId, onTripSaved }) {
  const [tracking, setTracking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [points, setPoints] = useState([]); // [{lat, lng, timestamp}]
  const [totalDistance, setTotalDistance] = useState(0); // meters
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [currentPos, setCurrentPos] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Past trips
  const [pastTrips, setPastTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);

  const watchIdRef = useRef(null);
  const timerRef = useRef(null);
  const pointsRef = useRef([]);
  const distanceRef = useRef(0);
  const mapContainerRef = useRef(null); // ref to the map container div
  const trackingMapRef = useRef(null);  // ref forwarded to TrackingMap component

  // Keep refs in sync
  useEffect(() => { pointsRef.current = points; }, [points]);
  useEffect(() => { distanceRef.current = totalDistance; }, [totalDistance]);

  // Load past trips
  useEffect(() => {
    if (!guideId) return;
    import("@/app/lib/supabase-browser").then(({ getSupabase }) => {
      const supabase = getSupabase();
      supabase
        .from("mileage_trips")
        .select("*")
        .eq("guide_id", guideId)
        .order("created_at", { ascending: false })
        .limit(20)
        .then(({ data }) => {
          if (data) setPastTrips(data);
        });
    });
  }, [guideId, saved]);

  // Timer
  useEffect(() => {
    if (tracking && !paused) {
      timerRef.current = setInterval(() => {
        setElapsed((Date.now() - startTime) / 1000);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [tracking, paused, startTime]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setError(null);
    setSaved(false);
    setPoints([]);
    setTotalDistance(0);
    setStartTime(Date.now());
    setElapsed(0);
    setTracking(true);
    setPaused(false);
    pointsRef.current = [];
    distanceRef.current = 0;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
        };
        setCurrentPos(newPoint);
        setAccuracy(Math.round(pos.coords.accuracy));

        const prev = pointsRef.current;
        // Only add point if moved at least 10m from last point (noise filter)
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          const dist = haversine(last.lat, last.lng, newPoint.lat, newPoint.lng);
          if (dist < 10) return; // Skip noisy readings
          distanceRef.current += dist;
          setTotalDistance(distanceRef.current);
        }

        const updated = [...prev, newPoint];
        pointsRef.current = updated;
        setPoints(updated);
      },
      (err) => {
        if (err.code === 1) setError("Location access denied. Enable location in your browser settings.");
        else if (err.code === 2) setError("Location unavailable. Make sure GPS is enabled.");
        else setError("Could not get your location. Try again.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    clearInterval(timerRef.current);
    setTracking(false);
    setPaused(false);
  }, []);

  const pauseTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    clearInterval(timerRef.current);
    setPaused(true);
  };

  const resumeTracking = () => {
    setPaused(false);
    setStartTime(Date.now() - elapsed * 1000);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: pos.timestamp };
        setCurrentPos(newPoint);
        setAccuracy(Math.round(pos.coords.accuracy));
        const prev = pointsRef.current;
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          const dist = haversine(last.lat, last.lng, newPoint.lat, newPoint.lng);
          if (dist < 10) return;
          distanceRef.current += dist;
          setTotalDistance(distanceRef.current);
        }
        const updated = [...prev, newPoint];
        pointsRef.current = updated;
        setPoints(updated);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  };

  // ─── Export map as image ──────────────────────────────────────────────────
  const exportMapImage = useCallback(async (tripData) => {
    const container = trackingMapRef.current?.getContainer?.();
    if (!container) {
      setError("Map not ready. Try again.");
      return null;
    }
    setExporting(true);
    try {
      const dataURL = await captureRouteImage(container, {
        miles: parseFloat(tripData.miles).toFixed(1),
        duration: formatDuration(tripData.duration_seconds || 0),
        date: tripData.date || new Date().toISOString().split("T")[0],
        description: tripData.description || "Trip",
      });
      return dataURL;
    } catch (e) {
      console.error("Map export error:", e);
      setError("Failed to capture route image.");
      return null;
    } finally {
      setExporting(false);
    }
  }, []);

  // ─── Download route image for current or past trip ────────────────────────
  const handleDownloadRoute = useCallback(async (tripData) => {
    const dataURL = await exportMapImage(tripData);
    if (dataURL) {
      const dateStr = (tripData.date || new Date().toISOString().split("T")[0]).replace(/-/g, "");
      const desc = (tripData.description || "trip").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
      downloadDataURL(dataURL, `ROM_Route_${dateStr}_${desc}.png`);
    }
  }, [exportMapImage]);

  const saveTrip = async () => {
    if (!guideId || points.length < 2) return;
    setSaving(true);
    const mi = metersToMiles(totalDistance);
    const ded = Math.round(mi * IRS_MILEAGE_RATE * 100) / 100;
    const tripDate = new Date().toISOString().split("T")[0];

    try {
      // Capture route image before saving
      let routeImageUrl = null;
      const container = trackingMapRef.current?.getContainer?.();
      if (container) {
        try {
          routeImageUrl = await captureRouteImage(container, {
            miles: mi.toFixed(1),
            duration: formatDuration(elapsed),
            date: tripDate,
            description: description || "Trip",
          });
        } catch (e) {
          console.error("Route image capture failed, saving trip without image:", e);
        }
      }

      // Save trip route to mileage_trips table
      const { getSupabase } = await import("@/app/lib/supabase-browser");
      const supabase = getSupabase();
      await supabase.from("mileage_trips").insert({
        guide_id: guideId,
        description: description || "Trip",
        miles: Math.round(mi * 10) / 10,
        duration_seconds: Math.round(elapsed),
        route_points: points,
        deduction_amount: ded,
        mileage_rate: IRS_MILEAGE_RATE,
        date: tripDate,
        route_image: routeImageUrl,
      });

      // Also log as expense
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideId,
          category: "Mileage",
          amount: ded,
          description: `${description || "Trip"} \u2014 ${mi.toFixed(1)} mi`,
          date: tripDate,
          mileage: Math.round(mi * 10) / 10,
          mileage_rate: IRS_MILEAGE_RATE,
        }),
      });

      setSaved(true);
      if (onTripSaved) onTripSaved();
    } catch (e) {
      console.error("Save trip error:", e);
      setError("Failed to save trip. Please try again.");
    }
    setSaving(false);
  };

  const miles = metersToMiles(totalDistance);
  const deduction = miles * IRS_MILEAGE_RATE;

  // Build trip data object for the currently displayed trip (live or selected past trip)
  const currentTripData = selectedTrip || {
    miles: miles.toFixed(1),
    duration_seconds: Math.round(elapsed),
    date: new Date().toISOString().split("T")[0],
    description: description || "Trip",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Live Tracker ── */}
      <SectionCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SectionHeader>GPS Mileage Tracker</SectionHeader>
          {tracking && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: paused ? T.gold : "#4ade80", animation: paused ? "none" : "pulse 1.5s infinite" }} />
              <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: paused ? T.gold : "#4ade80", fontWeight: 600 }}>
                {paused ? "PAUSED" : "TRACKING"}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontFamily: FONT_BODY, fontSize: 13, color: "#f08080" }}>
            {error}
          </div>
        )}

        {/* Map */}
        <div ref={mapContainerRef} style={{ height: 320, borderRadius: 10, overflow: "hidden", border: `1px solid ${T.wire}`, marginBottom: 16, position: "relative" }}>
          <TrackingMap
            ref={trackingMapRef}
            points={selectedTrip ? (selectedTrip.route_points || []) : points}
            currentPos={!selectedTrip ? currentPos : null}
            tracking={tracking}
          />
          {!tracking && points.length === 0 && !selectedTrip && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", zIndex: 500 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, marginBottom: 4 }}>Start tracking to log your route</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>GPS tracks your drive in real-time</div>
              </div>
            </div>
          )}
        </div>

        {/* Download Route button when viewing a past trip */}
        {selectedTrip && (
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <button
              onClick={() => handleDownloadRoute(selectedTrip)}
              disabled={exporting}
              style={{
                flex: 1, padding: "10px 16px", background: T.goldGlow, border: `1px solid ${T.gold}`,
                borderRadius: 8, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600,
                color: T.gold, cursor: exporting ? "wait" : "pointer", opacity: exporting ? 0.6 : 1,
                transition: "all 0.15s",
              }}
            >
              {exporting ? "Exporting..." : "Download Route Image"}
            </button>
            <button
              onClick={() => setSelectedTrip(null)}
              style={{
                padding: "10px 16px", background: T.lifted, border: `1px solid ${T.wire}`,
                borderRadius: 8, fontFamily: FONT_BODY, fontSize: 13, color: T.muted, cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        )}

        {/* Live Stats */}
        {(tracking || points.length > 1) && !selectedTrip && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ background: T.lifted, borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.gold }}>{miles.toFixed(1)}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.silver, fontWeight: 600 }}>MILES</div>
            </div>
            <div style={{ background: T.lifted, borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.white }}>{formatDuration(elapsed)}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.silver, fontWeight: 600 }}>DURATION</div>
            </div>
            <div style={{ background: T.lifted, borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: "#4ade80" }}>${deduction.toFixed(2)}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.silver, fontWeight: 600 }}>DEDUCTION</div>
            </div>
            <div style={{ background: T.lifted, borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.ash }}>{points.length}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.silver, fontWeight: 600 }}>GPS POINTS</div>
            </div>
          </div>
        )}

        {/* Controls */}
        {!tracking && points.length === 0 && !saved && !selectedTrip && (
          <GoldBtn full onClick={startTracking}>Start Tracking</GoldBtn>
        )}

        {tracking && (
          <div style={{ display: "flex", gap: 10 }}>
            {!paused ? (
              <button onClick={pauseTracking} style={{ flex: 1, padding: "12px", background: T.lifted, border: `1px solid ${T.wire}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, color: T.gold, cursor: "pointer" }}>
                Pause
              </button>
            ) : (
              <button onClick={resumeTracking} style={{ flex: 1, padding: "12px", background: T.goldGlow, border: `1px solid ${T.gold}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, color: T.gold, cursor: "pointer" }}>
                Resume
              </button>
            )}
            <button onClick={stopTracking} style={{ flex: 1, padding: "12px", background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.4)", borderRadius: 8, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, color: "#e74c3c", cursor: "pointer" }}>
              Stop
            </button>
          </div>
        )}

        {/* Save form (after stopping) */}
        {!tracking && points.length > 1 && !saved && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Trip description — e.g. Madison River shuttle, client pickup…"
              style={{ width: "100%", background: T.lifted, border: `1px solid ${T.wire}`, borderRadius: 8, padding: "12px 16px", fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, outline: "none" }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <GoldBtn full disabled={saving} onClick={saveTrip}>
                {saving ? "Saving…" : `Save Trip — ${miles.toFixed(1)} mi · $${deduction.toFixed(2)} deduction`}
              </GoldBtn>
              <button
                onClick={() => handleDownloadRoute(currentTripData)}
                disabled={exporting}
                style={{
                  padding: "12px 20px", background: T.goldGlow, border: `1px solid ${T.gold}`,
                  borderRadius: 8, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600,
                  color: T.gold, cursor: exporting ? "wait" : "pointer",
                  whiteSpace: "nowrap", opacity: exporting ? 0.6 : 1,
                }}
              >
                {exporting ? "..." : "Download Route"}
              </button>
              <button onClick={() => { setPoints([]); setTotalDistance(0); setElapsed(0); }} style={{ padding: "12px 20px", background: T.lifted, border: `1px solid ${T.wire}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 13, color: T.muted, cursor: "pointer" }}>
                Discard
              </button>
            </div>
          </div>
        )}

        {saved && (
          <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 8, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: "#4ade80", fontWeight: 600 }}>Trip saved</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.silver }}>{miles.toFixed(1)} miles · ${deduction.toFixed(2)} deduction logged</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => handleDownloadRoute(currentTripData)}
                disabled={exporting}
                style={{
                  background: T.goldGlow, border: `1px solid ${T.gold}`, borderRadius: 6,
                  padding: "8px 16px", fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600,
                  color: T.gold, cursor: exporting ? "wait" : "pointer",
                }}
              >
                {exporting ? "..." : "Download Route"}
              </button>
              <button onClick={() => { setPoints([]); setTotalDistance(0); setElapsed(0); setSaved(false); setDescription(""); setSelectedTrip(null); }} style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "8px 16px", fontFamily: FONT_BODY, fontSize: 13, color: T.ash, cursor: "pointer" }}>
                New Trip
              </button>
            </div>
          </div>
        )}

        {accuracy && tracking && (
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted, marginTop: 8, textAlign: "center" }}>
            GPS accuracy: ±{accuracy}m{accuracy > 50 ? " — move to an open area for better signal" : ""}
          </div>
        )}
      </SectionCard>

      {/* ── Past Trips ── */}
      {pastTrips.length > 0 && (
        <SectionCard>
          <SectionHeader>Trip History</SectionHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
            {pastTrips.map((trip) => (
              <div
                key={trip.id}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 14px", borderRadius: 8,
                  background: selectedTrip?.id === trip.id ? T.goldGlow : T.lifted,
                  border: `1px solid ${selectedTrip?.id === trip.id ? T.gold : "transparent"}`,
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                <div
                  onClick={() => setSelectedTrip(selectedTrip?.id === trip.id ? null : trip)}
                  style={{ display: "flex", gap: 14, alignItems: "center", flex: 1 }}
                >
                  <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: "#8ab4f8", fontWeight: 700, minWidth: 60 }}>
                    {parseFloat(trip.miles).toFixed(1)} mi
                  </div>
                  <div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment }}>{trip.description || "Trip"}</div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted }}>
                      {trip.date} · {formatDuration(trip.duration_seconds || 0)}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.gold, fontWeight: 600 }}>
                    ${parseFloat(trip.deduction_amount).toFixed(2)}
                  </div>
                  {trip.route_points && trip.route_points.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // First select the trip to render it on the map, then export after a tick
                        setSelectedTrip(trip);
                        setTimeout(() => handleDownloadRoute(trip), 600);
                      }}
                      disabled={exporting}
                      style={{
                        background: "transparent", border: `1px solid ${T.wire}`, borderRadius: 6,
                        padding: "4px 10px", fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600,
                        color: T.silver, cursor: "pointer", whiteSpace: "nowrap",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.color = T.gold; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.wire; e.currentTarget.style.color = T.silver; }}
                      title="Download route as PNG"
                    >
                      {exporting ? "..." : "Route"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
