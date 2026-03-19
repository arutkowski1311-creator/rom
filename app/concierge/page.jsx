"use client";
import { useState, useEffect, useRef } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";
import { GoldBtn, Stars, useIsMobile } from "@/app/components/ui";

const CATEGORIES = [
  { label: "Fly Fishing", icon: "🎣" },
  { label: "Hunting", icon: "🦌" },
  { label: "Rock Climbing", icon: "🧗" },
  { label: "Surfing", icon: "🏄" },
  { label: "Kayaking", icon: "🚣" },
  { label: "Diving", icon: "🤿" },
  { label: "Hiking", icon: "🥾" },
  { label: "Wildlife", icon: "🦅" },
];

const EXPERIENCE_LEVELS = [
  { id: "beginner", label: "Beginner", sub: "First time or minimal experience" },
  { id: "intermediate", label: "Intermediate", sub: "Comfortable with basics" },
  { id: "expert", label: "Expert", sub: "Experienced, seeking challenge" },
];

const BUDGET_OPTIONS = [
  { id: "budget", label: "$", sub: "Under $500" },
  { id: "moderate", label: "$$", sub: "$500–$1,500" },
  { id: "premium", label: "$$$", sub: "$1,500–$3,000" },
  { id: "luxury", label: "$$$$", sub: "$3,000+" },
];

const STEPS = ["destination", "activities", "dates", "group", "experience", "budget", "requests"];

