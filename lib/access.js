import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) redirect("/login");
  if (!me.onboarded) redirect("/onboarding");
  return me;
}

export async function requireStepAccess(step) {
  const me = await requireUser();
  const allowed =
    me.role === "STAFF" ||
    me.role === "SUPER_ADMIN" ||
    me.stepAccess.includes(step);
  if (!allowed) redirect(`/no-access?step=${step}`);
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
