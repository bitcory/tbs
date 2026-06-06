import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as S from "@/lib/uiStyles";
import SuggestionForm from "./SuggestionForm";
import SuggestionList from "./SuggestionList";
import { createSuggestion, updateSuggestion, deleteSuggestion } from "./actions";

export default async function SuggestionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [me, items] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { nickname: true },
    }),
    prisma.suggestion.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, content: true, createdAt: true, updatedAt: true },
    }),
  ]);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a" }} className="auth-scroll">
      <section style={S.hero}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <span style={S.heroEyebrow}>SUGGESTIONS</span>
          <h1 style={S.heroTitle}>운영건의함</h1>
          <p style={S.heroSubtitle}>
            운영진에게 직접 전달되는 비공개 건의함입니다. 다른 회원에게는 공개되지 않습니다.
          </p>
        </div>
      </section>

      <div style={{ ...S.pageWrap, maxWidth: 760, padding: "28px 20px 80px", marginTop: 0, position: "relative" }}>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 16 }}>
          <Link href="/mypage" className="glass-hoverable" style={S.ghostBtn}>
            ← 마이페이지
          </Link>
        </div>

        <div style={{ ...S.card, marginBottom: 18 }}>
          <div style={S.sectionTitle}>새 건의 작성</div>
          <SuggestionForm nickname={me?.nickname} createAction={createSuggestion} />
        </div>

        <div style={S.card}>
          <div style={{ ...S.sectionTitle, display: "flex", alignItems: "center", gap: 8 }}>
            내가 보낸 건의
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
                background: "#f1f5f9",
                color: "#64748b",
              }}
            >
              {items.length}
            </span>
          </div>
          <SuggestionList
            items={items}
            updateAction={updateSuggestion}
            deleteAction={deleteSuggestion}
          />
        </div>
      </div>
    </div>
  );
}
