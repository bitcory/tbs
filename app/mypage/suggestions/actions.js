"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_LEN = 4000;

export async function createSuggestion(formData) {
  const s = await auth();
  if (!s?.user) redirect("/login");

  const content = String(formData.get("content") ?? "").trim().slice(0, MAX_LEN);
  if (!content) return { ok: false, message: "내용을 입력해 주세요." };

  const me = await prisma.user.findUnique({
    where: { id: s.user.id },
    select: { nickname: true },
  });

  await prisma.suggestion.create({
    data: {
      userId: s.user.id,
      nickname: me?.nickname ?? "이름없음",
      content,
    },
  });

  revalidatePath("/mypage/suggestions");
  revalidatePath("/admin/suggestions");
  return { ok: true };
}

export async function updateSuggestion(id, formData) {
  const s = await auth();
  if (!s?.user) redirect("/login");

  const content = String(formData.get("content") ?? "").trim().slice(0, MAX_LEN);
  if (!content) return { ok: false, message: "내용을 입력해 주세요." };

  // 본인 글만 수정 가능 — where 절에 userId 까지 걸어 다른 사람 글 변조 차단
  const result = await prisma.suggestion.updateMany({
    where: { id, userId: s.user.id },
    data: { content },
  });
  if (result.count === 0) return { ok: false, message: "수정 권한이 없습니다." };

  revalidatePath("/mypage/suggestions");
  revalidatePath("/admin/suggestions");
  return { ok: true };
}

export async function deleteSuggestion(id) {
  const s = await auth();
  if (!s?.user) redirect("/login");

  // 본인 또는 SUPER_ADMIN 만 삭제 가능
  const me = await prisma.user.findUnique({
    where: { id: s.user.id },
    select: { role: true },
  });

  if (me?.role === "SUPER_ADMIN") {
    await prisma.suggestion.delete({ where: { id } });
  } else {
    const result = await prisma.suggestion.deleteMany({
      where: { id, userId: s.user.id },
    });
    if (result.count === 0) return { ok: false, message: "삭제 권한이 없습니다." };
  }

  revalidatePath("/mypage/suggestions");
  revalidatePath("/admin/suggestions");
  return { ok: true };
}
