"use client";
import { useState, useEffect, useMemo } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";
import { GoldBtn } from "@/app/components/ui";

// ─── GUEST CRM TAB ───────────────────────────────────────────────────────────
export default function GuestCRMTab({ guideId }) {
  const [guests, setGuests] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all, vip, recent, inactive
  const [sortBy, setSortBy] = useState("last_trip"); // last_trip, lifetime_value, trips
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [editNotes, setEditNotes] = useState("");
  const [editTags, setEditTags] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!guideId) return;
    loadData();
  }, [guideId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();

      // Fetch guest profiles for this guide
      const { data: guestData } = await supabase
        .from("guest_profiles")
        .select("*")
        .eq("guide_id", guideId)
        .order("last_trip_date", { ascending: false });

      // Fetch all bookings for this guide (for guest detail view)
      const { data: bookingData } = await supabase
        .from("bookings")
        .select("id, guest_id, guest_name, guest_email, trip_date, status, total_price, package_title")
        .eq("guide_id", guideId)
        .order("trip_date", { ascending: false });

      // Get guest names from profiles
      const profileIds = (guestData || []).map(g => g.profile_id).filter(Boolean);
      let profileMap = {};
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", profileIds);
        (profiles || []).forEach(p => { profileMap[p.id] = p; });
      }

      // Enrich guest data with profile info
      const enriched = (guestData || []).map(g => ({
        ...g,
        name: profileMap[g.profile_id]?.full_name || "Guest",
        email: profileMap[g.profile_id]?.email || "",
      }));

      setGuests(enriched);
      setBookings(bookingData || []);
    } catch (e) {
      console.error("CRM load error:", e);
    }
    setLoading(false);
  };

  // Filter and sort
  const filtered = useMemo(() => {
    let list = [...guests];

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(g =>
        (g.name || "").toLowerCase().includes(q) ||
        (g.email || "").toLowerCase().includes(q) ||
        (g.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    // Filter
    const now = new Date();
    if (filter === "vip") list = list.filter(g => g.vip);
    if (filter === "recent") list = list.filter(g => {
      if (!g.last_trip_date) return false;
      const diff = (now - new Date(g.last_trip_date)) / (1000 * 60 * 60 * 24);
      return diff <= 90;
    });
    if (filter === "inactive") list = list.filter(g => {
      if (!g.last_trip_date) return true;
      const diff = (now - new Date(g.last_trip_date)) / (1000 * 60 * 60 * 24);
      return diff > 180;
    });

    // Sort
    if (sortBy === "lifetime_value") list.sort((a, b) => (parseFloat(b.lifetime_value) || 0) - (parseFloat(a.lifetime_value) || 0));
    else if (sortBy === "trips") list.sort((a, b) => (b.total_trips || 0) - (a.total_trips || 0));
    else list.sort((a, b) => new Date(b.last_trip_date || 0) - new Date(a.last_trip_date || 0));

    return list;
  }, [guests, search, filter, sortBy]);

  const saveNotes = async () => {
    if (!selectedGuest) return;
    setSaving(true);
    try {
      const supabase = getSupabase();
      const tagsArr = editTags.split(",").map(t => t.trim()).filter(Boolean);
      await supabase
        .from("guest_profiles")
        .update({ notes: editNotes, tags: tagsArr })
        .eq("id", selectedGuest.id);
      setGuests(gs => gs.map(g => g.id === selectedGuest.id ? { ...g, notes: editNotes, tags: tagsArr } : g));
      setSelectedGuest(prev => ({ ...prev, notes: editNotes, tags: tagsArr }));
    } catch (e) {
      console.error("Save notes error:", e);
    }
    setSaving(false);
  };

  // Get bookings for a specific guest
  const guestBookings = useMemo(() => {
    if (!selectedGuest) return [];
    return bookings.filter(b => b.guest_id === selectedGuest.profile_id);
  }, [selectedGuest, bookings]);

  // Stats
  const totalGuests = guests.length;
  const vipCount = guests.filter(g => g.vip).length;
  const totalLTV = guests.reduce((sum, g) => sum + (parseFloat(g.lifetime_value) || 0), 0);
  const avgTrips = totalGuests > 0 ? (guests.reduce((sum, g) => sum + (g.total_trips || 0), 0) / totalGuests).toFixed(1) : "0";

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, height: 60, animation: "pulse 1.5s infinite" }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 20 }}>
      {/* Left — Guest List */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* KPI Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            ["Total Guests", totalGuests],
            ["VIP Clients", vipCount],
            ["Total Lifetime Value", `$${Math.round(totalLTV).toLocaleString()}`],
            ["Avg Trips / Guest", avgTrips],
          ].map(([label, value]) => (
            <div key={label} style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.white, fontWeight: 400 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search guests…"
            style={{ flex: 1, background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "10px 14px", fontFamily: FONT_BODY, fontSize: 14, color: T.parchment, outline: "none" }}
          />
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "10px 12px", fontFamily: FONT_BODY, fontSize: 13, color: T.ash, outline: "none" }}>
            <option value="all">All Guests</option>
            <option value="vip">VIP Only</option>
            <option value="recent">Active (90 days)</option>
            <option value="inactive">Inactive (180+ days)</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "10px 12px", fontFamily: FONT_BODY, fontSize: 13, color: T.ash, outline: "none" }}>
            <option value="last_trip">Last Trip</option>
            <option value="lifetime_value">Lifetime Value</option>
            <option value="trips">Total Trips</option>
          </select>
        </div>

        {/* Guest List */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.silver, marginBottom: 8 }}>
              {guests.length === 0 ? "No guests yet" : "No matches"}
            </div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.muted }}>
              {guests.length === 0 ? "Guest profiles are created automatically when trips are completed." : "Try adjusting your search or filters."}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map(g => {
              const isSelected = selectedGuest?.id === g.id;
              const daysSince = g.last_trip_date ? Math.round((new Date() - new Date(g.last_trip_date)) / (1000 * 60 * 60 * 24)) : null;
              return (
                <div key={g.id} onClick={() => {
                  setSelectedGuest(g);
                  setEditNotes(g.notes || "");
                  setEditTags((g.tags || []).join(", "));
                }}
                  style={{
                    background: isSelected ? T.lifted : T.steel,
                    border: `1px solid ${isSelected ? T.gold : T.wire}`,
                    borderRadius: 8, padding: "14px 18px", cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    transition: "all 0.12s",
                  }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: g.vip ? T.goldGlow : T.lifted,
                      border: `1px solid ${g.vip ? T.gold : T.wire}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: FONT_DISPLAY, fontSize: 16, color: g.vip ? T.gold : T.ash, flexShrink: 0,
                    }}>
                      {(g.name || "G")[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, color: T.parchment }}>{g.name}</span>
                        {g.vip && <span style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: T.ink, background: T.gold, borderRadius: 3, padding: "2px 6px" }}>VIP</span>}
                      </div>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.silver }}>
                        {g.total_trips || 0} trip{(g.total_trips || 0) !== 1 ? "s" : ""} · ${Math.round(parseFloat(g.lifetime_value) || 0).toLocaleString()}
                        {daysSince !== null && <span style={{ color: T.muted }}> · {daysSince < 30 ? `${daysSince}d ago` : daysSince < 365 ? `${Math.round(daysSince / 30)}mo ago` : `${Math.round(daysSince / 365)}yr ago`}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {(g.tags || []).slice(0, 2).map(tag => (
                      <span key={tag} style={{ fontFamily: FONT_BODY, fontSize: 10, color: T.ash, background: T.lifted, border: `1px solid ${T.rim}`, borderRadius: 4, padding: "2px 8px" }}>{tag}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right — Guest Detail */}
      {selectedGuest && (
        <div style={{ width: 360, flexShrink: 0 }}>
          <div style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 10, overflow: "hidden", position: "sticky", top: 84 }}>
            {/* Header */}
            <div style={{ padding: "24px 20px", borderBottom: `1px solid ${T.wire}`, textAlign: "center" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", margin: "0 auto 12px",
                background: selectedGuest.vip ? T.goldGlow : T.lifted,
                border: `2px solid ${selectedGuest.vip ? T.gold : T.wire}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: FONT_DISPLAY, fontSize: 22, color: selectedGuest.vip ? T.gold : T.ash,
              }}>
                {(selectedGuest.name || "G")[0].toUpperCase()}
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.white, marginBottom: 4 }}>{selectedGuest.name}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.silver }}>{selectedGuest.email}</div>
              {selectedGuest.vip && (
                <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, background: T.goldGlow, border: `1px solid ${T.gold}`, borderRadius: 4, padding: "4px 10px" }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.gold }}>✦ VIP CLIENT</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: `1px solid ${T.wire}` }}>
              {[
                ["Trips", selectedGuest.total_trips || 0],
                ["Lifetime", `$${Math.round(parseFloat(selectedGuest.lifetime_value) || 0).toLocaleString()}`],
                ["First Trip", selectedGuest.first_trip_date ? new Date(selectedGuest.first_trip_date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }) : "—"],
              ].map(([label, value], i) => (
                <div key={label} style={{ padding: "14px 12px", textAlign: "center", borderRight: i < 2 ? `1px solid ${T.wire}` : "none" }}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: T.white }}>{value}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Booking History */}
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.wire}` }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Booking History</div>
              {guestBookings.length === 0 ? (
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>No bookings found</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
                  {guestBookings.map(b => (
                    <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: T.lifted, borderRadius: 6 }}>
                      <div>
                        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.parchment }}>{b.package_title || "Trip"}</div>
                        <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted }}>{new Date(b.trip_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold, fontWeight: 600 }}>${b.total_price || 0}</span>
                        <span style={{
                          fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3,
                          background: b.status === "completed" ? T.greenGlow : b.status === "confirmed" ? T.blueGlow : b.status === "cancelled" ? T.redGlow : T.lifted,
                          color: b.status === "completed" ? T.green : b.status === "confirmed" ? T.blue : b.status === "cancelled" ? T.red : T.muted,
                        }}>{b.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes + Tags */}
            <div style={{ padding: "16px 20px" }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Notes</div>
              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} placeholder="Add notes about this guest…"
                style={{ width: "100%", boxSizing: "border-box", background: T.lifted, border: `1px solid ${T.rim}`, borderRadius: 6, padding: "10px 12px", fontFamily: FONT_BODY, fontSize: 13, color: T.parchment, outline: "none", resize: "vertical", marginBottom: 12 }} />

              <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Tags</div>
              <input value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="e.g. fly fishing, repeat, VIP"
                style={{ width: "100%", boxSizing: "border-box", background: T.lifted, border: `1px solid ${T.rim}`, borderRadius: 6, padding: "10px 12px", fontFamily: FONT_BODY, fontSize: 13, color: T.parchment, outline: "none", marginBottom: 14 }} />

              <GoldBtn small full onClick={saveNotes} disabled={saving}>{saving ? "Saving…" : "Save Notes"}</GoldBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
