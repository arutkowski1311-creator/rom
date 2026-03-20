"use client";
import { useState, useEffect, useRef } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";
import { GoldBtn, Stars, useIsMobile } from "@/app/components/ui";

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
const ACTIVITIES = [
  { label: "Fly Fishing", icon: "\u{1F3A3}" },
  { label: "Hunting", icon: "\u{1F98C}" },
  { label: "Rock Climbing", icon: "\u{1F9D7}" },
  { label: "Surfing", icon: "\u{1F3C4}" },
  { label: "Kayaking", icon: "\u{1F6A3}" },
  { label: "Diving", icon: "\u{1F93F}" },
  { label: "Hiking", icon: "\u{1F97E}" },
  { label: "Wildlife", icon: "\u{1F985}" },
  { label: "Photography", icon: "\u{1F4F7}" },
  { label: "Sailing", icon: "\u{26F5}" },
  { label: "Camping", icon: "\u{26FA}" },
  { label: "Mountain Biking", icon: "\u{1F6B5}" },
];

const VIBES = ["Adventure", "Cultural", "Foodie", "Relaxed", "Mixed"];

const CUISINES = ["Italian", "Asian", "American", "Local", "Seafood", "Vegetarian", "Mexican", "French", "BBQ", "Farm-to-Table"];

const LODGING_OPTIONS = ["Hotel", "Airbnb", "Either", "I have my own"];
const TRANSPORT_OPTIONS = ["Own Car", "Rental Car", "Rideshare", "Public Transit", "Walking"];

// ─── DESTINATION AUTOCOMPLETE LIST ────────────────────────────────────────
const DESTINATIONS = [
  "Bozeman, Montana", "Missoula, Montana", "Whitefish, Montana", "Big Sky, Montana", "Glacier National Park, Montana",
  "Lake Placid, New York", "Adirondacks, New York", "Finger Lakes, New York", "Hudson Valley, New York", "Catskills, New York",
  "Jackson Hole, Wyoming", "Yellowstone National Park, Wyoming", "Grand Teton National Park, Wyoming",
  "Bend, Oregon", "Portland, Oregon", "Hood River, Oregon", "Crater Lake, Oregon",
  "Park City, Utah", "Moab, Utah", "Zion National Park, Utah", "Bryce Canyon, Utah", "Salt Lake City, Utah",
  "Aspen, Colorado", "Vail, Colorado", "Telluride, Colorado", "Boulder, Colorado", "Denver, Colorado", "Durango, Colorado", "Steamboat Springs, Colorado",
  "Lake Tahoe, California", "Yosemite, California", "Big Sur, California", "Napa Valley, California", "Mammoth Lakes, California", "San Diego, California", "Joshua Tree, California",
  "Sedona, Arizona", "Scottsdale, Arizona", "Grand Canyon, Arizona", "Flagstaff, Arizona",
  "Maui, Hawaii", "Kauai, Hawaii", "Big Island, Hawaii", "Oahu, Hawaii",
  "Key West, Florida", "Everglades, Florida", "Destin, Florida", "Amelia Island, Florida", "Naples, Florida",
  "Charleston, South Carolina", "Hilton Head, South Carolina", "Kiawah Island, South Carolina",
  "Savannah, Georgia", "Blue Ridge, Georgia",
  "Asheville, North Carolina", "Outer Banks, North Carolina", "Smoky Mountains, North Carolina",
  "Nashville, Tennessee", "Gatlinburg, Tennessee", "Chattanooga, Tennessee",
  "Austin, Texas", "Fredericksburg, Texas", "Big Bend, Texas", "Marfa, Texas",
  "New Orleans, Louisiana", "Baton Rouge, Louisiana",
  "Traverse City, Michigan", "Mackinac Island, Michigan", "Upper Peninsula, Michigan",
  "Door County, Wisconsin", "Madison, Wisconsin",
  "Boundary Waters, Minnesota", "Duluth, Minnesota",
  "Acadia National Park, Maine", "Portland, Maine", "Bar Harbor, Maine", "Kennebunkport, Maine",
  "Cape Cod, Massachusetts", "Martha's Vineyard, Massachusetts", "Nantucket, Massachusetts", "Boston, Massachusetts",
  "Stowe, Vermont", "Burlington, Vermont", "Killington, Vermont",
  "White Mountains, New Hampshire", "Lake Winnipesaukee, New Hampshire",
  "Newport, Rhode Island", "Block Island, Rhode Island",
  "Sun Valley, Idaho", "Coeur d'Alene, Idaho", "McCall, Idaho",
  "Glacier Bay, Alaska", "Denali, Alaska", "Anchorage, Alaska", "Sitka, Alaska",
  "Taos, New Mexico", "Santa Fe, New Mexico",
  "Tulum, Mexico", "Cabo San Lucas, Mexico", "Puerto Vallarta, Mexico", "Cancun, Mexico",
  "Banff, Canada", "Whistler, Canada", "Tofino, Canada", "Jasper, Canada",
  "Costa Rica", "Belize", "Patagonia, Argentina", "Iceland", "New Zealand",
  "Whiteface Mountain, New York", "Saranac Lake, New York", "Tupper Lake, New York",
];

const DEFAULT_ALLOCATION = { flights: 0.20, lodging: 0.30, dining: 0.17, guide: 0.13, activities: 0.10, transportation: 0.07, buffer: 0.03 };
const ALLOC_LABELS = { flights: "\u{2708}\u{FE0F} Flights", lodging: "\u{1F3E8} Lodging", dining: "\u{1F37D}\u{FE0F} Dining", guide: "\u{1F9ED} Guide", activities: "\u{1F3DF}\u{FE0F} Activities", transportation: "\u{1F697} Transportation", buffer: "\u{1F392} Buffer" };

const STANDARD_STEPS = ["mode", "destination", "dates", "party", "vibe", "activity", "budget", "allocation", "flights", "lodging", "cuisine", "transport", "requests"];
const SURPRISE_STEPS = ["mode", "destination", "dates", "party", "budget", "allocation", "requests"];

// ─── HELPERS ────────────────────────────────────────────────────────────────
function todayISO() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

