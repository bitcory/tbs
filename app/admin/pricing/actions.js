"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/access";

const CLASS_TYPES = ["ZERO", "UP", "PRO"];

export async function updatePricing(rows) {
  const me = await requireSuperAdmin();
  if (!Array.isArray(rows)) throw new Error("invalid_payload");

  for (const r of rows) {
    if (!CLASS_TYPES.includes(r.classType)) throw new Error("invalid_class_type");
    const lvl = Number(r.stepLevel);
    if (!Number.isInteger(lvl) || lvl < 0 || lvl > 9) throw new Error("invalid_step_level");
    const price = Number(r.pricePerPerson);
    const t = Number(r.toolbShare);
    const m = Number(r.mainShare);
    const a = Number(r.assistantShare);
    const v = Number(r.reserveShare ?? 0);

    if (!Number.isFinite(price) || price < 0) throw new Error("invalid_price");
    if (![t, m, a, v].every((n) => Number.isFinite(n) && n >= 0 && n <= 1)) throw new Error("invalid_share");
    if (Math.abs(t + m + a + v - 1) > 0.001) throw new Error(`shares_must_sum_to_1:${r.classType}_${lvl}`);
  }

  await prisma.$transaction(rows.map((r) =>
    prisma.pricingConfig.upsert({
      where: { classType_stepLevel: { classType: r.classType, stepLevel: Number(r.stepLevel) } },
      update: {
        pricePerPerson: Math.round(Number(r.pricePerPerson)),
        toolbShare:     Number(r.toolbShare),
        mainShare:      Number(r.mainShare),
        assistantShare: Number(r.assistantShare),
        reserveShare:   Number(r.reserveShare ?? 0),
        updatedById:    me.id,
      },
      create: {
        classType:      r.classType,
        stepLevel:      Number(r.stepLevel),
        pricePerPerson: Math.round(Number(r.pricePerPerson)),
        toolbShare:     Number(r.toolbShare),
        mainShare:      Number(r.mainShare),
        assistantShare: Number(r.assistantShare),
        reserveShare:   Number(r.reserveShare ?? 0),
        updatedById:    me.id,
      },
    })
  ));

  revalidatePath("/admin/pricing");
  revalidatePath("/admin/schedule");
}
