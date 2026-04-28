"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/access";

const CLASS_TYPES = ["ZERO", "UP", "PRO"];
const STATUSES = ["APPLIED", "ATTENDED", "CANCELLED"];

function parseStartAt(dateStr, timeStr) {
  // dateStr: "YYYY-MM-DD", timeStr: "HH:MM"
  if (!dateStr) return null;
  const t = timeStr && /^\d{2}:\d{2}$/.test(timeStr) ? timeStr : "00:00";
  const iso = `${dateStr}T${t}:00`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export async function createSession(input) {
  await requireAdmin();
  const startAt = parseStartAt(input.date, input.startTime);
  if (!startAt) throw new Error("invalid_date");
  if (!CLASS_TYPES.includes(input.classType)) throw new Error("invalid_class_type");

  await prisma.classSession.create({
    data: {
      startAt,
      classType: input.classType,
      mainInstructorId:      input.mainInstructorId      || null,
      assistantInstructorId: input.assistantInstructorId || null,
      note: input.note || null,
    },
  });
  revalidatePath("/admin/schedule");
}

export async function updateSession(sessionId, input) {
  await requireAdmin();
  const startAt = parseStartAt(input.date, input.startTime);
  if (!startAt) throw new Error("invalid_date");
  if (!CLASS_TYPES.includes(input.classType)) throw new Error("invalid_class_type");

  await prisma.classSession.update({
    where: { id: sessionId },
    data: {
      startAt,
      classType: input.classType,
      mainInstructorId:      input.mainInstructorId      || null,
      assistantInstructorId: input.assistantInstructorId || null,
      note: input.note || null,
    },
  });
  revalidatePath("/admin/schedule");
}

export async function deleteSession(sessionId) {
  await requireAdmin();
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
