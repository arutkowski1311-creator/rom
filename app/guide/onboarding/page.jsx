"use client";
import { useState, useRef, useEffect } from "react";

// ─── 5-STEP DARK PALETTE (matches GuideProfile + SearchPage) ─────────────────
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
  success:  "#3a7a54",
  successGlow: "#3a7a5428",
};

const FONT_DISPLAY = "'Cormorant Garamond', Georgia, serif";
const FONT_BODY    = "'Barlow', system-ui, sans-serif";

const CATEGORIES = [
  "Fly Fishing","Big Game Hunting","Waterfowl Hunting","Backcountry Hiking",
  "Rock Climbing","Surfing","Kayaking & Rafting","Scuba Diving","Snorkeling",
  "Wildlife Photography","Whale Watching","Horseback Riding","Mountain Biking",
  "Skiing & Snowboarding","Sailing","Food & Culture","Foraging","Birdwatching",
  "Photography Tours","Camping & Survival",
];
const LANGUAGES = ["English","Spanish","French","German","Portuguese","Italian","Japanese","Mandarin","Arabic","Dutch","Russian","Korean","Other"];
const STEPS = [
  { num:1, label:"Your Story",     icon:"✦" },
  { num:2, label:"Your Expertise", icon:"◈" },
  { num:3, label:"Your Packages",  icon:"⬡" },
  { num:4, label:"Availability",   icon:"◷" },
  { num:5, label:"Your Location",  icon:"◉" },
  { num:6, label:"Credentials",    icon:"◬" },
  { num:7, label:"Get Paid",       icon:"◎" },
];

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Label({ children, required, optional }) {
  return (
    <div style={{marginBottom:8, display:"flex", alignItems:"center", gap:8}}>
      <span style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.silver, letterSpacing:"0.08em", textTransform:"uppercase"}}>{children}</span>
      {required && <span style={{fontFamily:FONT_BODY, fontSize:10, color:"#8a3a3a", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em"}}>Required</span>}
      {optional && <span style={{fontFamily:FONT_BODY, fontSize:10, color:T.muted, textTransform:"none", letterSpacing:0}}>optional</span>}
    </div>
  );
}

function Field({ value, onChange, placeholder, multiline, rows=4, type="text" }) {
  const [focused, setFocused] = useState(false);
  const base = {
    width:"100%", boxSizing:"border-box",
    background: focused ? T.lifted : T.steel,
    border:`1px solid ${focused ? T.gold : T.wire}`,
    borderRadius:6, padding:"11px 14px",
    fontFamily:FONT_BODY, fontSize:14, color:T.parchment,
    outline:"none", transition:"all 0.18s",
    resize: multiline ? "vertical" : "none",
  };
  return multiline
    ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={base} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}/>
    : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={base} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}/>;
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)} style={{
      width:"100%", boxSizing:"border-box",
      background:T.steel, border:`1px solid ${T.wire}`,
      borderRadius:6, padding:"11px 14px",
      fontFamily:FONT_BODY, fontSize:14, color:value?T.parchment:T.muted,
      outline:"none", appearance:"none",
      backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%238a96a0' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E")`,
      backgroundRepeat:"no-repeat", backgroundPosition:"right 14px center",
      cursor:"pointer",
    }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o=><option key={typeof o==="string"?o:o.value} value={typeof o==="string"?o:o.value} style={{background:T.steel}}>{typeof o==="string"?o:o.label}</option>)}
    </select>
  );
}

function Chip({ label, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        background: active ? T.goldGlow : hov ? T.lifted : T.steel,
        border:`1px solid ${active ? T.gold : hov ? T.wire : T.rim}`,
        borderRadius:20, padding:"6px 14px",
        fontFamily:FONT_BODY, fontSize:12, fontWeight:active?700:400,
        color: active ? T.gold : T.ash,
        cursor:"pointer", transition:"all 0.14s",
      }}>{label}</button>
  );
}

function GoldBtn({ children, onClick, disabled, outline, small, full }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        width: full ? "100%" : "auto",
        background: outline ? "transparent" : hov && !disabled ? T.goldLt : T.gold,
        color: outline ? (hov ? T.goldLt : T.gold) : T.ink,
        border:`1.5px solid ${hov && !disabled ? T.goldLt : T.gold}`,
        borderRadius:6, padding: small ? "7px 16px" : "12px 26px",
        fontFamily:FONT_BODY, fontSize: small ? 12 : 14, fontWeight:700,
        letterSpacing:"0.04em", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1, transition:"all 0.16s",
      }}>{children}</button>
  );
}

function UploadZone({ label, sub, icon, onFile, file }) {
  const ref = useRef();
  const [hov, setHov] = useState(false);
  return (
    <div onClick={()=>ref.current.click()}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      onDragOver={e=>e.preventDefault()}
      onDrop={e=>{e.preventDefault();onFile(e.dataTransfer.files[0]);}}
      style={{
        border:`1.5px dashed ${file ? T.gold : hov ? T.wire : T.rim}`,
        borderRadius:8, padding:"28px 20px", textAlign:"center",
        cursor:"pointer", background: file ? T.goldGlow : hov ? T.lifted : T.steel,
        transition:"all 0.18s",
      }}>
      <input ref={ref} type="file" style={{display:"none"}} onChange={e=>onFile(e.target.files[0])}/>
      <div style={{fontSize:24, marginBottom:8, color: file ? T.gold : T.wire}}>{file ? "✓" : icon}</div>
      <div style={{fontFamily:FONT_BODY, fontSize:13, color: file ? T.gold : T.parchment, fontWeight:600}}>
        {file ? file.name : label}
      </div>
      {sub && !file && <div style={{fontFamily:FONT_BODY, fontSize:11, color:T.muted, marginTop:4}}>{sub}</div>}
    </div>
  );
}

