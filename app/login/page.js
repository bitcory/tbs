import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import * as S from "@/lib/uiStyles";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect(session.user.onboarded ? "/mypage" : "/onboarding");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a" }} className="auth-scroll">
      <section style={S.hero}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <span style={S.heroEyebrow}>TB STUDY</span>
          <h1 style={S.heroTitle}>로그인하고 강의를 시작하세요</h1>
          <p style={S.heroSubtitle}>카카오 계정으로 간편하게 로그인할 수 있습니다.</p>
        </div>
      </section>

      <div style={{ ...S.pageWrap, maxWidth: 420, marginTop: -48, position: "relative" }}>
        <div style={S.card}>
          <form
            action={async () => {
              "use server";
              await signIn("kakao", { redirectTo: "/onboarding" });
            }}
          >
            <button type="submit" style={S.kakaoBtn}>
              <span style={{ fontSize: 18 }}>💬</span>
              카카오로 3초만에 시작하기
            </button>
          </form>
          <p style={{ marginTop: 14, fontSize: 12, color: "#64748b", textAlign: "center" }}>
            로그인 시 회원 약관 및 개인정보 처리방침에 동의하게 됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
