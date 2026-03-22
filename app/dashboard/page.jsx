"use client";
import { useState, useEffect, useRef } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const GUEST = {
  name: "Marcus Chen",
  email: "marcus.chen@gmail.com",
  joined: "January 2025",
  avatar: "M",
  tier: "Explorer",
  tierNext: "Pioneer",
  tripsCompleted: 3,
  tripsToNextTier: 2,
  totalSpent: 2340,
  savedGuides: 8,
};

const BOOKINGS = [
  {
    id:"b1", status:"upcoming",
    guide:"James Whitfield", guideSlug:"james-whitfield",
    package:"Full Day Trophy Hunt",
    date:"March 28, 2026", location:"Bozeman, MT", category:"Fly Fishing",
    guests:2, total:1140, deposit:285, balance:855,
    balanceDueDate:"March 14, 2026",
    confirmationCode:"ROM-28847",
    includes:"All gear, flies, waders, riverside lunch, catch photos",
    meetingPoint:"Madison River Bridge Pullout, MT-287, Ennis, MT",
    guidePhone:"+1 (406) 555-0182",
    cancellationPolicy:"Full refund before March 14. No refund after.",
  },
  {
    id:"b2", status:"upcoming",
    guide:"Sasha Okafor", guideSlug:"sasha-okafor",
    package:"Sunset Multipitch — Desert Towers",
    date:"April 12, 2026", location:"Moab, UT", category:"Rock Climbing",
    guests:2, total:900, deposit:225, balance:675,
    balanceDueDate:"March 29, 2026",
    confirmationCode:"ROM-29103",
    includes:"All climbing gear, harness, helmet, safety briefing, lunch",
    meetingPoint:"Moab Gear Exchange parking lot, 471 S Main St",
    guidePhone:"+1 (435) 555-0247",
    cancellationPolicy:"Full refund before March 29. 50% refund after.",
  },
  {
    id:"b3", status:"completed",
    guide:"Tomás Herrera", guideSlug:"tomas-herrera",
    package:"Hawaiian Reef Dive — Half Day",
    date:"January 14, 2026", location:"Kauai, HI", category:"Diving",
    guests:1, total:277, deposit:69, balance:0,
    confirmationCode:"ROM-27334",
    includes:"All dive gear, wetsuit, underwater photos",
    reviewed: false,
  },
  {
    id:"b4", status:"completed",
    guide:"Elena Vasquez", guideSlug:"elena-vasquez",
    package:"Point Break Morning Session",
    date:"October 3, 2025", location:"Encinitas, CA", category:"Surfing",
    guests:1, total:293, deposit:73, balance:0,
    confirmationCode:"ROM-24891",
    includes:"Board rental, wetsuit, wax, 3-hour instruction",
    reviewed: true,
  },
];

const SAVED_GUIDES = [
  { id:1, name:"Anya Petrov", location:"Kenai, AK", category:"Fly Fishing", rating:4.93, price:650 },
  { id:2, name:"Owen Blackthorn", location:"Asheville, NC", category:"Hiking", rating:4.89, price:145 },
  { id:3, name:"Marcus Donnelly", location:"Jackson, WY", category:"Hunting", rating:4.91, price:850 },
];

const MESSAGES = [
  { id:"m1", guide:"James Whitfield", avatar:"J", preview:"See you at the Madison Bridge at 6am sharp. I'll have the rods rigged and coffee ready.", time:"2 days ago", unread:true },
  { id:"m2", guide:"Sasha Okafor", avatar:"S", preview:"Conditions look perfect for April 12. I'd recommend bringing lightweight layers — desert mornings are cold.", time:"4 days ago", unread:false },
  { id:"m3", guide:"Tomás Herrera", avatar:"T", preview:"Thanks for the great review Marcus. Hope to see you back in Kauai!", time:"2 months ago", unread:false },
];

const TIER_CONFIG = {
  Wanderer:  { color:"#8a96a0", trips:0,  perks:["Standard booking","Guide messaging"] },
  Explorer:  { color:"#c9973a", trips:1,  perks:["Priority responses","Trip photo archive","5% credit on repeat guides"] },
  Pioneer:   { color:"#3a7a54", trips:5,  perks:["Early access to new guides","10% credit on repeat guides","Dedicated support"] },
  Pathfinder:{ color:"#2a4a7a", trips:15, perks:["Compass newsletter early access","15% credit on repeat guides","Annual gift from Rōm"] },
  Legend:    { color:"#7a2a6a", trips:30, perks:["Custom trip planning","20% credit","Lifetime badge"] },
};

// ─── SHARED ───────────────────────────────────────────────────────────────────
function Stars({ rating, size=12 }) {
  return <span>{[1,2,3,4,5].map(i=><span key={i} style={{fontSize:size, color:i<=Math.round(rating)?T.gold:T.rim}}>★</span>)}</span>;
}

function StatusPill({ status }) {
  const cfg = {
    upcoming: { bg:T.blueGlow, border:T.blue, color:"#6a9ada", label:"Upcoming" },
    completed:{ bg:T.greenGlow, border:T.green, color:"#6aaa84", label:"Completed" },
    cancelled:{ bg:T.redGlow, border:T.red, color:"#aa7a7a", label:"Cancelled" },
  }[status];
  return <span style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:cfg.color, background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:4, padding:"3px 10px", letterSpacing:"0.06em", textTransform:"uppercase"}}>{cfg.label}</span>;
}

function GoldBtn({ children, onClick, outline, small, disabled }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        background: outline ? "transparent" : hov&&!disabled ? T.goldLt : T.gold,
        color: outline ? (hov?T.goldLt:T.gold) : T.ink,
        border:`1.5px solid ${hov&&!disabled?T.goldLt:T.gold}`,
        borderRadius:6, padding: small?"7px 14px":"11px 22px",
        fontFamily:FONT_BODY, fontSize:small?12:13, fontWeight:700,
        cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.4:1,
        transition:"all 0.15s",
      }}>{children}</button>
  );
}

