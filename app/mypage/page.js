import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signIn, signOut, googleEnabled } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as S from "@/lib/uiStyles";
import ProfileEditor from "./ProfileEditor";
import BankInfoEditor from "./BankInfoEditor";
import CapsrtConnectCard from "./CapsrtConnectCard";
import LinkedAccountsCard from "./LinkedAccountsCard";
import { updateProfile, updateBankInfo, issueDesktopToken, revokeDesktopToken } from "./actions";
import {
  Camera, Search, Film, MessagesSquare, ArrowUpRight, MessageSquarePlus,
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

export default async function MyPage({ searchParams }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) redirect("/login");
  if (!me.onboarded) redirect("/onboarding");

  const isAdmin = me.role === "STAFF" || me.role === "SUPER_ADMIN";

  const sp = (await searchParams) ?? {};
  const linkStatus = typeof sp.status === "string" ? sp.status : null;
  const linkedProviders = (
    await prisma.account.findMany({
      where: { userId: me.id },
      select: { provider: true },
    })
  ).map((a) => a.provider);

  // 캡컷SRT 앱: 사용 권한 + 발급된 연결코드
  const capsrtAllowed = me.capsrtAccess || isAdmin;
  const desktopToken = await prisma.desktopToken.findFirst({
    where: { userId: me.id, revoked: false },
    orderBy: { createdAt: "desc" },
    select: { token: true },
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--tb-bg)", color: "var(--tb-text)" }} className="auth-scroll">
      <section style={S.hero}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <h1 style={S.heroTitle}>{me.nickname}님의 마이페이지</h1>
          <p style={S.heroSubtitle}>권한 현황과 회원 정보를 관리하세요.</p>
        </div>
      </section>

      <div style={{ ...S.pageWrap, maxWidth: "100%", padding: "20px 20px 80px", marginTop: 0, position: "relative" }}>
        <div className="mypage-nav" style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 16, flexWrap: "wrap" }}>
          <Link href="/" className="glass-hoverable mypage-nav-btn" style={S.ghostBtn}>
            홈
          </Link>
          {isAdmin && (
            <Link href="/admin/schedule" className="glass-hoverable mypage-nav-btn" style={S.ghostBtn}>
              강의일정
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" className="glass-hoverable mypage-nav-btn" style={S.primaryPill}>
              관리자
            </Link>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="glass-hoverable mypage-nav-btn" style={S.ghostBtn}>
              로그아웃
            </button>
          </form>
        </div>

        {/* 모바일에서 4개 버튼이 한 줄에 들어가도록 padding 과 font 축소 */}
        <style>{`
          @media (max-width: 640px) {
            .mypage-nav { flex-wrap: nowrap !important; gap: 6px !important; }
            .mypage-nav-btn { padding: 8px 12px !important; font-size: 12px !important; }
          }
          @media (max-width: 360px) {
            .mypage-nav-btn { padding: 6px 10px !important; font-size: 11px !important; }
          }
          /* 한 줄 4개: 내권한 · 유용한툴 · 오픈채팅방 · 캡컷SRT */
          .mypage-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 18px;
            align-items: stretch;
            margin-bottom: 18px;
          }
          @media (max-width: 1100px) {
            .mypage-cards { grid-template-columns: repeat(2, 1fr); }
          }
          @media (max-width: 640px) {
            .mypage-cards { grid-template-columns: 1fr; }
          }
        `}</style>

        <div className="mypage-cards">
          <div style={{ ...S.card, padding: 22, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
              <div style={{ ...S.sectionTitle, marginBottom: 0 }}>내 권한</div>
              <span style={S.badge(ROLE_BADGE[me.role])}>{ROLE_LABEL[me.role]}</span>
            </div>
            <div style={{ color: "var(--tb-text-muted)", fontSize: 12.5, marginBottom: 18 }}>
              가입일 {new Date(me.createdAt).toLocaleDateString("ko-KR")}
            </div>

            <Link
              href="/mypage/suggestions"
              className="tb-press"
              style={{
                marginTop: "auto",
                display: "flex",
                alignItems: "center",
                gap: 11,
                width: "100%",
                height: 78,
                padding: "0 16px",
                borderRadius: 14,
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                color: "#fff",
                fontSize: 14.5,
                fontWeight: 800,
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.35)",
                boxShadow: "0 10px 22px rgba(99,102,241,0.32), inset 1.5px 1.5px 0.5px 0 rgba(255,255,255,0.5), inset -1px -1px 0.5px 1px rgba(255,255,255,0.18)",
              }}
            >
              <span style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: "rgba(255,255,255,0.22)", border: "1px solid rgba(255,255,255,0.3)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <MessageSquarePlus size={18} strokeWidth={2.4} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>운영건의함</span>
              <ArrowUpRight size={16} strokeWidth={2.4} color="rgba(255,255,255,0.8)" />
            </Link>
          </div>

          <div style={{ ...S.card, padding: 22, display: "flex", flexDirection: "column" }}>
            <div style={{ ...S.sectionTitle, marginBottom: 18 }}>유용한툴</div>
            <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {[
                { label: "툴비캡쳐",        url: "https://drive.google.com/file/d/1P0Ybn1D4W8eu8SpzHqyrjd_94DAj8Gil/view?usp=sharing", c: "59,130,246",  Icon: Camera },
                { label: "툴비검색기",      url: "https://drive.google.com/file/d/1v6fQcMyaao9OZjfHhK3ZR-vSAJ4lqdB0/view?usp=sharing", c: "245,158,11", Icon: Search },
                { label: "무료 캡컷",      url: "https://aitoolb.com/61",           c: "236,72,153", Icon: Film },
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
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                      height: 78,
                      padding: "0 6px",
                      borderRadius: 13,
                      background: `linear-gradient(135deg, rgba(${u.c}, 1) 0%, rgba(${u.c}, 0.82) 100%)`,
                      border: "1px solid rgba(255,255,255,0.45)",
                      boxShadow: `0 6px 14px rgba(${u.c}, 0.28), inset 1.5px 1.5px 0.5px 0 rgba(255,255,255,0.5), inset -1px -1px 0.5px 1px rgba(255,255,255,0.18)`,
                      textDecoration: "none",
                      color: "#fff",
                      overflow: "hidden",
                    }}
                  >
                    {/* subtle decorative blob */}
                    <span aria-hidden="true" style={{
                      position: "absolute", top: -24, right: -20, width: 72, height: 72, borderRadius: "50%",
                      background: "rgba(255,255,255,0.18)", filter: "blur(2px)",
                    }} />
                    <span style={{
                      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                      background: "rgba(255,255,255,0.22)",
                      border: "1px solid rgba(255,255,255,0.35)",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      backdropFilter: "blur(8px)",
                      position: "relative", zIndex: 1,
                    }}>
                      <Icon size={17} strokeWidth={2.4} color="#fff" />
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", lineHeight: 1.2, letterSpacing: "-0.03em", whiteSpace: "nowrap", position: "relative", zIndex: 1 }}>{u.label}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* 오픈챗팅방 바로가기 */}
          <div style={{ ...S.card, padding: 22, display: "flex", flexDirection: "column" }}>
            <div style={{ ...S.sectionTitle, marginBottom: 18 }}>오픈챗팅방 바로가기</div>
            <a
              href="https://open.kakao.com/o/gWR9vhXh"
              target="_blank"
              rel="noopener noreferrer"
              className="tb-press"
              style={{
                marginTop: "auto",
                display: "flex",
                alignItems: "center",
                gap: 11,
                width: "100%",
                height: 78,
                padding: "0 16px",
                borderRadius: 14,
                background: "#FEE500",
                color: "#191919",
                fontSize: 14.5,
                fontWeight: 800,
                textDecoration: "none",
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 8px 18px rgba(254,229,0,0.45), inset 1.5px 1.5px 0.5px 0 rgba(255,255,255,0.7), inset -1px -1px 0.5px 1px rgba(0,0,0,0.05)",
              }}
            >
              <span style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: "rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.06)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <MessagesSquare size={18} strokeWidth={2.4} color="#191919" />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>카카오톡 입장</span>
              <ArrowUpRight size={16} strokeWidth={2.4} color="rgba(0,0,0,0.45)" />
            </a>
          </div>

          <CapsrtConnectCard
            hasAccess={capsrtAllowed}
            initialCode={desktopToken?.token ?? null}
            issueAction={issueDesktopToken}
            revokeAction={revokeDesktopToken}
          />
        </div>

        {/* 로그인 수단 + 회원정보 + 정산정보 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 18, alignItems: "start" }}>
          <LinkedAccountsCard
            providers={linkedProviders}
            googleEnabled={googleEnabled}
            status={linkStatus}
            linkAction={async () => {
              "use server";
              // 이미 세션이 있으므로 Auth.js 가 현재 계정에 구글을 "연결"한다
              // (신규 가입이 아니라 linkAccount 경로). 이메일이 달라도 붙는다.
              await signIn("google", { redirectTo: "/mypage?status=linked" });
            }}
          />

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
    </div>
  );
}
