"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { SectionCard, SectionHeader } from "@/app/components/ui";
import { getSupabase } from "@/app/lib/supabase-browser";
import { VIBES, ARCHETYPES, AVOID_OPTIONS, emptyProfile } from "@/app/lib/voice-profile";

const MIN_EXAMPLE_LEN = 40;
const MAX_EXAMPLE_LEN = 1200;
const MAX_EXAMPLES = 5;
const STEPS = ["Vibe", "Cadence", "Phrases", "Avoid"];

async function authHeader() {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

// ─── Reusable chip ─────────────────────────────────────────────────────────
function Chip({ active, onClick, children, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: active ? T.goldGlow : T.lifted,
        color: active ? T.gold : T.ash,
        border: `1px solid ${active ? T.gold : T.wire}`,
        borderRadius: 999,
        padding: "7px 14px",
        fontFamily: FONT_BODY,
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

// ─── Examples drawer (the old behavior — kept as power-user mode) ──────────
function ExamplesDrawer({ examples, setExamples }) {
  const [open, setOpen] = useState(false);
  const valid = useMemo(() => examples.filter((e) => {
    const len = (e || "").trim().length;
    return len >= MIN_EXAMPLE_LEN && len <= MAX_EXAMPLE_LEN;
  }).length, [examples]);

  const update = (i, value) => setExamples((arr) => arr.map((e, idx) => idx === i ? value : e));
  const add = () => examples.length < MAX_EXAMPLES && setExamples((a) => [...a, ""]);
  const remove = (i) => setExamples((arr) => arr.filter((_, idx) => idx !== i));

  return (
    <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px dashed ${T.rim}` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: T.silver, fontFamily: FONT_BODY, fontSize: 12 }}
      >
        {open ? "▾" : "▸"} Power mode: paste real posts you've written ({valid} on file)
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted, marginBottom: 10, lineHeight: 1.55 }}>
            For the tightest match, paste 1-3 of your best posts. We use the quick picks above on their own — these just sharpen the result. Each: {MIN_EXAMPLE_LEN}–{MAX_EXAMPLE_LEN} chars.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {examples.map((ex, i) => {
              const len = (ex || "").trim().length;
              const tooShort = len > 0 && len < MIN_EXAMPLE_LEN;
              const tooLong = len > MAX_EXAMPLE_LEN;
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Example {i + 1}</span>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: tooShort || tooLong ? "#aa7a7a" : T.muted }}>
                      {len} chars{tooShort ? ` · need ≥${MIN_EXAMPLE_LEN}` : tooLong ? ` · max ${MAX_EXAMPLE_LEN}` : ""}
                    </span>
                  </div>
                  <textarea
                    value={ex}
                    onChange={(e) => update(i, e.target.value)}
                    placeholder="Paste a real post you wrote — caption, blog excerpt, email opener…"
                    rows={3}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: T.steel, border: `1px solid ${tooShort || tooLong ? "#aa7a7a" : T.wire}`,
                      borderRadius: 6, padding: "8px 10px",
                      fontFamily: FONT_BODY, fontSize: 12, color: T.parchment,
                      outline: "none", resize: "vertical", lineHeight: 1.5,
                    }}
                  />
                  <button onClick={() => remove(i)}
                    style={{ marginTop: 2, background: "none", border: "none", color: T.muted, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 11 }}>
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
          {examples.length < MAX_EXAMPLES && (
            <button onClick={add} style={{
              marginTop: 6,
              background: "none", border: `1px dashed ${T.wire}`, borderRadius: 5,
              padding: "6px 12px", fontFamily: FONT_BODY, fontSize: 11, color: T.silver, cursor: "pointer",
            }}>
              + Add another
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export default function VoiceTrainer() {
  const [profile, setProfile] = useState(emptyProfile());
  const [examples, setExamples] = useState([""]);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [collapsed, setCollapsed] = useState(true);

  const load = useCallback(async () => {
    try {
      const headers = await authHeader();
      const res = await fetch("/api/guide/voice-profile", { headers });
      const data = await res.json();
      if (data.profile) setProfile({ ...emptyProfile(), ...data.profile, schemaVersion: 2 });
      if (Array.isArray(data.examples) && data.examples.length) setExamples([...data.examples]);
    } catch (err) {
      console.error("Voice load failed:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleArr = (key, id, max) => {
    setProfile((p) => {
      const set = new Set(p[key]);
      if (set.has(id)) set.delete(id);
      else {
        if (max && set.size >= max) return p;
        set.add(id);
      }
      return { ...p, [key]: Array.from(set) };
    });
  };

  const pickArchetype = (id) => setProfile((p) => ({ ...p, archetype: p.archetype === id ? null : id }));

  const save = async () => {
    setSaving(true);
    try {
      const headers = await authHeader();
      const res = await fetch("/api/guide/voice-profile", {
        method: "POST", headers,
        body: JSON.stringify({ profile, examples }),
      });
      const data = await res.json();
      if (data.saved) setSavedAt(Date.now());
    } catch (err) { console.error("Voice save failed:", err); }
    setSaving(false);
  };

  if (loading) return null;

  // Status: count answered steps. We treat the trainer as "trained" once
  // they've answered at least vibe + archetype (the two highest-signal Qs).
  const answered = (profile.vibes?.length ? 1 : 0)
    + (profile.archetype ? 1 : 0)
    + (profile.signaturePhrases?.trim() ? 1 : 0)
    + (profile.avoid?.length ? 1 : 0);
  const isTrained = profile.vibes?.length > 0 && !!profile.archetype;
  const statusColor = isTrained ? T.green : answered > 0 ? T.gold : T.muted;
  const statusLabel = isTrained ? "Trained" : answered > 0 ? "In progress" : "Not started";

  return (
    <SectionCard>
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
        onClick={() => setCollapsed((v) => !v)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <SectionHeader>Your Voice</SectionHeader>
          <span style={{
            fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700,
            color: statusColor, background: `${statusColor}28`,
            border: `1px solid ${statusColor}`, borderRadius: 3,
            padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            {statusLabel} · {answered}/4
          </span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>
            One-minute setup. Sharpens every piece the AI writes for you.
          </span>
        </div>
        <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.muted }}>{collapsed ? "▸" : "▾"}</span>
      </div>

      {!collapsed && (
        <div style={{ marginTop: 16 }}>
          {/* Step tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16, background: T.void, borderRadius: 6, padding: 3 }}>
            {STEPS.map((label, i) => {
              const active = i === step;
              const done =
                (i === 0 && profile.vibes?.length > 0) ||
                (i === 1 && !!profile.archetype) ||
                (i === 2 && !!profile.signaturePhrases?.trim()) ||
                (i === 3 && profile.avoid?.length > 0);
              return (
                <button
                  key={label}
                  onClick={() => setStep(i)}
                  style={{
                    flex: 1, padding: "8px 0",
                    background: active ? T.steel : "transparent",
                    border: "none", borderRadius: 4,
                    fontFamily: FONT_BODY, fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    color: active ? T.gold : done ? T.silver : T.muted,
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <span style={{ fontSize: 10, color: done ? T.green : T.muted }}>{done ? "✓" : i + 1}</span>
                  {label}
                </button>
              );
            })}
          </div>

          {/* STEP 1: Vibe */}
          {step === 0 && (
            <div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, marginBottom: 6 }}>What's your vibe?</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted, marginBottom: 12 }}>Pick up to 3 that describe how you actually talk to guests on a trip.</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {VIBES.map((v) => {
                  const active = profile.vibes?.includes(v.id);
                  return (
                    <Chip key={v.id} active={active} onClick={() => toggleArr("vibes", v.id, 3)}>
                      {v.label}
                    </Chip>
                  );
                })}
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted, marginTop: 8 }}>
                {profile.vibes?.length || 0} / 3 selected
              </div>
            </div>
          )}

          {/* STEP 2: Cadence (archetype picker) */}
          {step === 1 && (
            <div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, marginBottom: 6 }}>Which one sounds the most like you?</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted, marginBottom: 12 }}>Pick whichever feels closest. You can change it anytime.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ARCHETYPES.map((a) => {
                  const active = profile.archetype === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => pickArchetype(a.id)}
                      style={{
                        textAlign: "left",
                        background: active ? T.goldGlow : T.lifted,
                        border: `1px solid ${active ? T.gold : T.wire}`,
                        borderRadius: 8,
                        padding: 12,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: active ? T.gold : T.parchment }}>{a.label}</span>
                        <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: T.muted }}>{a.summary}</span>
                      </div>
                      <div style={{ fontFamily: "Georgia, serif", fontSize: 13, fontStyle: "italic", color: T.ash, lineHeight: 1.55 }}>
                        “{a.sample}”
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Signature phrases */}
          {step === 2 && (
            <div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, marginBottom: 6 }}>Any signature phrases you use a lot?</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted, marginBottom: 12 }}>
                Openers, closers, phrases you'd never say it any other way. Optional but helpful — the AI will work them in where they fit.
              </div>
              <textarea
                value={profile.signaturePhrases || ""}
                onChange={(e) => setProfile((p) => ({ ...p, signaturePhrases: e.target.value }))}
                placeholder="e.g. tight lines, drop me a line, see you on the water, we'll figure it out"
                rows={3}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: T.steel, border: `1px solid ${T.wire}`,
                  borderRadius: 6, padding: "10px 12px",
                  fontFamily: FONT_BODY, fontSize: 13, color: T.parchment,
                  outline: "none", resize: "vertical", lineHeight: 1.6,
                }}
              />
            </div>
          )}

          {/* STEP 4: Avoid */}
          {step === 3 && (
            <div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, marginBottom: 6 }}>What should the AI avoid?</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted, marginBottom: 12 }}>Pick anything that's not you.</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {AVOID_OPTIONS.map((a) => {
                  const active = profile.avoid?.includes(a.id);
                  return (
                    <Chip key={a.id} active={active} onClick={() => toggleArr("avoid", a.id)}>
                      {a.label}
                    </Chip>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step nav + save */}
          <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                style={{
                  background: "none", border: `1px solid ${T.wire}`, borderRadius: 5,
                  padding: "7px 14px", fontFamily: FONT_BODY, fontSize: 12,
                  color: step === 0 ? T.muted : T.silver,
                  cursor: step === 0 ? "not-allowed" : "pointer",
                }}
              >← Back</button>
              {step < STEPS.length - 1 && (
                <button
                  onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                  style={{
                    background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 5,
                    padding: "7px 14px", fontFamily: FONT_BODY, fontSize: 12, color: T.ash, cursor: "pointer",
                  }}
                >Next →</button>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {savedAt && Date.now() - savedAt < 3000 && (
                <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.green }}>Saved ✓</span>
              )}
              <button
                onClick={save}
                disabled={saving}
                style={{
                  background: T.gold, border: "none", borderRadius: 5,
                  padding: "8px 18px", fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700,
                  color: T.ink, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.5 : 1,
                }}
              >
                {saving ? "Saving…" : "Save Voice"}
              </button>
            </div>
          </div>

          <ExamplesDrawer examples={examples} setExamples={setExamples} />
        </div>
      )}
    </SectionCard>
  );
}