// ─── STEP 1: YOUR STORY ───────────────────────────────────────────────────────
function Step1({ data, setData }) {
  const [bioMode, setBioMode] = useState("direct");
  const [wiz, setWiz] = useState({q1:"",q2:"",q3:"",q4:"",q5:""});
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const questions = [
    {key:"q1", label:"Where do you guide?", placeholder:"e.g. The Madison River valley in southwestern Montana"},
    {key:"q2", label:"What do you guide?", placeholder:"e.g. Fly fishing for brown and rainbow trout"},
    {key:"q3", label:"How long have you been doing this?", placeholder:"e.g. 14 years guiding, grew up on these rivers since I was 8"},
    {key:"q4", label:"What sets your trips apart?", placeholder:"e.g. I focus on technique — guests learn to read water, not just catch fish"},
    {key:"q5", label:"Who are your ideal guests?", placeholder:"e.g. Anyone from complete beginners to experienced anglers wanting to sharpen their skills"},
  ];

  const generate = async () => {
    setGenerating(true);
    await new Promise(r=>setTimeout(r,2200));
    const bio = `There's a stretch of the ${wiz.q1||"Madison River"} that most guides drive right past. After ${wiz.q3||"fourteen years"} on these waters, I've learned that the best fishing rarely happens where anyone's looking.\n\n${wiz.q2||"Fly fishing for brown and rainbow trout"} is what I do — but teaching people to see water the way a fish sees it is what I'm actually here for. ${wiz.q4||"Every trip is built around technique, not just catching fish."}\n\n${wiz.q5?"Whether you're picking up a rod for the first time or you've been fishing for decades, I meet you where you are.":"I guide guests of every skill level."} What I care about is that you leave understanding something you didn't before.`;
    setData(d=>({...d,bio}));
    setGenerating(false);
    setGenerated(true);
    setBioMode("direct");
  };

  return (
    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:32}}>
      <div style={{display:"flex", flexDirection:"column", gap:22}}>
        <div><Label>Full Name</Label><Field value={data.name} onChange={v=>setData(d=>({...d,name:v}))} placeholder="Your legal name"/></div>
        <div><Label>Tagline</Label><Field value={data.tagline} onChange={v=>setData(d=>({...d,tagline:v}))} placeholder="e.g. Montana fly fishing guide with 14 years on the Madison"/></div>
        <div><Label>Primary Location</Label><Field value={data.location} onChange={v=>setData(d=>({...d,location:v}))} placeholder="City, State / Province, Country"/></div>
        <div><Label>Profile Photo</Label><UploadZone label="Upload profile photo" sub="JPG or PNG · min 400×400px" icon="◉" onFile={f=>setData(d=>({...d,profilePhoto:f}))} file={data.profilePhoto}/></div>
        <div><Label>Cover Photo</Label><UploadZone label="Upload cover photo" sub="Landscape · min 1400×500px" icon="▭" onFile={f=>setData(d=>({...d,coverPhoto:f}))} file={data.coverPhoto}/></div>
      </div>

      <div style={{display:"flex", flexDirection:"column", gap:18}}>
        <div>
          <Label>Your Bio</Label>
          <div style={{display:"flex", gap:6, marginBottom:14}}>
            <Chip label="Write it yourself" active={bioMode==="direct"} onClick={()=>setBioMode("direct")}/>
            <Chip label="✦ AI bio generator" active={bioMode==="wizard"} onClick={()=>setBioMode("wizard")}/>
          </div>

          {bioMode==="direct" && (
            <div>
              <Field multiline rows={11} value={data.bio} onChange={v=>setData(d=>({...d,bio:v}))}
                placeholder="Tell guests who you are, where you guide, and what makes your trips different. The best bios read like a story, not a resume."/>
              {generated && <div style={{marginTop:8, fontFamily:FONT_BODY, fontSize:12, color:T.gold}}>✦ AI-generated — edit freely. This is your voice.</div>}
            </div>
          )}

          {bioMode==="wizard" && (
            <div style={{background:T.lifted, border:`1px solid ${T.wire}`, borderRadius:8, padding:22}}>
              <div style={{fontFamily:FONT_DISPLAY, fontSize:20, color:T.gold, marginBottom:4}}>Answer five questions.</div>
              <div style={{fontFamily:FONT_BODY, fontSize:13, color:T.silver, marginBottom:22}}>Rōm writes a compelling bio from your answers. You own the final version.</div>
              <div style={{display:"flex", flexDirection:"column", gap:16}}>
                {questions.map((q,i)=>(
                  <div key={q.key}>
                    <div style={{fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.silver, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:6}}>{i+1}. {q.label}</div>
                    <Field value={wiz[q.key]} onChange={v=>setWiz(a=>({...a,[q.key]:v}))} placeholder={q.placeholder}/>
                  </div>
                ))}
              </div>
              <div style={{marginTop:18}}>
                <GoldBtn onClick={generate} disabled={generating||Object.values(wiz).every(v=>!v)}>
                  {generating ? "Writing your bio…" : "✦ Generate bio"}
                </GoldBtn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── STEP 2: YOUR EXPERTISE ───────────────────────────────────────────────────
function Step2({ data, setData }) {
  const toggle = (arr,val) => arr.includes(val) ? arr.filter(x=>x!==val) : [...arr,val];
  return (
    <div style={{display:"flex", flexDirection:"column", gap:28}}>
      <div>
        <Label>Activity Categories</Label>
        <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.silver, marginBottom:12}}>Select all that apply — these power your search ranking.</div>
        <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
          {CATEGORIES.map(cat=><Chip key={cat} label={cat} active={data.categories.includes(cat)} onClick={()=>setData(d=>({...d,categories:toggle(d.categories,cat)}))}/>)}
        </div>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20}}>
        <div><Label>Years of Professional Guiding</Label><Select value={data.yearsExperience} onChange={v=>setData(d=>({...d,yearsExperience:v}))} placeholder="Select range" options={["Less than 1 year","1–2 years","3–5 years","6–10 years","11–20 years","20+ years"]}/></div>
        <div><Label>Group Size Preference</Label><Select value={data.groupPref} onChange={v=>setData(d=>({...d,groupPref:v}))} placeholder="Select preference" options={["Solo guests only","2–4 guests","Up to 6 guests","Up to 8 guests","Any group size"]}/></div>
      </div>
      <div>
        <Label>Languages Spoken</Label>
        <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
          {LANGUAGES.map(lang=><Chip key={lang} label={lang} active={data.languages.includes(lang)} onClick={()=>setData(d=>({...d,languages:toggle(d.languages,lang)}))}/>)}
        </div>
      </div>
      <div><Label>Your Specialties</Label><Field multiline rows={3} value={data.specialties} onChange={v=>setData(d=>({...d,specialties:v}))} placeholder="e.g. Dry fly technique on technical spring creeks, reading complex currents, big game elk hunting in high alpine terrain"/></div>
      <div><Label>Guiding Style</Label><Field multiline rows={3} value={data.style} onChange={v=>setData(d=>({...d,style:v}))} placeholder="Describe how you guide. Educational? Relaxed? Intense? What do guests say about how you run a trip?"/></div>
    </div>
  );
}

