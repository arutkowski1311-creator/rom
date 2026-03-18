"use client";
import { useState, useEffect, useRef } from "react";

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => { const c=()=>setM(window.innerWidth<768); c(); window.addEventListener("resize",c); return()=>window.removeEventListener("resize",c); },[]);
  return m;
}
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
  goldDk:   "#a07828",
  goldGlow: "#c9973a28",
  ink:      "#080a0b",
};
const FONT_DISPLAY = "'Cormorant Garamond', Georgia, serif";
const FONT_BODY    = "'Barlow', system-ui, sans-serif";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const FEATURED_GUIDES = [
  { id:1, name:"James Whitfield", location:"Bozeman, MT", category:"Fly Fishing", tagline:"14 years on the Madison, Gallatin, and Yellowstone.", rating:4.97, reviewCount:143, price:275, verified:true },
  { id:2, name:"Sasha Okafor", location:"Moab, UT", category:"Rock Climbing", tagline:"Sandstone, multipitch, and desert towers. All skill levels.", rating:4.99, reviewCount:201, price:225, verified:true },
  { id:3, name:"Anya Petrov", location:"Kenai, AK", category:"Fly Fishing", tagline:"Alaska salmon runs, remote float trips, and backcountry brook trout.", rating:4.93, reviewCount:72, price:650, verified:true },
  { id:4, name:"Tomás Herrera", location:"Kauai, HI", category:"Diving", tagline:"Hawaiian reef diving, night dives, and free-diving instruction.", rating:4.96, reviewCount:118, price:185, verified:true },
];

const CATEGORIES = [
  { label:"Fly Fishing",     icon:"🎣", count:48 },
  { label:"Hunting",         icon:"🦌", count:34 },
  { label:"Rock Climbing",   icon:"🧗", count:27 },
  { label:"Surfing",         icon:"🏄", count:31 },
  { label:"Kayaking",        icon:"🚣", count:22 },
  { label:"Diving",          icon:"🤿", count:19 },
  { label:"Hiking",          icon:"🥾", count:56 },
  { label:"Wildlife",        icon:"🦅", count:14 },
];

const DESTINATIONS = [
  { name:"Montana",         sub:"Fly Fishing · Hunting · Hiking",       gradient:"linear-gradient(135deg, #152018 0%, #0b1822 100%)" },
  { name:"Alaska",          sub:"Salmon · Bears · Backcountry",          gradient:"linear-gradient(135deg, #0a1a2a 0%, #0d1f14 100%)" },
  { name:"Moab, Utah",      sub:"Rock Climbing · Canyons · MTB",         gradient:"linear-gradient(135deg, #2a1408 0%, #1a0e04 100%)" },
  { name:"Hawaii",          sub:"Diving · Surfing · Fishing",            gradient:"linear-gradient(135deg, #081a1a 0%, #0a1424 100%)" },
  { name:"Maine Coast",     sub:"Kayaking · Sailing · Wildlife",         gradient:"linear-gradient(135deg, #0a1420 0%, #10181e 100%)" },
  { name:"Wyoming",         sub:"Elk Hunting · Fly Fishing · Hiking",    gradient:"linear-gradient(135deg, #14200e 0%, #0e1a18 100%)" },
];

const STATS = [
  { value:"340+", label:"Verified guides" },
  { value:"62",   label:"Destinations" },
  { value:"4.96", label:"Average rating" },
  { value:"8,200+", label:"Trips booked" },
];

