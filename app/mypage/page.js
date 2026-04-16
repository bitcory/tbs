import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as S from "@/lib/uiStyles";
import ProfileEditor from "./ProfileEditor";
import { updateProfile } from "./actions";

const ROLE_LABEL = {
  USER: "일반 회원",
  STAFF: "운영진",
  SUPER_ADMIN: "슈퍼 관리자",
};

const ROLE_BADGE = {
  USER: S.badgeGray,
  STAFF: S.badgeBlue,
  SUPER_ADMIN: S.badgePurple,
};

export default async function MyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) redirect("/login");
  if (!me.onboarded) redirect("/onboarding");

  const isAdmin = me.role === "STAFF" || me.role === "SUPER_ADMIN";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a" }} className="auth-scroll">
      <section style={S.hero}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <span style={S.heroEyebrow}>MY PAGE</span>
          <h1 style={S.heroTitle}>{me.nickname}님의 마이페이지</h1>
          <p style={S.heroSubtitle}>권한 현황과 회원 정보를 관리하세요.</p>
        </div>
      </section>

      <div style={{ ...S.pageWrap, marginTop: -48, position: "relative" }}>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginBottom: 16 }}>
          <Link href="/" className="glass-hoverable" style={S.ghostBtn}>← 홈으로</Link>
          {isAdmin && (
            <Link href="/admin" className="glass-hoverable" style={S.primaryPill}>관리자 페이지</Link>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="glass-hoverable" style={S.ghostBtn}>로그아웃</button>
          </form>
        </div>

        <div style={{ ...S.card, marginBottom: 18 }}>
          <div style={S.sectionTitle}>내 권한</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <span style={S.badge(ROLE_BADGE[me.role])}>{ROLE_LABEL[me.role]}</span>
            <span style={{ color: "#64748b", fontSize: 13 }}>가입일 {new Date(me.createdAt).toLocaleDateString("ko-KR")}</span>
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
            단계 접근권한
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[1, 2, 3].map((n) => {
              const ok = me.stepAccess.includes(n) || me.role !== "USER";
              return (
                <span key={n} style={S.badge(ok ? S.badgeGreen : S.badgeGray)}>
                  Step {n} {ok ? "✓ 허용" : "✕ 차단"}
                </span>
              );
            })}
          </div>
        </div>

        <div style={{ ...S.card, marginBottom: 18 }}>
          <div style={S.sectionTitle}>유용한 유틸 다운로드</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            {[
              { label: "Snipaste 캡쳐", url: "https://www.snipaste.com/" },
              { label: "Everything 검색", url: "https://www.voidtools.com/ko-kr/" },
              { label: "무료 캡컷", url: "https://aitoolb.com/61" },
            ].map((u) => (
              <a
                key={u.url}
                href={u.url}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-hoverable"
                style={{
                  ...S.primaryPill,
                  textAlign: "center",
                  textDecoration: "none",
                  padding: "12px 16px",
                }}
              >
                {u.label}
              </a>
            ))}
          </div>
        </div>

        <ProfileEditor
          initialNickname={me.nickname}
          initialEmail={me.email}
          updateProfile={updateProfile}
        />
      </div>
    </div>
  );
}