// ─── STEP 3: YOUR PACKAGES ────────────────────────────────────────────────────
function PackageCard({ pkg, onEdit, onRemove }) {
  return (
    <div style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:8, padding:20}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8}}>
        <div>
          <div style={{fontFamily:FONT_DISPLAY, fontSize:20, color:T.white}}>{pkg.title||"Untitled Package"}</div>
          <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.silver, marginTop:3}}>
            {pkg.duration && `${pkg.duration} · `}
            {pkg.priceType==="flat" ? `$${pkg.price} flat` : `$${pkg.price}/person`}
            {pkg.maxGuests && ` · Up to ${pkg.maxGuests} guests`}
          </div>
        </div>
        <div style={{display:"flex", gap:8}}>
          <GoldBtn small outline onClick={onEdit}>Edit</GoldBtn>
          <button onClick={onRemove} style={{background:"none", border:`1px solid ${T.wire}`, borderRadius:4, color:T.silver, cursor:"pointer", fontSize:16, padding:"4px 10px", lineHeight:1}}>×</button>
        </div>
      </div>
      {pkg.description && <div style={{fontFamily:FONT_BODY, fontSize:13, color:T.ash, lineHeight:1.5}}>{pkg.description.slice(0,120)}…</div>}
    </div>
  );
}