function Stars({ rating, size=12 }) {
  return <span>{[1,2,3,4,5].map(i=><span key={i} style={{fontSize:size,color:i<=Math.round(rating)?T.gold:T.rim}}>★</span>)}</span>;
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function Nav({ scrolled, user, userRole }) {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const signOut = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    window.location.reload();
  };
  const dashboardPath = userRole === "guide" ? "/guide/dashboard" : "/dashboard";
  return (
    <>
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,height:64,background:scrolled||menuOpen?T.void:"transparent",borderBottom:`1px solid ${scrolled?T.wire:"transparent"}`,transition:"all 0.35s",display:"flex",alignItems:"center"}}>
      <div style={{maxWidth:1200,margin:"0 auto",padding:"0 20px",width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontFamily:FONT_DISPLAY,fontSize:28,color:T.gold,letterSpacing:"0.16em",fontWeight:500,cursor:"pointer"}} onClick={()=>window.location.href="/"}>RŌM</div>
        {!isMobile && (
          <div style={{display:"flex",gap:32,alignItems:"center"}}>
            {[["Explore","/search"],["How It Works","#how-it-works"]].map(([item,href])=>(
              <span key={item} onClick={()=>window.location.href=href} style={{fontFamily:FONT_BODY,fontSize:14,color:scrolled?T.ash:T.parchment,cursor:"pointer"}}>{item}</span>
            ))}
            <div style={{width:1,height:18,background:T.wire}}/>
            {user ? (
              <div style={{display:"flex",gap:16,alignItems:"center"}}>
                <span onClick={()=>window.location.href=dashboardPath} style={{fontFamily:FONT_BODY,fontSize:14,color:T.ash,cursor:"pointer"}}>Dashboard</span>
                <span onClick={signOut} style={{fontFamily:FONT_BODY,fontSize:14,color:T.silver,cursor:"pointer"}}>Sign out</span>
              </div>
            ) : (
              <>
                <span onClick={()=>window.location.href="/login"} style={{fontFamily:FONT_BODY,fontSize:14,color:scrolled?T.ash:T.parchment,cursor:"pointer"}}>Sign in</span>
                <button onClick={()=>window.location.href="/signup"} style={{background:T.gold,border:"none",borderRadius:6,padding:"10px 22px",fontFamily:FONT_BODY,fontSize:14,fontWeight:700,color:T.ink,cursor:"pointer"}}>Become a Guide</button>
              </>
            )}
          </div>
        )}
        {isMobile && (
          <button onClick={()=>setMenuOpen(o=>!o)} style={{background:"none",border:"none",cursor:"pointer",padding:8,display:"flex",flexDirection:"column",gap:5}}>
            <div style={{width:22,height:2,background:T.parchment,borderRadius:2}}/>
            <div style={{width:22,height:2,background:T.parchment,borderRadius:2}}/>
            <div style={{width:22,height:2,background:T.parchment,borderRadius:2}}/>
          </button>
        )}
      </div>
    </div>
    {isMobile && menuOpen && (
      <div style={{position:"fixed",top:64,left:0,right:0,background:T.void,borderBottom:`1px solid ${T.wire}`,padding:20,display:"flex",flexDirection:"column",gap:16,zIndex:99}}>
        {[["Explore","/search"],["How It Works","#how-it-works"]].map(([item,href])=>(
          <span key={item} onClick={()=>{window.location.href=href;setMenuOpen(false);}} style={{fontFamily:FONT_BODY,fontSize:16,color:T.ash,cursor:"pointer",padding:"10px 0",borderBottom:`1px solid ${T.rim}`}}>{item}</span>
        ))}
        {user ? (
          <>
            <span onClick={()=>window.location.href=dashboardPath} style={{fontFamily:FONT_BODY,fontSize:16,color:T.ash,cursor:"pointer",padding:"10px 0"}}>Dashboard</span>
            <span onClick={signOut} style={{fontFamily:FONT_BODY,fontSize:16,color:T.silver,cursor:"pointer",padding:"10px 0"}}>Sign out</span>
          </>
        ) : (
          <>
            <span onClick={()=>window.location.href="/login"} style={{fontFamily:FONT_BODY,fontSize:16,color:T.ash,cursor:"pointer",padding:"10px 0"}}>Sign in</span>
            <button onClick={()=>window.location.href="/signup"} style={{background:T.gold,border:"none",borderRadius:6,padding:"13px",fontFamily:FONT_BODY,fontSize:14,fontWeight:700,color:T.ink,cursor:"pointer",width:"100%"}}>Become a Guide</button>
          </>
        )}
      </div>
    )}
    </>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const suggestions = ["Fly fishing in Montana","Elk hunting in Wyoming","Rock climbing in Moab","Surfing in Hawaii","Kayaking in Maine"];
  const [activeSug, setActiveSug] = useState(0);

  useEffect(()=>{
    const t = setInterval(()=>setActiveSug(i=>(i+1)%suggestions.length), 2800);
    return ()=>clearInterval(t);
  },[]);

  return (
    <div style={{position:"relative", height:"100vh", minHeight:640, overflow:"hidden", display:"flex", alignItems:"center"}}>
      {/* Background */}
      <div style={{position:"absolute", inset:0, background:"linear-gradient(160deg, #101e12 0%, #0a1824 40%, #1a1206 100%)", backgroundImage:"url(https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1600&q=80)", backgroundSize:"cover", backgroundPosition:"center", backgroundBlendMode:"overlay"}}>
        <div style={{position:"absolute", inset:0, backgroundImage:`radial-gradient(ellipse at 20% 60%, ${T.gold}30 0%, transparent 45%), radial-gradient(ellipse at 75% 25%, #1a3a5038 0%, transparent 40%), radial-gradient(ellipse at 55% 85%, #0a2a1828 0%, transparent 35%)`}}/>
        {/* Grain texture */}
        <div style={{position:"absolute", inset:0, opacity:0.025, backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundSize:"200px 200px"}}/>
        {/* Bottom fade */}
        <div style={{position:"absolute", bottom:0, left:0, right:0, height:"45%", background:`linear-gradient(to top, ${T.void} 0%, transparent 100%)`}}/>
      </div>

      {/* Content */}
      <div style={{position:"relative", maxWidth:1200, margin:"0 auto", padding:"0 20px", width:"100%"}}>
        {/* Eyebrow */}
        <div style={{display:"inline-flex", alignItems:"center", gap:10, background:"rgba(0,0,0,0.4)", backdropFilter:"blur(12px)", border:`1px solid ${T.wire}`, borderRadius:20, padding:"7px 16px", marginBottom:32}}>
          <span style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.gold, textTransform:"uppercase", letterSpacing:"0.1em"}}>340+ verified guides</span>
          <div style={{width:3, height:3, borderRadius:"50%", background:T.wire}}/>
          <span style={{fontFamily:FONT_BODY, fontSize:11, color:T.silver}}>62 destinations worldwide</span>
        </div>

        {/* Headline */}
        <h1 style={{fontFamily:FONT_DISPLAY, fontSize:"clamp(52px, 7vw, 88px)", fontWeight:400, color:T.white, lineHeight:1.0, margin:"0 0 20px", maxWidth:760, textShadow:"0 4px 40px rgba(0,0,0,0.6)"}}>
          The world's best<br/>
          <span style={{color:T.gold, fontStyle:"italic"}}>adventure guides,</span><br/>
          in one place.
        </h1>

        <p style={{fontFamily:FONT_BODY, fontSize:18, color:T.parchment, marginBottom:40, maxWidth:520, lineHeight:1.65, textShadow:"0 1px 12px rgba(0,0,0,0.7)"}}>
          Book directly with verified local guides — fly fishing, hunting, climbing, diving, and more. No middlemen. No markups. Just the real thing.
        </p>

        {/* Search bar */}
        <div style={{maxWidth:620, position:"relative"}}>
          <div style={{
            display:"flex", alignItems:"center",
            background: focused ? T.steel : "rgba(15,18,20,0.85)",
            backdropFilter:"blur(20px)",
            border:`1.5px solid ${focused ? T.gold : T.wire}`,
            borderRadius:10, overflow:"visible",
            transition:"all 0.2s",
            boxShadow: focused ? `0 0 0 4px ${T.goldGlow}` : "0 8px 40px rgba(0,0,0,0.5)",
          }}>
            <span style={{padding:"0 16px 0 20px", fontSize:18, color:T.muted, flexShrink:0}}>⌕</span>
            <input
              value={query} onChange={e=>setQuery(e.target.value)}
              onFocus={()=>setFocused(true)} onBlur={()=>setTimeout(()=>setFocused(false),150)}
              placeholder={suggestions[activeSug]}
              style={{flex:1, background:"transparent", border:"none", outline:"none", fontFamily:FONT_BODY, fontSize:15, color:T.parchment, padding:"18px 0"}}
            />
            <button onClick={()=>window.location.href=`/search${query?`?q=${encodeURIComponent(query)}`:""}`} style={{margin:"8px", padding:"10px 24px", background:T.gold, border:"none", borderRadius:7, fontFamily:FONT_BODY, fontSize:14, fontWeight:700, color:T.ink, cursor:"pointer", flexShrink:0, whiteSpace:"nowrap"}}>
              Find a Guide
            </button>
          </div>

          {/* Quick category chips */}
          <div style={{display:"flex", gap:8, marginTop:16, flexWrap:"wrap"}}>
            {["Fly Fishing","Hunting","Rock Climbing","Surfing","Kayaking"].map(cat=>(
              <button key={cat} onClick={()=>window.location.href=`/search?category=${encodeURIComponent(cat)}`} style={{background:"rgba(0,0,0,0.45)", backdropFilter:"blur(8px)", border:`1px solid ${T.wire}`, borderRadius:20, padding:"6px 14px", fontFamily:FONT_BODY, fontSize:12, color:T.ash, cursor:"pointer", transition:"all 0.15s"}}
                onMouseEnter={e=>{e.target.style.borderColor=T.gold;e.target.style.color=T.gold;}}
                onMouseLeave={e=>{e.target.style.borderColor=T.wire;e.target.style.color=T.ash;}}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="hide-mobile" style={{position:"absolute", bottom:36, left:"50%", transform:"translateX(-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:8}}>
        <div style={{fontFamily:FONT_BODY, fontSize:10, color:T.muted, letterSpacing:"0.12em", textTransform:"uppercase"}}>Scroll to explore</div>
        <div style={{width:1, height:32, background:`linear-gradient(to bottom, ${T.wire}, transparent)`}}/>
      </div>
    </div>
  );
}

// ─── STATS BAR ────────────────────────────────────────────────────────────────
function StatsBar() {
  const isMobile = useIsMobile();
  return (
    <div style={{background:T.carbon, borderTop:`1px solid ${T.wire}`, borderBottom:`1px solid ${T.wire}`}}>
      <div style={{maxWidth:1200, margin:"0 auto", padding:"0 20px", display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)"}}>
        {STATS.map((s,i)=>(
          <div key={s.label} style={{padding:"24px 0", textAlign:"center", borderRight:!isMobile&&i<3?`1px solid ${T.wire}`:"none", borderBottom:isMobile&&i<2?`1px solid ${T.wire}`:"none"}}>
            <div style={{fontFamily:FONT_DISPLAY, fontSize:isMobile?26:38, color:T.white, fontWeight:300, lineHeight:1, marginBottom:4}}>{s.value}</div>
            <div style={{fontFamily:FONT_BODY, fontSize:10, color:T.silver, textTransform:"uppercase", letterSpacing:"0.06em"}}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SECTION WRAPPER ──────────────────────────────────────────────────────────
function Section({ children, bg=T.gunmetal, style={} }) {
  return (
    <div style={{background:bg, borderBottom:`1px solid ${T.wire}`, ...style}}>
      <div style={{maxWidth:1200, margin:"0 auto", padding:"60px 20px"}}>
        {children}
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, sub, center }) {
  return (
    <div style={{marginBottom:48, textAlign:center?"center":"left", maxWidth:center?640:"none", margin:center?"0 auto 48px":"0 0 48px"}}>
      {eyebrow && <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.gold, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:12}}>{eyebrow}</div>}
      <h2 style={{fontFamily:FONT_DISPLAY, fontSize:"clamp(32px,4vw,52px)", color:T.white, fontWeight:400, lineHeight:1.1, margin:"0 0 16px"}}>{title}</h2>
      {sub && <p style={{fontFamily:FONT_BODY, fontSize:16, color:T.ash, lineHeight:1.65, margin:0}}>{sub}</p>}
    </div>
  );
}

// ─── FEATURED GUIDES ──────────────────────────────────────────────────────────
function GuideCard({ guide }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      onClick={()=>window.location.href=`/guides/${guide.slug||guide.id}`} style={{
        background: hov ? T.lifted : T.steel,
        border:`1px solid ${hov ? T.wire : T.wire}`,
        borderTop:`2px solid ${hov ? T.gold : T.rim}`,
        borderRadius:10, overflow:"hidden", cursor:"pointer",
        transition:"all 0.18s", transform:hov?"translateY(-3px)":"translateY(0)",
        boxShadow:hov?"0 12px 40px rgba(0,0,0,0.5)":"0 2px 12px rgba(0,0,0,0.3)",
      }}>
      <div style={{height:180, background:`linear-gradient(135deg, #152018 0%, #0b1a24 100%)`, position:"relative"}}>
        <div style={{position:"absolute", inset:0, backgroundImage:`radial-gradient(ellipse at 30% 70%, ${T.gold}22 0%, transparent 55%)`}}/>
        <div style={{position:"absolute", top:14, left:14, display:"flex", gap:6}}>
          <span style={{fontFamily:FONT_BODY, fontSize:10, fontWeight:700, color:T.gold, background:T.goldGlow, border:`1px solid ${T.gold}`, borderRadius:3, padding:"3px 9px"}}>{guide.category}</span>
          {guide.verified && <span style={{fontFamily:FONT_BODY, fontSize:10, fontWeight:700, color:T.ash, background:"rgba(0,0,0,0.5)", border:`1px solid ${T.wire}`, borderRadius:3, padding:"3px 9px"}}>✓ VERIFIED</span>}
        </div>
        <div style={{position:"absolute", bottom:14, right:14}}>
          <div style={{fontFamily:FONT_DISPLAY, fontSize:24, color:T.gold, fontWeight:500, textAlign:"right", lineHeight:1}}>${guide.price}</div>
          <div style={{fontFamily:FONT_BODY, fontSize:10, color:T.silver, textAlign:"right"}}>from / person</div>
        </div>
      </div>
      <div style={{padding:"18px 20px 22px"}}>
        <div style={{fontFamily:FONT_DISPLAY, fontSize:22, color:T.white, fontWeight:400, marginBottom:4, lineHeight:1.1}}>{guide.name}</div>
        <div style={{fontFamily:FONT_BODY, fontSize:11, color:T.silver, marginBottom:10}}>📍 {guide.location}</div>
        <div style={{fontFamily:FONT_BODY, fontSize:13, color:T.ash, lineHeight:1.55, marginBottom:14}}>{guide.tagline}</div>
        <div style={{display:"flex", alignItems:"center", gap:7, paddingTop:14, borderTop:`1px solid ${T.rim}`}}>
          <Stars rating={guide.rating} size={12}/>
          <span style={{fontFamily:FONT_BODY, fontSize:13, fontWeight:700, color:T.parchment}}>{guide.rating}</span>
          <span style={{fontFamily:FONT_BODY, fontSize:12, color:T.silver}}>({guide.reviewCount} reviews)</span>
          <div style={{flex:1}}/>
          <span style={{fontFamily:FONT_BODY, fontSize:12, color:T.gold, fontWeight:600}}>View profile →</span>
        </div>
      </div>
    </div>
  );
}

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
function CategoryGrid() {
  return (
    <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:12}}>
      {CATEGORIES.map(cat=>(
        <div key={cat.label} onClick={()=>window.location.href=`/search?category=${encodeURIComponent(cat.label)}`}
          style={{background:T.steel, border:`1px solid ${T.rim}`, borderRadius:8, padding:"24px 20px", cursor:"pointer", display:"flex", flexDirection:"column", gap:10}}>
          <div style={{fontSize:28}}>{cat.icon}</div>
          <div style={{fontFamily:FONT_BODY, fontSize:14, fontWeight:700, color:T.parchment}}>{cat.label}</div>
          <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.silver}}>{cat.count} guides available</div>
          <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.gold, fontWeight:600}}>Explore →</div>
        </div>
      ))}
    </div>
  );
}

