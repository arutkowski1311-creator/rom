"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";
import { GoldBtn, SectionCard, SectionHeader } from "@/app/components/ui";
import MileageTracker from "./MileageTracker";

const EXPENSE_CATEGORIES = [
  "Fuel", "Gear", "Food & Meals", "Insurance", "Vehicle", "License & Permits",
  "Supplies", "Marketing", "Software", "Mileage", "Other",
];

const IRS_MILEAGE_RATE = 0.70; // 2025 IRS standard mileage rate

// ── Schedule C mapping ──
const SCHEDULE_C_MAP = {
  "Fuel":              { line: "Line 9",  label: "Car and truck expenses" },
  "Vehicle":           { line: "Line 9",  label: "Car and truck expenses" },
  "Insurance":         { line: "Line 15", label: "Insurance" },
  "Gear":              { line: "Line 22", label: "Supplies" },
  "Supplies":          { line: "Line 22", label: "Supplies" },
  "Food & Meals":      { line: "Line 24b", label: "Meals (50% deductible)" },
  "Marketing":         { line: "Line 8",  label: "Advertising" },
  "Software":          { line: "Line 18", label: "Office expense" },
  "License & Permits": { line: "Line 23", label: "Taxes and licenses" },
  "Mileage":           { line: "Form 2106", label: "Standard mileage deduction" },
  "Other":             { line: "Line 27a", label: "Other expenses" },
};

// ── Quick-Add Presets ──
const QUICK_PRESETS = [
  { emoji: "\u26FD", label: "Fuel",          category: "Fuel",         defaultAmount: 45 },
  { emoji: "\uD83C\uDF54", label: "Meals",         category: "Food & Meals", defaultAmount: 25 },
  { emoji: "\uD83C\uDD7F\uFE0F", label: "Parking",       category: "Other",        defaultAmount: 15 },
  { emoji: "\uD83C\uDFA3", label: "Bait/Supplies", category: "Supplies",     defaultAmount: 30 },
];

const FREQUENCY_LABELS = { monthly: "/mo", weekly: "/wk", quarterly: "/qtr" };

function getQuarter(dateStr) {
  const m = new Date(dateStr).getMonth();
  if (m < 3) return "Q1";
  if (m < 6) return "Q2";
  if (m < 9) return "Q3";
  return "Q4";
}

function parseDurationHours(durationStr) {
  if (!durationStr) return null;
  const s = durationStr.toLowerCase();
  const hourMatch = s.match(/([\d.]+)\s*h/);
  if (hourMatch) return parseFloat(hourMatch[1]);
  if (s.includes("full day")) return 8;
  if (s.includes("half day")) return 4;
  const dayMatch = s.match(/([\d.]+)\s*day/);
  if (dayMatch) return parseFloat(dayMatch[1]) * 8;
  const numOnly = s.match(/^([\d.]+)$/);
  if (numOnly) return parseFloat(numOnly[1]);
  return null;
}

function daysBetween(d1, d2) {
  return Math.abs(Math.floor((new Date(d1) - new Date(d2)) / (1000 * 60 * 60 * 24)));
}

