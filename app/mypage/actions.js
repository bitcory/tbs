"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendMaterialsEmail } from "@/lib/email";
import { hasStepMaterials } from "@/lib/stepMaterials";

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
  revalidatePath("/mypage");
  return { ok: true };
}

export async function requestMaterials(step) {
  const s = await auth();
  if (!s?.user) return { ok: false, message: "로그인이 필요합니다." };

  if (![1, 2, 3].includes(step)) {
    return { ok: false, message: "잘못된 단계입니다." };
  }

  const me = await prisma.user.findUnique({ where: { id: s.user.id } });
  if (!me) return { ok: false, message: "회원 정보를 찾을 수 없습니다." };
  if (!me.email) return { ok: false, message: "등록된 이메일이 없습니다." };

  const allowed =
    me.role === "STAFF" ||
    me.role === "SUPER_ADMIN" ||
    me.stepAccess.includes(step);
  if (!allowed) {
    return { ok: false, message: `Step ${step} 접근 권한이 없습니다.` };
  }

  if (!hasStepMaterials(step)) {
    return { ok: false, message: `Step ${step} 자료는 아직 준비중입니다.` };
  }

  try {
    await sendMaterialsEmail({
      to: me.email,
      nickname: me.nickname ?? "회원",
      step,
    });
    return {
      ok: true,
      message: `${me.email}로 Step ${step} 강의자료를 발송했습니다.`,
    };
  } catch (e) {
    console.error("[requestMaterials] send failed:", e);
    return {
      ok: false,
      message: "메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
}
