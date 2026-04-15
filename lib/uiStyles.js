export const hero = {
  position: "relative",
  padding: "56px 24px 80px",
  background: "linear-gradient(135deg, #016837 0%, #00996D 45%, #00B380 100%)",
  color: "#fff",
  textAlign: "center",
  overflow: "hidden",
};

export const heroEyebrow = {
  display: "inline-block",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  padding: "8px 16px",
  border: "1px solid rgba(255,255,255,0.35)",
  borderRadius: 100,
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(8px)",
  marginBottom: 16,
};

export const heroTitle = {
  fontSize: "clamp(26px, 3.6vw, 40px)",
  fontWeight: 800,
  lineHeight: 1.25,
  letterSpacing: "-0.01em",
  marginBottom: 10,
};

export const heroSubtitle = {
  fontSize: 14,
  fontWeight: 400,
  lineHeight: 1.7,
  opacity: 0.92,
};

export const pageWrap = {
  maxWidth: 640,
  margin: "0 auto",
  padding: "28px 20px 80px",
};

export const card = {
  background: "#fff",
  borderRadius: 18,
  padding: 28,
  boxShadow: "0 14px 36px rgba(15,23,42,0.08)",
  border: "1px solid rgba(15,23,42,0.06)",
};

export const label = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#334155",
  marginBottom: 6,
};

export const input = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#fff",
  fontSize: 15,
  color: "#0f172a",
  outline: "none",
  fontFamily: "inherit",
};

// ─── Liquid Glass base ───────────────────────────────
const glassBase = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontFamily: "inherit",
  fontWeight: 700,
  textDecoration: "none",
  whiteSpace: "nowrap",
  border: "1px solid rgba(255,255,255,0.35)",
  backdropFilter: "blur(14px) saturate(140%)",
  WebkitBackdropFilter: "blur(14px) saturate(140%)",
  boxShadow:
    "0 6px 6px rgba(0,0,0,0.08), 0 0 20px rgba(0,0,0,0.04), inset 1.5px 1.5px 0.5px 0 rgba(255,255,255,0.65), inset -1px -1px 0.5px 1px rgba(255,255,255,0.35)",
  transition: "transform 0.4s cubic-bezier(0.175,0.885,0.32,2.2), box-shadow 0.4s ease, background 0.3s ease",
};

// Primary (green tint, solid background for contrast on white cards)
export const primaryBtn = {
  ...glassBase,
  width: "100%",
  padding: "14px 22px",
  borderRadius: 16,
  fontSize: 15,
  color: "#fff",
  background:
    "linear-gradient(135deg, rgba(0,153,109,0.95) 0%, rgba(0,179,128,0.92) 100%)",
  border: "1px solid rgba(255,255,255,0.45)",
  boxShadow:
    "0 10px 24px rgba(0,153,109,0.3), inset 1.5px 1.5px 0.5px 0 rgba(255,255,255,0.5), inset -1px -1px 0.5px 1px rgba(255,255,255,0.25)",
};

// Kakao (yellow brand with subtle glass highlights)
export const kakaoBtn = {
  ...glassBase,
  width: "100%",
  padding: "14px 22px",
  borderRadius: 16,
  gap: 8,
  fontSize: 15,
  color: "#191919",
  background: "#FEE500",
  border: "1px solid rgba(0,0,0,0.08)",
  boxShadow:
    "0 10px 22px rgba(254,229,0,0.45), inset 1.5px 1.5px 0.5px 0 rgba(255,255,255,0.7), inset -1px -1px 0.5px 1px rgba(0,0,0,0.05)",
};

// Ghost pill (neutral translucent) — for 홈으로/취소/로그아웃 등
export const ghostBtn = {
  ...glassBase,
  padding: "10px 18px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  color: "#0f172a",
  background: "rgba(255,255,255,0.55)",
  border: "1px solid rgba(255,255,255,0.7)",
};

// Primary pill (green accent)
export const primaryPill = {
  ...glassBase,
  padding: "10px 18px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
  color: "#fff",
  background:
    "linear-gradient(135deg, rgba(0,153,109,0.95) 0%, rgba(0,179,128,0.92) 100%)",
  border: "1px solid rgba(255,255,255,0.4)",
  boxShadow:
    "0 6px 16px rgba(0,153,109,0.32), inset 1.5px 1.5px 0.5px 0 rgba(255,255,255,0.5), inset -1px -1px 0.5px 1px rgba(255,255,255,0.2)",
};

// Dark overlay pill (for iframe overlay on homepage)
export const overlayPill = {
  ...glassBase,
  padding: "10px 18px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  color: "#fff",
  background: "rgba(0,0,0,0.25)",
  border: "1px solid rgba(255,255,255,0.25)",
};

export const sectionTitle = {
  fontSize: 18,
  fontWeight: 700,
  color: "#0f172a",
  marginBottom: 14,
};

export const badge = (color) => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
  ...color,
});

export const badgeGreen = { background: "#dcfce7", color: "#166534" };
export const badgeGray = { background: "#f1f5f9", color: "#94a3b8" };
export const badgePurple = { background: "#f3e8ff", color: "#7e22ce" };
export const badgeBlue = { background: "#dbeafe", color: "#1d4ed8" };
