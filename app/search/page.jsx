"use client";
import { useState, useEffect } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";
import { Stars } from "@/app/components/ui";

const CATEGORIES = ["All","Fly Fishing","Hunting","Hiking","Surfing","Rock Climbing","Kayaking","Diving","Wildlife","Photography","Sailing","Camping"];

const CATEGORY_TO_DB = {
  "Fly Fishing":"fishing","Hiking":"hiking","Rock Climbing":"climbing",
  "Kayaking":"kayaking","Wildlife":"wildlife","Photography":"photography",
  "Hunting":"hunting","Surfing":"surfing","Diving":"diving",
  "Sailing":"sailing","Camping":"camping","Skiing":"skiing",
  "Rafting":"rafting","Food Tour":"food","Cultural":"cultural","Offroad":"offroad",
};

const LOCATION_COORDS = {
  "Asheville, NC":    { x: 63, y: 47 },
  "Telluride, CO":    { x: 28, y: 50 },
  "Whitefish, MT":    { x: 20, y: 22 },
  "Lake Placid, NY":  { x: 72, y: 28 },
  "Keene Valley, NY": { x: 73, y: 28 },
  "Bozeman, MT":      { x: 23, y: 25 },
  "Jackson, WY":      { x: 27, y: 35 },
  "Moab, UT":         { x: 25, y: 50 },
  "Encinitas, CA":    { x: 10, y: 62 },
  "Bar Harbor, ME":   { x: 76, y: 22 },
  "Kauai, HI":        { x: 9,  y: 82 },
  "Kenai, AK":        { x: 14, y: 9  },
};

const GUIDES = [
  { id:1, name:"James Whitfield", slug:"james-whitfield", location:"Bozeman, MT", region:"Mountain West", category:"Fly Fishing", tagline:"14 years on the Madison, Gallatin, and Yellowstone.", rating:4.97, reviewCount:143, responseRate:98, price:275, verified:true, yearsExp:14, mapX:34, mapY:36 },
  { id:2, name:"Elena Vasquez", slug:"elena-vasquez", location:"Encinitas, CA", region:"Pacific Coast", category:"Surfing", tagline:"Championship surfer turned guide. Point breaks, reef, and open ocean.", rating:4.94, reviewCount:89, responseRate:95, price:195, verified:true, yearsExp:9, mapX:11, mapY:66 },
  { id:3, name:"Marcus Donnelly", slug:"marcus-donnelly", location:"Jackson, WY", region:"Mountain West", category:"Hunting", tagline:"Elk, mule deer, and pronghorn in the Greater Yellowstone Ecosystem.", rating:4.91, reviewCount:67, responseRate:92, price:850, verified:true, yearsExp:22, mapX:31, mapY:31 },
  { id:4, name:"Sasha Okafor", slug:"sasha-okafor", location:"Moab, UT", region:"Mountain West", category:"Rock Climbing", tagline:"Sandstone, multipitch, and desert towers. All skill levels.", rating:4.99, reviewCount:201, responseRate:99, price:225, verified:true, yearsExp:11, mapX:27, mapY:48 },
  { id:5, name:"Claire Beaumont", slug:"claire-beaumont", location:"Bar Harbor, ME", region:"Northeast", category:"Kayaking", tagline:"Sea kayaking the Maine coast — whales, seabirds, and island camps.", rating:4.88, reviewCount:54, responseRate:88, price:165, verified:true, yearsExp:7, mapX:74, mapY:24 },
  { id:6, name:"Tomás Herrera", slug:"tomas-herrera", location:"Kauai, HI", region:"Hawaii", category:"Diving", tagline:"Hawaiian reef diving, night dives, and free-diving instruction.", rating:4.96, reviewCount:118, responseRate:97, price:185, verified:true, yearsExp:16, mapX:9, mapY:82 },
  { id:7, name:"Anya Petrov", slug:"anya-petrov", location:"Kenai, AK", region:"Alaska", category:"Fly Fishing", tagline:"Alaska salmon runs, remote float trips, and backcountry brook trout.", rating:4.93, reviewCount:72, responseRate:94, price:650, verified:true, yearsExp:12, mapX:14, mapY:9 },
  { id:8, name:"Owen Blackthorn", slug:"owen-blackthorn", location:"Asheville, NC", region:"Southeast", category:"Hiking", tagline:"Blue Ridge wilderness backpacking, waterfall routes, and flora ID.", rating:4.89, reviewCount:98, responseRate:91, price:145, verified:true, yearsExp:8, mapX:66, mapY:46 },
];

