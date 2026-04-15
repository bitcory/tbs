import Link from "next/link";
import * as S from "@/lib/uiStyles";

export default async function NoAccessPage({ searchParams }) {
  const params = await searchParams;
  const step = params?.step ?? "";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a" }} className="auth-scroll">
      <section style={S.hero}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <span style={S.heroEyebrow}>ACCESS DENIED</span>
          <h1 style={S.heroTitle}>접근 권한이 없습니다</h1>
          <p style={S.heroSubtitle}>
            {step ? `Step ${step}` : "해당 강의"} 에 대한 권한이 아직 없어요.<br />
            운영진에게 권한 부여를 요청해주세요.
          </p>
        </div>
      </section>

      <div style={{ ...S.pageWrap, maxWidth: 420, marginTop: -48, position: "relative" }}>
        <div style={{ ...S.card, textAlign: "center" }}>
          <p style={{ color: "#475569", lineHeight: 1.7, marginBottom: 20 }}>
            마이페이지에서 권한 현황을 확인할 수 있습니다.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link href="/mypage" style={S.primaryPill}>마이페이지</Link>
            <Link href="/" style={S.ghostBtn}>홈으로</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
