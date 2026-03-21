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
    </div>
  );
}