function PackageForm({ pkg, onChange, onSave, onCancel }) {
  const [generating, setGenerating] = useState(false);
  const generate = async () => {
    if(!pkg.title) return;
    setGenerating(true);
    await new Promise(r=>setTimeout(r,1800));
    onChange({...pkg, description:`An ${pkg.duration||"immersive"} guided experience designed for ${pkg.maxGuests?`groups up to ${pkg.maxGuests}`:"small groups"}. You'll spend your time in prime territory with a focus on real skill-building — not just covering ground. Everything is included: ${pkg.includes||"gear, guidance, and local knowledge"}.`});
    setGenerating(false);
  };

  return (
    <div style={{background:T.lifted, border:`1px solid ${T.gold}`, borderRadius:8, padding:24}}>
      <div style={{fontFamily:FONT_DISPLAY, fontSize:22, color:T.gold, marginBottom:20}}>{pkg.title ? `Editing: ${pkg.title}` : "New Package"}</div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
        <div style={{gridColumn:"1 / -1"}}><Label>Package Title</Label><Field value={pkg.title} onChange={v=>onChange({...pkg,title:v})} placeholder="e.g. Half Day Trophy Trout"/></div>
        <div><Label>Category</Label><Select value={pkg.category} onChange={v=>onChange({...pkg,category:v})} placeholder="Select category" options={CATEGORIES}/></div>
        <div><Label>Duration</Label><Select value={pkg.duration} onChange={v=>onChange({...pkg,duration:v})} placeholder="Select duration" options={["2 hours","Half day (4 hrs)","Full day (8 hrs)","2 days","3 days","4 days","5 days","6 days","1 week","Custom"]}/></div>
        <div><Label>Pricing Type</Label><Select value={pkg.priceType} onChange={v=>onChange({...pkg,priceType:v})} placeholder="Select type" options={[{value:"person",label:"Per person"},{value:"flat",label:"Flat rate (whole group)"}]}/></div>
        <div><Label>Price (USD)</Label><Field value={pkg.price} onChange={v=>onChange({...pkg,price:v})} placeholder="e.g. 350"/></div>
        <div><Label>Min Guests</Label><Select value={pkg.minGuests} onChange={v=>onChange({...pkg,minGuests:v})} placeholder="Min" options={["1","2","3","4","5","6"]}/></div>
        <div><Label>Max Guests</Label><Select value={pkg.maxGuests} onChange={v=>onChange({...pkg,maxGuests:v})} placeholder="Max" options={["1","2","3","4","5","6","7","8","10","12"]}/></div>
        <div style={{gridColumn:"1 / -1"}}><Label>What's Included</Label><Field value={pkg.includes} onChange={v=>onChange({...pkg,includes:v})} placeholder="e.g. All gear, flies, waders, lunch, fishing license"/></div>
        <div style={{gridColumn:"1 / -1"}}><Label>Meeting Point</Label><Field value={pkg.meetingPoint} onChange={v=>onChange({...pkg,meetingPoint:v})} placeholder="e.g. Ennis, MT — exact address sent after booking"/></div>
        <div style={{gridColumn:"1 / -1"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
            <Label>Package Description</Label>
            <GoldBtn small outline onClick={generate} disabled={generating||!pkg.title}>{generating?"Writing…":"✦ AI draft"}</GoldBtn>
          </div>
          <Field multiline rows={5} value={pkg.description} onChange={v=>onChange({...pkg,description:v})} placeholder="Describe the experience — what guests will do, see, and feel. Be specific."/>
        </div>
      </div>
      <div style={{display:"flex", gap:12, marginTop:20}}>
        <GoldBtn onClick={onSave} disabled={!pkg.title||!pkg.price}>Save Package</GoldBtn>
        <GoldBtn outline onClick={onCancel}>Cancel</GoldBtn>
      </div>
    </div>
  );
}

function Step3({ data, setData }) {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const emptyPkg = {title:"",category:"",duration:"",priceType:"person",price:"",minGuests:"1",maxGuests:"",includes:"",meetingPoint:"",description:""};

  return (
    <div style={{display:"flex", flexDirection:"column", gap:16}}>
      {data.packages.length===0 && editing===null && (
        <div style={{textAlign:"center", padding:"56px 24px", border:`1.5px dashed ${T.wire}`, borderRadius:8, background:T.steel}}>
          <div style={{fontFamily:FONT_DISPLAY, fontSize:30, color:T.silver, marginBottom:8, fontWeight:300}}>No packages yet</div>
          <div style={{fontFamily:FONT_BODY, fontSize:14, color:T.muted, marginBottom:24}}>You need at least one package before your profile can go live.</div>
          <GoldBtn onClick={()=>{setDraft(emptyPkg);setEditing("new");}}>+ Create Your First Package</GoldBtn>
        </div>
      )}
      {data.packages.map((pkg,i)=>editing===i
        ? <PackageForm key={i} pkg={draft} onChange={setDraft} onSave={()=>{setData(d=>({...d,packages:d.packages.map((p,idx)=>idx===i?draft:p)}));setEditing(null);}} onCancel={()=>setEditing(null)}/>
        : <PackageCard key={i} pkg={pkg} onEdit={()=>{setDraft({...pkg});setEditing(i);}} onRemove={()=>setData(d=>({...d,packages:d.packages.filter((_,idx)=>idx!==i)}))}/>
      )}
      {editing==="new" && <PackageForm pkg={draft} onChange={setDraft} onSave={()=>{setData(d=>({...d,packages:[...d.packages,draft]}));setEditing(null);}} onCancel={()=>setEditing(null)}/>}
      {editing===null && data.packages.length>0 && <GoldBtn outline onClick={()=>{setDraft(emptyPkg);setEditing("new");}}>+ Add Another Package</GoldBtn>}
    </div>
  );
}

// ─── STEP 4: AVAILABILITY ─────────────────────────────────────────────────────
const MONTH_NAMES=["January","February","March","April","May","June","July","August","September","October","November","December"];

function CalMonth({ year, month, available, onToggle }) {
  const firstDay = new Date(year,month,1).getDay();
  const days = new Date(year,month+1,0).getDate();
  const cells=[];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=days;d++) cells.push(d);
  const today = new Date();

  return (
    <div style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:8, padding:18}}>
      <div style={{fontFamily:FONT_DISPLAY, fontSize:17, color:T.parchment, marginBottom:14, textAlign:"center"}}>{MONTH_NAMES[month]} {year}</div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:6}}>
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} style={{textAlign:"center",fontFamily:FONT_BODY,fontSize:10,fontWeight:700,color:T.muted,padding:"3px 0"}}>{d}</div>)}
      </div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2}}>
        {cells.map((day,i)=>{
          if(!day) return <div key={i}/>;
          const key=`${year}-${month+1}-${day}`;
          const avail=available.includes(key);
          const past=new Date(year,month,day)<new Date(today.getFullYear(),today.getMonth(),today.getDate());
          return <button key={i} onClick={()=>!past&&onToggle(key)} style={{padding:"6px 2px",textAlign:"center",fontFamily:FONT_BODY,fontSize:12,background:avail?T.gold:"transparent",color:past?T.rim:avail?T.ink:T.ash,border:"none",borderRadius:4,cursor:past?"default":"pointer",fontWeight:avail?700:400,transition:"all 0.1s"}}>{day}</button>;
        })}
      </div>
    </div>
  );
}

function Step4({ data, setData }) {
  const now = new Date();
  const [viewYear,setViewYear]=useState(now.getFullYear());
  const [viewMonth,setViewMonth]=useState(now.getMonth());
  const toggle=key=>setData(d=>({...d,availability:d.availability.includes(key)?d.availability.filter(x=>x!==key):[...d.availability,key]}));
  const next=()=>{if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1);};
  const prev=()=>{if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1);};

  return (
    <div style={{display:"flex", flexDirection:"column", gap:24}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <div style={{fontFamily:FONT_BODY, fontSize:13, color:T.ash}}>Click any date to mark it available. Click again to remove.</div>
          {data.availability.length>0 && <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.gold, marginTop:4}}>{data.availability.length} day{data.availability.length!==1?"s":""} marked available</div>}
        </div>
        <div style={{display:"flex", gap:8}}>
          <button onClick={prev} style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:4,color:T.ash,padding:"7px 13px",cursor:"pointer"}}>←</button>
          <button onClick={next} style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:4,color:T.ash,padding:"7px 13px",cursor:"pointer"}}>→</button>
        </div>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>
        <CalMonth year={viewYear} month={viewMonth} available={data.availability} onToggle={toggle}/>
        <CalMonth year={viewMonth===11?viewYear+1:viewYear} month={viewMonth===11?0:viewMonth+1} available={data.availability} onToggle={toggle}/>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
        <div><Label>Min Advance Notice</Label><Select value={data.minAdvance} onChange={v=>setData(d=>({...d,minAdvance:v}))} placeholder="Select" options={["Same day","24 hours","48 hours","3 days","1 week","2 weeks"]}/></div>
        <div><Label>Max Advance Booking</Label><Select value={data.maxAdvance} onChange={v=>setData(d=>({...d,maxAdvance:v}))} placeholder="Select" options={["1 month","3 months","6 months","12 months","18 months","No limit"]}/></div>
      </div>
      <div><Label optional>Season Notes</Label><Field multiline rows={3} value={data.seasonNotes} onChange={v=>setData(d=>({...d,seasonNotes:v}))} placeholder="e.g. Peak season is June–September. I guide year-round but conditions vary significantly."/></div>
    </div>
  );
}

