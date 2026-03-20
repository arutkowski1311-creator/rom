"use client";
import { useState, useEffect } from "react";
import { T, FONT_DISPLAY, FONT_BODY, getTierConfig } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";
import { GoldBtn, SectionCard, SectionHeader } from "@/app/components/ui";

const EXPENSE_CATEGORIES = [
  "Fuel", "Gear", "Food & Meals", "Insurance", "Vehicle", "License & Permits",
  "Supplies", "Marketing", "Software", "Mileage", "Other",
];

const IRS_MILEAGE_RATE = 0.70; // 2025 IRS standard mileage rate

function getQuarter(dateStr) {
  const m = new Date(dateStr).getMonth();
  if (m < 3) return "Q1";
  if (m < 6) return "Q2";
  if (m < 9) return "Q3";
  return "Q4";
}

export default function FinancesTab({ guide }) {
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ category: "Fuel", amount: "", description: "", date: new Date().toISOString().split("T")[0] });
  const [loading, setLoading] = useState(true);

  // Mileage
  const [showAddMileage, setShowAddMileage] = useState(false);
  const [newMileage, setNewMileage] = useState({ description: "", miles: "", date: new Date().toISOString().split("T")[0] });

  // 1099
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!guide?.id) return;
    const supabase = getSupabase();
    Promise.all([
      supabase.from("payments").select("*").eq("guide_id", guide.id).eq("status", "succeeded").order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").eq("guide_id", guide.id).order("date", { ascending: false }),
    ]).then(([paymentsRes, expensesRes]) => {
      setPayments(paymentsRes.data || []);
      setExpenses(expensesRes.data || []);
      setLoading(false);
    });
  }, [guide?.id]);

  const totalRevenue = payments.reduce((sum, p) => sum + (p.guide_payout_amount || 0), 0) / 100;
  const totalCommission = payments.reduce((sum, p) => sum + (p.commission_amount || 0), 0) / 100;
  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const tier = getTierConfig(guide?.subscription_tier);

  // Mileage calculations
  const mileageEntries = expenses.filter(e => e.category === "Mileage");
  const totalMiles = mileageEntries.reduce((sum, e) => sum + parseFloat(e.mileage || 0), 0);
  const totalMileageDeduction = mileageEntries.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const nonMileageExpenses = totalExpenses - totalMileageDeduction;

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
        }),
      });
      const data = await res.json();
      if (data.expense) {
        setExpenses([data.expense, ...expenses]);
        setNewExpense({ category: "Fuel", amount: "", description: "", date: new Date().toISOString().split("T")[0] });
        setShowAddExpense(false);
      }
    } catch (err) {
      console.error("Add expense error:", err);
    }
  };

  const handleAddMileage = async () => {
    if (!newMileage.miles || !newMileage.date) return;
    const miles = parseFloat(newMileage.miles);
    const amount = Math.round(miles * IRS_MILEAGE_RATE * 100) / 100;
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideId: guide.id,
          category: "Mileage",
          amount,
          description: newMileage.description || `${miles} miles`,
          date: newMileage.date,
          mileage: miles,
          mileage_rate: IRS_MILEAGE_RATE,
        }),
      });
      const data = await res.json();
      if (data.expense) {
        setExpenses([data.expense, ...expenses]);
        setNewMileage({ description: "", miles: "", date: new Date().toISOString().split("T")[0] });
        setShowAddMileage(false);
      }
    } catch (err) {
      console.error("Add mileage error:", err);
    }
  };

  // 1099 Export
  const generate1099CSV = () => {
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

    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ROM_1099_Summary_${taxYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpis = [
    { label: "Revenue", value: `$${totalRevenue.toLocaleString()}`, sub: "after commission" },
    { label: "Commission Paid", value: `$${totalCommission.toLocaleString()}`, sub: `${Math.round(tier.commissionRate * 100)}% rate` },
    { label: "Expenses", value: `$${totalExpenses.toLocaleString()}`, sub: `${expenses.length} entries` },
    { label: "Net Profit", value: `$${netProfit.toLocaleString()}`, sub: "revenue - expenses", highlight: netProfit > 0 },
  ];

  const inputStyle = { width: "100%", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "8px 12px", fontFamily: FONT_BODY, fontSize: 14, color: T.parchment };
  const labelStyle = { fontFamily: FONT_BODY, fontSize: 12, color: T.silver, display: "block", marginBottom: 4 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
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

      {/* Expense Logger */}
      <SectionCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SectionHeader>Expenses</SectionHeader>
          <GoldBtn small onClick={() => { setShowAddExpense(!showAddExpense); setShowAddMileage(false); }}>
            {showAddExpense ? "Cancel" : "+ Add Expense"}
          </GoldBtn>
        </div>

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
            <GoldBtn small onClick={handleAddExpense}>Save Expense</GoldBtn>
          </div>
        )}

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
                  <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: e.category === "Mileage" ? "#8ab4f8" : T.gold, textTransform: "uppercase", letterSpacing: "0.04em", minWidth: 80 }}>{e.category}</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.ash }}>
                    {e.description || "—"}
                    {e.category === "Mileage" && e.mileage && (
                      <span style={{ color: T.silver, fontSize: 12, marginLeft: 8 }}>{parseFloat(e.mileage).toFixed(1)} mi</span>
                    )}
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

      {/* ── Mileage Tracker ── */}
      <SectionCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SectionHeader>Mileage Tracker</SectionHeader>
          <GoldBtn small onClick={() => { setShowAddMileage(!showAddMileage); setShowAddExpense(false); }}>
            {showAddMileage ? "Cancel" : "+ Log Trip"}
          </GoldBtn>
        </div>

        {/* Mileage KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div style={{ background: T.lifted, borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Miles YTD</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: T.white, marginTop: 4 }}>{totalMiles.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
          </div>
          <div style={{ background: T.lifted, borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.06em" }}>Mileage Deduction</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: T.gold, marginTop: 4 }}>${totalMileageDeduction.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>
          <div style={{ background: T.lifted, borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.silver, textTransform: "uppercase", letterSpacing: "0.06em" }}>IRS Rate</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: T.ash, marginTop: 4 }}>${IRS_MILEAGE_RATE}/mi</div>
          </div>
        </div>

        {showAddMileage && (
          <div style={{ background: T.lifted, borderRadius: 8, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 12, border: `1px solid ${T.wire}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Miles Driven</label>
                <input type="number" step="0.1" placeholder="42.5" value={newMileage.miles} onChange={e => setNewMileage({ ...newMileage, miles: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" value={newMileage.date} onChange={e => setNewMileage({ ...newMileage, date: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Trip Description</label>
              <input type="text" placeholder="Madison River shuttle, client pickup, gear drop-off…" value={newMileage.description} onChange={e => setNewMileage({ ...newMileage, description: e.target.value })} style={inputStyle} />
            </div>
            {newMileage.miles && (
              <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.gold, fontWeight: 600 }}>
                = ${(parseFloat(newMileage.miles) * IRS_MILEAGE_RATE).toFixed(2)} deduction at ${IRS_MILEAGE_RATE}/mile
              </div>
            )}
            <GoldBtn small onClick={handleAddMileage}>Log Mileage</GoldBtn>
          </div>
        )}

        {/* Recent mileage entries */}
        {mileageEntries.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {mileageEntries.slice(0, 10).map(e => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 6, background: T.lifted }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: "#8ab4f8", fontWeight: 600, minWidth: 60 }}>{parseFloat(e.mileage || 0).toFixed(1)} mi</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ash }}>{e.description || "Trip"}</span>
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>{e.date}</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.gold, fontWeight: 600 }}>${parseFloat(e.amount).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.muted, textAlign: "center", padding: 16 }}>
            No mileage logged yet. Log your first trip to start tracking deductions.
          </div>
        )}
      </SectionCard>

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

      {/* ── 1099 Export ── */}
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
            Download your annual income summary for tax filing. Includes gross payments, expenses by quarter, mileage deductions, and estimated tax liability.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <GoldBtn full onClick={generate1099CSV}>Download 1099 Summary (CSV)</GoldBtn>
            <GoldBtn full outline onClick={() => {
              // Print-friendly summary
              const yearPayments = payments.filter(p => new Date(p.created_at).getFullYear() === taxYear);
              const yearExpenses = expenses.filter(e => new Date(e.date).getFullYear() === taxYear);
              const gross = yearPayments.reduce((s, p) => s + (p.guide_payout_amount || 0), 0) / 100;
              const exp = yearExpenses.filter(e => e.category !== "Mileage").reduce((s, e) => s + parseFloat(e.amount || 0), 0);
              const mil = yearExpenses.filter(e => e.category === "Mileage").reduce((s, e) => s + parseFloat(e.amount || 0), 0);
              const miles = yearExpenses.filter(e => e.category === "Mileage").reduce((s, e) => s + parseFloat(e.mileage || 0), 0);
              const net = gross - exp - mil;

              const w = window.open("", "_blank");
              w.document.write(`<html><head><title>ROM 1099 Summary ${taxYear}</title><style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;color:#333}h1{font-size:24px;margin-bottom:4px}h2{font-size:16px;color:#666;margin-bottom:24px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #ddd}th{background:#f5f5f5;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.05em}td{font-size:14px}.total{font-weight:700;background:#fafafa}@media print{body{margin:20px}}</style></head><body>`);
              w.document.write(`<h1>RŌM Income Summary — ${taxYear}</h1><h2>${guide?.name || "Guide"}</h2>`);
              w.document.write(`<table><tr><th>Category</th><th>Amount</th></tr>`);
              w.document.write(`<tr><td>Gross Payments Received</td><td>$${gross.toFixed(2)}</td></tr>`);
              w.document.write(`<tr><td>Business Expenses</td><td>($${exp.toFixed(2)})</td></tr>`);
              w.document.write(`<tr><td>Mileage Deduction (${miles.toFixed(1)} miles × $${IRS_MILEAGE_RATE})</td><td>($${mil.toFixed(2)})</td></tr>`);
              w.document.write(`<tr class="total"><td>Net Income</td><td>$${net.toFixed(2)}</td></tr>`);
              w.document.write(`<tr><td>Estimated Tax (25%)</td><td>$${Math.max(0, net * 0.25).toFixed(2)}</td></tr>`);
              w.document.write(`</table><p style="color:#999;font-size:12px;margin-top:24px">Generated by RŌM (romlife.co) · This is not official tax documentation. Consult your tax professional.</p></body></html>`);
              w.document.close();
              w.print();
            }}>Print Summary</GoldBtn>
          </div>
        </div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.muted, lineHeight: 1.5 }}>
          This summary is for your records only. RŌM will issue an official 1099-K if your annual gross payments exceed IRS thresholds. Consult your tax professional for filing.
        </div>
      </SectionCard>
    </div>
  );
}