function nextDayISO(dateStr) {
  if (!dateStr) return todayISO();
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function formatCurrency(n) {
  return "$" + Math.round(n).toLocaleString();
}

// ─── VIBE GRADIENTS FOR SOCIAL CARD ────────────────────────────────────────
const VIBE_GRADIENTS = {
  Adventure: "linear-gradient(135deg, #1a3a2a 0%, #0d1f15 30%, #2d1810 70%, #1a0e08 100%)",
  Cultural: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #1a1a2e 100%)",
  Foodie: "linear-gradient(135deg, #2d1810 0%, #1a0e08 30%, #3d1a0a 60%, #1a0505 100%)",
  Relaxed: "linear-gradient(135deg, #0a1628 0%, #0d2137 40%, #0a2a3a 70%, #061520 100%)",
  Mixed: "linear-gradient(135deg, #1a1520 0%, #1f1a30 40%, #251a20 70%, #0d0a15 100%)",
  default: "linear-gradient(135deg, #0d0d0d 0%, #1a1510 40%, #0d0d0d 70%, #1a1510 100%)",
};

function getVibeGradient(vibes) {
  if (!vibes || vibes.length === 0) return VIBE_GRADIENTS.default;
  return VIBE_GRADIENTS[vibes[0]] || VIBE_GRADIENTS.default;
}

// ─── DESTINATION PHOTOS FOR SOCIAL CARD ────────────────────────────────────
// Curated Unsplash photo IDs mapped to destinations. Stable CDN URLs, no API key needed.
const DESTINATION_PHOTOS = {
  "Bozeman, Montana": "photo-1508193638397-1c4234db14d8",
  "Big Sky, Montana": "photo-1508193638397-1c4234db14d8",
  "Missoula, Montana": "photo-1469854523086-cc02fe5d8800",
  "Whitefish, Montana": "photo-1519681393784-d120267933ba",
  "Glacier National Park, Montana": "photo-1501785888041-af3ef285b470",
  "Lake Placid, New York": "photo-1507041957456-9c397ce39c97",
  "Adirondacks, New York": "photo-1507041957456-9c397ce39c97",
  "Saranac Lake, New York": "photo-1507041957456-9c397ce39c97",
  "Finger Lakes, New York": "photo-1506905925346-21bda4d32df4",
  "Hudson Valley, New York": "photo-1508739773434-c26b3d09e071",
  "Catskills, New York": "photo-1441974231531-c6227db76b6e",
  "Jackson Hole, Wyoming": "photo-1506905925346-21bda4d32df4",
  "Yellowstone National Park, Wyoming": "photo-1529439322271-42931c09bfb1",
  "Grand Teton National Park, Wyoming": "photo-1508193638397-1c4234db14d8",
  "Bend, Oregon": "photo-1475924156734-496f6cac6ec1",
  "Portland, Oregon": "photo-1477959858617-67f85cf4f1df",
  "Crater Lake, Oregon": "photo-1464822759023-fed622ff2c3b",
  "Park City, Utah": "photo-1519681393784-d120267933ba",
  "Moab, Utah": "photo-1474044159687-1ee9f3a51722",
  "Zion National Park, Utah": "photo-1474044159687-1ee9f3a51722",
  "Bryce Canyon, Utah": "photo-1474044159687-1ee9f3a51722",
  "Aspen, Colorado": "photo-1519681393784-d120267933ba",
  "Vail, Colorado": "photo-1519681393784-d120267933ba",
  "Telluride, Colorado": "photo-1464822759023-fed622ff2c3b",
  "Boulder, Colorado": "photo-1506905925346-21bda4d32df4",
  "Denver, Colorado": "photo-1546156929-a4c0ac411f47",
  "Durango, Colorado": "photo-1464822759023-fed622ff2c3b",
  "Steamboat Springs, Colorado": "photo-1519681393784-d120267933ba",
  "Lake Tahoe, California": "photo-1501785888041-af3ef285b470",
  "Yosemite, California": "photo-1426604966848-d7adac402bff",
  "Big Sur, California": "photo-1449034446853-66c86144b0ad",
  "Napa Valley, California": "photo-1506377247377-2a5b3b417ebb",
  "San Diego, California": "photo-1512100356356-de1b84283e18",
  "Joshua Tree, California": "photo-1451187580459-43490279c0fa",
  "Sedona, Arizona": "photo-1518098268026-4e89f1a2cd8e",
  "Scottsdale, Arizona": "photo-1518098268026-4e89f1a2cd8e",
  "Grand Canyon, Arizona": "photo-1474044159687-1ee9f3a51722",
  "Maui, Hawaii": "photo-1507525428034-b723cf961d3e",
  "Kauai, Hawaii": "photo-1505852679233-d9fd70aff56d",
  "Big Island, Hawaii": "photo-1542259009477-d625272157b7",
  "Oahu, Hawaii": "photo-1507525428034-b723cf961d3e",
  "Key West, Florida": "photo-1507525428034-b723cf961d3e",
  "Charleston, South Carolina": "photo-1508739773434-c26b3d09e071",
  "Asheville, North Carolina": "photo-1441974231531-c6227db76b6e",
  "Smoky Mountains, North Carolina": "photo-1441974231531-c6227db76b6e",
  "Nashville, Tennessee": "photo-1546156929-a4c0ac411f47",
  "Austin, Texas": "photo-1546156929-a4c0ac411f47",
  "New Orleans, Louisiana": "photo-1546156929-a4c0ac411f47",
  "Acadia National Park, Maine": "photo-1507041957456-9c397ce39c97",
  "Portland, Maine": "photo-1507041957456-9c397ce39c97",
  "Cape Cod, Massachusetts": "photo-1507525428034-b723cf961d3e",
  "Stowe, Vermont": "photo-1519681393784-d120267933ba",
  "Burlington, Vermont": "photo-1441974231531-c6227db76b6e",
  "Sun Valley, Idaho": "photo-1508193638397-1c4234db14d8",
  "Denali, Alaska": "photo-1464822759023-fed622ff2c3b",
  "Anchorage, Alaska": "photo-1464822759023-fed622ff2c3b",
  "Taos, New Mexico": "photo-1518098268026-4e89f1a2cd8e",
  "Santa Fe, New Mexico": "photo-1518098268026-4e89f1a2cd8e",
  "Banff, Canada": "photo-1501785888041-af3ef285b470",
  "Whistler, Canada": "photo-1519681393784-d120267933ba",
  "Costa Rica": "photo-1505852679233-d9fd70aff56d",
  "Iceland": "photo-1504829857797-ddff29c27927",
  "New Zealand": "photo-1469854523086-cc02fe5d8800",
  "Patagonia, Argentina": "photo-1464822759023-fed622ff2c3b",
};

function getDestinationPhoto(destination) {
  if (!destination) return null;
  // Exact match
  if (DESTINATION_PHOTOS[destination]) {
    return `https://images.unsplash.com/${DESTINATION_PHOTOS[destination]}?w=1080&h=1920&fit=crop&q=80`;
  }
  // Partial match — check if destination contains a key or vice versa
  const destLower = destination.toLowerCase();
  for (const [key, photoId] of Object.entries(DESTINATION_PHOTOS)) {
    if (destLower.includes(key.split(",")[0].toLowerCase()) || key.toLowerCase().includes(destLower)) {
      return `https://images.unsplash.com/${photoId}?w=1080&h=1920&fit=crop&q=80`;
    }
  }
  return null;
}

function makeGoogleMapsLink(name, destination) {
  return `https://www.google.com/maps/search/${encodeURIComponent(name + " " + destination)}`;
}

// ─── SLIDER COMPONENT ──────────────────────────────────────────────────────
function BudgetSlider({ label, value, max, onChange }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.ash }}>{label}</span>
        <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: T.white }}>{formatCurrency(value)}</span>
      </div>
      <div style={{ position: "relative", height: 6, background: T.wire, borderRadius: 3 }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(pct, 100)}%`, background: T.gold, borderRadius: 3, transition: "width 0.1s" }} />
      </div>
      <input
        type="range" min={0} max={max} step={10} value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        style={{ width: "100%", marginTop: 4, accentColor: T.gold, cursor: "pointer", opacity: 0.01, position: "relative", top: -14, height: 20 }}
      />
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function ConciergePage() {
  const isMobile = useIsMobile();
  const [generating, setGenerating] = useState(false);
  const [itinerary, setItinerary] = useState(null);
  const [tripPlanId, setTripPlanId] = useState(null);
  const [shareToken, setShareToken] = useState(null);
  const [refineInput, setRefineInput] = useState("");
  const [refining, setRefining] = useState(false);
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [mode, setMode] = useState(""); // "standard" | "surprise"
  const [destination, setDestination] = useState("");
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const destRef = useRef(null);
  const socialCardRef = useRef(null);
  const [downloadingCard, setDownloadingCard] = useState(false);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [vibes, setVibes] = useState([]);
  const [mainActivity, setMainActivity] = useState("");
  const [customActivity, setCustomActivity] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [allocation, setAllocation] = useState({});
  const [flightOrigin, setFlightOrigin] = useState("");
  const [lodgingPref, setLodgingPref] = useState("");
  const [cuisinePrefs, setCuisinePrefs] = useState([]);
  const [transportPref, setTransportPref] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  const steps = mode === "surprise" ? SURPRISE_STEPS : STANDARD_STEPS;
  const [step, setStep] = useState(0);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (destRef.current && !destRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filterDestinations = (query) => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return DESTINATIONS.filter(d => d.toLowerCase().includes(q)).slice(0, 8);
  };

  const handleDestChange = (val) => {
    setDestination(val);
    const matches = filterDestinations(val);
    setDestSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  const selectDestination = (dest) => {
    setDestination(dest);
    setShowSuggestions(false);
  };

  // Social card download
  const handleDownloadCard = async () => {
    if (!socialCardRef.current) return;
    setDownloadingCard(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(socialCardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });
      const link = document.createElement("a");
      link.download = `rom-trip-${destination.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Card download error:", err);
    }
    setDownloadingCard(false);
  };

  // Email itinerary
  const handleEmailItinerary = () => {
    if (!itinerary) return;
    const subject = `Your ROM Trip — ${itinerary.title || destination}`;
    let body = `${itinerary.title}\n${itinerary.summary}\n\n`;
    if (itinerary.guide?.name) body += `Guide: ${itinerary.guide.name}\n${itinerary.guide.reason}\n\n`;
    itinerary.days?.forEach(day => {
      body += `--- Day ${day.dayNumber || ""}: ${day.title} ---\n`;
      ["morning", "afternoon", "evening"].forEach(p => {
        if (day[p]?.name) body += `${p.charAt(0).toUpperCase() + p.slice(1)}: ${day[p].name} — ${day[p].description || ""}\n`;
      });
      body += "\n";
    });
    if (itinerary.lodging?.length) { body += "LODGING:\n"; itinerary.lodging.forEach(l => { body += `• ${l.name} (${l.type}) — ${l.pricePerNight || ""}/night\n`; }); body += "\n"; }
    if (itinerary.dining?.length) { body += "DINING:\n"; itinerary.dining.forEach(d => { body += `• ${d.name} — ${d.cuisine} (${d.priceRange || ""})\n`; }); body += "\n"; }
    if (itinerary.budgetSummary?.total) body += `BUDGET TOTAL: ${itinerary.budgetSummary.total}\n\n`;
    body += `View full trip: ${shareToken ? `${window.location.origin}/trip/${shareToken}` : window.location.href}\n\nBuilt with ROM — romlife.co/concierge`;
    // Truncate if needed for mailto limit
    if (body.length > 1800) body = body.substring(0, 1800) + `\n\n... View full itinerary: ${shareToken ? `${window.location.origin}/trip/${shareToken}` : window.location.href}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Calendar .ics download
  const handleDownloadCalendar = () => {
    if (!itinerary?.days) return;
    const formatDate = (dateStr) => dateStr.replace(/-/g, "");
    const addDay = (dateStr, n) => {
      const d = new Date(dateStr + "T12:00:00");
      d.setDate(d.getDate() + n);
      return d.toISOString().split("T")[0].replace(/-/g, "");
    };
    const startDate = dateStart || new Date().toISOString().split("T")[0];
    let events = "";
    itinerary.days.forEach((day, i) => {
      const dayDate = formatDate(startDate).length === 8 ? addDay(startDate, i) : formatDate(startDate);
      const nextDate = addDay(startDate, i + 1);
      let desc = "";
      ["morning", "afternoon", "evening"].forEach(p => {
        if (day[p]?.name) desc += `${p.charAt(0).toUpperCase() + p.slice(1)}: ${day[p].name}\\n${day[p].description || ""}\\n\\n`;
      });
      events += `BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:${dayDate}\r\nDTEND;VALUE=DATE:${nextDate}\r\nSUMMARY:Day ${day.dayNumber || i + 1} — ${day.title}\r\nDESCRIPTION:${desc.replace(/\n/g, "\\n")}\r\nLOCATION:${destination}\r\nEND:VEVENT\r\n`;
    });
    const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//ROM//Trip//EN\r\nCALSCALE:GREGORIAN\r\n${events}END:VCALENDAR`;
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rom-trip-${destination.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // When budget changes, recalculate allocation
  useEffect(() => {
    const budget = parseFloat(totalBudget) || 0;
    if (budget <= 0) return;
    const noFlights = !flightOrigin;
    const ownLodging = lodgingPref === "I have my own";
    let alloc = { ...DEFAULT_ALLOCATION };
    if (noFlights) { const extra = alloc.flights / 6; alloc.flights = 0; Object.keys(alloc).forEach(k => { if (k !== "flights") alloc[k] += extra; }); }
    if (ownLodging) { const extra = alloc.lodging / 5; alloc.lodging = 0; Object.keys(alloc).forEach(k => { if (k !== "lodging" && k !== "flights") alloc[k] += extra; }); }
    const result = {};
    Object.keys(alloc).forEach(k => { result[k] = Math.round(budget * alloc[k]); });
    setAllocation(result);
  }, [totalBudget, flightOrigin, lodgingPref]);

  const updateAllocation = (key, val) => {
    setAllocation(prev => ({ ...prev, [key]: val }));
  };

  const allocTotal = Object.values(allocation).reduce((s, v) => s + (v || 0), 0);
  const budgetNum = parseFloat(totalBudget) || 0;
  const allocRemaining = budgetNum - allocTotal;

  const canAdvance = () => {
    const s = steps[step];
    switch (s) {
      case "mode": return mode !== "";
      case "destination": return destination.length > 2;
      case "dates": return dateStart && dateEnd;
      case "party": return adults >= 1;
      case "vibe": return vibes.length > 0;
      case "activity": return mainActivity !== "" || customActivity.length > 2;
      case "budget": return parseFloat(totalBudget) > 0;
      case "allocation": return true;
      case "flights": return true; // optional
      case "lodging": return lodgingPref !== "";
      case "cuisine": return true; // optional
      case "transport": return transportPref !== "";
      case "requests": return true; // optional
      default: return false;
    }
  };

  const advance = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleGenerate();
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          destination,
          dateStart: dateStart || undefined,
          dateEnd: dateEnd || undefined,
          adults,
          children,
          tripVibe: vibes,
          mainActivity: mainActivity || customActivity || undefined,
          totalBudget: budgetNum || undefined,
          budgetAllocation: Object.keys(allocation).length > 0 ? allocation : undefined,
          flightOrigin: flightOrigin || undefined,
          lodgingPreference: lodgingPref || undefined,
          cuisinePreferences: cuisinePrefs.length > 0 ? cuisinePrefs : undefined,
          transportPreference: transportPref || undefined,
          specialRequests: specialRequests || undefined,
          guestId: user?.id || undefined,
        }),
      });
      const data = await res.json();
      if (data.itinerary) {
        setItinerary(data.itinerary);
        setTripPlanId(data.tripPlanId);
        setShareToken(data.shareToken);
      }
    } catch (err) {
      console.error("Concierge error:", err);
    }
    setGenerating(false);
  };

  const handleRefine = async () => {
    if (!refineInput.trim() || !tripPlanId) return;
    setRefining(true);
    try {
      const res = await fetch("/api/ai/concierge/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripPlanId, refinement: refineInput }),
      });
      const data = await res.json();
      if (data.itinerary) { setItinerary(data.itinerary); setRefineInput(""); }
    } catch (err) { console.error("Refine error:", err); }
    setRefining(false);
  };

  const handleShare = () => {
    const url = shareToken ? `${window.location.origin}/trip/${shareToken}` : window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── ITINERARY VIEW ──────────────────────────────────────────────────────
  if (itinerary) return <ItineraryView itinerary={itinerary} isMobile={isMobile} refineInput={refineInput} setRefineInput={setRefineInput} handleRefine={handleRefine} refining={refining} handleShare={handleShare} copied={copied} shareToken={shareToken} onStartOver={() => { setItinerary(null); setStep(0); setMode(""); }} destination={destination} dateStart={dateStart} dateEnd={dateEnd} adults={adults} children={children} socialCardRef={socialCardRef} handleDownloadCard={handleDownloadCard} downloadingCard={downloadingCard} vibes={vibes} handleEmailItinerary={handleEmailItinerary} handleDownloadCalendar={handleDownloadCalendar} />;

  // ─── LOADING STATE ────────────────────────────────────────────────────────
  if (generating) return (
    <div style={{ minHeight: "100vh", background: T.void, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: T.gold, letterSpacing: "0.12em" }}>RŌM</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.white }}>Building your trip...</div>
      <div style={{ width: 200, height: 3, background: T.wire, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: "40%", height: "100%", background: T.gold, borderRadius: 2, animation: "conciergeLoad 1.5s ease-in-out infinite alternate" }} />
      </div>
      <style>{`@keyframes conciergeLoad { from { margin-left: 0; } to { margin-left: 60%; } }`}</style>
      <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.muted, textAlign: "center", maxWidth: 300 }}>
        {mode === "surprise"
          ? "Curating the perfect surprise. Sit tight."
          : "Matching you with the right guide, mapping out your days, finding the best places to eat and stay."}
      </div>
    </div>
  );

  // ─── Q&A FLOW ─────────────────────────────────────────────────────────────
  const s = steps[step];

  return (
    <div style={{ minHeight: "100vh", background: T.void, display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.gold, letterSpacing: "0.12em", cursor: "pointer" }} onClick={() => window.location.href = "/"}>RŌM</div>
        {step > 0 && <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>{step} of {steps.length - 1}</div>}
      </div>

      {/* Progress bar */}
      {step > 0 && (
        <div style={{ height: 2, background: T.wire, margin: "0 24px" }}>
          <div style={{ height: "100%", background: T.gold, width: `${(step / (steps.length - 1)) * 100}%`, transition: "width 0.3s", borderRadius: 1 }} />
        </div>
      )}

      {/* Card */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "40px 20px" : "60px 24px" }}>
        <div style={{ maxWidth: 640, width: "100%" }}>

          {/* Step: Mode */}
          {s === "mode" && (
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 32 : 48, color: T.white, marginBottom: 8, lineHeight: 1.1 }}>Where to next.</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 16, color: T.silver, marginBottom: 32 }}>How do you want to do this?</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[
                  { id: "standard", title: "RŌM Concierge", sub: "We'll handle the details. You set the direction." },
                  { id: "surprise", title: "Surprise Me", sub: "Just the basics. We handle everything else." },
                ].map(m => (
                  <button key={m.id} onClick={() => { setMode(m.id); setStep(1); }}
                    style={{ background: mode === m.id ? T.goldGlow : T.steel, border: `1.5px solid ${mode === m.id ? T.gold : T.wire}`, borderRadius: 12, padding: isMobile ? "24px 16px" : "32px 24px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: mode === m.id ? T.gold : T.white, marginBottom: 8 }}>{m.title}</div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver, lineHeight: 1.5 }}>{m.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Destination */}
          {s === "destination" && (
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 32 : 42, color: T.white, marginBottom: 8 }}>Where are you headed?</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver, marginBottom: 28 }}>A city, region, or landmark.</div>
              <div ref={destRef} style={{ position: "relative" }}>
                <input autoFocus type="text" placeholder="e.g., Bozeman, Montana" value={destination}
                  onChange={e => handleDestChange(e.target.value)}
                  onFocus={() => { if (destSuggestions.length > 0) setShowSuggestions(true); }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && canAdvance()) advance();
                    if (e.key === "Escape") setShowSuggestions(false);
                  }}
                  style={{ width: "100%", background: T.steel, border: `1px solid ${showSuggestions ? T.gold : T.wire}`, borderRadius: showSuggestions ? "10px 10px 0 0" : 10, padding: "16px 20px", fontFamily: FONT_BODY, fontSize: 18, color: T.parchment, outline: "none", boxSizing: "border-box" }} />
                {showSuggestions && destSuggestions.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: T.steel, border: `1px solid ${T.gold}`, borderTop: "none", borderRadius: "0 0 10px 10px", zIndex: 50, overflow: "hidden" }}>
                    {destSuggestions.map((d, i) => (
                      <button key={d} onClick={() => selectDestination(d)}
                        style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", borderTop: i > 0 ? `1px solid ${T.wire}` : "none", padding: "14px 20px", fontFamily: FONT_BODY, fontSize: 16, color: T.parchment, cursor: "pointer" }}
                        onMouseEnter={e => e.target.style.background = T.lifted}
                        onMouseLeave={e => e.target.style.background = "none"}>
                        {d}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step: Dates */}
          {s === "dates" && (
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 32 : 42, color: T.white, marginBottom: 8 }}>When are you going?</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver, marginBottom: 28 }}>Pick your arrival and departure dates.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.silver, display: "block", marginBottom: 6 }}>Arrival</label>
                  <input type="date" value={dateStart} min={todayISO()} onChange={e => { setDateStart(e.target.value); if (dateEnd && e.target.value >= dateEnd) setDateEnd(""); }}
                    style={{ width: "100%", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: "14px 16px", fontFamily: FONT_BODY, fontSize: 15, color: T.parchment, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.silver, display: "block", marginBottom: 6 }}>Departure</label>
                  <input type="date" value={dateEnd} min={nextDayISO(dateStart)} onChange={e => setDateEnd(e.target.value)}
                    style={{ width: "100%", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: "14px 16px", fontFamily: FONT_BODY, fontSize: 15, color: T.parchment, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
            </div>
          )}

          {/* Step: Party */}
          {s === "party" && (
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 32 : 42, color: T.white, marginBottom: 28 }}>Who is coming?</div>
              {[
                { label: "Adults", value: adults, set: setAdults, min: 1 },
                { label: "Children", value: children, set: setChildren, min: 0 },
              ].map(p => (
                <div key={p.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: `1px solid ${T.wire}` }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 16, color: T.ash }}>{p.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <button onClick={() => p.set(Math.max(p.min, p.value - 1))}
                      style={{ width: 40, height: 40, borderRadius: "50%", background: T.steel, border: `1px solid ${T.wire}`, fontFamily: FONT_BODY, fontSize: 18, color: T.ash, cursor: "pointer" }}>{"\u2212"}</button>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.white, minWidth: 40, textAlign: "center" }}>{p.value}</div>
                    <button onClick={() => p.set(p.value + 1)}
                      style={{ width: 40, height: 40, borderRadius: "50%", background: T.steel, border: `1px solid ${T.wire}`, fontFamily: FONT_BODY, fontSize: 18, color: T.ash, cursor: "pointer" }}>+</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step: Vibe */}
          {s === "vibe" && (
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 32 : 42, color: T.white, marginBottom: 8 }}>What is the vibe?</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver, marginBottom: 28 }}>Select all that apply.</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {VIBES.map(v => {
                  const sel = vibes.includes(v);
                  return (
                    <button key={v} onClick={() => setVibes(sel ? vibes.filter(x => x !== v) : [...vibes, v])}
                      style={{ background: sel ? T.goldGlow : T.steel, border: `1.5px solid ${sel ? T.gold : T.wire}`, borderRadius: 20, padding: "10px 20px", fontFamily: FONT_BODY, fontSize: 15, color: sel ? T.gold : T.ash, cursor: "pointer", transition: "all 0.15s" }}>
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step: Activity */}
          {s === "activity" && (
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 32 : 42, color: T.white, marginBottom: 8 }}>Main activity?</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver, marginBottom: 28 }}>Pick one or type your own.</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 16 }}>
                {ACTIVITIES.map(a => {
                  const sel = mainActivity === a.label;
                  return (
                    <button key={a.label} onClick={() => { setMainActivity(sel ? "" : a.label); setCustomActivity(""); }}
                      style={{ background: sel ? T.goldGlow : T.steel, border: `1.5px solid ${sel ? T.gold : T.wire}`, borderRadius: 10, padding: "14px 10px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "all 0.15s" }}>
                      <span style={{ fontSize: 24 }}>{a.icon}</span>
                      <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: sel ? T.gold : T.ash }}>{a.label}</span>
                    </button>
                  );
                })}
              </div>
              <input type="text" placeholder="Or type something else..." value={customActivity} onChange={e => { setCustomActivity(e.target.value); setMainActivity(""); }}
                style={{ width: "100%", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: "12px 16px", fontFamily: FONT_BODY, fontSize: 15, color: T.parchment, outline: "none", boxSizing: "border-box" }} />
            </div>
          )}

          {/* Step: Budget */}
          {s === "budget" && (
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 32 : 42, color: T.white, marginBottom: 8 }}>Total budget?</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver, marginBottom: 28 }}>One number. We will allocate it across categories.</div>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", fontFamily: FONT_DISPLAY, fontSize: 24, color: T.gold }}>$</span>
                <input autoFocus type="number" placeholder="3,000" value={totalBudget} onChange={e => setTotalBudget(e.target.value)} onKeyDown={e => e.key === "Enter" && canAdvance() && advance()}
                  style={{ width: "100%", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 10, padding: "16px 20px 16px 44px", fontFamily: FONT_DISPLAY, fontSize: 24, color: T.parchment, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
          )}

          {/* Step: Budget Allocation */}
          {s === "allocation" && (
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 28 : 36, color: T.white, marginBottom: 8 }}>Allocate your budget</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver, marginBottom: 8 }}>Drag to adjust. We set a smart default.</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: allocRemaining < 0 ? "#e74c3c" : T.gold, marginBottom: 24 }}>
                {allocRemaining >= 0 ? `${formatCurrency(allocRemaining)} remaining` : `${formatCurrency(Math.abs(allocRemaining))} over budget`}
              </div>
              {Object.entries(ALLOC_LABELS).map(([key, label]) => {
                if (key === "flights" && !flightOrigin) return null;
                if (key === "lodging" && lodgingPref === "I have my own") return null;
                return (
                  <BudgetSlider key={key} label={label} value={allocation[key] || 0} max={budgetNum} onChange={v => updateAllocation(key, v)} />
                );
              })}
            </div>
          )}

          {/* Step: Flights */}
          {s === "flights" && (
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 32 : 42, color: T.white, marginBottom: 8 }}>Flying in?</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver, marginBottom: 28 }}>Leave blank if you are driving or already local.</div>
              <input autoFocus type="text" placeholder="e.g., Chicago, IL" value={flightOrigin} onChange={e => setFlightOrigin(e.target.value)} onKeyDown={e => e.key === "Enter" && advance()}
                style={{ width: "100%", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 10, padding: "16px 20px", fontFamily: FONT_BODY, fontSize: 18, color: T.parchment, outline: "none", boxSizing: "border-box" }} />
            </div>
          )}

          {/* Step: Lodging */}
          {s === "lodging" && (
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 32 : 42, color: T.white, marginBottom: 28 }}>Where do you want to stay?</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {LODGING_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => setLodgingPref(opt)}
                    style={{ background: lodgingPref === opt ? T.goldGlow : T.steel, border: `1.5px solid ${lodgingPref === opt ? T.gold : T.wire}`, borderRadius: 10, padding: "18px 16px", cursor: "pointer", transition: "all 0.15s" }}>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 16, fontWeight: 600, color: lodgingPref === opt ? T.gold : T.white }}>{opt}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Cuisine */}
          {s === "cuisine" && (
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 32 : 42, color: T.white, marginBottom: 8 }}>Cuisine preferences?</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver, marginBottom: 28 }}>Optional. Select any that appeal.</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {CUISINES.map(c => {
                  const sel = cuisinePrefs.includes(c);
                  return (
                    <button key={c} onClick={() => setCuisinePrefs(sel ? cuisinePrefs.filter(x => x !== c) : [...cuisinePrefs, c])}
                      style={{ background: sel ? T.goldGlow : T.steel, border: `1.5px solid ${sel ? T.gold : T.wire}`, borderRadius: 20, padding: "10px 18px", fontFamily: FONT_BODY, fontSize: 14, color: sel ? T.gold : T.ash, cursor: "pointer", transition: "all 0.15s" }}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step: Transportation */}
          {s === "transport" && (
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 32 : 42, color: T.white, marginBottom: 28 }}>How do you want to get around?</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {TRANSPORT_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => setTransportPref(opt)}
                    style={{ background: transportPref === opt ? T.goldGlow : T.steel, border: `1.5px solid ${transportPref === opt ? T.gold : T.wire}`, borderRadius: 10, padding: "18px 16px", cursor: "pointer", transition: "all 0.15s" }}>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 16, fontWeight: 600, color: transportPref === opt ? T.gold : T.white }}>{opt}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Requests */}
          {s === "requests" && (
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 32 : 42, color: T.white, marginBottom: 8 }}>Anything else?</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver, marginBottom: 28 }}>Dietary needs, accessibility, specific interests. Optional.</div>
              <textarea value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} placeholder="e.g., My wife is vegetarian, we'd love a place with a hot tub" rows={4}
                style={{ width: "100%", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 10, padding: "16px 20px", fontFamily: FONT_BODY, fontSize: 15, color: T.parchment, outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" }} />
            </div>
          )}

          {/* Navigation */}
          {s !== "mode" && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, gap: 12 }}>
              <button onClick={() => setStep(step - 1)}
                style={{ background: "none", border: `1px solid ${T.wire}`, borderRadius: 8, padding: "12px 24px", fontFamily: FONT_BODY, fontSize: 14, color: T.ash, cursor: "pointer" }}>
                Back
              </button>
              <GoldBtn onClick={advance} disabled={!canAdvance()}>
                {step === steps.length - 1 ? "Build My Trip" : "Continue"}
              </GoldBtn>
            </div>
          )}

          {/* Summary Pills */}
          {step > 1 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
              {mode === "surprise" && <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold, background: T.goldGlow, borderRadius: 12, padding: "4px 10px" }}>Surprise Me</span>}
              {destination && <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold, background: T.goldGlow, borderRadius: 12, padding: "4px 10px" }}>{destination}</span>}
              {dateStart && <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.ash, background: T.lifted, borderRadius: 12, padding: "4px 10px" }}>{dateStart} - {dateEnd}</span>}
              {adults > 0 && step > 3 && <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.ash, background: T.lifted, borderRadius: 12, padding: "4px 10px" }}>{adults}A{children > 0 ? ` ${children}C` : ""}</span>}
              {totalBudget && step > 6 && <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.ash, background: T.lifted, borderRadius: 12, padding: "4px 10px" }}>${totalBudget}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ITINERARY VIEW COMPONENT ───────────────────────────────────────────────