// ─── STEP 5: YOUR LOCATION ────────────────────────────────────────────────────
function Step5({ data, setData }) {
  const toggle=(arr,val)=>arr.includes(val)?arr.filter(x=>x!==val):[...arr,val];
  const regions=["Northeast USA","Southeast USA","Midwest USA","Southwest USA","Mountain West USA","Pacific Northwest USA","Alaska","Hawaii","Western Canada","Eastern Canada","Mexico & Central America","Caribbean","South America","Western Europe","Eastern Europe","Scandinavia","Mediterranean","Africa & Middle East","South & Southeast Asia","East Asia","Australia & New Zealand","Pacific Islands"];
  const travelOpts=["Guests come to me — fixed home base","I travel to guests within my region","Both — depends on the package","I operate in multiple distinct regions"];

  return (
    <div style={{display:"flex", flexDirection:"column", gap:28}}>
      <div>
        <Label>Primary Operating Region</Label>
        <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
          {regions.map(r=><Chip key={r} label={r} active={data.primaryRegion===r} onClick={()=>setData(d=>({...d,primaryRegion:r}))}/>)}
        </div>
      </div>
      <div><Label>Specific Destinations, Parks, or Named Areas</Label><Field multiline rows={3} value={data.destinations} onChange={v=>setData(d=>({...d,destinations:v}))} placeholder="e.g. Yellowstone National Park, Madison River, Henry's Fork — be specific for search visibility"/></div>
      <div>
        <Label>Travel Arrangement</Label>
        <div style={{display:"flex", flexDirection:"column", gap:10, marginTop:4}}>
          {travelOpts.map(opt=>(
            <label key={opt} style={{display:"flex", alignItems:"center", gap:12, cursor:"pointer"}}>
              <div onClick={()=>setData(d=>({...d,travelType:opt}))} style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${data.travelType===opt?T.gold:T.wire}`,background:data.travelType===opt?T.gold:"transparent",flexShrink:0,transition:"all 0.15s"}}/>
              <span style={{fontFamily:FONT_BODY, fontSize:14, color:T.ash}}>{opt}</span>
            </label>
          ))}
        </div>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
        <div><Label>Home Base City</Label><Field value={data.homeBase} onChange={v=>setData(d=>({...d,homeBase:v}))} placeholder="e.g. Bozeman, MT"/></div>
        <div><Label>Country</Label><Field value={data.country} onChange={v=>setData(d=>({...d,country:v}))} placeholder="e.g. United States"/></div>
      </div>
    </div>
  );
}

// ─── STEP 6: CREDENTIALS ──────────────────────────────────────────────────────
function Step6({ data, setData }) {
  const certs=[{key:"firstAid",label:"First Aid / CPR"},{key:"wfr",label:"Wilderness First Responder"},{key:"swiftwater",label:"Swiftwater Rescue"},{key:"avalanche",label:"Avalanche Safety (AIARE/AST)"},{key:"padi",label:"PADI Dive Instructor"},{key:"cpr",label:"CPR / AED Certified"}];
  const toggle=(arr,val)=>arr.includes(val)?arr.filter(x=>x!==val):[...arr,val];
  const timePrefs=["Morning (9am–12pm)","Afternoon (12pm–4pm)","Evening (4pm–7pm)"];

  return (
    <div style={{display:"flex", flexDirection:"column", gap:28}}>
      {/* Requirement callout */}
      <div style={{background:T.goldGlow, border:`1px solid ${T.gold}`, borderRadius:8, padding:18}}>
        <div style={{fontFamily:FONT_BODY, fontSize:13, fontWeight:700, color:T.gold, marginBottom:4}}>Required before your profile goes live</div>
        <div style={{fontFamily:FONT_BODY, fontSize:13, color:T.ash}}>Liability insurance is the one hard requirement. Licenses and certifications are displayed on your profile to build guest trust — they're not gates to approval.</div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
        <div><Label required>Government-Issued Photo ID</Label><UploadZone label="Upload photo ID" sub="Driver's license or passport — confidential" icon="◧" onFile={f=>setData(d=>({...d,photoId:f}))} file={data.photoId}/></div>
        <div><Label required>Liability Insurance Certificate</Label><UploadZone label="Upload insurance cert" sub="Current policy — name and dates must be visible" icon="◨" onFile={f=>setData(d=>({...d,insurance:f}))} file={data.insurance}/></div>
        <div><Label optional>Professional Guide License</Label><UploadZone label="Upload guide license" sub="Fishing, hunting, outfitter, etc." icon="◩" onFile={f=>setData(d=>({...d,guideLicense:f}))} file={data.guideLicense}/></div>
        <div><Label optional>Additional Certifications</Label><UploadZone label="Upload other cert" sub="PADI, WFR, avalanche, etc." icon="◪" onFile={f=>setData(d=>({...d,otherCert:f}))} file={data.otherCert}/></div>
      </div>

      <div>
        <Label>Certifications You Hold</Label>
        <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
          {certs.map(c=><Chip key={c.key} label={c.label} active={(data.certifications||[]).includes(c.key)} onClick={()=>setData(d=>({...d,certifications:toggle(d.certifications||[],c.key)}))}/>)}
        </div>
      </div>

      <div>
        <Label>Interview Scheduling Preference</Label>
        <div style={{background:T.steel, border:`1px solid ${T.wire}`, borderRadius:8, padding:20}}>
          <div style={{fontFamily:FONT_BODY, fontSize:13, color:T.ash, marginBottom:16}}>A brief 20–30 min call with the Rōm founder. Not an interrogation — a conversation about your territory and how Rōm can set you up well.</div>
          <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
            {timePrefs.map(slot=><Chip key={slot} label={slot} active={data.interviewPref===slot} onClick={()=>setData(d=>({...d,interviewPref:slot}))}/>)}
          </div>
          {data.interviewPref && <div style={{marginTop:12, fontFamily:FONT_BODY, fontSize:12, color:T.gold}}>✦ We'll send scheduling options in your window within 24 hours of your application.</div>}
        </div>
      </div>
    </div>
  );
}

// ─── STEP 7: GET PAID ─────────────────────────────────────────────────────────
function Step7({ data, setData }) {
  const [connected, setConnected] = useState(false);
  return (
    <div style={{display:"flex", flexDirection:"column", gap:24}}>
      <div style={{textAlign:"center", padding:"40px 32px", background:T.steel, border:`1px solid ${T.wire}`, borderRadius:10}}>
        <div style={{fontFamily:FONT_DISPLAY, fontSize:34, color:T.white, marginBottom:10, fontWeight:400}}>Connect Your Bank Account</div>
        <div style={{fontFamily:FONT_BODY, fontSize:15, color:T.ash, maxWidth:440, margin:"0 auto 32px", lineHeight:1.65}}>
          Rōm uses Stripe to send your earnings directly to your bank. Setup takes about 3 minutes. Your banking details are never stored by Rōm.
        </div>
        {!connected ? (
          <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:12}}>
            <GoldBtn onClick={()=>setConnected(true)}>Connect with Stripe →</GoldBtn>
            <div style={{fontFamily:FONT_BODY, fontSize:12, color:T.muted}}>You'll be redirected to Stripe's secure onboarding — then returned here</div>
          </div>
        ) : (
          <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:10}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:T.successGlow,border:`2px solid ${T.success}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:T.success}}>✓</div>
            <div style={{fontFamily:FONT_BODY, fontSize:15, color:T.success, fontWeight:700}}>Stripe account connected</div>
            <div style={{fontFamily:FONT_BODY, fontSize:13, color:T.silver}}>Payouts within 2 business days of each trip completion</div>
          </div>
        )}
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12}}>
        {[["◎","When you get paid","After your trip completes. Stripe settles in 2 business days."],["◷","Deposit timing","25% at booking. Balance auto-charged 14 days before the trip."],["◉","Your earnings","100% of your listed price. The 15% guest fee comes from guests — not from you."]].map(([icon,title,body])=>(
          <div key={title} style={{background:T.lifted, border:`1px solid ${T.wire}`, borderRadius:8, padding:18}}>
            <div style={{fontSize:18, color:T.gold, marginBottom:8}}>{icon}</div>
            <div style={{fontFamily:FONT_BODY, fontSize:13, fontWeight:700, color:T.parchment, marginBottom:6}}>{title}</div>
            <div style={{fontFamily:FONT_BODY, fontSize:13, color:T.silver, lineHeight:1.55}}>{body}</div>
          </div>
        ))}
      </div>

      <div style={{background:T.goldGlow, border:`1px solid ${T.gold}`, borderRadius:8, padding:24}}>
        <div style={{fontFamily:FONT_DISPLAY, fontSize:24, color:T.gold, marginBottom:8}}>Ready to submit your application?</div>
        <div style={{fontFamily:FONT_BODY, fontSize:14, color:T.ash, lineHeight:1.65}}>Once you submit, our team reviews your application personally within 48 hours. You'll receive a decision — approval or detailed feedback — via email. Early approved guides shape what Rōm becomes.</div>
      </div>
    </div>
  );
}

