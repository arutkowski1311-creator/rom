"use client";
import { useState, useEffect } from "react";

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => { const c=()=>setM(window.innerWidth<768); c(); window.addEventListener("resize",c); return()=>window.removeEventListener("resize",c); },[]);
  return m;
}

const T = {
  void:"#080a0b", carbon:"#0f1214", gunmetal:"#171b1e", steel:"#1f2428",
  lifted:"#272c31", rim:"#323840", wire:"#424c54", muted:"#5a6470",
  silver:"#8a96a0", ash:"#b8c2ca", parchment:"#e8e2d8", white:"#f5f2ee",
  gold:"#c9973a", goldGlow:"#c9973a28", ink:"#080a0b",
};
const FONT_DISPLAY = "'Cormorant Garamond', Georgia, serif";
const FONT_BODY = "'Barlow', system-ui, sans-serif";

const PERKS = [
  { icon:"◎", title:"100% of your listed price", body:"We charge guests a 15% service fee on top of your rate. Your listed price is your payout, every time. No commissions, no surprises." },
  { icon:"◈", title:"Verified-only marketplace", body:"Every guide is manually reviewed. No race to the bottom. Your competition is other professionals, not discount operators." },
  { icon:"◷", title:"Booking handled for you", body:"Guests book and pay through RŌM. You get notified, confirm the trip, and show up to guide. We handle the payment infrastructure." },
  { icon:"✦", title:"No long-term contracts", body:"List today, adjust anytime. Your packages, your calendar, your rules. Leave whenever you want — no penalties." },
];

const STEPS = [
  { num:"01", title:"Apply in 5 minutes", body:"Fill out your guide profile — bio, location, activity types, and your packages. No lengthy approval forms." },
  { num:"02", title:"We review within 48 hours", body:"Our team reviews every application personally. We check licensing, insurance, and credentials before approving." },
  { num:"03", title:"Go live and start booking", body:"Once approved, your profile is live. Guests can find you, message you, and book directly." },
];

