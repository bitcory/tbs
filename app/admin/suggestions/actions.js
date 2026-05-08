"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/access";

export async function adminDeleteSuggestion(id) {
  await requireSuperAdmin();
  await prisma.suggestion.delete({ where: { id } });
  revalidatePath("/admin/suggestions");
  revalidatePath("/mypage/suggestions");
}