// ─── GUIDE CARD ───────────────────────────────────────────────────────────────
function GuideCard({ guide, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        background: active ? T.lifted : hov ? T.lifted : T.steel,
        border: `1px solid ${active ? T.gold : hov ? T.wire : T.wire}`,
        borderLeft: `3px solid ${active ? T.gold : "transparent"}`,
        borderRadius: 8, overflow:"hidden", cursor:"pointer",
        transition:"all 0.15s",
        boxShadow: active ? `0 0 0 1px ${T.gold}30` : "none",
      }}>
      {/* Card image strip */}
      <div style={{height:130, background: guide.photo ? `url(${guide.photo}) center/cover` : `linear-gradient(135deg, #152018 0%, #0b1a24 100%)`, position:"relative", borderBottom:`1px solid ${T.wire}`}}>
        <div style={{position:"absolute", inset:0, backgroundImage:`radial-gradient(ellipse at 30% 70%, ${T.gold}18 0%, transparent 55%)`}}/>
        <div style={{position:"absolute", top:10, left:12, display:"flex", gap:6}}>
          <span style={{fontFamily:FONT_BODY, fontSize:10, fontWeight:700, color:T.gold, background:T.goldGlow, border:`1px solid ${T.gold}`, borderRadius:3, padding:"2px 8px", letterSpacing:"0.06em"}}>{guide.category}</span>
          {guide.verified && <span style={{fontFamily:FONT_BODY, fontSize:10, fontWeight:700, color:T.ash, background:"rgba(0,0,0,0.5)", border:`1px solid ${T.wire}`, borderRadius:3, padding:"2px 8px", letterSpacing:"0.06em"}}>✓ VERIFIED</span>}
        </div>
        <div style={{position:"absolute", bottom:10, right:12, textAlign:"right"}}>
          <div style={{fontFamily:FONT_DISPLAY, fontSize:22, color:T.gold, fontWeight:500, lineHeight:1}}>${guide.price}</div>
          <div style={{fontFamily:FONT_BODY, fontSize:10, color:T.silver}}>from / person</div>
        </div>
      </div>

      {/* Card content */}
      <div style={{padding:"14px 16px 16px"}}>
        <div style={{fontFamily:FONT_DISPLAY, fontSize:19, color:T.white, fontWeight:400, lineHeight:1.1, marginBottom:4}}>{guide.name}</div>
        <div style={{fontFamily:FONT_BODY, fontSize:11, color:T.silver, marginBottom:8}}>📍 {guide.location}{guide.yearsExp ? ` · ${guide.yearsExp} yrs` : ""}</div>
        <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.ash, lineHeight:1.5, marginBottom:12}}>{guide.tagline}</div>
        <div style={{display:"flex", alignItems:"center", gap:6, paddingTop:10, borderTop:`1px solid ${T.rim}`}}>
          <Stars rating={guide.rating} size={11}/>
          <span style={{fontFamily:FONT_BODY, fontSize:12, fontWeight:700, color:T.parchment}}>{guide.rating}</span>
          <span style={{fontFamily:FONT_BODY, fontSize:11, color:T.silver}}>({guide.reviewCount})</span>
          <div style={{flex:1}}/>
          <span style={{fontFamily:FONT_BODY, fontSize:11, color:T.silver}}>{guide.responseRate}% resp.</span>
        </div>
      </div>
    </div>
  );
}

