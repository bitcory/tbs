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

/**
 * 중복 계정 병합.
 *
 * 카카오로 가입한 회원이 (이메일이 달라서) 구글로 새 계정을 만들어버린 경우,
 * 새 계정(source)의 로그인 수단을 원래 계정(target)으로 옮기고 새 계정을 지운다.
 * 권한·수강이력은 전부 target 쪽에 있으므로 target 을 살리는 게 핵심이다.
 *
 * source 는 "로그인 수단만 있는 껍데기"여야 안전하다. 실제 데이터(권한/수강/건의)가
 * 붙어 있으면 병합을 거부한다 — 잘못 지우면 복구가 안 된다.
 */
export async function mergeAccounts(sourceUserId, targetUserId) {
  const me = await requireSuperAdmin();
  if (!sourceUserId || !targetUserId || sourceUserId === targetUserId) {
    return { ok: false, message: "서로 다른 두 계정을 선택하세요." };
  }
  if (sourceUserId === me.id) {
    return { ok: false, message: "본인 계정은 병합 대상(삭제될 쪽)으로 지정할 수 없습니다." };
  }

  const [source, target] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sourceUserId },
      include: {
        accounts: { select: { id: true, provider: true } },
        enrollments: { select: { id: true } },
        suggestions: { select: { id: true } },
        desktopTokens: { select: { id: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: targetUserId },
      include: { accounts: { select: { provider: true } } },
    }),
  ]);

  if (!source || !target) return { ok: false, message: "계정을 찾을 수 없습니다." };

  if (source.role !== "USER") {
    return { ok: false, message: "운영진 계정은 자동 병합하지 않습니다. 먼저 권한을 일반 회원으로 낮춰주세요." };
  }
  if (source.stepAccess.length > 0 || source.enrollments.length > 0 || source.suggestions.length > 0 || source.desktopTokens.length > 0) {
    return {
      ok: false,
      message: "삭제될 계정에 권한·수강이력·건의글이 남아 있습니다. 데이터가 없는 쪽을 선택하세요.",
    };
  }

  const targetProviders = new Set(target.accounts.map((a) => a.provider));
  const moving = source.accounts.filter((a) => !targetProviders.has(a.provider));
  if (moving.length === 0) {
    return { ok: false, message: "옮길 로그인 수단이 없습니다. 대상 계정에 이미 같은 제공자가 연결돼 있습니다." };
  }

  await prisma.$transaction([
    prisma.account.updateMany({
      where: { id: { in: moving.map((a) => a.id) } },
      data: { userId: target.id },
    }),
    // 남은 세션/계정은 User 삭제 시 cascade 로 정리된다.
    prisma.user.delete({ where: { id: source.id } }),
  ]);

  revalidatePath("/admin");
  return {
    ok: true,
    message: `${moving.map((a) => a.provider).join(", ")} 로그인을 ${target.nickname ?? target.name ?? "대상 계정"}(으)로 옮겼습니다.`,
  };
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

export async function toggleSuggestionViewer(userId, enabled) {
  await requireSuperAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { canViewSuggestions: !!enabled },
  });
  revalidatePath("/admin");
}

// CapCutSRT 데스크톱 앱 사용 허용 토글.
export async function toggleCapsrtAccess(userId, enabled) {
  await requireAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { capsrtAccess: !!enabled },
  });
  revalidatePath("/admin");
}