// ─── REVIEW MODAL ─────────────────────────────────────────────────────────────
function ReviewModal({ booking, onClose, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");

  return (
    <div style={{position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center"}}>
      <div onClick={onClose} style={{position:"absolute", inset:0, background:"rgba(0,0,0,0.8)"}}/>
      <div style={{position:"relative", background:T.gunmetal, border:`1px solid ${T.wire}`, borderRadius:12, padding:"36px 24px", width:"90%", maxWidth:520, zIndex:1, boxShadow:"0 24px 80px rgba(0,0,0,0.7)"}}>
        <div style={{fontFamily:FONT_DISPLAY, fontSize:28, color:T.white, marginBottom:4}}>Leave a Review</div>
        <div style={{fontFamily:FONT_BODY, fontSize:13, color:T.silver, marginBottom:28}}>{booking.package} · {booking.guide}</div>

        <div style={{marginBottom:24}}>
          <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.silver, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12}}>Your Rating</div>
          <div style={{display:"flex", gap:8}}>
            {[1,2,3,4,5].map(i=>(
              <span key={i} onMouseEnter={()=>setHoverRating(i)} onMouseLeave={()=>setHoverRating(0)} onClick={()=>setRating(i)}
                style={{fontSize:36, cursor:"pointer", color: i<=(hoverRating||rating)?T.gold:T.wire, transition:"color 0.1s"}}>★</span>
            ))}
          </div>
          {(hoverRating||rating)>0 && <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.gold, marginTop:8}}>
            {["","Poor","Below average","Good","Great","Outstanding"][(hoverRating||rating)]}
          </div>}
        </div>

        <div style={{marginBottom:24}}>
          <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.silver, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10}}>Your Review</div>
          <textarea value={text} onChange={e=>setText(e.target.value)} rows={5}
            placeholder="Tell future guests what made this trip worth booking — or what they should know going in."
            style={{width:"100%", boxSizing:"border-box", background:T.steel, border:`1px solid ${T.wire}`, borderRadius:6, padding:"12px 14px", fontFamily:FONT_BODY, fontSize:14, color:T.parchment, outline:"none", resize:"vertical"}}/>
          <div style={{fontFamily:FONT_BODY, fontSize:11, color:T.muted, marginTop:6, textAlign:"right"}}>{text.length} / 1000</div>
        </div>

        <div style={{display:"flex", gap:12}}>
          <GoldBtn onClick={()=>onSubmit(rating, text)} disabled={!rating||text.length<20}>Submit Review</GoldBtn>
          <GoldBtn outline onClick={onClose}>Cancel</GoldBtn>
        </div>
      </div>
    </div>
  );
}

