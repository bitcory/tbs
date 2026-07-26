import { redirect } from "next/navigation";
import { auth, signIn, googleEnabled } from "@/auth";
import * as S from "@/lib/uiStyles";
import KakaoInAppGuard from "./KakaoInAppGuard";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect(session.user.onboarded ? "/" : "/onboarding");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a" }} className="auth-scroll">
      <KakaoInAppGuard />
      <section style={S.hero}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <span style={S.heroEyebrow}>TB STUDY</span>
          <h1 style={S.heroTitle}>로그인하고 강의를 시작하세요</h1>
          <p style={S.heroSubtitle}>
            {googleEnabled
              ? "카카오 또는 구글 계정으로 간편하게 로그인할 수 있습니다."
              : "카카오 계정으로 간편하게 로그인할 수 있습니다."}
          </p>
        </div>
      </section>

      <div style={{ ...S.pageWrap, maxWidth: 420, marginTop: 0, position: "relative" }}>
        <div style={S.card}>
          {googleEnabled && (
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/onboarding" });
              }}
            >
              <button type="submit" className="glass-hoverable" style={S.googleBtn}>
                <GoogleMark />
                구글 계정으로 계속하기
              </button>
            </form>
          )}

          <form
            action={async () => {
              "use server";
              await signIn("kakao", { redirectTo: "/onboarding" });
            }}
            style={googleEnabled ? { marginTop: 10 } : undefined}
          >
            <button type="submit" className="glass-hoverable" style={S.kakaoBtn}>
              <span style={{ fontSize: 18 }}>💬</span>
              카카오로 3초만에 시작하기
            </button>
          </form>

          <p style={{ marginTop: 14, fontSize: 12, color: "#64748b", textAlign: "center" }}>
            로그인 시 회원 약관 및 개인정보 처리방침에 동의하게 됩니다.
          </p>
          {googleEnabled && (
            <p style={{ marginTop: 8, fontSize: 12, color: "#94a3b8", textAlign: "center", lineHeight: 1.6 }}>
              기존 카카오 회원은 <strong>가입 때와 같은 이메일</strong>의 구글 계정으로 로그인하면
              기존 권한이 그대로 유지됩니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
