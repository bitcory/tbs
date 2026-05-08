import { redirect } from "next/navigation";
import { auth } from "@/auth";

// NextAuth 의 session 콜백(auth.js)이 매 요청마다 User 행을 join 으로 읽어
// session.user 에 { id, role, nickname, stepAccess, onboarded } 를 채워주기
// 때문에, 여기서 prisma.user.findUnique 로 한 번 더 조회할 필요가 없다.
export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.onboarded) redirect("/onboarding");
  return session.user;
}

export async function requireStepAccess(step) {
  const me = await requireUser();
  const steps = Array.isArray(step) ? step : [step];
  const allowed =
    me.role === "STAFF" ||
    me.role === "SUPER_ADMIN" ||
    steps.some((s) => me.stepAccess.includes(s));
  if (!allowed) redirect(`/no-access?step=${steps[0]}`);
  return me;
}

export async function requireAdmin() {
  const me = await requireUser();
  if (me.role !== "STAFF" && me.role !== "SUPER_ADMIN") redirect("/mypage");
  return me;
}

export async function requireSuperAdmin() {
  const me = await requireUser();
  if (me.role !== "SUPER_ADMIN") redirect("/admin");
  return me;
}

// 슈퍼 관리자 또는 슈퍼가 지정한 STAFF만 운영건의함 열람 가능.
// session.user 에는 canViewSuggestions 가 없을 수 있어 prisma 로 한 번 확인.
export async function requireSuggestionViewer() {
  const me = await requireUser();
  if (me.role === "SUPER_ADMIN") return me;
  if (me.role === "STAFF") {
    const { prisma } = await import("@/lib/prisma");
    const u = await prisma.user.findUnique({
      where: { id: me.id },
      select: { canViewSuggestions: true },
    });
    if (u?.canViewSuggestions) return me;
  }
  redirect("/mypage");
}
