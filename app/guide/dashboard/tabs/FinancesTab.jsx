"use client";
import { useState, useEffect } from "react";
import { T, FONT_DISPLAY, FONT_BODY, getTierConfig } from "@/app/lib/theme";
import { getSupabase } from "@/app/lib/supabase-browser";
import { GoldBtn, SectionCard, SectionHeader } from "@/app/components/ui";

const EXPENSE_CATEGORIES = [
  "Fuel", "Gear", "Food & Meals", "Insurance", "Vehicle", "License & Permits",
  "Supplies", "Marketing", "Software", "Mileage", "Other",
];

export default function FinancesTab({ guide }) {
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ category: "Fuel", amount: "", description: "", date: new Date().toISOString().split("T")[0] });
  const [loading, setLoading] = useState(true);

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

  const kpis = [
    { label: "Revenue", value: `$${totalRevenue.toLocaleString()}`, sub: "after commission" },
    { label: "Commission Paid", value: `$${totalCommission.toLocaleString()}`, sub: `${Math.round(tier.commissionRate * 100)}% rate` },
    { label: "Expenses", value: `$${totalExpenses.toLocaleString()}`, sub: `${expenses.length} entries` },
    { label: "Net Profit", value: `$${netProfit.toLocaleString()}`, sub: "revenue - expenses", highlight: netProfit > 0 },
  ];

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
          <GoldBtn small onClick={() => setShowAddExpense(!showAddExpense)}>
            {showAddExpense ? "Cancel" : "+ Add Expense"}
          </GoldBtn>
        </div>

        {showAddExpense && (
          <div style={{ background: T.lifted, borderRadius: 8, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.silver, display: "block", marginBottom: 4 }}>Category</label>
                <select
                  value={newExpense.category}
                  onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                  style={{ width: "100%", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "8px 12px", fontFamily: FONT_BODY, fontSize: 14, color: T.parchment }}
                >
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.silver, display: "block", marginBottom: 4 }}>Amount</label>
                <input
                  type="number" step="0.01" placeholder="0.00"
                  value={newExpense.amount}
                  onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                  style={{ width: "100%", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "8px 12px", fontFamily: FONT_BODY, fontSize: 14, color: T.parchment }}
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.silver, display: "block", marginBottom: 4 }}>Description</label>
                <input
                  type="text" placeholder="Gas for Madison River trip"
                  value={newExpense.description}
                  onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                  style={{ width: "100%", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "8px 12px", fontFamily: FONT_BODY, fontSize: 14, color: T.parchment }}
                />
              </div>
              <div>
                <label style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.silver, display: "block", marginBottom: 4 }}>Date</label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                  style={{ width: "100%", background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6, padding: "8px 12px", fontFamily: FONT_BODY, fontSize: 14, color: T.parchment }}
                />
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
                  <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.04em", minWidth: 80 }}>{e.category}</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.ash }}>{e.description || "—"}</span>
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

      {/* Tax Summary */}
      <SectionCard>
        <SectionHeader>Tax Summary (YTD)</SectionHeader>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>Gross Income</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.white }}>${totalRevenue.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>Deductions</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.white }}>${totalExpenses.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted }}>Estimated Tax (25%)</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.gold }}>${Math.round(Math.max(0, netProfit * 0.25)).toLocaleString()}</div>
          </div>
        </div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.muted, marginTop: 12 }}>
          Quarterly estimated payment due: ${Math.round(Math.max(0, netProfit * 0.25) / 4).toLocaleString()}
        </div>
      </SectionCard>
    </div>
  );
}
