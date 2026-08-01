import NextAuth from "next-auth";
import Kakao from "next-auth/providers/kakao";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const GOOGLE_ID = process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID;
const GOOGLE_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? process.env.AUTH_GOOGLE_SECRET;

// 구글은 자격증명이 있을 때만 등록한다. 없는 환경(로컬/프리뷰)에서 provider 를
// 무조건 끼워 넣으면 /login 진입 자체가 실패한다.
export const googleEnabled = Boolean(GOOGLE_ID && GOOGLE_SECRET);

const providers = [
  Kakao({
    clientId: process.env.KAKAO_CLIENT_ID,
    clientSecret: process.env.KAKAO_CLIENT_SECRET ?? "",
  }),
];

if (googleEnabled) {
  providers.push(
    Google({
      clientId: GOOGLE_ID,
      clientSecret: GOOGLE_SECRET,
      // 기존 카카오 회원이 같은 이메일로 구글 로그인하면 새 User 를 만들지 않고
      // 기존 계정에 연결한다(권한·역할 유지). 이게 없으면 OAuthAccountNotLinked
      // 에러로 로그인이 막힌다. 두 provider 모두 이메일을 검증하므로 허용.
      allowDangerousEmailAccountLinking: true,
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  // Auth.js v5 는 기본적으로 AUTH_SECRET 를 읽는다. 이 프로젝트는 v4 이름인
  // NEXTAUTH_SECRET 만 설정돼 있어 시크릿이 비면 서버리스 인스턴스마다 임시
  // 시크릿이 달라져 PKCE 쿠키 복호화가 실패한다(InvalidCheck: pkceCodeVerifier).
  // 어느 이름이든 명시적으로 주입해 인스턴스 간 일관성을 보장한다.
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: "database" },
  events: {
    async createUser({ user }) {
      const count = await prisma.user.count();
      if (count === 1) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "SUPER_ADMIN", stepAccess: [1, 2, 3] },
        });
      }
    },
    // OAuth 콜백이 동시에 두 번 처리되면 User row가 두 개 만들어지는 race condition이 있음
    // (특히 카카오톡 인앱브라우저에서 종종 발생). Account 연결이 끝난 시점에 같은 이름/계정없음/직전 1분 내 생성된 고아 row를 정리한다.
    async linkAccount({ user }) {
      if (!user?.id || !user?.name) return;
      const cutoff = new Date(Date.now() - 60_000);
      await prisma.user.deleteMany({
        where: {
          id: { not: user.id },
          name: user.name,
          onboarded: false,
          createdAt: { gte: cutoff },
          accounts: { none: {} },
          sessions: { none: {} },
        },
      });
    },
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
        session.user.nickname = user.nickname;
        session.user.stepAccess = user.stepAccess;
        session.user.onboarded = user.onboarded;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    // 계정 연결 실패(OAuthAccountNotLinked 등)도 여기로 온다. /login 이 세션 유무를
    // 보고 로그인 중인 사용자는 /mypage 로 안내 메시지와 함께 되돌린다.
    error: "/login",
  },
});
