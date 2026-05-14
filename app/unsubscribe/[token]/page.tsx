// Public unsubscribe page. The token is generated when the subscriber row is
// created (see migration 029). One-click — landing on this page marks the row
// unsubscribed. No auth required.

import { getSupabaseAdmin } from "@/app/lib/supabase-server";

interface Params {
  params: Promise<{ token: string }>;
}

async function unsubscribe(token: string): Promise<{ ok: boolean; email?: string; alreadyDone?: boolean }> {
  const admin = getSupabaseAdmin();
  const { data } = await admin.from("email_subscribers")
    .select("id, email, unsubscribed_at")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (!data) return { ok: false };
  if (data.unsubscribed_at) return { ok: true, email: data.email, alreadyDone: true };

  await admin.from("email_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() } as never)
    .eq("id", data.id);

  return { ok: true, email: data.email };
}

export default async function UnsubscribePage({ params }: Params) {
  const { token } = await params;
  const result = await unsubscribe(token);

  return (
    <div style={{ minHeight: "100vh", background: "#e8e5df", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Barlow', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 480, background: "#faf9f6", borderRadius: 8, padding: "40px 32px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, color: "#c9973a", letterSpacing: "0.16em", marginBottom: 24 }}>RŌM</div>
        {result.ok ? (
          <>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28, color: "#1a1a1a", fontWeight: 400, margin: "0 0 12px" }}>
              {result.alreadyDone ? "You're already unsubscribed" : "You've been unsubscribed"}
            </h1>
            <p style={{ fontSize: 14, color: "#5a5a5a", lineHeight: 1.6, margin: "0 0 16px" }}>
              {result.email ? <>No more emails to <strong>{result.email}</strong>.</> : "We won't email you again."}
            </p>
            <p style={{ fontSize: 13, color: "#8a8a8a", lineHeight: 1.5, margin: 0 }}>
              If this was a mistake, just reach out to your guide directly and they can re-add you.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28, color: "#1a1a1a", fontWeight: 400, margin: "0 0 12px" }}>
              Link not recognized
            </h1>
            <p style={{ fontSize: 14, color: "#5a5a5a", lineHeight: 1.6, margin: 0 }}>
              This unsubscribe link doesn't match any of our records. If you keep getting emails you don't want, reply directly to the message and we'll handle it manually.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
