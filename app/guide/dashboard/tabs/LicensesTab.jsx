"use client";
import { useState, useEffect } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";
import { GoldBtn } from "@/app/components/ui";

export default function LicensesTab({ guideId }) {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  // Insurance state
  const [insurance, setInsurance] = useState({ provider: "", policyNumber: "", expiryDate: "", documentUrl: "" });
  const [insuranceSaving, setInsuranceSaving] = useState(false);
  const [insuranceLoaded, setInsuranceLoaded] = useState(false);

  // Waiver template state
  const [waiverTemplate, setWaiverTemplate] = useState(null);
  const [waiverContent, setWaiverContent] = useState("");
  const [waiverSaving, setWaiverSaving] = useState(false);
  const [showWaiverEditor, setShowWaiverEditor] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [issuingAuthority, setIssuingAuthority] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [renewalUrl, setRenewalUrl] = useState("");

  useEffect(() => {
    if (!guideId) return;
    loadLicenses();
  }, [guideId]);

  const loadLicenses = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("licenses")
        .select("*")
        .eq("guide_id", guideId)
        .order("expiry_date", { ascending: true });
      setLicenses(data || []);

      // Load insurance info
      const { data: guide } = await supabase
        .from("guides")
        .select("insurance_provider, insurance_policy_number, insurance_expiry_date, insurance_document_url, insurance_verified")
        .eq("id", guideId)
        .single();
      if (guide) {
        setInsurance({
          provider: guide.insurance_provider || "",
          policyNumber: guide.insurance_policy_number || "",
          expiryDate: guide.insurance_expiry_date || "",
          documentUrl: guide.insurance_document_url || "",
          verified: guide.insurance_verified || false,
        });
        setInsuranceLoaded(true);
      }

      // Load waiver template
      const { data: templates } = await supabase
        .from("waiver_templates")
        .select("*")
        .eq("guide_id", guideId)
        .eq("active", true)
        .limit(1);
      if (templates?.length > 0) {
        setWaiverTemplate(templates[0]);
        setWaiverContent(templates[0].content);
      }
    } catch (e) {
      console.error("License load error:", e);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setName(""); setLicenseNumber(""); setIssuingAuthority(""); setExpiryDate(""); setRenewalUrl("");
    setEditing(null); setShowForm(false);
  };

  const startEdit = (lic) => {
    setName(lic.name || "");
    setLicenseNumber(lic.license_number || "");
    setIssuingAuthority(lic.issuing_authority || "");
    setExpiryDate(lic.expiry_date || "");
    setRenewalUrl(lic.renewal_url || "");
    setEditing(lic.id);
    setShowForm(true);
  };

  const saveLicense = async () => {
    if (!name) return;
    setSaving(true);
    try {
      const supabase = getSupabase();
      const payload = {
        guide_id: guideId,
        name,
        license_number: licenseNumber || null,
        issuing_authority: issuingAuthority || null,
        expiry_date: expiryDate || null,
        renewal_url: renewalUrl || null,
        updated_at: new Date().toISOString(),
      };

      if (editing) {
        await supabase.from("licenses").update(payload).eq("id", editing);
      } else {
        await supabase.from("licenses").insert(payload);
      }
      await loadLicenses();
      resetForm();
    } catch (e) {
      console.error("Save license error:", e);
    }
    setSaving(false);
  };

  const deleteLicense = async (id) => {
    try {
      const supabase = getSupabase();
      await supabase.from("licenses").delete().eq("id", id);
      setLicenses(ls => ls.filter(l => l.id !== id));
    } catch (e) {
      console.error("Delete license error:", e);
    }
  };

  const saveInsurance = async () => {
    setInsuranceSaving(true);
    try {
      const supabase = getSupabase();
      await supabase.from("guides").update({
        insurance_provider: insurance.provider || null,
        insurance_policy_number: insurance.policyNumber || null,
        insurance_expiry_date: insurance.expiryDate || null,
        insurance_document_url: insurance.documentUrl || null,
      }).eq("id", guideId);
    } catch (e) { console.error("Insurance save error:", e); }
    setInsuranceSaving(false);
  };

  const saveWaiverTemplate = async () => {
    setWaiverSaving(true);
    try {
      const res = await fetch("/api/waivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideId,
          name: "Standard Liability Waiver",
          content: waiverContent,
          templateId: waiverTemplate?.id || undefined,
        }),
      });
      const data = await res.json();
      if (data.template) {
        setWaiverTemplate(data.template);
        setShowWaiverEditor(false);
      }
    } catch (e) { console.error("Waiver save error:", e); }
    setWaiverSaving(false);
  };

  // Expiry status helper
  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { label: "No expiry", color: T.muted, bg: T.lifted };
    const days = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: "EXPIRED", color: "#cc4444", bg: "rgba(204,68,68,0.15)" };
    if (days <= 7) return { label: `${days}d left`, color: "#cc4444", bg: "rgba(204,68,68,0.15)" };
    if (days <= 30) return { label: `${days}d left`, color: "#cc8844", bg: "rgba(204,136,68,0.15)" };
    if (days <= 60) return { label: `${days}d left`, color: T.gold, bg: T.goldGlow };
    return { label: `${days}d left`, color: T.green, bg: T.greenGlow };
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, height: 70, animation: "pulse 1.5s infinite" }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: T.white, fontWeight: 400 }}>Licenses & Certifications</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver, marginTop: 4 }}>Track your credentials and get expiry reminders.</div>
        </div>
        {!showForm && <GoldBtn small onClick={() => setShowForm(true)}>+ Add License</GoldBtn>}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: T.gold, marginBottom: 16 }}>
            {editing ? "Edit License" : "New License"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: T.ash, display: "block", marginBottom: 6 }}>License Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Montana Outfitter License"
                style={{ width: "100%", background: T.lifted, border: `1px solid ${T.rim}`, borderRadius: 6, padding: "10px 12px", fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, outline: "none" }} />
            </div>
            <div>
              <label style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: T.ash, display: "block", marginBottom: 6 }}>License Number</label>
              <input value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} placeholder="e.g. OUT-2024-1234"
                style={{ width: "100%", background: T.lifted, border: `1px solid ${T.rim}`, borderRadius: 6, padding: "10px 12px", fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, outline: "none" }} />
            </div>
            <div>
              <label style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: T.ash, display: "block", marginBottom: 6 }}>Issuing Authority</label>
              <input value={issuingAuthority} onChange={e => setIssuingAuthority(e.target.value)} placeholder="e.g. Montana FWP"
                style={{ width: "100%", background: T.lifted, border: `1px solid ${T.rim}`, borderRadius: 6, padding: "10px 12px", fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, outline: "none" }} />
            </div>
            <div>
              <label style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: T.ash, display: "block", marginBottom: 6 }}>Expiry Date</label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                style={{ width: "100%", background: T.lifted, border: `1px solid ${T.rim}`, borderRadius: 6, padding: "10px 12px", fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, outline: "none" }} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: T.ash, display: "block", marginBottom: 6 }}>Renewal URL (optional)</label>
            <input value={renewalUrl} onChange={e => setRenewalUrl(e.target.value)} placeholder="https://..."
              style={{ width: "100%", background: T.lifted, border: `1px solid ${T.rim}`, borderRadius: 6, padding: "10px 12px", fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, outline: "none" }} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <GoldBtn small onClick={saveLicense} disabled={saving || !name}>{saving ? "Saving…" : editing ? "Update" : "Save License"}</GoldBtn>
            <button onClick={resetForm} style={{ background: "none", border: `1px solid ${T.wire}`, borderRadius: 6, padding: "9px 20px", fontFamily: FONT_BODY, fontSize: 13, color: T.ash, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* License List */}
      {licenses.length === 0 && !showForm ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 10 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.silver, marginBottom: 8 }}>No licenses tracked</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.muted, marginBottom: 24 }}>Add your guide licenses, outfitter permits, and certifications. We'll remind you before they expire.</div>
          <GoldBtn small onClick={() => setShowForm(true)}>Add Your First License</GoldBtn>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {licenses.map(lic => {
            const status = getExpiryStatus(lic.expiry_date);
            return (
              <div key={lic.id} style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, color: T.parchment }}>{lic.name}</span>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: status.color, background: status.bg, borderRadius: 4, padding: "2px 8px" }}>{status.label}</span>
                  </div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.silver }}>
                    {lic.license_number && <span>#{lic.license_number}</span>}
                    {lic.issuing_authority && <span>{lic.license_number ? " · " : ""}{lic.issuing_authority}</span>}
                    {lic.expiry_date && <span> · Expires {new Date(lic.expiry_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {lic.renewal_url && (
                    <a href={lic.renewal_url} target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold, fontWeight: 600, textDecoration: "none", padding: "6px 12px", border: `1px solid ${T.gold}`, borderRadius: 5 }}>
                      Renew
                    </a>
                  )}
                  <button onClick={() => startEdit(lic)} style={{ background: "none", border: `1px solid ${T.wire}`, borderRadius: 5, padding: "6px 12px", fontFamily: FONT_BODY, fontSize: 12, color: T.ash, cursor: "pointer" }}>Edit</button>
                  <button onClick={() => deleteLicense(lic.id)} style={{ background: "none", border: `1px solid ${T.rim}`, borderRadius: 5, padding: "6px 12px", fontFamily: FONT_BODY, fontSize: 12, color: T.muted, cursor: "pointer" }}>×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── INSURANCE SECTION ── */}
      <div style={{ marginTop: 40 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.white, fontWeight: 400, marginBottom: 8 }}>Insurance</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver, marginBottom: 20 }}>Your liability insurance details. Verified guides get a badge on their profile.</div>

        <div style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 10, padding: 24 }}>
          {insurance.verified && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.greenGlow, border: `1px solid ${T.green}`, borderRadius: 4, padding: "4px 12px", marginBottom: 16 }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.green }}>✓ INSURANCE VERIFIED</span>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: T.ash, display: "block", marginBottom: 6 }}>Insurance Provider</label>
              <input value={insurance.provider} onChange={e => setInsurance(prev => ({ ...prev, provider: e.target.value }))} placeholder="e.g. State Farm, NICA"
                style={{ width: "100%", background: T.lifted, border: `1px solid ${T.rim}`, borderRadius: 6, padding: "10px 12px", fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, outline: "none" }} />
            </div>
            <div>
              <label style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: T.ash, display: "block", marginBottom: 6 }}>Policy Number</label>
              <input value={insurance.policyNumber} onChange={e => setInsurance(prev => ({ ...prev, policyNumber: e.target.value }))} placeholder="Policy #"
                style={{ width: "100%", background: T.lifted, border: `1px solid ${T.rim}`, borderRadius: 6, padding: "10px 12px", fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, outline: "none" }} />
            </div>
            <div>
              <label style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: T.ash, display: "block", marginBottom: 6 }}>Expiry Date</label>
              <input type="date" value={insurance.expiryDate} onChange={e => setInsurance(prev => ({ ...prev, expiryDate: e.target.value }))}
                style={{ width: "100%", background: T.lifted, border: `1px solid ${T.rim}`, borderRadius: 6, padding: "10px 12px", fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, outline: "none" }} />
            </div>
            <div>
              <label style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: T.ash, display: "block", marginBottom: 6 }}>Certificate URL (optional)</label>
              <input value={insurance.documentUrl} onChange={e => setInsurance(prev => ({ ...prev, documentUrl: e.target.value }))} placeholder="Link to your certificate"
                style={{ width: "100%", background: T.lifted, border: `1px solid ${T.rim}`, borderRadius: 6, padding: "10px 12px", fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, outline: "none" }} />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <GoldBtn small onClick={saveInsurance} disabled={insuranceSaving}>{insuranceSaving ? "Saving…" : "Save Insurance"}</GoldBtn>
          </div>
        </div>
      </div>

      {/* ── WAIVER TEMPLATE SECTION ── */}
      <div style={{ marginTop: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.white, fontWeight: 400 }}>Liability Waiver</div>
          {!showWaiverEditor && <GoldBtn small onClick={() => { setShowWaiverEditor(true); if (!waiverContent) setWaiverContent(DEFAULT_WAIVER_TEXT); }}>{waiverTemplate ? "Edit Waiver" : "Set Up Waiver"}</GoldBtn>}
        </div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver, marginBottom: 20 }}>Guests sign this before each trip. We include a standard template — customize it for your activity.</div>

        {waiverTemplate && !showWaiverEditor && (
          <div style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 10, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, color: T.parchment }}>{waiverTemplate.name}</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: T.green, background: T.greenGlow, borderRadius: 3, padding: "2px 8px" }}>ACTIVE</span>
              </div>
              <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>Updated {new Date(waiverTemplate.updated_at).toLocaleDateString()}</span>
            </div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, lineHeight: 1.6, maxHeight: 120, overflow: "hidden", whiteSpace: "pre-wrap" }}>{waiverTemplate.content.substring(0, 300)}…</div>
          </div>
        )}

        {showWaiverEditor && (
          <div style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 10, padding: 24 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver, marginBottom: 12 }}>Edit your waiver text below. Guests will see this before signing.</div>
            <textarea value={waiverContent} onChange={e => setWaiverContent(e.target.value)} rows={16}
              style={{ width: "100%", boxSizing: "border-box", background: T.lifted, border: `1px solid ${T.rim}`, borderRadius: 6, padding: "14px 16px", fontFamily: FONT_BODY, fontSize: 13, color: T.parchment, outline: "none", resize: "vertical", lineHeight: 1.7, marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <GoldBtn small onClick={saveWaiverTemplate} disabled={waiverSaving}>{waiverSaving ? "Saving…" : "Save Waiver"}</GoldBtn>
              <button onClick={() => setShowWaiverEditor(false)} style={{ background: "none", border: `1px solid ${T.wire}`, borderRadius: 6, padding: "9px 20px", fontFamily: FONT_BODY, fontSize: 13, color: T.ash, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}

        {!waiverTemplate && !showWaiverEditor && (
          <div style={{ textAlign: "center", padding: "40px 20px", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 10 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.muted, marginBottom: 16 }}>No waiver set up yet. We'll use a standard template until you customize one.</div>
            <GoldBtn small onClick={() => { setShowWaiverEditor(true); setWaiverContent(DEFAULT_WAIVER_TEXT); }}>Customize Waiver</GoldBtn>
          </div>
        )}
      </div>
    </div>
  );
}

const DEFAULT_WAIVER_TEXT = `ASSUMPTION OF RISK AND LIABILITY WAIVER

I, the undersigned participant, acknowledge and agree to the following:

1. ASSUMPTION OF RISK
I understand that outdoor adventure activities involve inherent risks including but not limited to: physical injury, property damage, exposure to weather, wildlife encounters, water hazards, uneven terrain, and other natural conditions. I voluntarily assume all risks associated with my participation.

2. RELEASE OF LIABILITY
I hereby release, waive, and discharge the guide, their business, RŌM Inc., and their respective officers, agents, and employees from any and all liability, claims, demands, or causes of action arising from my participation in the guided experience, except in cases of gross negligence or willful misconduct.

3. MEDICAL ACKNOWLEDGMENT
I confirm that I am physically capable of participating in the planned activity. I have disclosed any relevant medical conditions, allergies, or physical limitations.

4. MINOR PARTICIPANTS
If signing on behalf of a minor participant (under 18), I am their parent or legal guardian and accept these terms on their behalf.

5. PHOTO/VIDEO RELEASE
I grant the guide and RŌM permission to use photographs and video taken during the experience for promotional purposes, unless I opt out in writing before the trip.

6. CANCELLATION & WEATHER
Trips may be rescheduled due to unsafe conditions at the guide's discretion.

7. GOVERNING LAW
This waiver shall be governed by the laws of the state in which the activity takes place.

By signing below, I confirm that I have read and understand this waiver, that I am at least 18 years old (or signing as parent/guardian of a minor), and that I agree to all terms.`;