export default function BecomeAGuidePage() {
  const isMobile = useIsMobile();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=Barlow:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{width:100%;overflow-x:hidden;}
        body{background:${T.void};}
      `}</style>

      {/* Nav */}
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,height:64,background:scrolled?T.void:"transparent",borderBottom:`1px solid ${scrolled?T.wire:"transparent"}`,transition:"all 0.35s",display:"flex",alignItems:"center"}}>
        <div style={{maxWidth:1200,margin:"0 auto",padding:"0 24px",width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div onClick={()=>window.location.href="/"} style={{fontFamily:FONT_DISPLAY,fontSize:28,color:T.gold,letterSpacing:"0.16em",cursor:"pointer"}}>RŌM</div>
          <div style={{display:"flex",gap:24,alignItems:"center"}}>
            <span onClick={()=>window.location.href="/search"} style={{fontFamily:FONT_BODY,fontSize:14,color:T.ash,cursor:"pointer"}}>Browse Guides</span>
            <span onClick={()=>window.location.href="/login"} style={{fontFamily:FONT_BODY,fontSize:14,color:T.ash,cursor:"pointer"}}>Sign In</span>
            <button onClick={()=>window.location.href="/guide/onboarding"} style={{background:T.gold,border:"none",borderRadius:6,padding:"10px 22px",fontFamily:FONT_BODY,fontSize:14,fontWeight:700,color:T.ink,cursor:"pointer"}}>Apply Now</button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={{position:"relative",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(160deg, #0b1812 0%, #081018 50%, #120e04 100%)`}}>
        <img src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&q=80&fit=crop" alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.15}}/>
        <div style={{position:"absolute",inset:0,background:`linear-gradient(to bottom, transparent 50%, ${T.void} 100%)`}}/>
        <div style={{position:"relative",maxWidth:800,margin:"0 auto",padding:`120px 24px 80px`,textAlign:"center"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:10,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(12px)",border:`1px solid ${T.wire}`,borderRadius:20,padding:"7px 16px",marginBottom:32}}>
            <span style={{fontFamily:FONT_BODY,fontSize:13,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.1em"}}>Now accepting applications</span>
          </div>
          <h1 style={{fontFamily:FONT_DISPLAY,fontSize:isMobile?"clamp(48px,10vw,72px)":"clamp(56px,6vw,88px)",fontWeight:400,color:T.white,lineHeight:1.05,marginBottom:24}}>
            Your territory.<br/>
            <span style={{color:T.gold,fontStyle:"italic"}}>Your business.</span>
          </h1>
          <p style={{fontFamily:FONT_BODY,fontSize:isMobile?16:18,color:T.ash,lineHeight:1.75,marginBottom:48,maxWidth:580,margin:"0 auto 48px"}}>
            RŌM was built for independent guides who are the best at what they do. List your packages, set your own prices, and keep every dollar you earn. We handle the bookings.
          </p>
          <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={()=>window.location.href="/guide/onboarding"} style={{background:T.gold,border:"none",borderRadius:8,padding:"16px 36px",fontFamily:FONT_BODY,fontSize:16,fontWeight:700,color:T.ink,cursor:"pointer"}}>
              Apply to Guide →
            </button>
            <button onClick={()=>window.location.href="/search"} style={{background:"transparent",border:`1px solid ${T.wire}`,borderRadius:8,padding:"16px 36px",fontFamily:FONT_BODY,fontSize:16,color:T.ash,cursor:"pointer"}}>
              See How It Works
            </button>
          </div>
          <p style={{fontFamily:FONT_BODY,fontSize:14,color:T.muted,marginTop:20}}>48hr decision · No setup fees · Cancel anytime</p>
        </div>
      </div>

      {/* Perks */}
      <div style={{background:T.carbon,borderTop:`1px solid ${T.wire}`,borderBottom:`1px solid ${T.wire}`}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"80px 24px"}}>
          <div style={{textAlign:"center",marginBottom:56}}>
            <div style={{fontFamily:FONT_BODY,fontSize:13,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:12}}>Why guide with RŌM</div>
            <h2 style={{fontFamily:FONT_DISPLAY,fontSize:isMobile?36:52,color:T.white,fontWeight:400}}>Built for the guide, not the platform</h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:24}}>
            {PERKS.map(p=>(
              <div key={p.title} style={{background:T.steel,border:`1px solid ${T.wire}`,borderLeft:`3px solid ${T.gold}`,borderRadius:10,padding:"32px 28px"}}>
                <div style={{fontSize:28,color:T.gold,marginBottom:16}}>{p.icon}</div>
                <div style={{fontFamily:FONT_BODY,fontSize:17,fontWeight:700,color:T.white,marginBottom:10}}>{p.title}</div>
                <div style={{fontFamily:FONT_BODY,fontSize:15,color:T.ash,lineHeight:1.75}}>{p.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{background:T.gunmetal,borderBottom:`1px solid ${T.wire}`}}>
        <div style={{maxWidth:900,margin:"0 auto",padding:"80px 24px",textAlign:"center"}}>
          <div style={{fontFamily:FONT_BODY,fontSize:13,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:12}}>The process</div>
          <h2 style={{fontFamily:FONT_DISPLAY,fontSize:isMobile?36:52,color:T.white,fontWeight:400,marginBottom:56}}>Simple by design</h2>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:16}}>
            {STEPS.map(s=>(
              <div key={s.num} style={{background:T.steel,border:`1px solid ${T.wire}`,borderTop:`3px solid ${T.gold}`,borderRadius:10,padding:"36px 28px",textAlign:"left"}}>
                <div style={{fontFamily:FONT_DISPLAY,fontSize:56,color:T.gold,fontWeight:300,opacity:0.5,lineHeight:1,marginBottom:16}}>{s.num}</div>
                <div style={{fontFamily:FONT_DISPLAY,fontSize:24,color:T.white,fontWeight:400,marginBottom:12}}>{s.title}</div>
                <div style={{fontFamily:FONT_BODY,fontSize:15,color:T.ash,lineHeight:1.75}}>{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Earnings calculator */}
      <div style={{background:T.carbon,borderBottom:`1px solid ${T.wire}`}}>
        <div style={{maxWidth:700,margin:"0 auto",padding:"80px 24px",textAlign:"center"}}>
          <div style={{fontFamily:FONT_BODY,fontSize:13,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:12}}>Do the math</div>
          <h2 style={{fontFamily:FONT_DISPLAY,fontSize:isMobile?36:52,color:T.white,fontWeight:400,marginBottom:16}}>What you actually keep</h2>
          <p style={{fontFamily:FONT_BODY,fontSize:16,color:T.ash,lineHeight:1.75,marginBottom:48}}>
            On most platforms, guides pay 20–30% in commissions. On RŌM, you keep 100% of your listed price. Guests pay a 15% service fee on top — that's how we operate.
          </p>
          <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:12,padding:"40px 36px"}}>
            {[
              ["Your listed rate","$300 / day"],
              ["Guest pays","$345 (your rate + 15% fee)"],
              ["You receive","$300"],
              ["RŌM keeps","$45 (guest fee only)"],
            ].map(([label,val],i)=>(
              <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 0",borderBottom:i<3?`1px solid ${T.rim}`:"none"}}>
                <span style={{fontFamily:FONT_BODY,fontSize:16,color:T.silver}}>{label}</span>
                <span style={{fontFamily:FONT_BODY,fontSize:18,fontWeight:700,color:i===2?T.gold:T.parchment}}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{background:T.void,padding:"80px 24px",textAlign:"center"}}>
        <h2 style={{fontFamily:FONT_DISPLAY,fontSize:isMobile?40:60,color:T.white,fontWeight:400,marginBottom:16}}>
          Ready to list your first trip?
        </h2>
        <p style={{fontFamily:FONT_BODY,fontSize:16,color:T.ash,marginBottom:40}}>Takes 5 minutes. We'll review within 48 hours.</p>
        <button onClick={()=>window.location.href="/guide/onboarding"} style={{background:T.gold,border:"none",borderRadius:8,padding:"18px 48px",fontFamily:FONT_BODY,fontSize:17,fontWeight:700,color:T.ink,cursor:"pointer"}}>
          Apply to Guide →
        </button>
      </div>
    </>
  );
}