// ─── MAIN WIZARD ──────────────────────────────────────────────────────────────
const INIT = {
  name:"",tagline:"",location:"",bio:"",profilePhoto:null,coverPhoto:null,
  categories:[],yearsExperience:"",groupPref:"",languages:[],specialties:"",style:"",
  packages:[],
  availability:[],minAdvance:"",maxAdvance:"",seasonNotes:"",
  primaryRegion:"",destinations:"",travelType:"",homeBase:"",country:"",additionalRegions:[],
  photoId:null,insurance:null,guideLicense:null,otherCert:null,certifications:[],interviewPref:"",
};

const STEP_COMPLETE = (data) => ({
  1: !!(data.name && data.bio && data.location),
  2: data.categories.length > 0,
  3: data.packages.length > 0,
  4: data.availability.length > 0,
  5: !!data.primaryRegion,
  6: !!data.insurance,
  7: true,
});

const STEP_DESC = [
  "Tell guests who you are. Your name, location, and the story that makes you worth booking.",
  "What you guide, how long you've done it, and who you're best suited to take out.",
  "Your packages are your storefront. Clear titles, honest pricing, specific descriptions.",
  "Show guests when you're available. Guides with 90+ days available rank higher and book more.",
  "Where you operate — specifically. Guests search by destination, not just category.",
  "Credentials build trust. Insurance is required. Everything else makes your profile stronger.",
  "Connect your bank account. You keep 100% of your listed price.",
];


// ─── SUPABASE HELPERS ─────────────────────────────────────────────────────────
function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") + "-" + Math.random().toString(36).slice(2,6);
}

