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

// ===== CapCutSRT 데스크톱 앱 연결코드 =====
import { randomBytes } from "crypto";

// 사람이 옮겨적기 쉬운 연결코드 생성: CAPS-XXXX-XXXX-XXXX-XXXX (Crockford base32)
function generateConnectionCode() {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // 헷갈리는 I,L,O,U 제외
  const bytes = randomBytes(16);
  let s = "";
  for (let i = 0; i < 16; i++) s += alphabet[bytes[i] & 31];
  return `CAPS-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}`;
}

// 연결코드 발급(재발급). 기존 코드는 폐기하고 새 코드 하나만 유지.
// capsrtAccess 가 있어야 발급 가능(없으면 발급해도 앱이 거부됨).
export async function issueDesktopToken() {
  const s = await auth();
  if (!s?.user) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: s.user.id },
    select: { capsrtAccess: true, role: true },
  });
  const allowed = !!me && (me.capsrtAccess || me.role === "STAFF" || me.role === "SUPER_ADMIN");
  if (!allowed) {
    return { ok: false, message: "캡컷SRT 앱 사용 권한이 없습니다. 관리자에게 문의하세요." };
  }

  // 기존 토큰 정리 후 새 코드 1개 발급
  await prisma.desktopToken.deleteMany({ where: { userId: s.user.id } });
  const token = generateConnectionCode();
  await prisma.desktopToken.create({
    data: { token, userId: s.user.id },
  });

  revalidatePath("/mypage");
  return { ok: true, token };
}

// 연결코드 폐기(앱 연결 해제).
export async function revokeDesktopToken() {
  const s = await auth();
  if (!s?.user) redirect("/login");
  await prisma.desktopToken.deleteMany({ where: { userId: s.user.id } });
  revalidatePath("/mypage");
  return { ok: true };
}

