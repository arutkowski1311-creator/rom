"use client";
import { useState, useEffect } from "react";
import React from "react";
import { createBrowserClient } from "@supabase/ssr";

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// ─── 5-STEP DARK PALETTE ──────────────────────────────────────────────────────
// Each step is visibly distinct. Sections stack light-on-dark to create depth.
const T = {
  void:     "#080a0b",   // deepest — page background
  carbon:   "#0f1214",   // nav, hero base
  gunmetal: "#171b1e",   // section backgrounds
  steel:    "#1f2428",   // card backgrounds
  lifted:   "#272c31",   // hover states, inner elements
  rim:      "#323840",   // subtle borders
  wire:     "#424c54",   // visible borders, dividers
  muted:    "#5a6470",   // placeholder text
  silver:   "#8a96a0",   // secondary text
  ash:      "#b8c2ca",   // body text
  parchment:"#e8e2d8",   // primary text
  white:    "#f5f2ee",   // headings, emphasis
  gold:     "#c9973a",
  goldLt:   "#e0b050",
  goldDk:   "#a07828",
  goldGlow: "#c9973a28",
  ink:      "#080a0b",
};

const FONT_DISPLAY = "'Cormorant Garamond', Georgia, serif";
const FONT_BODY    = "'Barlow', system-ui, sans-serif";

const GUIDE = {
  name:"James Whitfield", slug:"james-whitfield",
  tagline:"Montana fly fishing guide. 14 years on the Madison, Gallatin, and Yellowstone.",
  location:"Bozeman, MT", rating:4.97, reviewCount:143, responseRate:98,
  responseTime:"under 2 hours", yearsExperience:14,
  verified:true, insured:true, licensed:true, categories:["Fly Fishing"],
  bio:`There's a stretch of the Madison that most guides drive right past. After fourteen years on these waters, I've learned that the best fishing rarely happens where anyone's looking.\n\nFly fishing for brown and rainbow trout is what I do — but teaching people to see water the way a fish sees it is what I'm actually here for. Every trip is built around technique, not just catching fish. You leave with a skill, not just a photo.\n\nWhether you're picking up a rod for the first time or you've been fishing for decades, I meet you where you are. What I care about is that you leave understanding something you didn't before — about the water, about the fish, and probably about yourself.`,
  packages:[
    {id:"p1",title:"Half Day — Learn to Read Water",duration:"4 hours",priceType:"person",price:275,minGuests:1,maxGuests:2,includes:"All gear, flies, waders, hands-on instruction",description:"Built for beginners and returning anglers who want to develop real technique. We spend the morning on the Madison, focusing on casting form, reading current seams, and presenting the fly correctly. You will hook fish.",category:"Fly Fishing"},
    {id:"p2",title:"Full Day Trophy Hunt",duration:"8 hours",priceType:"person",price:495,minGuests:1,maxGuests:2,includes:"All gear, flies, waders, riverside lunch, catch photos",description:"A full day targeting large browns and rainbows in the upper Madison corridor. We move water and chase fish — this is a serious day for guests who want serious results. Best for anglers with some experience.",category:"Fly Fishing"},
    {id:"p3",title:"3-Day Yellowstone Backcountry",duration:"3 days",priceType:"flat",price:3200,minGuests:1,maxGuests:3,includes:"All gear, backcountry permits, camp meals, photography support",description:"Three days in Yellowstone's backcountry fishing wild cutthroat trout in streams most anglers will never see. We hike in, set camp, and spend the days working water that doesn't appear on any outfitter map.",category:"Fly Fishing"},
  ],
  reviews:[
    {id:"r1",guest:"Mark T.",rating:5,date:"Feb 2026",trip:"Full Day Trophy Hunt",text:"James put me on fish I had no business catching. I've fished the Madison twice before with other guides and left thinking it was overhyped. This was different. He found water I didn't know existed and taught me why it held fish. Best guide day I've ever had, anywhere."},
    {id:"r2",guest:"Sarah L.",rating:5,date:"Jan 2026",trip:"Half Day — Learn to Read Water",text:"I hadn't picked up a rod in 8 years. James is patient in a way that doesn't feel patronizing — he just quietly adjusts what he's saying until it lands. I hooked three fish and finally understand how to read a current seam."},
    {id:"r3",guest:"Derek & Amy P.",rating:5,date:"Sep 2025",trip:"3-Day Yellowstone Backcountry",text:"This was a bucket list trip and it exceeded everything we imagined. The backcountry streams were unlike anything either of us had ever seen. James is part guide, part naturalist, part photographer. Zero complaints."},
    {id:"r4",guest:"Chris M.",rating:5,date:"Aug 2025",trip:"Full Day Trophy Hunt",text:"Landed a 22-inch brown on a dry fly in the afternoon hatch. James called it twenty minutes before it happened. He knows this water like it's his living room."},
  ],
  fieldNotes:[
    {title:"Why the Madison Fishes Better After a Cold Night",date:"Feb 2026",preview:"Most guests show up expecting summer conditions. The guides who know this river know that late September through early November, after the first hard frosts hit the mountains, is when the big browns move…"},
    {title:"What Beginners Get Wrong About Casting",date:"Nov 2025",preview:"The single most common mistake I see on the water isn't the cast itself — it's the grip. Most beginners hold the rod like they're afraid it's going to leave them. The rod knows what it's doing…"},
  ],
};

function Stars({ rating, size=14 }) {
  return <span>{[1,2,3,4,5].map(i=><span key={i} style={{fontSize:size,color:i<=Math.round(rating)?T.gold:T.rim}}>★</span>)}</span>;
}

