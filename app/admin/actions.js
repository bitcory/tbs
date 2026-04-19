"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSuperAdmin } from "@/lib/access";

export async function setRole(userId, role) {
  await requireSuperAdmin();
  if (!["USER", "STAFF", "SUPER_ADMIN"].includes(role)) return;

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });
  revalidatePath("/admin");
}

export async function deleteUser(userId) {
  const me = await requireSuperAdmin();
  if (userId === me.id) return;

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
}

export async function toggleStepAccess(userId, step, enabled) {
  await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const set = new Set(user.stepAccess);
  if (enabled) set.add(step);
  else set.delete(step);

  await prisma.user.update({
    where: { id: userId },
    data: { stepAccess: Array.from(set).sort() },
  });
  revalidatePath("/admin");
}
