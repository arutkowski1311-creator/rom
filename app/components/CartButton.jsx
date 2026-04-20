"use client";
import { T, FONT_BODY } from "@/app/lib/theme";
import { useCart } from "@/app/lib/cart-context";

export default function CartButton() {
  const { itemCount, setSidebarOpen } = useCart();

  if (itemCount === 0) return null;

  return (
    <button
      onClick={() => setSidebarOpen(true)}
      style={{
        position: "relative", background: T.steel, border: `1px solid ${T.wire}`,
        borderRadius: 8, padding: "8px 14px", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 8,
        fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: T.parchment,
        transition: "all 0.15s",
      }}
    >
      <span style={{ fontSize: 16 }}>&#128722;</span>
      <span>{itemCount}</span>
      <span style={{
        position: "absolute", top: -4, right: -4,
        width: 18, height: 18, borderRadius: "50%",
        background: T.gold, color: T.ink,
        fontFamily: FONT_BODY, fontSize: 10, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {itemCount}
      </span>
    </button>
  );
}
