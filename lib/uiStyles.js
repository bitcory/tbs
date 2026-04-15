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

export const primaryBtn = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  padding: "14px 18px",
  borderRadius: 14,
  background: "linear-gradient(135deg, #00996D 0%, #00B380 100%)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 15,
  border: "none",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(0,153,109,0.28)",
};

export const kakaoBtn = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  width: "100%",
  padding: "14px 18px",
  borderRadius: 14,
  background: "#FEE500",
  color: "#191919",
  fontWeight: 700,
  fontSize: 15,
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
};

export const ghostBtn = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 16px",
  borderRadius: 999,
  background: "#fff",
  color: "#0f172a",
  fontWeight: 600,
  fontSize: 13,
  border: "1px solid #e2e8f0",
  cursor: "pointer",
  textDecoration: "none",
};

export const primaryPill = {
  ...ghostBtn,
  background: "linear-gradient(135deg, #00996D 0%, #00B380 100%)",
  color: "#fff",
  border: "none",
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
  ...color,
});

export const badgeGreen = { background: "#dcfce7", color: "#166534" };
export const badgeGray = { background: "#f1f5f9", color: "#94a3b8" };
export const badgePurple = { background: "#f3e8ff", color: "#7e22ce" };
export const badgeBlue = { background: "#dbeafe", color: "#1d4ed8" };
