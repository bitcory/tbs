import NextAuth from "next-auth";
import Kakao from "next-auth/providers/kakao";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  // Auth.js v5 는 기본적으로 AUTH_SECRET 를 읽는다. 이 프로젝트는 v4 이름인
  // NEXTAUTH_SECRET 만 설정돼 있어 시크릿이 비면 서버리스 인스턴스마다 임시
  // 시크릿이 달라져 PKCE 쿠키 복호화가 실패한다(InvalidCheck: pkceCodeVerifier).
  // 어느 이름이든 명시적으로 주입해 인스턴스 간 일관성을 보장한다.
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  providers: [
    Kakao({
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET ?? "",
    }),
  ],
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
  },
});