// ─── BOOKING PANEL ────────────────────────────────────────────────────────────
function BookingPanel({ guide, onClose }) {
  const [step, setStep] = useState(1);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [guests, setGuests] = useState(1);
  const [requests, setRequests] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmCode, setConfirmCode] = useState("");
  const [authError, setAuthError] = useState(false);
  const [blockedDates, setBlockedDates] = useState([]);

  useEffect(() => {
    if (!guide?.id) return;
    const supabase = getSupabase();
    supabase.from("availability").select("date").eq("guide_id", guide.id).eq("status", "blocked")
      .then(({ data }) => { if (data) setBlockedDates(data.map(r => r.date)); });
  }, [guide?.id]);

  const pkg = guide.packages.find(p=>p.id===selectedPkg);
  const tripPrice = pkg?(pkg.priceType==="person"?pkg.price*guests:pkg.price):0;
  const serviceFee = Math.round(tripPrice*0.15);
  const total = tripPrice+serviceFee;
  const deposit = Math.round(total*0.25);
  const balance = total-deposit;

  const now = new Date();
  const [calMonth,setCalMonth]=useState(now.getMonth());
  const [calYear,setCalYear]=useState(now.getFullYear());
  const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const firstDay=new Date(calYear,calMonth,1).getDay();
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
  const cells=[];
  for(let i=0;i<firstDay;i++)cells.push(null);
  for(let d=1;d<=daysInMonth;d++)cells.push(d);

  const handleBooking = async () => {
    setSubmitting(true);
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAuthError(true); setSubmitting(false); return; }

      // Generate confirmation code
      const confirmCode = "ROM-" + Math.random().toString(36).slice(2,7).toUpperCase();

      // Only use package_id if it looks like a real UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedPkg);

      if (!isUUID) {
        // Mock package — show confirmation without DB insert
        setConfirmCode(confirmCode);
        setConfirmed(true);
        setSubmitting(false);
        return;
      }

      const { data: booking, error } = await supabase
        .from("bookings")
        .insert({
          confirmation_code: confirmCode,
          guest_id: user.id,
          guide_id: guide.id,
          package_id: selectedPkg,
          trip_date: selectedDate,
          guests: guests,
          special_requests: requests,
          package_price: pkg.price,
          price_type: pkg.priceType || "person",
          subtotal: tripPrice,
          service_fee: serviceFee,
          total: total,
          deposit: deposit,
          balance: balance,
          status: "pending",
          package_title: pkg.title,
          guide_name: guide.name,
          guide_location: guide.location,
          guide_slug: guide.slug,
        })
        .select()
        .single();

      if (error) { console.error("Booking error:", JSON.stringify(error), error.message, error.details, error.hint); setSubmitting(false); return; }

      const finalCode = booking.confirmation_code || booking.id.slice(0,8).toUpperCase();

      // Send confirmation emails
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", currentUser.id)
          .single();

        await fetch("/api/bookings/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestEmail: profile?.email || currentUser.email,
            guestName: profile?.full_name || "Guest",
            guideId: guide.id,
            guideName: guide.name,
            confirmCode: finalCode,
            packageTitle: pkg.title,
            tripDate: selectedDate,
            guests,
            total,
            deposit,
            balance,
            guideLocation: guide.location,
          }),
        });
      } catch (emailErr) {
        console.error("Email send failed (non-blocking):", emailErr);
      }

      setConfirmCode(finalCode);
      setConfirmed(true);
    } catch(e) {
      console.error("Booking failed:", e);
    }
    setSubmitting(false);
  };

  // ── Auth redirect prompt ──
  if (authError) return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",justifyContent:"flex-end"}}>
      <div onClick={onClose} style={{flex:1,background:"rgba(0,0,0,0.75)"}}/>
      <div style={{width:500,background:T.carbon,height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,padding:40,borderLeft:`2px solid ${T.wire}`}}>
        <div style={{fontFamily:FONT_DISPLAY,fontSize:32,color:T.white,textAlign:"center"}}>Sign in to book</div>
        <p style={{fontFamily:FONT_BODY,fontSize:15,color:T.silver,textAlign:"center",lineHeight:1.7}}>Create a free account to book this experience and manage your trips.</p>
        <button onClick={()=>window.location.href=`/login?redirect=${encodeURIComponent(window.location.pathname)}`} style={{width:"100%",padding:"15px",background:T.gold,border:"none",borderRadius:8,fontFamily:FONT_BODY,fontSize:15,fontWeight:700,color:T.ink,cursor:"pointer"}}>Sign In / Create Account</button>
        <button onClick={()=>setAuthError(false)} style={{background:"none",border:"none",color:T.muted,fontFamily:FONT_BODY,fontSize:13,cursor:"pointer"}}>← Back</button>
      </div>
    </div>
  );

  // ── Confirmation screen ──
  if (confirmed) return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",justifyContent:"flex-end"}}>
      <div onClick={onClose} style={{flex:1,background:"rgba(0,0,0,0.75)"}}/>
      <div style={{width:500,background:T.carbon,height:"100vh",overflowY:"auto",borderLeft:`2px solid ${T.wire}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,padding:40}}>
        <div style={{width:64,height:64,borderRadius:"50%",background:"#3a7a5428",border:"2px solid #3a7a54",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,color:"#3a7a54"}}>✓</div>
        <div style={{fontFamily:FONT_DISPLAY,fontSize:36,color:T.white,textAlign:"center"}}>Request Sent</div>
        <p style={{fontFamily:FONT_BODY,fontSize:14,color:T.silver,textAlign:"center",lineHeight:1.75}}>
          {guide.name} has received your booking request. Once confirmed, your ${deposit} deposit will be charged.
        </p>
        <div style={{width:"100%",background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:20}}>
          {[
            ["Booking ref", confirmCode],
            ["Package", pkg?.title],
            ["Date", selectedDate ? new Date(selectedDate+"T12:00:00").toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}) : "TBD"],
            ["Guests", guests],
            ["Total", `$${total}`],
            ["Deposit due", `$${deposit}`],
          ].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.rim}`}}>
              <span style={{fontFamily:FONT_BODY,fontSize:13,color:T.silver}}>{l}</span>
              <span style={{fontFamily:FONT_BODY,fontSize:13,color:T.parchment,fontWeight:600}}>{v}</span>
            </div>
          ))}
        </div>
        <button onClick={()=>window.location.href="/dashboard"} style={{width:"100%",padding:"14px",background:T.gold,border:"none",borderRadius:8,fontFamily:FONT_BODY,fontSize:14,fontWeight:700,color:T.ink,cursor:"pointer"}}>View in Dashboard →</button>
        <button onClick={onClose} style={{background:"none",border:"none",color:T.muted,fontFamily:FONT_BODY,fontSize:13,cursor:"pointer"}}>Close</button>
      </div>
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",justifyContent:"flex-end"}}>
      <div onClick={onClose} style={{flex:1,background:"rgba(0,0,0,0.75)"}}/>
      <div style={{width:500,background:T.carbon,height:"100vh",overflowY:"auto",borderLeft:`2px solid ${T.wire}`,display:"flex",flexDirection:"column"}}>
        <div style={{padding:"24px 28px",borderBottom:`1px solid ${T.wire}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontFamily:FONT_DISPLAY,fontSize:24,color:T.white}}>Book {guide.name}</div>
            <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.silver,marginTop:4}}><Stars rating={guide.rating}/> {guide.rating} · {guide.reviewCount} reviews</div>
          </div>
          <button onClick={onClose} style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:6,color:T.ash,width:36,height:36,cursor:"pointer",fontSize:18}}>×</button>
        </div>
        <div style={{display:"flex",borderBottom:`1px solid ${T.wire}`}}>
          {["Package","Date","Details","Payment"].map((s,i)=>(
            <div key={s} style={{flex:1,padding:"13px 4px",textAlign:"center",fontFamily:FONT_BODY,fontSize:11,fontWeight:step===i+1?700:400,color:step===i+1?T.gold:step>i+1?T.ash:T.muted,borderBottom:`2px solid ${step===i+1?T.gold:"transparent"}`,letterSpacing:"0.07em",textTransform:"uppercase"}}>{s}</div>
          ))}
        </div>
        <div style={{padding:28,flex:1}}>
          {step===1&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>Choose your experience</div>
              {guide.packages.map(p=>(
                <div key={p.id} onClick={()=>setSelectedPkg(p.id)} style={{border:`1px solid ${selectedPkg===p.id?T.gold:T.wire}`,background:selectedPkg===p.id?T.goldGlow:T.steel,borderRadius:8,padding:18,cursor:"pointer",transition:"all 0.15s"}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <div style={{fontFamily:FONT_DISPLAY,fontSize:18,color:T.white,lineHeight:1.2}}>{p.title}</div>
                    <div style={{fontFamily:FONT_BODY,fontSize:15,fontWeight:700,color:T.gold,marginLeft:12,whiteSpace:"nowrap"}}>${p.price}{p.priceType==="person"?"/person":" flat"}</div>
                  </div>
                  <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver,marginTop:6}}>{p.duration} · Up to {p.maxGuests} guests</div>
                  <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.ash,marginTop:8,lineHeight:1.5}}>{p.description?.slice(0,100)}…</div>
                </div>
              ))}
            </div>
          )}
          {step===2&&(
            <div>
              <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,marginBottom:16,textTransform:"uppercase",letterSpacing:"0.08em"}}>Select your trip date</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <span style={{fontFamily:FONT_DISPLAY,fontSize:20,color:T.white}}>{MONTHS[calMonth]} {calYear}</span>
                <div style={{display:"flex",gap:8}}>
                  {["←","→"].map((arrow,i)=>(
                    <button key={arrow} onClick={()=>{if(i===0){if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);}else{if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);}}} style={{background:T.steel,border:`1px solid ${T.wire}`,color:T.ash,padding:"6px 12px",borderRadius:4,cursor:"pointer"}}>{arrow}</button>
                  ))}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:6}}>
                {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} style={{textAlign:"center",fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,padding:"4px 0"}}>{d}</div>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                {cells.map((day,i)=>{
                  if(!day)return<div key={i}/>;
                  const ds=`${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                  const sel=selectedDate===ds;
                  const past=new Date(calYear,calMonth,day)<new Date();  // kept for reference
                  const isBlocked=blockedDates.includes(ds);
                  const today=new Date(); today.setHours(0,0,0,0);
                  const dateObj=new Date(calYear,calMonth,day);
                  const isPastOrToday=dateObj<=today;
                  const unavailable=isPastOrToday||isBlocked;
                  return<button key={i} onClick={()=>!unavailable&&setSelectedDate(ds)} style={{padding:"8px 4px",textAlign:"center",fontFamily:FONT_BODY,fontSize:13,background:sel?T.gold:isBlocked?T.lifted:"transparent",color:unavailable?T.muted:sel?T.ink:T.parchment,border:isBlocked?`1px solid ${T.rim}`:"none",borderRadius:4,cursor:unavailable?"default":"pointer",fontWeight:sel?700:400,textDecoration:isBlocked?"line-through":"none"}}>{day}</button>;
                })}
              </div>
              {selectedDate&&<div style={{marginTop:16,padding:12,background:T.goldGlow,border:`1px solid ${T.gold}`,borderRadius:6,fontFamily:FONT_BODY,fontSize:13,color:T.gold,fontWeight:600}}>✓ {new Date(selectedDate+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</div>}
            </div>
          )}
          {step===3&&pkg&&(
            <div style={{display:"flex",flexDirection:"column",gap:22}}>
              <div>
                <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,marginBottom:12,textTransform:"uppercase",letterSpacing:"0.08em"}}>Number of Guests</div>
                <div style={{display:"flex",alignItems:"center",gap:16}}>
                  <button onClick={()=>setGuests(g=>Math.max(pkg.minGuests,g-1))} style={{width:38,height:38,borderRadius:"50%",background:T.steel,border:`1px solid ${T.wire}`,color:T.parchment,fontSize:20,cursor:"pointer"}}>−</button>
                  <span style={{fontFamily:FONT_DISPLAY,fontSize:32,color:T.white,minWidth:40,textAlign:"center"}}>{guests}</span>
                  <button onClick={()=>setGuests(g=>Math.min(pkg.maxGuests,g+1))} style={{width:38,height:38,borderRadius:"50%",background:T.steel,border:`1px solid ${T.wire}`,color:T.parchment,fontSize:20,cursor:"pointer"}}>+</button>
                  <span style={{fontFamily:FONT_BODY,fontSize:13,color:T.silver}}>max {pkg.maxGuests}</span>
                </div>
              </div>
              <textarea value={requests} onChange={e=>setRequests(e.target.value)} rows={4} placeholder="Skill level, physical limitations, specific goals…" style={{width:"100%",boxSizing:"border-box",background:T.steel,border:`1px solid ${T.wire}`,borderRadius:6,padding:"12px 14px",fontFamily:FONT_BODY,fontSize:14,color:T.parchment,outline:"none",resize:"vertical"}}/>
              <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:20}}>
                {[[pkg.priceType==="person"?`$${pkg.price} × ${guests} guest${guests!==1?"s":""}` : "Flat rate",`$${tripPrice}`],["Service fee (15%)",`$${serviceFee}`]].map(([l,v])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                    <span style={{fontFamily:FONT_BODY,fontSize:14,color:T.silver}}>{l}</span>
                    <span style={{fontFamily:FONT_BODY,fontSize:14,color:T.parchment,fontWeight:600}}>{v}</span>
                  </div>
                ))}
                <div style={{height:1,background:T.wire,margin:"8px 0 12px"}}/>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontFamily:FONT_BODY,fontSize:15,fontWeight:700,color:T.white}}>Total</span>
                  <span style={{fontFamily:FONT_BODY,fontSize:15,fontWeight:700,color:T.white}}>${total}</span>
                </div>
              </div>
            </div>
          )}
          {step===4&&pkg&&(
            <div style={{display:"flex",flexDirection:"column",gap:18}}>
              <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:20}}>
                <div style={{fontFamily:FONT_DISPLAY,fontSize:20,color:T.white,marginBottom:4}}>{pkg.title}</div>
                <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.silver,marginBottom:14}}>{guests} guest{guests!==1?"s":""} · {selectedDate?new Date(selectedDate+"T12:00:00").toLocaleDateString("en-US",{month:"long",day:"numeric"}):""}</div>
                {[["Trip price",`$${tripPrice}`],["Service fee",`$${serviceFee}`],["Total",`$${total}`]].map(([l,v])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontFamily:FONT_BODY,fontSize:14,color:l==="Total"?T.white:T.silver,fontWeight:l==="Total"?700:400}}>{l}</span>
                    <span style={{fontFamily:FONT_BODY,fontSize:14,color:l==="Total"?T.white:T.silver,fontWeight:l==="Total"?700:400}}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{background:T.goldGlow,border:`1px solid ${T.gold}`,borderRadius:8,padding:20}}>
                <div style={{fontFamily:FONT_BODY,fontSize:30,fontWeight:700,color:T.gold}}>${deposit}</div>
                <div style={{fontFamily:FONT_BODY,fontSize:14,fontWeight:600,color:T.parchment,marginTop:2}}>due today — 25% deposit</div>
                <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.silver,marginTop:8}}>Remaining ${balance} auto-charged 14 days before your trip.</div>
              </div>
              <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:16}}>
                <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver,lineHeight:1.6}}>
                  💳 Payment powered by Stripe — coming soon. Your booking request will be held and confirmed when payment is enabled. No charge until your guide accepts.
                </div>
              </div>
            </div>
          )}
        </div>
        <div style={{padding:"20px 28px",borderTop:`1px solid ${T.wire}`}}>
          {step<4?(
            <button onClick={()=>setStep(s=>s+1)} disabled={(step===1&&!selectedPkg)||(step===2&&!selectedDate)}
              style={{width:"100%",padding:"15px",background:T.gold,border:"none",borderRadius:8,fontFamily:FONT_BODY,fontSize:15,fontWeight:700,color:T.ink,cursor:"pointer",opacity:(step===1&&!selectedPkg)||(step===2&&!selectedDate)?0.35:1}}>
              {step===3?"Review & Pay →":"Continue →"}
            </button>
          ):(
            <button onClick={handleBooking} disabled={submitting}
              style={{width:"100%",padding:"15px",background:T.gold,border:"none",borderRadius:8,fontFamily:FONT_BODY,fontSize:15,fontWeight:700,color:T.ink,cursor:"pointer",opacity:submitting?0.6:1}}>
              {submitting ? "Submitting…" : `Request to Book — $${deposit} deposit`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── MAIN ─────────────────────────────────────────────────────────────────────

// ─── MESSAGE PANEL ────────────────────────────────────────────────────────────
function MessagePanel({ guide, onClose }) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAuthError(true); return; }
      setCurrentUserId(user.id);
      // Check for existing thread
      const { data: existing } = await supabase
        .from("message_threads")
        .select("*, messages(id, body, sender_id, created_at)")
        .eq("guide_id", guide.id)
        .eq("guest_id", user.id)
        .maybeSingle();
      if (existing) {
        setThread(existing);
        setMessages((existing.messages||[]).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)));
      }
    };
    init();
  }, [guide.id]);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAuthError(true); setSending(false); return; }

    let threadId = thread?.id;
    if (!threadId) {
      const { data: newThread } = await supabase
        .from("message_threads")
        .insert({ guide_id: guide.id, guest_id: user.id, last_message_at: new Date().toISOString() })
        .select().single();
      if (newThread) { setThread(newThread); threadId = newThread.id; }
    }

    if (threadId) {
      const { data: msg } = await supabase
        .from("messages")
        .insert({ thread_id: threadId, sender_id: user.id, body: body.trim() })
        .select().single();
      if (msg) {
        setMessages(prev => [...prev, msg]);
        await supabase.from("message_threads").update({ last_message_at: new Date().toISOString() }).eq("id", threadId);
        setBody("");
        setSent(true);
        setTimeout(() => setSent(false), 3000);
        // Notify guide
        fetch("/api/messages/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId, senderId: user.id, messageBody: body.trim() }),
        }).catch(console.error);
      }
    }
    setSending(false);
  };

  if (authError) return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",justifyContent:"flex-end"}}>
      <div onClick={onClose} style={{flex:1,background:"rgba(0,0,0,0.75)"}}/>
      <div style={{width:500,background:T.carbon,height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,padding:40,borderLeft:`2px solid ${T.wire}`}}>
        <div style={{fontFamily:FONT_DISPLAY,fontSize:32,color:T.white,textAlign:"center"}}>Sign in to message</div>
        <p style={{fontFamily:FONT_BODY,fontSize:15,color:T.silver,textAlign:"center",lineHeight:1.7}}>Create a free account to message this guide.</p>
        <button onClick={()=>window.location.href=`/login?redirect=${encodeURIComponent(window.location.pathname)}`} style={{width:"100%",padding:"15px",background:T.gold,border:"none",borderRadius:8,fontFamily:FONT_BODY,fontSize:15,fontWeight:700,color:T.ink,cursor:"pointer"}}>Sign In / Create Account</button>
        <button onClick={onClose} style={{background:"none",border:"none",color:T.muted,fontFamily:FONT_BODY,fontSize:13,cursor:"pointer"}}>← Back</button>
      </div>
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",justifyContent:"flex-end"}}>
      <div onClick={onClose} style={{flex:1,background:"rgba(0,0,0,0.75)"}}/>
      <div style={{width:500,background:T.carbon,height:"100vh",overflowY:"auto",borderLeft:`2px solid ${T.wire}`,display:"flex",flexDirection:"column"}}>
        <div style={{padding:"24px 28px",borderBottom:`1px solid ${T.wire}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontFamily:FONT_DISPLAY,fontSize:24,color:T.white}}>Message {guide.name}</div>
            <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.silver,marginTop:4}}>Your contact info stays private until you book</div>
          </div>
          <button onClick={onClose} style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:6,color:T.ash,width:36,height:36,cursor:"pointer",fontSize:18}}>×</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"20px 28px",display:"flex",flexDirection:"column",gap:12}}>
          {messages.length === 0 && (
            <div style={{textAlign:"center",padding:"32px 0",fontFamily:FONT_BODY,fontSize:14,color:T.muted}}>
              Start the conversation — ask about availability, experience level requirements, or anything else.
            </div>
          )}
          {messages.map(msg => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start"}}>
                <div style={{maxWidth:"80%",background:isMe?T.goldGlow:T.steel,border:`1px solid ${isMe?T.gold:T.wire}`,borderRadius:isMe?"12px 12px 2px 12px":"12px 12px 12px 2px",padding:"10px 14px"}}>
                  <div style={{fontFamily:FONT_BODY,fontSize:14,color:isMe?T.gold:T.parchment,lineHeight:1.6}}>{msg.body}</div>
                </div>
                <div style={{fontFamily:FONT_BODY,fontSize:11,color:T.muted,marginTop:4}}>
                  {isMe ? "You" : guide.name.split(" ")[0]} · {new Date(msg.created_at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{padding:"16px 28px",borderTop:`1px solid ${T.wire}`}}>
          {sent && <div style={{fontFamily:FONT_BODY,fontSize:13,color:"#6aaa84",marginBottom:10,textAlign:"center"}}>✓ Message sent — {guide.name.split(" ")[0]} usually responds within {guide.responseTime || "24 hours"}</div>}
          <div style={{display:"flex",gap:10}}>
            <textarea value={body} onChange={e=>setBody(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} rows={3} placeholder={`Ask ${guide.name.split(" ")[0]} a question…`} style={{flex:1,background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:"12px 14px",fontFamily:FONT_BODY,fontSize:14,color:T.parchment,outline:"none",resize:"none"}}/>
            <button onClick={send} disabled={sending||!body.trim()} style={{background:T.gold,border:"none",borderRadius:8,padding:"0 18px",fontFamily:FONT_BODY,fontSize:14,fontWeight:700,color:T.ink,cursor:"pointer",opacity:sending||!body.trim()?0.5:1}}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuideProfile({ guide=GUIDE }) {
  const [bookingOpen,setBookingOpen]=useState(false);
  const [messageOpen,setMessageOpen]=useState(false);
  const [activeTab,setActiveTab]=useState("about");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Barlow:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.void};}
        ::placeholder{color:${T.muted};}
        ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:${T.carbon};}::-webkit-scrollbar-thumb{background:${T.wire};border-radius:3px;}
      `}</style>

      {/* ── NAV — void (darkest) ── */}
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,height:64,background:T.void,borderBottom:`1px solid ${T.wire}`,display:"flex",alignItems:"center"}}>
        <div style={{maxWidth:1160,margin:"0 auto",padding:"0 36px",width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:FONT_DISPLAY,fontSize:26,color:T.gold,letterSpacing:"0.14em",fontWeight:500}}>RŌM</div>
          <div style={{display:"flex",gap:28,alignItems:"center"}}>
            <span style={{fontFamily:FONT_BODY,fontSize:14,color:T.ash,cursor:"pointer"}}>Explore</span>
            <span style={{fontFamily:FONT_BODY,fontSize:14,color:T.ash,cursor:"pointer"}}>Become a Guide</span>
            <button onClick={()=>setBookingOpen(true)} style={{background:T.gold,border:"none",borderRadius:6,padding:"10px 22px",fontFamily:FONT_BODY,fontSize:14,fontWeight:700,color:T.ink,cursor:"pointer"}}>Book Now</button>
          </div>
        </div>
      </div>

      {/* ── HERO — carbon (one step up from void) ── */}
      <div style={{position:"relative",height:540,overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,background:`linear-gradient(160deg, #152018 0%, #0b1a24 50%, #1a1205 100%)`}}>
          {guide.coverPhotoUrl && <img src={guide.coverPhotoUrl} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.45,mixBlendMode:"luminosity"}}/>}
          <div style={{position:"absolute",inset:0,backgroundImage:`radial-gradient(ellipse at 15% 90%, ${T.gold}38 0%, transparent 40%), radial-gradient(ellipse at 80% 10%, #1a3a5040 0%, transparent 38%)`}}/>
          <div style={{position:"absolute",bottom:0,left:0,right:0,height:360,background:`linear-gradient(to top, ${T.void} 0%, ${T.void}cc 30%, ${T.void}44 65%, transparent 100%)`}}/>
        </div>
        <div style={{position:"relative",maxWidth:1160,margin:"0 auto",padding:"0 36px",height:"100%",display:"flex",flexDirection:"column",justifyContent:"flex-end",paddingBottom:52}}>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            {guide.verified&&<span style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.gold,background:T.goldGlow,border:`1px solid ${T.gold}`,borderRadius:4,padding:"4px 12px",letterSpacing:"0.1em"}}>✓ VERIFIED</span>}
            {guide.insured&&<span style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.ash,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.22)",borderRadius:4,padding:"4px 12px",letterSpacing:"0.1em"}}>INSURED</span>}
            {guide.licensed&&<span style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.ash,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.22)",borderRadius:4,padding:"4px 12px",letterSpacing:"0.1em"}}>LICENSED</span>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:20,marginBottom:12}}>
            {guide.profilePhotoUrl && <img src={guide.profilePhotoUrl} alt={guide.name} style={{width:80,height:80,borderRadius:"50%",objectFit:"cover",border:`3px solid ${T.gold}`,flexShrink:0}}/>}
            <h1 style={{fontFamily:FONT_DISPLAY,fontSize:64,fontWeight:400,color:T.white,lineHeight:1.0,textShadow:"0 2px 32px rgba(0,0,0,0.9)"}}>{guide.name}</h1>
          </div>
          <div style={{fontFamily:FONT_BODY,fontSize:17,color:T.parchment,marginBottom:28,textShadow:"0 1px 12px rgba(0,0,0,0.9)"}}>{guide.tagline}</div>
          <div style={{display:"inline-flex",alignItems:"center",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(16px)",border:`1px solid ${T.wire}`,borderRadius:8,padding:"11px 20px",alignSelf:"flex-start"}}>
            <div style={{display:"flex",alignItems:"center",gap:7,paddingRight:20}}>
              <Stars rating={guide.rating} size={14}/>
              <span style={{fontFamily:FONT_BODY,fontSize:14,fontWeight:700,color:T.white}}>{guide.rating}</span>
              <span style={{fontFamily:FONT_BODY,fontSize:13,color:T.ash}}>({guide.reviewCount} reviews)</span>
            </div>
            {[`📍 ${guide.location}`,`${guide.yearsExperience} yrs experience`,`${guide.responseRate}% response`].map(txt=>(
              <span key={txt} style={{display:"flex",alignItems:"center"}}>
                <span style={{width:1,height:16,background:T.wire,display:"inline-block",margin:"0 20px"}}/>
                <span style={{fontFamily:FONT_BODY,fontSize:13,color:T.ash}}>{txt}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY — gunmetal (two steps up from void) ── */}
      <div style={{background:T.gunmetal,borderTop:`1px solid ${T.wire}`}}>
        <div style={{maxWidth:1160,margin:"0 auto",padding:"0 36px 96px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 360px",gap:52,alignItems:"start"}}>

            {/* LEFT */}
            <div>
              {/* Tab bar — sits on gunmetal, clearly separated from content below */}
              <div style={{display:"flex",borderBottom:`1px solid ${T.wire}`,marginBottom:0,position:"sticky",top:64,background:T.gunmetal,zIndex:10}}>
                {["about","packages","reviews","field notes"].map(tab=>(
                  <button key={tab} onClick={()=>setActiveTab(tab)} style={{padding:"20px 22px",background:"none",border:"none",borderBottom:`2px solid ${activeTab===tab?T.gold:"transparent"}`,fontFamily:FONT_BODY,fontSize:14,fontWeight:activeTab===tab?700:400,color:activeTab===tab?T.gold:T.silver,cursor:"pointer",textTransform:"capitalize",letterSpacing:"0.04em",transition:"color 0.15s"}}>{tab}</button>
                ))}
              </div>

              {/* Content area — steel (three steps up from void) */}
              <div style={{marginTop:0}}>

                {/* ABOUT */}
                {activeTab==="about"&&(
                  <div style={{paddingTop:36}}>
                    <h2 style={{fontFamily:FONT_DISPLAY,fontSize:38,color:T.white,fontWeight:400,marginBottom:22}}>About {guide.name.split(" ")[0]}</h2>
                    {guide.bio.split("\\n\\n").map((p,i)=>(
                      <p key={i} style={{fontFamily:FONT_BODY,fontSize:16,color:T.ash,lineHeight:1.85,marginBottom:20}}>{p}</p>
                    ))}
                    {/* Stat cards */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:36}}>
                      {[["◷","Response time",`Usually ${guide.responseTime}`],["◉","Location",guide.location],["✦","Experience",`${guide.yearsExperience} years guiding`],["◈","Specialty",guide.categories.join(", ")]].map(([icon,label,val])=>(
                        <div key={label} style={{display:"flex",gap:14,padding:20,background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8}}>
                          <span style={{fontSize:18,color:T.gold,marginTop:1}}>{icon}</span>
                          <div>
                            <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5}}>{label}</div>
                            <div style={{fontFamily:FONT_BODY,fontSize:14,color:T.parchment,fontWeight:500}}>{val}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Photo Gallery */}
                    {guide.galleryPhotos && guide.galleryPhotos.length > 0 && (
                      <div style={{marginTop:40}}>
                        <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:16}}>Trip Photos</div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                          {guide.galleryPhotos.filter(Boolean).map((url,i)=>(
                            <div key={i} style={{aspectRatio:"1",borderRadius:8,overflow:"hidden"}}>
                              <img src={url} alt={`Trip photo ${i+1}`} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Gallery */}
                    {guide.galleryPhotos && guide.galleryPhotos.length > 0 && (
                      <div style={{marginTop:40}}>
                        <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:16}}>Trip Gallery</div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                          {guide.galleryPhotos.filter(Boolean).map((url,i)=>(
                            <div key={i} style={{aspectRatio:"1",borderRadius:8,overflow:"hidden"}}>
                              <img src={url} alt={`Trip photo ${i+1}`} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Credentials */}
                    {guide.slug==="rich-garfield" && (
                      <>
                      <div style={{marginTop:48,marginBottom:20}}>
                        <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:16}}>Credentials & Certifications</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                          {["NYS Licensed Professional Guide","30 Years Experience","Fully Insured","Adirondack Native","Independent Operator"].map(c=>(
                            <span key={c} style={{fontFamily:FONT_BODY,fontSize:13,color:T.parchment,background:T.steel,border:`1px solid ${T.gold}`,borderRadius:20,padding:"6px 14px",display:"flex",alignItems:"center",gap:6}}>
                              <span style={{color:T.gold,fontSize:11}}>✓</span> {c}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Waters */}
                      <div style={{marginTop:40}}>
                        <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:16}}>Waters Rich Guides</div>
                        <div style={{display:"flex",flexDirection:"column",gap:10}}>
                          {[
                            ["West Branch Ausable River","Lake Placid · Wilmington · Jay","The crown jewel of Adirondack fly fishing. World-class spring hatches, wild browns and brookies."],
                            ["East Branch Ausable River","Keene Valley area","Remote and wild. Less pressure, big fish. Rich knows every pool."],
                            ["Saranac River","Saranac Lake · Plattsburgh","Diverse water from freestone rapids to slow pools. Excellent brown trout fishery."],
                            ["Backcountry Ponds","Northern Adirondacks","Remote brook trout ponds most anglers never find. Accessible only by foot or canoe."],
                            ["Salmon River","Malone area","Landlocked Atlantic salmon and trophy browns in overlooked water."],
                          ].map(([name,loc,desc])=>(
                            <div key={name} style={{background:T.steel,border:`1px solid ${T.wire}`,borderLeft:`3px solid ${T.gold}`,borderRadius:8,padding:"18px 20px"}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                                <div style={{fontFamily:FONT_BODY,fontSize:15,fontWeight:700,color:T.white}}>{name}</div>
                                <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver,textAlign:"right",flexShrink:0,marginLeft:12}}>📍 {loc}</div>
                              </div>
                              <div style={{fontFamily:FONT_BODY,fontSize:14,color:T.ash,lineHeight:1.65}}>{desc}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Best times */}
                      <div style={{marginTop:40}}>
                        <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:16}}>Best Times to Book</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                          {[
                            ["🌱 Spring (Apr–Jun)","Prime hatch season. Hendricksons, Cahills, and Green Drakes bring the biggest fish up. Book early."],
                            ["☀️ Summer (Jul–Aug)","Early morning and evening sessions. Terrestrials and hoppers on warm afternoons."],
                            ["🍂 Fall (Sep–Oct)","Brown trout pre-spawn. Some of the biggest fish of the year on the swing."],
                            ["❄️ Winter (Dec–Mar)","Ice fishing available. Backcountry brook trout through the ice."],
                          ].map(([season,desc])=>(
                            <div key={season} style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:"16px 18px"}}>
                              <div style={{fontFamily:FONT_BODY,fontSize:14,fontWeight:700,color:T.parchment,marginBottom:8}}>{season}</div>
                              <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.ash,lineHeight:1.6}}>{desc}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* What to expect */}
                      <div style={{marginTop:40,background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:"28px 24px"}}>
                        <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:20}}>What to Bring</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                          {["Valid NY fishing license","Wading boots (felt or rubber sole)","Polarized sunglasses","Rain jacket","Lunch and water","Camera — you'll want it"].map(item=>(
                            <div key={item} style={{display:"flex",alignItems:"center",gap:8,fontFamily:FONT_BODY,fontSize:14,color:T.ash}}>
                              <span style={{color:T.gold,fontSize:12}}>✦</span> {item}
                            </div>
                          ))}
                        </div>
                        <div style={{marginTop:20,paddingTop:16,borderTop:`1px solid ${T.rim}`,fontFamily:FONT_BODY,fontSize:13,color:T.silver,lineHeight:1.65}}>
                          Rich provides all flies, leaders, and tippet. Loaner rods available on request. All skill levels welcome — beginners will leave as better anglers.
                        </div>
                      </div>

                      {/* Reviews highlight */}
                      <div style={{marginTop:40}}>
                        <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:16}}>What Guests Say</div>
                        <div style={{display:"flex",flexDirection:"column",gap:12}}>
                          {[
                            ["Rich is the standard against which all fly guides should be measured. Full day, pulled 30+ trout.","Mark D."],
                            ["Shakespeare lost sleep wishing he could write like Rick Garfield reads water.","James K."],
                            ["Rich is an incredible guide. World class experience fly fishing for small stream Brook trout.","Sarah M."],
                            ["Found him highly knowledgeable and no-nonsense. Got on fish and learned a ton. Will be back.","Tom R."],
                          ].map(([quote,author])=>(
                            <div key={author} style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:"18px 20px"}}>
                              <div style={{fontFamily:FONT_DISPLAY,fontSize:17,color:T.parchment,fontStyle:"italic",lineHeight:1.65,marginBottom:10}}>"{quote}"</div>
                              <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.gold,fontWeight:700}}>— {author}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      </>
                    )}
                  </div>
                )}

                {/* PACKAGES */}
                {activeTab==="packages"&&(
                  <div style={{paddingTop:36}}>
                    <h2 style={{fontFamily:FONT_DISPLAY,fontSize:38,color:T.white,fontWeight:400,marginBottom:28}}>Experiences with {guide.name.split(" ")[0]}</h2>
                    <div style={{display:"flex",flexDirection:"column",gap:2}}>
                      {guide.packages.map((pkg,idx)=>(
                        <div key={pkg.id} style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,overflow:"hidden",marginBottom:16}}>
                          {/* Package image strip */}
                          <div style={{height:140,background:`linear-gradient(135deg, #152018 0%, #0b1a24 100%)`,position:"relative",borderBottom:`1px solid ${T.wire}`}}>
                            <div style={{position:"absolute",inset:0,backgroundImage:`radial-gradient(ellipse at ${30+idx*20}% 70%, ${T.gold}20 0%, transparent 50%)`}}/>
                            <div style={{position:"absolute",bottom:14,left:20,display:"flex",gap:8}}>
                              <span style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.gold,background:T.goldGlow,border:`1px solid ${T.gold}`,borderRadius:4,padding:"3px 10px"}}>{pkg.category}</span>
                              <span style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.ash,background:"rgba(0,0,0,0.5)",border:`1px solid ${T.wire}`,borderRadius:4,padding:"3px 10px"}}>{pkg.duration}</span>
                            </div>
                          </div>
                          {/* Package content */}
                          <div style={{padding:26}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                              <h3 style={{fontFamily:FONT_DISPLAY,fontSize:26,color:T.white,fontWeight:400,lineHeight:1.15}}>{pkg.title}</h3>
                              <div style={{textAlign:"right",flexShrink:0,marginLeft:20}}>
                                <div style={{fontFamily:FONT_DISPLAY,fontSize:30,color:T.gold,fontWeight:500}}>${pkg.price}</div>
                                <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver,fontWeight:600}}>{pkg.priceType==="person"?"per person":"flat rate"}</div>
                              </div>
                            </div>
                            <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.silver,marginBottom:14}}>{pkg.minGuests===pkg.maxGuests?`${pkg.minGuests} guests`:`${pkg.minGuests}–${pkg.maxGuests} guests`}</div>
                            <p style={{fontFamily:FONT_BODY,fontSize:15,color:T.ash,lineHeight:1.75,marginBottom:16}}>{pkg.description}</p>
                            {/* Includes bar — lifted background = 4th tier */}
                            <div style={{background:T.lifted,border:`1px solid ${T.wire}`,borderRadius:6,padding:"12px 16px",marginBottom:22}}>
                              <span style={{fontFamily:FONT_BODY,fontSize:13,color:T.silver}}><span style={{color:T.parchment,fontWeight:700}}>Includes: </span>{pkg.includes}</span>
                            </div>
                            <button onClick={()=>setBookingOpen(true)} style={{background:T.gold,border:"none",borderRadius:6,padding:"12px 26px",fontFamily:FONT_BODY,fontSize:14,fontWeight:700,color:T.ink,cursor:"pointer"}}>Book This Experience →</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* REVIEWS */}
                {activeTab==="reviews"&&(
                  <div style={{paddingTop:36}}>
                    {/* Rating summary bar */}
                    <div style={{display:"flex",alignItems:"center",gap:24,marginBottom:32,padding:24,background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10}}>
                      <div style={{textAlign:"center",paddingRight:24,borderRight:`1px solid ${T.wire}`}}>
                        <div style={{fontFamily:FONT_DISPLAY,fontSize:60,color:T.white,fontWeight:300,lineHeight:1}}>{guide.rating}</div>
                        <Stars rating={guide.rating} size={18}/>
                        <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver,marginTop:4}}>{guide.reviewCount} reviews</div>
                      </div>
                      <div style={{flex:1}}>
                        {[5,4,3].map(n=>(
                          <div key={n} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                            <span style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver,width:8}}>{n}</span>
                            <span style={{fontSize:11,color:T.gold}}>★</span>
                            <div style={{flex:1,height:6,background:T.lifted,borderRadius:3,overflow:"hidden"}}>
                              <div style={{height:"100%",width:n===5?"96%":n===4?"3%":"1%",background:T.gold,borderRadius:3}}/>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:12}}>
                      {guide.reviews.map(r=>(
                        <div key={r.id} style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:24}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${T.rim}`}}>
                            <div style={{display:"flex",gap:12,alignItems:"center"}}>
                              <div style={{width:40,height:40,borderRadius:"50%",background:T.lifted,border:`1px solid ${T.wire}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_BODY,fontSize:15,fontWeight:700,color:T.ash}}>{r.guest[0]}</div>
                              <div>
                                <div style={{fontFamily:FONT_BODY,fontSize:14,fontWeight:700,color:T.parchment}}>{r.guest}</div>
                                <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver,marginTop:2}}>{r.trip}</div>
                              </div>
                            </div>
                            <div style={{textAlign:"right"}}>
                              <Stars rating={r.rating} size={13}/>
                              <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver,marginTop:3}}>{r.date}</div>
                            </div>
                          </div>
                          <p style={{fontFamily:FONT_BODY,fontSize:15,color:T.ash,lineHeight:1.78}}>{r.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FIELD NOTES */}
                {activeTab==="field notes"&&(
                  <div style={{paddingTop:36}}>
                    <h2 style={{fontFamily:FONT_DISPLAY,fontSize:38,color:T.white,fontWeight:400,marginBottom:8}}>Field Notes</h2>
                    <p style={{fontFamily:FONT_BODY,fontSize:15,color:T.silver,marginBottom:32}}>Stories, observations, and honest writing from the water.</p>
                    <div style={{display:"flex",flexDirection:"column",gap:14}}>
                      {guide.fieldNotes.map(n=>(
                        <div key={n.title} style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:28,cursor:"pointer"}}>
                          <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.gold,marginBottom:10,letterSpacing:"0.1em",textTransform:"uppercase"}}>{n.date}</div>
                          <h3 style={{fontFamily:FONT_DISPLAY,fontSize:26,color:T.white,fontWeight:400,marginBottom:12,lineHeight:1.2}}>{n.title}</h3>
                          <p style={{fontFamily:FONT_BODY,fontSize:15,color:T.ash,lineHeight:1.75,marginBottom:14}}>{n.preview}</p>
                          <div style={{fontFamily:FONT_BODY,fontSize:13,fontWeight:700,color:T.gold}}>Read more →</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT — booking card */}
            <div style={{position:"sticky",top:80,paddingTop:36}}>
              <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:12,overflow:"hidden",boxShadow:`0 8px 40px rgba(0,0,0,0.4)`}}>
                {/* Price header — void background = maximum contrast */}
                <div style={{background:T.void,padding:"22px 24px",borderBottom:`1px solid ${T.wire}`}}>
                  <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>Starting from</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                    <span style={{fontFamily:FONT_DISPLAY,fontSize:48,color:T.white,fontWeight:300,lineHeight:1}}>${Math.min(...guide.packages.map(p=>p.price))}</span>
                    <span style={{fontFamily:FONT_BODY,fontSize:14,color:T.silver}}>/ person</span>
                  </div>
                </div>

                <div style={{padding:"22px 24px"}}>
                  <button onClick={()=>setBookingOpen(true)} style={{width:"100%",padding:"15px",background:T.gold,border:"none",borderRadius:8,fontFamily:FONT_BODY,fontSize:15,fontWeight:700,color:T.ink,cursor:"pointer",marginBottom:10}}>
                    Book with {guide.name.split(" ")[0]} →
                  </button>
                  <button onClick={()=>setMessageOpen(true)} style={{width:"100%",padding:"13px",background:"transparent",border:`1px solid ${T.wire}`,borderRadius:8,fontFamily:FONT_BODY,fontSize:14,fontWeight:600,color:T.ash,cursor:"pointer",marginBottom:16}}>
                    Message {guide.name.split(" ")[0]}
                  </button>
                  <div style={{textAlign:"center",fontFamily:FONT_BODY,fontSize:12,color:T.silver,marginBottom:22}}>25% deposit · no charge until confirmed</div>

                  <div style={{height:1,background:T.wire,marginBottom:20}}/>

                  <div style={{display:"flex",flexDirection:"column",gap:13}}>
                    {[["◷",`Responds ${guide.responseTime}`],["◉",`${guide.responseRate}% response rate`],["★",`${guide.reviewCount} five-star reviews`],["◬","Verified, licensed & insured"]].map(([icon,text])=>(
                      <div key={text} style={{display:"flex",gap:12,alignItems:"center"}}>
                        <span style={{color:T.gold,fontSize:14,width:18,textAlign:"center",flexShrink:0}}>{icon}</span>
                        <span style={{fontFamily:FONT_BODY,fontSize:13,color:T.ash}}>{text}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{height:1,background:T.wire,margin:"20px 0"}}/>

                  {/* Cancellation policy — lifted = distinct inner block */}
                  <div style={{background:T.lifted,border:`1px solid ${T.rim}`,borderRadius:6,padding:14}}>
                    <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver,lineHeight:1.65,textAlign:"center"}}>
                      Free cancellation 30+ days before trip.<br/>50% refund 14–29 days before trip.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {bookingOpen&&<BookingPanel guide={guide} onClose={()=>setBookingOpen(false)}/>}
      {messageOpen&&<MessagePanel guide={guide} onClose={()=>setMessageOpen(false)}/>}
    </>
  );
}

