"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

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
  red:      "#8a3a3a",
  redGlow:  "#8a3a3a28",
  green:    "#3a7a54",
  greenGlow:"#3a7a5428",
};
const FONT_DISPLAY = "'Cormorant Garamond', Georgia, serif";
const FONT_BODY    = "'Barlow', system-ui, sans-serif";

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function Field({ label, type="text", value, onChange, placeholder, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{marginBottom:20}}>
      <label style={{display:"block", fontFamily:FONT_BODY, fontSize:11, fontWeight:700, color:T.silver, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8}}>{label}</label>
      <input
        type={type} value={value} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{
          width:"100%", boxSizing:"border-box",
          background:focused?T.lifted:T.steel,
          border:`1px solid ${error?T.red:focused?T.gold:T.wire}`,
          borderRadius:6, padding:"12px 14px",
          fontFamily:FONT_BODY, fontSize:15, color:T.parchment,
          outline:"none", transition:"all 0.18s",
        }}
      />
      {error && <div style={{fontFamily:FONT_BODY, fontSize:12, color:"#aa7a7a", marginTop:6}}>{error}</div>}
    </div>
  );
}

function AuthButton({ children, onClick, loading, disabled }) {
  return (
    <button onClick={onClick} disabled={loading||disabled} style={{
      width:"100%", padding:"14px",
      background:loading||disabled?T.wire:T.gold,
      border:"none", borderRadius:8,
      fontFamily:FONT_BODY, fontSize:15, fontWeight:700,
      color:loading||disabled?T.muted:T.ink,
      cursor:loading||disabled?"not-allowed":"pointer",
      transition:"all 0.18s",
    }}>
      {loading ? "Please wait…" : children}
    </button>
  );
}

function LoginForm({ onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true); setError("");
    try {
      const supabase = getSupabase();
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      const role = profile?.role || "traveler";
      window.location.href = role === "guide" ? "/guide/dashboard" : "/dashboard";
    } catch(e) {
      console.error("Login error:", e);
      setError("Error: " + (e?.message || String(e)));
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{fontFamily:FONT_DISPLAY, fontSize:36, color:T.white, fontWeight:400, marginBottom:6}}>Welcome back</div>
      <div style={{fontFamily:FONT_BODY, fontSize:14, color:T.silver, marginBottom:32}}>Sign in to your Rōm account.</div>
      {error && <div style={{background:T.redGlow, border:`1px solid ${T.red}`, borderRadius:6, padding:"12px 14px", marginBottom:20}}><div style={{fontFamily:FONT_BODY, fontSize:13, color:"#cc9090"}}>{error}</div></div>}
      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@email.com"/>
      <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="Your password"/>
      <div style={{textAlign:"right", marginBottom:24, marginTop:-10}}>
        <span onClick={()=>onSwitch("forgot")} style={{fontFamily:FONT_BODY, fontSize:13, color:T.silver, cursor:"pointer"}}>Forgot password?</span>
      </div>
      <AuthButton onClick={submit} loading={loading}>Sign In</AuthButton>
      <div style={{textAlign:"center", marginTop:24, fontFamily:FONT_BODY, fontSize:14, color:T.silver}}>
        Don't have an account?{" "}
        <span onClick={()=>onSwitch("signup-traveler")} style={{color:T.gold, cursor:"pointer", fontWeight:600}}>Sign up</span>
      </div>
    </div>
  );
}