export default function ConciergePage() {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [itinerary, setItinerary] = useState(null);
  const [tripPlanId, setTripPlanId] = useState(null);
  const [refineInput, setRefineInput] = useState("");
  const [refining, setRefining] = useState(false);
  const [user, setUser] = useState(null);

  // Form state
  const [destination, setDestination] = useState("");
  const [activities, setActivities] = useState([]);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [groupSize, setGroupSize] = useState(2);
  const [experienceLevel, setExperienceLevel] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  const contentRef = useRef(null);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const canAdvance = () => {
    switch (STEPS[step]) {
      case "destination": return destination.length > 2;
      case "activities": return activities.length > 0;
      case "dates": return true; // optional
      case "group": return groupSize > 0;
      case "experience": return experienceLevel !== "";
      case "budget": return budgetRange !== "";
      case "requests": return true; // optional
      default: return false;
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          activityTypes: activities,
          dateStart: dateStart || undefined,
          dateEnd: dateEnd || undefined,
          groupSize,
          experienceLevel,
          budgetRange,
          specialRequests: specialRequests || undefined,
          guestId: user?.id || undefined,
        }),
      });
      const data = await res.json();
      if (data.itinerary) {
        setItinerary(data.itinerary);
        setTripPlanId(data.tripPlanId);
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
      if (data.itinerary) {
        setItinerary(data.itinerary);
        setRefineInput("");
      }
    } catch (err) {
      console.error("Refine error:", err);
    }
    setRefining(false);
  };

  const advance = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleGenerate();
    }
  };

  // ─── ITINERARY VIEW ────────────────────────────────────────────────────────
  if (itinerary) {
    return (
      <div style={{ minHeight: "100vh", background: T.void, color: T.parchment }}>
        {/* Header */}
        <div style={{ background: T.carbon, borderBottom: `1px solid ${T.wire}`, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.gold, letterSpacing: "0.12em" }}>RŌM</div>
          <button onClick={() => { setItinerary(null); setStep(0); }} style={{ background: "none", border: "none", fontFamily: FONT_BODY, fontSize: 13, color: T.silver, cursor: "pointer" }}>Start Over</button>
        </div>

        <div style={{ maxWidth: 800, margin: "0 auto", padding: isMobile ? "24px 16px" : "40px 24px" }}>
          {/* Trip Title */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 28 : 36, color: T.white, lineHeight: 1.2, marginBottom: 8 }}>{itinerary.title}</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.ash, lineHeight: 1.6 }}>{itinerary.summary}</div>
          </div>

          {/* Guide Match */}
          {itinerary.guide && (
            <div style={{ background: T.steel, border: `1px solid ${T.gold}`, borderRadius: 12, padding: 24, marginBottom: 28 }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Your Guide Match</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.white, marginBottom: 4 }}>{itinerary.guide.name}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.ash, marginBottom: 12 }}>{itinerary.guide.reason}</div>
              {itinerary.guide.slug && (
                <GoldBtn onClick={() => window.location.href = `/guides/${itinerary.guide.slug}`}>
                  View Profile & Book
                </GoldBtn>
              )}
            </div>
          )}

          {/* Day-by-Day */}
          {itinerary.days?.map((day, i) => (
            <div key={i} style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.white, marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.gold, background: T.goldGlow, border: `1px solid ${T.gold}`, borderRadius: 4, padding: "2px 8px" }}>Day {day.dayNumber || i + 1}</span>
                {day.title}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 16, borderLeft: `2px solid ${T.wire}` }}>
                {day.activities?.map((act, j) => (
                  <div key={j} style={{ background: T.steel, borderRadius: 8, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.gold }}>{act.time}</span>
                      <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: T.muted, textTransform: "uppercase" }}>{act.type}</span>
                    </div>
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
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Lodging Options</div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                {itinerary.lodging.map((l, i) => (
                  <div key={i} style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: 16 }}>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.white, fontWeight: 600 }}>{l.name}</div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold, marginTop: 2 }}>{l.type} · {l.priceRange}</div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, marginTop: 6 }}>{l.reason}</div>
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
                  <div key={i} style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, padding: "4px 0" }}>• {g}</div>
                ))}
              </div>
            )}
            {itinerary.localTips?.length > 0 && (
              <div style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: 16 }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Local Tips</div>
                {itinerary.localTips.map((t, i) => (
                  <div key={i} style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, padding: "4px 0" }}>• {t}</div>
                ))}
              </div>
            )}
          </div>

          {itinerary.transportation && (
            <div style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: 16, marginBottom: 28 }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Getting There</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.ash, lineHeight: 1.6 }}>{itinerary.transportation}</div>
            </div>
          )}

          {/* Budget Estimate */}
          {itinerary.estimatedBudget && (
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
          <div style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 12, padding: 20, marginBottom: 40 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: T.white, marginBottom: 8 }}>Want to adjust anything?</div>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="text"
                placeholder="e.g., 'Find somewhere cheaper to stay' or 'Add a rest day'"
                value={refineInput}
                onChange={e => setRefineInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleRefine()}
                style={{
                  flex: 1, background: T.lifted, border: `1px solid ${T.wire}`,
                  borderRadius: 8, padding: "12px 16px",
                  fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, outline: "none",
                }}
              />
              <GoldBtn onClick={handleRefine} disabled={refining || !refineInput.trim()}>
                {refining ? "..." : "Refine"}
              </GoldBtn>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── LOADING STATE ─────────────────────────────────────────────────────────
  if (generating) {
    return (
      <div style={{ minHeight: "100vh", background: T.void, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: T.gold, letterSpacing: "0.12em" }}>RŌM</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.white }}>Building your trip...</div>
        <div style={{ width: 200, height: 3, background: T.wire, borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            width: "40%", height: "100%", background: T.gold, borderRadius: 2,
            animation: "conciergeLoad 1.5s ease-in-out infinite alternate",
          }} />
        </div>
        <style>{`@keyframes conciergeLoad { from { margin-left: 0; } to { margin-left: 60%; } }`}</style>
        <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.muted, textAlign: "center", maxWidth: 300 }}>
          Matching you with the right guide, mapping out your days, finding the best places to eat and stay.
        </div>
      </div>
    );
  }

  // ─── Q&A FLOW ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: T.void, display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.gold, letterSpacing: "0.12em", cursor: "pointer" }} onClick={() => window.location.href = "/"}>RŌM</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>
          {step + 1} of {STEPS.length}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: T.wire, margin: "0 24px" }}>
        <div style={{ height: "100%", background: T.gold, width: `${((step + 1) / STEPS.length) * 100}%`, transition: "width 0.3s", borderRadius: 1 }} />
      </div>

      {/* Card */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "40px 20px" : "60px 24px" }}>
        <div style={{ maxWidth: 600, width: "100%" }} ref={contentRef}>

          {/* Step: Destination */}
          {STEPS[step] === "destination" && (
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 32 : 42, color: T.white, marginBottom: 8 }}>Where are you headed?</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver, marginBottom: 28 }}>A city, region, or landmark.</div>
              <input
                autoFocus
                type="text" placeholder="e.g., Bozeman, Montana"
                value={destination} onChange={e => setDestination(e.target.value)}
                onKeyDown={e => e.key === "Enter" && canAdvance() && advance()}
                style={{
                  width: "100%", background: T.steel, border: `1px solid ${T.wire}`,
                  borderRadius: 10, padding: "16px 20px",
                  fontFamily: FONT_BODY, fontSize: 18, color: T.parchment, outline: "none",
                }}
              />
            </div>
          )}

          {/* Step: Activities */}
          {STEPS[step] === "activities" && (
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 32 : 42, color: T.white, marginBottom: 8 }}>What do you want to do?</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver, marginBottom: 28 }}>Select one or more.</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
                {CATEGORIES.map(cat => {
                  const selected = activities.includes(cat.label);
                  return (
                    <button key={cat.label}
                      onClick={() => setActivities(selected ? activities.filter(a => a !== cat.label) : [...activities, cat.label])}
                      style={{
                        background: selected ? T.goldGlow : T.steel,
                        border: `1.5px solid ${selected ? T.gold : T.wire}`,
                        borderRadius: 10, padding: "18px 12px",
                        cursor: "pointer", transition: "all 0.15s",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 28 }}>{cat.icon}</span>
                      <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: selected ? T.gold : T.ash }}>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step: Dates */}
          {STEPS[step] === "dates" && (
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 32 : 42, color: T.white, marginBottom: 8 }}>When are you going?</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver, marginBottom: 28 }}>Skip if you are flexible.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.silver, display: "block", marginBottom: 6 }}>Start</label>
                  <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)}
                    style={{ width: "100%", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: "14px 16px", fontFamily: FONT_BODY, fontSize: 15, color: T.parchment, outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.silver, display: "block", marginBottom: 6 }}>End</label>
                  <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)}
                    style={{ width: "100%", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: "14px 16px", fontFamily: FONT_BODY, fontSize: 15, color: T.parchment, outline: "none" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step: Group */}
          {STEPS[step] === "group" && (
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 32 : 42, color: T.white, marginBottom: 8 }}>How many in your group?</div>
              <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 28 }}>
                <button onClick={() => setGroupSize(Math.max(1, groupSize - 1))}
                  style={{ width: 48, height: 48, borderRadius: "50%", background: T.steel, border: `1px solid ${T.wire}`, fontFamily: FONT_BODY, fontSize: 20, color: T.ash, cursor: "pointer" }}>−</button>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 56, color: T.white, minWidth: 60, textAlign: "center" }}>{groupSize}</div>
                <button onClick={() => setGroupSize(groupSize + 1)}
                  style={{ width: 48, height: 48, borderRadius: "50%", background: T.steel, border: `1px solid ${T.wire}`, fontFamily: FONT_BODY, fontSize: 20, color: T.ash, cursor: "pointer" }}>+</button>
              </div>
            </div>
          )}

          {/* Step: Experience */}
          {STEPS[step] === "experience" && (
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 32 : 42, color: T.white, marginBottom: 28 }}>Your experience level?</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {EXPERIENCE_LEVELS.map(lvl => (
                  <button key={lvl.id} onClick={() => setExperienceLevel(lvl.id)}
                    style={{
                      background: experienceLevel === lvl.id ? T.goldGlow : T.steel,
                      border: `1.5px solid ${experienceLevel === lvl.id ? T.gold : T.wire}`,
                      borderRadius: 10, padding: "18px 20px", cursor: "pointer",
                      textAlign: "left", transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontFamily: FONT_BODY, fontSize: 16, fontWeight: 600, color: experienceLevel === lvl.id ? T.gold : T.white }}>{lvl.label}</div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, marginTop: 2 }}>{lvl.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Budget */}
          {STEPS[step] === "budget" && (
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 32 : 42, color: T.white, marginBottom: 28 }}>What is your budget?</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                {BUDGET_OPTIONS.map(b => (
                  <button key={b.id} onClick={() => setBudgetRange(b.id)}
                    style={{
                      background: budgetRange === b.id ? T.goldGlow : T.steel,
                      border: `1.5px solid ${budgetRange === b.id ? T.gold : T.wire}`,
                      borderRadius: 10, padding: "20px 16px", cursor: "pointer",
                      textAlign: "center", transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: budgetRange === b.id ? T.gold : T.white }}>{b.label}</div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.silver, marginTop: 4 }}>{b.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Special Requests */}
          {STEPS[step] === "requests" && (
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 32 : 42, color: T.white, marginBottom: 8 }}>Anything else?</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.silver, marginBottom: 28 }}>Dietary needs, accessibility, specific interests. Optional.</div>
              <textarea
                value={specialRequests}
                onChange={e => setSpecialRequests(e.target.value)}
                placeholder="e.g., My wife is a vegetarian, we'd love a place with a hot tub"
                rows={4}
                style={{
                  width: "100%", background: T.steel, border: `1px solid ${T.wire}`,
                  borderRadius: 10, padding: "16px 20px",
                  fontFamily: FONT_BODY, fontSize: 15, color: T.parchment,
                  outline: "none", resize: "vertical", lineHeight: 1.6,
                }}
              />
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, gap: 12 }}>
            {step > 0 ? (
              <button onClick={() => setStep(step - 1)}
                style={{ background: "none", border: `1px solid ${T.wire}`, borderRadius: 8, padding: "12px 24px", fontFamily: FONT_BODY, fontSize: 14, color: T.ash, cursor: "pointer" }}>
                Back
              </button>
            ) : <div />}
            <GoldBtn onClick={advance} disabled={!canAdvance()}>
              {step === STEPS.length - 1 ? "Build My Trip" : "Continue"}
            </GoldBtn>
          </div>

          {/* Summary Pills */}
          {step > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
              {destination && <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold, background: T.goldGlow, borderRadius: 12, padding: "4px 10px" }}>{destination}</span>}
              {activities.map(a => <span key={a} style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.ash, background: T.lifted, borderRadius: 12, padding: "4px 10px" }}>{a}</span>)}
              {dateStart && <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.ash, background: T.lifted, borderRadius: 12, padding: "4px 10px" }}>{dateStart}</span>}
              {groupSize > 0 && step > 3 && <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.ash, background: T.lifted, borderRadius: 12, padding: "4px 10px" }}>{groupSize} guests</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
