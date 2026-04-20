import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * 개인정보·마케팅 동의 이벤트를 ConsentLog 에 INSERT.
 * INSERT-only — 기존 로그는 절대 수정/삭제하지 않는다. (감사 추적 보관)
 *
 * @param {string} userId
 * @param {"privacy" | "marketing"} type
 * @param {"granted" | "revoked"} action
 * @param {string} [source] - 어디서 발생한 이벤트인지 (예: "onboarding", "profile_edit")
 */
export async function logConsent(userId, type, action, source) {
  let ipAddress = null;
  let userAgent = null;
  try {
    const h = await headers();
    ipAddress =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null;
    userAgent = h.get("user-agent") || null;
  } catch (e) {
    // headers() is only available in request scope; fall back to null
  }

  await prisma.consentLog.create({
    data: {
      userId,
      type,
      action,
      source: source ?? null,
      ipAddress,
      userAgent,
    },
  });
}
