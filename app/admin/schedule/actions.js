"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/access";
import { sendMaterialsEmail } from "@/lib/email";
import { sessionMaterialsStep, hasStepMaterials } from "@/lib/stepMaterials";

const CLASS_TYPES = ["ZERO", "UP", "PRO", "MASTER"];
const STATUSES = ["APPLIED", "ATTENDED", "CANCELLED"];

const VALID_SLOTS = new Set([
  "ZERO_0",
  "UP_1", "UP_11", "UP_12", "UP_13", "UP_14",
  "UP_2", "UP_3",
  "PRO_1", "PRO_2", "PRO_3",
  "MASTER_1", "MASTER_2",
]);

function parseStartAt(dateStr, timeStr) {
  // dateStr: "YYYY-MM-DD", timeStr: "HH:MM" — always interpret as KST (UTC+9)
  // so production (Vercel UTC) and local dev produce the same instant.
  if (!dateStr) return null;
  const t = timeStr && /^\d{2}:\d{2}$/.test(timeStr) ? timeStr : "00:00";
  const iso = `${dateStr}T${t}:00+09:00`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function validateClassSlot(classType, stepLevel) {
  if (!CLASS_TYPES.includes(classType)) throw new Error("invalid_class_type");
  const lvl = Number(stepLevel);
  if (!Number.isInteger(lvl) || lvl < 0 || lvl > 99) throw new Error("invalid_step_level");
  if (!VALID_SLOTS.has(`${classType}_${lvl}`)) throw new Error("invalid_class_slot");
  return lvl;
}

async function assertCanModify(me, sessionId, { blockPastDate = false, allowMainInstructor = false } = {}) {
  if (me.role === "SUPER_ADMIN") return;
  const sess = await prisma.classSession.findUnique({
    where: { id: sessionId },
    select: { createdById: true, mainInstructorId: true, startAt: true },
  });
  if (!sess) throw new Error("session_not_found");
  const isCreator = sess.createdById === me.id;
  const isMainInstructor = allowMainInstructor && sess.mainInstructorId === me.id;
  if (!isCreator && !isMainInstructor) throw new Error("forbidden_not_owner");
  if (blockPastDate && sess.startAt.getTime() < Date.now()) {
    throw new Error("forbidden_past_date");
  }
}

export async function createSession(input) {
  const me = await requireAdmin();
  const startAt = parseStartAt(input.date, input.startTime);
  if (!startAt) throw new Error("invalid_date");
  const stepLevel = validateClassSlot(input.classType, input.stepLevel);

  // assistantToReserve only takes effect when no assistant is assigned.
  const assistantToReserve = !input.assistantInstructorId && !!input.assistantToReserve;

  await prisma.classSession.create({
    data: {
      startAt,
      classType: input.classType,
      stepLevel,
      mainInstructorId:      input.mainInstructorId      || null,
      assistantInstructorId: input.assistantInstructorId || null,
      assistantToReserve,
      createdById: me.id,
      note: input.note || null,
    },
  });
  revalidatePath("/admin/schedule");
}

export async function updateSession(sessionId, input) {
  const me = await requireAdmin();
  await assertCanModify(me, sessionId, { allowMainInstructor: true });
  const startAt = parseStartAt(input.date, input.startTime);
  if (!startAt) throw new Error("invalid_date");
  const stepLevel = validateClassSlot(input.classType, input.stepLevel);

  const assistantToReserve = !input.assistantInstructorId && !!input.assistantToReserve;

  await prisma.classSession.update({
    where: { id: sessionId },
    data: {
      startAt,
      classType: input.classType,
      stepLevel,
      mainInstructorId:      input.mainInstructorId      || null,
      assistantInstructorId: input.assistantInstructorId || null,
      assistantToReserve,
      note: input.note || null,
    },
  });
  revalidatePath("/admin/schedule");
}

export async function deleteSession(sessionId) {
  const me = await requireAdmin();
  await assertCanModify(me, sessionId, { blockPastDate: true });
  await prisma.classSession.delete({ where: { id: sessionId } });
  revalidatePath("/admin/schedule");
}

export async function addEnrollment(sessionId, userId) {
  await requireAdmin();
  await prisma.enrollment.upsert({
    where: { sessionId_userId: { sessionId, userId } },
    update: { status: "APPLIED" },
    create: { sessionId, userId, status: "APPLIED" },
  });
  revalidatePath("/admin/schedule");
}

export async function setEnrollmentStatus(enrollmentId, status) {
  await requireAdmin();
  if (!STATUSES.includes(status)) throw new Error("invalid_status");
  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { status },
  });
  revalidatePath("/admin/schedule");
}

export async function removeEnrollment(enrollmentId) {
  await requireAdmin();
  await prisma.enrollment.delete({ where: { id: enrollmentId } });
  revalidatePath("/admin/schedule");
}

export async function sendMaterialsForEnrollment(enrollmentId) {
  const me = await requireUser();
  const enr = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      user: { select: { email: true, nickname: true, name: true } },
      session: {
        select: {
          classType: true,
          stepLevel: true,
          mainInstructorId: true,
          assistantInstructorId: true,
        },
      },
    },
  });
  if (!enr) return { ok: false, message: "참가 정보를 찾을 수 없습니다." };

  const isAdmin = me.role === "SUPER_ADMIN" || me.role === "STAFF";
  const isInstructor =
    enr.session.mainInstructorId === me.id ||
    enr.session.assistantInstructorId === me.id;
  if (!isAdmin && !isInstructor) {
    return { ok: false, message: "발송 권한이 없습니다." };
  }

  if (enr.status !== "ATTENDED") {
    return { ok: false, message: "참가 확정된 수강생에게만 발송할 수 있습니다." };
  }
  if (!enr.user?.email) {
    return { ok: false, message: "수강생의 이메일이 등록되어 있지 않습니다." };
  }

  const step = sessionMaterialsStep(enr.session.classType, enr.session.stepLevel);
  if (!step || !hasStepMaterials(step)) {
    return { ok: false, message: "이 단계의 자료는 아직 준비중입니다." };
  }

  try {
    await sendMaterialsEmail({
      to: enr.user.email,
      nickname: enr.user.nickname || enr.user.name || "수강생",
      step,
    });
    return {
      ok: true,
      message: `${enr.user.email}로 강의자료를 발송했습니다.`,
    };
  } catch (e) {
    console.error("[sendMaterialsForEnrollment] send failed:", e);
    return {
      ok: false,
      message: "메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
}
