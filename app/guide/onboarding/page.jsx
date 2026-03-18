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
  void:"#080a0b", carbon:"#0f1214", gunmetal:"#171b1e", steel:"#1f2428",
  lifted:"#272c31", rim:"#323840", wire:"#424c54", muted:"#5a6470",
  silver:"#8a96a0", ash:"#b8c2ca", parchment:"#e8e2d8", white:"#f5f2ee",
  gold:"#c9973a", goldGlow:"#c9973a28", ink:"#080a0b",
};
const FONT_DISPLAY = "'Cormorant Garamond', Georgia, serif";
const FONT_BODY = "'Barlow', system-ui, sans-serif";

const CATEGORIES = [
  "Fly Fishing","Hunting","Hiking","Rock Climbing","Kayaking",
  "Surfing","Diving","Wildlife","Photography","Sailing","Camping",
  "Snowshoeing","Ice Fishing","Backpacking","Mountain Biking",
];

const STEPS = ["Account","Profile","Categories","Packages","Done"];

function Input({ label, value, onChange, placeholder, type="text", multiline=false, required=false }) {
  return (
    <div style={{marginBottom:20}}>
      <label style={{fontFamily:FONT_BODY,fontSize:14,fontWeight:600,color:T.ash,display:"block",marginBottom:8}}>
        {label}{required&&<span style={{color:T.gold}}> *</span>}
      </label>
      {multiline ? (
        <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={4}
          style={{width:"100%",background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:"12px 16px",fontFamily:FONT_BODY,fontSize:15,color:T.parchment,outline:"none",resize:"vertical",lineHeight:1.6}}/>
      ) : (
        <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          style={{width:"100%",background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:"12px 16px",fontFamily:FONT_BODY,fontSize:15,color:T.parchment,outline:"none"}}/>
      )}
    </div>
  );
}

function GoldBtn({ children, onClick, disabled, outline=false, small=false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background:outline?"transparent":disabled?"#5a4a20":T.gold,
      border:`1px solid ${outline?T.wire:T.gold}`,
      borderRadius:7, padding:small?"9px 20px":"13px 28px",
      fontFamily:FONT_BODY, fontSize:small?14:15, fontWeight:700,
      color:outline?T.ash:T.ink, cursor:disabled?"not-allowed":"pointer",
      opacity:disabled?0.6:1, transition:"all 0.15s",
    }}>{children}</button>
  );
}

