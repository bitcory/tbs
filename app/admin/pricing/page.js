import Link from "next/link";
import { requireSuperAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import * as S from "@/lib/uiStyles";
import PricingClient from "./PricingClient";

const CLASS_TYPES = ["ZERO", "UP", "PRO"];

export default async function PricingPage() {
  await requireSuperAdmin();

  const rows = await prisma.pricingConfig.findMany();
  const byType = Object.fromEntries(rows.map((r) => [r.classType, r]));

  const initial = CLASS_TYPES.map((ct) => {
    const r = byType[ct];
    return {
      classType: ct,
      pricePerPerson: r?.pricePerPerson ?? 0,
      toolbShare:     r?.toolbShare     ?? 0.5,
      mainShare:      r?.mainShare      ?? 0.35,
      assistantShare: r?.assistantShare ?? 0.15,
    };
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a" }} className="auth-scroll">
      <section style={S.hero}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <span style={S.heroEyebrow}>PRICING</span>
          <h1 style={S.heroTitle}>단가 · 요율 관리</h1>
          <p style={S.heroSubtitle}>슈퍼관리자 전용 · 수정 시 즉시 반영</p>
        </div>
      </section>

      <div style={{ ...S.pageWrap, maxWidth: 800, padding: "28px 16px 80px", marginTop: -48, position: "relative" }}>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginBottom: 16 }}>
          <Link href="/admin/schedule" className="glass-hoverable" style={S.ghostBtn}>강의 일정</Link>
          <Link href="/admin" className="glass-hoverable" style={S.ghostBtn}>← 관리자</Link>
        </div>

        <PricingClient initial={initial} />
      </div>
    </div>
  );
}