function ItineraryView({ itinerary, isMobile, refineInput, setRefineInput, handleRefine, refining, handleShare, copied, shareToken, onStartOver, destination, dateStart, dateEnd, adults, children, socialCardRef, handleDownloadCard, downloadingCard, vibes, handleEmailItinerary, handleDownloadCalendar }) {
  return (
    <div style={{ minHeight: "100vh", background: T.void, color: T.parchment }}>
      {/* Header */}
      <div style={{ background: T.carbon, borderBottom: `1px solid ${T.wire}`, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.gold, letterSpacing: "0.12em" }}>RŌM</div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={handleDownloadCard} disabled={downloadingCard} style={{ background: T.gold, border: "none", borderRadius: 6, padding: "8px 16px", fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: T.ink, cursor: "pointer", opacity: downloadingCard ? 0.6 : 1 }}>
            {downloadingCard ? "..." : "For The Gram"}
          </button>
          <button onClick={handleEmailItinerary} style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "8px 16px", fontFamily: FONT_BODY, fontSize: 13, color: T.ash, cursor: "pointer" }}>
            Email
          </button>
          <button onClick={handleDownloadCalendar} style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "8px 16px", fontFamily: FONT_BODY, fontSize: 13, color: T.ash, cursor: "pointer" }}>
            Calendar
          </button>
          <button onClick={handleShare} style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "8px 16px", fontFamily: FONT_BODY, fontSize: 13, color: T.ash, cursor: "pointer" }}>
            {copied ? "Copied!" : "Share"}
          </button>
          <button onClick={() => window.print()} style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "8px 16px", fontFamily: FONT_BODY, fontSize: 13, color: T.ash, cursor: "pointer" }}>
            Print
          </button>
          <button onClick={onStartOver} style={{ background: "none", border: "none", fontFamily: FONT_BODY, fontSize: 13, color: T.silver, cursor: "pointer" }}>Start Over</button>
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
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Your Guide Match</div>
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
            {itinerary.flights.bookingLink && <a href={itinerary.flights.bookingLink} target="_blank" rel="noopener noreferrer" style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.gold, marginTop: 6, display: "inline-block" }}>Book flights &rarr;</a>}
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
                    {block.bookingLink && <a href={block.bookingLink} target="_blank" rel="noopener noreferrer" style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold, marginTop: 6, display: "inline-block" }}>Book &rarr;</a>}
                  </div>
                );
              })}
              {/* Fallback for legacy activities array format */}
              {!day.morning && !day.afternoon && !day.evening && day.activities?.map((act, j) => (
                <div key={j} style={{ background: T.steel, borderRadius: 8, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.gold }}>{act.time}</span>
                    {act.estimatedCost && <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.silver }}>{act.estimatedCost}</span>}
                  </div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.white, fontWeight: 600 }}>{act.name}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, marginTop: 4 }}>{act.description}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Local Events */}
        {itinerary.events?.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>{"\u{1F389}"} Local Events</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {itinerary.events.map((ev, i) => (
                <div key={i} style={{ background: T.steel, border: `1px solid ${T.gold}`, borderRadius: 8, padding: 16 }}>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.white, fontWeight: 600 }}>{ev.name}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold, marginTop: 2 }}>{ev.date} {ev.cost ? `\u00B7 ${ev.cost}` : ""}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, marginTop: 6, lineHeight: 1.5 }}>{ev.description}</div>
                  {ev.ticketLink && <a href={ev.ticketLink} target="_blank" rel="noopener noreferrer" style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold, marginTop: 6, display: "inline-block" }}>Get tickets &rarr;</a>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lodging */}
        {itinerary.lodging?.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Lodging Options</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {itinerary.lodging.map((l, i) => (
                <div key={i} style={{ background: T.steel, border: `1px solid ${l.isPartner ? T.gold : T.wire}`, borderRadius: 8, padding: 16, position: "relative" }}>
                  {l.isPartner && <div style={{ position: "absolute", top: 8, right: 8, fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: T.ink, background: T.gold, borderRadius: 4, padding: "2px 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>RŌM Partner</div>}
                  <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.white, fontWeight: 600 }}>{l.name}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold, marginTop: 2 }}>{l.type} {l.pricePerNight ? `\u00B7 ${l.pricePerNight}/night` : l.priceRange ? `\u00B7 ${l.priceRange}` : ""}</div>
                  {l.totalEstimate && <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.silver, marginTop: 2 }}>Est. total: {l.totalEstimate}</div>}
                  <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, marginTop: 6 }}>{l.reason}</div>
                  <a href={l.bookingLink || makeGoogleMapsLink(l.name, destination)} target="_blank" rel="noopener noreferrer" style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold, marginTop: 6, display: "inline-block" }}>{l.bookingLink ? "Book" : "View on Maps"} &rarr;</a>
                </div>
              ))}
            </div>
            {/* Airbnb fallback link */}
            {destination && (
              <a href={`https://www.airbnb.com/s/${encodeURIComponent(destination)}/homes${dateStart ? `?checkin=${dateStart}&checkout=${dateEnd}&adults=${adults || 2}${children ? `&children=${children}` : ""}` : ""}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-block", marginTop: 12, fontFamily: FONT_BODY, fontSize: 13, color: T.gold, opacity: 0.8 }}>
                Browse more on Airbnb &rarr;
              </a>
            )}
          </div>
        )}

        {/* Dining */}
        {itinerary.dining?.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Where to Eat</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {itinerary.dining.map((d, i) => (
                <div key={i} style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: 16 }}>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.white, fontWeight: 600 }}>{d.name}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold, marginTop: 2 }}>{d.cuisine} {d.priceRange ? `\u00B7 ${d.priceRange}` : ""}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted, marginTop: 2, textTransform: "capitalize" }}>{d.meal}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, marginTop: 6 }}>{d.reason}</div>
                  {d.mustTry && <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold, marginTop: 4, fontStyle: "italic" }}>Must try: {d.mustTry}</div>}
                  <a href={d.reservationLink || makeGoogleMapsLink(d.name, destination)} target="_blank" rel="noopener noreferrer" style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold, marginTop: 6, display: "inline-block" }}>{d.reservationLink ? "Reserve" : "View on Maps"} &rarr;</a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gear, Transport, Tips */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 28 }}>
          {itinerary.gear?.length > 0 && (
            <div style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Gear to Bring</div>
              {itinerary.gear.map((g, i) => (
                <div key={i} style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, padding: "4px 0" }}>{"\u2022"} {g}</div>
              ))}
            </div>
          )}
          {itinerary.localTips?.length > 0 && (
            <div style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Local Tips</div>
              {itinerary.localTips.map((t, i) => (
                <div key={i} style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, padding: "4px 0" }}>{"\u2022"} {t}</div>
              ))}
            </div>
          )}
        </div>

        {itinerary.transportation && (
          <div style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: 16, marginBottom: 28 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Getting Around</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.ash, lineHeight: 1.6 }}>
              {typeof itinerary.transportation === "string" ? itinerary.transportation : itinerary.transportation.recommendation}
            </div>
            {itinerary.transportation.estimatedCost && <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.gold, marginTop: 6 }}>Est. cost: {itinerary.transportation.estimatedCost}</div>}
          </div>
        )}

        {/* Budget Summary */}
        {itinerary.budgetSummary && (
          <div style={{ background: itinerary.budgetSummary.overBudget ? "rgba(231,76,60,0.1)" : T.goldGlow, border: `1px solid ${itinerary.budgetSummary.overBudget ? "#e74c3c" : T.gold}`, borderRadius: 10, padding: 20, marginBottom: 28 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: itinerary.budgetSummary.overBudget ? "#e74c3c" : T.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              {itinerary.budgetSummary.overBudget ? "Over Budget" : "Budget Summary"}
            </div>
            {Object.entries(itinerary.budgetSummary).filter(([k]) => k !== "overBudget").map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: k === "total" ? "none" : `1px solid ${T.rim}` }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: k === "total" ? T.white : T.ash, fontWeight: k === "total" ? 700 : 400, textTransform: "capitalize" }}>{k}</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: k === "total" ? T.white : T.parchment, fontWeight: k === "total" ? 700 : 600 }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Legacy estimatedBudget fallback */}
        {!itinerary.budgetSummary && itinerary.estimatedBudget && (
          <div style={{ background: T.goldGlow, border: `1px solid ${T.gold}`, borderRadius: 8, padding: 16, marginBottom: 28 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Estimated Budget</div>
            {Object.entries(itinerary.estimatedBudget).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, textTransform: "capitalize" }}>{k.replace(/([A-Z])/g, " $1")}</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.white, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Refinement */}
        <div className="no-print" style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 12, padding: 20, marginBottom: 40 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: T.white, marginBottom: 8 }}>Want to adjust anything?</div>
          <div style={{ display: "flex", gap: 10 }}>
            <input type="text" placeholder="e.g., 'Find somewhere cheaper to stay' or 'Add a rest day'" value={refineInput} onChange={e => setRefineInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleRefine()}
              style={{ flex: 1, background: T.lifted, border: `1px solid ${T.wire}`, borderRadius: 8, padding: "12px 16px", fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, outline: "none" }} />
            <GoldBtn onClick={handleRefine} disabled={refining || !refineInput.trim()}>
              {refining ? "..." : "Refine"}
            </GoldBtn>
          </div>
        </div>

        {/* ROM Watermark */}
        <div style={{ textAlign: "center", padding: "20px 0 40px", opacity: 0.5 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: T.gold, letterSpacing: "0.12em" }}>Built with RŌM</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted, marginTop: 4 }}>romlife.co</div>
        </div>
      </div>

      {/* Social Card (hidden, for capture) */}
      {(() => {
        const photoUrl = getDestinationPhoto(destination);
        const proxyUrl = photoUrl ? `/api/social-card?url=${encodeURIComponent(photoUrl)}` : null;
        return (
          <div style={{ position: "fixed", left: "-9999px", top: 0 }}>
            <div ref={socialCardRef} style={{
              width: 1080, height: 1920, position: "relative", overflow: "hidden",
              background: proxyUrl ? "#000" : getVibeGradient(vibes),
              display: "flex", flexDirection: "column", justifyContent: "space-between",
            }}>
              {/* Destination photo background (proxied for CORS) */}
              {proxyUrl && (
                <img src={proxyUrl} crossOrigin="anonymous" alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }} />
              )}

              {/* Dark gradient overlay for text readability */}
              <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: proxyUrl
                ? "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.85) 100%)"
                : "radial-gradient(ellipse at 30% 20%, rgba(193,163,98,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(193,163,98,0.05) 0%, transparent 50%)",
                zIndex: 1 }} />

              {/* Top section - ROM branding */}
              <div style={{ position: "relative", zIndex: 2, padding: "64px 64px 0" }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 42, color: T.gold, letterSpacing: "0.16em", textShadow: proxyUrl ? "0 2px 8px rgba(0,0,0,0.5)" : "none" }}>RŌM</div>
              </div>

              {/* Center section — pushed toward bottom for photo cards */}
              <div style={{ position: "relative", zIndex: 2, padding: "0 64px", flex: 1, display: "flex", flexDirection: "column", justifyContent: proxyUrl ? "flex-end" : "center", paddingBottom: proxyUrl ? 40 : 0 }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 96, color: "#fff", lineHeight: 1.05, marginBottom: 24, fontWeight: 400, letterSpacing: "0.02em", textShadow: proxyUrl ? "0 3px 16px rgba(0,0,0,0.6)" : "none" }}>
                  {destination || itinerary.title}
                </div>
                {dateStart && dateEnd && (
                  <div style={{ fontFamily: FONT_BODY, fontSize: 32, color: "rgba(255,255,255,0.85)", marginBottom: 16, fontWeight: 300, letterSpacing: "0.04em", textShadow: proxyUrl ? "0 2px 8px rgba(0,0,0,0.5)" : "none" }}>
                    {new Date(dateStart + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })} – {new Date(dateEnd + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </div>
                )}
                {itinerary.title && destination && (
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 30, color: "rgba(255,255,255,0.7)", lineHeight: 1.3, fontStyle: "italic", maxWidth: 800, textShadow: proxyUrl ? "0 2px 8px rgba(0,0,0,0.5)" : "none" }}>
                    {itinerary.title}
                  </div>
                )}
              </div>

              {/* Bottom section */}
              <div style={{ position: "relative", zIndex: 2, padding: "0 64px 64px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <div style={{ width: 80, height: 2, background: T.gold, marginBottom: 16 }} />
                  <div style={{ fontFamily: FONT_BODY, fontSize: 18, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em" }}>romlife.co</div>
                </div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: T.gold, letterSpacing: "0.1em", textShadow: proxyUrl ? "0 1px 6px rgba(0,0,0,0.5)" : "none" }}>Built with RŌM</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-content { max-width: 100% !important; padding: 20px !important; }
          .print-content * { color: #222 !important; background: white !important; border-color: #ddd !important; }
          .print-content [style*="gold"] { color: #8B7335 !important; }
        }
      `}</style>
    </div>
  );
}