// ─── DESTINATIONS ─────────────────────────────────────────────────────────────
function DestinationGrid() {
  return (
    <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14}}>
      {DESTINATIONS.map((dest,i)=>(
        <div key={dest.name} onClick={()=>window.location.href=`/search?destination=${encodeURIComponent(dest.name)}`}
          style={{background:dest.gradient, border:`1px solid ${T.rim}`, borderRadius:10, padding:"32px 28px", cursor:"pointer", position:"relative", overflow:"hidden", minHeight:180}}>
          <div style={{position:"absolute", inset:0, backgroundImage:`radial-gradient(ellipse at 80% 20%, ${T.gold}15 0%, transparent 50%)`}}/>
          <div style={{position:"relative"}}>
            <div style={{fontFamily:FONT_DISPLAY, fontSize:28, color:T.white, fontWeight:400, marginBottom:6, lineHeight:1.1}}>{dest.name}</div>
            <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.silver, marginBottom:12}}>{dest.sub}</div>
            <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.gold, fontWeight:700}}>Browse guides →</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { num:"01", title:"Search your adventure", body:"Browse by destination, activity, or guide name. Filter by price, dates, and group size. Every guide is verified and reviewed." },
    { num:"02", title:"Book directly", body:"Message the guide before booking. When you're ready, secure your date with a 25% deposit. No hidden fees — you see the full price upfront." },
    { num:"03", title:"Go do the thing", body:"Your guide handles the details. You show up and have the best day. Leave a review so the next guest knows what they're getting into." },
  ];
  return (
    <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:16}}>
      {steps.map((s,i)=>(
        <div key={s.num} style={{padding:"40px 36px", background:"rgba(255,255,255,0.04)", border:`2px solid ${T.wire}`, borderTop:`2px solid ${T.gold}`, borderRadius:10}}>
          <div style={{fontFamily:FONT_DISPLAY, fontSize:64, color:T.gold, fontWeight:300, lineHeight:1, marginBottom:20, opacity:0.35, userSelect:"none"}}>{s.num}</div>
          <div style={{fontFamily:FONT_DISPLAY, fontSize:28, color:T.white, fontWeight:400, marginBottom:16, lineHeight:1.2}}>{s.title}</div>
          <div style={{fontFamily:FONT_BODY, fontSize:15, color:T.parchment, lineHeight:1.8}}>{s.body}</div>
        </div>
      ))}
    </div>
  );
}

