export const hero = {
  position: "relative",
  padding: "14px 24px 16px",
  background: "linear-gradient(135deg, #7c2d12 0%, #ea580c 45%, #f97316 100%)",
  color: "#fff",
  textAlign: "center",
  overflow: "hidden",
};

export const heroEyebrow = {
  display: "inline-block",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  padding: "5px 13px",
  border: "1px solid rgba(255,255,255,0.35)",
  borderRadius: 100,
  background: "rgba(255,255,255,0.12)",
  backdropFilter: "blur(8px)",
  marginBottom: 8,
};

export const heroTitle = {
  fontSize: "clamp(20px, 2.6vw, 30px)",
  fontWeight: 800,
  lineHeight: 1.2,
  letterSpacing: "-0.01em",
  marginBottom: 4,
};

export const heroSubtitle = {
  fontSize: 13,
  fontWeight: 400,
  lineHeight: 1.55,
  opacity: 0.92,
};

export const pageWrap = {
  maxWidth: 640,
  margin: "0 auto",
  padding: "28px 20px 80px",
};

export const card = {
  background: "#1f1d26",
  borderRadius: 18,
  padding: 28,
  boxShadow: "0 14px 36px rgba(0,0,0,0.4)",
  border: "1px solid rgba(255,255,255,0.08)",
};

export const label = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#cbc8d2",
  marginBottom: 6,
};

export const input = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #34323d",
  background: "#26242e",
  fontSize: 15,
  color: "#f5f4f7",
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
  border: "1px solid rgba(255,255,255,0.12)",
  backdropFilter: "blur(14px) saturate(140%)",
  WebkitBackdropFilter: "blur(14px) saturate(140%)",
  boxShadow:
    "0 6px 16px rgba(0,0,0,0.35), inset 1.5px 1.5px 0.5px 0 rgba(255,255,255,0.12), inset -1px -1px 0.5px 1px rgba(255,255,255,0.06)",
  transition: "transform 0.4s cubic-bezier(0.175,0.885,0.32,2.2), box-shadow 0.4s ease, background 0.3s ease",
};

// Primary (orange tint, solid background for contrast on dark cards)
export const primaryBtn = {
  ...glassBase,
  width: "100%",
  padding: "14px 22px",
  borderRadius: 16,
  fontSize: 15,
  color: "#1a1206",
  background:
    "linear-gradient(135deg, #fb923c 0%, #f97316 100%)",
  border: "1px solid rgba(255,255,255,0.2)",
  boxShadow:
    "0 10px 24px rgba(249,115,22,0.32), inset 1.5px 1.5px 0.5px 0 rgba(255,255,255,0.3), inset -1px -1px 0.5px 1px rgba(255,255,255,0.15)",
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
  color: "#f5f4f7",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.14)",
};

// Primary pill (orange accent)
export const primaryPill = {
  ...glassBase,
  padding: "10px 18px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
  color: "#1a1206",
  background:
    "linear-gradient(135deg, #fb923c 0%, #f97316 100%)",
  border: "1px solid rgba(255,255,255,0.18)",
  boxShadow:
    "0 6px 16px rgba(249,115,22,0.32), inset 1.5px 1.5px 0.5px 0 rgba(255,255,255,0.3), inset -1px -1px 0.5px 1px rgba(255,255,255,0.12)",
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
  color: "#f5f4f7",
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

export const badgeGreen = { background: "rgba(249,115,22,0.18)", color: "#fb923c" };
export const badgeGray = { background: "#26242e", color: "#a8a4b2" };
export const badgePurple = { background: "rgba(244,63,94,0.16)", color: "#fb7185" };
export const badgeBlue = { background: "rgba(59,130,246,0.18)", color: "#93c5fd" };
