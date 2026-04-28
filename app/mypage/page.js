import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as S from "@/lib/uiStyles";
import ProfileEditor from "./ProfileEditor";
import BankInfoEditor from "./BankInfoEditor";
import MaterialRequestButton from "./MaterialRequestButton";
import { updateProfile, updateBankInfo, requestMaterials } from "./actions";
import { hasStepMaterials } from "@/lib/stepMaterials";

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

      <div style={{ ...S.pageWrap, maxWidth: "100%", padding: "28px 20px 80px", marginTop: -48, position: "relative" }}>
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 18, marginBottom: 18 }}>
          <div style={S.card}>
          <div style={S.sectionTitle}>내 권한</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <span style={S.badge(ROLE_BADGE[me.role])}>{ROLE_LABEL[me.role]}</span>
            <span style={{ color: "#64748b", fontSize: 13 }}>가입일 {new Date(me.createdAt).toLocaleDateString("ko-KR")}</span>
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 10 }}>
            단계 접근권한 & 강의자료
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3].map((n) => {
              const ok = me.stepAccess.includes(n) || me.role !== "USER";
              const ready = hasStepMaterials(n);
              return (
                <div
                  key={n}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "12px 14px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 14,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={S.badge(ok ? S.badgeGreen : S.badgeGray)}>
                    Step {n} {ok ? "✓ 허용" : "✕ 차단"}
                  </span>
                  <MaterialRequestButton
                    step={n}
                    hasAccess={ok}
                    ready={ready}
                    requestMaterials={requestMaterials}
                  />
                </div>
              );
            })}
          </div>
        </div>

          <div style={S.card}>
            <div style={S.sectionTitle}>유용한툴</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              {[
                { label: "Snipaste 캡쳐", url: "https://www.snipaste.com/", c: "59,130,246" },
                { label: "Everything 검색", url: "https://www.voidtools.com/ko-kr/", c: "245,158,11" },
                { label: "무료 캡컷", url: "https://aitoolb.com/61", c: "236,72,153" },
                { label: "오픈챗팅방", url: "https://open.kakao.com/o/gWR9vhXh", c: "139,92,246" },
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
                    background: `linear-gradient(135deg, rgba(${u.c},0.95) 0%, rgba(${u.c},0.78) 100%)`,
                    boxShadow: `0 6px 16px rgba(${u.c},0.32), inset 1.5px 1.5px 0.5px 0 rgba(255,255,255,0.5), inset -1px -1px 0.5px 1px rgba(255,255,255,0.2)`,
                  }}
                >
                  {u.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <ProfileEditor
          initialNickname={me.nickname}
          initialEmail={me.email}
          initialPhone={me.phone}
          initialPrivacyAgreedAt={me.privacyAgreedAt}
          initialMarketingOptIn={me.marketingOptIn}
          updateProfile={updateProfile}
        />

        {isAdmin && (
          <BankInfoEditor
            initialBankName={me.bankName}
            initialBankAccount={me.bankAccount}
            initialAccountHolder={me.accountHolder}
            updateBankInfo={updateBankInfo}
          />
        )}
      </div>
    </div>
  );
}
