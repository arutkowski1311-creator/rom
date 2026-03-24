"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#080a0b",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 20,
      padding: 40,
    }}>
      <div style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: 28,
        color: "#C9A55C",
        letterSpacing: "0.14em",
      }}>
        RŌM
      </div>
      <h1 style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: 36,
        color: "#f5f2ee",
        fontWeight: 300,
        textAlign: "center",
      }}>
        Something went wrong
      </h1>
      <p style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 15,
        color: "#8a8a8a",
        textAlign: "center",
        lineHeight: 1.6,
        maxWidth: 400,
      }}>
        We hit an unexpected error. This has been logged and we're looking into it.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={reset}
          style={{
            background: "#C9A55C",
            border: "none",
            borderRadius: 6,
            padding: "12px 24px",
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 14,
            fontWeight: 700,
            color: "#0a0c0d",
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
        <button
          onClick={() => (window.location.href = "/")}
          style={{
            background: "transparent",
            border: "1px solid #2a2a2a",
            borderRadius: 6,
            padding: "12px 24px",
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 14,
            color: "#8a8a8a",
            cursor: "pointer",
          }}
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
