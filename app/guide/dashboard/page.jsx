"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

const T = {
  void:     "#080a0b",
  carbon:   "#0f1214",
  gunmetal: "#171b1e",
  steel:    "#1f2428",
  lifted:   "#272c31",
  rim:      "#323840",
  wire:     "#424c54",
  muted:    "#5a6470",
  silver:   "#8a96a0",
  ash:      "#b8c2ca",
  parchment:"#e8e2d8",
  white:    "#f5f2ee",
  gold:     "#c9973a",
  goldLt:   "#e0b050",
  goldGlow: "#c9973a28",
  ink:      "#080a0b",
  green:    "#3a7a54",
  greenGlow:"#3a7a5428",
  red:      "#8a3a3a",
  redGlow:  "#8a3a3a28",
  blue:     "#2a4a7a",
  blueGlow: "#2a4a7a28",
};
const FONT_DISPLAY = "'Cormorant Garamond', Georgia, serif";
const FONT_BODY    = "'Barlow', system-ui, sans-serif";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const GUIDE = {
  name: "James Whitfield", slug: "james-whitfield",
  location: "Bozeman, MT", category: "Fly Fishing",
  rating: 4.97, reviewCount: 143, responseRate: 98,
  avatar: "J", verified: true, memberSince: "March 2024",
  stripeConnected: true,
};

const STATS = {
  earningsThisMonth: 3840,
  earningsLastMonth: 2970,
  tripsThisMonth: 7,
  tripsAllTime: 68,
  avgRating: 4.97,
  responseRate: 98,
  profileViews: 312,
  conversionRate: 14,
};

const BOOKINGS = [
  { id:"b1", status:"pending", client:"Marcus Chen", guestEmail:"marcus@gmail.com", guests:2, package:"Full Day Trophy Hunt", date:"March 28, 2026", total:1140, deposit:285, message:"My buddy and I have been fishing together for 10 years but never with a guide on the Madison. We're solid casters but want to learn how to read the water better.", createdAt:"2 days ago" },
  { id:"b2", status:"confirmed", guest:"Sarah Liu", guestEmail:"sliu@email.com", guests:1, package:"Half Day — Learn to Read Water", date:"March 22, 2026", total:411, deposit:103, message:"First time fly fishing. Complete beginner. Very excited.", createdAt:"5 days ago" },
  { id:"b3", status:"confirmed", client:"Derek & Amy P.", guestEmail:"derek.p@gmail.com", guests:2, package:"3-Day Yellowstone Backcountry", date:"April 8, 2026", total:3600, deposit:900, message:"We did the backcountry trip last fall and want to come back for spring runoff.", createdAt:"1 week ago" },
  { id:"b4", status:"completed", guest:"Chris M.", guestEmail:"chrism@email.com", guests:1, package:"Full Day Trophy Hunt", date:"February 18, 2026", total:570, deposit:143, message:"", createdAt:"3 weeks ago", reviewed:true, reviewText:"Landed a 22-inch brown on a dry fly in the afternoon hatch. James called it twenty minutes before it happened.", reviewRating:5 },
  { id:"b5", status:"completed", guest:"Rachel K.", guestEmail:"rachel.k@email.com", guests:2, package:"Half Day — Learn to Read Water", date:"February 5, 2026", total:822, deposit:206, message:"", createdAt:"5 weeks ago", reviewed:false },
];

const PACKAGES = [
  { id:"p1", title:"Half Day — Learn to Read Water", duration:"4 hours", price:275, priceType:"person", active:true, bookingsCount:41, rating:4.96 },
  { id:"p2", title:"Full Day Trophy Hunt", duration:"8 hours", price:495, priceType:"person", active:true, bookingsCount:22, rating:4.98 },
  { id:"p3", title:"3-Day Yellowstone Backcountry", duration:"3 days", price:3200, priceType:"flat", active:true, bookingsCount:5, rating:5.0 },
];

const EARNINGS_MONTHLY = [
  { month:"Sep", amount:1840 },
  { month:"Oct", amount:2640 },
  { month:"Nov", amount:3120 },
  { month:"Dec", amount:1480 },
  { month:"Jan", amount:2200 },
  { month:"Feb", amount:2970 },
  { month:"Mar", amount:3840 },
];