// ─── TRUST BAR ────────────────────────────────────────────────────────────────
function TrustBar() {
  const items = [
    ["◬","Every guide is verified","We review insurance, licensing, and credentials before any guide goes live."],
    ["◉","Transparent pricing","The price you see is what you pay. No booking surprises, no inflated platform fees."],
    ["◷","Fast response guarantee","Guides on Rōm respond within 2 hours or their listing is flagged."],
    ["✦","Protected booking","25% deposit holds your date. We mediate any disputes — guests and guides both."],
  ];
  return (
    <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:0}}>
      {items.map(([icon,title,body],i)=>(
        <div key={title} style={{padding:"40px 32px", borderRight:i<3?`1px solid ${T.wire}`:"none", textAlign:"center"}}>
          <div style={{fontSize:32, color:T.gold, marginBottom:16}}>{icon}</div>
          <div style={{fontFamily:FONT_BODY, fontSize:16, fontWeight:700, color:T.white, marginBottom:10}}>{title}</div>
          <div style={{fontFamily:FONT_BODY, fontSize:14, color:T.ash, lineHeight:1.7}}>{body}</div>
        </div>
      ))}
    </div>
  );
}

// ─── GUIDE CTA ────────────────────────────────────────────────────────────────
function GuideCTA() {
  return (
    <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:0}}>
      {/* Left — visual */}
      <div style={{background:"linear-gradient(135deg, #152018 0%, #0b1a24 60%, #1a1206 100%)", position:"relative", overflow:"hidden"}}>
        <div style={{position:"absolute", inset:0, backgroundImage:`radial-gradient(ellipse at 30% 60%, ${T.gold}28 0%, transparent 50%)`}}/>
        <div style={{position:"relative", padding:"56px 48px", height:"100%", display:"flex", flexDirection:"column", justifyContent:"center"}}>
          <div style={{fontFamily:FONT_DISPLAY, fontSize:48, color:T.white, fontWeight:400, lineHeight:1.05, marginBottom:16}}>
            Your territory.<br/>
            <span style={{color:T.gold, fontStyle:"italic"}}>Your business.</span>
          </div>
          <div style={{fontFamily:FONT_BODY, fontSize:15, color:T.ash, lineHeight:1.7, maxWidth:380}}>
            Rōm was built around one idea: guides should keep everything they earn. We charge guests a 15% service fee — your listed price is your payout, every time.
          </div>
        </div>
      </div>

      {/* Right — reasons */}
      <div style={{background:T.steel, padding:"56px 48px", display:"flex", flexDirection:"column", justifyContent:"center"}}>
        <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.gold, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:16}}>Why guide with Rōm</div>
        <div style={{display:"flex", flexDirection:"column", gap:0}}>
          {[
            ["100% of your listed price","We never touch your earnings. The guest pays the fee — you keep every dollar you charge."],
            ["Verified-only marketplace","No race to the bottom. Every guide is manually approved. Your competition is other professionals."],
            ["Rōm Compass growth program","Optional $99/month subscription that handles video, social, email, and seasonal campaigns for you."],
            ["No long-term contracts","List today, adjust anytime. Your packages, your calendar, your rules."],
          ].map(([title,body],i)=>(
            <div key={title} style={{padding:"20px 0", borderBottom: i<3?`1px solid ${T.rim}`:"none", display:"flex", gap:16}}>
              <span style={{color:T.gold, fontSize:14, flexShrink:0, marginTop:2}}>✦</span>
              <div>
                <div style={{fontFamily:FONT_BODY, fontSize:14, fontWeight:700, color:T.parchment, marginBottom:4}}>{title}</div>
                <div style={{fontFamily:FONT_BODY, fontSize:13, color:T.silver, lineHeight:1.6}}>{body}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{marginTop:32}}>
          <button onClick={()=>window.location.href="/signup"} style={{background:T.gold, border:"none", borderRadius:6, padding:"13px 28px", fontFamily:FONT_BODY, fontSize:14, fontWeight:700, color:T.ink, cursor:"pointer", marginRight:12}}>
            Apply to Guide
          </button>
          <span style={{fontFamily:FONT_BODY, fontSize:13, color:T.silver}}>48hr decision · personal review</span>
        </div>
      </div>
    </div>
  );
}

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────────
function Testimonials() {
  const reviews = [
    { text:"James put me on fish I had no business catching. Best guide day I've ever had, anywhere.", guest:"Mark T.", trip:"Full Day Trophy Hunt · Bozeman, MT", rating:5 },
    { text:"Sasha called the climb perfectly — knew exactly which routes matched our group's skill level. The desert towers at sunset were something I'll never forget.", guest:"Rachel M.", trip:"Sunset Multipitch · Moab, UT", rating:5 },
    { text:"Three days in Yellowstone's backcountry. No crowds. Wild cutthroat trout in streams that didn't appear on any map. Worth every dollar.", guest:"Derek & Amy P.", trip:"3-Day Backcountry · Yellowstone", rating:5 },
  ];
  return (
    <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14}}>
      {reviews.map((r,i)=>(
        <div key={i} style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:10, padding:28}}>
          <div style={{marginBottom:16}}><Stars rating={r.rating} size={15}/></div>
          <p style={{fontFamily:FONT_DISPLAY, fontSize:19, color:T.parchment, lineHeight:1.6, fontStyle:"italic", marginBottom:20}}>"{r.text}"</p>
          <div style={{paddingTop:16, borderTop:`1px solid ${T.rim}`}}>
            <div style={{fontFamily:FONT_BODY, fontSize:13, fontWeight:700, color:T.ash}}>{r.guest}</div>
            <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.silver, marginTop:2}}>{r.trip}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function Footer() {
  const cols = [
    { title:"Explore", links:["All Guides","Destinations","Activity Types","Field Notes","Gift Cards"] },
    { title:"For Guides", links:["Apply to Guide","Rōm Compass","Guide Dashboard","Pricing","Guide Resources"] },
    { title:"Company", links:["About Rōm","How It Works","Trust & Safety","Careers","Press"] },
    { title:"Support", links:["Help Center","Contact Us","Cancellation Policy","Terms of Service","Privacy Policy"] },
  ];
  return (
    <div style={{background:T.void, borderTop:`1px solid ${T.wire}`}}>
      <div style={{maxWidth:1200, margin:"0 auto", padding:"64px 40px 40px"}}>
        {/* Top row */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:32, marginBottom:40}}>
          {/* Brand */}
          <div>
            <div style={{fontFamily:FONT_DISPLAY, fontSize:30, color:T.gold, letterSpacing:"0.14em", marginBottom:16}}>RŌM</div>
            <p style={{fontFamily:FONT_BODY, fontSize:13, color:T.silver, lineHeight:1.7, marginBottom:20, maxWidth:240}}>The world's best adventure guides, in one place. Book directly. No middlemen.</p>
            <div style={{display:"flex", gap:10}}>
              {["Instagram","TikTok","YouTube"].map(s=>(
                <div key={s} style={{width:34, height:34, borderRadius:6, background:T.steel, border:`1px solid ${T.wire}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer"}}>
                  <span style={{fontFamily:FONT_BODY, fontSize:10, color:T.silver}}>{s[0]}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Link cols */}
          {cols.map(col=>(
            <div key={col.title}>
              <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.parchment, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:16}}>{col.title}</div>
              <div style={{display:"flex", flexDirection:"column", gap:10}}>
                {col.links.map(link=>(
                  <span key={link} style={{fontFamily:FONT_BODY, fontSize:13, color:T.silver, cursor:"pointer"}}>{link}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* Bottom row */}
        <div style={{paddingTop:24, borderTop:`1px solid ${T.rim}`, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <span style={{fontFamily:FONT_BODY, fontSize:12, color:T.muted}}>© 2026 Rōm, Inc. All rights reserved.</span>
          <span style={{fontFamily:FONT_BODY, fontSize:12, color:T.muted}}>Built for guides. Trusted by guests.</span>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [featuredGuides, setFeaturedGuides] = useState(FEATURED_GUIDES);

  useEffect(()=>{
    const h=()=>setScrolled(window.scrollY>60);
    window.addEventListener("scroll",h);
    return ()=>window.removeEventListener("scroll",h);
  },[]);

  useEffect(()=>{ loadData(); },[]);

  const loadData = async () => {
    try {
      const supabase = getSupabase();
      // Auth state
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        setUser(u);
        const { data: prof } = await supabase.from("profiles").select("role").eq("id", u.id).single();
        setUserRole(prof?.role || "traveler");
      }
      // Real active guides
      const { data: guides } = await supabase
        .from("guides").select("id, slug, location, category, tagline, rating, review_count, verified, profile_id")
        .eq("status","active").limit(4);
      if (guides?.length > 0) {
        // Get guide names from profiles
        const profileIds = guides.map(g => g.profile_id).filter(Boolean);
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", profileIds);
        const profMap = {};
        (profiles||[]).forEach(p => { profMap[p.id] = p.full_name; });
        // Get min package price per guide
        const guideIds = guides.map(g => g.id);
        const { data: pkgs } = await supabase.from("packages").select("guide_id, price").in("guide_id", guideIds).eq("active", true);
        const priceMap = {};
        (pkgs||[]).forEach(p => {
          if (!priceMap[p.guide_id] || p.price < priceMap[p.guide_id]) priceMap[p.guide_id] = p.price;
        });
        setFeaturedGuides(guides.map(g => ({
          id: g.id,
          slug: g.slug,
          name: profMap[g.profile_id] || "Guide",
          location: g.location || "",
          category: g.category || "Adventure",
          tagline: g.tagline || "",
          rating: parseFloat(g.rating) || 0,
          reviewCount: g.review_count || 0,
          price: priceMap[g.id] || 0,
          verified: g.verified,
        })));
      }
    } catch(e) { console.error("Homepage load error:", e); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=Barlow:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.void};}
        ::placeholder{color:${T.muted};}
        ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:${T.carbon};}::-webkit-scrollbar-thumb{background:${T.wire};border-radius:3px;}
        @media(max-width:768px){.hide-mobile{display:none!important;}}
      `}</style>

      <Nav scrolled={scrolled} user={user} userRole={userRole}/>
      <Hero/>
      <StatsBar/>

      {/* Featured Guides */}
      <Section bg={T.gunmetal}>
        <SectionHeader
          eyebrow="Hand-picked for this week"
          title="Featured guides"
          sub="Every guide on Rōm is manually reviewed and approved. These are some of the best."
        />
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16, marginBottom:36}}>
          {featuredGuides.map(g=><GuideCard key={g.id} guide={g}/>)}
        </div>
        <div style={{textAlign:"center"}}>
          <button onClick={()=>window.location.href="/search"} style={{background:"none", border:`1px solid ${T.wire}`, borderRadius:6, padding:"12px 28px", fontFamily:FONT_BODY, fontSize:14, color:T.ash, cursor:"pointer"}}>
            Browse all guides →
          </button>
        </div>
      </Section>

      {/* Categories */}
      <Section bg={T.carbon}>
        <SectionHeader
          eyebrow="Browse by activity"
          title="Every kind of adventure"
          sub="From backcountry fly fishing to open ocean surfing. If it requires a guide, you'll find the best one here."
          center
        />
        <CategoryGrid/>
      </Section>

      {/* How It Works */}
      <Section bg={T.gunmetal}>
        <SectionHeader eyebrow="Simple by design" title="How Rōm works" center/>
        <HowItWorks/>
      </Section>

      {/* Destinations */}
      <Section bg={T.carbon}>
        <SectionHeader
          eyebrow="Where guides take you"
          title="Top destinations"
          sub="The best guides live where the best experiences happen."
        />
        <DestinationGrid/>
      </Section>

      {/* Trust */}
      <Section bg={T.gunmetal}>
        <SectionHeader eyebrow="Why Rōm" title="Built on trust" center
          sub="We're not a booking engine that happens to have guides. We're a guide marketplace that happens to have great technology."
        />
        <TrustBar/>
      </Section>

      {/* Testimonials */}
      <Section bg={T.carbon}>
        <SectionHeader eyebrow="From the field" title="What guests say" center/>
        <Testimonials/>
      </Section>

      {/* Guide CTA */}
      <div style={{borderBottom:`1px solid ${T.wire}`}}>
        <GuideCTA/>
      </div>

      <Footer/>
    </>
  );
}