export default function GuideOnboarding() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 0 — Account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Step 1 — Profile
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [yearsExp, setYearsExp] = useState("");
  const [website, setWebsite] = useState("");

  // Step 2 — Categories
  const [selectedCats, setSelectedCats] = useState([]);

  // Step 3 — Packages
  const [packages, setPackages] = useState([
    { title:"", duration:"", price:"", priceType:"person", description:"" }
  ]);

  const [guideId, setGuideId] = useState(null);

  const toggleCat = (cat) => {
    setSelectedCats(prev =>
      prev.includes(cat) ? prev.filter(c=>c!==cat) : [...prev, cat]
    );
  };

  const updatePackage = (i, field, val) => {
    setPackages(prev => prev.map((p,idx) => idx===i ? {...p,[field]:val} : p));
  };

  const addPackage = () => {
    if (packages.length < 5) {
      setPackages(prev => [...prev, {title:"",duration:"",price:"",priceType:"person",description:""}]);
    }
  };

  const removePackage = (i) => {
    setPackages(prev => prev.filter((_,idx)=>idx!==i));
  };

  const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

  const handleAccountSubmit = async () => {
    if (!email || !password || !fullName) { setError("All fields required."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError(""); setLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) { setError(signUpError.message); setLoading(false); return; }
      // Insert profile
      const { error: profError } = await supabase.from("profiles").insert({
        id: data.user.id, full_name: fullName, role: "guide", email
      });
      if (profError) { setError(profError.message); setLoading(false); return; }
      setStep(1);
    } catch(e) { setError("Something went wrong. Please try again."); }
    setLoading(false);
  };

  const handleProfileSubmit = async () => {
    if (!tagline || !bio || !location) { setError("Name, tagline, bio, and location are required."); return; }
    setError(""); setStep(2);
  };

  const handleCategoriesSubmit = async () => {
    if (selectedCats.length === 0) { setError("Select at least one activity type."); return; }
    setError(""); setStep(3);
  };

  const handlePackagesSubmit = async () => {
    const valid = packages.filter(p => p.title && p.price);
    if (valid.length === 0) { setError("Add at least one package with a title and price."); return; }
    setError(""); setLoading(true);
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Not logged in."); setLoading(false); return; }

      // Insert guide
      const slug = slugify(fullName) + "-" + Math.random().toString(36).slice(2,6);
      const { data: guide, error: guideError } = await supabase.from("guides").insert({
        profile_id: user.id,
        slug,
        tagline,
        bio,
        location,
        categories: selectedCats,
        years_experience: yearsExp ? parseInt(yearsExp) : null,
        website: website || null,
        verified: false,
        insured: false,
        licensed: false,
        status: "pending",
      }).select().single();

      if (guideError) { setError(guideError.message); setLoading(false); return; }
      setGuideId(guide.id);

      // Insert packages
      const pkgInserts = valid.map((p, i) => ({
        guide_id: guide.id,
        title: p.title,
        duration: p.duration || null,
        price: parseFloat(p.price),
        price_type: p.priceType,
        description: p.description || null,
        active: true,
        sort_order: i + 1,
        min_guests: 1,
        max_guests: 6,
      }));
      await supabase.from("packages").insert(pkgInserts);

      setStep(4);
    } catch(e) { setError("Something went wrong. Please try again."); }
    setLoading(false);
  };

  const progressPct = (step / (STEPS.length - 1)) * 100;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=Barlow:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{width:100%;background:${T.void};}
        input,textarea,select{color:${T.parchment}!important;}
        input::placeholder,textarea::placeholder{color:${T.muted}!important;}
        select option{background:${T.steel};}
      `}</style>

      {/* Nav */}
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,height:64,background:T.void,borderBottom:`1px solid ${T.wire}`,display:"flex",alignItems:"center"}}>
        <div style={{maxWidth:1200,margin:"0 auto",padding:"0 24px",width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div onClick={()=>window.location.href="/"} style={{fontFamily:FONT_DISPLAY,fontSize:28,color:T.gold,letterSpacing:"0.16em",cursor:"pointer"}}>RŌM</div>
          <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.silver}}>Guide Application</div>
        </div>
      </div>

      <div style={{minHeight:"100vh",paddingTop:64,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"100px 24px 60px"}}>
        <div style={{width:"100%",maxWidth:600}}>

          {/* Progress bar */}
          {step < 4 && (
            <div style={{marginBottom:40}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                {STEPS.slice(0,4).map((s,i)=>(
                  <span key={s} style={{fontFamily:FONT_BODY,fontSize:12,color:i<=step?T.gold:T.muted,fontWeight:i===step?700:400}}>{s}</span>
                ))}
              </div>
              <div style={{height:3,background:T.wire,borderRadius:2}}>
                <div style={{height:"100%",width:`${progressPct}%`,background:T.gold,borderRadius:2,transition:"width 0.4s"}}/>
              </div>
            </div>
          )}

          {error && (
            <div style={{background:"rgba(180,60,60,0.15)",border:"1px solid rgba(180,60,60,0.4)",borderRadius:8,padding:"12px 16px",marginBottom:24,fontFamily:FONT_BODY,fontSize:14,color:"#f08080"}}>
              {error}
            </div>
          )}

          {/* Step 0 — Account */}
          {step === 0 && (
            <div>
              <div style={{fontFamily:FONT_DISPLAY,fontSize:42,color:T.white,fontWeight:400,marginBottom:8}}>Create your account</div>
              <p style={{fontFamily:FONT_BODY,fontSize:15,color:T.silver,marginBottom:36,lineHeight:1.6}}>Start your guide application. Takes about 5 minutes.</p>
              <Input label="Full name" value={fullName} onChange={setFullName} placeholder="Your legal name" required/>
              <Input label="Email address" value={email} onChange={setEmail} placeholder="you@email.com" type="email" required/>
              <Input label="Password" value={password} onChange={setPassword} placeholder="At least 8 characters" type="password" required/>
              <div style={{marginTop:32,display:"flex",gap:16,alignItems:"center"}}>
                <GoldBtn onClick={handleAccountSubmit} disabled={loading}>{loading?"Creating account…":"Continue →"}</GoldBtn>
                <span style={{fontFamily:FONT_BODY,fontSize:13,color:T.muted}}>Already have an account? <span onClick={()=>window.location.href="/login"} style={{color:T.gold,cursor:"pointer"}}>Sign in</span></span>
              </div>
            </div>
          )}

          {/* Step 1 — Profile */}
          {step === 1 && (
            <div>
              <div style={{fontFamily:FONT_DISPLAY,fontSize:42,color:T.white,fontWeight:400,marginBottom:8}}>Your guide profile</div>
              <p style={{fontFamily:FONT_BODY,fontSize:15,color:T.silver,marginBottom:36,lineHeight:1.6}}>This is what guests will see when they find you.</p>
              <Input label="Tagline" value={tagline} onChange={setTagline} placeholder="e.g. 30 years on the Ausable. NYS Licensed." required/>
              <Input label="Bio" value={bio} onChange={setBio} placeholder="Tell guests about your experience, the waters/terrain you know, what makes your trips special…" multiline required/>
              <Input label="Location" value={location} onChange={setLocation} placeholder="e.g. Lake Placid, NY" required/>
              <Input label="Years of experience" value={yearsExp} onChange={setYearsExp} placeholder="e.g. 12" type="number"/>
              <Input label="Website (optional)" value={website} onChange={setWebsite} placeholder="https://yoursite.com"/>
              <div style={{marginTop:32,display:"flex",gap:16}}>
                <GoldBtn outline small onClick={()=>setStep(0)}>← Back</GoldBtn>
                <GoldBtn onClick={handleProfileSubmit}>Continue →</GoldBtn>
              </div>
            </div>
          )}

          {/* Step 2 — Categories */}
          {step === 2 && (
            <div>
              <div style={{fontFamily:FONT_DISPLAY,fontSize:42,color:T.white,fontWeight:400,marginBottom:8}}>What do you guide?</div>
              <p style={{fontFamily:FONT_BODY,fontSize:15,color:T.silver,marginBottom:36,lineHeight:1.6}}>Select all activity types that apply.</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:32}}>
                {CATEGORIES.map(cat=>{
                  const selected = selectedCats.includes(cat);
                  return (
                    <div key={cat} onClick={()=>toggleCat(cat)} style={{
                      background:selected?T.goldGlow:T.steel,
                      border:`1.5px solid ${selected?T.gold:T.wire}`,
                      borderRadius:8,padding:"14px 16px",cursor:"pointer",
                      display:"flex",alignItems:"center",gap:10,transition:"all 0.15s",
                    }}>
                      <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${selected?T.gold:T.wire}`,background:selected?T.gold:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {selected && <span style={{color:T.ink,fontSize:10,fontWeight:700}}>✓</span>}
                      </div>
                      <span style={{fontFamily:FONT_BODY,fontSize:14,color:selected?T.gold:T.ash,fontWeight:selected?600:400}}>{cat}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{display:"flex",gap:16}}>
                <GoldBtn outline small onClick={()=>setStep(1)}>← Back</GoldBtn>
                <GoldBtn onClick={handleCategoriesSubmit}>Continue →</GoldBtn>
              </div>
            </div>
          )}

          {/* Step 3 — Packages */}
          {step === 3 && (
            <div>
              <div style={{fontFamily:FONT_DISPLAY,fontSize:42,color:T.white,fontWeight:400,marginBottom:8}}>Your packages</div>
              <p style={{fontFamily:FONT_BODY,fontSize:15,color:T.silver,marginBottom:36,lineHeight:1.6}}>Add your trip offerings. You can edit these anytime from your dashboard.</p>

              {packages.map((pkg,i)=>(
                <div key={i} style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:"24px",marginBottom:16,position:"relative"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                    <span style={{fontFamily:FONT_BODY,fontSize:14,fontWeight:700,color:T.gold}}>Package {i+1}</span>
                    {packages.length > 1 && (
                      <span onClick={()=>removePackage(i)} style={{fontFamily:FONT_BODY,fontSize:12,color:T.muted,cursor:"pointer"}}>Remove</span>
                    )}
                  </div>
                  <Input label="Title" value={pkg.title} onChange={v=>updatePackage(i,"title",v)} placeholder="e.g. Full Day Wade Trip" required/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <Input label="Price ($)" value={pkg.price} onChange={v=>updatePackage(i,"price",v)} placeholder="300" type="number"/>
                    <div style={{marginBottom:20}}>
                      <label style={{fontFamily:FONT_BODY,fontSize:14,fontWeight:600,color:T.ash,display:"block",marginBottom:8}}>Price type</label>
                      <select value={pkg.priceType} onChange={e=>updatePackage(i,"priceType",e.target.value)}
                        style={{width:"100%",background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:"12px 16px",fontFamily:FONT_BODY,fontSize:15,color:T.parchment,outline:"none"}}>
                        <option value="person">Per person</option>
                        <option value="trip">Per trip</option>
                        <option value="day">Per day</option>
                      </select>
                    </div>
                  </div>
                  <Input label="Duration" value={pkg.duration} onChange={v=>updatePackage(i,"duration",v)} placeholder="e.g. 8 hours, Full day, Half day"/>
                  <Input label="Description (optional)" value={pkg.description} onChange={v=>updatePackage(i,"description",v)} placeholder="What's included? What should guests bring?" multiline/>
                </div>
              ))}

              {packages.length < 5 && (
                <button onClick={addPackage} style={{background:"transparent",border:`1px dashed ${T.wire}`,borderRadius:8,padding:"14px",width:"100%",fontFamily:FONT_BODY,fontSize:14,color:T.silver,cursor:"pointer",marginBottom:24}}>
                  + Add another package
                </button>
              )}

              <div style={{display:"flex",gap:16}}>
                <GoldBtn outline small onClick={()=>setStep(2)}>← Back</GoldBtn>
                <GoldBtn onClick={handlePackagesSubmit} disabled={loading}>{loading?"Submitting…":"Submit Application →"}</GoldBtn>
              </div>
            </div>
          )}

          {/* Step 4 — Done */}
          {step === 4 && (
            <div style={{textAlign:"center",padding:"40px 0"}}>
              <div style={{fontSize:64,marginBottom:24}}>🎣</div>
              <div style={{fontFamily:FONT_DISPLAY,fontSize:48,color:T.white,fontWeight:400,marginBottom:16}}>Application submitted.</div>
              <p style={{fontFamily:FONT_BODY,fontSize:16,color:T.ash,lineHeight:1.75,marginBottom:16,maxWidth:480,margin:"0 auto 24px"}}>
                We'll review your profile within 48 hours and reach out to {email} once you're approved.
              </p>
              <p style={{fontFamily:FONT_BODY,fontSize:14,color:T.silver,marginBottom:40}}>
                While you wait, you can explore your guide dashboard to get familiar with the platform.
              </p>
              <div style={{display:"flex",gap:16,justifyContent:"center"}}>
                <GoldBtn onClick={()=>window.location.href="/guide/dashboard"}>Go to Dashboard →</GoldBtn>
                <GoldBtn outline onClick={()=>window.location.href="/"}>Back to Home</GoldBtn>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