const MESSAGES = [
  { id:"m1", client:"Emily R.", preview:"Hi James — I'm looking at the backcountry trip for late May. Any availability around the 18th?", time:"3 hours ago", unread:true, booking:null },
  { id:"m2", client:"Marcus Chen", preview:"Perfect, see you at the bridge at 6am. Should I bring my own waders or are yours better?", time:"1 day ago", unread:true, booking:"Full Day Trophy Hunt · March 28" },
  { id:"m3", client:"Derek & Amy P.", preview:"We'll need to arrive a day early — can you recommend anywhere to stay near the trailhead?", time:"3 days ago", unread:false, booking:"3-Day Yellowstone · April 8" },
];

// ─── SHARED ───────────────────────────────────────────────────────────────────
function Stars({ rating, size=12 }) {
  return <span>{[1,2,3,4,5].map(i=><span key={i} style={{fontSize:size,color:i<=Math.round(rating)?T.gold:T.rim}}>★</span>)}</span>;
}

function StatusPill({ status }) {
  const cfg = {
    pending:  { bg:T.goldGlow,  border:T.gold,  color:T.gold,    label:"Pending" },
    confirmed:{ bg:T.blueGlow,  border:T.blue,  color:"#6a9ada", label:"Confirmed" },
    completed:{ bg:T.greenGlow, border:T.green, color:"#6aaa84", label:"Completed" },
    cancelled:{ bg:T.redGlow,   border:T.red,   color:"#aa7a7a", label:"Cancelled" },
  }[status] || { bg:T.goldGlow, border:T.gold, color:T.gold, label:status };
  return <span style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:cfg.color,background:cfg.bg,border:`1px solid ${cfg.border}`,borderRadius:4,padding:"3px 10px",letterSpacing:"0.06em",textTransform:"uppercase"}}>{cfg.label}</span>;
}

function GoldBtn({ children, onClick, outline, small, disabled, full }) {
  const [hov,setHov]=useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        width:full?"100%":"auto",
        background:outline?"transparent":hov&&!disabled?T.goldLt:T.gold,
        color:outline?(hov?T.goldLt:T.gold):T.ink,
        border:`1.5px solid ${hov&&!disabled?T.goldLt:T.gold}`,
        borderRadius:6, padding:small?"7px 14px":"11px 22px",
        fontFamily:FONT_BODY, fontSize:small?12:13, fontWeight:700,
        cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.4:1,
        transition:"all 0.15s",
      }}>{children}</button>
  );
}

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
  const max = Math.max(...data.map(d=>d.amount));
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