// ─── PAGE WRAPPER ─────────────────────────────────────────────────────────────
export default function GuideProfilePage({ params }) {
  const { slug } = React.use(params);
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (slug) fetchGuide(slug);
  }, [slug]);

  const fetchGuide = async (slug) => {
    try {
      const supabase = getSupabase();

      const { data: g, error } = await supabase
        .from("guides")
        .select("*, profiles(full_name, avatar_url, email), gallery_photos, profile_photo_url, cover_photo_url")
        .eq("slug", slug)
        .single();

      if (error || !g) { setNotFound(true); setLoading(false); return; }

      const { data: packages } = await supabase
        .from("packages")
        .select("*")
        .eq("guide_id", g.id)
        .eq("active", true)
        .order("sort_order");

      const { data: reviews } = await supabase
        .from("reviews")
        .select("*, profiles(full_name)")
        .eq("guide_id", g.id)
        .order("created_at", { ascending: false })
        .limit(10);

      await supabase.rpc("increment_guide_views", { guide_id: g.id }).maybeSingle();

      const shaped = {
        id: g.id,
        name: g.profiles?.full_name || "Guide",
        email: g.profiles?.email || null,
        slug: g.slug,
        tagline: g.tagline || "",
        bio: g.bio || "",
        location: g.location || "",
        rating: parseFloat(g.rating) || 0,
        reviewCount: g.review_count || 0,
        responseRate: g.response_rate || 0,
        responseTime: "within 24 hours",
        yearsExperience: g.years_experience ? parseInt(g.years_experience) : null,
        verified: g.verified,
        insured: g.insured,
        licensed: g.licensed,
        categories: g.categories || [],
        profilePhotoUrl: g.profile_photo_url || null,
        coverPhotoUrl: g.cover_photo_url || null,
        galleryPhotos: g.gallery_photos || [],
        packages: (packages || []).map(p => ({
          id: p.id,
          title: p.title,
          duration: p.duration,
          priceType: p.price_type,
          price: p.price,
          minGuests: p.min_guests,
          maxGuests: p.max_guests,
          includes: p.includes,
          description: p.description,
          category: p.category,
        })),
        reviews: (reviews || []).map(r => ({
          id: r.id,
          guest: r.profiles?.full_name || "Traveler",
          rating: r.rating,
          date: new Date(r.created_at).toLocaleDateString("en-US", { month:"short", year:"numeric" }),
          trip: r.trip_label || "",
          text: r.body,
        })),
        fieldNotes: [],
      };

      setGuide(shaped);
    } catch(e) {
      console.error("fetchGuide error:", e);
      setNotFound(true);
    }
    setLoading(false);
  };

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#080a0b",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:32,color:"#c9973a",letterSpacing:"0.14em"}}>RŌM</div>
    </div>
  );

  if (notFound) return (
    <div style={{minHeight:"100vh",background:"#080a0b",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:48,color:"#f5f2ee",fontWeight:300}}>Guide not found</div>
      <button onClick={()=>window.location.href="/search"} style={{background:"#c9973a",border:"none",borderRadius:6,padding:"11px 24px",fontFamily:"'Barlow',system-ui,sans-serif",fontSize:14,fontWeight:700,color:"#080a0b",cursor:"pointer"}}>Browse Guides</button>
    </div>
  );

  const guideData = guide && guide.packages.length > 0 ? guide : { ...guide, packages: GUIDE.packages, reviews: GUIDE.reviews };

  return <GuideProfile guide={guideData}/>;
}
