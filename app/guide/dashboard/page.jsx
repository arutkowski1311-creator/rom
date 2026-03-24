"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { T, FONT_DISPLAY, FONT_BODY, getTierConfig } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";
import { Stars, StatusPill, GoldBtn, TierBadge, FeatureGate } from "@/app/components/ui";
import FinancesTab from "./tabs/FinancesTab";
import MarketingTab from "./tabs/MarketingTab";
import AnalyticsTab from "./tabs/AnalyticsTab";
import GuestCRMTab from "./tabs/GuestCRMTab";
import LicensesTab from "./tabs/LicensesTab";

// ─── DEFAULT STATE (overwritten by fetchData) ────────────────────────────────
const GUIDE_DEFAULT = {
  name: "", slug: "",
  location: "", category: "",
  rating: 0, reviewCount: 0, responseRate: 0,
  avatar: "G", verified: false, memberSince: "",
  stripeConnected: false,
};

const STATS_DEFAULT = {
  earningsThisMonth: 0,
  earningsLastMonth: 0,
  tripsThisMonth: 0,
  tripsAllTime: 0,
  avgRating: 0,
  responseRate: 0,
  profileViews: 0,
  conversionRate: 0,
  reviewCount: 0,
};

// (earnings and messages now computed from real data)

// ─── SHARED (imported from @/app/components/ui) ──────────────────────────────

function SectionCard({ children, title, action }) {
  return (
    <div style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:10, overflow:"hidden"}}>
      {title && (
        <div style={{background:T.void, padding:"14px 20px", borderBottom:`1px solid ${T.wire}`, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.silver, textTransform:"uppercase", letterSpacing:"0.08em"}}>{title}</div>
          {action && <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.gold, cursor:"pointer", fontWeight:600}}>{action}</div>}
        </div>
      )}
      <div style={{padding:20}}>{children}</div>
    </div>
  );
}

