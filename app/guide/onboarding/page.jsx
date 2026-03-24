"use client";
import { useState, useEffect } from "react";
import { T, FONT_DISPLAY, FONT_BODY, TIERS } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";

const CATEGORIES = [
  "Fly Fishing","Hunting","Hiking","Rock Climbing","Kayaking",
  "Surfing","Diving","Wildlife","Photography","Sailing","Camping",
  "Snowshoeing","Ice Fishing","Backpacking","Mountain Biking",
];

const STEPS = ["Account","Interview","Profile","Activities","Packages","Insurance","Plan","Payments","Done"];
const PROGRESS_STEPS = STEPS.slice(0, 8); // progress bar shows first 8

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

function GoldBtn({ children, onClick, disabled, outline=false, small=false, full=false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background:outline?"transparent":disabled?"#5a4a20":T.gold,
      border:`1px solid ${outline?T.wire:T.gold}`,
      borderRadius:7, padding:small?"9px 20px":"13px 28px",
      fontFamily:FONT_BODY, fontSize:small?14:15, fontWeight:700,
      color:outline?T.ash:T.ink, cursor:disabled?"not-allowed":"pointer",
      opacity:disabled?0.6:1, transition:"all 0.15s",
      width:full?"100%":"auto",
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
  const [businessName, setBusinessName] = useState("");

  // Step 1 — Interview
  const INTERVIEW_QUESTIONS = [
    { id: "origin", q: "How did you become a guide? Was there a moment you knew this was it?" },
    { id: "knowledge", q: "What do you know about your craft that most people don't?" },
    { id: "favorite_spot", q: "Describe your favorite spot — you don't have to give away coordinates." },
    { id: "perfect_day", q: "What does a perfect day with a client look like?" },
    { id: "surprise_guest", q: "Tell me about a guest who surprised you." },
    { id: "ideal_client", q: "What kind of clients do you do your best work with?" },
    { id: "busiest_month", q: "What's your busiest month and why do you think that is?" },
    { id: "keeps_up_at_night", q: "What keeps you up at night about your business?" },
    { id: "running_perfectly", q: "If your business was running perfectly, what would be different from today?" },
  ];
  const [interviewIdx, setInterviewIdx] = useState(0);
  const [interviewAnswers, setInterviewAnswers] = useState({});
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [interviewDone, setInterviewDone] = useState(false);
  const [generatedProfile, setGeneratedProfile] = useState(null);
  const [generatingProfile, setGeneratingProfile] = useState(false);

  // Step 2 — Profile
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

  // Step 4 — Tier
  const [selectedTier, setSelectedTier] = useState("spark");

  // Step 5 — Stripe
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);

  // Insurance
  const [insuranceChoice, setInsuranceChoice] = useState(""); // "own", "per_booking", "opt_out"
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [insuranceCoverageAmount, setInsuranceCoverageAmount] = useState("");
  const [insuranceSaving, setInsuranceSaving] = useState(false);
  const [insuranceSaved, setInsuranceSaved] = useState(false);
  const [indemnificationSigned, setIndemnificationSigned] = useState(false);
  const [indemnificationName, setIndemnificationName] = useState("");
  const [showIndemnification, setShowIndemnification] = useState(false);

  const [guideId, setGuideId] = useState(null);

  const handleSaveInsurance = async () => {
    if (!guideId) return;
    setInsuranceSaving(true);
    try {
      const supabase = getSupabase();
      const updates = {
        business_name: businessName || null,
        per_booking_insurance: insuranceChoice === "per_booking" || insuranceChoice === "opt_out",
        insurance_auto_purchase: insuranceChoice === "per_booking",
        has_own_liability_insurance: insuranceChoice === "own",
      };
      if (insuranceChoice === "own" && insuranceProvider) {
        updates.insurance_provider = insuranceProvider;
        updates.insurance_policy_number = insurancePolicyNumber;
        updates.insurance_expiry_date = insuranceExpiry || null;
        updates.insured = true;
      }
      if (insuranceChoice === "per_booking") {
        updates.insured = true;
      }
      await supabase.from("guides").update(updates).eq("id", guideId);
      setInsuranceSaved(true);
    } catch(e) { console.error("Insurance save error:", e); }
    setInsuranceSaving(false);
  };

  const canContinueInsurance = indemnificationSigned && indemnificationName.trim().length > 2 && (
    insuranceChoice === "per_booking" ||
    insuranceChoice === "opt_out" ||
    (insuranceChoice === "own" && insuranceProvider && insurancePolicyNumber)
  );

  // Check for Stripe return redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe") === "success") {
      // Returned from Stripe Connect — verify and advance
      const gId = params.get("guide_id");
      if (gId) {
        setGuideId(gId);
        verifyStripeConnect(gId);
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("stripe") === "refresh") {
      const gId = params.get("guide_id");
      if (gId) setGuideId(gId);
      setStep(7);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const verifyStripeConnect = async (gId) => {
    try {
      const res = await fetch("/api/stripe/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideId: gId }),
      });
      const data = await res.json();
      if (data.complete) {
        setStripeConnected(true);
        setStep(8); // → Done
      } else {
        setStep(7); // Not complete, show retry
      }
    } catch(e) {
      setStep(6);
    }
  };

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

  // ─── Step Handlers ─────────────────────────────────────────

  const handleAccountSubmit = async () => {
    if (!email || !password || !fullName) { setError("All fields required."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError(""); setLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) { setError(signUpError.message); setLoading(false); return; }
      const { error: profError } = await supabase.from("profiles").insert({
        id: data.user.id, full_name: fullName, role: "guide", email
      });
      if (profError) { setError(profError.message); setLoading(false); return; }
      setStep(1); // → Interview
    } catch(e) { setError("Something went wrong. Please try again."); }
    setLoading(false);
  };

  const handleInterviewNext = () => {
    if (!currentAnswer.trim()) return;
    const q = INTERVIEW_QUESTIONS[interviewIdx];
    const updated = { ...interviewAnswers, [q.q]: currentAnswer.trim() };
    setInterviewAnswers(updated);
    setCurrentAnswer("");
    if (interviewIdx < INTERVIEW_QUESTIONS.length - 1) {
      setInterviewIdx(interviewIdx + 1);
    } else {
      // All questions answered — generate profile
      setInterviewDone(true);
      generateVoiceProfile(updated);
    }
  };

  const generateVoiceProfile = async (answers) => {
    setGeneratingProfile(true);
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      // We don't have guideId yet, so we'll save the answers and generate after guide creation
      // For now, just show the AI-generated preview
      const res = await fetch("/api/ai/voice-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideId: "preview", answers, saveToProfile: false }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedProfile(data);
        setBio(data.bio || "");
        setTagline(data.headline || "");
      }
    } catch (e) {
      console.error("Profile generation error:", e);
    }
    setGeneratingProfile(false);
  };

  const handleProfileSubmit = async () => {
    if (!tagline || !bio || !location) { setError("Tagline, bio, and location are required."); return; }
    setError(""); setStep(3); // → Activities
  };

  const handleCategoriesSubmit = async () => {
    if (selectedCats.length === 0) { setError("Select at least one activity type."); return; }
    setError(""); setStep(4); // → Packages
  };

  const handlePackagesSubmit = async () => {
    const valid = packages.filter(p => p.title && p.price);
    if (valid.length === 0) { setError("Add at least one package with a title and price."); return; }
    setError(""); setLoading(true);
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Not logged in."); setLoading(false); return; }

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
        business_name: businessName || fullName,
        business_type: "solo",
        verified: false,
        insured: false,
        licensed: false,
        status: "pending",
        subscription_tier: "spark",
      }).select().single();

      if (guideError) { setError(guideError.message); setLoading(false); return; }
      setGuideId(guide.id);

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

      // Save voice profile and interview data to guide record
      if (generatedProfile && guide) {
        await supabase.from("guides").update({
          voice_profile: generatedProfile.voice_profile || null,
          ai_headline: generatedProfile.headline || null,
          ai_bio: generatedProfile.bio || null,
          specialty_keywords: generatedProfile.specialty_keywords || [],
          onboarding_interview: interviewAnswers,
        }).eq("id", guide.id);
      }

      setStep(5); // → Choose Plan
    } catch(e) { setError("Something went wrong. Please try again."); }
    setLoading(false);
  };

  const handleTierSelect = async () => {
    if (!guideId) return;
    setError(""); setLoading(true);
    try {
      const supabase = getSupabase();
      await supabase.from("guides").update({ subscription_tier: selectedTier }).eq("id", guideId);
      setStep(7); // → Connect Stripe (for payouts, not subscription)
    } catch(e) { setError("Failed to save plan. Please try again."); }
    setLoading(false);
  };

  const handleStripeConnect = async () => {
    if (!guideId) return;
    setStripeLoading(true);
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideId, returnTo: "onboarding" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to start Stripe setup.");
      }
    } catch(e) {
      setError("Failed to connect to Stripe. Please try again.");
    }
    setStripeLoading(false);
  };

  const progressPct = (Math.min(step, 6) / 6) * 100;
  const tier = TIERS[selectedTier];

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
        <div style={{width:"100%",maxWidth:step===5?800:600}}>

          {/* Progress bar */}
          {step < 7 && (
            <div style={{marginBottom:40,maxWidth:600,margin:"0 auto 40px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                {PROGRESS_STEPS.map((s,i)=>(
                  <span key={s} style={{fontFamily:FONT_BODY,fontSize:11,color:i<=step?T.gold:T.muted,fontWeight:i===step?700:400}}>{s}</span>
                ))}
              </div>
              <div style={{height:3,background:T.wire,borderRadius:2}}>
                <div style={{height:"100%",width:`${progressPct}%`,background:T.gold,borderRadius:2,transition:"width 0.4s"}}/>
              </div>
            </div>
          )}

          {error && (
            <div style={{background:"rgba(180,60,60,0.15)",border:"1px solid rgba(180,60,60,0.4)",borderRadius:8,padding:"12px 16px",marginBottom:24,fontFamily:FONT_BODY,fontSize:14,color:"#f08080",maxWidth:600,margin:"0 auto 24px"}}>
              {error}
            </div>
          )}

          {/* Step 0 — Account */}
          {step === 0 && (
            <div style={{maxWidth:600,margin:"0 auto"}}>
              <div style={{fontFamily:FONT_DISPLAY,fontSize:42,color:T.white,fontWeight:400,marginBottom:8}}>Create your account</div>
              <p style={{fontFamily:FONT_BODY,fontSize:15,color:T.silver,marginBottom:36,lineHeight:1.6}}>Start your guide application. Takes about 5 minutes.</p>
              <Input label="Full name" value={fullName} onChange={setFullName} placeholder="Your legal name" required/>
              <Input label="Business name" value={businessName} onChange={setBusinessName} placeholder="e.g., Yellowstone Fly Co. (optional — use your name if solo)"/>
              <Input label="Email address" value={email} onChange={setEmail} placeholder="you@email.com" type="email" required/>
              <Input label="Password" value={password} onChange={setPassword} placeholder="At least 8 characters" type="password" required/>
              <div style={{marginTop:32,display:"flex",gap:16,alignItems:"center"}}>
                <GoldBtn onClick={handleAccountSubmit} disabled={loading}>{loading?"Creating account…":"Continue →"}</GoldBtn>
                <span style={{fontFamily:FONT_BODY,fontSize:13,color:T.muted}}>Already have an account? <span onClick={()=>window.location.href="/login"} style={{color:T.gold,cursor:"pointer"}}>Sign in</span></span>
              </div>
            </div>
          )}

          {/* Step 1 — Interview */}
          {step === 1 && (
            <div style={{maxWidth:600,margin:"0 auto"}}>
              {!interviewDone ? (
                <>
                  <div style={{fontFamily:FONT_DISPLAY,fontSize:42,color:T.white,fontWeight:400,marginBottom:8}}>Tell us about yourself</div>
                  <p style={{fontFamily:FONT_BODY,fontSize:15,color:T.silver,marginBottom:28,lineHeight:1.6}}>
                    {interviewIdx < 5 ? "A few questions so we can write your profile." : "Last few questions about the business side — this helps us work for you."}
                  </p>

                  {/* Chat history */}
                  <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:24,maxHeight:320,overflowY:"auto"}}>
                    {Object.entries(interviewAnswers).map(([q, a], i) => (
                      <div key={i}>
                        <div style={{display:"flex",gap:10,marginBottom:8}}>
                          <div style={{width:28,height:28,borderRadius:"50%",background:T.goldGlow,border:`1px solid ${T.gold}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_BODY,fontSize:11,color:T.gold,flexShrink:0}}>R</div>
                          <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:"4px 12px 12px 12px",padding:"10px 14px",fontFamily:FONT_BODY,fontSize:14,color:T.ash,lineHeight:1.5,maxWidth:"85%"}}>{q}</div>
                        </div>
                        <div style={{display:"flex",justifyContent:"flex-end"}}>
                          <div style={{background:T.goldGlow,border:`1px solid rgba(193,163,98,0.3)`,borderRadius:"12px 4px 12px 12px",padding:"10px 14px",fontFamily:FONT_BODY,fontSize:14,color:T.parchment,lineHeight:1.5,maxWidth:"85%"}}>{a}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Current question */}
                  <div style={{display:"flex",gap:10,marginBottom:16}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:T.goldGlow,border:`1px solid ${T.gold}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_BODY,fontSize:11,color:T.gold,flexShrink:0}}>R</div>
                    <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:"4px 12px 12px 12px",padding:"10px 14px",fontFamily:FONT_BODY,fontSize:15,color:T.white,lineHeight:1.5,maxWidth:"85%"}}>{INTERVIEW_QUESTIONS[interviewIdx].q}</div>
                  </div>

                  {/* Answer input */}
                  <textarea value={currentAnswer} onChange={e=>setCurrentAnswer(e.target.value)} rows={3}
                    placeholder="Your answer…"
                    onKeyDown={e=>{ if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); handleInterviewNext(); } }}
                    style={{width:"100%",background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:"14px 16px",fontFamily:FONT_BODY,fontSize:15,color:T.parchment,outline:"none",resize:"none",lineHeight:1.6,marginBottom:12}}/>

                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontFamily:FONT_BODY,fontSize:12,color:T.muted}}>{interviewIdx + 1} of {INTERVIEW_QUESTIONS.length}</span>
                    <GoldBtn onClick={handleInterviewNext} disabled={!currentAnswer.trim()}>
                      {interviewIdx < INTERVIEW_QUESTIONS.length - 1 ? "Next →" : "Finish →"}
                    </GoldBtn>
                  </div>
                </>
              ) : generatingProfile ? (
                <div style={{textAlign:"center",padding:"60px 0"}}>
                  <div style={{fontFamily:FONT_DISPLAY,fontSize:32,color:T.white,marginBottom:12}}>Writing your profile…</div>
                  <div style={{fontFamily:FONT_BODY,fontSize:15,color:T.silver}}>Our AI is crafting your bio and voice from your answers.</div>
                  <div style={{marginTop:24,width:40,height:40,border:`3px solid ${T.wire}`,borderTop:`3px solid ${T.gold}`,borderRadius:"50%",margin:"24px auto 0",animation:"spin 1s linear infinite"}}/>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : generatedProfile ? (
                <div>
                  <div style={{fontFamily:FONT_DISPLAY,fontSize:42,color:T.white,fontWeight:400,marginBottom:8}}>Your profile is ready</div>
                  <p style={{fontFamily:FONT_BODY,fontSize:15,color:T.silver,marginBottom:28}}>We wrote this from your interview answers. Edit anything you'd like.</p>

                  <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:24,marginBottom:16}}>
                    <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Headline</div>
                    <input value={tagline} onChange={e=>setTagline(e.target.value)}
                      style={{width:"100%",background:T.lifted,border:`1px solid ${T.rim}`,borderRadius:6,padding:"10px 14px",fontFamily:FONT_BODY,fontSize:15,color:T.white,outline:"none",marginBottom:16}}/>

                    <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Bio</div>
                    <textarea value={bio} onChange={e=>setBio(e.target.value)} rows={6}
                      style={{width:"100%",background:T.lifted,border:`1px solid ${T.rim}`,borderRadius:6,padding:"10px 14px",fontFamily:FONT_BODY,fontSize:14,color:T.parchment,outline:"none",resize:"vertical",lineHeight:1.6}}/>
                  </div>

                  {generatedProfile.specialty_keywords?.length > 0 && (
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:24}}>
                      {generatedProfile.specialty_keywords.map(kw => (
                        <span key={kw} style={{fontFamily:FONT_BODY,fontSize:11,color:T.ash,background:T.lifted,border:`1px solid ${T.rim}`,borderRadius:4,padding:"3px 10px"}}>{kw}</span>
                      ))}
                    </div>
                  )}

                  <div style={{display:"flex",gap:16}}>
                    <GoldBtn onClick={()=>setStep(2)}>Looks good — continue →</GoldBtn>
                    <GoldBtn outline small onClick={()=>{setInterviewDone(false);setInterviewIdx(0);setInterviewAnswers({});setCurrentAnswer("");setGeneratedProfile(null);}}>Start over</GoldBtn>
                  </div>
                </div>
              ) : (
                <div style={{textAlign:"center",padding:"40px 0"}}>
                  <div style={{fontFamily:FONT_BODY,fontSize:15,color:T.silver}}>Something went wrong. Try again.</div>
                  <GoldBtn onClick={()=>{setInterviewDone(false);setInterviewIdx(0);setInterviewAnswers({});}}>Retry</GoldBtn>
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Profile */}
          {step === 2 && (
            <div style={{maxWidth:600,margin:"0 auto"}}>
              <div style={{fontFamily:FONT_DISPLAY,fontSize:42,color:T.white,fontWeight:400,marginBottom:8}}>Your guide profile</div>
              <p style={{fontFamily:FONT_BODY,fontSize:15,color:T.silver,marginBottom:36,lineHeight:1.6}}>This is what guests will see when they find you.</p>
              <Input label="Tagline" value={tagline} onChange={setTagline} placeholder="e.g. 30 years on the Ausable. NYS Licensed." required/>
              <Input label="Bio" value={bio} onChange={setBio} placeholder="Tell guests about your experience, the waters/terrain you know, what makes your trips special…" multiline required/>
              <Input label="Location" value={location} onChange={setLocation} placeholder="e.g. Lake Placid, NY" required/>
              <Input label="Years of experience" value={yearsExp} onChange={setYearsExp} placeholder="e.g. 12" type="number"/>
              <Input label="Website (optional)" value={website} onChange={setWebsite} placeholder="https://yoursite.com"/>
              <div style={{marginTop:32,display:"flex",gap:16}}>
                <GoldBtn outline small onClick={()=>setStep(1)}>← Back</GoldBtn>
                <GoldBtn onClick={handleProfileSubmit}>Continue →</GoldBtn>
              </div>
            </div>
          )}

          {/* Step 3 — Categories */}
          {step === 3 && (
            <div style={{maxWidth:600,margin:"0 auto"}}>
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
                <GoldBtn outline small onClick={()=>setStep(2)}>← Back</GoldBtn>
                <GoldBtn onClick={handleCategoriesSubmit}>Continue →</GoldBtn>
              </div>
            </div>
          )}

          {/* Step 4 — Packages */}
          {step === 4 && (
            <div style={{maxWidth:600,margin:"0 auto"}}>
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
                <GoldBtn outline small onClick={()=>setStep(3)}>← Back</GoldBtn>
                <GoldBtn onClick={handlePackagesSubmit} disabled={loading}>{loading?"Saving…":"Continue →"}</GoldBtn>
              </div>
            </div>
          )}

          {/* Step 5 — Insurance & Protection */}
          {step === 5 && (
            <div style={{maxWidth:700,margin:"0 auto"}}>
              <div style={{textAlign:"center",marginBottom:36}}>
                <div style={{width:72,height:72,borderRadius:"50%",background:"rgba(201,165,92,0.12)",border:`2px solid ${T.gold}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:32}}>🛡️</div>
                <div style={{fontFamily:FONT_DISPLAY,fontSize:38,color:T.white,fontWeight:400,marginBottom:8}}>Protect your business</div>
                <p style={{fontFamily:FONT_BODY,fontSize:15,color:T.silver,lineHeight:1.7,maxWidth:520,margin:"0 auto"}}>
                  Commercial liability insurance is essential for adventure guides. Here's why it matters — and how RŌM makes it easy.
                </p>
              </div>

              {/* Business Name */}
              <div style={{marginBottom:28}}>
                <label style={{fontFamily:FONT_BODY,fontSize:14,fontWeight:600,color:T.ash,display:"block",marginBottom:8}}>Business Name <span style={{color:T.muted,fontWeight:400}}>(if applicable)</span></label>
                <input placeholder="e.g., Whitfield Fly Fishing LLC" value={businessName} onChange={e=>setBusinessName(e.target.value)}
                  style={{width:"100%",boxSizing:"border-box",background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:"12px 16px",fontFamily:FONT_BODY,fontSize:15,color:T.parchment,outline:"none"}}/>
              </div>

              {/* Reality Check — lawsuit costs */}
              <div style={{background:"rgba(231,76,60,0.06)",border:"1px solid rgba(231,76,60,0.25)",borderRadius:10,padding:24,marginBottom:28}}>
                <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:"#e8a0a0",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:14}}>Why this matters</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  {[
                    ["Medical evacuation helicopter","$80,000 — $150,000"],
                    ["Spinal injury with ongoing care","$1M — $5M"],
                    ["Traumatic brain injury","$3M — $15M"],
                    ["Wrongful death claim","$2M — $10M"],
                    ["Average outdoor recreation settlement","$750K — $1.5M"],
                    ["Legal defense costs (even if you win)","$100K — $500K"],
                  ].map(([item,cost])=>(
                    <div key={item} style={{padding:"10px 0",borderBottom:`1px solid rgba(231,76,60,0.12)`}}>
                      <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.ash,marginBottom:2}}>{item}</div>
                      <div style={{fontFamily:FONT_BODY,fontSize:14,fontWeight:700,color:"#e8a0a0"}}>{cost}</div>
                    </div>
                  ))}
                </div>
                <p style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver,marginTop:14,lineHeight:1.6,fontStyle:"italic"}}>
                  These are real numbers from outdoor recreation liability cases. A single incident without insurance can end a business permanently.
                </p>
              </div>

              {/* Three Options */}
              <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:14}}>Choose your coverage</div>
              <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:28}}>

                {/* Option 1 — Per-booking (recommended) */}
                <div onClick={()=>setInsuranceChoice("per_booking")} style={{
                  background:insuranceChoice==="per_booking"?T.goldGlow:T.steel,
                  border:`2px solid ${insuranceChoice==="per_booking"?T.gold:T.wire}`,
                  borderRadius:10,padding:"20px 24px",cursor:"pointer",transition:"all 0.2s",position:"relative"
                }}>
                  <div style={{position:"absolute",top:-10,right:16,background:T.gold,color:T.ink,fontFamily:FONT_BODY,fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>Recommended</div>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                    <div style={{width:20,height:20,borderRadius:"50%",border:`2px solid ${insuranceChoice==="per_booking"?T.gold:T.wire}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {insuranceChoice==="per_booking"&&<div style={{width:10,height:10,borderRadius:"50%",background:T.gold}}/>}
                    </div>
                    <div style={{fontFamily:FONT_BODY,fontSize:16,fontWeight:700,color:T.white}}>Per-booking coverage through RŌM</div>
                  </div>
                  <p style={{fontFamily:FONT_BODY,fontSize:13,color:T.ash,lineHeight:1.6,marginLeft:32}}>
                    Liability insurance is automatically purchased for every booking. Cost starts at ~$20-50 per trip depending on activity type. You're covered from the moment the booking confirms until the trip ends. No annual premium, no paperwork.
                  </p>
                  <div style={{marginLeft:32,marginTop:10,display:"flex",gap:16}}>
                    {[["$1M+","per occurrence"],["Auto","every booking"],["$0","upfront cost"]].map(([big,small])=>(
                      <div key={big}>
                        <div style={{fontFamily:FONT_DISPLAY,fontSize:22,color:T.gold,fontWeight:400}}>{big}</div>
                        <div style={{fontFamily:FONT_BODY,fontSize:11,color:T.silver}}>{small}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Option 2 — Own insurance */}
                <div onClick={()=>setInsuranceChoice("own")} style={{
                  background:insuranceChoice==="own"?T.goldGlow:T.steel,
                  border:`2px solid ${insuranceChoice==="own"?T.gold:T.wire}`,
                  borderRadius:10,padding:"20px 24px",cursor:"pointer",transition:"all 0.2s"
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                    <div style={{width:20,height:20,borderRadius:"50%",border:`2px solid ${insuranceChoice==="own"?T.gold:T.wire}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {insuranceChoice==="own"&&<div style={{width:10,height:10,borderRadius:"50%",background:T.gold}}/>}
                    </div>
                    <div style={{fontFamily:FONT_BODY,fontSize:16,fontWeight:700,color:T.white}}>I have my own liability insurance</div>
                  </div>
                  <p style={{fontFamily:FONT_BODY,fontSize:13,color:T.ash,lineHeight:1.6,marginLeft:32}}>
                    Upload your Certificate of Insurance. We recommend $1M per occurrence / $2M aggregate minimum, and naming RŌM as an additional insured party.
                  </p>
                  {insuranceChoice==="own"&&(
                    <div style={{marginLeft:32,marginTop:16,display:"flex",flexDirection:"column",gap:10}}>
                      <input placeholder="Insurance provider *" value={insuranceProvider} onChange={e=>setInsuranceProvider(e.target.value)}
                        style={{width:"100%",boxSizing:"border-box",background:"rgba(0,0,0,0.3)",border:`1px solid ${T.wire}`,borderRadius:6,padding:"10px 14px",fontFamily:FONT_BODY,fontSize:14,color:T.parchment,outline:"none"}}/>
                      <input placeholder="Policy number *" value={insurancePolicyNumber} onChange={e=>setInsurancePolicyNumber(e.target.value)}
                        style={{width:"100%",boxSizing:"border-box",background:"rgba(0,0,0,0.3)",border:`1px solid ${T.wire}`,borderRadius:6,padding:"10px 14px",fontFamily:FONT_BODY,fontSize:14,color:T.parchment,outline:"none"}}/>
                      <div style={{display:"flex",gap:10}}>
                        <input type="date" placeholder="Expiry date" value={insuranceExpiry} onChange={e=>setInsuranceExpiry(e.target.value)}
                          style={{flex:1,background:"rgba(0,0,0,0.3)",border:`1px solid ${T.wire}`,borderRadius:6,padding:"10px 14px",fontFamily:FONT_BODY,fontSize:14,color:T.parchment,outline:"none"}}/>
                        <input placeholder="Coverage amount (e.g., $1M)" value={insuranceCoverageAmount} onChange={e=>setInsuranceCoverageAmount(e.target.value)}
                          style={{flex:1,background:"rgba(0,0,0,0.3)",border:`1px solid ${T.wire}`,borderRadius:6,padding:"10px 14px",fontFamily:FONT_BODY,fontSize:14,color:T.parchment,outline:"none"}}/>
                      </div>
                      <p style={{fontFamily:FONT_BODY,fontSize:11,color:T.silver,lineHeight:1.5}}>
                        We strongly recommend naming "RŌM Inc." as an additional insured party on your policy. Contact your provider to add this — it typically costs nothing and provides mutual protection.
                      </p>
                    </div>
                  )}
                </div>

                {/* Option 3 — Opt out (not recommended) */}
                <div onClick={()=>setInsuranceChoice("opt_out")} style={{
                  background:insuranceChoice==="opt_out"?"rgba(231,76,60,0.06)":T.steel,
                  border:`2px solid ${insuranceChoice==="opt_out"?"rgba(231,76,60,0.4)":T.wire}`,
                  borderRadius:10,padding:"20px 24px",cursor:"pointer",transition:"all 0.2s"
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                    <div style={{width:20,height:20,borderRadius:"50%",border:`2px solid ${insuranceChoice==="opt_out"?"#e74c3c":T.wire}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {insuranceChoice==="opt_out"&&<div style={{width:10,height:10,borderRadius:"50%",background:"#e74c3c"}}/>}
                    </div>
                    <div style={{fontFamily:FONT_BODY,fontSize:16,fontWeight:700,color:insuranceChoice==="opt_out"?"#e8a0a0":T.white}}>I'll handle insurance myself later</div>
                  </div>
                  <p style={{fontFamily:FONT_BODY,fontSize:13,color:T.ash,lineHeight:1.6,marginLeft:32}}>
                    You assume all liability risk. RŌM will not provide coverage. Your profile will show as "uninsured" to guests, which may significantly reduce bookings.
                  </p>
                </div>
              </div>

              {/* Indemnification Agreement */}
              <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:24,marginBottom:28}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                  <span style={{fontSize:18}}>📋</span>
                  <div style={{fontFamily:FONT_BODY,fontSize:14,fontWeight:700,color:T.white}}>Independent Guide Agreement</div>
                </div>

                <div style={{maxHeight:showIndemnification?400:0,overflow:"hidden",transition:"max-height 0.3s"}}>
                  <div style={{background:"rgba(0,0,0,0.3)",border:`1px solid ${T.rim}`,borderRadius:8,padding:16,marginBottom:16,maxHeight:280,overflowY:"auto"}}>
                    <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.ash,lineHeight:1.8,whiteSpace:"pre-line"}}>{`INDEPENDENT GUIDE AGREEMENT & INDEMNIFICATION

By signing below, I acknowledge and agree to the following:

1. INDEPENDENT CONTRACTOR STATUS
I am an independent contractor and not an employee, agent, or representative of RŌM Inc. I maintain full control over how I conduct my guide services, including routes, methods, schedules, equipment, safety protocols, and pricing.

2. NO PLATFORM CONTROL
RŌM Inc. is a technology platform that connects travelers with independent guides. RŌM does not provide guide services, does not direct or supervise guide operations, does not set guide pricing, and does not control how guides conduct their trips. The sole operational standard RŌM enforces is that guides maintain appropriate insurance coverage or acknowledge the risks of operating without it.

3. ASSUMPTION OF LIABILITY
I accept sole responsibility for the safety of all guests during my trips. I understand that any claims, injuries, property damage, or losses arising from my guide services are my responsibility, not RŌM's.

4. INDEMNIFICATION
I agree to indemnify, defend, and hold harmless RŌM Inc., its officers, directors, employees, and agents from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or related to my guide services, my acts or omissions, or any breach of this agreement.

5. INSURANCE ACKNOWLEDGMENT
I understand that RŌM strongly recommends commercial general liability insurance with minimum limits of $1,000,000 per occurrence and $2,000,000 aggregate. RŌM offers per-booking coverage through its insurance partners. If I choose not to carry adequate insurance, I assume all financial risk associated with liability claims.

6. GUEST WAIVERS
I understand that RŌM facilitates digital liability waivers between guests and guides. These waivers are between the guest and the guide — not between the guest and RŌM.

7. GOVERNING LAW
This agreement shall be governed by the laws of the State of Delaware.`}</div>
                  </div>
                </div>

                <button onClick={()=>setShowIndemnification(!showIndemnification)} style={{background:"none",border:"none",fontFamily:FONT_BODY,fontSize:13,color:T.gold,cursor:"pointer",marginBottom:16}}>
                  {showIndemnification ? "Hide full agreement ▲" : "Read full agreement ▼"}
                </button>

                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                  <div onClick={()=>setIndemnificationSigned(!indemnificationSigned)} style={{
                    width:22,height:22,borderRadius:4,border:`2px solid ${indemnificationSigned?T.gold:T.wire}`,
                    background:indemnificationSigned?T.gold:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0
                  }}>
                    {indemnificationSigned&&<span style={{color:T.ink,fontSize:14,fontWeight:700}}>✓</span>}
                  </div>
                  <span style={{fontFamily:FONT_BODY,fontSize:13,color:T.parchment,lineHeight:1.5}}>
                    I have read and agree to the Independent Guide Agreement & Indemnification terms above.
                  </span>
                </div>

                <input placeholder="Type your full legal name to sign *" value={indemnificationName} onChange={e=>setIndemnificationName(e.target.value)}
                  style={{width:"100%",boxSizing:"border-box",background:"rgba(0,0,0,0.3)",border:`1px solid ${indemnificationSigned&&indemnificationName.trim().length>2?T.gold:T.wire}`,borderRadius:6,padding:"10px 14px",fontFamily:"'Cormorant Garamond', serif",fontSize:18,color:T.parchment,outline:"none",fontStyle:"italic"}}/>
              </div>

              <div style={{display:"flex",gap:16}}>
                <GoldBtn outline small onClick={()=>setStep(4)}>← Back</GoldBtn>
                <GoldBtn onClick={async()=>{await handleSaveInsurance();setStep(6);}} disabled={!canContinueInsurance||insuranceSaving}>
                  {insuranceSaving?"Saving…":"Continue →"}
                </GoldBtn>
              </div>
            </div>
          )}

          {/* Step 6 — Choose Plan */}
          {step === 6 && (
            <div>
              <div style={{textAlign:"center",marginBottom:40}}>
                <div style={{fontFamily:FONT_DISPLAY,fontSize:42,color:T.white,fontWeight:400,marginBottom:8}}>Choose your plan</div>
                <p style={{fontFamily:FONT_BODY,fontSize:15,color:T.silver,lineHeight:1.6,maxWidth:500,margin:"0 auto"}}>
                  All plans include profile, booking, and messaging. Upgrade anytime from your dashboard.
                </p>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:40}}>
                {Object.values(TIERS).map(t => {
                  const isSelected = selectedTier === t.id;
                  const isPopular = t.id === "discover";
                  return (
                    <div key={t.id} onClick={()=>setSelectedTier(t.id)} style={{
                      background:isSelected?T.goldGlow:T.steel,
                      border:`2px solid ${isSelected?T.gold:T.wire}`,
                      borderRadius:12, padding:"28px 24px", cursor:"pointer",
                      transition:"all 0.2s", position:"relative",
                    }}>
                      {isPopular && (
                        <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:T.gold,color:T.ink,fontFamily:FONT_BODY,fontSize:10,fontWeight:700,padding:"3px 12px",borderRadius:10,textTransform:"uppercase",letterSpacing:"0.08em"}}>
                          Most Popular
                        </div>
                      )}
                      <div style={{fontFamily:FONT_DISPLAY,fontSize:28,color:isSelected?T.gold:T.white,fontWeight:400,marginBottom:4}}>{t.name}</div>
                      <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:4}}>
                        <span style={{fontFamily:FONT_DISPLAY,fontSize:42,color:isSelected?T.gold:T.white,fontWeight:300}}>${t.monthlyPrice}</span>
                        <span style={{fontFamily:FONT_BODY,fontSize:13,color:T.silver}}>/month</span>
                      </div>
                      <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.gold,fontWeight:600,marginBottom:18}}>
                        {t.monthlyPrice === 0 ? "Free forever" : `$${t.monthlyPrice}/mo`}
                      </div>
                      <div style={{height:1,background:isSelected?"rgba(193,163,98,0.3)":T.wire,marginBottom:16}}/>
                      <div style={{display:"flex",flexDirection:"column",gap:10}}>
                        {t.features.map(f=>(
                          <div key={f} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                            <span style={{color:T.gold,fontSize:12,marginTop:2,flexShrink:0}}>✓</span>
                            <span style={{fontFamily:FONT_BODY,fontSize:13,color:isSelected?T.parchment:T.ash,lineHeight:1.4}}>{f}</span>
                          </div>
                        ))}
                        {t.locked.length > 0 && t.locked.map(f=>(
                          <div key={f} style={{display:"flex",gap:8,alignItems:"flex-start",opacity:0.35}}>
                            <span style={{fontSize:12,marginTop:2,flexShrink:0,color:T.muted}}>—</span>
                            <span style={{fontFamily:FONT_BODY,fontSize:13,color:T.muted,lineHeight:1.4}}>{f}</span>
                          </div>
                        ))}
                      </div>
                      {isSelected && (
                        <div style={{marginTop:20,textAlign:"center",fontFamily:FONT_BODY,fontSize:12,fontWeight:700,color:T.gold}}>
                          ✓ Selected
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{maxWidth:600,margin:"0 auto"}}>
                <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:8,padding:"16px 20px",marginBottom:24}}>
                  <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.silver,lineHeight:1.6}}>
                    Your first 30 days are free on any plan. You can change plans or cancel anytime from your dashboard. No long-term contracts.
                  </div>
                </div>
                <div style={{display:"flex",gap:16}}>
                  <GoldBtn outline small onClick={()=>setStep(5)}>← Back</GoldBtn>
                  <GoldBtn onClick={handleTierSelect} disabled={loading}>{loading?"Saving…":`Continue with ${TIERS[selectedTier].name} →`}</GoldBtn>
                </div>
              </div>
            </div>
          )}

          {/* Step 7 — Connect Stripe */}
          {step === 7 && (
            <div style={{maxWidth:600,margin:"0 auto",textAlign:"center"}}>
              <div style={{width:80,height:80,borderRadius:"50%",background:T.steel,border:`2px solid ${T.gold}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px",fontSize:36}}>
                💳
              </div>
              <div style={{fontFamily:FONT_DISPLAY,fontSize:42,color:T.white,fontWeight:400,marginBottom:8}}>Get paid</div>
              <p style={{fontFamily:FONT_BODY,fontSize:15,color:T.silver,marginBottom:12,lineHeight:1.6}}>
                Connect your bank account through Stripe so you can receive payouts from bookings. This takes about 2 minutes.
              </p>
              <p style={{fontFamily:FONT_BODY,fontSize:13,color:T.muted,marginBottom:36,lineHeight:1.6}}>
                Stripe is the same payment platform used by Airbnb, Lyft, and Shopify. Your banking information is never stored on our servers.
              </p>

              <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:28,marginBottom:28,textAlign:"left"}}>
                <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:16}}>What you'll need</div>
                {[
                  "Your legal name and date of birth",
                  "Your Social Security number or EIN",
                  "A bank account for direct deposits",
                  "A valid ID (driver's license or passport)",
                ].map(item=>(
                  <div key={item} style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
                    <span style={{color:T.gold,fontSize:12}}>•</span>
                    <span style={{fontFamily:FONT_BODY,fontSize:14,color:T.ash}}>{item}</span>
                  </div>
                ))}
              </div>

              <GoldBtn full onClick={handleStripeConnect} disabled={stripeLoading}>
                {stripeLoading ? "Connecting…" : "Connect with Stripe →"}
              </GoldBtn>

              <button onClick={()=>setStep(8)} style={{display:"block",margin:"16px auto 0",background:"none",border:"none",fontFamily:FONT_BODY,fontSize:13,color:T.muted,cursor:"pointer"}}>
                Skip for now — I'll set this up later
              </button>
            </div>
          )}

          {/* Step 8 — Done */}
          {step === 8 && (
            <div style={{textAlign:"center",padding:"40px 0",maxWidth:600,margin:"0 auto"}}>
              <div style={{width:80,height:80,borderRadius:"50%",background:"#3a7a5420",border:`2px solid #3a7a54`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px",fontSize:36,color:"#3a7a54"}}>
                ✓
              </div>
              <div style={{fontFamily:FONT_DISPLAY,fontSize:48,color:T.white,fontWeight:400,marginBottom:16}}>You're all set.</div>
              <p style={{fontFamily:FONT_BODY,fontSize:16,color:T.ash,lineHeight:1.75,maxWidth:480,margin:"0 auto 8px"}}>
                Your profile is live on the {TIERS[selectedTier].name} plan{stripeConnected ? " and payments are connected" : ""}.
                {!stripeConnected && " Connect Stripe from your dashboard when you're ready to accept bookings."}
              </p>
              <p style={{fontFamily:FONT_BODY,fontSize:14,color:T.silver,marginBottom:40}}>
                Head to your dashboard to manage bookings, customize your profile, and start getting discovered.
              </p>

              <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:24,marginBottom:32,textAlign:"left"}}>
                <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.silver,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:16}}>Your Setup</div>
                {[
                  ["Plan", TIERS[selectedTier].name + (TIERS[selectedTier].monthlyPrice === 0 ? " — Free" : " — $" + TIERS[selectedTier].monthlyPrice + "/mo")],
                  ["Booking fee", "Keep 100% of your price — guests pay a 15% service fee"],
                  ["Payments", stripeConnected ? "Connected" : "Not connected yet"],
                  ["Insurance", insuranceChoice === "own" ? `${insuranceProvider} — on file ✓` : insuranceChoice === "per_booking" ? "Per-booking coverage ✓" : "Not covered — add from dashboard"],
                  ["Agreement", indemnificationSigned ? "Signed ✓" : "Not signed"],
                  ["Profile", "Pending review"],
                ].map(([l,v])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.rim}`}}>
                    <span style={{fontFamily:FONT_BODY,fontSize:13,color:T.silver}}>{l}</span>
                    <span style={{fontFamily:FONT_BODY,fontSize:13,color:l==="Payments"&&!stripeConnected?"#aa7a7a":T.gold,fontWeight:600}}>{v}</span>
                  </div>
                ))}
              </div>

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
