"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logConsent } from "@/lib/consent";

export async function updateProfile(formData) {
  const s = await auth();
  if (!s?.user) redirect("/login");
  const nickname = String(formData.get("nickname") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const phone = phoneRaw.replace(/[^\d+\-]/g, "");
  const privacyAgreed = formData.get("privacyAgreed") === "on";
  const marketingOptIn = formData.get("marketingOptIn") === "on";
  if (!nickname || !email) return;
  if (!privacyAgreed) {
    return { ok: false, message: "개인정보 수집·이용 동의가 필요합니다." };
  }

  const me = await prisma.user.findUnique({
    where: { id: s.user.id },
    select: { marketingOptIn: true, privacyAgreedAt: true },
  });
  const now = new Date();
  const marketingChanged = !!me && me.marketingOptIn !== marketingOptIn;

  await prisma.user.update({
    where: { id: s.user.id },
    data: {
      nickname,
      email,
      phone: phone || null,
      privacyAgreedAt: me?.privacyAgreedAt ?? now,
      marketingOptIn,
      marketingAgreedAt: marketingChanged ? now : undefined,
    },
  });

  // 동의 이력 로그 (INSERT-only)
  if (!me?.privacyAgreedAt) {
    // 프로필에서 뒤늦게 처음 동의한 경우
    await logConsent(s.user.id, "privacy", "granted", "profile_edit");
  }
  if (marketingChanged) {
    await logConsent(
      s.user.id,
      "marketing",
      marketingOptIn ? "granted" : "revoked",
      "profile_edit"
    );
  }

  revalidatePath("/mypage");
  return { ok: true };
}

export async function updateBankInfo(formData) {
  const s = await auth();
  if (!s?.user) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: s.user.id },
    select: { role: true },
  });
  if (!me || (me.role !== "STAFF" && me.role !== "SUPER_ADMIN")) {
    return { ok: false, message: "운영진 권한이 필요합니다." };
  }

  const bankName      = String(formData.get("bankName")      ?? "").trim().slice(0, 30);
  const bankAccount   = String(formData.get("bankAccount")   ?? "").trim().slice(0, 40);
  const accountHolder = String(formData.get("accountHolder") ?? "").trim().slice(0, 30);

  await prisma.user.update({
    where: { id: s.user.id },
    data: {
      bankName:      bankName      || null,
      bankAccount:   bankAccount   || null,
      accountHolder: accountHolder || null,
    },
  });

  revalidatePath("/mypage");
  revalidatePath("/admin/schedule");
  return { ok: true };
}

