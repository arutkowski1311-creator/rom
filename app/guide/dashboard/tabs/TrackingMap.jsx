"use client";
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Dark map tile layer
const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

// Gold color for route line
const ROUTE_COLOR = "#C9A55C";
const CURRENT_COLOR = "#4ade80";

const TrackingMap = forwardRef(function TrackingMap({ points = [], currentPos = null, tracking = false }, ref) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polylineRef = useRef(null);
  const markerRef = useRef(null);
  const pulseMarkerRef = useRef(null);

  // Expose the map container DOM node and map instance to parent via ref
  useImperativeHandle(ref, () => ({
    getContainer: () => mapRef.current,
    getMapInstance: () => mapInstanceRef.current,
  }));

  // Initialize map
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [39.8283, -98.5795], // Center of US
      zoom: 4,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update route polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const latlngs = points.map((p) => [p.lat, p.lng]);

    if (polylineRef.current) {
      polylineRef.current.setLatLngs(latlngs);
    } else if (latlngs.length > 0) {
      polylineRef.current = L.polyline(latlngs, {
        color: ROUTE_COLOR,
        weight: 3,
        opacity: 0.9,
        smoothFactor: 1,
      }).addTo(map);
    }

    // Fit bounds to route
    if (latlngs.length > 1) {
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    } else if (latlngs.length === 1) {
      map.setView(latlngs[0], 15);
    }
  }, [points]);

  // Update current position marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!currentPos) {
      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
      if (pulseMarkerRef.current) { pulseMarkerRef.current.remove(); pulseMarkerRef.current = null; }
      return;
    }

    const pos = [currentPos.lat, currentPos.lng];

    // Pulsing outer ring
    const pulseIcon = L.divIcon({
      className: "",
      html: `<div style="
        width: 24px; height: 24px; border-radius: 50%;
        background: ${tracking ? "rgba(74,222,128,0.2)" : "rgba(201,165,92,0.2)"};
        border: 2px solid ${tracking ? CURRENT_COLOR : ROUTE_COLOR};
        animation: ${tracking ? "mapPulse 1.5s infinite" : "none"};
      "></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    // Inner dot
    const dotIcon = L.divIcon({
      className: "",
      html: `<div style="
        width: 10px; height: 10px; border-radius: 50%;
        background: ${tracking ? CURRENT_COLOR : ROUTE_COLOR};
        box-shadow: 0 0 8px ${tracking ? CURRENT_COLOR : ROUTE_COLOR};
      "></div>`,
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });

    if (pulseMarkerRef.current) {
      pulseMarkerRef.current.setLatLng(pos);
      pulseMarkerRef.current.setIcon(pulseIcon);
    } else {
      pulseMarkerRef.current = L.marker(pos, { icon: pulseIcon, interactive: false }).addTo(map);
    }

    if (markerRef.current) {
      markerRef.current.setLatLng(pos);
      markerRef.current.setIcon(dotIcon);
    } else {
      markerRef.current = L.marker(pos, { icon: dotIcon, interactive: false }).addTo(map);
    }

    // Pan to current position while tracking
    if (tracking && points.length <= 3) {
      map.setView(pos, 15);
    }
  }, [currentPos, tracking, points.length]);

  // Clean up polyline and markers when points change to empty
  useEffect(() => {
    if (points.length === 0 && polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
  }, [points.length]);

  return (
    <>
      <div ref={mapRef} style={{ width: "100%", height: "100%", background: "#0a0a0a" }} />
      <style>{`
        @keyframes mapPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.3; }
        }
        .leaflet-control-zoom a {
          background: #1a1a1a !important;
          color: #999 !important;
          border-color: #2a2a2a !important;
        }
        .leaflet-control-zoom a:hover {
          background: #2a2a2a !important;
          color: #C9A55C !important;
        }
      `}</style>
    </>
  );
});

export default TrackingMap;