// ─── MAP PANE ─────────────────────────────────────────────────────────────────
function MapPane({ guides, activeGuide, setActiveGuide }) {
  return (
    <div style={{
      position:"sticky", top:64, height:"calc(100vh - 64px)",
      background:T.carbon,
      borderLeft:`1px solid ${T.wire}`,
      overflow:"hidden", flexShrink:0,
    }}>
      {/* Grid texture */}
      <div style={{position:"absolute", inset:0, backgroundImage:`linear-gradient(${T.wire}18 1px, transparent 1px), linear-gradient(90deg, ${T.wire}18 1px, transparent 1px)`, backgroundSize:"48px 48px"}}/>
      {/* Atmospheric glow */}
      <div style={{position:"absolute", inset:0, background:`radial-gradient(ellipse at 35% 55%, #0d2a1a60 0%, transparent 55%), radial-gradient(ellipse at 70% 25%, #0a1a2a50 0%, transparent 45%)`}}/>

      {/* Guide pins */}
      {guides.map(guide => {
        const isActive = activeGuide === guide.id;
        return (
          <div key={guide.id} onClick={()=>setActiveGuide(isActive ? null : guide.id)}
            style={{position:"absolute", left:`${guide.mapX}%`, top:`${guide.mapY}%`, transform:"translate(-50%,-50%)", cursor:"pointer", zIndex:isActive?20:10}}>

            {/* Price pin */}
            <div style={{
              background: isActive ? T.gold : T.steel,
              border: `1.5px solid ${isActive ? T.goldLt : T.wire}`,
              borderRadius:6, padding:"5px 10px",
              fontFamily:FONT_BODY, fontSize:12, fontWeight:700,
              color: isActive ? T.ink : T.gold,
              whiteSpace:"nowrap", transition:"all 0.18s",
              boxShadow: isActive ? `0 4px 20px ${T.gold}50` : `0 2px 10px rgba(0,0,0,0.6)`,
              transform: isActive ? "scale(1.12)" : "scale(1)",
            }}>
              ${guide.price}
            </div>

            {/* Tooltip on active */}
            {isActive && (
              <div style={{
                position:"absolute", bottom:"calc(100% + 10px)", left:"50%", transform:"translateX(-50%)",
                background:T.steel, border:`1px solid ${T.gold}`, borderRadius:8,
                padding:"14px 16px", minWidth:210,
                boxShadow:`0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px ${T.goldGlow}`,
                pointerEvents:"none",
              }}>
                <div style={{fontFamily:FONT_DISPLAY, fontSize:16, color:T.white, marginBottom:3}}>{guide.name}</div>
                <div style={{fontFamily:FONT_BODY, fontSize:11, color:T.silver, marginBottom:8}}>📍 {guide.location}</div>
                <div style={{display:"flex", alignItems:"center", gap:6}}>
                  <Stars rating={guide.rating} size={11}/>
                  <span style={{fontFamily:FONT_BODY, fontSize:12, fontWeight:700, color:T.parchment}}>{guide.rating}</span>
                  <span style={{fontFamily:FONT_BODY, fontSize:11, color:T.silver}}>· from ${guide.price}/person</span>
                </div>
                {/* Pointer triangle */}
                <div style={{position:"absolute", bottom:-7, left:"50%", transform:"translateX(-50%)", width:12, height:7, overflow:"hidden"}}>
                  <div style={{width:10, height:10, background:T.steel, border:`1px solid ${T.gold}`, transform:"rotate(45deg)", transformOrigin:"center", margin:"0 auto", marginTop:-5}}/>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Map label */}
      <div style={{position:"absolute", bottom:16, left:16, fontFamily:FONT_BODY, fontSize:10, color:T.muted, letterSpacing:"0.08em", textTransform:"uppercase"}}>Map · Mapbox integration pending</div>

      {/* Guide count badge */}
      <div style={{position:"absolute", top:16, right:16, background:T.steel, border:`1px solid ${T.wire}`, borderRadius:6, padding:"6px 12px"}}>
        <span style={{fontFamily:FONT_BODY, fontSize:12, color:T.silver}}>{guides.length} guide{guides.length!==1?"s":""} shown</span>
      </div>
    </div>
  );
}

// ─── FILTER BAR ───────────────────────────────────────────────────────────────
function FilterBar({ filters, setFilters }) {
  const [priceOpen, setPriceOpen] = useState(false);

  return (
    <div style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap"}}>
      {/* Category pills */}
      <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
        {CATEGORIES.map(cat => {
          const active = filters.category===cat || (cat==="All" && !filters.category);
          return (
            <button key={cat} onClick={()=>setFilters(f=>({...f, category:cat==="All"?"":cat}))}
              style={{
                background: active ? T.goldGlow : T.steel,
                border: `1px solid ${active ? T.gold : T.wire}`,
                borderRadius:20, padding:"6px 14px",
                fontFamily:FONT_BODY, fontSize:12, fontWeight:active?700:400,
                color: active ? T.gold : T.silver,
                cursor:"pointer", transition:"all 0.15s",
              }}>{cat}</button>
          );
        })}
      </div>

      <div style={{width:1, height:20, background:T.wire, margin:"0 4px"}}/>

      {/* Sort */}
      <select value={filters.sort} onChange={e=>setFilters(f=>({...f,sort:e.target.value}))}
        style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:6, padding:"7px 12px", fontFamily:FONT_BODY, fontSize:12, color:T.ash, outline:"none", appearance:"none", cursor:"pointer"}}>
        {["Best match","Highest rated","Lowest price","Most reviewed"].map(o=><option key={o}>{o}</option>)}
      </select>

      {/* Price filter */}
      <div style={{position:"relative"}}>
        <button onClick={()=>setPriceOpen(o=>!o)} style={{
          background: filters.maxPrice ? T.goldGlow : T.steel,
          border: `1px solid ${filters.maxPrice ? T.gold : T.wire}`,
          borderRadius:6, padding:"7px 14px",
          fontFamily:FONT_BODY, fontSize:12,
          color: filters.maxPrice ? T.gold : T.silver,
          cursor:"pointer",
        }}>
          {filters.maxPrice ? `Under $${filters.maxPrice}` : "Price"} ▾
        </button>
        {priceOpen && (
          <div style={{position:"absolute", top:"calc(100% + 8px)", left:0, background:T.steel, border:`1px solid ${T.wire}`, borderRadius:8, padding:16, zIndex:50, width:200, boxShadow:`0 8px 32px rgba(0,0,0,0.6)`}}>
            <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.silver, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12}}>Max price / person</div>
            {[200,400,600,1000].map(p=>(
              <button key={p} onClick={()=>{setFilters(f=>({...f,maxPrice:f.maxPrice===p?null:p}));setPriceOpen(false);}}
                style={{display:"block", width:"100%", background:filters.maxPrice===p?T.goldGlow:"transparent", border:`1px solid ${filters.maxPrice===p?T.gold:T.rim}`, borderRadius:5, padding:"9px 12px", fontFamily:FONT_BODY, fontSize:13, color:filters.maxPrice===p?T.gold:T.ash, cursor:"pointer", marginBottom:6, textAlign:"left"}}>
                Under ${p}
              </button>
            ))}
            {filters.maxPrice && <button onClick={()=>{setFilters(f=>({...f,maxPrice:null}));setPriceOpen(false);}} style={{fontFamily:FONT_BODY, fontSize:11, color:T.muted, background:"none", border:"none", cursor:"pointer", padding:"4px 0"}}>Clear</button>}
          </div>
        )}
      </div>

      {(filters.category || filters.maxPrice) && (
        <button onClick={()=>setFilters({category:"",sort:"Best match",maxPrice:null})}
          style={{fontFamily:FONT_BODY, fontSize:12, color:T.silver, background:"none", border:"none", cursor:"pointer", textDecoration:"underline"}}>
          Clear all
        </button>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [filters, setFilters] = useState({category:"",sort:"Best match",maxPrice:null});
  const [activeGuide, setActiveGuide] = useState(null);
  const [query, setQuery] = useState("");
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileView, setMobileView] = useState("list"); // "list" | "map"

  // Read URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("category");
    const q = params.get("q");
    const dest = params.get("destination");
    if (cat) setFilters(f => ({...f, category: cat}));
    if (q) setQuery(q);
    if (dest) setQuery(dest);
  }, []);

  useEffect(() => { fetchGuides(); }, [filters, query]);

  const fetchGuides = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      let q = supabase.from("guides").select("*, packages(price, price_type)").eq("status","active");
      if (filters.category) {
        const dbCat = CATEGORY_TO_DB[filters.category] || filters.category.toLowerCase();
        q = q.contains("categories",[dbCat]);
      }
      if (query) q = q.or(`tagline.ilike.%${query}%,bio.ilike.%${query}%,location.ilike.%${query}%`);
      if (filters.sort==="Highest rated") q = q.order("rating",{ascending:false});
      else if (filters.sort==="Most reviewed") q = q.order("review_count",{ascending:false});
      else q = q.order("rating",{ascending:false});
      const { data, error } = await q;
      if (error) { console.error("Search error:",error); setLoading(false); return; }
      let shaped = (data||[]).map(g=>{
        const coords = LOCATION_COORDS[g.location] || { x:45, y:50 };
        const rawCat = g.categories?.[0] || "";
        return {
          id:g.id,
          name:g.business_name || g.display_name || "Guide",
          slug:g.slug,
          location:g.location||"",
          category: rawCat.charAt(0).toUpperCase() + rawCat.slice(1),
          tagline:g.tagline||"",
          rating:parseFloat(g.rating)||0,
          reviewCount:g.review_count||0,
          responseRate:g.response_rate||0,
          price:g.packages?.[0]?.price||0,
          verified:g.verified,
          yearsExp:g.years_experience ? parseInt(g.years_experience) : null,
          photo:g.profile_photo_url||null,
          mapX: coords.x + (Math.random()-0.5)*2,
          mapY: coords.y + (Math.random()-0.5)*2,
        };
      });
      if (filters.maxPrice) shaped = shaped.filter(g=>g.price<=filters.maxPrice);
      if (filters.sort==="Lowest price") shaped = shaped.sort((a,b)=>a.price-b.price);
      setGuides(shaped);
    } catch(e) { console.error("Fetch error:",e); }
    setLoading(false);
  };

  const MOCK = [
    {id:"m1",name:"James Whitfield",slug:"james-whitfield",location:"Bozeman, MT",category:"Fly Fishing",tagline:"14 years on the Madison, Gallatin, and Yellowstone.",rating:4.97,reviewCount:143,responseRate:98,price:275,verified:true,yearsExp:14,mapX:34,mapY:36},
    {id:"m2",name:"Elena Vasquez",slug:"elena-vasquez",location:"Encinitas, CA",category:"Surfing",tagline:"Championship surfer turned guide. Point breaks, reef, and open ocean.",rating:4.94,reviewCount:89,responseRate:95,price:195,verified:true,yearsExp:9,mapX:11,mapY:66},
    {id:"m3",name:"Marcus Donnelly",slug:"marcus-donnelly",location:"Jackson, WY",category:"Hunting",tagline:"Elk, mule deer, and pronghorn in the Greater Yellowstone Ecosystem.",rating:4.91,reviewCount:67,responseRate:92,price:850,verified:true,yearsExp:22,mapX:31,mapY:31},
    {id:"m4",name:"Sasha Okafor",slug:"sasha-okafor",location:"Moab, UT",category:"Rock Climbing",tagline:"Sandstone, multipitch, and desert towers. All skill levels.",rating:4.99,reviewCount:201,responseRate:99,price:225,verified:true,yearsExp:11,mapX:27,mapY:48},
    {id:"m5",name:"Claire Beaumont",slug:"claire-beaumont",location:"Bar Harbor, ME",category:"Kayaking",tagline:"Sea kayaking the Maine coast — whales, seabirds, and island camps.",rating:4.88,reviewCount:54,responseRate:88,price:165,verified:true,yearsExp:7,mapX:74,mapY:24},
    {id:"m6",name:"Tomás Herrera",slug:"tomas-herrera",location:"Kauai, HI",category:"Diving",tagline:"Hawaiian reef diving, night dives, and free-diving instruction.",rating:4.96,reviewCount:118,responseRate:97,price:185,verified:true,yearsExp:16,mapX:9,mapY:82},
    {id:"m7",name:"Anya Petrov",slug:"anya-petrov",location:"Kenai, AK",category:"Fly Fishing",tagline:"Alaska salmon runs, remote float trips, and backcountry brook trout.",rating:4.93,reviewCount:72,responseRate:94,price:650,verified:true,yearsExp:12,mapX:14,mapY:9},
    {id:"m8",name:"Owen Blackthorn",slug:"owen-blackthorn",location:"Asheville, NC",category:"Hiking",tagline:"Blue Ridge wilderness backpacking, waterfall routes, and flora ID.",rating:4.89,reviewCount:98,responseRate:91,price:145,verified:true,yearsExp:8,mapX:66,mapY:46},
  ];

  const displayGuides = guides.length>0 ? guides : (loading ? [] : MOCK);

  const filtered = displayGuides.filter(g=>{
    if(filters.category) {
      const dbCat = CATEGORY_TO_DB[filters.category] || filters.category.toLowerCase();
      if(g.category.toLowerCase() !== dbCat) return false;
    }
    if(filters.maxPrice && g.price>filters.maxPrice) return false;
    if(query && ![g.name,g.location,g.category,g.tagline].some(s=>s?.toLowerCase().includes(query.toLowerCase()))) return false;
    return true;
  }).sort((a,b)=>{
    if(filters.sort==="Highest rated") return b.rating-a.rating;
    if(filters.sort==="Lowest price") return a.price-b.price;
    if(filters.sort==="Most reviewed") return b.reviewCount-a.reviewCount;
    return b.rating*Math.log(b.reviewCount+1)-a.rating*Math.log(a.reviewCount+1);
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Barlow:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.void};overflow:hidden;}
        ::placeholder{color:${T.muted};}
        ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:${T.carbon};}::-webkit-scrollbar-thumb{background:${T.wire};border-radius:3px;}
        select option{background:${T.steel};color:${T.ash};}
        .search-grid{display:grid;grid-template-columns:1fr 460px;height:100vh;padding-top:64px;}
        .guides-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
        .mobile-toggle{display:none;}
        .map-panel{display:block;}
        @media(max-width:768px){
          .search-grid{grid-template-columns:1fr!important;}
          .guides-grid-2{grid-template-columns:1fr!important;}
          .mobile-toggle{display:flex!important;}
          .map-panel-hidden{display:none!important;}
          .list-panel-hidden{display:none!important;}
          body{overflow:auto!important;}
        }
      `}</style>

      <nav role="navigation" aria-label="Search navigation" style={{position:"fixed",top:0,left:0,right:0,zIndex:100,height:64,background:T.void,borderBottom:`1px solid ${T.wire}`,display:"flex",alignItems:"center"}}>
        <div style={{width:"100%",padding:"0 28px",display:"flex",alignItems:"center",gap:20}}>
          <div style={{fontFamily:FONT_DISPLAY,fontSize:24,color:T.gold,letterSpacing:"0.14em",fontWeight:500,flexShrink:0,cursor:"pointer"}} onClick={()=>window.location.href="/"}>RŌM</div>
          <div style={{flex:1,maxWidth:500,position:"relative"}}>
            <span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:16}}>⌕</span>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by guide, destination, or activity…"
              style={{width:"100%",background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:"9px 14px 9px 38px",fontFamily:FONT_BODY,fontSize:14,color:T.parchment,outline:"none"}}/>
          </div>
          <div style={{flex:1}}/>
          <span onClick={()=>window.location.href="/login"} style={{fontFamily:FONT_BODY,fontSize:14,color:T.ash,cursor:"pointer",whiteSpace:"nowrap"}}>Sign in</span>
          <button onClick={()=>window.location.href="/signup"} style={{background:T.gold,border:"none",borderRadius:6,padding:"9px 20px",fontFamily:FONT_BODY,fontSize:13,fontWeight:700,color:T.ink,cursor:"pointer",whiteSpace:"nowrap"}}>Become a Guide</button>
        </div>
      </nav>

      {/* Mobile map/list toggle */}
      <div className="mobile-toggle" style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:200,background:T.steel,border:`1px solid ${T.wire}`,borderRadius:24,padding:4,display:"flex",gap:4,boxShadow:"0 4px 20px rgba(0,0,0,0.5)"}}>
        <button onClick={()=>setMobileView("list")} style={{background:mobileView==="list"?T.gold:"none",border:"none",borderRadius:20,padding:"8px 20px",fontFamily:FONT_BODY,fontSize:13,fontWeight:700,color:mobileView==="list"?T.ink:T.silver,cursor:"pointer"}}>☰ List</button>
        <button onClick={()=>setMobileView("map")} style={{background:mobileView==="map"?T.gold:"none",border:"none",borderRadius:20,padding:"8px 20px",fontFamily:FONT_BODY,fontSize:13,fontWeight:700,color:mobileView==="map"?T.ink:T.silver,cursor:"pointer"}}>⊕ Map</button>
      </div>

      <div className="search-grid">
        <div className={mobileView==="map"?"list-panel-hidden":""} style={{overflowY:"auto",background:T.gunmetal}}>
          <div style={{background:T.carbon,borderBottom:`1px solid ${T.wire}`,padding:"14px 24px",position:"sticky",top:0,zIndex:10}}>
            <FilterBar filters={filters} setFilters={setFilters}/>
          </div>
          <div style={{padding:"24px 24px 64px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:20}}>
              <div style={{fontFamily:FONT_DISPLAY,fontSize:26,color:T.white,fontWeight:400}}>
                {loading ? <span style={{color:T.silver,fontSize:20}}>Loading guides…</span>
                  : <>{filtered.length} guide{filtered.length!==1?"s":""}{filters.category?<span style={{color:T.gold}}> in {filters.category}</span>:""}</>}
              </div>
              {query&&<div style={{fontFamily:FONT_BODY,fontSize:13,color:T.silver}}>Searching "{query}"</div>}
            </div>
            {!loading&&filtered.length>0 ? (
              <div className="guides-grid-2">
                {filtered.map(g=><GuideCard key={g.id} guide={g} active={activeGuide===g.id} onClick={()=>window.location.href=`/guides/${g.slug}`}/>)}
              </div>
            ) : !loading ? (
              <div style={{textAlign:"center",padding:"80px 24px"}}>
                <div style={{fontFamily:FONT_DISPLAY,fontSize:36,color:T.silver,marginBottom:12,fontWeight:300}}>No guides found</div>
                <div style={{fontFamily:FONT_BODY,fontSize:14,color:T.muted,marginBottom:24}}>Try adjusting your filters or search a different destination.</div>
                <button onClick={()=>{setFilters({category:"",sort:"Best match",maxPrice:null});setQuery("");}}
                  style={{background:"none",border:`1px solid ${T.gold}`,borderRadius:6,padding:"10px 20px",fontFamily:FONT_BODY,fontSize:14,color:T.gold,cursor:"pointer"}}>Clear all filters</button>
              </div>
            ) : null}
          </div>
        </div>
        <div className={mobileView==="list"?"map-panel-hidden":""}><MapPane guides={filtered} activeGuide={activeGuide} setActiveGuide={setActiveGuide}/></div>
      </div>
    </>
  );
}
