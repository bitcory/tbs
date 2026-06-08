import Link from "next/link";
import { requireAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import * as S from "@/lib/uiStyles";
import {
  attendeeCount,
  applicantCount,
  calculateRevenue,
  viewerRevenueScope,
  maskRevenue,
  buildPricingMap,
  lookupPricing,
} from "@/lib/pricing";
import { maskPhone } from "@/lib/format";
import ScheduleClient from "./ScheduleClient";

export default async function SchedulePage() {
  const me = await requireAdmin();

  const [sessions, staffUsers, memberUsers, pricingRows] = await Promise.all([
    prisma.classSession.findMany({
      orderBy: { startAt: "asc" },
      include: {
        mainInstructor: { select: { id: true, name: true, nickname: true, email: true, bankName: true, bankAccount: true, accountHolder: true } },
        assistantInstructor: { select: { id: true, name: true, nickname: true, email: true, bankName: true, bankAccount: true, accountHolder: true } },
        enrollments: {
          include: {
            user: { select: { id: true, name: true, nickname: true, email: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ["STAFF", "SUPER_ADMIN"] } },
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      select: { id: true, name: true, nickname: true, email: true, role: true },
    }),
    prisma.user.findMany({
      where: { role: "USER" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, nickname: true, email: true, phone: true },
    }),
    prisma.pricingConfig.findMany(),
  ]);

  // 전화번호는 슈퍼 관리자만 전체 노출. STAFF 에게는 마스킹된 값 전달.
  const isSuper = me.role === "SUPER_ADMIN";
  const safeMemberUsers = memberUsers.map((u) => ({
    ...u,
    phone: isSuper ? u.phone : maskPhone(u.phone),
  }));

  const pricingMap = buildPricingMap(pricingRows);

  // Server-side revenue computation, masked per viewer role.
  const viewSessions = sessions.map((sess) => {
    const att = attendeeCount(sess.enrollments);
    const apply = applicantCount(sess.enrollments);
    const slot = lookupPricing(pricingMap, sess.classType, sess.stepLevel);
    const rev = calculateRevenue(att, slot, { assistantToReserve: sess.assistantToReserve });
    const scope = viewerRevenueScope(me, sess);
    const masked = maskRevenue(rev, scope);
    return {
      id: sess.id,
      startAt: sess.startAt.toISOString(),
      classType: sess.classType,
      stepLevel: sess.stepLevel,
      mainInstructor: sess.mainInstructor,
      assistantInstructor: sess.assistantInstructor,
      mainInstructorId: sess.mainInstructorId,
      assistantInstructorId: sess.assistantInstructorId,
      assistantToReserve: sess.assistantToReserve,
      createdById: sess.createdById,
      note: sess.note,
      enrollments: sess.enrollments.map((e) => ({
        id: e.id,
        status: e.status,
        user: e.user,
      })),
      counts: { applicants: apply, attendees: att },
      revenue: masked,
      scope: {
        canSeeTotal: scope.canSeeTotal,
        canSeeToolb: scope.canSeeToolb,
        canSeeMain: scope.canSeeMain,
        canSeeAssistant: scope.canSeeAssistant,
        canSeeAnything: scope.canSeeAnything,
      },
    };
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--tb-bg)", color: "var(--tb-text)" }} className="auth-scroll">
      <section style={S.hero}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <span style={S.heroEyebrow}>SCHEDULE</span>
          <h1 style={S.heroTitle}>강의 일정</h1>
          <p style={S.heroSubtitle}>
            회차 등록 · 참가자 관리 · 정산 자동 계산
          </p>
        </div>
      </section>

      <div style={{ ...S.pageWrap, maxWidth: "100%", padding: "20px 24px 80px", marginTop: 0, position: "relative", color: "var(--tb-text)" }}>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginBottom: 16, flexWrap: "wrap" }}>
          <Link href="/" className="glass-hoverable" style={S.ghostBtn}>홈</Link>
          {me.role === "SUPER_ADMIN" && (
            <Link href="/admin/pricing" className="glass-hoverable" style={S.ghostBtn}>단가/요율</Link>
          )}
          <Link href="/admin" className="glass-hoverable" style={S.ghostBtn}>← 관리자</Link>
        </div>

        <ScheduleClient
          me={{ id: me.id, role: me.role }}
          sessions={viewSessions}
          staffUsers={staffUsers}
          memberUsers={safeMemberUsers}
          pricing={pricingMap}
          serverNowIso={new Date().toISOString()}
        />
      </div>
    </div>
  );
}
