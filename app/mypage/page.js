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
import { stepLabel } from "@/lib/stepLabel";
import {
  Home, Calendar, ShieldCheck, LogOut,
  Camera, Search, Film, MessagesSquare, ArrowUpRight,
} from "lucide-react";

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
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 16, flexWrap: "wrap" }}>
          <Link href="/" className="glass-hoverable" style={{ ...S.ghostBtn, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Home size={14} strokeWidth={2.4} />
            홈으로
          </Link>
          {isAdmin && (
            <Link href="/admin/schedule" className="glass-hoverable" style={{ ...S.ghostBtn, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Calendar size={14} strokeWidth={2.4} />
              강의 일정
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" className="glass-hoverable" style={{ ...S.primaryPill, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={14} strokeWidth={2.4} />
              관리자 페이지
            </Link>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="glass-hoverable" style={{ ...S.ghostBtn, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <LogOut size={14} strokeWidth={2.4} />
              로그아웃
            </button>
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
                    {stepLabel(n)} {ok ? "✓ 허용" : "✕ 차단"}
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              {[
                { label: "Snipaste",        desc: "화면 캡쳐",   url: "https://www.snipaste.com/",        c: "59,130,246",  Icon: Camera },
                { label: "Everything",     desc: "파일 검색",    url: "https://www.voidtools.com/ko-kr/", c: "245,158,11", Icon: Search },
                { label: "무료 캡컷",      desc: "영상 편집",     url: "https://aitoolb.com/61",           c: "236,72,153", Icon: Film },
              ].map((u) => {
                const Icon = u.Icon;
                return (
                  <a
                    key={u.url}
                    href={u.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tb-press"
                    style={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "16px 16px 14px",
                      minHeight: 132,
                      borderRadius: 16,
                      background: `linear-gradient(135deg, rgba(${u.c}, 1) 0%, rgba(${u.c}, 0.82) 100%)`,
                      border: "1px solid rgba(255,255,255,0.45)",
                      boxShadow: `0 10px 22px rgba(${u.c}, 0.32), inset 1.5px 1.5px 0.5px 0 rgba(255,255,255,0.5), inset -1px -1px 0.5px 1px rgba(255,255,255,0.18)`,
                      textDecoration: "none",
                      color: "#fff",
                      overflow: "hidden",
                    }}
                  >
                    {/* subtle decorative blob */}
                    <span aria-hidden="true" style={{
                      position: "absolute", top: -28, right: -22, width: 100, height: 100, borderRadius: "50%",
                      background: "rgba(255,255,255,0.18)", filter: "blur(2px)",
                    }} />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
                      <span style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: "rgba(255,255,255,0.22)",
                        border: "1px solid rgba(255,255,255,0.35)",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        backdropFilter: "blur(8px)",
                      }}>
                        <Icon size={18} strokeWidth={2.4} color="#fff" />
                      </span>
                      <ArrowUpRight size={16} strokeWidth={2.4} color="rgba(255,255,255,0.85)" />
                    </div>
                    <div style={{ position: "relative", zIndex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1.3, letterSpacing: "-0.01em" }}>{u.label}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2, fontWeight: 500 }}>{u.desc}</div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* 오픈챗팅방 바로가기 */}
        <div style={{ ...S.card, marginBottom: 18 }}>
          <div style={{ ...S.sectionTitle, marginBottom: 6 }}>오픈챗팅방 바로가기</div>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14, lineHeight: 1.55 }}>
            궁금한 점이나 질문이 있으면 언제든 카카오톡 오픈채팅방으로 들어와 주세요.
          </p>
          <a
            href="https://open.kakao.com/o/gWR9vhXh"
            target="_blank"
            rel="noopener noreferrer"
            className="tb-press"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              width: "100%",
              padding: "14px 22px",
              borderRadius: 14,
              background: "#FEE500",
              color: "#191919",
              fontSize: 15,
              fontWeight: 800,
              textDecoration: "none",
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 8px 18px rgba(254,229,0,0.45), inset 1.5px 1.5px 0.5px 0 rgba(255,255,255,0.7), inset -1px -1px 0.5px 1px rgba(0,0,0,0.05)",
            }}
          >
            <MessagesSquare size={20} strokeWidth={2.4} color="#191919" />
            카카오톡 오픈채팅방 입장
          </a>
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
