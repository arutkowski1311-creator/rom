"use client";
import { useState, useEffect, useMemo } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";
import { SectionCard, SectionHeader } from "@/app/components/ui";

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
const GOLD = "#c9973a";
const GREEN = "#4ade80";
const RED = "#e74c3c";
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const PRICE_BRACKETS = [
  { label: "$0–100", min: 0, max: 100 },
  { label: "$100–200", min: 100, max: 200 },
  { label: "$200–300", min: 200, max: 300 },
  { label: "$300–500", min: 300, max: 500 },
  { label: "$500+", min: 500, max: Infinity },
];
const DURATION_BUCKETS = [
  { label: "Half-day (≤4 hrs)", min: 0, max: 4 },
  { label: "Full day (4–8 hrs)", min: 4, max: 8 },
  { label: "Multi-day (8+ hrs)", min: 8, max: Infinity },
];
const EXPENSE_COLORS = {
  fuel: "#e0b050", gear: "#6a9ada", food: "#4ade80", insurance: "#a08ada",
  maintenance: "#e06050", permits: "#50c0c0", marketing: "#da6a9a",
  lodging: "#c09050", mileage: "#8a96a0", other: "#5a6470",
};

// ─── HELPERS ────────────────────────────────────────────────────────────────
const fmt = (n) => {
  if (n == null || isNaN(n)) return "$0";
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`;
};
const fmtFull = (n) => {
  if (n == null || isNaN(n)) return "$0";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};
const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);
const parseDuration = (dur) => {
  if (!dur) return 0;
  const s = String(dur).toLowerCase();
  const nums = s.match(/[\d.]+/);
  const hours = nums ? parseFloat(nums[0]) : 0;
  if (s.includes("day")) return hours * 8;
  return hours;
};
const arrow = (val) => val > 0 ? "▲" : val < 0 ? "▼" : "—";
const trendColor = (val) => val > 0 ? GREEN : val < 0 ? RED : T.muted;

// ─── SKELETON ───────────────────────────────────────────────────────────────
function LoadingSkeleton() {
  const bar = (w, h = 16) => (
    <div style={{
      width: w, height: h, borderRadius: 4,
      background: `linear-gradient(90deg, ${T.lifted} 25%, ${T.rim} 50%, ${T.lifted} 75%)`,
      backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite",
    }} />
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <SectionCard key={i}>
            {bar("60%", 12)}
            <div style={{ marginTop: 12 }}>{bar("40%", 28)}</div>
            <div style={{ marginTop: 8 }}>{bar("50%", 12)}</div>
          </SectionCard>
        ))}
      </div>
      <SectionCard>{bar("100%", 200)}</SectionCard>
      <SectionCard>{bar("100%", 160)}</SectionCard>
    </div>
  );
}

// ─── EMPTY STATE ────────────────────────────────────────────────────────────
function EmptyState({ label }) {
  return (
    <div style={{
      fontFamily: FONT_BODY, fontSize: 14, color: T.muted,
      textAlign: "center", padding: "32px 16px",
      border: `1px dashed ${T.rim}`, borderRadius: 8,
    }}>
      Not enough data yet — {label}
    </div>
  );
}

// ─── KPI CARD ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, trend, trendLabel }) {
  return (
    <SectionCard>
      <div style={{
        fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700,
        color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em",
      }}>{label}</div>
      <div style={{
        fontFamily: FONT_DISPLAY, fontSize: 28, color: GOLD,
        marginTop: 6, lineHeight: 1,
      }}>{value}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
        {trend != null && (
          <span style={{
            fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700,
            color: trendColor(trend),
          }}>
            {arrow(trend)} {Math.abs(trend)}%
          </span>
        )}
        <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>{trendLabel || sub}</span>
      </div>
    </SectionCard>
  );
}

// ─── INSIGHT BOX ────────────────────────────────────────────────────────────
function Insight({ text }) {
  if (!text) return null;
  return (
    <div style={{
      fontFamily: FONT_BODY, fontSize: 13, color: T.ash,
      background: T.lifted, borderLeft: `3px solid ${GOLD}`,
      padding: "12px 16px", borderRadius: "0 6px 6px 0", marginTop: 16,
      lineHeight: 1.5,
    }}>
      {text}
    </div>
  );
}

// ─── RECOMMENDATION CARD ───────────────────────────────────────────────────
const REC_COLORS = { opportunity: GOLD, warning: RED, tip: "#5b9bd5" };

function RecommendationCard({ icon, title, body, type }) {
  const borderColor = REC_COLORS[type] || GOLD;
  return (
    <div style={{
      display: "flex", gap: 14, padding: "16px 18px",
      background: T.lifted, borderRadius: 8,
      borderLeft: `4px solid ${borderColor}`,
      border: `1px solid ${T.rim}`,
      borderLeftColor: borderColor, borderLeftWidth: 4,
    }}>
      <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700,
          color: T.white, lineHeight: 1.3, marginBottom: 4,
        }}>{title}</div>
        <div style={{
          fontFamily: FONT_BODY, fontSize: 13, color: T.muted,
          lineHeight: 1.55,
        }}>{body}</div>
      </div>
    </div>
  );
}

// ─── RECOMMENDATION ENGINE ─────────────────────────────────────────────────
function generateRecommendations(data) {
  if (!data || !data.hasBookings) return [];
  const recs = [];

  const {
    kpis, bracketData, pkgPerf, monthlyRevenue, peakMonth,
    timeEfficiency, durationBuckets, expenseCategories,
    costPerTrip, mileageDeductions, totalExpenses,
    tripsWithNoExpenses, completedCount, recentBookingTrend,
    currentMonthIdx, nextMonthIdx,
  } = data;

  // ── PRICING ──────────────────────────────────────────────────────────────
  // Sweet-spot price bracket
  const bracketsWithConversion = bracketData.filter(b => b.count >= 3 && b.conversion != null && b.conversion > 0);
  if (bracketsWithConversion.length >= 2) {
    const avgConv = bracketsWithConversion.reduce((s, b) => s + b.conversion, 0) / bracketsWithConversion.length;
    const sweet = bracketsWithConversion.find(b => b.conversion > avgConv * 1.4);
    if (sweet) {
      recs.push({
        icon: "\u{1F4B0}", title: "Your pricing sweet spot",
        body: `Your ${sweet.label} packages are your sweet spot \u2014 they convert ${Math.round(((sweet.conversion - avgConv) / avgConv) * 100)}% better than your average. Consider adding more packages in this range.`,
        type: "opportunity", priority: 9,
      });
    }
  }

  // Highest-revenue vs highest $/hour package
  if (pkgPerf.length >= 2) {
    const byRevenue = [...pkgPerf].sort((a, b) => b.revenue - a.revenue);
    const topRev = byRevenue[0];
    const topPerHour = pkgPerf[0]; // already sorted by perHour
    if (topRev.id !== topPerHour.id && topPerHour.perHour > topRev.perHour && topRev.bookings >= 3 && topPerHour.bookings >= 3) {
      const diff = Math.round(topPerHour.perHour - (topRev.revenue / (topRev.bookings * (topRev.revenue / topRev.perHour / topRev.bookings || 4))));
      recs.push({
        icon: "\u{1F4B0}", title: "Maximize your hourly rate",
        body: `Your "${topRev.title}" generates the most revenue, but "${topPerHour.title}" earns ${fmtFull(Math.round(topPerHour.perHour - topRev.perHour))} more per hour. Shifting more availability to "${topPerHour.title}" could boost your hourly rate.`,
        type: "opportunity", priority: 8,
      });
    }
  }

  // ── SEASONALITY ──────────────────────────────────────────────────────────
  const peakRevenue = peakMonth.current;
  const currentMonthRev = monthlyRevenue[currentMonthIdx]?.current || 0;
  if (peakRevenue > 0 && currentMonthRev < peakRevenue * 0.7 && completedCount >= 5) {
    const pctBelow = Math.round(((peakRevenue - currentMonthRev) / peakRevenue) * 100);
    recs.push({
      icon: "\u{1F321}\uFE0F", title: "Boost your off-peak bookings",
      body: `Your peak season is ${MONTHS[peakMonth.month]} \u2014 you're currently ${pctBelow}% below that. Consider a limited-time offer to boost bookings this month.`,
      type: "tip", priority: 6,
    });
  }

  // Next month is historically best
  const nextMonthRev = monthlyRevenue[nextMonthIdx];
  const isNextMonthPeak = nextMonthRev && monthlyRevenue.every(m => nextMonthRev.current >= m.current || m.month === nextMonthIdx);
  const nextMonthPrevYear = nextMonthRev?.previous || 0;
  if (nextMonthPrevYear > 0 && monthlyRevenue.every(m => nextMonthPrevYear >= (m.previous || 0))) {
    recs.push({
      icon: "\u{1F321}\uFE0F", title: `${MONTHS[nextMonthIdx]} is your peak season`,
      body: `${MONTHS[nextMonthIdx]} is historically your strongest month. Make sure your availability is wide open and packages are updated.`,
      type: "tip", priority: 7,
    });
  }

  // ── TIME EFFICIENCY ──────────────────────────────────────────────────────
  const wePerHr = timeEfficiency.weekend.avgPerHour;
  const wdPerHr = timeEfficiency.weekday.avgPerHour;
  if (timeEfficiency.weekend.count >= 3 && timeEfficiency.weekday.count >= 3) {
    if (wePerHr > wdPerHr * 1.25) {
      const diff = Math.round(wePerHr - wdPerHr);
      const estBoost = Math.round(diff * 4 * 4); // ~4 extra weekend trips/mo, 4hrs each
      recs.push({
        icon: "\u23F0", title: "Weekends are your money maker",
        body: `Weekend trips earn you ${fmtFull(diff)}/hr more than weekdays. If you can shift more availability to weekends, you'd earn an estimated ${fmtFull(estBoost)} more per month.`,
        type: "opportunity", priority: 8,
      });
    } else if (wdPerHr > wePerHr * 1.25) {
      const diff = Math.round(wdPerHr - wePerHr);
      const estBoost = Math.round(diff * 4 * 4);
      recs.push({
        icon: "\u23F0", title: "Weekdays are surprisingly strong",
        body: `Weekday trips earn you ${fmtFull(diff)}/hr more than weekends. Consider opening more weekday slots to maximize your earnings.`,
        type: "opportunity", priority: 7,
      });
    }
  }

  // Half-day vs full-day efficiency
  const halfDay = durationBuckets.find(b => b.label.toLowerCase().includes("half"));
  const fullDay = durationBuckets.find(b => b.label.toLowerCase().includes("full day"));
  if (halfDay && fullDay && halfDay.count >= 3 && fullDay.count >= 3) {
    if (halfDay.avgPerHour > fullDay.avgPerHour * 1.15) {
      const pctMore = Math.round(((halfDay.avgPerHour - fullDay.avgPerHour) / fullDay.avgPerHour) * 100);
      recs.push({
        icon: "\u23F0", title: "Half-day trips are more efficient",
        body: `Your half-day trips earn ${fmtFull(Math.round(halfDay.avgPerHour))}/hr \u2014 that's ${pctMore}% more efficient than full-day trips. Adding more half-day options could maximize your time.`,
        type: "tip", priority: 6,
      });
    } else if (fullDay.avgPerHour > halfDay.avgPerHour * 1.15) {
      recs.push({
        icon: "\u23F0", title: "Full-day trips are your most efficient",
        body: `Your full-day trips are your most efficient \u2014 ${fmtFull(Math.round(fullDay.avgPerHour))}/hr. Consider promoting these as your signature experience.`,
        type: "tip", priority: 6,
      });
    }
  }

  // ── CONVERSION ───────────────────────────────────────────────────────────
  if (completedCount >= 10) {
    if (kpis.conversionRate < 5 && kpis.conversionRate > 0) {
      recs.push({
        icon: "\u{1F4CA}", title: "Your profile isn't converting",
        body: `Your profile is getting views but only converting at ${kpis.conversionRate}%. Consider updating your photos, adding a video, or adjusting your pricing.`,
        type: "warning", priority: 9,
      });
    }
  }

  if (data.conversionDrop != null && data.conversionDrop > 0 && completedCount >= 10) {
    recs.push({
      icon: "\u{1F4CA}", title: "Conversion rate is slipping",
      body: `Your conversion rate dropped ${data.conversionDrop}% this period. Check if a competitor added new packages or if your response time has slowed.`,
      type: "warning", priority: 8,
    });
  }

  // ── EXPENSES ─────────────────────────────────────────────────────────────
  if (kpis.avgTripValue > 0 && costPerTrip > kpis.avgTripValue * 0.3 && completedCount >= 5) {
    const pctOfRev = Math.round((costPerTrip / kpis.avgTripValue) * 100);
    const topCat = expenseCategories[0];
    recs.push({
      icon: "\u{1F4CB}", title: "Your costs are eating into profits",
      body: `Your average cost per trip is ${fmtFull(Math.round(costPerTrip))} \u2014 that's ${pctOfRev}% of your trip revenue.${topCat ? ` Look for ways to reduce ${topCat.category} spending.` : ""}`,
      type: "warning", priority: 7,
    });
  }

  if (tripsWithNoExpenses > 0 && completedCount >= 5) {
    recs.push({
      icon: "\u{1F4CB}", title: "Log your trip expenses",
      body: `You have ${tripsWithNoExpenses} trip${tripsWithNoExpenses > 1 ? "s" : ""} in the last 30 days with no expenses logged. Linking expenses to trips improves your tax deductions and gives you accurate profitability data.`,
      type: "tip", priority: 5,
    });
  }

  if (mileageDeductions > 0) {
    recs.push({
      icon: "\u{1F4CB}", title: "Keep tracking your mileage",
      body: `Your mileage deductions saved you ${fmtFull(Math.round(mileageDeductions))} this year. Make sure you're tracking every business drive.`,
      type: "tip", priority: 4,
    });
  }

  // ── GROWTH ───────────────────────────────────────────────────────────────
  if (kpis.repeatRate > 30 && completedCount >= 5) {
    recs.push({
      icon: "\u{1F4C8}", title: "Your repeat clients love you",
      body: `${kpis.repeatRate}% of your clients are repeat bookers \u2014 that's exceptional. Consider a "returning guest" discount to encourage even more rebooking.`,
      type: "opportunity", priority: 7,
    });
  } else if (kpis.repeatRate < 15 && completedCount >= 10) {
    recs.push({
      icon: "\u{1F4C8}", title: "Boost your rebooking rate",
      body: `Only ${kpis.repeatRate}% of your clients rebook. Try sending a follow-up message 2 weeks after each trip offering a discount on their next experience.`,
      type: "tip", priority: 6,
    });
  }

  if (recentBookingTrend != null && recentBookingTrend > 0 && completedCount >= 5) {
    recs.push({
      icon: "\u{1F4C8}", title: "You're on a roll",
      body: `Your bookings are up ${recentBookingTrend}% over the last 90 days. You're building momentum \u2014 keep your calendar updated.`,
      type: "opportunity", priority: 5,
    });
  }

  // Sort by priority (highest first), remove contradictions, cap at 5
  recs.sort((a, b) => b.priority - a.priority);

  // Remove contradictions: don't show both half-day and full-day recs
  const seen = new Set();
  const filtered = recs.filter(r => {
    const key = `${r.icon}-${r.title.split(" ")[0]}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return filtered.slice(0, 5);
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function AnalyticsTab({ guide }) {
  const [bookings, setBookings] = useState(null);
  const [packages, setPackages] = useState(null);
  const [payments, setPayments] = useState(null);
  const [expenses, setExpenses] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // ─── FETCH ALL DATA ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!guide?.id) return;
    const supabase = getSupabase();
    Promise.all([
      supabase.from("bookings").select("*").eq("guide_id", guide.id),
      supabase.from("packages").select("*").eq("guide_id", guide.id),
      supabase.from("payments").select("*").eq("guide_id", guide.id),
      supabase.from("expenses").select("*").eq("guide_id", guide.id),
      supabase.from("guide_analytics").select("event_type, created_at, metadata")
        .eq("guide_id", guide.id),
    ]).then(([bk, pk, pa, ex, an]) => {
      setBookings(bk.data || []);
      setPackages(pk.data || []);
      setPayments(pa.data || []);
      setExpenses(ex.data || []);
      setAnalytics(an.data || []);
      setLoading(false);
    });
  }, [guide?.id]);

  // ─── COMPUTED DATA ────────────────────────────────────────────────────────
  const data = useMemo(() => {
    if (!bookings || !packages || !payments || !expenses || !analytics) return null;

    const now = new Date();
    const year = now.getFullYear();
    const yearStart = new Date(year, 0, 1);
    const prevYear = year - 1;

    // ── Package map ─────────────────────────────────────────────────────────
    const pkgMap = {};
    packages.forEach(p => { pkgMap[p.id] = p; });

    // ── Booking enrichment ──────────────────────────────────────────────────
    const enriched = bookings.map(b => {
      const pkg = pkgMap[b.package_id] || {};
      const tripDate = new Date(b.trip_date);
      const duration = parseDuration(pkg.duration);
      return {
        ...b,
        tripDate,
        total: parseFloat(b.total) || 0,
        guests: parseInt(b.guests) || 1,
        duration,
        pkgPrice: parseFloat(pkg.price) || 0,
        pkgTitle: b.package_title || pkg.title || "Package",
        dayOfWeek: tripDate.getDay(),
        month: tripDate.getMonth(),
        year: tripDate.getFullYear(),
        isWeekend: tripDate.getDay() === 0 || tripDate.getDay() === 6,
      };
    });

    const completed = enriched.filter(b => b.status === "completed");
    const confirmed = enriched.filter(b => b.status === "confirmed");
    const completedYTD = completed.filter(b => b.year === year);
    const completedPrevYTD = completed.filter(b => b.year === prevYear);

    // ── KPIs ────────────────────────────────────────────────────────────────
    const totalRevenueYTD = completedYTD.reduce((s, b) => s + b.total, 0);
    const totalRevenuePrevYTD = completedPrevYTD.reduce((s, b) => s + b.total, 0);

    const totalExpenses = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const expensesYTD = expenses
      .filter(e => new Date(e.date) >= yearStart)
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

    const netProfit = totalRevenueYTD - expensesYTD;
    const profitMargin = pct(netProfit, totalRevenueYTD);

    const avgTripValue = completedYTD.length > 0
      ? totalRevenueYTD / completedYTD.length : 0;

    const totalHoursYTD = completedYTD.reduce((s, b) => s + (b.duration || 4), 0);
    const avgRevenuePerHour = totalHoursYTD > 0 ? totalRevenueYTD / totalHoursYTD : 0;

    // Profile view → booking conversion
    const profileViews = analytics.filter(a => a.event_type === "profile_view").length;
    const bookingsCompleted = analytics.filter(a => a.event_type === "booking_completed").length;
    const conversionRate = pct(bookingsCompleted, profileViews);

    // Repeat client rate
    const guestBookingCount = {};
    completed.forEach(b => {
      const key = b.guest_id || b.guest_name || "unknown";
      guestBookingCount[key] = (guestBookingCount[key] || 0) + 1;
    });
    const uniqueGuests = Object.keys(guestBookingCount).length;
    const repeatGuests = Object.values(guestBookingCount).filter(c => c >= 2).length;
    const repeatRate = pct(repeatGuests, uniqueGuests);

    // YoY revenue growth
    const yoyGrowth = totalRevenuePrevYTD > 0
      ? Math.round(((totalRevenueYTD - totalRevenuePrevYTD) / totalRevenuePrevYTD) * 100) : null;

    // ── Monthly revenue (current + previous year) ───────────────────────────
    const monthlyRevenue = Array.from({ length: 12 }, (_, m) => ({
      month: m,
      current: completedYTD.filter(b => b.month === m).reduce((s, b) => s + b.total, 0),
      previous: completedPrevYTD.filter(b => b.month === m).reduce((s, b) => s + b.total, 0),
    }));
    const maxMonthlyRev = Math.max(...monthlyRevenue.map(m => Math.max(m.current, m.previous)), 1);
    const peakMonth = monthlyRevenue.reduce((best, m) => m.current > best.current ? m : best, monthlyRevenue[0]);
    const slowMonth = monthlyRevenue
      .filter(m => m.month <= now.getMonth())
      .reduce((worst, m) => m.current < worst.current ? m : worst, monthlyRevenue[0]);

    // ── Package performance ─────────────────────────────────────────────────
    const pkgPerf = packages.map(pkg => {
      const pkgBookings = completed.filter(b => b.package_id === pkg.id);
      const last90 = pkgBookings.filter(b => b.tripDate >= new Date(now - 90 * 86400000));
      const prior90 = pkgBookings.filter(b => {
        const t = b.tripDate.getTime();
        return t >= now - 180 * 86400000 && t < now - 90 * 86400000;
      });
      const rev = pkgBookings.reduce((s, b) => s + b.total, 0);
      const dur = parseDuration(pkg.duration) || 4;
      const totalHrs = pkgBookings.length * dur;
      const avgGroup = pkgBookings.length > 0
        ? Math.round(pkgBookings.reduce((s, b) => s + b.guests, 0) / pkgBookings.length * 10) / 10 : 0;
      const perHour = totalHrs > 0 ? rev / totalHrs : 0;
      const expensesForPkg = expenses
        .filter(e => pkgBookings.some(b => b.id === e.booking_id))
        .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
      const margin = pct(rev - expensesForPkg, rev);
      const trend = prior90.length > 0
        ? Math.round(((last90.length - prior90.length) / prior90.length) * 100) : (last90.length > 0 ? 100 : 0);

      return {
        id: pkg.id, title: pkg.title || "Untitled",
        bookings: pkgBookings.length, revenue: rev,
        avgGroup, perHour, margin, trend,
      };
    }).sort((a, b) => b.perHour - a.perHour);

    // ── Demand & Pricing Intelligence ───────────────────────────────────────
    const bracketData = PRICE_BRACKETS.map(br => {
      const matched = completed.filter(b => b.pkgPrice >= br.min && b.pkgPrice < br.max);
      const views = analytics.filter(a => {
        if (a.event_type !== "profile_view") return false;
        return true; // no per-package view data, so use total
      }).length;
      const starts = analytics.filter(a => a.event_type === "booking_started").length;
      return {
        ...br,
        count: matched.length,
        revenue: matched.reduce((s, b) => s + b.total, 0),
        conversion: starts > 0 ? pct(matched.length, starts) : null,
      };
    });
    const bestBracket = bracketData.reduce((best, b) =>
      b.revenue > best.revenue ? b : best, bracketData[0]);

    // ── Time efficiency ─────────────────────────────────────────────────────
    const weekendTrips = completed.filter(b => b.isWeekend);
    const weekdayTrips = completed.filter(b => !b.isWeekend);

    const timeEfficiency = {
      weekend: {
        count: weekendTrips.length,
        avgTrip: weekendTrips.length > 0
          ? weekendTrips.reduce((s, b) => s + b.total, 0) / weekendTrips.length : 0,
        avgPerHour: weekendTrips.length > 0
          ? weekendTrips.reduce((s, b) => s + b.total, 0) / weekendTrips.reduce((s, b) => s + (b.duration || 4), 0) : 0,
      },
      weekday: {
        count: weekdayTrips.length,
        avgTrip: weekdayTrips.length > 0
          ? weekdayTrips.reduce((s, b) => s + b.total, 0) / weekdayTrips.length : 0,
        avgPerHour: weekdayTrips.length > 0
          ? weekdayTrips.reduce((s, b) => s + b.total, 0) / weekdayTrips.reduce((s, b) => s + (b.duration || 4), 0) : 0,
      },
    };

    const durationBuckets = DURATION_BUCKETS.map(bucket => {
      const matched = completed.filter(b => b.duration > bucket.min && b.duration <= bucket.max);
      // first bucket: 0 to 4 inclusive
      const matchedAdj = bucket.min === 0
        ? completed.filter(b => b.duration > 0 && b.duration <= bucket.max)
        : matched;
      const rev = matchedAdj.reduce((s, b) => s + b.total, 0);
      const hrs = matchedAdj.reduce((s, b) => s + (b.duration || 4), 0);
      return {
        ...bucket,
        count: matchedAdj.length,
        revenue: rev,
        avgPerHour: hrs > 0 ? rev / hrs : 0,
      };
    });

    // Day × time heatmap (simplified: day of week → avg revenue)
    const dayRevenue = Array.from({ length: 7 }, (_, d) => {
      const dayTrips = completed.filter(b => b.dayOfWeek === d);
      const rev = dayTrips.reduce((s, b) => s + b.total, 0);
      const hrs = dayTrips.reduce((s, b) => s + (b.duration || 4), 0);
      return { day: d, trips: dayTrips.length, avgPerHour: hrs > 0 ? rev / hrs : 0 };
    });
    const maxDayRate = Math.max(...dayRevenue.map(d => d.avgPerHour), 1);

    // Best time insight
    const bestDuration = durationBuckets.reduce((best, b) =>
      b.avgPerHour > best.avgPerHour ? b : best, durationBuckets[0]);
    const bestTimeSlot = timeEfficiency.weekend.avgPerHour > timeEfficiency.weekday.avgPerHour
      ? "weekend" : "weekday";

    // ── Expense breakdown ───────────────────────────────────────────────────
    const expenseByCategory = {};
    let mileageDeductions = 0;
    expenses.forEach(e => {
      const cat = (e.category || "other").toLowerCase();
      const amt = parseFloat(e.amount) || 0;
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + amt;
      if (e.mileage && parseFloat(e.mileage) > 0) {
        mileageDeductions += parseFloat(e.mileage) * (parseFloat(e.mileage_rate) || 0.70);
      }
    });
    const expenseCategories = Object.entries(expenseByCategory)
      .map(([cat, amt]) => ({ category: cat, amount: amt, pctOfRevenue: pct(amt, totalRevenueYTD) }))
      .sort((a, b) => b.amount - a.amount);
    const maxExpense = Math.max(...expenseCategories.map(e => e.amount), 1);
    const costPerTrip = completedYTD.length > 0 ? totalExpenses / completedYTD.length : 0;

    // ── 90-day forecast ─────────────────────────────────────────────────────
    const next90 = new Date(now.getTime() + 90 * 86400000);
    const futureBookings = enriched.filter(b =>
      (b.status === "confirmed" || b.status === "pending") && b.tripDate > now && b.tripDate <= next90
    );
    const forecast = [0, 1, 2].map(offset => {
      const m = (now.getMonth() + offset) % 12;
      const y = now.getMonth() + offset >= 12 ? year + 1 : year;
      const confirmedRev = futureBookings
        .filter(b => b.status === "confirmed" && b.month === m && b.year === y)
        .reduce((s, b) => s + b.total, 0);
      const pendingRev = futureBookings
        .filter(b => b.status === "pending" && b.month === m && b.year === y)
        .reduce((s, b) => s + b.total, 0);
      // same period last year
      const prevSame = completed
        .filter(b => b.month === m && b.year === prevYear)
        .reduce((s, b) => s + b.total, 0);
      return { month: m, confirmed: confirmedRev, pending: pendingRev, lastYear: prevSame };
    });

    // Annual pace projection
    const monthsElapsed = now.getMonth() + 1;
    const annualPace = monthsElapsed > 0 ? Math.round((totalRevenueYTD / monthsElapsed) * 12) : 0;

    // ── Conversion funnel ───────────────────────────────────────────────────
    const searchImpressions = analytics.filter(a => a.event_type === "search_impression").length;
    const messagesReceived = analytics.filter(a => a.event_type === "message_received").length;
    const bookingsStarted = analytics.filter(a => a.event_type === "booking_started").length;
    const bookingsCompletedCount = analytics.filter(a => a.event_type === "booking_completed").length;

    const funnel = [
      { label: "Search Impressions", value: searchImpressions },
      { label: "Profile Views", value: profileViews },
      { label: "Messages Sent", value: messagesReceived },
      { label: "Bookings Started", value: bookingsStarted },
      { label: "Bookings Completed", value: bookingsCompletedCount },
    ];
    // Find weakest step
    let weakestDrop = 0;
    let weakestIdx = -1;
    funnel.forEach((step, i) => {
      if (i === 0) return;
      const prev = funnel[i - 1].value;
      const drop = prev > 0 ? ((prev - step.value) / prev) * 100 : 0;
      if (drop > weakestDrop && prev > 0) { weakestDrop = drop; weakestIdx = i; }
    });

    const funnelSuggestions = {
      1: "Improve your search ranking with better keywords and a complete profile.",
      2: "Add more photos and reviews to encourage visitors to reach out.",
      3: "Respond faster to messages — guides who reply within 1 hour convert 3x more.",
      4: "Simplify your booking flow. Consider offering instant-book packages.",
    };

    // ── Recommendation extras ──────────────────────────────────────────────
    const currentMonthIdx = now.getMonth();
    const nextMonthIdx = (currentMonthIdx + 1) % 12;

    // Trips in last 30 days with no linked expenses
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const recentCompleted = completed.filter(b => b.tripDate >= thirtyDaysAgo);
    const expenseBookingIds = new Set(expenses.map(e => e.booking_id).filter(Boolean));
    const tripsWithNoExpenses = recentCompleted.filter(b => !expenseBookingIds.has(b.id)).length;

    // Booking trend: last 90 vs prior 90
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
    const oneEightyDaysAgo = new Date(now.getTime() - 180 * 86400000);
    const last90Count = completed.filter(b => b.tripDate >= ninetyDaysAgo).length;
    const prior90Count = completed.filter(b => b.tripDate >= oneEightyDaysAgo && b.tripDate < ninetyDaysAgo).length;
    const recentBookingTrend = prior90Count > 0
      ? Math.round(((last90Count - prior90Count) / prior90Count) * 100) : null;

    // Conversion drop: compare last 90 days analytics vs prior 90 days
    const analyticsWithDates = analytics.map(a => ({ ...a, date: new Date(a.created_at) }));
    const viewsLast90 = analyticsWithDates.filter(a => a.event_type === "profile_view" && a.date >= ninetyDaysAgo).length;
    const bookingsLast90 = analyticsWithDates.filter(a => a.event_type === "booking_completed" && a.date >= ninetyDaysAgo).length;
    const viewsPrior90 = analyticsWithDates.filter(a => a.event_type === "profile_view" && a.date >= oneEightyDaysAgo && a.date < ninetyDaysAgo).length;
    const bookingsPrior90 = analyticsWithDates.filter(a => a.event_type === "booking_completed" && a.date >= oneEightyDaysAgo && a.date < ninetyDaysAgo).length;
    const convLast = viewsLast90 > 0 ? (bookingsLast90 / viewsLast90) * 100 : 0;
    const convPrior = viewsPrior90 > 0 ? (bookingsPrior90 / viewsPrior90) * 100 : 0;
    const conversionDrop = convPrior > 0 && convLast < convPrior
      ? Math.round(((convPrior - convLast) / convPrior) * 100) : null;

    return {
      kpis: { totalRevenueYTD, netProfit, avgTripValue, tripsYTD: completedYTD.length,
        conversionRate, avgRevenuePerHour, repeatRate, profitMargin, yoyGrowth },
      monthlyRevenue, maxMonthlyRev, peakMonth, slowMonth,
      pkgPerf, bracketData, bestBracket,
      timeEfficiency, durationBuckets, dayRevenue, maxDayRate,
      bestDuration, bestTimeSlot,
      expenseCategories, maxExpense, mileageDeductions, costPerTrip, totalExpenses,
      forecast, annualPace,
      funnel, weakestIdx, weakestDrop, funnelSuggestions,
      hasBookings: completed.length > 0,
      hasExpenses: expenses.length > 0,
      hasPrevYear: completedPrevYTD.length > 0,
      // Recommendation engine fields
      completedCount: completed.length,
      tripsWithNoExpenses,
      recentBookingTrend,
      conversionDrop,
      currentMonthIdx,
      nextMonthIdx,
    };
  }, [bookings, packages, payments, expenses, analytics]);

  // ─── RENDER ───────────────────────────────────────────────────────────────
  if (loading) return <LoadingSkeleton />;
  if (!data) return <LoadingSkeleton />;

  const { kpis, monthlyRevenue, maxMonthlyRev, peakMonth, slowMonth,
    pkgPerf, bracketData, bestBracket,
    timeEfficiency, durationBuckets, dayRevenue, maxDayRate,
    bestDuration, bestTimeSlot,
    expenseCategories, maxExpense, mileageDeductions, costPerTrip, totalExpenses,
    forecast, annualPace,
    funnel, weakestIdx, weakestDrop, funnelSuggestions,
    hasBookings, hasExpenses, hasPrevYear } = data;

  const recommendations = generateRecommendations(data);

  const labelStyle = {
    fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700,
    color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em",
  };
  const valueStyle = { fontFamily: FONT_DISPLAY, fontSize: 22, color: T.white, marginTop: 4 };
  const subStyle = { fontFamily: FONT_BODY, fontSize: 12, color: T.muted };
  const cellStyle = {
    fontFamily: FONT_BODY, fontSize: 13, color: T.ash,
    padding: "10px 12px", borderBottom: `1px solid ${T.rim}`,
  };
  const headerCellStyle = {
    ...cellStyle, fontWeight: 700, color: T.silver,
    fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ════════════ 1. KPI ROW ════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <KpiCard label="Total Revenue (YTD)" value={fmtFull(kpis.totalRevenueYTD)}
          sub="year-to-date" trend={kpis.yoyGrowth} trendLabel="vs last year" />
        <KpiCard label="Net Profit" value={fmtFull(kpis.netProfit)}
          sub={`${fmtFull(data.totalExpenses)} in expenses`} />
        <KpiCard label="Avg Trip Value" value={fmtFull(kpis.avgTripValue)} sub="per completed trip" />
        <KpiCard label="Trips Completed (YTD)" value={kpis.tripsYTD} sub="year-to-date" />
        <KpiCard label="Booking Conversion" value={`${kpis.conversionRate}%`} sub="profile views → bookings" />
        <KpiCard label="Revenue Per Hour" value={fmtFull(kpis.avgRevenuePerHour)} sub="avg across all trips" />
        <KpiCard label="Repeat Client Rate" value={`${kpis.repeatRate}%`} sub="guests with 2+ trips" />
        <KpiCard label="Profit Margin" value={`${kpis.profitMargin}%`}
          sub={kpis.profitMargin >= 70 ? "healthy" : kpis.profitMargin >= 40 ? "moderate" : "review expenses"} />
      </div>

      {/* ════════════ BUSINESS INSIGHTS ════════════ */}
      <SectionCard>
        <SectionHeader>Your Business Insights</SectionHeader>
        {recommendations.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {recommendations.map((rec, i) => (
              <RecommendationCard key={i} icon={rec.icon} title={rec.title} body={rec.body} type={rec.type} />
            ))}
          </div>
        ) : (
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "20px 18px", background: T.lifted, borderRadius: 8,
            borderLeft: `4px solid ${GOLD}`, border: `1px solid ${T.rim}`,
            borderLeftColor: GOLD, borderLeftWidth: 4,
          }}>
            <span style={{ fontSize: 22 }}>{"\u{1F4C8}"}</span>
            <div>
              <div style={{
                fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700,
                color: T.white, marginBottom: 4,
              }}>Keep booking</div>
              <div style={{
                fontFamily: FONT_BODY, fontSize: 13, color: T.muted, lineHeight: 1.55,
              }}>Personalized insights will appear as your data grows. Complete a few more trips and we'll start spotting opportunities for you.</div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ════════════ 2. REVENUE & SEASONALITY ════════════ */}
      <SectionCard>
        <SectionHeader>Revenue &amp; Seasonality</SectionHeader>
        {!hasBookings ? <EmptyState label="complete trips to see revenue trends" /> : (
          <>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 200, padding: "0 4px" }}>
              {monthlyRevenue.map((m, i) => {
                const barH = (m.current / maxMonthlyRev) * 180;
                const prevH = (m.previous / maxMonthlyRev) * 180;
                const isFuture = i > new Date().getMonth();
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 180 }}>
                      {hasPrevYear && (
                        <div style={{
                          width: 10, height: Math.max(2, prevH),
                          background: T.rim, borderRadius: 2, opacity: 0.6,
                        }} title={`${MONTHS[i]} last year: ${fmtFull(m.previous)}`} />
                      )}
                      <div style={{
                        width: hasPrevYear ? 14 : 24,
                        height: Math.max(2, barH),
                        background: isFuture ? `${GOLD}40` : GOLD,
                        borderRadius: 3, transition: "height 0.4s",
                      }} title={`${MONTHS[i]}: ${fmtFull(m.current)}`} />
                    </div>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: T.muted }}>
                      {MONTHS[i]}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{
              display: "flex", gap: 24, marginTop: 16, flexWrap: "wrap",
              fontFamily: FONT_BODY, fontSize: 13,
            }}>
              <span style={{ color: T.ash }}>
                Peak: <strong style={{ color: GOLD }}>{MONTHS[peakMonth.month]}</strong> ({fmtFull(peakMonth.current)})
              </span>
              <span style={{ color: T.ash }}>
                Slowest: <strong style={{ color: T.muted }}>{MONTHS[slowMonth.month]}</strong> ({fmtFull(slowMonth.current)})
              </span>
              {kpis.yoyGrowth != null && (
                <span style={{ color: kpis.yoyGrowth >= 0 ? GREEN : RED }}>
                  YoY Growth: {kpis.yoyGrowth >= 0 ? "+" : ""}{kpis.yoyGrowth}%
                </span>
              )}
            </div>
            {hasPrevYear && (
              <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 12, height: 12, background: GOLD, borderRadius: 2, display: "inline-block" }} />
                  <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted }}>This year</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 12, height: 12, background: T.rim, borderRadius: 2, display: "inline-block" }} />
                  <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted }}>Last year</span>
                </span>
              </div>
            )}
          </>
        )}
      </SectionCard>

      {/* ════════════ 3. PACKAGE PERFORMANCE ════════════ */}
      <SectionCard>
        <SectionHeader>Package Performance</SectionHeader>
        {pkgPerf.length === 0 ? <EmptyState label="add packages to track performance" /> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Package", "Bookings", "Revenue", "Avg Group", "$/Hour", "Margin", "Trend"].map(h => (
                    <th key={h} style={{ ...headerCellStyle, textAlign: h === "Package" ? "left" : "right" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pkgPerf.map((pkg, i) => {
                  const isTop = i === 0 && pkg.perHour > 0;
                  return (
                    <tr key={pkg.id}>
                      <td style={{ ...cellStyle, color: isTop ? GOLD : T.ash, fontWeight: isTop ? 700 : 400 }}>
                        {pkg.title} {isTop && "★"}
                      </td>
                      <td style={{ ...cellStyle, textAlign: "right" }}>{pkg.bookings}</td>
                      <td style={{ ...cellStyle, textAlign: "right", color: T.white }}>{fmtFull(pkg.revenue)}</td>
                      <td style={{ ...cellStyle, textAlign: "right" }}>{pkg.avgGroup}</td>
                      <td style={{
                        ...cellStyle, textAlign: "right",
                        color: isTop ? GOLD : T.white, fontWeight: isTop ? 700 : 400,
                      }}>{fmtFull(pkg.perHour)}</td>
                      <td style={{ ...cellStyle, textAlign: "right" }}>{pkg.margin}%</td>
                      <td style={{ ...cellStyle, textAlign: "right", color: trendColor(pkg.trend) }}>
                        {arrow(pkg.trend)} {Math.abs(pkg.trend)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ════════════ 4. DEMAND & PRICING INTELLIGENCE ════════════ */}
      <SectionCard>
        <SectionHeader>Demand &amp; Pricing Intelligence</SectionHeader>
        {!hasBookings ? <EmptyState label="complete trips to analyze pricing" /> : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {bracketData.map((br, i) => {
                const isBest = br.label === bestBracket.label && br.revenue > 0;
                return (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "100px 1fr 80px 80px 90px", gap: 12,
                    alignItems: "center", padding: "10px 12px",
                    background: isBest ? `${GOLD}10` : "transparent",
                    border: isBest ? `1px solid ${GOLD}30` : `1px solid transparent`,
                    borderRadius: 6,
                  }}>
                    <span style={{
                      fontFamily: FONT_BODY, fontSize: 13,
                      color: isBest ? GOLD : T.ash, fontWeight: isBest ? 700 : 400,
                    }}>
                      {br.label} {isBest && "★"}
                    </span>
                    <div style={{ height: 8, background: T.lifted, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{
                        width: `${Math.max(2, pct(br.revenue, bestBracket.revenue))}%`,
                        height: "100%", background: isBest ? GOLD : T.wire, borderRadius: 4,
                      }} />
                    </div>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, textAlign: "right" }}>
                      {br.count} trips
                    </span>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.white, textAlign: "right" }}>
                      {fmtFull(br.revenue)}
                    </span>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.muted, textAlign: "right" }}>
                      {br.conversion != null ? `${br.conversion}% conv` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            {bestBracket.count > 0 && (
              <Insight text={`Your ${bestBracket.label} packages generate the most revenue (${fmtFull(bestBracket.revenue)} from ${bestBracket.count} trips). Consider adding more offerings in this price range.`} />
            )}
          </>
        )}
      </SectionCard>

      {/* ════════════ 5. TIME EFFICIENCY ANALYSIS ════════════ */}
      <SectionCard>
        <SectionHeader>Time Efficiency Analysis</SectionHeader>
        {!hasBookings ? <EmptyState label="complete trips to analyze time efficiency" /> : (
          <>
            {/* Day of week heatmap */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ ...labelStyle, marginBottom: 12, fontSize: 10 }}>Revenue per hour by day</div>
              <div style={{ display: "flex", gap: 6 }}>
                {dayRevenue.map((d, i) => {
                  const intensity = d.avgPerHour / maxDayRate;
                  return (
                    <div key={i} style={{
                      flex: 1, textAlign: "center", padding: "12px 4px",
                      background: d.trips > 0
                        ? `rgba(201, 151, 58, ${0.1 + intensity * 0.5})`
                        : T.lifted,
                      borderRadius: 6, border: `1px solid ${T.rim}`,
                    }}>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.silver, marginBottom: 4 }}>
                        {DAYS[i]}
                      </div>
                      <div style={{
                        fontFamily: FONT_DISPLAY, fontSize: 16,
                        color: d.trips > 0 ? GOLD : T.muted,
                      }}>
                        {d.trips > 0 ? fmtFull(d.avgPerHour) : "—"}
                      </div>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 10, color: T.muted, marginTop: 2 }}>
                        {d.trips} trips
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weekend vs Weekday */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Weekends", data: timeEfficiency.weekend },
                { label: "Weekdays", data: timeEfficiency.weekday },
              ].map(({ label, data: d }) => (
                <div key={label} style={{
                  background: T.lifted, borderRadius: 8, padding: 16,
                  border: `1px solid ${T.rim}`,
                }}>
                  <div style={{ ...labelStyle, marginBottom: 12 }}>{label}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={subStyle}>Avg $/trip</span>
                      <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: T.white }}>{fmtFull(d.avgTrip)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={subStyle}>Avg $/hour</span>
                      <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: GOLD }}>{fmtFull(d.avgPerHour)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={subStyle}>Trip count</span>
                      <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: T.ash }}>{d.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Duration buckets */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              {durationBuckets.map((bucket, i) => {
                const isBest = bucket.avgPerHour > 0 && bucket.label === bestDuration.label;
                return (
                  <div key={i} style={{
                    background: isBest ? `${GOLD}10` : T.lifted,
                    borderRadius: 8, padding: 16,
                    border: `1px solid ${isBest ? GOLD + "40" : T.rim}`,
                  }}>
                    <div style={{ ...labelStyle, marginBottom: 10, color: isBest ? GOLD : T.silver }}>
                      {bucket.label}
                    </div>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: isBest ? GOLD : T.white }}>
                      {fmtFull(bucket.avgPerHour)}<span style={{ fontSize: 13, color: T.muted }}>/hr</span>
                    </div>
                    <div style={{ ...subStyle, marginTop: 6 }}>
                      {bucket.count} trips — {fmtFull(bucket.revenue)} total
                    </div>
                  </div>
                );
              })}
            </div>

            {bestDuration.count > 0 && timeEfficiency.weekend.count > 0 && timeEfficiency.weekday.count > 0 && (
              <Insight text={(() => {
                const we = timeEfficiency.weekend.avgPerHour;
                const wd = timeEfficiency.weekday.avgPerHour;
                const diff = we > wd
                  ? `${Math.round(((we - wd) / wd) * 100)}% more than weekday trips`
                  : `${Math.round(((wd - we) / we) * 100)}% more than weekend trips`;
                return `${bestDuration.label} trips on ${bestTimeSlot}s generate ${fmtFull(Math.max(we, wd))}/hr — ${diff}.`;
              })()} />
            )}
          </>
        )}
      </SectionCard>

      {/* ════════════ 6. EXPENSE BREAKDOWN ════════════ */}
      <SectionCard>
        <SectionHeader>Expense Breakdown</SectionHeader>
        {!hasExpenses ? <EmptyState label="log expenses to see your cost breakdown" /> : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {expenseCategories.map((cat, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: 2, flexShrink: 0,
                    background: EXPENSE_COLORS[cat.category] || T.wire,
                  }} />
                  <div style={{
                    fontFamily: FONT_BODY, fontSize: 13, color: T.ash,
                    minWidth: 100, textTransform: "capitalize",
                  }}>
                    {cat.category}
                  </div>
                  <div style={{ flex: 1, height: 10, background: T.lifted, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      width: `${Math.max(2, (cat.amount / maxExpense) * 100)}%`,
                      height: "100%", borderRadius: 4,
                      background: EXPENSE_COLORS[cat.category] || T.wire,
                    }} />
                  </div>
                  <div style={{
                    fontFamily: FONT_BODY, fontSize: 13, color: T.white,
                    minWidth: 70, textAlign: "right",
                  }}>
                    {fmtFull(cat.amount)}
                  </div>
                  <div style={{
                    fontFamily: FONT_BODY, fontSize: 11, color: T.muted,
                    minWidth: 60, textAlign: "right",
                  }}>
                    {cat.pctOfRevenue}% of rev
                  </div>
                </div>
              ))}
            </div>
            {mileageDeductions > 0 && (
              <div style={{
                display: "flex", justifyContent: "space-between",
                marginTop: 16, padding: "12px 16px",
                background: T.lifted, borderRadius: 6, border: `1px solid ${T.rim}`,
              }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash }}>
                  Mileage deductions (IRS rate)
                </span>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: GREEN }}>
                  {fmtFull(mileageDeductions)}
                </span>
              </div>
            )}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16,
            }}>
              <div style={{ background: T.lifted, borderRadius: 8, padding: 16, border: `1px solid ${T.rim}` }}>
                <div style={labelStyle}>Total Expenses</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: RED, marginTop: 6 }}>
                  {fmtFull(totalExpenses)}
                </div>
              </div>
              <div style={{ background: T.lifted, borderRadius: 8, padding: 16, border: `1px solid ${T.rim}` }}>
                <div style={labelStyle}>Cost Per Trip</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.white, marginTop: 6 }}>
                  {fmtFull(costPerTrip)}
                </div>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      {/* ════════════ 7. 90-DAY FORECAST ════════════ */}
      <SectionCard>
        <SectionHeader>90-Day Forecast</SectionHeader>
        {!hasBookings ? <EmptyState label="confirmed bookings will populate your forecast" /> : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {forecast.map((f, i) => {
                const total = f.confirmed + f.pending;
                const maxForecast = Math.max(...forecast.map(x => x.confirmed + x.pending), f.lastYear, 1);
                return (
                  <div key={i} style={{
                    background: T.lifted, borderRadius: 8, padding: 16,
                    border: `1px solid ${T.rim}`,
                  }}>
                    <div style={{ ...labelStyle, marginBottom: 12 }}>{MONTHS[f.month]}</div>
                    {/* Stacked bar */}
                    <div style={{
                      height: 8, background: T.void, borderRadius: 4,
                      overflow: "hidden", display: "flex", marginBottom: 12,
                    }}>
                      <div style={{
                        width: `${pct(f.confirmed, maxForecast)}%`,
                        height: "100%", background: GREEN,
                      }} />
                      <div style={{
                        width: `${pct(f.pending, maxForecast)}%`,
                        height: "100%", background: GOLD + "80",
                      }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ ...subStyle, display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: GREEN, display: "inline-block" }} />
                          Confirmed
                        </span>
                        <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: GREEN, fontWeight: 600 }}>
                          {fmtFull(f.confirmed)}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ ...subStyle, display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: GOLD + "80", display: "inline-block" }} />
                          Pending
                        </span>
                        <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: GOLD, fontWeight: 600 }}>
                          {fmtFull(f.pending)}
                        </span>
                      </div>
                      {f.lastYear > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, borderTop: `1px solid ${T.rim}`, paddingTop: 6 }}>
                          <span style={subStyle}>Last year</span>
                          <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.muted }}>
                            {fmtFull(f.lastYear)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{
              marginTop: 16, padding: "14px 20px",
              background: `linear-gradient(135deg, ${T.lifted}, ${GOLD}08)`,
              borderRadius: 8, border: `1px solid ${GOLD}20`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.ash }}>
                At current pace, you are on track for
              </span>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: GOLD }}>
                {fmtFull(annualPace)} <span style={{ fontSize: 14, color: T.muted }}>this year</span>
              </span>
            </div>
          </>
        )}
      </SectionCard>

      {/* ════════════ 8. CONVERSION FUNNEL ════════════ */}
      <SectionCard>
        <SectionHeader>Conversion Funnel</SectionHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {funnel.map((step, i) => {
            const prev = i > 0 ? funnel[i - 1].value : step.value;
            const stepPct = prev > 0 ? pct(step.value, prev) : (i === 0 ? 100 : 0);
            const isWeakest = i === weakestIdx;
            const barWidth = funnel[0].value > 0 ? pct(step.value, funnel[0].value) : 0;

            return (
              <div key={step.label}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "8px 12px", borderRadius: 6,
                  background: isWeakest ? `${RED}10` : "transparent",
                  border: isWeakest ? `1px solid ${RED}30` : "1px solid transparent",
                }}>
                  <div style={{
                    fontFamily: FONT_BODY, fontSize: 13,
                    color: isWeakest ? RED : T.ash, minWidth: 180,
                    fontWeight: isWeakest ? 700 : 400,
                  }}>
                    {step.label} {isWeakest && "⚠"}
                  </div>
                  <div style={{ flex: 1, height: 28, background: T.lifted, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      width: `${Math.max(barWidth, 2)}%`,
                      height: "100%", borderRadius: 4,
                      background: isWeakest ? RED
                        : i === funnel.length - 1 ? GOLD
                        : T.wire,
                      transition: "width 0.5s",
                    }} />
                  </div>
                  <div style={{
                    fontFamily: FONT_DISPLAY, fontSize: 20, color: T.white,
                    minWidth: 50, textAlign: "right",
                  }}>
                    {step.value}
                  </div>
                  {i > 0 && (
                    <div style={{
                      fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700,
                      color: stepPct >= 50 ? GREEN : stepPct >= 20 ? GOLD : RED,
                      minWidth: 44, textAlign: "right",
                    }}>
                      {stepPct}%
                    </div>
                  )}
                </div>
                {i > 0 && i < funnel.length && (
                  <div style={{
                    fontFamily: FONT_BODY, fontSize: 10, color: T.muted,
                    textAlign: "center", margin: "-2px 0",
                  }}>
                    ↓
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {weakestIdx > 0 && weakestDrop > 0 && (
          <Insight text={`Your biggest drop-off is at "${funnel[weakestIdx].label}" (${Math.round(weakestDrop)}% lost). ${funnelSuggestions[weakestIdx] || "Review this step to improve conversions."}`} />
        )}
      </SectionCard>
    </div>
  );
}