// ─── EARNINGS CHART ───────────────────────────────────────────────────────────
function EarningsChart({ data }) {
  if (!data || data.length === 0) return <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.muted,textAlign:"center",padding:"20px 0"}}>No earnings data yet</div>;
  const max = Math.max(...data.map(d=>d.amount)) || 1;
  return (
    <div style={{display:"flex", alignItems:"flex-end", gap:8, height:100}}>
      {data.map((d,i)=>{
        const isLast = i===data.length-1;
        const h = Math.round((d.amount/max)*100);
        return (
          <div key={d.month} style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6}}>
            <div style={{fontFamily:FONT_BODY, fontSize:10, color:isLast?T.gold:T.muted, fontWeight:isLast?700:400}}>
              {isLast ? `$${(d.amount/1000).toFixed(1)}k` : ""}
            </div>
            <div style={{
              width:"100%", height:`${h}%`,
              background:isLast?T.gold:T.lifted,
              border:`1px solid ${isLast?T.goldLt:T.wire}`,
              borderRadius:"3px 3px 0 0",
              minHeight:4, transition:"height 0.4s",
            }}/>
            <div style={{fontFamily:FONT_BODY, fontSize:10, color:isLast?T.gold:T.muted, fontWeight:isLast?700:400}}>{d.month}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ITINERARY PANEL (inside BookingPanel) ───────────────────────────────────
// ── AI Rewrite button with tone + focus options ──
function RewriteBtn({ section, currentText, onRewrite }) {
  const [open, setOpen] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [customFocus, setCustomFocus] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const doRewrite = async (instruction) => {
    setRewriting(true);
    setOpen(false);
    setShowCustom(false);
    try {
      const res = await fetch("/api/ai/itinerary/rewrite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, currentText, instruction }),
      });
      const d = await res.json();
      if (d?.rewritten) onRewrite(d.rewritten);
    } catch (e) { console.error(e); }
    setRewriting(false);
  };

  if (rewriting) return <span style={{fontFamily:FONT_BODY,fontSize:10,color:T.gold,padding:"2px 6px"}}>✨ Rewriting…</span>;

  return (
    <div style={{position:"relative",display:"inline-block"}}>
      <button onClick={() => setOpen(!open)} style={{background:"none",border:`1px solid ${T.wire}`,borderRadius:4,padding:"2px 8px",fontFamily:FONT_BODY,fontSize:9,fontWeight:700,color:T.gold,cursor:"pointer",letterSpacing:"0.02em"}}>
        ✨ Rewrite
      </button>
      {open && (
        <div style={{position:"absolute",top:"100%",left:0,zIndex:50,background:T.carbon,border:`1px solid ${T.wire}`,borderRadius:8,padding:10,marginTop:4,width:220,boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}>
          <div style={{fontFamily:FONT_BODY,fontSize:9,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Tone</div>
          {["More premium","More beginner-friendly","More concise","More personal & warm"].map(t => (
            <div key={t} onClick={() => doRewrite(`Rewrite with this tone: ${t}`)}
              style={{fontFamily:FONT_BODY,fontSize:12,color:T.parchment,padding:"6px 8px",borderRadius:4,cursor:"pointer",marginBottom:2,":hover":{background:T.steel}}}>
              {t}
            </div>
          ))}
          <div style={{height:1,background:T.rim,margin:"8px 0"}}/>
          <div style={{fontFamily:FONT_BODY,fontSize:9,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Focus On</div>
          {["The technique & skills","The scenery & experience","The challenge & achievement","Relaxation & escape","Family & bonding"].map(f => (
            <div key={f} onClick={() => doRewrite(`Rewrite with this focus: ${f}`)}
              style={{fontFamily:FONT_BODY,fontSize:12,color:T.parchment,padding:"6px 8px",borderRadius:4,cursor:"pointer",marginBottom:2}}>
              {f}
            </div>
          ))}
          <div style={{height:1,background:T.rim,margin:"8px 0"}}/>
          {!showCustom ? (
            <div onClick={() => setShowCustom(true)}
              style={{fontFamily:FONT_BODY,fontSize:12,color:T.gold,padding:"6px 8px",borderRadius:4,cursor:"pointer",fontWeight:600}}>
              ✏️ Custom instruction…
            </div>
          ) : (
            <div>
              <input value={customFocus} onChange={e => setCustomFocus(e.target.value)}
                placeholder="e.g. emphasize father-son bonding"
                autoFocus
                onKeyDown={e => e.key === "Enter" && customFocus && doRewrite(customFocus)}
                style={{width:"100%",background:T.void,border:`1px solid ${T.wire}`,borderRadius:4,padding:"6px 8px",fontFamily:FONT_BODY,fontSize:12,color:T.parchment,outline:"none",marginBottom:6}}/>
              <button onClick={() => customFocus && doRewrite(customFocus)}
                style={{width:"100%",background:T.gold,border:"none",borderRadius:4,padding:"6px",fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.ink,cursor:"pointer"}}>
                Rewrite with this
              </button>
            </div>
          )}
          <div style={{height:1,background:T.rim,margin:"8px 0"}}/>
          <div onClick={() => { setOpen(false); setShowCustom(false); }}
            style={{fontFamily:FONT_BODY,fontSize:11,color:T.muted,padding:"4px 8px",cursor:"pointer",textAlign:"center"}}>
            Cancel
          </div>
        </div>
      )}
    </div>
  );
}

// ── Editable field component ──
function EditField({ label, value, onChange, multiline, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");
  useEffect(() => setVal(value || ""), [value]);
  const save = () => { setEditing(false); if (val !== value) onChange(val); };
  if (editing) {
    return multiline ? (
      <textarea value={val} onChange={e => setVal(e.target.value)} onBlur={save} autoFocus
        style={{width:"100%",minHeight:80,background:T.carbon,border:`1px solid ${T.gold}`,borderRadius:6,padding:10,fontFamily:FONT_BODY,fontSize:13,color:T.parchment,resize:"vertical",outline:"none"}}/>
    ) : (
      <input value={val} onChange={e => setVal(e.target.value)} onBlur={save} onKeyDown={e => e.key==="Enter"&&save()} autoFocus
        style={{width:"100%",background:T.carbon,border:`1px solid ${T.gold}`,borderRadius:6,padding:"8px 10px",fontFamily:FONT_BODY,fontSize:13,color:T.parchment,outline:"none"}}/>
    );
  }
  return (
    <div onClick={() => setEditing(true)} style={{cursor:"pointer",padding:"6px 8px",borderRadius:6,border:`1px solid transparent`,transition:"all 0.15s",":hover":{borderColor:T.wire}}}>
      <div style={{fontFamily:FONT_BODY,fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>{label}</div>
      <div style={{fontFamily:FONT_BODY,fontSize:13,color:val?T.parchment:T.muted,fontStyle:val?"normal":"italic",lineHeight:1.5,whiteSpace:"pre-wrap"}}>
        {val || placeholder || "Click to edit…"}
      </div>
    </div>
  );
}

function ItineraryPanel({ bookingId, guideId }) {
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  useEffect(() => {
    fetch(`/api/itineraries?booking_id=${bookingId}`).then(r => r.json()).then(d => {
      if (d && !d.error) setItinerary(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [bookingId]);

  const handleGenerate = async () => {
    if (itinerary?.status === "published" && !confirm("This will overwrite the published itinerary. Continue?")) return;
    setGenerating(true);
    try {
      await fetch("/api/ai/itinerary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const res = await fetch(`/api/itineraries?booking_id=${bookingId}`);
      const d = await res.json();
      if (d && !d.error) setItinerary(d);
    } catch (e) { console.error(e); }
    setGenerating(false);
  };

  const handlePublish = async () => {
    if (!itinerary) return;
    setPublishing(true);
    try {
      await fetch("/api/itineraries", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itinerary.id, status: "published" }),
      });
      setItinerary(i => ({ ...i, status: "published" }));
    } catch (e) { console.error(e); }
    setPublishing(false);
  };

  const updateContent = async (path, value) => {
    if (!itinerary) return;
    const content = JSON.parse(JSON.stringify(itinerary.content));
    // Navigate to nested path like "header.title" or "guide_logistics.meeting_point"
    const keys = path.split(".");
    let obj = content;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    setItinerary(prev => ({ ...prev, content }));
    setSaving(true);
    try {
      await fetch("/api/itineraries", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itinerary.id, content }),
      });
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1500);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const updateTimelineBlock = async (idx, field, value) => {
    const content = JSON.parse(JSON.stringify(itinerary.content));
    if (!content.timeline) return;
    content.timeline[idx][field] = value;
    setItinerary(prev => ({ ...prev, content }));
    setSaving(true);
    try {
      await fetch("/api/itineraries", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itinerary.id, content }),
      });
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const updateBringItem = async (idx, value) => {
    const content = JSON.parse(JSON.stringify(itinerary.content));
    content.what_to_bring[idx] = value;
    setItinerary(prev => ({ ...prev, content }));
    try {
      await fetch("/api/itineraries", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itinerary.id, content }),
      });
    } catch (e) { console.error(e); }
  };

  const removeBringItem = async (idx) => {
    const content = JSON.parse(JSON.stringify(itinerary.content));
    content.what_to_bring.splice(idx, 1);
    setItinerary(prev => ({ ...prev, content }));
    try {
      await fetch("/api/itineraries", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itinerary.id, content }),
      });
    } catch (e) { console.error(e); }
  };

  const addBringItem = async () => {
    const content = JSON.parse(JSON.stringify(itinerary.content));
    if (!content.what_to_bring) content.what_to_bring = [];
    content.what_to_bring.push("New item — click to edit");
    setItinerary(prev => ({ ...prev, content }));
    try {
      await fetch("/api/itineraries", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itinerary.id, content }),
      });
    } catch (e) { console.error(e); }
  };

  if (loading) return <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.muted,padding:"12px 0"}}>Loading itinerary…</div>;

  const content = itinerary?.content;
  const status = itinerary?.status;

  return (
    <div style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:8, padding:20}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
        <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.silver, textTransform:"uppercase", letterSpacing:"0.08em"}}>
          Trip Itinerary
          {saveFlash && <span style={{marginLeft:8,fontSize:10,color:"#4ade80"}}>✓ Saved</span>}
          {saving && !saveFlash && <span style={{marginLeft:8,fontSize:10,color:T.muted}}>Saving…</span>}
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {status && (
            <span style={{fontFamily:FONT_BODY, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:3,
              background: status === "published" ? "rgba(74,222,128,0.15)" : "rgba(201,151,58,0.15)",
              color: status === "published" ? "#4ade80" : T.gold,
              border: `1px solid ${status === "published" ? "#4ade80" : T.gold}`,
            }}>{status === "published" ? "PUBLISHED" : "DRAFT"}</span>
          )}
        </div>
      </div>

      {!itinerary ? (
        <div>
          <div style={{fontFamily:FONT_BODY, fontSize:13, color:T.ash, marginBottom:12}}>No itinerary generated yet. Create a personalized trip plan for your guest.</div>
          <GoldBtn small onClick={handleGenerate} disabled={generating}>
            {generating ? "Generating…" : "Generate Itinerary"}
          </GoldBtn>
        </div>
      ) : editing ? (
        /* ═══ INLINE EDITOR ═══ */
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Header */}
          <div style={{background:T.carbon,borderRadius:8,padding:16,border:`1px solid ${T.rim}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontFamily:FONT_BODY,fontSize:10,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.1em"}}>Header</div>
              <RewriteBtn section="vibe_statement" currentText={content?.header?.vibe_statement} onRewrite={v => updateContent("header.vibe_statement", v)} />
            </div>
            <EditField label="Title" value={content?.header?.title} onChange={v => updateContent("header.title", v)} />
            <EditField label="Vibe Statement" value={content?.header?.vibe_statement} onChange={v => updateContent("header.vibe_statement", v)} placeholder="One evocative sentence…" />
          </div>

          {/* Why This Plan */}
          <div style={{background:T.carbon,borderRadius:8,padding:16,border:`1px solid ${T.rim}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontFamily:FONT_BODY,fontSize:10,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.1em"}}>Why This Plan</div>
              <RewriteBtn section="why_this_plan" currentText={content?.why_this_plan} onRewrite={v => updateContent("why_this_plan", v)} />
            </div>
            <EditField label="Personalized reason" value={content?.why_this_plan} onChange={v => updateContent("why_this_plan", v)} multiline placeholder="Why this plan was built for this guest…" />
          </div>

          {/* Overview */}
          <div style={{background:T.carbon,borderRadius:8,padding:16,border:`1px solid ${T.rim}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontFamily:FONT_BODY,fontSize:10,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.1em"}}>Overview</div>
              <RewriteBtn section="overview" currentText={content?.overview?.description} onRewrite={v => updateContent("overview.description", v)} />
            </div>
            <EditField label="Description" value={content?.overview?.description} onChange={v => updateContent("overview.description", v)} multiline />
          </div>

          {/* About the Area */}
          <div style={{background:T.carbon,borderRadius:8,padding:16,border:`1px solid ${T.rim}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontFamily:FONT_BODY,fontSize:10,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.1em"}}>About the Area</div>
              <RewriteBtn section="about_the_area" currentText={content?.about_the_area?.description} onRewrite={v => updateContent("about_the_area.description", v)} />
            </div>
            <EditField label="Area Title" value={content?.about_the_area?.title} onChange={v => updateContent("about_the_area.title", v)} />
            <EditField label="Area Description" value={content?.about_the_area?.description} onChange={v => updateContent("about_the_area.description", v)} multiline />
          </div>

          {/* Timeline */}
          <div style={{background:T.carbon,borderRadius:8,padding:16,border:`1px solid ${T.rim}`}}>
            <div style={{fontFamily:FONT_BODY,fontSize:10,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Timeline</div>
            {(content?.timeline || []).map((block, i) => (
              <div key={i} style={{borderBottom:i < content.timeline.length - 1 ? `1px solid ${T.rim}` : "none", paddingBottom:10, marginBottom:10}}>
                <div style={{display:"flex",gap:8,marginBottom:4}}>
                  <div style={{flex:"0 0 90px"}}><EditField label="Time" value={block.time} onChange={v => updateTimelineBlock(i, "time", v)} /></div>
                  <div style={{flex:1}}><EditField label="Title" value={block.title} onChange={v => updateTimelineBlock(i, "title", v)} /></div>
                </div>
                <EditField label="Description" value={block.description} onChange={v => updateTimelineBlock(i, "description", v)} multiline />
              </div>
            ))}
          </div>

          {/* What to Bring */}
          <div style={{background:T.carbon,borderRadius:8,padding:16,border:`1px solid ${T.rim}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontFamily:FONT_BODY,fontSize:10,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.1em"}}>What to Bring</div>
              <button onClick={addBringItem} style={{background:"none",border:`1px solid ${T.wire}`,borderRadius:4,padding:"3px 10px",fontFamily:FONT_BODY,fontSize:10,fontWeight:700,color:T.ash,cursor:"pointer"}}>+ Add</button>
            </div>
            {(content?.what_to_bring || []).map((item, i) => (
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                <div style={{flex:1}}><EditField label="" value={item} onChange={v => updateBringItem(i, v)} /></div>
                <button onClick={() => removeBringItem(i)} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:14,padding:4}}>×</button>
              </div>
            ))}
          </div>

          {/* Notes from Guide */}
          <div style={{background:T.carbon,borderRadius:8,padding:16,border:`1px solid ${T.rim}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontFamily:FONT_BODY,fontSize:10,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.1em"}}>Notes from Guide ✦</div>
              <RewriteBtn section="notes_from_guide" currentText={content?.notes_from_guide} onRewrite={v => updateContent("notes_from_guide", v)} />
            </div>
            <EditField label="Your personal note to the guest" value={content?.notes_from_guide} onChange={v => updateContent("notes_from_guide", v)} multiline placeholder="Write as yourself — this is the most important section…" />
          </div>

          {/* Logistics */}
          <div style={{background:T.carbon,borderRadius:8,padding:16,border:`1px solid ${T.gold}40`}}>
            <div style={{fontFamily:FONT_BODY,fontSize:10,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Meeting Details (You Fill In)</div>
            <div style={{fontFamily:FONT_BODY,fontSize:11,color:T.muted,marginBottom:10}}>These details are only shown to the guest after you fill them in.</div>
            <EditField label="Meeting Point" value={content?.guide_logistics?.meeting_point?.includes("[Guide will add") ? "" : content?.guide_logistics?.meeting_point} onChange={v => updateContent("guide_logistics.meeting_point", v)} placeholder="e.g. Parking lot at the trailhead on Hwy 89…" />
            <EditField label="Parking Notes" value={content?.guide_logistics?.parking_notes?.includes("[Guide will add") ? "" : content?.guide_logistics?.parking_notes} onChange={v => updateContent("guide_logistics.parking_notes", v)} placeholder="e.g. Free gravel lot, arrive 10 min early…" />
            <EditField label="Your Phone" value={content?.guide_logistics?.guide_phone?.includes("[Guide will add") ? "" : content?.guide_logistics?.guide_phone} onChange={v => updateContent("guide_logistics.guide_phone", v)} placeholder="e.g. (406) 555-1234 — call or text" />
          </div>

          {/* Editor actions */}
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <GoldBtn small onClick={() => setEditing(false)}>Done Editing</GoldBtn>
            <button onClick={() => window.open(`/itinerary/${bookingId}`, "_blank")} style={{background:"none",border:`1px solid ${T.wire}`,borderRadius:5,padding:"6px 14px",fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.ash,cursor:"pointer"}}>Preview as Guest</button>
          </div>
        </div>
      ) : (
        /* ═══ SUMMARY VIEW ═══ */
        <div>
          {content?.header?.title && (
            <div style={{fontFamily:FONT_DISPLAY, fontSize:16, color:T.white, marginBottom:4}}>{content.header.title}</div>
          )}
          {content?.header?.vibe_statement && (
            <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.silver, fontStyle:"italic", marginBottom:8}}>{content.header.vibe_statement}</div>
          )}
          {content?.timeline?.length > 0 && (
            <div style={{fontFamily:FONT_BODY, fontSize:11, color:T.muted, marginBottom:12}}>{content.timeline.length} timeline blocks · {content.what_to_bring?.length || 0} gear items</div>
          )}

          <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
            <GoldBtn small onClick={() => setEditing(true)}>Edit</GoldBtn>
            {status === "draft" && (
              <GoldBtn small onClick={handlePublish} disabled={publishing}>
                {publishing ? "Publishing…" : "Publish to Guest"}
              </GoldBtn>
            )}
            <button onClick={() => window.open(`/itinerary/${bookingId}`, "_blank")} style={{background:"none", border:`1px solid ${T.wire}`, borderRadius:5, padding:"6px 14px", fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.ash, cursor:"pointer"}}>
              Preview
            </button>
            <button onClick={handleGenerate} disabled={generating} style={{background:"none", border:`1px solid ${T.wire}`, borderRadius:5, padding:"6px 14px", fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.muted, cursor:"pointer"}}>
              {generating ? "Regenerating…" : "Regenerate"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BOOKING DETAIL PANEL ─────────────────────────────────────────────────────
function BookingPanel({ booking, onClose, onAccept, onDecline, onComplete, onCancel, employees=[], guideId, businessType, onAssign }) {
  const [replyText, setReplyText] = useState("");
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [assigning, setAssigning] = useState(false);
  return (
    <div style={{position:"fixed", inset:0, zIndex:200, display:"flex", justifyContent:"flex-end"}}>
      <div onClick={onClose} style={{flex:1, background:"rgba(0,0,0,0.7)"}}/>
      <div style={{width:"100%", maxWidth:520, background:T.carbon, borderLeft:`1px solid ${T.wire}`, height:"100vh", overflowY:"auto", display:"flex", flexDirection:"column"}}>
        <div style={{padding:"24px 28px", borderBottom:`1px solid ${T.wire}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
          <div>
            <div style={{fontFamily:FONT_DISPLAY, fontSize:24, color:T.white, marginBottom:6}}>{booking.package}</div>
            <div style={{display:"flex", gap:10, alignItems:"center"}}>
              <StatusPill status={booking.status}/>
              <span style={{fontFamily:FONT_BODY, fontSize:12, color:T.muted}}>Received {booking.createdAt}</span>
            </div>
          </div>
          <button onClick={onClose} style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:6, color:T.ash, width:36, height:36, cursor:"pointer", fontSize:18, flexShrink:0}}>×</button>
        </div>

        <div style={{padding:28, flex:1, display:"flex", flexDirection:"column", gap:18}}>
          {/* Guest info */}
          <div style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:8, padding:20}}>
            <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.silver, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12}}>Guest</div>
            <div style={{display:"flex", gap:14, alignItems:"center", marginBottom:12}}>
              <div style={{width:44, height:44, borderRadius:"50%", background:T.lifted, border:`1px solid ${T.wire}`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT_DISPLAY, fontSize:18, color:T.ash}}>{booking.guest[0]}</div>
              <div>
                <div style={{fontFamily:FONT_DISPLAY, fontSize:20, color:T.white}}>{booking.guest}</div>
                <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.silver}}>{booking.guestEmail}</div>
              </div>
            </div>
            {booking.message && (
              <div style={{background:T.lifted, border:`1px solid ${T.rim}`, borderRadius:6, padding:"12px 14px"}}>
                <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6}}>Guest Message</div>
                <div style={{fontFamily:FONT_BODY, fontSize:13, color:T.ash, lineHeight:1.6, fontStyle:"italic"}}>"{booking.message}"</div>
              </div>
            )}
          </div>

          {/* Assign to Employee */}
          {businessType==="outfitter" && employees.length>0 && (
            <div style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:8, padding:16}}>
              <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.silver, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10}}>Assign To</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button onClick={async()=>{
                  setAssigning(true);
                  const supabase=getSupabase();
                  await supabase.from("bookings").update({assigned_employee_id:null,assigned_at:null}).eq("id",booking.id);
                  onAssign?.(booking.id,null);setAssigning(false);
                }} style={{padding:"8px 14px",borderRadius:6,background:!booking.assigned_employee_id?T.goldGlow:T.carbon,border:`1px solid ${!booking.assigned_employee_id?T.gold:T.wire}`,fontFamily:FONT_BODY,fontSize:12,fontWeight:600,color:!booking.assigned_employee_id?T.gold:T.silver,cursor:"pointer"}}>
                  Me (Owner)
                </button>
                {employees.filter(e=>e.status==="active"||e.status==="invited").map(emp=>(
                  <button key={emp.id} onClick={async()=>{
                    setAssigning(true);
                    const supabase=getSupabase();
                    await supabase.from("bookings").update({assigned_employee_id:emp.id,assigned_at:new Date().toISOString()}).eq("id",booking.id);
                    onAssign?.(booking.id,emp.id);setAssigning(false);
                  }} style={{padding:"8px 14px",borderRadius:6,background:booking.assigned_employee_id===emp.id?`${emp.color}20`:T.carbon,border:`1px solid ${booking.assigned_employee_id===emp.id?emp.color:T.wire}`,fontFamily:FONT_BODY,fontSize:12,fontWeight:600,color:booking.assigned_employee_id===emp.id?emp.color:T.silver,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:emp.color}}/>
                    {emp.display_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trip details */}
          <div style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:8, padding:20}}>
            <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.silver, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14}}>Trip Details</div>
            {[["Date", booking.date], ["Guests", `${booking.guests} guest${booking.guests!==1?"s":""}`], ["Package", booking.package]].map(([l,v])=>(
              <div key={l} style={{display:"flex", gap:12, paddingBottom:10, marginBottom:10, borderBottom:`1px solid ${T.rim}`}}>
                <span style={{fontFamily:FONT_BODY, fontSize:12, color:T.silver, minWidth:80, flexShrink:0}}>{l}</span>
                <span style={{fontFamily:FONT_BODY, fontSize:13, color:T.parchment}}>{v}</span>
              </div>
            ))}
          </div>

          {/* Payment */}
          <div style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:8, padding:20}}>
            <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.silver, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14}}>Payment</div>
            {[["Trip total", `$${booking.total}`], ["Deposit paid", `$${booking.deposit}`], ["Your earnings", `$${booking.total}`]].map(([l,v])=>(
              <div key={l} style={{display:"flex", justifyContent:"space-between", marginBottom:9}}>
                <span style={{fontFamily:FONT_BODY, fontSize:13, color:l==="Your earnings"?T.parchment:T.silver, fontWeight:l==="Your earnings"?700:400}}>{l}</span>
                <span style={{fontFamily:FONT_BODY, fontSize:13, color:l==="Your earnings"?T.gold:T.parchment, fontWeight:l==="Your earnings"?700:400}}>{v}</span>
              </div>
            ))}
            <div style={{marginTop:4, fontFamily:FONT_BODY, fontSize:11, color:T.muted}}>RŌM charges guests a 15% service fee separately. Your listed price is your payout.</div>
          </div>

          {/* Review (if completed + reviewed) */}
          {booking.reviewed && (
            <div style={{background:T.greenGlow, border:`1px solid ${T.green}`, borderRadius:8, padding:18}}>
              <div style={{display:"flex", gap:6, marginBottom:8}}><Stars rating={booking.reviewRating} size={14}/></div>
              <p style={{fontFamily:FONT_BODY, fontSize:13, color:T.ash, lineHeight:1.65, fontStyle:"italic"}}>"{booking.reviewText}"</p>
              <div style={{fontFamily:FONT_BODY, fontSize:12, color:"#6aaa84", marginTop:10}}>— {booking.guest}</div>
            </div>
          )}

          {/* Itinerary */}
          {(booking.status==="confirmed" || booking.status==="completed") && (
            <ItineraryPanel bookingId={booking.id} guideId={booking.guideId || booking.guide_id}/>
          )}

          {/* Quick reply */}
          <div>
            <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.silver, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10}}>Reply to Guest</div>
            <textarea value={replyText} onChange={e=>setReplyText(e.target.value)} rows={3} placeholder="Send a message…"
              style={{width:"100%", boxSizing:"border-box", background:T.steel, border:`1px solid ${T.wire}`, borderRadius:6, padding:"11px 14px", fontFamily:FONT_BODY, fontSize:14, color:T.parchment, outline:"none", resize:"vertical", marginBottom:10}}/>
            <GoldBtn small onClick={()=>{alert("Message sent.");setReplyText("");}} disabled={!replyText}>Send Message</GoldBtn>
          </div>
        </div>

        {/* Accept / Decline */}
        {booking.status==="pending" && (
          <div style={{padding:"20px 28px", borderTop:`1px solid ${T.wire}`, display:"flex", gap:12}}>
            <GoldBtn full onClick={()=>onAccept(booking.id)}>Accept Booking</GoldBtn>
            <button onClick={()=>onDecline(booking.id)} style={{flex:1, background:"none", border:`1px solid ${T.red}`, borderRadius:6, padding:"11px", fontFamily:FONT_BODY, fontSize:13, fontWeight:700, color:"#aa7a7a", cursor:"pointer"}}>Decline</button>
          </div>
        )}

        {/* Complete Trip */}
        {booking.status==="confirmed" && (
          <div style={{padding:"20px 28px", borderTop:`1px solid ${T.wire}`, display:"flex", flexDirection:"column", gap:12}}>
            {!cancelConfirm ? (
              <div style={{display:"flex", gap:12}}>
                <GoldBtn full onClick={async ()=>{
                  setCompleting(true);
                  await onComplete(booking.id);
                  setCompleting(false);
                }} disabled={completing}>{completing ? "Completing…" : "Complete Trip ✓"}</GoldBtn>
                <button onClick={()=>setCancelConfirm(true)} style={{flex:1, background:"none", border:`1px solid ${T.red}`, borderRadius:6, padding:"11px", fontFamily:FONT_BODY, fontSize:13, fontWeight:700, color:"#aa7a7a", cursor:"pointer"}}>Cancel Booking</button>
              </div>
            ) : (
              <div style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:8, padding:16}}>
                <div style={{fontFamily:FONT_BODY, fontSize:13, fontWeight:700, color:T.parchment, marginBottom:10}}>Cancel this booking?</div>
                <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.silver, marginBottom:12}}>The guest's deposit will be refunded automatically.</div>
                <textarea value={cancelReason} onChange={e=>setCancelReason(e.target.value)} rows={2} placeholder="Reason (optional)"
                  style={{width:"100%", boxSizing:"border-box", background:T.lifted, border:`1px solid ${T.rim}`, borderRadius:6, padding:"10px 12px", fontFamily:FONT_BODY, fontSize:13, color:T.parchment, outline:"none", resize:"none", marginBottom:12}}/>
                <div style={{display:"flex", gap:10}}>
                  <button onClick={async ()=>{
                    setCancelling(true);
                    await onCancel(booking.id, cancelReason);
                    setCancelling(false);
                    setCancelConfirm(false);
                  }} disabled={cancelling} style={{flex:1, background:T.red, border:"none", borderRadius:6, padding:"11px", fontFamily:FONT_BODY, fontSize:13, fontWeight:700, color:T.white, cursor:"pointer", opacity:cancelling?0.6:1}}>
                    {cancelling ? "Cancelling…" : "Confirm Cancellation"}
                  </button>
                  <button onClick={()=>{setCancelConfirm(false);setCancelReason("");}} style={{flex:1, background:"none", border:`1px solid ${T.wire}`, borderRadius:6, padding:"11px", fontFamily:FONT_BODY, fontSize:13, fontWeight:600, color:T.ash, cursor:"pointer"}}>Never mind</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── POST-TRIP EXPENSE INTERVIEW ──────────────────────────────────────────────
const EXPENSE_PRESETS_BY_TYPE = {
  "Fly Fishing": [
    { emoji:"🚗", label:"Drove to the spot?", category:"Fuel", defaultAmount:45 },
    { emoji:"⛽", label:"Buy gas?", category:"Fuel", defaultAmount:50 },
    { emoji:"🪱", label:"Bait, flies, or tackle?", category:"Supplies", defaultAmount:30 },
    { emoji:"🍔", label:"Food or meals for guests?", category:"Food & Meals", defaultAmount:35 },
    { emoji:"🚤", label:"Launch or access fees?", category:"License & Permits", defaultAmount:20 },
    { emoji:"🔧", label:"Gear or equipment?", category:"Gear", defaultAmount:50 },
  ],
  "Hunting": [
    { emoji:"🚗", label:"Drove to the spot?", category:"Fuel", defaultAmount:55 },
    { emoji:"⛽", label:"Buy gas?", category:"Fuel", defaultAmount:60 },
    { emoji:"🔫", label:"Ammo or supplies?", category:"Supplies", defaultAmount:40 },
    { emoji:"🍔", label:"Food or meals?", category:"Food & Meals", defaultAmount:35 },
    { emoji:"📋", label:"Permits or access fees?", category:"License & Permits", defaultAmount:25 },
    { emoji:"🔧", label:"Gear or equipment?", category:"Gear", defaultAmount:50 },
  ],
  "default": [
    { emoji:"🚗", label:"Drove to the spot?", category:"Fuel", defaultAmount:45 },
    { emoji:"⛽", label:"Buy gas?", category:"Fuel", defaultAmount:50 },
    { emoji:"🍔", label:"Food or meals for guests?", category:"Food & Meals", defaultAmount:30 },
    { emoji:"🎒", label:"Gear, bait, or supplies?", category:"Supplies", defaultAmount:30 },
    { emoji:"🅿️", label:"Parking or access fees?", category:"Other", defaultAmount:15 },
    { emoji:"🔧", label:"Any other expenses?", category:"Other", defaultAmount:25 },
  ],
};

function ExpenseInterview({ booking, guideId, guideCategories, onDone, onSkip }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]); // { category, amount, label }
  const [currentAmount, setCurrentAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [customDesc, setCustomDesc] = useState("");
  const [customAmount, setCustomAmount] = useState("");

  const activityType = guideCategories?.[0] || "default";
  const presets = EXPENSE_PRESETS_BY_TYPE[activityType] || EXPENSE_PRESETS_BY_TYPE["default"];
  const isLastPreset = step >= presets.length;
  const isSummary = step > presets.length;

  const handleYes = (preset) => {
    const amt = currentAmount ? parseFloat(currentAmount) : preset.defaultAmount;
    setAnswers(a => [...a, { category: preset.category, amount: amt, label: preset.label }]);
    setCurrentAmount("");
    setStep(s => s + 1);
  };

  const handleNo = () => {
    setCurrentAmount("");
    setStep(s => s + 1);
  };

  const handleAddCustom = () => {
    if (customAmount && parseFloat(customAmount) > 0) {
      setAnswers(a => [...a, { category: "Other", amount: parseFloat(customAmount), label: customDesc || "Other expense" }]);
      setCustomDesc("");
      setCustomAmount("");
    }
    setStep(s => s + 1);
  };

  const handleLogAll = async () => {
    if (answers.length === 0) { onDone(); return; }
    setSaving(true);
    try {
      for (const exp of answers) {
        await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guideId,
            category: exp.category,
            amount: exp.amount,
            description: exp.label.replace("?", ""),
            date: booking.date || new Date().toISOString().slice(0, 10),
            bookingId: booking.id,
            taxDeductible: true,
          }),
        });
      }
      setDone(true);
      setTimeout(() => onDone(), 2000);
    } catch (e) {
      console.error("Expense save error:", e);
      setSaving(false);
    }
  };

  const totalDeductions = answers.reduce((s, a) => s + a.amount, 0);

  return (
    <div style={{position:"fixed", inset:0, zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.75)", backdropFilter:"blur(4px)"}}>
      <div style={{background:T.carbon, border:`1px solid ${T.wire}`, borderRadius:14, width:"100%", maxWidth:440, maxHeight:"90vh", overflow:"auto", padding:0}}>
        {/* Header */}
        <div style={{padding:"24px 28px 16px", borderBottom:`1px solid ${T.wire}`}}>
          <div style={{fontFamily:FONT_DISPLAY, fontSize:22, color:T.white, marginBottom:4}}>Log trip expenses</div>
          <div style={{fontFamily:FONT_BODY, fontSize:13, color:T.silver}}>{booking.package} · {booking.guest}</div>
        </div>

        <div style={{padding:"24px 28px"}}>
          {done ? (
            /* Success */
            <div style={{textAlign:"center", padding:"32px 0"}}>
              <div style={{fontSize:48, marginBottom:16}}>✓</div>
              <div style={{fontFamily:FONT_DISPLAY, fontSize:24, color:T.gold, marginBottom:8}}>
                ${totalDeductions.toFixed(0)} logged
              </div>
              <div style={{fontFamily:FONT_BODY, fontSize:14, color:T.silver}}>
                {answers.length} expense{answers.length !== 1 ? "s" : ""} linked to this trip
              </div>
            </div>
          ) : isSummary || isLastPreset ? (
            /* Summary / Anything else step */
            isLastPreset && !isSummary ? (
              <div>
                <div style={{fontFamily:FONT_BODY, fontSize:16, color:T.parchment, marginBottom:16}}>
                  Anything else?
                </div>
                <div style={{display:"flex", gap:8, marginBottom:16}}>
                  <input value={customDesc} onChange={e=>setCustomDesc(e.target.value)} placeholder="What for?" style={{flex:1, background:T.steel, border:`1px solid ${T.wire}`, borderRadius:6, padding:"10px 12px", fontFamily:FONT_BODY, fontSize:14, color:T.parchment, outline:"none"}}/>
                  <div style={{position:"relative", width:100}}>
                    <span style={{position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontFamily:FONT_BODY, fontSize:14, color:T.muted}}>$</span>
                    <input type="number" value={customAmount} onChange={e=>setCustomAmount(e.target.value)} placeholder="0" style={{width:"100%", background:T.steel, border:`1px solid ${T.wire}`, borderRadius:6, padding:"10px 12px 10px 22px", fontFamily:FONT_BODY, fontSize:14, color:T.parchment, outline:"none", boxSizing:"border-box"}}/>
                  </div>
                </div>
                <div style={{display:"flex", gap:10}}>
                  {customAmount && parseFloat(customAmount) > 0 ? (
                    <GoldBtn full onClick={handleAddCustom}>Add & Continue</GoldBtn>
                  ) : (
                    <GoldBtn full onClick={()=>setStep(s=>s+1)}>
                      {answers.length > 0 ? "Review & Log" : "Skip — no expenses"}
                    </GoldBtn>
                  )}
                </div>
              </div>
            ) : (
              /* Final summary */
              <div>
                {answers.length > 0 ? (
                  <>
                    <div style={{fontFamily:FONT_BODY, fontSize:13, color:T.silver, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14}}>Trip Expenses</div>
                    {answers.map((a, i) => (
                      <div key={i} style={{display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:i < answers.length - 1 ? `1px solid ${T.rim}` : "none"}}>
                        <span style={{fontFamily:FONT_BODY, fontSize:14, color:T.parchment}}>{a.label.replace("?","")}</span>
                        <span style={{fontFamily:FONT_BODY, fontSize:14, color:T.gold, fontWeight:700}}>${a.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    <div style={{display:"flex", justifyContent:"space-between", padding:"14px 0 0", marginTop:8, borderTop:`2px solid ${T.wire}`}}>
                      <span style={{fontFamily:FONT_BODY, fontSize:15, fontWeight:700, color:T.parchment}}>Total deductions</span>
                      <span style={{fontFamily:FONT_DISPLAY, fontSize:22, color:T.gold}}>${totalDeductions.toFixed(2)}</span>
                    </div>
                    <div style={{marginTop:20}}>
                      <GoldBtn full onClick={handleLogAll} disabled={saving}>
                        {saving ? "Saving…" : `Log ${answers.length} Expense${answers.length !== 1 ? "s" : ""}`}
                      </GoldBtn>
                    </div>
                  </>
                ) : (
                  <div style={{textAlign:"center", padding:"20px 0"}}>
                    <div style={{fontFamily:FONT_BODY, fontSize:15, color:T.silver, marginBottom:16}}>No expenses for this trip.</div>
                    <GoldBtn full onClick={onDone}>Done</GoldBtn>
                  </div>
                )}
              </div>
            )
          ) : (
            /* Question step */
            <div>
              <div style={{display:"flex", alignItems:"center", gap:4, marginBottom:20}}>
                {presets.map((_, i) => (
                  <div key={i} style={{flex:1, height:3, borderRadius:2, background:i <= step ? T.gold : T.wire, transition:"background 0.2s"}}/>
                ))}
              </div>
              <div style={{textAlign:"center", marginBottom:24}}>
                <div style={{fontSize:40, marginBottom:12}}>{presets[step].emoji}</div>
                <div style={{fontFamily:FONT_DISPLAY, fontSize:20, color:T.white, marginBottom:8}}>
                  {presets[step].label}
                </div>
              </div>
              {/* Amount input (shown but pre-filled) */}
              <div style={{display:"flex", justifyContent:"center", marginBottom:24}}>
                <div style={{position:"relative", width:140}}>
                  <span style={{position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontFamily:FONT_DISPLAY, fontSize:22, color:T.muted}}>$</span>
                  <input
                    type="number"
                    value={currentAmount || presets[step].defaultAmount}
                    onChange={e => setCurrentAmount(e.target.value)}
                    style={{width:"100%", textAlign:"center", background:T.steel, border:`1px solid ${T.wire}`, borderRadius:8, padding:"14px 14px 14px 28px", fontFamily:FONT_DISPLAY, fontSize:24, color:T.gold, outline:"none", boxSizing:"border-box"}}
                  />
                </div>
              </div>
              <div style={{display:"flex", gap:10}}>
                <GoldBtn full onClick={() => handleYes(presets[step])}>Yes</GoldBtn>
                <button onClick={handleNo} style={{flex:1, background:"none", border:`1px solid ${T.wire}`, borderRadius:6, padding:"13px", fontFamily:FONT_BODY, fontSize:14, fontWeight:700, color:T.ash, cursor:"pointer"}}>No</button>
              </div>
            </div>
          )}
        </div>

        {/* Skip */}
        {!done && (
          <div style={{padding:"0 28px 20px", textAlign:"center"}}>
            <button onClick={onSkip} style={{background:"none", border:"none", fontFamily:FONT_BODY, fontSize:13, color:T.muted, cursor:"pointer", padding:"8px 16px"}}>
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
const TABS = ["Overview","Bookings","Calendar","Packages","Messages","Earnings","Finances","Marketing","Analytics","Guests","Licenses","Team","Profile"];

export default function GuideDashboard() {
  const [tab, setTab] = useState("Overview");
  const [bookings, setBookings] = useState([]);
  const [activeBooking, setActiveBooking] = useState(null);
  const [bookingFilter, setBookingFilter] = useState("all");
  const [packages, setPackages] = useState([]);
  const [guide, setGuide] = useState({...GUIDE_DEFAULT});
  const [stats, setStats] = useState(STATS_DEFAULT);
  const [guideId, setGuideId] = useState(null);
  const [blockedDatesDB, setBlockedDatesDB] = useState([]);
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [replyBody, setReplyBody] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState(null); // null | 'complete' | 'incomplete'
  const [uploadingPhoto, setUploadingPhoto] = useState(null); // 'profile' | 'cover' | 'gallery' | null
  const [photoUrls, setPhotoUrls] = useState({ profile: null, cover: null, gallery: [] });
  const [uploadError, setUploadError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("guide");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [workingDays, setWorkingDays] = useState([1,2,3,4,5,6,0]);
  const [maxConcurrent, setMaxConcurrent] = useState(1);
  const [businessType, setBusinessType] = useState("solo");
  const [isEmployee, setIsEmployee] = useState(false);
  const [employeeRecord, setEmployeeRecord] = useState(null);
  const [employeePermissions, setEmployeePermissions] = useState({});
  const [earningsMonthly, setEarningsMonthly] = useState([]);
  const [editingPkg, setEditingPkg] = useState(null); // package object being edited, or {} for new
  const [pkgSaving, setPkgSaving] = useState(false);
  const [healthScore, setHealthScore] = useState(null); // { health_score, health_action, health_components }
  const [contentQueue, setContentQueue] = useState([]); // pending content_pieces
  const [expenseInterview, setExpenseInterview] = useState(null); // booking object to show interview for

  // Check for Stripe redirect return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe") === "success") {
      setStripeStatus("complete");
      setTab("Profile");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("stripe") === "refresh") {
      setTab("Profile");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleStripeConnect = async () => {
    if (!guideId) return;
    setStripeLoading(true);
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error("Stripe connect error:", e);
    }
    setStripeLoading(false);
  };

  const handlePhotoUpload = async (file, type, galleryIndex=null) => {
    if (!file || !guideId) return;
    if (file.size > 5 * 1024 * 1024) { setUploadError("File must be under 5MB."); return; }
    if (!file.type.startsWith("image/")) { setUploadError("Only image files allowed."); return; }
    setUploadError("");
    setUploadingPhoto(type);
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${type}${galleryIndex!==null?`-${galleryIndex}`:""}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("guide-photos").upload(path, file, { upsert: true });
      if (upErr) { setUploadError(upErr.message); setUploadingPhoto(null); return; }
      const { data: { publicUrl } } = supabase.storage.from("guide-photos").getPublicUrl(path);
      // Update guides table
      if (type === "profile") {
        await supabase.from("guides").update({ profile_photo_url: publicUrl }).eq("id", guideId);
        setPhotoUrls(p => ({...p, profile: publicUrl}));
      } else if (type === "cover") {
        await supabase.from("guides").update({ cover_photo_url: publicUrl }).eq("id", guideId);
        setPhotoUrls(p => ({...p, cover: publicUrl}));
      } else if (type === "gallery") {
        const newGallery = [...photoUrls.gallery];
        if (galleryIndex !== null) newGallery[galleryIndex] = publicUrl;
        else newGallery.push(publicUrl);
        await supabase.from("guides").update({ gallery_photos: newGallery }).eq("id", guideId);
        setPhotoUrls(p => ({...p, gallery: newGallery}));
      }
    } catch(e) { setUploadError("Upload failed. Please try again."); }
    setUploadingPhoto(null);
  };

  const triggerUpload = (type, galleryIndex=null) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => { if (e.target.files[0]) handlePhotoUpload(e.target.files[0], type, galleryIndex); };
    input.click();
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      // Fetch guide record — either as owner or employee
      let g = null;
      const { data: ownGuide } = await supabase
        .from("guides").select("*")
        .eq("profile_id", user.id).single();

      if (ownGuide) {
        g = ownGuide;
      } else {
        // Check if user is an employee of a guide business
        const { data: empRecord } = await supabase
          .from("guide_employees").select("*, guide_id")
          .eq("user_id", user.id)
          .in("status", ["active", "invited"])
          .single();
        if (empRecord) {
          const { data: empGuide } = await supabase
            .from("guides").select("*")
            .eq("id", empRecord.guide_id).single();
          if (empGuide) {
            g = empGuide;
            setIsEmployee(true);
            setEmployeeRecord(empRecord);
            setEmployeePermissions(empRecord.permissions || {});
          }
        }
      }

      console.log("Guide fetch result:", g, "user:", user.id);
      if (!g) { console.error("No guide row found for user", user.id); return; }

      // Fetch name from profiles separately
      const { data: prof, error: profErr } = await supabase
        .from("profiles").select("full_name").eq("id", user.id).single();
      console.log("Profile fetch:", prof, profErr);

      // Also update stats from real data
      const now2 = new Date();

      setGuideId(g.id);
      setPhotoUrls({ profile: g.profile_photo_url||null, cover: g.cover_photo_url||null, gallery: g.gallery_photos||[] });
      setCurrentUserId(user.id);
      setGuide({
        name: prof?.full_name || user.email?.split("@")[0] || "Guide",
        slug: g.slug,
        location: g.location || "",
        rating: parseFloat(g.rating) || 0,
        reviewCount: g.review_count || 0,
        responseRate: g.response_rate || 0,
        avatar: (g.profiles?.full_name || "G")[0].toUpperCase(),
        verified: g.verified,
        memberSince: new Date(g.created_at).toLocaleDateString("en-US", {month:"long", year:"numeric"}),
        stripeConnected: g.stripe_onboarding_complete || false,
        profilePhoto: g.profile_photo_url || null,
        coverPhoto: g.cover_photo_url || null,
        galleryPhotos: g.gallery_photos || [],
        subscription_tier: g.subscription_tier || "spark",
        categories: g.categories || [],
        hasOwnInsurance: g.has_own_liability_insurance || false,
        insuranceProvider: g.insurance_provider || null,
        insuranceExpiry: g.insurance_expiry_date || null,
        perBookingInsurance: g.per_booking_insurance || false,
        insuranceAutoPurchase: g.insurance_auto_purchase || false,
      });

      // Business settings
      setBusinessType(g.business_type || "solo");
      setMaxConcurrent(g.max_concurrent_bookings || 1);
      setWorkingDays(g.working_days || [1,2,3,4,5,6,0]);

      // Fetch employees
      const { data: emps } = await supabase.from("guide_employees").select("*").eq("guide_id", g.id).order("created_at");
      if (emps) setEmployees(emps);

      // Fetch bookings for this guide
      const { data: rawBookings } = await supabase
        .from("bookings").select("*")
        .eq("guide_id", g.id)
        .order("trip_date", { ascending: false });

      if (rawBookings?.length > 0) {
        const shaped = rawBookings.map(b => ({
          id: b.id,
          status: b.status,
          guest: b.guest_name || "Traveler",
          guestEmail: "",
          guests: b.guests,
          package: b.package_title || "Package",
          date: new Date(b.trip_date).toLocaleDateString("en-US", {month:"long", day:"numeric", year:"numeric"}),
          rawDate: b.trip_date, // ISO date for forecasting
          total: b.total,
          deposit: b.deposit,
          message: b.special_requests || "",
          createdAt: new Date(b.created_at).toLocaleDateString("en-US", {month:"short", day:"numeric"}),
        }));
        setBookings(shaped);
      }

      // Fetch packages
      const { data: pkgs } = await supabase
        .from("packages").select("*").eq("guide_id", g.id).order("sort_order", { ascending: true });
      if (pkgs?.length > 0) {
        setPackages(pkgs.map(p => ({
          id: p.id, title: p.title, duration: p.duration,
          price: p.price, priceType: p.price_type, active: p.active,
          bookingsCount: 0, rating: 0,
        })));
      }

      // Compute stats
      const now = new Date();
      const thisMonth = (rawBookings||[]).filter(b => {
        const d = new Date(b.trip_date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      const lastMonth = (rawBookings||[]).filter(b => {
        const d = new Date(b.trip_date);
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
      });

      setStats({
        earningsThisMonth: thisMonth.reduce((s,b) => s + (parseFloat(b.total)||0), 0),
        earningsLastMonth: lastMonth.reduce((s,b) => s + (parseFloat(b.total)||0), 0),
        tripsThisMonth: thisMonth.length,
        tripsAllTime: (rawBookings||[]).filter(b => b.status === "completed").length,
        avgRating: parseFloat(g.rating) || 0,
        responseRate: g.response_rate || 0,
        profileViews: g.profile_views || 0,
        conversionRate: 0,
        reviewCount: g.review_count || 0,
      });

      // Compute earnings by month (last 7 months)
      const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const monthlyData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthBookings = (rawBookings||[]).filter(b => {
          const bd = new Date(b.trip_date);
          return bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear();
        });
        monthlyData.push({
          month: monthNames[d.getMonth()],
          amount: monthBookings.reduce((s,b) => s + (parseFloat(b.total)||0), 0),
        });
      }
      setEarningsMonthly(monthlyData);


      // Fetch blocked dates from availability table

      // Fetch message threads
      const { data: threadData } = await supabase
        .from("message_threads")
        .select("*, messages(id, body, sender_id, created_at, read_at)")
        .eq("guide_id", g.id)
        .order("last_message_at", { ascending: false });
      if (threadData) setThreads(threadData);
      const { data: avail } = await supabase
        .from("availability")
        .select("date")
        .eq("guide_id", g.id)
        .eq("status", "blocked");
      if (avail) setBlockedDatesDB(avail.map(a => a.date));

      // Fetch notifications
      const { data: notifs } = await supabase
        .from("guide_notifications")
        .select("*")
        .eq("guide_id", g.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (notifs) {
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.read_at).length);
      }

      // Fetch health score
      const { data: intel } = await supabase
        .from("guide_intelligence")
        .select("health_score, health_action, health_components")
        .eq("guide_id", g.id)
        .single();
      if (intel) setHealthScore(intel);

      // Fetch pending content pieces
      const { data: content } = await supabase
        .from("content_pieces")
        .select("*")
        .eq("guide_id", g.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);
      if (content) setContentQueue(content);
    } catch(e) { console.error("Guide dashboard error:", e); }
  };

  const markNotificationsRead = async () => {
    if (unreadCount === 0 || !guideId) return;
    try {
      const supabase = getSupabase();
      await supabase
        .from("guide_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("guide_id", guideId)
        .is("read_at", null);
      setNotifications(ns => ns.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setUnreadCount(0);
    } catch(e) { console.error("Mark read error:", e); }
  };

  const pendingCount = bookings.filter(b=>b.status==="pending").length;
  const unreadMsgs = threads.filter(t => (t.messages||[]).some(m => m.sender_id !== currentUserId && !m.read_at)).length;

  // Per-booking insurance cost by activity category
  const INSURANCE_COSTS = {
    "Fly Fishing": 25, "Fishing": 25, "Kayaking": 25, "Diving": 25, "Surfing": 25, "Sailing": 25,
    "Rock Climbing": 45, "Hiking": 20, "Backpacking": 20, "Wildlife": 20, "Photography": 20,
    "Snowshoeing": 20, "Camping": 20, "Ice Fishing": 25,
    "Mountain Biking": 35, "Hunting": 35,
  };
  const getInsuranceCost = () => {
    const cat = (guide.categories || [])[0] || "";
    return INSURANCE_COSTS[cat] || 30;
  };

  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [pendingAcceptId, setPendingAcceptId] = useState(null);
  const [insuranceAccepting, setInsuranceAccepting] = useState(false);

  const guideHasValidInsurance = guide.hasOwnInsurance &&
    guide.insuranceExpiry &&
    new Date(guide.insuranceExpiry) > new Date();

  const accept = async (id) => {
    // Check if guide has valid insurance
    if (!guideHasValidInsurance) {
      // Show insurance required modal
      setPendingAcceptId(id);
      setShowInsuranceModal(true);
      return;
    }
    // Guide has own insurance — confirm normally
    await confirmBooking(id, { guide_insurance_active: true });
  };

  const confirmBooking = async (id, insuranceFields = {}) => {
    try {
      const supabase = getSupabase();
      await supabase.from("bookings").update({
        status: "confirmed",
        ...insuranceFields,
      }).eq("id", id);
      // Auto-generate itinerary in background
      fetch("/api/ai/itinerary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id }),
      }).catch(console.error);
    } catch(e) { console.error(e); }
    setBookings(bs=>bs.map(b=>b.id===id?{...b,status:"confirmed"}:b));
    setActiveBooking(null);
    setShowInsuranceModal(false);
    setPendingAcceptId(null);
  };

  const acceptWithPerBookingInsurance = async () => {
    if (!pendingAcceptId) return;
    setInsuranceAccepting(true);
    const cost = getInsuranceCost();
    await confirmBooking(pendingAcceptId, {
      guide_insurance_active: true,
      guide_insurance_provider: "thimble",
      guide_insurance_cost: cost,
    });
    setInsuranceAccepting(false);
  };

  const decline = async (id) => {
    try {
      const supabase = getSupabase();
      await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    } catch(e) { console.error(e); }
    setBookings(bs=>bs.map(b=>b.id===id?{...b,status:"cancelled"}:b));
    setActiveBooking(null);
  };

  const completeTrip = async (id) => {
    try {
      const res = await fetch("/api/bookings/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id }),
      });
      if (!res.ok) throw new Error("Failed to complete");
    } catch(e) { console.error(e); }
    const completedBooking = bookings.find(b => b.id === id);
    setBookings(bs=>bs.map(b=>b.id===id?{...b,status:"completed"}:b));
    setActiveBooking(null);
    // Show expense interview
    if (completedBooking) setExpenseInterview(completedBooking);
  };

  const cancelBooking = async (id, reason) => {
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id, reason, initiatedBy: "guide" }),
      });
      if (!res.ok) throw new Error("Failed to cancel");
    } catch(e) { console.error(e); }
    setBookings(bs=>bs.map(b=>b.id===id?{...b,status:"cancelled"}:b));
    setActiveBooking(null);
  };

  const toggleBlockDate = async (fullDate) => {
    if (!guideId) return;
    const supabase = getSupabase();
    const isBlocked = blockedDatesDB.includes(fullDate);
    if (isBlocked) {
      await supabase.from("availability").delete().eq("guide_id", guideId).eq("date", fullDate);
      setBlockedDatesDB(prev => prev.filter(d => d !== fullDate));
    } else {
      await supabase.from("availability").upsert({ guide_id: guideId, date: fullDate, status: "blocked" }, { onConflict: "guide_id,date" });
      setBlockedDatesDB(prev => [...prev, fullDate]);
    }
  };


  const openThread = async (thread) => {
    setActiveThread(thread);
    setThreadMessages((thread.messages||[]).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)));
    const supabase = getSupabase();
    const unread = (thread.messages||[]).filter(m => m.sender_id !== currentUserId && !m.read_at);
    if (unread.length > 0) {
      await supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unread.map(m => m.id));
      setThreads(prev => prev.map(t => t.id === thread.id ? {...t, messages: (t.messages||[]).map(m => !m.read_at ? {...m, read_at: new Date().toISOString()} : m)} : t));
    }
  };

  const sendReply = async () => {
    if (!replyBody.trim() || !activeThread || !currentUserId) return;
    setSendingMsg(true);
    const supabase = getSupabase();
    const { data: msg } = await supabase.from("messages").insert({ thread_id: activeThread.id, sender_id: currentUserId, body: replyBody.trim() }).select().single();
    if (msg) {
      setThreadMessages(prev => [...prev, msg]);
      setReplyBody("");
      await supabase.from("message_threads").update({ last_message_at: new Date().toISOString() }).eq("id", activeThread.id);
      // Notify client
      fetch("/api/messages/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: activeThread.id, senderId: currentUserId, messageBody: replyBody.trim() }),
      }).catch(console.error);
    }
    setSendingMsg(false);
  };
  const filteredBookings = bookings.filter(b=>{
    // Employees only see their assigned bookings
    if (isEmployee && employeeRecord && b.assigned_employee_id !== employeeRecord.id) return false;
    if(bookingFilter==="pending") return b.status==="pending";
    if(bookingFilter==="confirmed") return b.status==="confirmed";
    if(bookingFilter==="completed") return b.status==="completed";
    return true;
  });

  // ── Calendar state ──
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());
  const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const firstDay=new Date(calYear,calMonth,1).getDay();
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
  const calCells=[];
  for(let i=0;i<firstDay;i++) calCells.push(null);
  for(let d=1;d<=daysInMonth;d++) calCells.push(d);
  const bookedDates = bookings
    .filter(b => b.status === "confirmed" || b.status === "pending")
    .map(b => b.date ? String(b.date).slice(0,10) : null)
    .filter(Boolean);
  const blockedDates = blockedDatesDB;

  return (
    <>
      {/* Insurance Required Modal */}
      {showInsuranceModal && (
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.8)",backdropFilter:"blur(4px)"}}>
          <div style={{background:T.carbon,border:`1px solid ${T.wire}`,borderRadius:16,padding:isMobile?"28px 20px":"40px",maxWidth:520,width:"90%",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{textAlign:"center",marginBottom:28}}>
              <div style={{width:64,height:64,borderRadius:"50%",background:"rgba(201,165,92,0.12)",border:`2px solid ${T.gold}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:28}}>🛡️</div>
              <div style={{fontFamily:FONT_DISPLAY,fontSize:28,color:T.white,fontWeight:400,marginBottom:8}}>Insurance Required</div>
              <p style={{fontFamily:FONT_BODY,fontSize:14,color:T.silver,lineHeight:1.7}}>
                Liability insurance is required to confirm bookings on RŌM. Choose how you'd like to be covered for this trip.
              </p>
            </div>

            {/* Per-booking option */}
            <div style={{background:T.goldGlow,border:`1px solid ${T.gold}`,borderRadius:10,padding:20,marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontFamily:FONT_BODY,fontSize:15,fontWeight:700,color:T.gold}}>Per-Trip Coverage</div>
                <div style={{fontFamily:FONT_DISPLAY,fontSize:24,color:T.gold}}>${getInsuranceCost()}</div>
              </div>
              <p style={{fontFamily:FONT_BODY,fontSize:13,color:T.parchment,lineHeight:1.6,marginBottom:4}}>
                $1M+ commercial general liability coverage for this specific booking. Covers you from confirmation through trip completion. Provided by our insurance partner.
              </p>
              <p style={{fontFamily:FONT_BODY,fontSize:11,color:T.silver,marginBottom:16}}>
                This amount will be deducted from your payout for this booking.
              </p>
              <button onClick={acceptWithPerBookingInsurance} disabled={insuranceAccepting} style={{
                width:"100%",padding:"14px",background:T.gold,border:"none",borderRadius:8,
                fontFamily:FONT_BODY,fontSize:15,fontWeight:700,color:T.ink,cursor:insuranceAccepting?"not-allowed":"pointer",
                opacity:insuranceAccepting?0.6:1
              }}>
                {insuranceAccepting ? "Confirming..." : `Accept Coverage & Confirm Booking — $${getInsuranceCost()}`}
              </button>
            </div>

            {/* Own insurance option */}
            <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:20,marginBottom:16}}>
              <div style={{fontFamily:FONT_BODY,fontSize:14,fontWeight:600,color:T.parchment,marginBottom:6}}>I have my own liability insurance</div>
              <p style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver,lineHeight:1.5,marginBottom:12}}>
                Upload your Certificate of Insurance in the Licenses tab. Once verified, you can confirm bookings without per-trip charges.
              </p>
              <button onClick={()=>{setShowInsuranceModal(false);setPendingAcceptId(null);setTab("Licenses");}} style={{
                width:"100%",padding:"12px",background:"transparent",border:`1px solid ${T.wire}`,borderRadius:8,
                fontFamily:FONT_BODY,fontSize:13,fontWeight:600,color:T.ash,cursor:"pointer"
              }}>
                Go to Licenses & Insurance →
              </button>
            </div>

            <button onClick={()=>{setShowInsuranceModal(false);setPendingAcceptId(null);}} style={{
              display:"block",margin:"0 auto",background:"none",border:"none",fontFamily:FONT_BODY,fontSize:13,color:T.muted,cursor:"pointer",padding:8
            }}>
              Cancel — don't confirm yet
            </button>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Barlow:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.void};}
        ::placeholder{color:${T.muted};}
        textarea,input,select{font-family:'Barlow',system-ui,sans-serif;}
        ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:${T.carbon};}::-webkit-scrollbar-thumb{background:${T.wire};border-radius:3px;}
      `}</style>

      {/* ── NAV — void ── */}
      <div style={{position:"sticky",top:0,zIndex:100,background:T.void,borderBottom:`1px solid ${T.wire}`,height:56,display:"flex",alignItems:"center"}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"0 16px",width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:FONT_DISPLAY,fontSize:22,color:T.gold,letterSpacing:"0.14em",fontWeight:500,cursor:"pointer"}} onClick={()=>window.location.href="/"}>RŌM</div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            {pendingCount>0 && (
              <div onClick={()=>{setTab("Bookings");setBookingFilter("pending");}} style={{display:"flex",alignItems:"center",gap:4,background:T.goldGlow,border:`1px solid ${T.gold}`,borderRadius:20,padding:"4px 10px",cursor:"pointer"}}>
                <span style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.gold}}>{pendingCount}</span>
              </div>
            )}
            <div style={{width:32,height:32,borderRadius:"50%",background:T.steel,border:`2px solid ${T.gold}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_DISPLAY,fontSize:14,color:T.gold,flexShrink:0}}>{guide.avatar}</div>
          </div>
        </div>
      </div>

      {/* ── HEADER — carbon ── */}
      <div style={{background:T.carbon,borderBottom:`1px solid ${T.wire}`}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"20px 16px 0"}}>
          <div style={{marginBottom:16}}>
            <div style={{fontFamily:FONT_BODY,fontSize:10,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>
              {isEmployee ? `${guide.name} · Team Member` : "Guide Dashboard"}
            </div>
            <h1 style={{fontFamily:FONT_DISPLAY,fontSize:28,color:T.white,fontWeight:400,marginBottom:12}}>
              {isEmployee ? employeeRecord?.display_name || "Team Member" : guide.name}
            </h1>
            {(!isEmployee || employeePermissions.financials) && (
              <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
                {[["$"+stats.earningsThisMonth.toLocaleString(),"This month"],["$"+(stats.earningsThisMonth-stats.earningsLastMonth>=0?"+":"")+((stats.earningsThisMonth-stats.earningsLastMonth)),"vs last month"],[stats.tripsThisMonth+" trips","This month"]].map(([val,label],i)=>(
                  <div key={label+i}>
                    <div style={{fontFamily:FONT_DISPLAY,fontSize:20,color:T.white,fontWeight:300,lineHeight:1}}>{val}</div>
                    <div style={{fontFamily:FONT_BODY,fontSize:10,color:T.silver,marginTop:2}}>{label}</div>
                  </div>
                ))}
              </div>
            )}
            {isEmployee && !employeePermissions.financials && (
              <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver}}>
                {filteredBookings.filter(b=>b.status==="confirmed"||b.status==="pending").length} assigned trip{filteredBookings.filter(b=>b.status==="confirmed"||b.status==="pending").length!==1?"s":""}
              </div>
            )}
          </div>
          <div style={{display:"flex",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none"}}>
            <style>{`.tab-scroll::-webkit-scrollbar{display:none;}`}</style>
            <div className="tab-scroll" style={{display:"flex",minWidth:"max-content"}}>
            {(isEmployee ? TABS.filter(t => {
              const p = employeePermissions;
              if (t==="Overview") return true;
              if (t==="Bookings") return p.bookings;
              if (t==="Calendar") return p.calendar;
              if (t==="Messages") return p.messages;
              if (t==="Packages") return false;
              if (t==="Earnings") return p.financials;
              if (t==="Finances") return p.financials;
              if (t==="Marketing") return p.marketing;
              if (t==="Analytics") return p.analytics;
              if (t==="Guests") return p.guests;
              if (t==="Licenses") return false;
              if (t==="Team") return false;
              if (t==="Profile") return false;
              return false;
            }) : TABS).map(t=>{
              const badge = (t==="Bookings"&&pendingCount) ? pendingCount : (t==="Messages"&&unreadMsgs) ? unreadMsgs : null;
              return (
                <button key={t} onClick={()=>setTab(t)} style={{
                  padding:"14px 16px",background:"none",border:"none",
                  borderBottom:`2px solid ${tab===t?T.gold:"transparent"}`,
                  fontFamily:FONT_BODY,fontSize:13,fontWeight:tab===t?700:400,
                  color:tab===t?T.gold:T.silver,cursor:"pointer",
                  display:"flex",alignItems:"center",gap:7,whiteSpace:"nowrap",flexShrink:0,
                }}>
                  {t}
                  {badge && <span style={{background:T.gold,color:T.ink,borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>{badge}</span>}
                </button>
              );
            })}
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY — gunmetal ── */}
      <div style={{background:T.gunmetal,minHeight:"calc(100vh - 170px)"}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"36px 16px 80px"}}>

          {/* ── OVERVIEW ── */}
          {tab==="Overview" && (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {/* Stats row */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:12}}>
                {[
                  ["◎","Earnings this month",`$${stats.earningsThisMonth.toLocaleString()}`,`+$${stats.earningsThisMonth-stats.earningsLastMonth} vs last`],
                  ["◷","Trips this month",stats.tripsThisMonth,`${stats.tripsAllTime} all time`],
                  ["★","Avg rating",stats.avgRating,`${stats.reviewCount || 0} reviews`],
                  ["◉","Response rate",`${stats.responseRate}%`,"Goal: 95%+"],
                  ["◈","Profile views",stats.profileViews,"This month"],
                  ["✦","Conversion",`${stats.conversionRate}%`,"Views → bookings"],
                ].map(([icon,label,val,sub])=>(
                  <div key={label} style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:"16px 16px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div style={{fontFamily:FONT_BODY,fontSize:10,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</div>
                      <span style={{color:T.gold,fontSize:14}}>{icon}</span>
                    </div>
                    <div style={{fontFamily:FONT_DISPLAY,fontSize:26,color:T.white,fontWeight:300,lineHeight:1,marginBottom:4}}>{val}</div>
                    <div style={{fontFamily:FONT_BODY,fontSize:11,color:T.silver}}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* Earnings chart */}
              <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:"20px 16px"}}>
                <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:20}}>Earnings — Last 7 Months</div>
                <EarningsChart data={earningsMonthly}/>
              </div>

              {/* Health Score */}
              {healthScore && (
                <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:24,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:16}}>Business Health</div>
                  {/* Circular gauge */}
                  <div style={{position:"relative",width:100,height:100,marginBottom:14}}>
                    <svg width="100" height="100" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke={T.wire} strokeWidth="6"/>
                      <circle cx="50" cy="50" r="42" fill="none"
                        stroke={healthScore.health_score >= 75 ? T.green : healthScore.health_score >= 50 ? T.gold : T.red}
                        strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={`${(healthScore.health_score / 100) * 264} 264`}
                        transform="rotate(-90 50 50)"/>
                    </svg>
                    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
                      <div style={{fontFamily:FONT_DISPLAY,fontSize:32,color:T.white,fontWeight:300,lineHeight:1}}>{healthScore.health_score}</div>
                      <div style={{fontFamily:FONT_BODY,fontSize:10,color:T.muted}}>/ 100</div>
                    </div>
                  </div>
                  <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.ash,textAlign:"center",lineHeight:1.5,maxWidth:220}}>{healthScore.health_action}</div>
                  {healthScore.health_components && (
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",marginTop:12}}>
                      {Object.entries(healthScore.health_components).map(([key, val]) => (
                        <span key={key} style={{fontFamily:FONT_BODY,fontSize:9,color:val >= 70 ? T.green : val >= 40 ? T.gold : T.red,background:val >= 70 ? T.greenGlow : val >= 40 ? T.goldGlow : T.redGlow,borderRadius:3,padding:"2px 6px"}}>
                          {key.replace(/_/g," ")} {val}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Pending bookings */}
              <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,overflow:"hidden"}}>
                <div style={{background:T.void,padding:"14px 18px",borderBottom:`1px solid ${T.wire}`,display:"flex",justifyContent:"space-between"}}>
                  <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em"}}>Needs Response</div>
                  {pendingCount>0&&<span style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.gold}}>{pendingCount} pending</span>}
                </div>
                <div style={{padding:16}}>
                  {bookings.filter(b=>b.status==="pending").length===0 ? (
                    <div style={{textAlign:"center",padding:"24px 0",fontFamily:FONT_BODY,fontSize:13,color:T.muted}}>All caught up ✓</div>
                  ) : bookings.filter(b=>b.status==="pending").map(b=>(
                    <div key={b.id} onClick={()=>setActiveBooking(b)} style={{padding:"12px 0",borderBottom:`1px solid ${T.rim}`,cursor:"pointer"}}>
                      <div style={{fontFamily:FONT_BODY,fontSize:13,fontWeight:700,color:T.parchment,marginBottom:3}}>{b.guest}</div>
                      <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver,marginBottom:4}}>{b.package} · {b.date}</div>
                      <div style={{fontFamily:FONT_BODY,fontSize:11,color:T.gold,fontWeight:600}}>Respond →</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notifications — Expandable, latest 3 by default */}
              {notifications.length > 0 && (() => {
                const NTYPE_ICONS = {
                  trip_match: "🎯", booking_request: "📩", booking_cancelled: "❌", trip_completed: "✓",
                  vip_detected: "✦", itinerary_generated: "📋", guest_briefing: "📌", lead_response_sent: "💬",
                  content_ready: "✍️", business_health_weekly: "📊", calendar_fill_activated: "📈",
                  repeat_guest_sent: "🔄", license_expiring: "⚠️", balance_charged: "💰", balance_charge_failed: "⚠️",
                  review: "⭐", content: "✍️", booking: "📋", license: "⚠️", business_health: "📊",
                };
                const NTYPE_TAB = { content_ready: "Marketing", content: "Marketing", license_expiring: "Licenses", license: "Licenses", business_health_weekly: "Analytics", business_health: "Analytics" };
                const sorted = [...notifications].sort((a,b) => {
                  if (!a.read_at && b.read_at) return -1;
                  if (a.read_at && !b.read_at) return 1;
                  if (a.priority === "high" && b.priority !== "high") return -1;
                  if (a.priority !== "high" && b.priority === "high") return 1;
                  return new Date(b.created_at) - new Date(a.created_at);
                });
                const visible = showAllNotifications ? sorted : sorted.slice(0,3);
                return (
                <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,overflow:"hidden"}}>
                  <div style={{background:T.void,padding:"12px 16px",borderBottom:`1px solid ${T.wire}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em"}}>Notifications</div>
                      {unreadCount>0&&<span style={{fontFamily:FONT_BODY,fontSize:10,fontWeight:700,color:T.ink,background:T.gold,borderRadius:10,padding:"2px 7px"}}>{unreadCount}</span>}
                    </div>
                    {unreadCount>0&&<div onClick={markNotificationsRead} style={{fontFamily:FONT_BODY,fontSize:11,color:T.gold,cursor:"pointer",fontWeight:600}}>Mark read</div>}
                  </div>
                  <div style={{padding:"8px 12px"}}>
                    {visible.map(n=>{
                      const icon = NTYPE_ICONS[n.type] || "◉";
                      const targetTab = NTYPE_TAB[n.type];
                      const handleClick = async () => {
                        if (!n.read_at) {
                          await fetch("/api/notifications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({notificationId:n.id,action:"read"})}).catch(()=>{});
                          setNotifications(ns=>ns.map(x=>x.id===n.id?{...x,read_at:new Date().toISOString()}:x));
                          setUnreadCount(c=>Math.max(0,c-1));
                        }
                        if (targetTab) setTab(targetTab);
                      };
                      return (
                        <div key={n.id} onClick={handleClick} style={{padding:"10px 8px",borderBottom:`1px solid ${T.rim}`,background:!n.read_at?"rgba(193,163,98,0.05)":"transparent",borderRadius:6,cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start"}}>
                          <span style={{fontSize:14,flexShrink:0,marginTop:1}}>{icon}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                              <div style={{fontFamily:FONT_BODY,fontSize:12,fontWeight:!n.read_at?700:500,color:!n.read_at?T.gold:T.parchment,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.title}</div>
                              <span style={{fontFamily:FONT_BODY,fontSize:10,color:T.muted,flexShrink:0}}>{new Date(n.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>
                            </div>
                            {!n.read_at && <div style={{fontFamily:FONT_BODY,fontSize:11,color:T.ash,lineHeight:1.4,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.body}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {sorted.length > 3 && (
                    <div onClick={()=>setShowAllNotifications(v=>!v)} style={{padding:"10px 16px",borderTop:`1px solid ${T.wire}`,textAlign:"center",cursor:"pointer"}}>
                      <span style={{fontFamily:FONT_BODY,fontSize:12,color:T.gold,fontWeight:600}}>{showAllNotifications ? "Show less" : `Show all ${sorted.length} notifications`}</span>
                    </div>
                  )}
                </div>
                );
              })()}

              {/* Stripe Connect prompt */}
              {!guide.stripeConnected && (
                <div style={{background:T.goldGlow,border:`1px solid ${T.gold}`,borderRadius:10,padding:"16px 16px"}}>
                  <div style={{fontFamily:FONT_DISPLAY,fontSize:18,color:T.gold,fontWeight:400,marginBottom:4}}>Connect payments to start earning</div>
                  <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.ash,marginBottom:12}}>Set up Stripe to receive payouts. Takes about 2 minutes.</div>
                  <button onClick={handleStripeConnect} disabled={stripeLoading} style={{background:T.gold,border:"none",borderRadius:7,padding:"10px 20px",fontFamily:FONT_BODY,fontSize:13,fontWeight:700,color:T.ink,cursor:"pointer",width:"100%",opacity:stripeLoading?0.6:1}}>
                    {stripeLoading?"Connecting…":"Connect Stripe →"}
                  </button>
                </div>
              )}

              {/* Recent messages — from real threads */}
              <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,overflow:"hidden"}}>
                <div style={{background:T.void,padding:"14px 20px",borderBottom:`1px solid ${T.wire}`,display:"flex",justifyContent:"space-between"}}>
                  <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em"}}>Recent Messages</div>
                  <div onClick={()=>setTab("Messages")} style={{fontFamily:FONT_BODY,fontSize:12,color:T.gold,cursor:"pointer",fontWeight:600}}>View all →</div>
                </div>
                {threads.length > 0 ? (
                  <div style={{display:"grid",gridTemplateColumns:"1fr",gap:0}}>
                    {threads.slice(0,3).map((t,i)=>{
                      const msgs=(t.messages||[]).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
                      const lastMsg=msgs[0];
                      const hasUnread=msgs.some(m=>m.sender_id!==currentUserId&&!m.read_at);
                      const timeAgo = lastMsg ? (() => {
                        const diff = Date.now() - new Date(lastMsg.created_at).getTime();
                        const mins = Math.floor(diff/60000);
                        if (mins < 60) return `${mins}m ago`;
                        const hrs = Math.floor(mins/60);
                        if (hrs < 24) return `${hrs}h ago`;
                        return `${Math.floor(hrs/24)}d ago`;
                      })() : "";
                      return (
                        <div key={t.id} onClick={()=>{setTab("Messages");openThread(t);}} style={{padding:"14px 16px",borderBottom:i<Math.min(threads.length,3)-1?`1px solid ${T.wire}`:"none",cursor:"pointer",background:hasUnread?T.lifted:T.steel}}
                          onMouseEnter={e=>e.currentTarget.style.background=T.lifted}
                          onMouseLeave={e=>e.currentTarget.style.background=hasUnread?T.lifted:T.steel}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                            <div style={{fontFamily:FONT_BODY,fontSize:13,fontWeight:hasUnread?700:500,color:T.parchment}}>Client</div>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <div style={{fontFamily:FONT_BODY,fontSize:11,color:T.muted}}>{timeAgo}</div>
                              {hasUnread&&<div style={{width:7,height:7,borderRadius:"50%",background:T.gold}}/>}
                            </div>
                          </div>
                          <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lastMsg?.body||"No messages"}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{padding:"24px 20px",textAlign:"center",fontFamily:FONT_BODY,fontSize:13,color:T.muted}}>No messages yet. Client messages will appear here.</div>
                )}
              </div>
            </div>
          )}

          {/* ── BOOKINGS ── */}
          {tab==="Bookings" && (
            <div>
              <div style={{display:"flex",gap:8,marginBottom:24}}>
                {[["all","All"],["pending","Pending"],["confirmed","Confirmed"],["completed","Completed"]].map(([val,label])=>(
                  <button key={val} onClick={()=>setBookingFilter(val)} style={{
                    background:bookingFilter===val?T.goldGlow:T.steel,
                    border:`1px solid ${bookingFilter===val?T.gold:T.wire}`,
                    borderRadius:20,padding:"6px 16px",
                    fontFamily:FONT_BODY,fontSize:12,fontWeight:bookingFilter===val?700:400,
                    color:bookingFilter===val?T.gold:T.silver,cursor:"pointer",
                  }}>{label}</button>
                ))}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {filteredBookings.map(b=>(
                  <div key={b.id} onClick={()=>setActiveBooking(b)} style={{
                    background:T.steel,border:`1px solid ${T.wire}`,
                    borderLeft:`3px solid ${b.status==="pending"?T.gold:b.status==="confirmed"?T.blue:T.green}`,
                    borderRadius:8,padding:"18px 22px",cursor:"pointer",
                    display:"grid",gridTemplateColumns:"1fr auto",gap:20,alignItems:"center",
                  }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.lifted}
                  onMouseLeave={e=>e.currentTarget.style.background=T.steel}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                        <StatusPill status={b.status}/>
                        <span style={{fontFamily:FONT_BODY,fontSize:12,color:T.muted}}>{b.createdAt}</span>
                      </div>
                      <div style={{fontFamily:FONT_DISPLAY,fontSize:22,color:T.white,fontWeight:400,marginBottom:4}}>{b.package}</div>
                      <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.silver}}>{b.guest} · {b.guests} client{b.guests!==1?"s":""} · {b.date}</div>
                      {b.message&&<div style={{fontFamily:FONT_BODY,fontSize:12,color:T.ash,marginTop:8,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:500}}>"{b.message}"</div>}
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontFamily:FONT_DISPLAY,fontSize:26,color:T.gold,fontWeight:400}}>${b.total}</div>
                      <div style={{fontFamily:FONT_BODY,fontSize:11,color:T.silver,marginTop:2}}>Deposit: ${b.deposit}</div>
                      <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver,marginTop:8}}>View →</div>
                    </div>
                  </div>
                ))}
                {filteredBookings.length===0&&(
                  <div style={{textAlign:"center",padding:"64px",background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8}}>
                    <div style={{fontFamily:FONT_DISPLAY,fontSize:28,color:T.silver,fontWeight:300}}>No bookings here</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CALENDAR ── */}
          {tab==="Calendar" && (() => {
            // Build employee color map for booked dates
            const empMap = {};
            employees.forEach(e => { empMap[e.id] = e; });
            const dateBookings = {};
            bookings.filter(b=>b.status==="confirmed"||b.status==="pending").forEach(b=>{
              const d = b.date ? String(b.date).slice(0,10) : null;
              if(d) { if(!dateBookings[d]) dateBookings[d]=[]; dateBookings[d].push(b); }
            });
            const upcomingBookings = bookings.filter(b=>b.status==="confirmed").sort((a,b)=>new Date(a.date)-new Date(b.date));
            return (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:"20px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <div style={{fontFamily:FONT_DISPLAY,fontSize:22,color:T.white}}>{MONTHS[calMonth]} {calYear}</div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>{if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);}} style={{background:T.lifted,border:`1px solid ${T.wire}`,borderRadius:4,color:T.ash,padding:"6px 12px",cursor:"pointer",fontSize:13}}>←</button>
                    <button onClick={()=>{if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);}} style={{background:T.lifted,border:`1px solid ${T.wire}`,borderRadius:4,color:T.ash,padding:"6px 12px",cursor:"pointer",fontSize:13}}>→</button>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:6}}>
                  {["S","M","T","W","T","F","S"].map((d,i)=><div key={i} style={{textAlign:"center",fontFamily:FONT_BODY,fontSize:10,fontWeight:700,color:T.muted,padding:"4px 0"}}>{d}</div>)}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
                  {calCells.map((day,i)=>{
                    if(!day) return <div key={i}/>;
                    const fullDate=`${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                    const dayBookings=dateBookings[fullDate]||[];
                    const isBooked=dayBookings.length>0;
                    const isBlocked=blockedDates.includes(fullDate);
                    const today=new Date(); today.setHours(0,0,0,0);
                    const isPast=new Date(fullDate+"T12:00:00")<today;
                    const isToday=fullDate===`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
                    return (
                      <div key={i} onClick={()=>!isBooked&&!isPast&&toggleBlockDate(fullDate)} style={{
                        padding:"8px 2px",textAlign:"center",position:"relative",
                        fontFamily:FONT_BODY,fontSize:13,fontWeight:isToday?700:400,
                        background:isBooked?"#1a3a5a":isBlocked?T.lifted:"transparent",
                        color:isPast?T.rim:isToday?T.gold:isBooked?"#aac8f0":isBlocked?T.muted:T.ash,
                        borderRadius:5,cursor:isPast||isBooked?"default":"pointer",
                        border:`1px solid ${isToday?T.gold:isBooked?"#2a4a7a":isBlocked?T.wire:"transparent"}`,
                        opacity:isPast?0.3:1,minHeight:38,
                      }}>
                        {day}
                        {/* Employee color dots for booked dates */}
                        {isBooked && dayBookings.length>0 && (
                          <div style={{display:"flex",justifyContent:"center",gap:2,marginTop:3}}>
                            {dayBookings.slice(0,3).map((b,bi)=>{
                              const emp=b.assigned_employee_id?empMap[b.assigned_employee_id]:null;
                              return <div key={bi} style={{width:5,height:5,borderRadius:"50%",background:emp?.color||T.gold}}/>;
                            })}
                            {dayBookings.length>3&&<div style={{fontFamily:FONT_BODY,fontSize:8,color:"#aac8f0"}}>+{dayBookings.length-3}</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Calendar Key + Employee Legend */}
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                {[["#1a3a5a","Booked"],["#272c31","Blocked"],[T.gold,"Today"]].map(([bg,label])=>(
                  <div key={label} style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:10,height:10,borderRadius:2,background:bg,border:`1px solid ${T.wire}`}}/>
                    <span style={{fontFamily:FONT_BODY,fontSize:11,color:T.silver}}>{label}</span>
                  </div>
                ))}
                {businessType==="outfitter"&&employees.filter(e=>e.status==="active"||e.status==="invited").map(emp=>(
                  <div key={emp.id} style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:emp.color}}/>
                    <span style={{fontFamily:FONT_BODY,fontSize:11,color:T.silver}}>{emp.display_name}</span>
                  </div>
                ))}
              </div>

              {/* This Month Stats */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:"14px 16px",textAlign:"center"}}>
                  <div style={{fontFamily:FONT_DISPLAY,fontSize:24,color:T.white}}>{bookedDates.length}</div>
                  <div style={{fontFamily:FONT_BODY,fontSize:11,color:T.silver}}>Trips booked</div>
                </div>
                <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:"14px 16px",textAlign:"center"}}>
                  <div style={{fontFamily:FONT_DISPLAY,fontSize:24,color:T.white}}>{blockedDates.length}</div>
                  <div style={{fontFamily:FONT_BODY,fontSize:11,color:T.silver}}>Days blocked</div>
                </div>
              </div>

              {/* Upcoming Trips */}
              <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,overflow:"hidden"}}>
                <div style={{background:T.void,padding:"12px 16px",borderBottom:`1px solid ${T.wire}`}}>
                  <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em"}}>Upcoming Trips</div>
                </div>
                <div style={{padding:"8px 12px"}}>
                  {upcomingBookings.length===0&&<div style={{padding:"16px 0",textAlign:"center",fontFamily:FONT_BODY,fontSize:13,color:T.muted}}>No upcoming trips</div>}
                  {upcomingBookings.slice(0,8).map(b=>{
                    const emp=b.assigned_employee_id?empMap[b.assigned_employee_id]:null;
                    return (
                      <div key={b.id} onClick={()=>setActiveBooking(b)} style={{padding:"10px 6px",borderBottom:`1px solid ${T.rim}`,cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
                        {emp&&<div style={{width:8,height:8,borderRadius:"50%",background:emp.color,flexShrink:0}}/>}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.parchment,fontWeight:600}}>{b.date}{emp?` · ${emp.display_name}`:""}</div>
                          <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver}}>{b.guest} · {b.package}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            );
          })()}

          {/* ── PACKAGES ── */}
          {tab==="Packages" && (
            <div style={{maxWidth:800}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
                <div style={{fontFamily:FONT_DISPLAY,fontSize:32,color:T.white,fontWeight:400}}>Your Packages</div>
                <GoldBtn onClick={()=>setEditingPkg({title:"",duration:"",price:"",priceType:"person",description:""})}>+ Add Package</GoldBtn>
              </div>

              {/* Package Editor Form */}
              {editingPkg && (
                <div style={{background:T.steel,border:`2px solid ${T.gold}`,borderRadius:10,padding:24,marginBottom:20}}>
                  <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:16}}>
                    {editingPkg.id ? "Edit Package" : "New Package"}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:14}}>
                    <div>
                      <label style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver,display:"block",marginBottom:4}}>Title *</label>
                      <input value={editingPkg.title||""} onChange={e=>setEditingPkg({...editingPkg,title:e.target.value})} placeholder="e.g. Full Day Wade Trip"
                        style={{width:"100%",background:T.lifted,border:`1px solid ${T.wire}`,borderRadius:6,padding:"10px 14px",fontFamily:FONT_BODY,fontSize:14,color:T.parchment,outline:"none"}}/>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:12}}>
                      <div>
                        <label style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver,display:"block",marginBottom:4}}>Price *</label>
                        <input type="number" value={editingPkg.price||""} onChange={e=>setEditingPkg({...editingPkg,price:e.target.value})} placeholder="300"
                          style={{width:"100%",background:T.lifted,border:`1px solid ${T.wire}`,borderRadius:6,padding:"10px 14px",fontFamily:FONT_BODY,fontSize:14,color:T.parchment,outline:"none"}}/>
                      </div>
                      <div>
                        <label style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver,display:"block",marginBottom:4}}>Price Type</label>
                        <select value={editingPkg.priceType||"person"} onChange={e=>setEditingPkg({...editingPkg,priceType:e.target.value})}
                          style={{width:"100%",background:T.lifted,border:`1px solid ${T.wire}`,borderRadius:6,padding:"10px 14px",fontFamily:FONT_BODY,fontSize:14,color:T.parchment,outline:"none"}}>
                          <option value="person">Per person</option>
                          <option value="flat">Flat rate</option>
                          <option value="day">Per day</option>
                        </select>
                      </div>
                      <div>
                        <label style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver,display:"block",marginBottom:4}}>Duration</label>
                        <input value={editingPkg.duration||""} onChange={e=>setEditingPkg({...editingPkg,duration:e.target.value})} placeholder="e.g. 8 hours"
                          style={{width:"100%",background:T.lifted,border:`1px solid ${T.wire}`,borderRadius:6,padding:"10px 14px",fontFamily:FONT_BODY,fontSize:14,color:T.parchment,outline:"none"}}/>
                      </div>
                    </div>
                    <div>
                      <label style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver,display:"block",marginBottom:4}}>Description</label>
                      <textarea value={editingPkg.description||""} onChange={e=>setEditingPkg({...editingPkg,description:e.target.value})} rows={3} placeholder="What's included, what guests should bring…"
                        style={{width:"100%",background:T.lifted,border:`1px solid ${T.wire}`,borderRadius:6,padding:"10px 14px",fontFamily:FONT_BODY,fontSize:14,color:T.parchment,outline:"none",resize:"vertical"}}/>
                    </div>
                    <div style={{display:"flex",gap:10}}>
                      <GoldBtn small disabled={pkgSaving||!editingPkg.title||!editingPkg.price} onClick={async()=>{
                        setPkgSaving(true);
                        try{
                          if(editingPkg.id){
                            const res=await fetch("/api/packages",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:editingPkg.id,title:editingPkg.title,duration:editingPkg.duration,price:editingPkg.price,priceType:editingPkg.priceType,description:editingPkg.description})});
                            const data=await res.json();
                            if(data.package) setPackages(ps=>ps.map(p=>p.id===data.package.id?{...p,title:data.package.title,duration:data.package.duration,price:data.package.price,priceType:data.package.price_type,description:data.package.description}:p));
                          }else{
                            const res=await fetch("/api/packages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({guideId,title:editingPkg.title,duration:editingPkg.duration,price:editingPkg.price,priceType:editingPkg.priceType,description:editingPkg.description})});
                            const data=await res.json();
                            if(data.package) setPackages(ps=>[...ps,{id:data.package.id,title:data.package.title,duration:data.package.duration,price:data.package.price,priceType:data.package.price_type,active:true,bookingsCount:0,rating:0,description:data.package.description}]);
                          }
                          setEditingPkg(null);
                        }catch(e){console.error("Save package error:",e);}
                        setPkgSaving(false);
                      }}>{pkgSaving?"Saving…":editingPkg.id?"Save Changes":"Create Package"}</GoldBtn>
                      <GoldBtn small outline onClick={()=>setEditingPkg(null)}>Cancel</GoldBtn>
                    </div>
                  </div>
                </div>
              )}

              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {packages.map(p=>(
                  <div key={p.id} style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:"20px 24px",display:"grid",gridTemplateColumns:"1fr auto",gap:20,alignItems:"center"}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                        <div style={{fontFamily:FONT_DISPLAY,fontSize:22,color:T.white,fontWeight:400}}>{p.title}</div>
                        <span style={{fontFamily:FONT_BODY,fontSize:10,fontWeight:700,color:p.active?"#6aaa84":"#aa7a7a",background:p.active?T.greenGlow:T.redGlow,border:`1px solid ${p.active?T.green:T.red}`,borderRadius:3,padding:"2px 8px"}}>{p.active?"ACTIVE":"INACTIVE"}</span>
                      </div>
                      <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.silver,marginBottom:4}}>{p.duration} · ${p.price} {p.priceType==="person"?"per person":"flat rate"}</div>
                      {p.description&&<div style={{fontFamily:FONT_BODY,fontSize:12,color:T.ash,marginBottom:8,lineHeight:1.5}}>{p.description.slice(0,120)}{p.description.length>120?"…":""}</div>}
                      <div style={{display:"flex",gap:16}}>
                        <span style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver}}>{p.bookingsCount||0} bookings</span>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <GoldBtn small outline onClick={()=>setEditingPkg({id:p.id,title:p.title,duration:p.duration,price:p.price,priceType:p.priceType,description:p.description||""})}>Edit</GoldBtn>
                      <button onClick={async()=>{
                        const newActive=!p.active;
                        try{await fetch("/api/packages",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:p.id,active:newActive})});}catch(e){console.error(e);}
                        setPackages(ps=>ps.map(pkg=>pkg.id===p.id?{...pkg,active:newActive}:pkg));
                      }}
                        style={{background:T.lifted,border:`1px solid ${T.wire}`,borderRadius:5,padding:"7px 12px",fontFamily:FONT_BODY,fontSize:12,color:T.silver,cursor:"pointer"}}>
                        {p.active?"Pause":"Activate"}
                      </button>
                    </div>
                  </div>
                ))}
                {packages.length===0&&(
                  <div style={{textAlign:"center",padding:"48px",background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8}}>
                    <div style={{fontFamily:FONT_DISPLAY,fontSize:28,color:T.silver,fontWeight:300,marginBottom:8}}>No packages yet</div>
                    <div style={{fontFamily:FONT_BODY,fontSize:14,color:T.muted,marginBottom:20}}>Create your first package to start accepting bookings.</div>
                    <GoldBtn onClick={()=>setEditingPkg({title:"",duration:"",price:"",priceType:"person",description:""})}>+ Create Package</GoldBtn>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── MESSAGES ── */}
          {tab==="Messages" && (
            <div style={{maxWidth:800}}>
              {activeThread ? (
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
                    <button onClick={()=>setActiveThread(null)} style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:6,color:T.ash,padding:"8px 14px",cursor:"pointer",fontFamily:FONT_BODY,fontSize:13}}>← Back</button>
                    <div style={{fontFamily:FONT_DISPLAY,fontSize:24,color:T.white,fontWeight:400}}>Conversation</div>
                  </div>
                  <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:24,marginBottom:16,minHeight:320,maxHeight:480,overflowY:"auto",display:"flex",flexDirection:"column",gap:12}}>
                    {threadMessages.length===0 && <div style={{textAlign:"center",padding:40,fontFamily:FONT_BODY,fontSize:14,color:T.muted}}>No messages yet</div>}
                    {threadMessages.map(msg=>{
                      const isMe=msg.sender_id===currentUserId;
                      return(
                        <div key={msg.id} style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start"}}>
                          <div style={{maxWidth:"72%",background:isMe?T.goldGlow:T.lifted,border:`1px solid ${isMe?T.gold:T.wire}`,borderRadius:isMe?"12px 12px 2px 12px":"12px 12px 12px 2px",padding:"10px 14px"}}>
                            <div style={{fontFamily:FONT_BODY,fontSize:14,color:isMe?T.gold:T.parchment,lineHeight:1.6}}>{msg.body}</div>
                          </div>
                          <div style={{fontFamily:FONT_BODY,fontSize:11,color:T.muted,marginTop:4}}>{isMe?"You":"Client"} · {new Date(msg.created_at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{display:"flex",gap:10}}>
                    <textarea value={replyBody} onChange={e=>setReplyBody(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendReply();}}} rows={3} placeholder="Type a message… (Enter to send)" style={{flex:1,background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:"12px 14px",fontFamily:FONT_BODY,fontSize:14,color:T.parchment,outline:"none",resize:"none"}}/>
                    <button onClick={sendReply} disabled={sendingMsg||!replyBody.trim()} style={{background:T.gold,border:"none",borderRadius:8,padding:"0 20px",fontFamily:FONT_BODY,fontSize:14,fontWeight:700,color:T.ink,cursor:"pointer",opacity:sendingMsg||!replyBody.trim()?0.5:1}}>Send</button>
                  </div>
                </div>
              ):(
                <div>
                  <div style={{fontFamily:FONT_DISPLAY,fontSize:32,color:T.white,fontWeight:400,marginBottom:24}}>Messages</div>
                  {threads.length===0?(
                    <div style={{textAlign:"center",padding:"64px",background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8}}>
                      <div style={{fontFamily:FONT_DISPLAY,fontSize:28,color:T.silver,fontWeight:300}}>No messages yet</div>
                      <div style={{fontFamily:FONT_BODY,fontSize:14,color:T.muted,marginTop:8}}>Messages from clients will appear here</div>
                    </div>
                  ):(
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {threads.map(t=>{
                        const msgs=(t.messages||[]).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
                        const lastMsg=msgs[0];
                        const hasUnread=msgs.some(m=>m.sender_id!==currentUserId&&!m.read_at);
                        return(
                          <div key={t.id} onClick={()=>openThread(t)} style={{background:hasUnread?T.lifted:T.steel,border:`1px solid ${T.wire}`,borderLeft:`3px solid ${hasUnread?T.gold:"transparent"}`,borderRadius:8,padding:"18px 20px",cursor:"pointer",display:"flex",gap:16,alignItems:"center"}}
                            onMouseEnter={e=>e.currentTarget.style.background=T.lifted}
                            onMouseLeave={e=>e.currentTarget.style.background=hasUnread?T.lifted:T.steel}>
                            <div style={{width:44,height:44,borderRadius:"50%",background:T.gunmetal,border:`2px solid ${hasUnread?T.gold:T.wire}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_DISPLAY,fontSize:18,color:hasUnread?T.gold:T.silver,flexShrink:0}}>C</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                                <div style={{fontFamily:FONT_BODY,fontSize:14,fontWeight:hasUnread?700:500,color:T.parchment}}>Client</div>
                                <div style={{fontFamily:FONT_BODY,fontSize:11,color:T.muted}}>{lastMsg?new Date(lastMsg.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"}):""}</div>
                              </div>
                              {t.booking_id&&<div style={{fontFamily:FONT_BODY,fontSize:11,color:T.gold,marginBottom:4,fontWeight:600}}>Linked to booking</div>}
                              <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.silver,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lastMsg?.body||"No messages yet"}</div>
                            </div>
                            {hasUnread&&<div style={{width:8,height:8,borderRadius:"50%",background:T.gold,flexShrink:0}}/>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}


          {/* ── EARNINGS ── */}
          {tab==="Earnings" && (() => {
            // Compute real stats
            const allTimeEarnings = bookings.filter(b=>b.status==="completed"||b.status==="confirmed"||b.status==="deposit_paid").reduce((s,b)=>s+(parseFloat(b.total)||0),0);
            const avgPerTrip = stats.tripsAllTime > 0 ? Math.round(allTimeEarnings / stats.tripsAllTime) : 0;

            // Revenue Forecast — next 3 months from confirmed bookings
            const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            const forecastMonths = [];
            const today = new Date();
            for (let i = 0; i < 3; i++) {
              const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
              const nextM = new Date(today.getFullYear(), today.getMonth() + i + 1, 0);
              const confirmedInMonth = bookings.filter(b => {
                if (b.status !== "confirmed" && b.status !== "deposit_paid") return false;
                const bd = b.rawDate || b.date;
                const bdt = new Date(typeof bd === "string" && bd.includes(",") ? bd : bd + "T12:00:00");
                return bdt.getMonth() === d.getMonth() && bdt.getFullYear() === d.getFullYear() && bdt >= today;
              });
              const pendingInMonth = bookings.filter(b => {
                if (b.status !== "pending") return false;
                const bd = b.rawDate || b.date;
                const bdt = new Date(typeof bd === "string" && bd.includes(",") ? bd : bd + "T12:00:00");
                return bdt.getMonth() === d.getMonth() && bdt.getFullYear() === d.getFullYear();
              });
              forecastMonths.push({
                label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
                confirmed: confirmedInMonth.reduce((s,b) => s + (parseFloat(b.total)||0), 0),
                confirmedCount: confirmedInMonth.length,
                pending: pendingInMonth.reduce((s,b) => s + (parseFloat(b.total)||0), 0),
                pendingCount: pendingInMonth.length,
              });
            }
            const totalForecast = forecastMonths.reduce((s,m) => s + m.confirmed, 0);
            const totalPending = forecastMonths.reduce((s,m) => s + m.pending, 0);
            const maxForecast = Math.max(...forecastMonths.map(m => m.confirmed + m.pending), 1);

            return (
            <div style={{maxWidth:900}}>
              <div style={{fontFamily:FONT_DISPLAY,fontSize:32,color:T.white,fontWeight:400,marginBottom:28}}>Earnings</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:16,marginBottom:28}}>
                {[
                  ["This month",`$${stats.earningsThisMonth.toLocaleString()}`,`${stats.tripsThisMonth} trips`],
                  ["Last month",`$${stats.earningsLastMonth.toLocaleString()}`,`${stats.earningsThisMonth-stats.earningsLastMonth>=0?"+":"-"}$${Math.abs(stats.earningsThisMonth-stats.earningsLastMonth)} vs this month`],
                  ["All time",`$${allTimeEarnings.toLocaleString()}`,`${stats.tripsAllTime} trips`],
                  ["Avg per trip",`$${avgPerTrip.toLocaleString()}`,"Based on completed trips"],
                ].map(([label,val,sub])=>(
                  <div key={label} style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:"20px 22px"}}>
                    <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>{label}</div>
                    <div style={{fontFamily:FONT_DISPLAY,fontSize:32,color:T.white,fontWeight:300,lineHeight:1,marginBottom:6}}>{val}</div>
                    <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver}}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* Historical Earnings Chart */}
              <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:28,marginBottom:24}}>
                <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:20}}>Monthly Earnings — Last 7 Months</div>
                <EarningsChart data={earningsMonthly}/>
              </div>

              {/* Revenue Forecast */}
              <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:28,marginBottom:24}}>
                <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Revenue Forecast — Next 90 Days</div>
                <div style={{display:"flex",gap:16,marginBottom:24}}>
                  <div>
                    <span style={{fontFamily:FONT_DISPLAY,fontSize:28,color:T.gold}}>${totalForecast.toLocaleString()}</span>
                    <span style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver,marginLeft:8}}>confirmed</span>
                  </div>
                  {totalPending > 0 && (
                    <div>
                      <span style={{fontFamily:FONT_DISPLAY,fontSize:28,color:T.ash}}>+${totalPending.toLocaleString()}</span>
                      <span style={{fontFamily:FONT_BODY,fontSize:12,color:T.muted,marginLeft:8}}>pending</span>
                    </div>
                  )}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
                  {forecastMonths.map(m=>(
                    <div key={m.label} style={{background:T.lifted,border:`1px solid ${T.wire}`,borderRadius:8,padding:"16px 18px"}}>
                      <div style={{fontFamily:FONT_BODY,fontSize:12,fontWeight:700,color:T.silver,marginBottom:12}}>{m.label}</div>
                      {/* Mini bar */}
                      <div style={{height:8,background:T.rim,borderRadius:4,marginBottom:12,overflow:"hidden",display:"flex"}}>
                        <div style={{height:"100%",width:`${(m.confirmed/maxForecast)*100}%`,background:T.gold,borderRadius:4}}/>
                        {m.pending>0&&<div style={{height:"100%",width:`${(m.pending/maxForecast)*100}%`,background:"rgba(193,163,98,0.3)"}}/>}
                      </div>
                      <div style={{fontFamily:FONT_DISPLAY,fontSize:24,color:T.white,marginBottom:4}}>${m.confirmed.toLocaleString()}</div>
                      <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver}}>{m.confirmedCount} confirmed trip{m.confirmedCount!==1?"s":""}</div>
                      {m.pendingCount>0&&<div style={{fontFamily:FONT_BODY,fontSize:11,color:T.muted,marginTop:4}}>+${m.pending.toLocaleString()} pending ({m.pendingCount})</div>}
                    </div>
                  ))}
                </div>
              </div>

              <SectionCard title="Payout Schedule">
                <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.ash,lineHeight:1.7,marginBottom:16}}>Earnings are paid out within 2 business days of trip completion via Stripe. The 25% deposit is held by RŌM and released to you after the trip occurs. The balance is auto-charged to the guest 14 days before the trip date and released to you on trip day.</div>
                <GoldBtn small outline onClick={()=>window.open("https://dashboard.stripe.com","_blank")}>View Stripe Dashboard →</GoldBtn>
              </SectionCard>
            </div>
            );
          })()}

          {/* ── FINANCES ── */}
          {tab==="Finances" && (
            <FeatureGate tier={guide?.subscription_tier} feature="Finances">
              <FinancesTab guide={{...guide, id: guideId}} />
            </FeatureGate>
          )}

          {/* ── MARKETING ── */}
          {tab==="Marketing" && (
            <FeatureGate tier={guide?.subscription_tier} feature="Marketing">
              <MarketingTab guide={{...guide, id: guideId}} contentQueue={contentQueue} />
            </FeatureGate>
          )}

          {/* ── ANALYTICS ── */}
          {tab==="Analytics" && (
            <FeatureGate tier={guide?.subscription_tier} feature="Analytics">
              <AnalyticsTab guide={{...guide, id: guideId}} />
            </FeatureGate>
          )}

          {/* ── GUESTS CRM ── */}
          {tab==="Guests" && (
            <FeatureGate tier={guide?.subscription_tier} feature="Guests">
              <GuestCRMTab guideId={guideId} />
            </FeatureGate>
          )}

          {/* ── LICENSES ── */}
          {tab==="Licenses" && (
            <FeatureGate tier={guide?.subscription_tier} feature="Licenses">
              <LicensesTab guideId={guideId} />
            </FeatureGate>
          )}

          {/* ── TEAM ── */}
          {tab==="Team" && (
            <div style={{maxWidth:700}}>
              {/* Business Type Toggle */}
              <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:20,marginBottom:16}}>
                <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:14}}>Business Type</div>
                <div style={{display:"flex",gap:10}}>
                  {[["solo","Solo Guide","Just you"],["outfitter","Outfitter / Team","Multiple guides under one business"]].map(([val,label,desc])=>(
                    <button key={val} onClick={async()=>{
                      setBusinessType(val);
                      const supabase=getSupabase();
                      await supabase.from("guides").update({business_type:val}).eq("id",guideId);
                    }} style={{flex:1,background:businessType===val?T.goldGlow:T.carbon,border:`1.5px solid ${businessType===val?T.gold:T.wire}`,borderRadius:8,padding:"14px 16px",cursor:"pointer",textAlign:"left"}}>
                      <div style={{fontFamily:FONT_BODY,fontSize:14,fontWeight:700,color:businessType===val?T.gold:T.parchment,marginBottom:2}}>{label}</div>
                      <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver}}>{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Working Days */}
              <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:20,marginBottom:16}}>
                <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:14}}>Working Days</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {[["Sun",0],["Mon",1],["Tue",2],["Wed",3],["Thu",4],["Fri",5],["Sat",6]].map(([label,day])=>{
                    const active=workingDays.includes(day);
                    return (
                      <button key={day} onClick={async()=>{
                        const updated=active?workingDays.filter(d=>d!==day):[...workingDays,day];
                        setWorkingDays(updated);
                        const supabase=getSupabase();
                        await supabase.from("guides").update({working_days:updated}).eq("id",guideId);
                      }} style={{width:44,height:44,borderRadius:8,background:active?T.goldGlow:T.carbon,border:`1.5px solid ${active?T.gold:T.wire}`,fontFamily:FONT_BODY,fontSize:12,fontWeight:700,color:active?T.gold:T.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Concurrent Bookings */}
              {businessType==="outfitter" && (
                <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:20,marginBottom:16}}>
                  <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:14}}>Max Concurrent Trips</div>
                  <div style={{display:"flex",alignItems:"center",gap:16}}>
                    <button onClick={async()=>{
                      const v=Math.max(1,maxConcurrent-1);setMaxConcurrent(v);
                      const supabase=getSupabase();await supabase.from("guides").update({max_concurrent_bookings:v}).eq("id",guideId);
                    }} style={{width:36,height:36,borderRadius:8,background:T.carbon,border:`1px solid ${T.wire}`,color:T.parchment,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                    <div style={{fontFamily:FONT_DISPLAY,fontSize:32,color:T.white,minWidth:40,textAlign:"center"}}>{maxConcurrent}</div>
                    <button onClick={async()=>{
                      const v=maxConcurrent+1;setMaxConcurrent(v);
                      const supabase=getSupabase();await supabase.from("guides").update({max_concurrent_bookings:v}).eq("id",guideId);
                    }} style={{width:36,height:36,borderRadius:8,background:T.carbon,border:`1px solid ${T.wire}`,color:T.parchment,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                  </div>
                  <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver,marginTop:8}}>How many trips your team can run at the same time.</div>
                </div>
              )}

              {/* Employee Management — only for outfitters */}
              {businessType==="outfitter" && (
                <>
                  {/* Invite Form */}
                  <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:20,marginBottom:16}}>
                    <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:14}}>Invite Team Member</div>
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      <input value={inviteName} onChange={e=>setInviteName(e.target.value)} placeholder="Full name" style={{background:T.carbon,border:`1px solid ${T.wire}`,borderRadius:6,padding:"10px 14px",fontFamily:FONT_BODY,fontSize:14,color:T.parchment,outline:"none"}}/>
                      <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="Email address" type="email" style={{background:T.carbon,border:`1px solid ${T.wire}`,borderRadius:6,padding:"10px 14px",fontFamily:FONT_BODY,fontSize:14,color:T.parchment,outline:"none"}}/>
                      <select value={inviteRole} onChange={e=>setInviteRole(e.target.value)} style={{background:T.carbon,border:`1px solid ${T.wire}`,borderRadius:6,padding:"10px 14px",fontFamily:FONT_BODY,fontSize:14,color:T.parchment,outline:"none"}}>
                        <option value="guide">Guide</option>
                        <option value="admin">Admin (can see financials)</option>
                        <option value="assistant">Assistant (view only)</option>
                      </select>
                      {inviteError&&<div style={{fontFamily:FONT_BODY,fontSize:12,color:"#cc8080"}}>{inviteError}</div>}
                      {inviteSuccess&&<div style={{fontFamily:FONT_BODY,fontSize:12,color:"#6aaa84"}}>{inviteSuccess}</div>}
                      <button disabled={inviting||!inviteName||!inviteEmail} onClick={async()=>{
                        setInviting(true);setInviteError("");setInviteSuccess("");
                        try {
                          const supabase=getSupabase();
                          const perms={bookings:true,messages:true,itineraries:true,calendar:true,financials:inviteRole==="admin",marketing:inviteRole==="admin",analytics:inviteRole==="admin",guests:inviteRole!=="assistant"};
                          const colors=["#C9A55C","#5C8AC9","#6AAA84","#CC8080","#9B7DCF","#D4955A","#5CC9B8"];
                          const color=colors[employees.length%colors.length];
                          const {data:emp,error}=await supabase.from("guide_employees").insert({guide_id:guideId,user_id:"00000000-0000-0000-0000-000000000000",display_name:inviteName,email:inviteEmail,role:inviteRole,permissions:perms,color,status:"invited"}).select().single();
                          if(error){setInviteError(error.message);}
                          else{setEmployees(prev=>[...prev,emp]);setInviteName("");setInviteEmail("");setInviteSuccess(`Invited ${inviteName}`);}
                        }catch(e){setInviteError("Failed to invite");}
                        setInviting(false);
                      }} style={{background:T.gold,border:"none",borderRadius:7,padding:"10px 20px",fontFamily:FONT_BODY,fontSize:14,fontWeight:700,color:T.ink,cursor:"pointer",opacity:inviting||!inviteName||!inviteEmail?0.5:1}}>
                        {inviting?"Inviting...":"Send Invite"}
                      </button>
                    </div>
                  </div>

                  {/* Employee List */}
                  {employees.length>0 && (
                    <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,overflow:"hidden"}}>
                      <div style={{background:T.void,padding:"14px 20px",borderBottom:`1px solid ${T.wire}`}}>
                        <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em"}}>Your Team ({employees.length})</div>
                      </div>
                      {employees.map((emp,i)=>(
                        <div key={emp.id} style={{padding:"14px 20px",borderBottom:i<employees.length-1?`1px solid ${T.rim}`:"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div style={{display:"flex",alignItems:"center",gap:12}}>
                            <div style={{width:36,height:36,borderRadius:"50%",background:emp.color||T.gold,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_DISPLAY,fontSize:16,color:T.ink,fontWeight:500}}>
                              {emp.display_name?.[0]?.toUpperCase()||"?"}
                            </div>
                            <div>
                              <div style={{fontFamily:FONT_BODY,fontSize:14,fontWeight:600,color:T.parchment}}>{emp.display_name}</div>
                              <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver}}>{emp.email}</div>
                            </div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <span style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:emp.status==="active"?T.green:T.gold,background:emp.status==="active"?"rgba(106,170,132,0.1)":T.goldGlow,borderRadius:4,padding:"3px 8px",textTransform:"uppercase"}}>{emp.status}</span>
                            <span style={{fontFamily:FONT_BODY,fontSize:11,color:T.silver,background:T.carbon,borderRadius:4,padding:"3px 8px"}}>{emp.role}</span>
                            <button onClick={async()=>{
                              const supabase=getSupabase();
                              const newStatus=emp.status==="active"?"inactive":"active";
                              await supabase.from("guide_employees").update({status:newStatus}).eq("id",emp.id);
                              setEmployees(prev=>prev.map(e=>e.id===emp.id?{...e,status:newStatus}:e));
                            }} style={{background:"none",border:`1px solid ${T.wire}`,borderRadius:5,padding:"4px 10px",fontFamily:FONT_BODY,fontSize:11,color:T.muted,cursor:"pointer"}}>
                              {emp.status==="active"?"Deactivate":"Activate"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── PROFILE ── */}
          {tab==="Profile" && (
            <div style={{maxWidth:700}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
                <div style={{fontFamily:FONT_DISPLAY,fontSize:32,color:T.white,fontWeight:400}}>Your Profile</div>
                <GoldBtn onClick={()=>alert("Opening profile editor…")}>Edit Profile</GoldBtn>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <SectionCard title="Public Profile">
                  <div style={{display:"flex",gap:20,alignItems:"center",marginBottom:18}}>
                    {/* Profile photo */}
                    <div style={{position:"relative",flexShrink:0}}>
                      {photoUrls.profile ? (
                        <Image src={photoUrls.profile} alt="Profile" width={72} height={72} style={{borderRadius:"50%",objectFit:"cover",border:`2px solid ${T.gold}`}}/>
                      ) : (
                        <div style={{width:72,height:72,borderRadius:"50%",background:T.lifted,border:`2px solid ${T.gold}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_DISPLAY,fontSize:28,color:T.gold}}>{guide.avatar}</div>
                      )}
                      <div onClick={()=>triggerUpload("profile")} style={{position:"absolute",bottom:0,right:0,width:24,height:24,borderRadius:"50%",background:T.gold,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:12}}>
                        {uploadingPhoto==="profile" ? "…" : "✎"}
                      </div>
                    </div>
                    <div>
                      <div style={{fontFamily:FONT_DISPLAY,fontSize:24,color:T.white}}>{guide.name}</div>
                      <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.silver}}>📍 {guide.location} · {guide.category || ""}</div>
                      <div style={{display:"flex",gap:8,marginTop:6}}>
                        {guide.verified&&<span style={{fontFamily:FONT_BODY,fontSize:10,fontWeight:700,color:T.gold,background:T.goldGlow,border:`1px solid ${T.gold}`,borderRadius:3,padding:"2px 8px"}}>✓ VERIFIED</span>}
                        <span style={{fontFamily:FONT_BODY,fontSize:10,fontWeight:700,color:T.ash,background:"rgba(255,255,255,0.06)",border:`1px solid ${T.wire}`,borderRadius:3,padding:"2px 8px"}}>INSURED</span>
                      </div>
                    </div>
                  </div>
                  {[["Rating",`${guide.rating} (${guide.reviewCount} reviews)`],["Response rate",`${guide.responseRate}%`],["Member since",guide.memberSince],["Profile URL",`www.romlife.co/guides/${guide.slug}`]].map(([l,v])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${T.rim}`}}>
                      <span style={{fontFamily:FONT_BODY,fontSize:13,color:T.silver}}>{l}</span>
                      <span style={{fontFamily:FONT_BODY,fontSize:13,color:T.parchment,fontWeight:500}}>{v}</span>
                    </div>
                  ))}
                </SectionCard>

                {/* Cover Photo */}
                <SectionCard title="Cover Photo">
                  <div style={{position:"relative",height:180,borderRadius:8,overflow:"hidden",background:T.lifted,marginBottom:16}}>
                    {photoUrls.cover ? (
                      <Image src={photoUrls.cover} alt="Cover" fill style={{objectFit:"cover"}} sizes="100vw"/>
                    ) : (
                      <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8}}>
                        <div style={{fontSize:32,opacity:0.3}}>🏔</div>
                        <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.muted}}>No cover photo yet</div>
                      </div>
                    )}
                    <div onClick={()=>triggerUpload("cover")} style={{position:"absolute",top:12,right:12,background:"rgba(0,0,0,0.7)",border:`1px solid ${T.wire}`,borderRadius:6,padding:"6px 14px",cursor:"pointer",fontFamily:FONT_BODY,fontSize:12,color:T.ash}}>
                      {uploadingPhoto==="cover" ? "Uploading…" : "Change Cover"}
                    </div>
                  </div>
                  <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.muted}}>Shown at the top of your guide profile. Best size: 1600×600px.</div>
                </SectionCard>

                {/* Gallery */}
                <SectionCard title="Trip Gallery">
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
                    {[0,1,2,3,4,5].map(i=>(
                      <div key={i} onClick={()=>triggerUpload("gallery",i)} style={{aspectRatio:"1",borderRadius:8,overflow:"hidden",background:T.lifted,border:`1px dashed ${T.wire}`,cursor:"pointer",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {photoUrls.gallery[i] ? (
                          <>
                            <Image src={photoUrls.gallery[i]} alt={`Gallery ${i+1}`} fill style={{objectFit:"cover"}} sizes="33vw"/>
                            <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0)",display:"flex",alignItems:"center",justifyContent:"center",opacity:0,transition:"all 0.15s"}}
                              onMouseEnter={e=>{e.currentTarget.style.background="rgba(0,0,0,0.5)";e.currentTarget.style.opacity=1;}}
                              onMouseLeave={e=>{e.currentTarget.style.background="rgba(0,0,0,0)";e.currentTarget.style.opacity=0;}}>
                              <span style={{color:T.white,fontSize:20}}>✎</span>
                            </div>
                          </>
                        ) : (
                          <div style={{textAlign:"center"}}>
                            <div style={{fontSize:24,color:T.wire,marginBottom:4}}>+</div>
                            <div style={{fontFamily:FONT_BODY,fontSize:11,color:T.muted}}>Photo {i+1}</div>
                          </div>
                        )}
                        {uploadingPhoto===`gallery-${i}` && (
                          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_BODY,fontSize:12,color:T.ash}}>Uploading…</div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.muted}}>Add up to 6 photos from your trips. Click any slot to upload or replace.</div>
                  {uploadError && <div style={{fontFamily:FONT_BODY,fontSize:13,color:"#f08080",marginTop:8}}>{uploadError}</div>}
                </SectionCard>
                <SectionCard title="Stripe Payout Account">
                  {(guide.stripeConnected || stripeStatus === "complete") ? (
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontFamily:FONT_BODY,fontSize:13,color:"#6aaa84",fontWeight:700,marginBottom:4}}>✓ Connected</div>
                        <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver}}>Payouts enabled. Funds transfer automatically after trips complete.</div>
                      </div>
                      <GoldBtn small outline onClick={handleStripeConnect}>Manage →</GoldBtn>
                    </div>
                  ) : (
                    <div>
                      <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.ash,marginBottom:16,lineHeight:1.6}}>
                        Connect your bank account to receive payouts. RŌM sends your earnings automatically after each confirmed trip.
                      </div>
                      <div style={{display:"flex",gap:16,alignItems:"center"}}> 
                        <GoldBtn onClick={handleStripeConnect} disabled={stripeLoading}>
                          {stripeLoading ? "Connecting…" : "Set Up Payouts →"}
                        </GoldBtn>
                        <span style={{fontFamily:FONT_BODY,fontSize:12,color:T.muted}}>Powered by Stripe · Takes ~2 minutes</span>
                      </div>
                    </div>
                  )}
                </SectionCard>
              </div>
            </div>
          )}
        </div>
      </div>

      {activeBooking && (
        <BookingPanel booking={activeBooking} onClose={()=>setActiveBooking(null)} onAccept={accept} onDecline={decline} onComplete={completeTrip} onCancel={cancelBooking} employees={employees} guideId={guideId} businessType={businessType} onAssign={(bookingId,empId)=>{setBookings(bs=>bs.map(b=>b.id===bookingId?{...b,assigned_employee_id:empId}:b));setActiveBooking(prev=>prev?{...prev,assigned_employee_id:empId}:null);}}/>
      )}

      {expenseInterview && (
        <ExpenseInterview
          booking={expenseInterview}
          guideId={guideId}
          guideCategories={guide.categories || []}
          onDone={() => setExpenseInterview(null)}
          onSkip={() => setExpenseInterview(null)}
        />
      )}
    </>
  );
}