function SignupForm({ role, onSwitch }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email.includes("@")) e.email = "Valid email required";
    if (password.length < 8) e.password = "Password must be at least 8 characters";
    if (password !== confirm) e.confirm = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true); setError("");
    try {
      const supabase = getSupabase();
      const { data, error: err } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name, role } }
      });
      if (err) { setError(err.message); setLoading(false); return; }
      if (data.user) {
        await supabase.from("profiles").update({ role, full_name: name }).eq("id", data.user.id);
      }
      setSuccess(true);
    } catch(e) {
      console.error("Signup error:", e);
      setError("Error: " + (e?.message || String(e)));
    }
    setLoading(false);
  };

  if (success) return (
    <div style={{textAlign:"center"}}>
      <div style={{width:60, height:60, borderRadius:"50%", background:T.greenGlow, border:`2px solid ${T.green}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, color:T.green, margin:"0 auto 20px"}}>✓</div>
      <div style={{fontFamily:FONT_DISPLAY, fontSize:32, color:T.white, marginBottom:10}}>Check your email</div>
      <div style={{fontFamily:FONT_BODY, fontSize:14, color:T.ash, lineHeight:1.7, marginBottom:28}}>
        We sent a confirmation link to <strong style={{color:T.parchment}}>{email}</strong>. Click it to activate your account, then come back to sign in.
      </div>
      <button onClick={()=>onSwitch("login")} style={{background:"none", border:`1px solid ${T.wire}`, borderRadius:6, padding:"11px 24px", fontFamily:FONT_BODY, fontSize:14, color:T.ash, cursor:"pointer"}}>Back to Sign In</button>
    </div>
  );

  return (
    <div>
      <div style={{fontFamily:FONT_DISPLAY, fontSize:36, color:T.white, fontWeight:400, marginBottom:6}}>
        {role==="guide" ? "Apply to guide on Rōm" : "Create your account"}
      </div>
      <div style={{fontFamily:FONT_BODY, fontSize:14, color:T.silver, marginBottom:28}}>
        {role==="guide" ? "Start your guide application. Takes about 10 minutes." : "Plan your next adventure."}
      </div>

      <div style={{display:"flex", background:T.void, borderRadius:8, padding:4, marginBottom:28, border:`1px solid ${T.wire}`}}>
        {[["traveler","I'm a traveler"],["guide","I'm a guide"]].map(([r,label])=>(
          <button key={r} onClick={()=>onSwitch(`signup-${r}`)} style={{
            flex:1, padding:"9px", background:role===r?T.steel:"transparent",
            border:"none", borderRadius:6,
            fontFamily:FONT_BODY, fontSize:13, fontWeight:role===r?700:400,
            color:role===r?T.gold:T.silver, cursor:"pointer", transition:"all 0.15s",
          }}>{label}</button>
        ))}
      </div>

      {error && <div style={{background:T.redGlow, border:`1px solid ${T.red}`, borderRadius:6, padding:"12px 14px", marginBottom:20}}><div style={{fontFamily:FONT_BODY, fontSize:13, color:"#cc9090"}}>{error}</div></div>}

      <Field label="Full Name" value={name} onChange={setName} placeholder="Your legal name" error={errors.name}/>
      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@email.com" error={errors.email}/>
      <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 8 characters" error={errors.password}/>
      <Field label="Confirm Password" type="password" value={confirm} onChange={setConfirm} placeholder="Same password again" error={errors.confirm}/>

      {role==="guide" && (
        <div style={{background:T.goldGlow, border:`1px solid ${T.gold}`, borderRadius:6, padding:"12px 14px", marginBottom:20}}>
          <div style={{fontFamily:FONT_BODY, fontSize:13, color:T.gold}}>✦ After signing up you'll complete the guide application — about 10 minutes.</div>
        </div>
      )}

      <AuthButton onClick={submit} loading={loading}>
        {role==="guide" ? "Start Guide Application" : "Create Account"}
      </AuthButton>

      <div style={{textAlign:"center", marginTop:24, fontFamily:FONT_BODY, fontSize:14, color:T.silver}}>
        Already have an account?{" "}
        <span onClick={()=>onSwitch("login")} style={{color:T.gold, cursor:"pointer", fontWeight:600}}>Sign in</span>
      </div>
    </div>
  );
}

function ForgotForm({ onSwitch }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!email.includes("@")) { setError("Enter a valid email."); return; }
    setLoading(true); setError("");
    try {
      const supabase = getSupabase();
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      if (err) { setError(err.message); setLoading(false); return; }
      setSent(true);
    } catch(e) {
      console.error("Reset error:", e);
      setError("Error: " + (e?.message || String(e)));
    }
    setLoading(false);
  };

  if (sent) return (
    <div style={{textAlign:"center"}}>
      <div style={{fontFamily:FONT_DISPLAY, fontSize:30, color:T.white, marginBottom:10}}>Email sent</div>
      <div style={{fontFamily:FONT_BODY, fontSize:14, color:T.ash, lineHeight:1.7, marginBottom:28}}>Check your inbox for a password reset link. It expires in 1 hour.</div>
      <button onClick={()=>onSwitch("login")} style={{background:"none", border:`1px solid ${T.wire}`, borderRadius:6, padding:"11px 24px", fontFamily:FONT_BODY, fontSize:14, color:T.ash, cursor:"pointer"}}>Back to Sign In</button>
    </div>
  );

  return (
    <div>
      <div style={{fontFamily:FONT_DISPLAY, fontSize:36, color:T.white, fontWeight:400, marginBottom:6}}>Reset your password</div>
      <div style={{fontFamily:FONT_BODY, fontSize:14, color:T.silver, marginBottom:28}}>Enter your email and we'll send a reset link.</div>
      {error && <div style={{background:T.redGlow, border:`1px solid ${T.red}`, borderRadius:6, padding:"12px 14px", marginBottom:20}}><div style={{fontFamily:FONT_BODY, fontSize:13, color:"#cc9090"}}>{error}</div></div>}
      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@email.com"/>
      <AuthButton onClick={submit} loading={loading}>Send Reset Link</AuthButton>
      <div style={{textAlign:"center", marginTop:24}}>
        <span onClick={()=>onSwitch("login")} style={{fontFamily:FONT_BODY, fontSize:14, color:T.silver, cursor:"pointer"}}>← Back to Sign In</span>
      </div>
    </div>
  );
}

export default function AuthPage({ defaultMode = "login" }) {
  const [mode, setMode] = useState(defaultMode);
  const role = mode.startsWith("signup-") ? mode.replace("signup-","") : "traveler";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Barlow:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.void};}
        ::placeholder{color:${T.muted};}
        ::-webkit-scrollbar{width:5px;}
      `}</style>

      <div style={{minHeight:"100vh", background:T.void, display:"flex"}}>
        <div style={{flex:1, position:"relative", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center"}}>
          <div style={{position:"absolute", inset:0, background:"linear-gradient(160deg, #152018 0%, #0b1824 50%, #1a1206 100%)"}}>
            <div style={{position:"absolute", inset:0, backgroundImage:`radial-gradient(ellipse at 25% 60%, ${T.gold}28 0%, transparent 50%), radial-gradient(ellipse at 75% 20%, #1a3a5030 0%, transparent 40%)`}}/>
          </div>
          <div style={{position:"relative", padding:"60px 64px", maxWidth:480}}>
            <div style={{fontFamily:FONT_DISPLAY, fontSize:40, color:T.gold, letterSpacing:"0.16em", fontWeight:500, marginBottom:48}}>RŌM</div>
            <div style={{fontFamily:FONT_DISPLAY, fontSize:48, color:T.white, fontWeight:400, lineHeight:1.05, marginBottom:20}}>
              The world's best<br/>
              <span style={{color:T.gold, fontStyle:"italic"}}>adventure guides,</span><br/>
              in one place.
            </div>
            <p style={{fontFamily:FONT_BODY, fontSize:15, color:T.ash, lineHeight:1.75, marginBottom:48}}>
              Book directly with verified local guides — fly fishing, hunting, climbing, diving, and more.
            </p>
            <div style={{display:"flex", flexDirection:"column", gap:16}}>
              {[["✦","340+ verified guides worldwide"],["◉","Direct booking — no middlemen"],["◎","100% of your price if you guide"]].map(([icon,text])=>(
                <div key={text} style={{display:"flex", gap:14, alignItems:"center"}}>
                  <span style={{color:T.gold, fontSize:14, flexShrink:0}}>{icon}</span>
                  <span style={{fontFamily:FONT_BODY, fontSize:14, color:T.parchment}}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{width:480, background:T.carbon, borderLeft:`1px solid ${T.wire}`, display:"flex", alignItems:"center", justifyContent:"center", padding:"48px 40px"}}>
          <div style={{width:"100%", maxWidth:380}}>
            {mode==="login" && <LoginForm onSwitch={setMode}/>}
            {mode.startsWith("signup") && <SignupForm role={role} onSwitch={setMode}/>}
            {mode==="forgot" && <ForgotForm onSwitch={setMode}/>}
          </div>
        </div>
      </div>
    </>
  );
}