export default function FinancesTab({ guide }) {
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ category: "Fuel", amount: "", description: "", date: new Date().toISOString().split("T")[0], bookingId: "", receiptUrl: "" });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Quick-add flash state
  const [quickFlash, setQuickFlash] = useState(null); // preset index that just fired
  const [quickEditIdx, setQuickEditIdx] = useState(null); // which preset is being edited
  const [quickEditAmt, setQuickEditAmt] = useState("");
  const [presetAmounts, setPresetAmounts] = useState(() => QUICK_PRESETS.map(p => p.defaultAmount));

  // Receipt capture
  const receiptInputRef = useRef(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  // Recurring expenses
  const [recurringTemplates, setRecurringTemplates] = useState([]);
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [newRecurring, setNewRecurring] = useState({ category: "Insurance", amount: "", description: "", frequency: "monthly" });
  const [loggingRecurring, setLoggingRecurring] = useState(false);

  // Post-trip prompt dismissals
  const [dismissedTrips, setDismissedTrips] = useState(new Set());

  // 1099
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());

  // ── Data fetch ──
  useEffect(() => {
    if (!guide?.id) return;
    const supabase = getSupabase();
    Promise.all([
      supabase.from("payments").select("*").eq("guide_id", guide.id).eq("status", "succeeded").order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").eq("guide_id", guide.id).order("date", { ascending: false }),
      supabase.from("bookings").select("*").eq("guide_id", guide.id).order("trip_date", { ascending: false }),
    ]).then(([paymentsRes, expensesRes, bookingsRes]) => {
      setPayments(paymentsRes.data || []);
      setExpenses(expensesRes.data || []);
      setBookings(bookingsRes.data || []);
      setLoading(false);
    });
    // Fetch recurring templates
    fetch(`/api/expenses/recurring?guideId=${guide.id}`)
      .then(r => r.json())
      .then(d => setRecurringTemplates(d.templates || []))
      .catch(() => {});
  }, [guide?.id, refreshKey]);

  const totalRevenue = payments.reduce((sum, p) => sum + (p.guide_payout_amount || 0), 0) / 100;
  const totalMileageDeductionKPI = expenses.filter(e => e.category === "Mileage").reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  // Mileage calculations
  const mileageEntries = expenses.filter(e => e.category === "Mileage");
  const totalMiles = mileageEntries.reduce((sum, e) => sum + parseFloat(e.mileage || 0), 0);
  const totalMileageDeduction = mileageEntries.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const nonMileageExpenses = totalExpenses - totalMileageDeduction;

  // ── Recent booking for auto-link (within last 3 days, non-cancelled) ──
  const today = new Date().toISOString().split("T")[0];
  const recentBooking = bookings.find(b => b.status !== "cancelled" && daysBetween(b.trip_date, today) <= 3 && new Date(b.trip_date) <= new Date());

  // ── Post-trip prompt: completed bookings within 3 days with no linked expenses ──
  const completedNoExpenses = bookings.filter(b => {
    if (b.status === "cancelled" || dismissedTrips.has(b.id)) return false;
    const tripDate = new Date(b.trip_date);
    const daysAgo = daysBetween(b.trip_date, today);
    return daysAgo <= 3 && tripDate <= new Date() && (b.status === "completed" || b.status === "confirmed") && !expenses.some(e => e.booking_id === b.id);
  });

  // ── Receipt handler ──
  const handleReceiptCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setReceiptPreview(dataUrl);
      setNewExpense(prev => ({ ...prev, receiptUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  // ── Add expense (full form) ──
  const handleAddExpense = async () => {
    if (!newExpense.amount || !newExpense.date) return;
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideId: guide.id,
          category: newExpense.category,
          amount: parseFloat(newExpense.amount),
          description: newExpense.description,
          date: newExpense.date,
          bookingId: newExpense.bookingId || null,
          receiptUrl: newExpense.receiptUrl || null,
        }),
      });
      const data = await res.json();
      if (data.expense) {
        setExpenses([data.expense, ...expenses]);
        setNewExpense({ category: "Fuel", amount: "", description: "", date: new Date().toISOString().split("T")[0], bookingId: "", receiptUrl: "" });
        setReceiptPreview(null);
        setShowAddExpense(false);
      }
    } catch (err) {
      console.error("Add expense error:", err);
    }
  };

  // ── Quick-add handler ──
  const handleQuickAdd = async (presetIdx, overrideBookingId) => {
    const preset = QUICK_PRESETS[presetIdx];
    const amount = presetAmounts[presetIdx];
    const bookingId = overrideBookingId || (recentBooking?.id || null);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideId: guide.id,
          category: preset.category,
          amount,
          description: preset.label,
          date: today,
          bookingId,
        }),
      });
      const data = await res.json();
      if (data.expense) {
        setExpenses(prev => [data.expense, ...prev]);
        setQuickFlash(presetIdx);
        setTimeout(() => setQuickFlash(null), 1200);
      }
    } catch (err) {
      console.error("Quick add error:", err);
    }
  };

  // ── Recurring: add template ──
  const handleAddRecurring = async () => {
    if (!newRecurring.amount) return;
    try {
      const res = await fetch("/api/expenses/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideId: guide.id,
          category: newRecurring.category,
          amount: parseFloat(newRecurring.amount),
          description: newRecurring.description,
          frequency: newRecurring.frequency,
        }),
      });
      const data = await res.json();
      if (data.template) {
        setRecurringTemplates(prev => [data.template, ...prev]);
        setNewRecurring({ category: "Insurance", amount: "", description: "", frequency: "monthly" });
        setShowAddRecurring(false);
      }
    } catch (err) {
      console.error("Add recurring error:", err);
    }
  };

  // ── Recurring: toggle active ──
  const toggleRecurring = async (tmpl) => {
    try {
      const res = await fetch("/api/expenses/recurring", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: tmpl.id, active: !tmpl.active }),
      });
      const data = await res.json();
      if (data.template) {
        setRecurringTemplates(prev => prev.map(t => t.id === tmpl.id ? data.template : t));
      }
    } catch (err) {
      console.error("Toggle recurring error:", err);
    }
  };

  // ── Recurring: delete ──
  const deleteRecurring = async (id) => {
    try {
      await fetch("/api/expenses/recurring", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setRecurringTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error("Delete recurring error:", err);
    }
  };

  // ── Recurring: log all due ──
  const handleLogAllDue = async () => {
    setLoggingRecurring(true);
    const activeTemplates = recurringTemplates.filter(t => t.active);
    const todayStr = new Date().toISOString().split("T")[0];
    const nowDate = new Date();

    for (const tmpl of activeTemplates) {
      // Determine if due based on frequency and last_logged
      let isDue = true;
      if (tmpl.last_logged) {
        const last = new Date(tmpl.last_logged);
        const diffDays = daysBetween(tmpl.last_logged, todayStr);
        if (tmpl.frequency === "weekly" && diffDays < 7) isDue = false;
        if (tmpl.frequency === "monthly" && diffDays < 28) isDue = false;
        if (tmpl.frequency === "quarterly" && diffDays < 84) isDue = false;
      }

      if (!isDue) continue;

      try {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guideId: guide.id,
            category: tmpl.category,
            amount: parseFloat(tmpl.amount),
            description: tmpl.description || `Recurring: ${tmpl.category}`,
            date: todayStr,
            recurringTemplateId: tmpl.id,
          }),
        });
        const data = await res.json();
        if (data.expense) {
          setExpenses(prev => [data.expense, ...prev]);
        }
        // Update last_logged
        await fetch("/api/expenses/recurring", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: tmpl.id, lastLogged: todayStr }),
        });
        setRecurringTemplates(prev => prev.map(t => t.id === tmpl.id ? { ...t, last_logged: todayStr } : t));
      } catch (err) {
        console.error("Log recurring error:", err);
      }
    }
    setLoggingRecurring(false);
  };

  // ── Schedule C CSV export ──
  const generateScheduleCCSV = () => {
    const yearPayments = payments.filter(p => new Date(p.created_at).getFullYear() === taxYear);
    const yearExpenses = expenses.filter(e => new Date(e.date).getFullYear() === taxYear);

    const quarters = ["Q1", "Q2", "Q3", "Q4"];
    const rows = [["Quarter", "Gross Payments", "Expenses", "Mileage Deduction", "Net Income"]];

    let annualGross = 0, annualExpenses = 0, annualMileage = 0;

    quarters.forEach(q => {
      const qPayments = yearPayments.filter(p => getQuarter(p.created_at) === q);
      const qExpenses = yearExpenses.filter(e => getQuarter(e.date) === q);
      const gross = qPayments.reduce((s, p) => s + (p.guide_payout_amount || 0), 0) / 100;
      const mileageExp = qExpenses.filter(e => e.category === "Mileage").reduce((s, e) => s + parseFloat(e.amount || 0), 0);
      const otherExp = qExpenses.filter(e => e.category !== "Mileage").reduce((s, e) => s + parseFloat(e.amount || 0), 0);
      const net = gross - otherExp - mileageExp;

      annualGross += gross;
      annualExpenses += otherExp;
      annualMileage += mileageExp;

      rows.push([q, `$${gross.toFixed(2)}`, `$${otherExp.toFixed(2)}`, `$${mileageExp.toFixed(2)}`, `$${net.toFixed(2)}`]);
    });

    rows.push([]);
    rows.push(["Annual Total", `$${annualGross.toFixed(2)}`, `$${annualExpenses.toFixed(2)}`, `$${annualMileage.toFixed(2)}`, `$${(annualGross - annualExpenses - annualMileage).toFixed(2)}`]);

    const yearMileageEntries = yearExpenses.filter(e => e.category === "Mileage");
    const yearTotalMiles = yearMileageEntries.reduce((s, e) => s + parseFloat(e.mileage || 0), 0);
    rows.push([]);
    rows.push(["Total Business Miles", yearTotalMiles.toFixed(1)]);
    rows.push(["IRS Mileage Rate", `$${IRS_MILEAGE_RATE}`]);
    rows.push(["Estimated Tax (25%)", `$${Math.max(0, (annualGross - annualExpenses - annualMileage) * 0.25).toFixed(2)}`]);

    // Schedule C breakdown
    rows.push([]);
    rows.push(["--- Schedule C Breakdown ---"]);
    rows.push(["Schedule C Line", "Category", "Amount"]);

    const lineGroups = {};
    yearExpenses.forEach(e => {
      const mapping = SCHEDULE_C_MAP[e.category] || SCHEDULE_C_MAP["Other"];
      const key = `${mapping.line} — ${mapping.label}`;
      if (!lineGroups[key]) lineGroups[key] = 0;
      let amt = parseFloat(e.amount || 0);
      // 50% deductible for meals
      if (e.category === "Food & Meals") amt *= 0.5;
      lineGroups[key] += amt;
    });

    Object.entries(lineGroups).sort((a, b) => a[0].localeCompare(b[0])).forEach(([line, amt]) => {
      rows.push([line, "", `$${amt.toFixed(2)}`]);
    });

    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ROM_ScheduleC_Summary_${taxYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Schedule C print summary ──
  const printScheduleCSummary = () => {
    const yearPayments = payments.filter(p => new Date(p.created_at).getFullYear() === taxYear);
    const yearExpenses = expenses.filter(e => new Date(e.date).getFullYear() === taxYear);
    const gross = yearPayments.reduce((s, p) => s + (p.guide_payout_amount || 0), 0) / 100;
    const exp = yearExpenses.filter(e => e.category !== "Mileage").reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const mil = yearExpenses.filter(e => e.category === "Mileage").reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const miles = yearExpenses.filter(e => e.category === "Mileage").reduce((s, e) => s + parseFloat(e.mileage || 0), 0);
    const net = gross - exp - mil;

    // Build Schedule C line totals
    const lineGroups = {};
    yearExpenses.forEach(e => {
      const mapping = SCHEDULE_C_MAP[e.category] || SCHEDULE_C_MAP["Other"];
      const key = mapping.line;
      const label = mapping.label;
      if (!lineGroups[key]) lineGroups[key] = { label, total: 0 };
      let amt = parseFloat(e.amount || 0);
      if (e.category === "Food & Meals") amt *= 0.5;
      lineGroups[key].total += amt;
    });

    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>ROM Schedule C Summary ${taxYear}</title><style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;color:#333}h1{font-size:24px;margin-bottom:4px}h2{font-size:16px;color:#666;margin-bottom:24px}h3{font-size:14px;margin-top:28px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #333}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #ddd}th{background:#f5f5f5;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.05em}td{font-size:14px}.total{font-weight:700;background:#fafafa}.note{color:#999;font-size:11px;font-style:italic}@media print{body{margin:20px}}</style></head><body>`);
    w.document.write(`<h1>R\u014CM Income Summary \u2014 ${taxYear}</h1><h2>${guide?.name || "Guide"}</h2>`);

    // Income overview
    w.document.write(`<table><tr><th>Category</th><th>Amount</th></tr>`);
    w.document.write(`<tr><td>Gross Payments Received</td><td>$${gross.toFixed(2)}</td></tr>`);
    w.document.write(`<tr><td>Business Expenses</td><td>($${exp.toFixed(2)})</td></tr>`);
    w.document.write(`<tr><td>Mileage Deduction (${miles.toFixed(1)} miles \u00D7 $${IRS_MILEAGE_RATE})</td><td>($${mil.toFixed(2)})</td></tr>`);
    w.document.write(`<tr class="total"><td>Net Income</td><td>$${net.toFixed(2)}</td></tr>`);
    w.document.write(`<tr><td>Estimated Self-Employment Tax (25%)</td><td>$${Math.max(0, net * 0.25).toFixed(2)}</td></tr>`);
    w.document.write(`</table>`);

    // Schedule C breakdown
    w.document.write(`<h3>Schedule C Line Reference</h3>`);
    w.document.write(`<table><tr><th>Line</th><th>Description</th><th>Amount</th></tr>`);
    Object.entries(lineGroups).sort((a, b) => a[0].localeCompare(b[0])).forEach(([line, data]) => {
      w.document.write(`<tr><td>${line}</td><td>${data.label}</td><td>$${data.total.toFixed(2)}</td></tr>`);
    });
    w.document.write(`</table>`);
    w.document.write(`<p class="note">Meals are shown at 50% deductible per IRS rules. Mileage uses the standard rate ($${IRS_MILEAGE_RATE}/mile). Consult your tax professional.</p>`);
    w.document.write(`<p style="color:#999;font-size:12px;margin-top:24px">Generated by R\u014CM (romlife.co) \u00B7 This is not official tax documentation. Consult your tax professional.</p></body></html>`);
    w.document.close();
    w.print();
  };

  const kpis = [
    { label: "Revenue", value: `$${totalRevenue.toLocaleString()}`, sub: "your earnings" },
    { label: "Expenses", value: `$${totalExpenses.toLocaleString()}`, sub: `${expenses.length} entries` },
    { label: "Mileage Deduction", value: `$${totalMileageDeductionKPI.toLocaleString()}`, sub: `${totalMiles.toFixed(0)} miles` },
    { label: "Net Profit", value: `$${netProfit.toLocaleString()}`, sub: "revenue - expenses", highlight: netProfit > 0 },
  ];

  const inputStyle = { width: "100%", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "8px 12px", fontFamily: FONT_BODY, fontSize: 14, color: T.parchment };
  const labelStyle = { fontFamily: FONT_BODY, fontSize: 12, color: T.silver, display: "block", marginBottom: 4 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Post-Trip Expense Prompt ── */}
      {completedNoExpenses.map(b => (
        <div key={b.id} style={{
          background: `linear-gradient(135deg, ${T.gold}18, ${T.gold}08)`,
          border: `1px solid ${T.gold}40`,
          borderRadius: 10, padding: 16,
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: T.gold }}>
                Log expenses for {b.package_title || "your trip"}
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash, marginTop: 2 }}>
                Completed {new Date(b.trip_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — no expenses logged yet
              </div>
            </div>
            <button
              onClick={() => setDismissedTrips(prev => new Set([...prev, b.id]))}
              style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 18, padding: "4px 8px" }}
              aria-label="Dismiss"
            >
              \u2715
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {QUICK_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickAdd(idx, b.id)}
                style={{
                  background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 8,
                  padding: "8px 14px", cursor: "pointer",
                  fontFamily: FONT_BODY, fontSize: 13, color: T.parchment,
                  transition: "all 0.2s",
                }}
              >
                {preset.emoji} {preset.label} (${presetAmounts[idx]})
              </button>
            ))}
            <button
              onClick={() => { setShowAddExpense(true); setNewExpense(prev => ({ ...prev, bookingId: b.id })); }}
              style={{
                background: "none", border: `1px dashed ${T.wire}`, borderRadius: 8,
                padding: "8px 14px", cursor: "pointer",
                fontFamily: FONT_BODY, fontSize: 13, color: T.silver,
              }}
            >
              Custom...
            </button>
          </div>
        </div>
      ))}

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {kpis.map(k => (
          <SectionCard key={k.label}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.08em" }}>{k.label}</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: k.highlight ? T.green : T.white, marginTop: 4 }}>{k.value}</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted, marginTop: 2 }}>{k.sub}</div>
          </SectionCard>
        ))}
      </div>

      {/* ── Expense Logger ── */}
      <SectionCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SectionHeader>Expenses</SectionHeader>
          <GoldBtn small onClick={() => setShowAddExpense(!showAddExpense)}>
            {showAddExpense ? "Cancel" : "+ Add Expense"}
          </GoldBtn>
        </div>

        {/* ── Quick-Add Presets ── */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {QUICK_PRESETS.map((preset, idx) => (
            <div key={idx} style={{ position: "relative" }}>
              <button
                onClick={() => {
                  if (quickEditIdx === idx) return;
                  handleQuickAdd(idx);
                }}
                onContextMenu={(e) => { e.preventDefault(); setQuickEditIdx(idx); setQuickEditAmt(String(presetAmounts[idx])); }}
                style={{
                  background: quickFlash === idx ? "#22c55e22" : T.steel,
                  border: `1px solid ${quickFlash === idx ? "#22c55e" : T.wire}`,
                  borderRadius: 8, padding: "10px 16px", cursor: "pointer",
                  fontFamily: FONT_BODY, fontSize: 14, color: quickFlash === idx ? "#22c55e" : T.parchment,
                  transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6,
                  minWidth: 0,
                }}
              >
                <span style={{ fontSize: 18 }}>{preset.emoji}</span>
                <span>{quickFlash === idx ? "Logged!" : `${preset.label} $${presetAmounts[idx]}`}</span>
              </button>
              {/* Inline amount editor on right-click/long-press */}
              {quickEditIdx === idx && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, zIndex: 10, marginTop: 4,
                  background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: 8,
                  display: "flex", gap: 6, alignItems: "center",
                }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.silver }}>$</span>
                  <input
                    type="number"
                    value={quickEditAmt}
                    onChange={e => setQuickEditAmt(e.target.value)}
                    style={{ width: 60, background: T.lifted, border: `1px solid ${T.wire}`, borderRadius: 4, padding: "4px 6px", fontFamily: FONT_BODY, fontSize: 13, color: T.parchment }}
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        const val = parseFloat(quickEditAmt);
                        if (val > 0) {
                          setPresetAmounts(prev => prev.map((a, i) => i === idx ? val : a));
                        }
                        setQuickEditIdx(null);
                      } else if (e.key === "Escape") {
                        setQuickEditIdx(null);
                      }
                    }}
                    onBlur={() => {
                      const val = parseFloat(quickEditAmt);
                      if (val > 0) {
                        setPresetAmounts(prev => prev.map((a, i) => i === idx ? val : a));
                      }
                      setQuickEditIdx(null);
                    }}
                  />
                </div>
              )}
            </div>
          ))}
          <button
            onClick={() => setShowAddExpense(true)}
            style={{
              background: "none", border: `1px dashed ${T.wire}`, borderRadius: 8,
              padding: "10px 16px", cursor: "pointer",
              fontFamily: FONT_BODY, fontSize: 14, color: T.silver,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <span style={{ fontSize: 16 }}>{"\u270F\uFE0F"}</span> Custom...
          </button>
        </div>

        {/* ── Full expense form ── */}
        {showAddExpense && (
          <div style={{ background: T.lifted, borderRadius: 8, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Category</label>
                <select value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })} style={inputStyle}>
                  {EXPENSE_CATEGORIES.filter(c => c !== "Mileage").map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Amount</label>
                <input type="number" step="0.01" placeholder="0.00" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Description</label>
                <input type="text" placeholder="Gas for Madison River trip" value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
              <div>
                <label style={labelStyle}>Link to Booking (optional)</label>
                <select value={newExpense.bookingId} onChange={e => setNewExpense({ ...newExpense, bookingId: e.target.value })} style={inputStyle}>
                  <option value="">General (not linked to a trip)</option>
                  {bookings.filter(b => b.status !== "cancelled").slice(0, 50).map(b => (
                    <option key={b.id} value={b.id}>
                      {new Date(b.trip_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} — {b.package_title || "Trip"}
                    </option>
                  ))}
                </select>
              </div>
              {/* Receipt capture button */}
              <div>
                <label style={labelStyle}>Receipt</label>
                <input
                  ref={receiptInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleReceiptCapture}
                  style={{ display: "none" }}
                />
                <button
                  onClick={() => receiptInputRef.current?.click()}
                  style={{
                    background: receiptPreview ? "#22c55e18" : T.steel,
                    border: `1px solid ${receiptPreview ? "#22c55e" : T.wire}`,
                    borderRadius: 6, padding: "8px 14px", cursor: "pointer",
                    fontFamily: FONT_BODY, fontSize: 13, color: receiptPreview ? "#22c55e" : T.silver,
                    display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                  }}
                >
                  {receiptPreview ? "\u2713 Receipt" : "\uD83D\uDCF7 Add Receipt"}
                </button>
              </div>
            </div>
            {receiptPreview && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img src={receiptPreview} alt="Receipt preview" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover" }} />
                <button
                  onClick={() => { setReceiptPreview(null); setNewExpense(prev => ({ ...prev, receiptUrl: "" })); }}
                  style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 12 }}
                >
                  Remove
                </button>
              </div>
            )}
            <GoldBtn small onClick={handleAddExpense}>Save Expense</GoldBtn>
          </div>
        )}

        {/* ── Expense list ── */}
        {expenses.length === 0 && !loading ? (
          <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.muted, textAlign: "center", padding: 32 }}>
            No expenses recorded yet. Start tracking to see your profit and simplify tax season.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {expenses.slice(0, 20).map(e => (
              <div key={e.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 12px", borderRadius: 6, background: T.lifted,
              }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {/* Receipt thumbnail */}
                  {e.receipt_url && (
                    <img
                      src={e.receipt_url}
                      alt="Receipt"
                      style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                    />
                  )}
                  <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: e.category === "Mileage" ? "#8ab4f8" : T.gold, textTransform: "uppercase", letterSpacing: "0.04em", minWidth: 80 }}>{e.category}</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.ash }}>
                    {e.description || "\u2014"}
                    {e.category === "Mileage" && e.mileage && (
                      <span style={{ color: T.silver, fontSize: 12, marginLeft: 8 }}>{parseFloat(e.mileage).toFixed(1)} mi</span>
                    )}
                    {e.booking_id && (() => {
                      const bk = bookings.find(b => b.id === e.booking_id);
                      return bk ? <span style={{ fontSize: 11, color: T.gold, marginLeft: 8, opacity: 0.7 }}>{bk.package_title || "Trip"}</span> : null;
                    })()}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>{e.date}</span>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: T.white }}>${parseFloat(e.amount).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Recurring Expenses ── */}
      <SectionCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SectionHeader>Recurring Expenses</SectionHeader>
          <div style={{ display: "flex", gap: 8 }}>
            {recurringTemplates.filter(t => t.active).length > 0 && (
              <GoldBtn small outline onClick={handleLogAllDue} disabled={loggingRecurring}>
                {loggingRecurring ? "Logging..." : "Log All Due"}
              </GoldBtn>
            )}
            <GoldBtn small onClick={() => setShowAddRecurring(!showAddRecurring)}>
              {showAddRecurring ? "Cancel" : "+ Add"}
            </GoldBtn>
          </div>
        </div>

        {/* Add recurring form */}
        {showAddRecurring && (
          <div style={{ background: T.lifted, borderRadius: 8, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Category</label>
                <select value={newRecurring.category} onChange={e => setNewRecurring({ ...newRecurring, category: e.target.value })} style={inputStyle}>
                  {EXPENSE_CATEGORIES.filter(c => c !== "Mileage").map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Amount</label>
                <input type="number" step="0.01" placeholder="0.00" value={newRecurring.amount} onChange={e => setNewRecurring({ ...newRecurring, amount: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Frequency</label>
                <select value={newRecurring.frequency} onChange={e => setNewRecurring({ ...newRecurring, frequency: e.target.value })} style={inputStyle}>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <input type="text" placeholder="Boat insurance, software subscription, etc." value={newRecurring.description} onChange={e => setNewRecurring({ ...newRecurring, description: e.target.value })} style={inputStyle} />
            </div>
            <GoldBtn small onClick={handleAddRecurring}>Save Template</GoldBtn>
          </div>
        )}

        {/* Recurring list */}
        {recurringTemplates.length === 0 ? (
          <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.muted, textAlign: "center", padding: 24 }}>
            No recurring expenses. Add templates for regular costs like insurance, software, or dock fees.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {recurringTemplates.map(tmpl => (
              <div key={tmpl.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 12px", borderRadius: 6, background: T.lifted,
                opacity: tmpl.active ? 1 : 0.5,
              }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.04em", minWidth: 80 }}>{tmpl.category}</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.ash }}>
                    {tmpl.description || tmpl.category}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: T.white }}>
                    ${parseFloat(tmpl.amount).toFixed(2)}{FREQUENCY_LABELS[tmpl.frequency] || "/mo"}
                  </span>
                  {tmpl.last_logged && (
                    <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted }}>
                      Last: {tmpl.last_logged}
                    </span>
                  )}
                  {/* Toggle */}
                  <button
                    onClick={() => toggleRecurring(tmpl)}
                    style={{
                      background: tmpl.active ? "#22c55e30" : T.steel,
                      border: `1px solid ${tmpl.active ? "#22c55e" : T.wire}`,
                      borderRadius: 12, width: 40, height: 22, cursor: "pointer",
                      position: "relative", transition: "all 0.2s",
                    }}
                    aria-label={tmpl.active ? "Pause" : "Resume"}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: "50%",
                      background: tmpl.active ? "#22c55e" : T.muted,
                      position: "absolute", top: 2,
                      left: tmpl.active ? 21 : 2,
                      transition: "left 0.2s",
                    }} />
                  </button>
                  <button
                    onClick={() => deleteRecurring(tmpl.id)}
                    style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 14, padding: "2px 6px" }}
                    aria-label="Delete"
                  >
                    \u2715
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── GPS Mileage Tracker ── */}
      <MileageTracker guideId={guide?.id} onTripSaved={() => setRefreshKey(k => k + 1)} />

      {/* ── Trip Profitability ── */}
      {bookings.length > 0 && (() => {
        const confirmedBookings = bookings.filter(b => b.status !== "cancelled");
        const bookingProfitData = confirmedBookings.map(b => {
          const bookingPayments = payments.filter(p => p.booking_id === b.id);
          const revenue = bookingPayments.reduce((s, p) => s + (p.guide_payout_amount || 0), 0) / 100;
          const linkedExpenses = expenses.filter(e => e.booking_id === b.id);
          const expenseTotal = linkedExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
          const net = revenue - expenseTotal;
          const margin = revenue > 0 ? (net / revenue) * 100 : 0;
          const durationHrs = parseDurationHours(b.duration || b.package_duration);
          const perHour = durationHrs && revenue > 0 ? net / durationHrs : null;
          const tripDate = new Date(b.trip_date);
          const dayOfWeek = tripDate.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          return {
            id: b.id,
            packageTitle: b.package_title || "Trip",
            tripDate: b.trip_date,
            revenue,
            expenseTotal,
            net,
            margin,
            perHour,
            durationHrs,
            isWeekend,
            hasExpenses: linkedExpenses.length > 0,
          };
        }).filter(b => b.revenue > 0);

        const unlinkedExpenses = expenses.filter(e => !e.booking_id);
        const unlinkedTotal = unlinkedExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

        const packageGroups = {};
        bookingProfitData.forEach(b => {
          const key = b.packageTitle;
          if (!packageGroups[key]) packageGroups[key] = { revenue: 0, expenses: 0, trips: 0, totalHours: 0, hasHours: false };
          packageGroups[key].revenue += b.revenue;
          packageGroups[key].expenses += b.expenseTotal;
          packageGroups[key].trips += 1;
          if (b.durationHrs) { packageGroups[key].totalHours += b.durationHrs; packageGroups[key].hasHours = true; }
        });

        const weekendTrips = bookingProfitData.filter(b => b.isWeekend);
        const weekdayTrips = bookingProfitData.filter(b => !b.isWeekend);
        const weekendRevAvg = weekendTrips.length > 0 ? weekendTrips.reduce((s, b) => s + b.net, 0) / weekendTrips.length : 0;
        const weekdayRevAvg = weekdayTrips.length > 0 ? weekdayTrips.reduce((s, b) => s + b.net, 0) / weekdayTrips.length : 0;

        const profitColor = v => v >= 0 ? "#4ade80" : "#e74c3c";

        return (
          <SectionCard>
            <SectionHeader>Trip Profitability</SectionHeader>

            {Object.keys(packageGroups).length > 1 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>By Package Type</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {Object.entries(packageGroups).sort((a, b) => (b[1].revenue - b[1].expenses) - (a[1].revenue - a[1].expenses)).map(([name, g]) => {
                    const net = g.revenue - g.expenses;
                    const margin = g.revenue > 0 ? (net / g.revenue) * 100 : 0;
                    const perHour = g.hasHours && g.totalHours > 0 ? net / g.totalHours : null;
                    return (
                      <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 6, background: T.lifted }}>
                        <div>
                          <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.parchment }}>{name}</span>
                          <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted, marginLeft: 8 }}>{g.trips} trip{g.trips !== 1 ? "s" : ""}</span>
                        </div>
                        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                          {perHour !== null && <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.gold }}>${perHour.toFixed(0)}/hr</span>}
                          <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>{margin.toFixed(0)}% margin</span>
                          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: profitColor(net) }}>${net.toFixed(0)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {weekendTrips.length > 0 && weekdayTrips.length > 0 && (
              <div style={{ marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: T.lifted, borderRadius: 8, padding: 14 }}>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.silver, textTransform: "uppercase", letterSpacing: "0.06em" }}>Weekday Avg Profit</div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: profitColor(weekdayRevAvg), marginTop: 4 }}>${weekdayRevAvg.toFixed(0)}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>{weekdayTrips.length} trip{weekdayTrips.length !== 1 ? "s" : ""}</div>
                </div>
                <div style={{ background: T.lifted, borderRadius: 8, padding: 14 }}>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.silver, textTransform: "uppercase", letterSpacing: "0.06em" }}>Weekend Avg Profit</div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: profitColor(weekendRevAvg), marginTop: 4 }}>${weekendRevAvg.toFixed(0)}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>{weekendTrips.length} trip{weekendTrips.length !== 1 ? "s" : ""}</div>
                </div>
              </div>
            )}

            <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Per Trip</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {bookingProfitData.slice(0, 20).map(b => (
                <div key={b.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 12px", borderRadius: 6, background: T.lifted,
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.parchment }}>{b.packageTitle}</span>
                      <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted }}>{new Date(b.tripDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      {b.isWeekend && <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: T.gold, background: `${T.gold}18`, padding: "1px 6px", borderRadius: 4 }}>WE</span>}
                    </div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted }}>
                      Rev ${b.revenue.toFixed(0)} — Exp ${b.expenseTotal.toFixed(0)}
                      {b.perHour !== null && <span style={{ marginLeft: 8, color: T.gold }}>${b.perHour.toFixed(0)}/hr</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: profitColor(b.net) }}>
                      {b.net >= 0 ? "+" : ""}${b.net.toFixed(0)}
                    </span>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: profitColor(b.net), opacity: 0.7 }}>{b.margin.toFixed(0)}% margin</span>
                  </div>
                </div>
              ))}

              {unlinkedTotal > 0 && (
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 12px", borderRadius: 6, background: T.steel, borderLeft: `3px solid ${T.muted}`,
                }}>
                  <div>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.silver }}>General Business</span>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted, marginLeft: 8 }}>{unlinkedExpenses.length} expense{unlinkedExpenses.length !== 1 ? "s" : ""} not linked to trips</span>
                  </div>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: "#e74c3c" }}>-${unlinkedTotal.toFixed(0)}</span>
                </div>
              )}
            </div>

            {bookingProfitData.length === 0 && (
              <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.muted, textAlign: "center", padding: 24 }}>
                No paid bookings yet. Profitability data will appear once payments come through.
              </div>
            )}
          </SectionCard>
        );
      })()}

      {/* Tax Summary */}
      <SectionCard>
        <SectionHeader>Tax Summary (YTD)</SectionHeader>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>Gross Income</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.white }}>${totalRevenue.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>Business Expenses</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.white }}>${nonMileageExpenses.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>Mileage Deduction</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: "#8ab4f8" }}>${totalMileageDeduction.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>Est. Tax (25%)</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.gold }}>${Math.round(Math.max(0, netProfit * 0.25)).toLocaleString()}</div>
          </div>
        </div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted, marginTop: 12 }}>
          Quarterly estimated payment: ${Math.round(Math.max(0, netProfit * 0.25) / 4).toLocaleString()} · Net profit: ${netProfit.toLocaleString()}
        </div>
      </SectionCard>

      {/* ── Tax Documents (Schedule C) ── */}
      <SectionCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SectionHeader>Tax Documents</SectionHeader>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select value={taxYear} onChange={e => setTaxYear(parseInt(e.target.value))} style={{ background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "6px 12px", fontFamily: FONT_BODY, fontSize: 13, color: T.parchment }}>
              {[2026, 2025, 2024].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div style={{ background: T.lifted, borderRadius: 8, padding: 20, marginBottom: 16 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.ash, lineHeight: 1.6, marginBottom: 16 }}>
            Download your Schedule C-ready income summary. Expenses are mapped to IRS line items, with meals at 50% deductibility. Includes quarterly breakdown and mileage deductions.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <GoldBtn full onClick={generateScheduleCCSV}>Download Schedule C Summary (CSV)</GoldBtn>
            <GoldBtn full outline onClick={printScheduleCSummary}>Print Summary</GoldBtn>
          </div>
        </div>

        {/* Schedule C line preview */}
        {(() => {
          const yearExpensesPreview = expenses.filter(e => new Date(e.date).getFullYear() === taxYear);
          if (yearExpensesPreview.length === 0) return null;

          const lineGroups = {};
          yearExpensesPreview.forEach(e => {
            const mapping = SCHEDULE_C_MAP[e.category] || SCHEDULE_C_MAP["Other"];
            const key = mapping.line;
            if (!lineGroups[key]) lineGroups[key] = { label: mapping.label, total: 0 };
            let amt = parseFloat(e.amount || 0);
            if (e.category === "Food & Meals") amt *= 0.5;
            lineGroups[key].total += amt;
          });

          return (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Schedule C Breakdown</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {Object.entries(lineGroups).sort((a, b) => a[0].localeCompare(b[0])).map(([line, data]) => (
                  <div key={line} style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px", borderRadius: 4, background: T.lifted }}>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash }}>
                      <span style={{ color: T.gold, marginRight: 8 }}>{line}</span>
                      {data.label}
                    </span>
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: 14, color: T.white }}>${data.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted, marginTop: 6 }}>
                Meals shown at 50% deductible. Mileage uses standard rate (${IRS_MILEAGE_RATE}/mi).
              </div>
            </div>
          );
        })()}

        <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted, lineHeight: 1.5 }}>
          This summary is for your records only. Consult your tax professional for filing.
        </div>
      </SectionCard>
    </div>
  );
}
