"use client";
import { T, FONT_DISPLAY, FONT_BODY } from "@/app/lib/theme";
import { useCart } from "@/app/lib/cart-context";

const TYPE_LABELS = { guide: "Guide Experience", property: "Property Stay", rental: "Rental" };
const TYPE_COLORS = { guide: T.gold, property: T.green, rental: T.blue };

function CartItem({ item, onRemove }) {
  const name = item.type === "guide" ? item.guideName
    : item.type === "property" ? item.propertyName
    : item.rentalName;

  const subtitle = item.type === "guide"
    ? `${item.packageTitle} · ${item.date} · ${item.guests} guest${item.guests !== 1 ? "s" : ""}`
    : item.type === "property"
    ? `${item.checkIn} → ${item.checkOut} · ${item.guests} guest${item.guests !== 1 ? "s" : ""}`
    : `${item.rentalDate} · ${item.duration === "half_day" ? "Half day" : "Full day"}`;

  const price = item.type === "guide" ? item.totalPrice : item.total;

  return (
    <div style={{
      background: T.steel, border: `1px solid ${T.wire}`, borderLeft: `3px solid ${TYPE_COLORS[item.type]}`,
      borderRadius: 8, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700, color: TYPE_COLORS[item.type], textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {TYPE_LABELS[item.type]}
          </span>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: T.white, marginTop: 4 }}>{name}</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.silver, marginTop: 2 }}>{subtitle}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: T.gold }}>${(price / 100).toFixed(0)}</div>
        </div>
      </div>
      <button onClick={onRemove} style={{
        alignSelf: "flex-start", background: "none", border: "none",
        fontFamily: FONT_BODY, fontSize: 11, color: T.muted, cursor: "pointer", padding: 0,
      }}>Remove</button>
    </div>
  );
}

export default function CartSidebar() {
  const { items, sidebarOpen, setSidebarOpen, removeItem, cartTotal, tripName, setTripName } = useCart();

  if (!sidebarOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={() => setSidebarOpen(false)} style={{ flex: 1, background: "rgba(0,0,0,0.7)" }} />
      <div style={{
        width: "100%", maxWidth: 420, background: T.carbon, borderLeft: `1px solid ${T.wire}`,
        height: "100vh", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px", borderBottom: `1px solid ${T.wire}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.white }}>Your Trip</div>
          <button onClick={() => setSidebarOpen(false)} style={{
            background: T.steel, border: `1px solid ${T.wire}`, borderRadius: 6,
            color: T.ash, width: 36, height: 36, cursor: "pointer", fontSize: 18,
          }}>x</button>
        </div>

        {/* Trip name */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${T.wire}` }}>
          <input
            value={tripName}
            onChange={e => setTripName(e.target.value)}
            placeholder="Name your trip (optional)"
            style={{
              width: "100%", boxSizing: "border-box", background: T.steel, border: `1px solid ${T.wire}`,
              borderRadius: 6, padding: "10px 14px", fontFamily: FONT_BODY, fontSize: 14,
              color: T.parchment, outline: "none",
            }}
          />
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: T.silver, marginBottom: 8 }}>Cart is empty</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.muted }}>Browse guides, properties, or rentals to start building your trip.</div>
            </div>
          ) : (
            items.map(item => (
              <CartItem key={item._cartId} item={item} onRemove={() => removeItem(item._cartId)} />
            ))
          )}
        </div>

        {/* Conflict warning */}
        {(() => {
          const guideItems = items.filter(i => i.type === "guide" && i.date);
          const dateGroups = {};
          guideItems.forEach(i => { dateGroups[i.date] = (dateGroups[i.date] || []).concat(i); });
          const hasConflict = Object.values(dateGroups).some(g => g.length > 1);
          if (!hasConflict) return null;
          return (
            <div style={{ padding: "10px 24px", background: T.goldGlow, borderTop: `1px solid ${T.gold}` }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.gold }}>
                Scheduling overlap detected — multiple guides on same date
              </div>
            </div>
          );
        })()}

        {/* Footer */}
        {items.length > 0 && (
          <div style={{ padding: "20px 24px", borderTop: `1px solid ${T.wire}`, background: T.void }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.silver }}>Estimated Total</span>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: T.gold }}>${(cartTotal / 100).toFixed(0)}</span>
            </div>
            <button
              onClick={() => { setSidebarOpen(false); window.location.href = "/cart/checkout"; }}
              style={{
                width: "100%", background: T.gold, color: T.ink, border: "none", borderRadius: 6,
                padding: "14px 0", fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, cursor: "pointer",
              }}>
              Checkout ({items.length} item{items.length !== 1 ? "s" : ""})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
