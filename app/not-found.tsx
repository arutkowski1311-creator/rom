export default function NotFound() {
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
        fontSize: 48,
        color: "#f5f2ee",
        fontWeight: 300,
        textAlign: "center",
      }}>
        Page not found
      </h1>
      <p style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 15,
        color: "#8a8a8a",
        textAlign: "center",
        lineHeight: 1.6,
        maxWidth: 400,
      }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <a
        href="/"
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
          textDecoration: "none",
        }}
      >
        Go Home
      </a>
    </div>
  );
}
