"use client";
import { useState, useEffect } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";
import { SectionCard, SectionHeader } from "@/app/components/ui";

export default function AnalyticsTab({ guide }) {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guide?.id) return;
    const supabase = getSupabase();
    supabase
      .from("guide_analytics")
      .select("event_type, created_at")
      .eq("guide_id", guide.id)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setAnalytics(data || []);
        setLoading(false);
      });
  }, [guide?.id]);

  const profileViews = analytics.filter(a => a.event_type === "profile_view").length;
  const searchImpressions = analytics.filter(a => a.event_type === "search_impression").length;
  const bookingsStarted = analytics.filter(a => a.event_type === "booking_started").length;
  const bookingsCompleted = analytics.filter(a => a.event_type === "booking_completed").length;
  const messagesReceived = analytics.filter(a => a.event_type === "message_received").length;
  const conversionRate = profileViews > 0 ? Math.round((bookingsCompleted / profileViews) * 100) : 0;

  // Group views by day for chart
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split("T")[0];
  });

  const viewsByDay = last14Days.map(day => ({
    day: day.slice(5), // MM-DD
    views: analytics.filter(a => a.event_type === "profile_view" && a.created_at?.startsWith(day)).length,
  }));

  const maxViews = Math.max(...viewsByDay.map(d => d.views), 1);

  const funnel = [
    { label: "Search Impressions", value: searchImpressions, pct: 100 },
    { label: "Profile Views", value: profileViews, pct: searchImpressions > 0 ? Math.round((profileViews / searchImpressions) * 100) : 0 },
    { label: "Messages", value: messagesReceived, pct: profileViews > 0 ? Math.round((messagesReceived / profileViews) * 100) : 0 },
    { label: "Bookings Started", value: bookingsStarted, pct: profileViews > 0 ? Math.round((bookingsStarted / profileViews) * 100) : 0 },
    { label: "Bookings Completed", value: bookingsCompleted, pct: profileViews > 0 ? Math.round((bookingsCompleted / profileViews) * 100) : 0 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
        {[
          { label: "Profile Views", value: profileViews, sub: "last 30 days" },
          { label: "Search Impressions", value: searchImpressions, sub: "last 30 days" },
          { label: "Conversion Rate", value: `${conversionRate}%`, sub: "view → booking" },
          { label: "Messages", value: messagesReceived, sub: "last 30 days" },
        ].map(k => (
          <SectionCard key={k.label}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em" }}>{k.label}</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: T.white, marginTop: 4 }}>{k.value}</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted, marginTop: 2 }}>{k.sub}</div>
          </SectionCard>
        ))}
      </div>

      {/* Views Chart */}
      <SectionCard>
        <SectionHeader>Profile Views (14 days)</SectionHeader>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120 }}>
          {viewsByDay.map((d, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: "100%", maxWidth: 32,
                height: Math.max(4, (d.views / maxViews) * 100),
                background: d.views > 0 ? T.gold : T.rim,
                borderRadius: 3,
                transition: "height 0.3s",
              }} />
              <span style={{ fontFamily: FONT_BODY, fontSize: 9, color: T.muted }}>{d.day}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Conversion Funnel */}
      <SectionCard>
        <SectionHeader>Conversion Funnel</SectionHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {funnel.map((step, i) => (
            <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, minWidth: 160 }}>{step.label}</div>
              <div style={{ flex: 1, height: 24, background: T.lifted, borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  width: `${Math.max(step.pct, 2)}%`,
                  height: "100%",
                  background: i === funnel.length - 1 ? T.gold : T.wire,
                  borderRadius: 4,
                  transition: "width 0.5s",
                }} />
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: T.white, minWidth: 40, textAlign: "right" }}>{step.value}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      {analytics.length === 0 && !loading && (
        <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.muted, textAlign: "center", padding: 32 }}>
          Analytics data will appear as guests view your profile and interact with your packages.
        </div>
      )}
    </div>
  );
}