// ─── BOOKING DETAIL PANEL ─────────────────────────────────────────────────────
function BookingPanel({ booking, onClose, onAccept, onDecline }) {
  const [replyText, setReplyText] = useState("");
  return (
    <div style={{position:"fixed", inset:0, zIndex:200, display:"flex", justifyContent:"flex-end"}}>
      <div onClick={onClose} style={{flex:1, background:"rgba(0,0,0,0.7)"}}/>
      <div style={{width:520, background:T.carbon, borderLeft:`1px solid ${T.wire}`, height:"100vh", overflowY:"auto", display:"flex", flexDirection:"column"}}>
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
            <div style={{marginTop:4, fontFamily:FONT_BODY, fontSize:11, color:T.muted}}>Rōm charges guests a 15% service fee separately. Your listed price is your payout.</div>
          </div>

          {/* Review (if completed + reviewed) */}
          {booking.reviewed && (
            <div style={{background:T.greenGlow, border:`1px solid ${T.green}`, borderRadius:8, padding:18}}>
              <div style={{display:"flex", gap:6, marginBottom:8}}><Stars rating={booking.reviewRating} size={14}/></div>
              <p style={{fontFamily:FONT_BODY, fontSize:13, color:T.ash, lineHeight:1.65, fontStyle:"italic"}}>"{booking.reviewText}"</p>
              <div style={{fontFamily:FONT_BODY, fontSize:12, color:"#6aaa84", marginTop:10}}>— {booking.guest}</div>
            </div>
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
      </div>
    </div>
  );
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
const TABS = ["Overview","Bookings","Calendar","Packages","Messages","Earnings","Profile"];

export default function GuideDashboard() {
  const [tab, setTab] = useState("Overview");
  const [bookings, setBookings] = useState(BOOKINGS);
  const [activeBooking, setActiveBooking] = useState(null);
  const [bookingFilter, setBookingFilter] = useState("all");
  const [packages, setPackages] = useState(PACKAGES);
  const [guide, setGuide] = useState({...GUIDE, name: '...'});
  const [stats, setStats] = useState(STATS);
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

      // Fetch guide record (flat)
      const { data: g } = await supabase
        .from("guides").select("*")
        .eq("profile_id", user.id).single();
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
      });

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
          total: b.total,
          deposit: b.deposit,
          message: b.special_requests || "",
          createdAt: new Date(b.created_at).toLocaleDateString("en-US", {month:"short", day:"numeric"}),
        }));
        setBookings(shaped);
      }

      // Fetch packages
      const { data: pkgs } = await supabase
        .from("packages").select("*").eq("guide_id", g.id).eq("active", true);
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
      });


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
    } catch(e) { console.error("Guide dashboard error:", e); }
  };

  const pendingCount = bookings.filter(b=>b.status==="pending").length;
  const unreadMsgs = threads.filter(t => (t.messages||[]).some(m => m.sender_id !== currentUserId && !m.read_at)).length;

  const accept = async (id) => {
    try {
      const supabase = getSupabase();
      await supabase.from("bookings").update({ status: "confirmed" }).eq("id", id);
    } catch(e) { console.error(e); }
    setBookings(bs=>bs.map(b=>b.id===id?{...b,status:"confirmed"}:b));
    setActiveBooking(null);
  };

  const decline = async (id) => {
    try {
      const supabase = getSupabase();
      await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Barlow:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.void};}
        ::placeholder{color:${T.muted};}
        textarea,input,select{font-family:'Barlow',system-ui,sans-serif;}
        ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:${T.carbon};}::-webkit-scrollbar-thumb{background:${T.wire};border-radius:3px;}
      `}</style>

      {/* ── NAV — void ── */}
      <div style={{position:"sticky",top:0,zIndex:100,background:T.void,borderBottom:`1px solid ${T.wire}`,height:64,display:"flex",alignItems:"center"}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"0 40px",width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:FONT_DISPLAY,fontSize:26,color:T.gold,letterSpacing:"0.14em",fontWeight:500}}>RŌM</div>
          <div style={{display:"flex",gap:20,alignItems:"center"}}>
            {pendingCount>0 && (
              <div onClick={()=>{setTab("Bookings");setBookingFilter("pending");}} style={{display:"flex",alignItems:"center",gap:8,background:T.goldGlow,border:`1px solid ${T.gold}`,borderRadius:20,padding:"5px 12px",cursor:"pointer"}}>
                <span style={{fontFamily:FONT_BODY,fontSize:12,fontWeight:700,color:T.gold}}>{pendingCount} booking{pendingCount!==1?"s":""} need your response</span>
              </div>
            )}
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:T.steel,border:`2px solid ${T.gold}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_DISPLAY,fontSize:16,color:T.gold}}>{guide.avatar}</div>
              <div>
                <div style={{fontFamily:FONT_BODY,fontSize:13,fontWeight:700,color:T.parchment}}>{guide.name}</div>
                <div style={{fontFamily:FONT_BODY,fontSize:11,color:T.silver}}>Guide · {guide.location}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── HEADER — carbon ── */}
      <div style={{background:T.carbon,borderBottom:`1px solid ${T.wire}`}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"28px 40px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
            <div>
              <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>Guide Dashboard</div>
              <h1 style={{fontFamily:FONT_DISPLAY,fontSize:36,color:T.white,fontWeight:400}}>{guide.name}</h1>
            </div>
            <div style={{display:"flex",gap:32,textAlign:"right"}}>
              {[["$"+stats.earningsThisMonth.toLocaleString(),"This month"],["$"+(stats.earningsThisMonth-stats.earningsLastMonth>=0?"+":"")+((stats.earningsThisMonth-stats.earningsLastMonth)),"vs last month"],[stats.tripsThisMonth+" trips","This month"]].map(([val,label],i)=>(
                <div key={label+i}>
                  <div style={{fontFamily:FONT_DISPLAY,fontSize:26,color:T.white,fontWeight:300,lineHeight:1}}>{val}</div>
                  <div style={{fontFamily:FONT_BODY,fontSize:11,color:T.silver,marginTop:4}}>{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex"}}>
            {TABS.map(t=>{
              const badge = (t==="Bookings"&&pendingCount) ? pendingCount : (t==="Messages"&&unreadMsgs) ? unreadMsgs : null;
              return (
                <button key={t} onClick={()=>setTab(t)} style={{
                  padding:"14px 20px",background:"none",border:"none",
                  borderBottom:`2px solid ${tab===t?T.gold:"transparent"}`,
                  fontFamily:FONT_BODY,fontSize:13,fontWeight:tab===t?700:400,
                  color:tab===t?T.gold:T.silver,cursor:"pointer",
                  display:"flex",alignItems:"center",gap:7,
                }}>
                  {t}
                  {badge && <span style={{background:T.gold,color:T.ink,borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>{badge}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── BODY — gunmetal ── */}
      <div style={{background:T.gunmetal,minHeight:"calc(100vh - 170px)"}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"36px 40px 80px"}}>

          {/* ── OVERVIEW ── */}
          {tab==="Overview" && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
              {/* Stats row */}
              {[
                ["◎","Total earnings this month",`$${stats.earningsThisMonth.toLocaleString()}`,`+$${stats.earningsThisMonth-stats.earningsLastMonth} vs last month`],
                ["◷","Trips this month",stats.tripsThisMonth,`${stats.tripsAllTime} all time`],
                ["★","Average rating",stats.avgRating,`${stats.reviewCount || 0} reviews`],
                ["◉","Response rate",`${stats.responseRate}%`,"Goal: 95%+"],
                ["◈","Profile views",stats.profileViews,"This month"],
                ["✦","Conversion rate",`${stats.conversionRate}%`,"Views to bookings"],
              ].map(([icon,label,val,sub])=>(
                <div key={label} style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:"20px 22px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                    <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em"}}>{label}</div>
                    <span style={{color:T.gold,fontSize:16}}>{icon}</span>
                  </div>
                  <div style={{fontFamily:FONT_DISPLAY,fontSize:32,color:T.white,fontWeight:300,lineHeight:1,marginBottom:6}}>{val}</div>
                  <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver}}>{sub}</div>
                </div>
              ))}

              {/* Earnings chart — spans 2 cols */}
              <div style={{gridColumn:"1 / 3",background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:24}}>
                <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:20}}>Earnings — Last 7 Months</div>
                <EarningsChart data={EARNINGS_MONTHLY}/>
              </div>

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

              {/* Recent messages */}
              <div style={{gridColumn:"1 / -1",background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,overflow:"hidden"}}>
                <div style={{background:T.void,padding:"14px 20px",borderBottom:`1px solid ${T.wire}`,display:"flex",justifyContent:"space-between"}}>
                  <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em"}}>Recent Messages</div>
                  <div onClick={()=>setTab("Messages")} style={{fontFamily:FONT_BODY,fontSize:12,color:T.gold,cursor:"pointer",fontWeight:600}}>View all →</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:0}}>
                  {MESSAGES.map((m,i)=>(
                    <div key={m.id} style={{padding:"16px 20px",borderRight:i<2?`1px solid ${T.wire}`:"none",cursor:"pointer",background:m.unread?T.lifted:T.steel}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.lifted}
                      onMouseLeave={e=>e.currentTarget.style.background=m.unread?T.lifted:T.steel}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                        <div style={{fontFamily:FONT_BODY,fontSize:13,fontWeight:m.unread?700:500,color:T.parchment}}>{m.guest}</div>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{fontFamily:FONT_BODY,fontSize:11,color:T.muted}}>{m.time}</div>
                          {m.unread&&<div style={{width:7,height:7,borderRadius:"50%",background:T.gold}}/>}
                        </div>
                      </div>
                      {m.booking&&<div style={{fontFamily:FONT_BODY,fontSize:11,color:T.gold,marginBottom:5,fontWeight:600}}>{m.booking}</div>}
                      <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.preview}</div>
                    </div>
                  ))}
                </div>
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
          {tab==="Calendar" && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:32,alignItems:"start"}}>
              <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:28}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
                  <div style={{fontFamily:FONT_DISPLAY,fontSize:26,color:T.white}}>{MONTHS[calMonth]} {calYear}</div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>{if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);}} style={{background:T.lifted,border:`1px solid ${T.wire}`,borderRadius:4,color:T.ash,padding:"7px 14px",cursor:"pointer"}}>←</button>
                    <button onClick={()=>{if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);}} style={{background:T.lifted,border:`1px solid ${T.wire}`,borderRadius:4,color:T.ash,padding:"7px 14px",cursor:"pointer"}}>→</button>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8}}>
                  {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} style={{textAlign:"center",fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.muted,padding:"6px 0"}}>{d}</div>)}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
                  {calCells.map((day,i)=>{
                    if(!day) return <div key={i}/>;
                    const fullDate=`${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                    const isBooked=bookedDates.includes(fullDate);
                    const isBlocked=blockedDates.includes(fullDate);
                    const today=new Date(); today.setHours(0,0,0,0);
                    const isPast=new Date(fullDate+"T12:00:00")<today;
                    return (
                      <div key={i} onClick={()=>!isBooked&&!isPast&&toggleBlockDate(fullDate)} style={{
                        padding:"10px 4px",textAlign:"center",
                        fontFamily:FONT_BODY,fontSize:13,
                        background:isBooked?"#1a3a5a":isBlocked?T.lifted:"transparent",
                        color:isPast?T.rim:isBooked?"#aac8f0":isBlocked?T.muted:T.ash,
                        borderRadius:5,cursor:isPast||isBooked?"default":"pointer",
                        border:`1px solid ${isBooked?"#2a4a7a":isBlocked?T.gold:"transparent"}`,
                        opacity:isPast?0.3:1,
                        title:isPast?"Past date":isBooked?"Booked":isBlocked?"Click to unblock":"Click to block",
                      }}>{day}</div>
                    );
                  })}
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <SectionCard title="Calendar Key">
                  {[["#2a4a7a","Booked dates"],["#272c31","Blocked / unavailable"],["transparent","Available"]].map(([bg,label])=>(
                    <div key={label} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                      <div style={{width:14,height:14,borderRadius:3,background:bg,border:`1px solid ${T.wire}`}}/>
                      <span style={{fontFamily:FONT_BODY,fontSize:13,color:T.ash}}>{label}</span>
                    </div>
                  ))}
                </SectionCard>
                <SectionCard title="This Month">
                  {[["Trips booked",String(bookedDates.length)],["Days blocked",String(blockedDates.length)]].map(([l,v])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                      <span style={{fontFamily:FONT_BODY,fontSize:13,color:T.silver}}>{l}</span>
                      <span style={{fontFamily:FONT_BODY,fontSize:13,fontWeight:700,color:T.parchment}}>{v}</span>
                    </div>
                  ))}
                </SectionCard>
                <SectionCard title="Upcoming Trips">
                  {bookings.filter(b=>b.status==="confirmed").map(b=>(
                    <div key={b.id} onClick={()=>setActiveBooking(b)} style={{padding:"10px 0",borderBottom:`1px solid ${T.rim}`,cursor:"pointer"}}>
                      <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.parchment,fontWeight:600,marginBottom:3}}>{b.date}</div>
                      <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver}}>{b.guest} · {b.package}</div>
                    </div>
                  ))}
                </SectionCard>
              </div>
            </div>
          )}

          {/* ── PACKAGES ── */}
          {tab==="Packages" && (
            <div style={{maxWidth:800}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
                <div style={{fontFamily:FONT_DISPLAY,fontSize:32,color:T.white,fontWeight:400}}>Your Packages</div>
                <GoldBtn onClick={()=>alert("Package editor — coming soon.")}>+ Add Package</GoldBtn>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {packages.map(p=>(
                  <div key={p.id} style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:"20px 24px",display:"grid",gridTemplateColumns:"1fr auto",gap:20,alignItems:"center"}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                        <div style={{fontFamily:FONT_DISPLAY,fontSize:22,color:T.white,fontWeight:400}}>{p.title}</div>
                        <span style={{fontFamily:FONT_BODY,fontSize:10,fontWeight:700,color:p.active?"#6aaa84":"#aa7a7a",background:p.active?T.greenGlow:T.redGlow,border:`1px solid ${p.active?T.green:T.red}`,borderRadius:3,padding:"2px 8px"}}>{p.active?"ACTIVE":"INACTIVE"}</span>
                      </div>
                      <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.silver,marginBottom:8}}>{p.duration} · ${p.price} {p.priceType==="person"?"per person":"flat rate"}</div>
                      <div style={{display:"flex",gap:16}}>
                        <span style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver}}>{p.bookingsCount} bookings</span>
                        <div style={{display:"flex",alignItems:"center",gap:4}}><Stars rating={p.rating} size={11}/><span style={{fontFamily:FONT_BODY,fontSize:12,color:T.parchment,fontWeight:700}}>{p.rating}</span></div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <GoldBtn small outline onClick={()=>alert("Edit package — coming soon.")}>Edit</GoldBtn>
                      <button onClick={()=>setPackages(ps=>ps.map(pkg=>pkg.id===p.id?{...pkg,active:!pkg.active}:pkg))}
                        style={{background:T.lifted,border:`1px solid ${T.wire}`,borderRadius:5,padding:"7px 12px",fontFamily:FONT_BODY,fontSize:12,color:T.silver,cursor:"pointer"}}>
                        {p.active?"Pause":"Activate"}
                      </button>
                    </div>
                  </div>
                ))}
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
          {tab==="Earnings" && (
            <div style={{maxWidth:900}}>
              <div style={{fontFamily:FONT_DISPLAY,fontSize:32,color:T.white,fontWeight:400,marginBottom:28}}>Earnings</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:28}}>
                {[["This month",`$${stats.earningsThisMonth.toLocaleString()}`,`${stats.tripsThisMonth} trips`],["Last month",`$${stats.earningsLastMonth.toLocaleString()}`,"6 trips"],["All time",`$${(41280).toLocaleString()}`,`${stats.tripsAllTime} trips`],["Avg per trip","$607","Based on last 12 months"]].map(([label,val,sub])=>(
                  <div key={label} style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:"20px 22px"}}>
                    <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>{label}</div>
                    <div style={{fontFamily:FONT_DISPLAY,fontSize:36,color:T.white,fontWeight:300,lineHeight:1,marginBottom:6}}>{val}</div>
                    <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver}}>{sub}</div>
                  </div>
                ))}
              </div>
              <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:28,marginBottom:24}}>
                <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:20}}>Monthly Earnings</div>
                <EarningsChart data={EARNINGS_MONTHLY}/>
              </div>
              <SectionCard title="Payout Schedule">
                <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.ash,lineHeight:1.7,marginBottom:16}}>Earnings are paid out within 2 business days of trip completion via Stripe. The 25% deposit is held by Rōm and released to you after the trip occurs. The balance is auto-charged to the guest 14 days before the trip date and released to you on trip day.</div>
                <GoldBtn small outline onClick={()=>alert("Stripe dashboard — redirecting.")}>View Stripe Dashboard →</GoldBtn>
              </SectionCard>
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
                        <img src={photoUrls.profile} alt="Profile" style={{width:72,height:72,borderRadius:"50%",objectFit:"cover",border:`2px solid ${T.gold}`}}/>
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
                      <img src={photoUrls.cover} alt="Cover" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
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
                            <img src={photoUrls.gallery[i]} alt={`Gallery ${i+1}`} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
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
        <BookingPanel booking={activeBooking} onClose={()=>setActiveBooking(null)} onAccept={accept} onDecline={decline}/>
      )}
    </>
  );
}
