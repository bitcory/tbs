"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function updateProfile(formData) {
  const s = await auth();
  if (!s?.user) redirect("/login");
  const nickname = String(formData.get("nickname") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!nickname || !email) return;
  await prisma.user.update({
    where: { id: s.user.id },
    data: { nickname, email },
  });
  revalidatePath("/mypage");
}
