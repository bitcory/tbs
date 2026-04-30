"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/access";

const CLASS_TYPES = ["ZERO", "UP", "PRO"];
const STATUSES = ["APPLIED", "ATTENDED", "CANCELLED"];

const VALID_SLOTS = new Set([
  "ZERO_0",
  "UP_1", "UP_2", "UP_3",
  "PRO_1", "PRO_2", "PRO_3",
]);

function parseStartAt(dateStr, timeStr) {
  // dateStr: "YYYY-MM-DD", timeStr: "HH:MM"
  if (!dateStr) return null;
  const t = timeStr && /^\d{2}:\d{2}$/.test(timeStr) ? timeStr : "00:00";
  const iso = `${dateStr}T${t}:00`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function validateClassSlot(classType, stepLevel) {
  if (!CLASS_TYPES.includes(classType)) throw new Error("invalid_class_type");
  const lvl = Number(stepLevel);
  if (!Number.isInteger(lvl) || lvl < 0 || lvl > 9) throw new Error("invalid_step_level");
  if (!VALID_SLOTS.has(`${classType}_${lvl}`)) throw new Error("invalid_class_slot");
  return lvl;
}

async function assertCanModify(me, sessionId, { blockPastDate = false } = {}) {
  if (me.role === "SUPER_ADMIN") return;
  const sess = await prisma.classSession.findUnique({
    where: { id: sessionId },
    select: { createdById: true, startAt: true },
  });
  if (!sess) throw new Error("session_not_found");
  if (sess.createdById !== me.id) throw new Error("forbidden_not_owner");
  if (blockPastDate && sess.startAt.getTime() < Date.now()) {
    throw new Error("forbidden_past_date");
  }
}

export async function createSession(input) {
  const me = await requireAdmin();
  const startAt = parseStartAt(input.date, input.startTime);
  if (!startAt) throw new Error("invalid_date");
  const stepLevel = validateClassSlot(input.classType, input.stepLevel);

  await prisma.classSession.create({
    data: {
      startAt,
      classType: input.classType,
      stepLevel,
      mainInstructorId:      input.mainInstructorId      || null,
      assistantInstructorId: input.assistantInstructorId || null,
      createdById: me.id,
      note: input.note || null,
    },
  });
  revalidatePath("/admin/schedule");
}

export async function updateSession(sessionId, input) {
  const me = await requireAdmin();
  await assertCanModify(me, sessionId);
  const startAt = parseStartAt(input.date, input.startTime);
  if (!startAt) throw new Error("invalid_date");
  const stepLevel = validateClassSlot(input.classType, input.stepLevel);

  await prisma.classSession.update({
    where: { id: sessionId },
    data: {
      startAt,
      classType: input.classType,
      stepLevel,
      mainInstructorId:      input.mainInstructorId      || null,
      assistantInstructorId: input.assistantInstructorId || null,
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
