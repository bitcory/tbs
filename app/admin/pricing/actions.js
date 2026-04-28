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
    const price = Number(r.pricePerPerson);
    const t = Number(r.toolbShare);
    const m = Number(r.mainShare);
    const a = Number(r.assistantShare);

    if (!Number.isFinite(price) || price < 0) throw new Error("invalid_price");
    if (![t, m, a].every((n) => Number.isFinite(n) && n >= 0 && n <= 1)) throw new Error("invalid_share");
    if (Math.abs(t + m + a - 1) > 0.001) throw new Error(`shares_must_sum_to_1:${r.classType}`);
  }

  await prisma.$transaction(rows.map((r) =>
    prisma.pricingConfig.upsert({
      where: { classType: r.classType },
      update: {
        pricePerPerson: Math.round(Number(r.pricePerPerson)),
        toolbShare:     Number(r.toolbShare),
        mainShare:      Number(r.mainShare),
        assistantShare: Number(r.assistantShare),
        updatedById:    me.id,
      },
      create: {
        classType:      r.classType,
        pricePerPerson: Math.round(Number(r.pricePerPerson)),
        toolbShare:     Number(r.toolbShare),
        mainShare:      Number(r.mainShare),
        assistantShare: Number(r.assistantShare),
        updatedById:    me.id,
      },
    })
  ));

  revalidatePath("/admin/pricing");
  revalidatePath("/admin/schedule");
}