export default function GuideOnboarding() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState(INIT);
  const [savedAt, setSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const [guideId, setGuideId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const topRef = useRef();

  // ── Load current user on mount ──
  useEffect(() => {
    const init = async () => {
      const { createBrowserClient } = await import("@supabase/ssr");
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      setUserId(user.id);

      // Load existing draft if any
      const { data: existing } = await supabase
        .from("guides")
        .select("*")
        .eq("profile_id", user.id)
        .single();

      if (existing) {
        setGuideId(existing.id);
        // Restore saved data into form
        setData(d => ({
          ...d,
          name: existing.tagline ? d.name : d.name,
          tagline: existing.tagline || d.tagline,
          bio: existing.bio || d.bio,
          location: existing.location || d.location,
          homeBase: existing.home_base || d.homeBase,
          country: existing.country || d.country,
          primaryRegion: existing.primary_region || d.primaryRegion,
          destinations: existing.destinations || d.destinations,
          travelType: existing.travel_type || d.travelType,
          categories: existing.categories || d.categories,
          languages: existing.languages || d.languages,
          yearsExp: existing.years_experience || d.yearsExp,
          groupPref: existing.group_pref || d.groupPref,
          specialties: existing.specialties || d.specialties,
          style: existing.style || d.style,
          seasonNotes: existing.season_notes || d.seasonNotes,
          minAdvance: existing.min_advance || d.minAdvance,
          maxAdvance: existing.max_advance || d.maxAdvance,
        }));
      }
    };
    init();
  }, []);

  // ── Auto-save draft every time data changes ──
  useEffect(() => {
    if (!userId) return;
    const t = setTimeout(() => saveDraft(), 1500);
    return () => clearTimeout(t);
  }, [data, userId]);

  const saveDraft = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();

      const slug = generateSlug(profile?.full_name || "guide");

      const guideData = {
        profile_id: userId,
        slug: guideId ? undefined : slug,
        tagline: data.tagline,
        bio: data.bio,
        location: data.location,
        home_base: data.homeBase,
        country: data.country,
        primary_region: data.primaryRegion,
        destinations: data.destinations,
        travel_type: data.travelType,
        categories: data.categories,
        languages: data.languages,
        years_experience: data.yearsExp,
        group_pref: data.groupPref,
        specialties: data.specialties,
        style: data.style,
        season_notes: data.seasonNotes,
        min_advance: data.minAdvance,
        max_advance: data.maxAdvance,
        status: "draft",
        updated_at: new Date().toISOString(),
      };

      if (guideId) {
        await supabase.from("guides").update(guideData).eq("id", guideId);
      } else {
        const { data: newGuide } = await supabase
          .from("guides")
          .insert({ ...guideData, slug })
          .select()
          .single();
        if (newGuide) setGuideId(newGuide.id);
      }

      // Save packages if on step 3+
      if (guideId && data.packages?.length > 0) {
        for (const pkg of data.packages) {
          if (pkg.id?.startsWith("new-") || !pkg.dbId) {
            const { data: savedPkg } = await supabase
              .from("packages")
              .insert({
                guide_id: guideId,
                title: pkg.title,
                duration: pkg.duration,
                price: parseFloat(pkg.price) || 0,
                price_type: pkg.priceType || "person",
                min_guests: parseInt(pkg.minGuests) || 1,
                max_guests: parseInt(pkg.maxGuests) || 4,
                includes: pkg.includes,
                meeting_point: pkg.meetingPoint,
                description: pkg.desc,
              })
              .select()
              .single();
            if (savedPkg) {
              pkg.dbId = savedPkg.id;
            }
          }
        }
      }

      setSavedAt(new Date());
    } catch (e) {
      console.error("Save draft error:", e);
    }
    setSaving(false);
  };

  // ── Final submit ──
  const submitApplication = async () => {
    if (!guideId) { await saveDraft(); }
    setSubmitting(true);
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      await supabase
        .from("guides")
        .update({ status: "pending", updated_at: new Date().toISOString() })
        .eq("id", guideId);

      // Mark profile as guide role
      await supabase
        .from("profiles")
        .update({ role: "guide" })
        .eq("id", userId);

      setSubmitted(true);
    } catch (e) {
      console.error("Submit error:", e);
      alert("Something went wrong submitting. Please try again.");
    }
    setSubmitting(false);
  };

  const goTo = s => { setStep(s); topRef.current?.scrollIntoView({behavior:"smooth"}); };
  const complete = STEP_COMPLETE(data);
  const stepsComplete = Object.values(complete).filter(Boolean).length;

  // ── Submitted screen ──
  if (submitted) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Barlow:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{background:#080a0b;}`}</style>
      <div style={{minHeight:"100vh",background:"#080a0b",display:"flex",alignItems:"center",justifyContent:"center",padding:40}}>
        <div style={{textAlign:"center",maxWidth:480}}>
          <div style={{width:72,height:72,borderRadius:"50%",background:"#3a7a5428",border:"2px solid #3a7a54",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,color:"#3a7a54",margin:"0 auto 24px"}}>✓</div>
          <div style={{fontFamily:FONT_DISPLAY,fontSize:44,color:"#f5f2ee",fontWeight:400,marginBottom:12}}>Application Submitted</div>
          <p style={{fontFamily:FONT_BODY,fontSize:15,color:"#8a96a0",lineHeight:1.75,marginBottom:32}}>
            We review every guide application personally. You'll hear from us within 48 hours. Once approved your profile will go live and you can start accepting bookings.
          </p>
          <div style={{background:"#1f2428",border:"1px solid #424c54",borderRadius:8,padding:"16px 20px",marginBottom:32,textAlign:"left"}}>
            {[["Response time","Within 48 hours"],["What we review","Profile, credentials, insurance"],["Next step","Profile activation + Stripe setup"]].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #323840"}}>
                <span style={{fontFamily:FONT_BODY,fontSize:13,color:"#8a96a0"}}>{l}</span>
                <span style={{fontFamily:FONT_BODY,fontSize:13,color:"#e8e2d8",fontWeight:500}}>{v}</span>
              </div>
            ))}
          </div>
          <button onClick={()=>window.location.href="/guide/dashboard"} style={{background:"#c9973a",border:"none",borderRadius:8,padding:"14px 32px",fontFamily:FONT_BODY,fontSize:15,fontWeight:700,color:"#080a0b",cursor:"pointer"}}>
            Go to Dashboard →
          </button>
        </div>
      </div>
    </>
  );

  const stepContent = {
    1:<Step1 data={data} setData={setData}/>,
    2:<Step2 data={data} setData={setData}/>,
    3:<Step3 data={data} setData={setData}/>,
    4:<Step4 data={data} setData={setData}/>,
    5:<Step5 data={data} setData={setData}/>,
    6:<Step6 data={data} setData={setData}/>,
    7:<Step7 data={data} setData={setData}/>,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Barlow:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.void};}
        ::placeholder{color:${T.muted};}
        textarea,input,select{font-family:'Barlow',system-ui,sans-serif;}
        ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:${T.carbon};}::-webkit-scrollbar-thumb{background:${T.wire};border-radius:3px;}
        select option{background:${T.steel};}
      `}</style>

      <div ref={topRef} style={{position:"sticky",top:0,zIndex:100,background:T.void,borderBottom:`1px solid ${T.wire}`}}>
        <div style={{maxWidth:1160,margin:"0 auto",padding:"0 36px",height:64,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontFamily:FONT_DISPLAY,fontSize:26,color:T.gold,letterSpacing:"0.14em",fontWeight:500}}>RŌM</div>
          <div style={{fontFamily:FONT_BODY,fontSize:12,color:T.silver}}>
            {saving ? "Saving…" : savedAt ? `Draft saved ${savedAt.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}` : ""}
          </div>
        </div>
        <div style={{height:2,background:T.steel}}>
          <div style={{height:"100%",width:`${((step-1)/6)*100}%`,background:T.gold,transition:"width 0.4s ease"}}/>
        </div>
      </div>

      <div style={{background:T.gunmetal,minHeight:"calc(100vh - 66px)"}}>
        <div style={{maxWidth:1160,margin:"0 auto",padding:"48px 36px 96px"}}>
          <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:48,alignItems:"start"}}>

            <div style={{position:"sticky",top:80}}>
              <div style={{fontFamily:FONT_BODY,fontSize:10,fontWeight:700,color:T.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:16}}>Application Steps</div>
              <div style={{background:T.carbon,border:`1px solid ${T.wire}`,borderRadius:8,overflow:"hidden",marginBottom:16}}>
                {STEPS.map(s=>{
                  const done=complete[s.num];
                  const active=step===s.num;
                  return (
                    <button key={s.num} onClick={()=>goTo(s.num)} style={{
                      display:"flex",alignItems:"center",gap:12,
                      width:"100%",background:active?T.lifted:"transparent",
                      border:"none",borderLeft:`3px solid ${active?T.gold:done?T.success:"transparent"}`,
                      padding:"12px 16px",cursor:"pointer",textAlign:"left",
                      borderBottom:`1px solid ${T.rim}`,transition:"all 0.14s",
                    }}>
                      <span style={{fontSize:13,color:active?T.gold:done?T.success:T.wire,width:16,textAlign:"center",flexShrink:0}}>
                        {done&&!active?"✓":s.icon}
                      </span>
                      <div>
                        <div style={{fontFamily:FONT_BODY,fontSize:13,fontWeight:active?700:400,color:active?T.gold:done?T.parchment:T.silver}}>{s.label}</div>
                        <div style={{fontFamily:FONT_BODY,fontSize:10,color:T.muted,marginTop:1}}>Step {s.num}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div style={{background:T.carbon,border:`1px solid ${T.wire}`,borderRadius:8,padding:16}}>
                <div style={{fontFamily:FONT_BODY,fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Application Status</div>
                <div style={{fontFamily:FONT_BODY,fontSize:13,color:T.parchment,marginBottom:10}}>
                  <span style={{fontFamily:FONT_DISPLAY,fontSize:22,color:T.white,fontWeight:300}}>{stepsComplete}</span>
                  <span style={{color:T.silver}}> of 7 steps complete</span>
                </div>
                <div style={{height:5,background:T.steel,borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${(stepsComplete/7)*100}%`,background:T.gold,borderRadius:3,transition:"width 0.3s"}}/>
                </div>
                {stepsComplete===7 && <div style={{marginTop:12,fontFamily:FONT_BODY,fontSize:12,color:T.success,fontWeight:600}}>✓ Ready to submit</div>}
              </div>
            </div>

            <div>
              <div style={{marginBottom:32}}>
                <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:T.gold,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Step {step} of 7</div>
                <div style={{fontFamily:FONT_DISPLAY,fontSize:42,fontWeight:400,color:T.white,lineHeight:1.05,marginBottom:10}}>{STEPS[step-1].label}</div>
                <div style={{fontFamily:FONT_BODY,fontSize:15,color:T.ash,lineHeight:1.6}}>{STEP_DESC[step-1]}</div>
              </div>
              <div style={{background:T.steel,border:`1px solid ${T.wire}`,borderRadius:10,padding:32,marginBottom:28}}>
                {stepContent[step]}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>{step>1 && <GoldBtn outline onClick={()=>goTo(step-1)}>← Back</GoldBtn>}</div>
                <div style={{display:"flex",gap:12,alignItems:"center"}}>
                  {!complete[step]&&step<7&&(
                    <span style={{fontFamily:FONT_BODY,fontSize:12,color:T.muted}}>Complete this step to continue</span>
                  )}
                  {step<7 ? (
                    <GoldBtn onClick={()=>goTo(step+1)} disabled={!complete[step]}>
                      Continue to {STEPS[step]?.label} →
                    </GoldBtn>
                  ) : (
                    <GoldBtn onClick={submitApplication} disabled={submitting||stepsComplete<7}>
                      {submitting ? "Submitting…" : "✦ Submit Application"}
                    </GoldBtn>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