// ─── BOOKING DETAIL ───────────────────────────────────────────────────────────
function BookingDetail({ booking, onClose, onReview }) {
  return (
    <div style={{position:"fixed", inset:0, zIndex:200, display:"flex", justifyContent:"flex-end"}}>
      <div onClick={onClose} style={{flex:1, background:"rgba(0,0,0,0.7)"}}/>
      <div style={{width:"100%", maxWidth:520, background:T.carbon, borderLeft:`1px solid ${T.wire}`, height:"100vh", overflowY:"auto", display:"flex", flexDirection:"column"}}>
        <div style={{padding:"24px 28px", borderBottom:`1px solid ${T.wire}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
          <div>
            <div style={{fontFamily:FONT_DISPLAY, fontSize:24, color:T.white, marginBottom:6}}>{booking.package}</div>
            <div style={{display:"flex", alignItems:"center", gap:10}}>
              <StatusPill status={booking.status}/>
              <span style={{fontFamily:FONT_BODY, fontSize:13, color:T.silver}}>{booking.confirmationCode}</span>
            </div>
          </div>
          <button onClick={onClose} style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:6, color:T.ash, width:36, height:36, cursor:"pointer", fontSize:18, flexShrink:0}}>×</button>
        </div>

        <div style={{padding:"28px", flex:1, display:"flex", flexDirection:"column", gap:20}}>
          {/* Guide */}
          <div style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:8, padding:20}}>
            <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.silver, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12}}>Your Guide</div>
            <div style={{display:"flex", gap:14, alignItems:"center", marginBottom:14}}>
              <div style={{width:46, height:46, borderRadius:"50%", background:T.lifted, border:`2px solid ${T.wire}`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT_DISPLAY, fontSize:20, color:T.gold}}>{booking.guide[0]}</div>
              <div>
                <div style={{fontFamily:FONT_DISPLAY, fontSize:20, color:T.white}}>{booking.guide}</div>
                <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.silver}}>📍 {booking.location}</div>
              </div>
            </div>
            {booking.guidePhone && (
              <div style={{display:"flex", gap:10}}>
                <GoldBtn small outline onClick={()=>{}}>Message Guide</GoldBtn>
                <GoldBtn small outline onClick={()=>{}}>📞 {booking.guidePhone}</GoldBtn>
              </div>
            )}
          </div>

          {/* Trip details */}
          <div style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:8, padding:20}}>
            <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.silver, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:16}}>Trip Details</div>
            {[
              ["Date", booking.date],
              ["Guests", `${booking.guests} guest${booking.guests!==1?"s":""}`],
              ["Activity", booking.category],
              ...(booking.meetingPoint ? [["Meeting Point", booking.meetingPoint]] : []),
              ["Includes", booking.includes],
            ].map(([label, val])=>(
              <div key={label} style={{display:"flex", gap:12, marginBottom:12, paddingBottom:12, borderBottom:`1px solid ${T.rim}`}}>
                <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.silver, minWidth:100, flexShrink:0}}>{label}</div>
                <div style={{fontFamily:FONT_BODY, fontSize:13, color:T.parchment, lineHeight:1.5}}>{val}</div>
              </div>
            ))}
          </div>

          {/* Payment */}
          <div style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:8, padding:20}}>
            <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.silver, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:16}}>Payment</div>
            {[
              ["Total", `$${booking.total}`],
              ["Deposit paid", `$${booking.deposit}`],
              ...(booking.balance > 0 ? [["Balance due", `$${booking.balance}`], ["Due date", booking.balanceDueDate]] : [["Balance", "Paid in full"]]),
            ].map(([label, val])=>(
              <div key={label} style={{display:"flex", justifyContent:"space-between", marginBottom:10}}>
                <span style={{fontFamily:FONT_BODY, fontSize:13, color:T.silver}}>{label}</span>
                <span style={{fontFamily:FONT_BODY, fontSize:13, color:label==="Balance due"?T.gold:T.parchment, fontWeight:label==="Total"||label==="Balance due"?700:400}}>{val}</span>
              </div>
            ))}
            {booking.balance > 0 && (
              <div style={{marginTop:14}}>
                <GoldBtn full onClick={()=>alert("Redirecting to payment…")}>Pay Balance ${booking.balance} Now</GoldBtn>
              </div>
            )}
          </div>

          {/* Cancellation */}
          {booking.status==="upcoming" && booking.cancellationPolicy && (
            <div style={{background:T.redGlow, border:`1px solid ${T.red}`, borderRadius:8, padding:18}}>
              <div style={{fontFamily:FONT_BODY, fontSize:12, fontWeight:700, color:"#aa7a7a", marginBottom:4}}>Cancellation Policy</div>
              <div style={{fontFamily:FONT_BODY, fontSize:13, color:T.ash}}>{booking.cancellationPolicy}</div>
              <button onClick={()=>confirm("Are you sure? This may result in a cancellation fee.")&&alert("Cancellation request submitted.")}
                style={{marginTop:14, background:"none", border:`1px solid ${T.red}`, borderRadius:5, padding:"7px 14px", fontFamily:FONT_BODY, fontSize:12, color:"#aa7a7a", cursor:"pointer"}}>
                Request Cancellation
              </button>
            </div>
          )}

          {/* Review CTA */}
          {booking.status==="completed" && !booking.reviewed && (
            <div style={{background:T.goldGlow, border:`1px solid ${T.gold}`, borderRadius:8, padding:20}}>
              <div style={{fontFamily:FONT_DISPLAY, fontSize:20, color:T.gold, marginBottom:6}}>How was your trip?</div>
              <div style={{fontFamily:FONT_BODY, fontSize:13, color:T.ash, marginBottom:14}}>Your review helps future guests and supports {booking.guide}.</div>
              <GoldBtn onClick={onReview}>Leave a Review</GoldBtn>
            </div>
          )}
          {booking.status==="completed" && booking.reviewed && (
            <div style={{background:T.greenGlow, border:`1px solid ${T.green}`, borderRadius:8, padding:16}}>
              <div style={{fontFamily:FONT_BODY, fontSize:13, color:"#6aaa84", fontWeight:600}}>✓ Review submitted — thanks for helping the community.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
const TABS = ["Trips","Messages","Saved Guides","Loyalty","Account"];

// ─── MAIN ─────────────────────────────────────────────────────────────────────

// ─── MESSAGING HELPERS ────────────────────────────────────────────────────────
function timeAgo(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
}

function MessagingPanel({ userId, guideId, isGuide }) {
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => { loadThreads(); }, []);
  useEffect(() => { if (activeThread) loadMessages(activeThread.id); }, [activeThread]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeThread) loadMessages(activeThread.id);
      else loadThreads();
    }, 4000);
    return () => clearInterval(interval);
  }, [activeThread]);

  const loadThreads = async () => {
    try {
      const supabase = getSupabase();
      let query = supabase.from("message_threads").select("*").order("last_message_at", { ascending: false, nullsFirst: false });
      if (isGuide) query = query.eq("guide_id", guideId);
      else query = query.eq("guest_id", userId);
      const { data: threadData } = await query;
      if (!threadData?.length) { setLoading(false); return; }
      let nameMap = {};
      if (isGuide) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", threadData.map(t => t.guest_id));
        (profiles||[]).forEach(p => { nameMap[p.id] = p.full_name || "Traveler"; });
      } else {
        const { data: guides } = await supabase.from("guides").select("id, profile_id").in("id", threadData.map(t => t.guide_id));
        const profIds = (guides||[]).map(g => g.profile_id).filter(Boolean);
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", profIds);
        const profMap = {};
        (profiles||[]).forEach(p => { profMap[p.id] = p.full_name; });
        (guides||[]).forEach(g => { nameMap[g.id] = profMap[g.profile_id] || "Guide"; });
      }
      const threadIds = threadData.map(t => t.id);
      const { data: lastMsgs } = await supabase
        .from("messages").select("thread_id, body, sender_id, created_at, read_at")
        .in("thread_id", threadIds).order("created_at", { ascending: false });
      const lastMsgMap = {};
      (lastMsgs||[]).forEach(m => { if (!lastMsgMap[m.thread_id]) lastMsgMap[m.thread_id] = m; });
      const shaped = threadData.map(t => ({
        id: t.id,
        name: isGuide ? nameMap[t.guest_id] : nameMap[t.guide_id],
        avatar: ((isGuide ? nameMap[t.guest_id] : nameMap[t.guide_id]) || "G")[0].toUpperCase(),
        preview: lastMsgMap[t.id]?.body || "No messages yet",
        time: t.last_message_at ? timeAgo(t.last_message_at) : "",
        unread: !!(lastMsgMap[t.id] && !lastMsgMap[t.id].read_at && lastMsgMap[t.id].sender_id !== userId),
        guestId: t.guest_id,
        guideIdCol: t.guide_id,
      }));
      setThreads(shaped);
    } catch(e) { console.error("Load threads error:", e); }
    setLoading(false);
  };

  const loadMessages = async (threadId) => {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("messages").select("*").eq("thread_id", threadId).order("created_at", { ascending: true });
      setMessages(data || []);
      await supabase.from("messages").update({ read_at: new Date().toISOString() })
        .eq("thread_id", threadId).neq("sender_id", userId).is("read_at", null);
      setThreads(ts => ts.map(t => t.id === threadId ? {...t, unread: false} : t));
    } catch(e) { console.error("Load messages error:", e); }
  };

  const sendMessage = async () => {
    if (!draft.trim() || !activeThread || sending) return;
    setSending(true);
    try {
      const supabase = getSupabase();
      await supabase.from("messages").insert({ thread_id: activeThread.id, sender_id: userId, body: draft.trim() });
      setDraft("");
      await loadMessages(activeThread.id);
      await loadThreads();
    } catch(e) { console.error("Send error:", e); }
    setSending(false);
  };

  const unreadCount = threads.filter(t => t.unread).length;
  if (loading) return <div style={{fontFamily:FONT_BODY, fontSize:14, color:T.muted, padding:40}}>Loading messages…</div>;

  return (
    <div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24}}>
        <div style={{fontFamily:FONT_DISPLAY, fontSize:32, color:T.white, fontWeight:400}}>
          Messages {unreadCount > 0 && <span style={{fontFamily:FONT_BODY, fontSize:14, color:T.gold, marginLeft:8}}>{unreadCount} unread</span>}
        </div>
      </div>
      {threads.length === 0 ? (
        <div style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:10, padding:"48px 32px", textAlign:"center"}}>
          <div style={{fontFamily:FONT_DISPLAY, fontSize:24, color:T.silver, marginBottom:8}}>No messages yet</div>
          <div style={{fontFamily:FONT_BODY, fontSize:13, color:T.muted}}>
            {isGuide ? "Messages from travelers will appear here." : "Book a trip or contact a guide to start a conversation."}
          </div>
        </div>
      ) : (
        <div style={{display:"flex", gap:16, height:560}}>
          <div style={{width:280, flexShrink:0, display:"flex", flexDirection:"column", gap:6, overflowY:"auto"}}>
            {threads.map(t => (
              <div key={t.id} onClick={() => setActiveThread(t)}
                style={{background:activeThread?.id===t.id?T.lifted:t.unread?T.lifted:T.steel, border:`1px solid ${activeThread?.id===t.id?T.gold:T.wire}`, borderLeft:`3px solid ${t.unread||activeThread?.id===t.id?T.gold:"transparent"}`, borderRadius:8, padding:"14px 16px", cursor:"pointer", transition:"all 0.15s"}}>
                <div style={{display:"flex", gap:12, alignItems:"center"}}>
                  <div style={{width:38, height:38, borderRadius:"50%", background:T.gunmetal, border:`2px solid ${t.unread?T.gold:T.wire}`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT_DISPLAY, fontSize:16, color:t.unread?T.gold:T.silver, flexShrink:0}}>{t.avatar}</div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3}}>
                      <div style={{fontFamily:FONT_BODY, fontSize:13, fontWeight:t.unread?700:500, color:T.parchment, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{t.name}</div>
                      <div style={{fontFamily:FONT_BODY, fontSize:10, color:T.muted, flexShrink:0, marginLeft:4}}>{t.time}</div>
                    </div>
                    <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.silver, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{t.preview}</div>
                  </div>
                  {t.unread && <div style={{width:7, height:7, borderRadius:"50%", background:T.gold, flexShrink:0}}/>}
                </div>
              </div>
            ))}
          </div>
          <div style={{flex:1, display:"flex", flexDirection:"column", background:T.steel, border:`1px solid ${T.wire}`, borderRadius:10, overflow:"hidden"}}>
            {!activeThread ? (
              <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center"}}>
                <div style={{fontFamily:FONT_BODY, fontSize:14, color:T.muted}}>Select a conversation</div>
              </div>
            ) : (
              <>
                <div style={{padding:"16px 20px", borderBottom:`1px solid ${T.wire}`, display:"flex", alignItems:"center", gap:12}}>
                  <div style={{width:36, height:36, borderRadius:"50%", background:T.gunmetal, border:`2px solid ${T.wire}`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT_DISPLAY, fontSize:15, color:T.silver}}>{activeThread.avatar}</div>
                  <div style={{fontFamily:FONT_BODY, fontSize:14, fontWeight:600, color:T.parchment}}>{activeThread.name}</div>
                </div>
                <div style={{flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:10}}>
                  {messages.map(m => {
                    const mine = m.sender_id === userId;
                    return (
                      <div key={m.id} style={{display:"flex", justifyContent:mine?"flex-end":"flex-start"}}>
                        <div style={{maxWidth:"72%", padding:"10px 14px", borderRadius:mine?"12px 12px 2px 12px":"12px 12px 12px 2px", background:mine?T.gold:T.lifted, color:mine?T.ink:T.parchment, fontFamily:FONT_BODY, fontSize:13, lineHeight:1.5}}>
                          <div>{m.body}</div>
                          <div style={{fontFamily:FONT_BODY, fontSize:10, color:mine?"rgba(0,0,0,0.45)":T.muted, marginTop:4, textAlign:mine?"right":"left"}}>{timeAgo(m.created_at)}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef}/>
                </div>
                <div style={{padding:"12px 16px", borderTop:`1px solid ${T.wire}`, display:"flex", gap:10, alignItems:"flex-end"}}>
                  <textarea value={draft} onChange={e=>setDraft(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();} }}
                    placeholder="Type a message… (Enter to send)" rows={2}
                    style={{flex:1, background:T.lifted, border:`1px solid ${T.wire}`, borderRadius:8, padding:"10px 14px", fontFamily:FONT_BODY, fontSize:13, color:T.parchment, resize:"none", outline:"none"}}
                  />
                  <button onClick={sendMessage} disabled={!draft.trim()||sending}
                    style={{background:draft.trim()?T.gold:T.rim, border:"none", borderRadius:8, padding:"10px 18px", fontFamily:FONT_BODY, fontSize:13, fontWeight:700, color:draft.trim()?T.ink:T.muted, cursor:draft.trim()?"pointer":"default", transition:"all 0.15s", whiteSpace:"nowrap"}}>
                    {sending ? "…" : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuestDashboard() {
  const [tab, setTab] = useState("Trips");
  const [activeBooking, setActiveBooking] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [bookings, setBookings] = useState(BOOKINGS);
  const [tripFilter, setTripFilter] = useState("all");
  const [guest, setGuest] = useState(GUEST);
  const [loading, setLoading] = useState(true);
  const [tripPlans, setTripPlans] = useState([]);

  useEffect(() => { 
    fetchData(); 
    // Deep link tab from URL param
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    if (t === "messages") setTab("Messages");
  }, []);

  const fetchData = async () => {
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles").select("*").eq("id", user.id).single();

      // Fetch bookings — denormalized, no joins needed
      const { data: rawBookings } = await supabase
        .from("bookings")
        .select("*")
        .eq("guest_id", user.id)
        .order("trip_date", { ascending: false });

      // Fetch loyalty info
      const { data: loyalty } = await supabase
        .from("guest_loyalty").select("*").eq("profile_id", user.id).single();

      // Fetch trip plans from concierge
      const { data: plans } = await supabase
        .from("trip_plans")
        .select("id, destination, activity_types, date_start, date_end, itinerary, share_token, created_at, status")
        .eq("guest_id", user.id)
        .order("created_at", { ascending: false });
      setTripPlans(plans || []);

      if (profile) {
        const now = new Date();
        const shaped = (rawBookings || []).map(b => {
          const tripDate = new Date(b.trip_date);
          const status = b.status === "completed" ? "completed"
            : b.status === "cancelled" ? "cancelled"
            : tripDate < now ? "completed" : "upcoming";
          return {
            id: b.id,
            status,
            guide: b.guides?.profiles?.full_name || "Guide",
            guideSlug: b.guides?.slug || "",
            package: b.package_title || "Package",
            date: tripDate.toLocaleDateString("en-US", {month:"long", day:"numeric", year:"numeric"}),
            location: b.guides?.location || "",
            guests: b.guests,
            total: b.total,
            deposit: b.deposit,
            balance: b.balance,
            confirmationCode: b.confirmation_code,
            includes: b.includes || "",
            meetingPoint: b.meeting_point || "",
            reviewed: false,
            guideId: b.guide_id,
            waiverSigned: b.waiver_signed || false,
          };
        });

        const completed = shaped.filter(b => b.status === "completed").length;
        const tierName = loyalty?.tier || "Explorer";
        const tierNext = tierName === "Explorer" ? "Pioneer" : tierName === "Pioneer" ? "Summit" : null;

        setGuest({
          name: profile.full_name || "Traveler",
          email: user.email,
          joined: new Date(profile.created_at || Date.now()).toLocaleDateString("en-US", {month:"long", year:"numeric"}),
          avatar: (profile.full_name || "T")[0].toUpperCase(),
          tier: tierName,
          tierNext,
          tripsCompleted: completed,
          totalSpent: shaped.reduce((s,b) => s + (parseFloat(b.total)||0), 0),
          savedGuides: 0,
        });

        if (shaped.length > 0) setBookings(shaped);
      }
    } catch(e) {
      console.error("Dashboard fetch error:", e);
    }
    setLoading(false);
  };

  const submitReview = async (bookingId, rating, text) => {
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      const booking = bookings.find(b => b.id === bookingId);
      if (user && booking) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

        await supabase.from("reviews").insert({
          guide_id: booking.guideId,
          reviewer_id: user.id,
          booking_id: bookingId,
          rating,
          body: text,
          trip_label: booking.package || "",
          solicited: true,
        });

        // Update guide's rating and review count
        const { data: allReviews } = await supabase
          .from("reviews")
          .select("rating")
          .eq("guide_id", booking.guideId);
        if (allReviews?.length) {
          const avg = (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(2);
          await supabase.from("guides").update({
            rating: avg,
            review_count: allReviews.length,
          }).eq("id", booking.guideId);
        }

        // Notify guide
        await supabase.from("guide_notifications").insert({
          guide_id: booking.guideId,
          type: "review_received",
          title: `${profile?.full_name || "A guest"} left you a ${rating}-star review`,
          body: text.length > 100 ? text.substring(0, 100) + "…" : text,
          metadata: { booking_id: bookingId, rating },
        });

        // Send review notification email
        fetch("/api/reviews/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideId: booking.guideId, reviewerName: profile?.full_name || "Guest", rating, body: text, tripLabel: booking.package }),
        }).catch(console.error);
      }
    } catch(e) { console.error("Review error:", e); }
    setBookings(bs => bs.map(b => b.id===bookingId ? {...b, reviewed:true} : b));
    setReviewBooking(null);
    setActiveBooking(null);
  };

  const filteredBookings = bookings.filter(b=>{
    if(tripFilter==="upcoming") return b.status==="upcoming";
    if(tripFilter==="completed") return b.status==="completed";
    return true;
  });

  const tier = TIER_CONFIG[guest.tier] || TIER_CONFIG["Explorer"];
  const nextTier = TIER_CONFIG[guest.tierNext];
  const tripsToNext = (nextTier?.trips||0) - guest.tripsCompleted;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Barlow:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.void};}
        ::placeholder{color:${T.muted};}
        ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:${T.carbon};}::-webkit-scrollbar-thumb{background:${T.wire};border-radius:3px;}
      `}</style>

      {/* ── NAV — void ── */}
      <div style={{position:"sticky", top:0, zIndex:100, background:T.void, borderBottom:`1px solid ${T.wire}`, height:64, display:"flex", alignItems:"center"}}>
        <div style={{maxWidth:1200, margin:"0 auto", padding:"0 40px", width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div style={{fontFamily:FONT_DISPLAY, fontSize:26, color:T.gold, letterSpacing:"0.14em", fontWeight:500, cursor:"pointer"}} onClick={()=>window.location.href="/"}>RŌM</div>
          <div style={{display:"flex", gap:24, alignItems:"center"}}>
            <span style={{fontFamily:FONT_BODY, fontSize:14, color:T.ash, cursor:"pointer"}}>Explore</span>
            <div style={{display:"flex", alignItems:"center", gap:10}}>
              <div style={{width:34, height:34, borderRadius:"50%", background:T.steel, border:`2px solid ${T.gold}`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT_DISPLAY, fontSize:16, color:T.gold, cursor:"pointer"}}>{guest.avatar}</div>
              <div>
                <div style={{fontFamily:FONT_BODY, fontSize:13, fontWeight:700, color:T.parchment}}>{guest.name}</div>
                <div style={{fontFamily:FONT_BODY, fontSize:11, color:tier.color, fontWeight:600}}>{guest.tier}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── HEADER — carbon ── */}
      <div style={{background:T.carbon, borderBottom:`1px solid ${T.wire}`}}>
        <div style={{maxWidth:1200, margin:"0 auto", padding:"32px 40px 0"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:28}}>
            <div>
              <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.silver, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8}}>Guest Dashboard</div>
              <h1 style={{fontFamily:FONT_DISPLAY, fontSize:40, color:T.white, fontWeight:400, marginBottom:6}}>Welcome back, {guest.name.split(" ")[0]}.</h1>
              <div style={{display:"flex", gap:20}}>
                {[
                  [`${guest.tripsCompleted} trips completed`],
                  [`${bookings.filter(b=>b.status==="upcoming").length} upcoming`],
                  [`${guest.savedGuides} saved guides`],
                ].map(([label])=>(
                  <span key={label} style={{fontFamily:FONT_BODY, fontSize:13, color:T.silver}}>{label}</span>
                ))}
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:tier.color, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4}}>Loyalty Tier</div>
              <div style={{fontFamily:FONT_DISPLAY, fontSize:28, color:T.white, fontWeight:400}}>{guest.tier}</div>
              <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.silver}}>{tripsToNext} trip{tripsToNext!==1?"s":""} to {guest.tierNext}</div>
            </div>
          </div>

          {/* Tab nav */}
          <div style={{display:"flex"}}>
            {TABS.map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{
                padding:"14px 22px", background:"none", border:"none",
                borderBottom:`2px solid ${tab===t?T.gold:"transparent"}`,
                fontFamily:FONT_BODY, fontSize:14, fontWeight:tab===t?700:400,
                color:tab===t?T.gold:T.silver, cursor:"pointer", transition:"color 0.15s",
              }}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY — gunmetal ── */}
      <div style={{background:T.gunmetal, minHeight:"calc(100vh - 180px)"}}>
        <div style={{maxWidth:1200, margin:"0 auto", padding:"40px 16px 80px"}}>

          {/* ── TRIPS TAB ── */}
          {tab==="Trips" && (
            <div style={{display:"grid", gridTemplateColumns:"1fr", gap:40, alignItems:"start"}}>
              <div>
                {/* Filter pills */}
                <div style={{display:"flex", gap:8, marginBottom:24}}>
                  {[["all","All Trips"],["upcoming","Upcoming"],["completed","Completed"]].map(([val,label])=>(
                    <button key={val} onClick={()=>setTripFilter(val)} style={{
                      background:tripFilter===val?T.goldGlow:T.steel,
                      border:`1px solid ${tripFilter===val?T.gold:T.wire}`,
                      borderRadius:20, padding:"6px 16px",
                      fontFamily:FONT_BODY, fontSize:12, fontWeight:tripFilter===val?700:400,
                      color:tripFilter===val?T.gold:T.silver, cursor:"pointer",
                    }}>{label}</button>
                  ))}
                </div>

                {/* Booking cards */}
                <div style={{display:"flex", flexDirection:"column", gap:12}}>
                  {filteredBookings.map(b=>(
                    <div key={b.id} onClick={()=>setActiveBooking(b)} style={{
                      background:T.steel, border:`1px solid ${T.wire}`,
                      borderLeft:`3px solid ${b.status==="upcoming"?T.blue:T.green}`,
                      borderRadius:8, padding:"20px 22px",
                      cursor:"pointer", transition:"all 0.15s",
                      display:"grid", gridTemplateColumns:"1fr auto",
                      gap:16, alignItems:"center",
                    }}
                    onMouseEnter={e=>e.currentTarget.style.background=T.lifted}
                    onMouseLeave={e=>e.currentTarget.style.background=T.steel}>
                      <div>
                        <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:8}}>
                          <StatusPill status={b.status}/>
                          <span style={{fontFamily:FONT_BODY, fontSize:11, color:T.muted}}>{b.confirmationCode}</span>
                        </div>
                        <div style={{fontFamily:FONT_DISPLAY, fontSize:22, color:T.white, fontWeight:400, marginBottom:4}}>{b.package}</div>
                        <div style={{fontFamily:FONT_BODY, fontSize:13, color:T.silver}}>
                          {b.guide} · {b.location} · {b.date}
                        </div>
                        {b.status==="upcoming" && b.balance>0 && (
                          <div style={{marginTop:10, display:"inline-flex", alignItems:"center", gap:6, background:T.goldGlow, border:`1px solid ${T.gold}`, borderRadius:4, padding:"4px 10px"}}>
                            <span style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.gold}}>Balance ${b.balance} due {b.balanceDueDate}</span>
                          </div>
                        )}
                        {b.status==="completed" && !b.reviewed && (
                          <div style={{marginTop:10}} onClick={e=>{e.stopPropagation();window.location.href=`/review/${b.id}`;}}>
                            <span style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.gold, background:T.goldGlow, border:`1px solid ${T.gold}`, borderRadius:4, padding:"4px 10px", cursor:"pointer"}}>✦ Leave a review</span>
                          </div>
                        )}
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontFamily:FONT_DISPLAY, fontSize:26, color:T.gold, fontWeight:400}}>${b.total}</div>
                        <div style={{fontFamily:FONT_BODY, fontSize:11, color:T.silver, marginTop:2}}>{b.guests} guest{b.guests!==1?"s":""}</div>
                        <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.silver, marginTop:8}}>View details →</div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredBookings.length===0 && tripPlans.length===0 && (
                  <div style={{textAlign:"center", padding:"72px 24px", background:T.steel, border:`1px solid ${T.wire}`, borderRadius:8}}>
                    <div style={{fontFamily:FONT_DISPLAY, fontSize:30, color:T.silver, fontWeight:300, marginBottom:10}}>No trips here</div>
                    <div style={{fontFamily:FONT_BODY, fontSize:14, color:T.muted, marginBottom:24}}>Time to plan your next adventure.</div>
                    <GoldBtn onClick={()=>window.location.href="/concierge"}>RŌM Concierge →</GoldBtn>
                  </div>
                )}

                {/* Trip Plans from Concierge */}
                {tripPlans.length > 0 && (
                  <div style={{marginTop:28}}>
                    <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.silver, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14}}>My Trip Plans</div>
                    <div style={{display:"flex", flexDirection:"column", gap:12}}>
                      {tripPlans.map(plan => (
                        <div key={plan.id}
                          onClick={() => window.location.href = `/trip/${plan.share_token || plan.id}`}
                          style={{background:T.steel, border:`1px solid ${T.wire}`, borderLeft:`3px solid ${T.gold}`, borderRadius:8, padding:"20px 22px", cursor:"pointer", transition:"all 0.15s"}}
                          onMouseEnter={e=>e.currentTarget.style.background=T.lifted}
                          onMouseLeave={e=>e.currentTarget.style.background=T.steel}>
                          <div style={{fontFamily:FONT_DISPLAY, fontSize:20, color:T.white, fontWeight:400, marginBottom:6}}>
                            {plan.itinerary?.title || plan.destination}
                          </div>
                          <div style={{fontFamily:FONT_BODY, fontSize:13, color:T.silver, marginBottom:8}}>
                            {plan.destination}
                            {plan.date_start ? ` · ${new Date(plan.date_start).toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${new Date(plan.date_end).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}` : " · Flexible dates"}
                          </div>
                          <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
                            {plan.activity_types?.slice(0,3).map(a => (
                              <span key={a} style={{fontFamily:FONT_BODY, fontSize:11, color:T.gold, background:T.goldGlow, borderRadius:10, padding:"2px 8px"}}>{a}</span>
                            ))}
                            <span style={{fontFamily:FONT_BODY, fontSize:11, color:T.muted}}>Planned {new Date(plan.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right sidebar */}
              <div style={{display:"flex", flexDirection:"column", gap:14}}>
                {/* Upcoming callout */}
                {bookings.filter(b=>b.status==="upcoming").length>0 && (
                  <div style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:8, overflow:"hidden"}}>
                    <div style={{background:T.void, padding:"14px 18px", borderBottom:`1px solid ${T.wire}`}}>
                      <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.silver, textTransform:"uppercase", letterSpacing:"0.08em"}}>Next Up</div>
                    </div>
                    <div style={{padding:18}}>
                      {bookings.filter(b=>b.status==="upcoming").slice(0,1).map(b=>(
                        <div key={b.id}>
                          <div style={{fontFamily:FONT_DISPLAY, fontSize:19, color:T.white, marginBottom:4}}>{b.package}</div>
                          <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.silver, marginBottom:12}}>{b.date} · {b.location}</div>
                          {b.balance>0 && <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.gold, fontWeight:600}}>Balance ${b.balance} due {b.balanceDueDate}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Loyalty progress */}
                <div style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:8, overflow:"hidden"}}>
                  <div style={{background:T.void, padding:"14px 18px", borderBottom:`1px solid ${T.wire}`}}>
                    <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.silver, textTransform:"uppercase", letterSpacing:"0.08em"}}>Loyalty Progress</div>
                  </div>
                  <div style={{padding:18}}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10}}>
                      <span style={{fontFamily:FONT_BODY, fontSize:13, fontWeight:700, color:tier.color}}>{guest.tier}</span>
                      <span style={{fontFamily:FONT_BODY, fontSize:12, color:T.silver}}>{guest.tripsCompleted} / {nextTier?.trips} trips</span>
                    </div>
                    <div style={{height:5, background:T.lifted, borderRadius:3, overflow:"hidden", marginBottom:10}}>
                      <div style={{height:"100%", width:`${(guest.tripsCompleted/(nextTier?.trips||1))*100}%`, background:tier.color, borderRadius:3, transition:"width 0.5s"}}/>
                    </div>
                    <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.silver}}>{tripsToNext} more trip{tripsToNext!==1?"s":""} to reach <span style={{color:nextTier?TIER_CONFIG[guest.tierNext]?.color:T.gold}}>{guest.tierNext}</span></div>
                  </div>
                </div>

                {/* Quick links */}
                <div style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:8, padding:18}}>
                  <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.silver, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14}}>Quick Links</div>
                  {[["Browse guides","→"],["Saved guides","→"],["Your reviews","→"],["Help center","→"]].map(([label,icon])=>(
                    <div key={label} style={{display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:`1px solid ${T.rim}`, cursor:"pointer"}}>
                      <span style={{fontFamily:FONT_BODY, fontSize:13, color:T.ash}}>{label}</span>
                      <span style={{color:T.silver}}>{icon}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── MESSAGES TAB ── */}
          {tab==="Messages" && (
            <div style={{maxWidth:900}}>
              <MessagingPanel userId={user?.id} isGuide={false} />
            </div>
          )}

          {/* ── SAVED GUIDES TAB ── */}
          {tab==="Saved Guides" && (
            <div>
              <div style={{fontFamily:FONT_DISPLAY, fontSize:32, color:T.white, fontWeight:400, marginBottom:24}}>Saved Guides</div>
              <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14}}>
                {SAVED_GUIDES.map(g=>(
                  <div key={g.id} style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:8, overflow:"hidden", cursor:"pointer"}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.lifted}
                    onMouseLeave={e=>e.currentTarget.style.background=T.steel}>
                    <div style={{height:120, background:"linear-gradient(135deg,#152018,#0b1a24)", position:"relative", borderBottom:`1px solid ${T.wire}`}}>
                      <div style={{position:"absolute", top:12, left:12}}>
                        <span style={{fontFamily:FONT_BODY, fontSize:10, fontWeight:700, color:T.gold, background:T.goldGlow, border:`1px solid ${T.gold}`, borderRadius:3, padding:"2px 8px"}}>{g.category}</span>
                      </div>
                    </div>
                    <div style={{padding:"16px 18px"}}>
                      <div style={{fontFamily:FONT_DISPLAY, fontSize:20, color:T.white, marginBottom:3}}>{g.name}</div>
                      <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.silver, marginBottom:10}}>📍 {g.location}</div>
                      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:10, borderTop:`1px solid ${T.rim}`}}>
                        <div style={{display:"flex", gap:5, alignItems:"center"}}>
                          <Stars rating={g.rating} size={11}/>
                          <span style={{fontFamily:FONT_BODY, fontSize:12, fontWeight:700, color:T.parchment}}>{g.rating}</span>
                        </div>
                        <span style={{fontFamily:FONT_DISPLAY, fontSize:18, color:T.gold}}>${g.price}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── LOYALTY TAB ── */}
          {tab==="Loyalty" && (
            <div style={{maxWidth:800}}>
              <div style={{fontFamily:FONT_DISPLAY, fontSize:32, color:T.white, fontWeight:400, marginBottom:8}}>Loyalty Tiers</div>
              <div style={{fontFamily:FONT_BODY, fontSize:15, color:T.ash, marginBottom:32, lineHeight:1.6}}>Every trip moves you up. Perks compound. The more you explore with Rōm, the better it gets.</div>
              <div style={{display:"flex", flexDirection:"column", gap:10}}>
                {Object.entries(TIER_CONFIG).map(([name,cfg])=>{
                  const isCurrent = name===guest.tier;
                  const isPast = Object.keys(TIER_CONFIG).indexOf(name) < Object.keys(TIER_CONFIG).indexOf(guest.tier);
                  return (
                    <div key={name} style={{
                      background:isCurrent?T.lifted:T.steel,
                      border:`1px solid ${isCurrent?cfg.color:T.wire}`,
                      borderLeft:`4px solid ${isCurrent?cfg.color:isPast?"#3a7a54":T.rim}`,
                      borderRadius:8, padding:"20px 24px",
                      display:"grid", gridTemplateColumns:"1fr",
                      gap:24, alignItems:"center",
                    }}>
                      <div>
                        <div style={{fontFamily:FONT_BODY, fontSize:14, fontWeight:700, color:isCurrent?cfg.color:isPast?"#6aaa84":T.silver}}>{name}</div>
                        <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.muted, marginTop:3}}>{cfg.trips}+ trips</div>
                        {isCurrent && <div style={{fontFamily:FONT_BODY, fontSize:10, fontWeight:700, color:cfg.color, textTransform:"uppercase", letterSpacing:"0.08em", marginTop:6}}>Current Tier</div>}
                        {isPast && <div style={{fontFamily:FONT_BODY, fontSize:10, color:"#6aaa84", marginTop:6}}>✓ Achieved</div>}
                      </div>
                      <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                        {cfg.perks.map(p=>(
                          <span key={p} style={{fontFamily:FONT_BODY, fontSize:12, color:isCurrent?T.ash:T.silver, background:T.lifted, border:`1px solid ${T.rim}`, borderRadius:4, padding:"3px 10px"}}>{p}</span>
                        ))}
                      </div>
                      <div style={{width:8, height:8, borderRadius:"50%", background:isCurrent?cfg.color:isPast?"#3a7a54":T.rim}}/>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── ACCOUNT TAB ── */}
          {tab==="Account" && (
            <div style={{maxWidth:600}}>
              <div style={{fontFamily:FONT_DISPLAY, fontSize:32, color:T.white, fontWeight:400, marginBottom:28}}>Account Settings</div>
              <div style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:10, overflow:"hidden"}}>
                {/* Avatar section */}
                <div style={{padding:"28px 28px", borderBottom:`1px solid ${T.wire}`, display:"flex", gap:20, alignItems:"center"}}>
                  <div style={{width:64, height:64, borderRadius:"50%", background:T.lifted, border:`2px solid ${T.gold}`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT_DISPLAY, fontSize:28, color:T.gold}}>{guest.avatar}</div>
                  <div>
                    <div style={{fontFamily:FONT_DISPLAY, fontSize:22, color:T.white}}>{guest.name}</div>
                    <div style={{fontFamily:FONT_BODY, fontSize:13, color:T.silver}}>{guest.email}</div>
                    <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.muted, marginTop:4}}>Member since {guest.joined}</div>
                  </div>
                  <div style={{marginLeft:"auto"}}>
                    <GoldBtn small outline onClick={()=>{}}>Edit Photo</GoldBtn>
                  </div>
                </div>

                {/* Fields */}
                {[["Full Name", guest.name],["Email", guest.email],["Phone","Not set"],["Location","Not set"]].map(([label,val])=>(
                  <div key={label} style={{padding:"18px 28px", borderBottom:`1px solid ${T.rim}`, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                    <div>
                      <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.silver, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4}}>{label}</div>
                      <div style={{fontFamily:FONT_BODY, fontSize:14, color:val==="Not set"?T.muted:T.parchment}}>{val}</div>
                    </div>
                    <GoldBtn small outline onClick={()=>{}}>Edit</GoldBtn>
                  </div>
                ))}

                <div style={{padding:"18px 28px", display:"flex", gap:12}}>
                  <GoldBtn small outline onClick={()=>{}}>Change Password</GoldBtn>
                  <button style={{background:"none", border:`1px solid ${T.rim}`, borderRadius:5, padding:"7px 14px", fontFamily:FONT_BODY, fontSize:12, color:T.muted, cursor:"pointer"}}>Sign Out</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modals */}
      {activeBooking && (
        <BookingDetail
          booking={activeBooking}
          onClose={()=>setActiveBooking(null)}
          onReview={()=>setReviewBooking(activeBooking)}
        />
      )}
      {reviewBooking && (
        <ReviewModal
          booking={reviewBooking}
          onClose={()=>setReviewBooking(null)}
          onSubmit={(rating,text)=>submitReview(reviewBooking.id, rating, text)}
        />
      )}
    </>
  );
}
