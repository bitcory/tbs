import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as S from "@/lib/uiStyles";
import { adminDeleteSuggestion } from "./actions";

function fmtDate(d) {
  return new Date(d).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminSuggestionsPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const q = (typeof sp.q === "string" ? sp.q : "").trim();

  const session = await auth();
  // layout 에서 이미 게이트 통과 — 여기서는 SUPER 여부만 추가 확인
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const isSuper = me?.role === "SUPER_ADMIN";

  const where = q
    ? {
        OR: [
          { nickname: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const items = await prisma.suggestion.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      nickname: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
    take: 200,
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a" }} className="auth-scroll">
      <section style={S.hero}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <span style={S.heroEyebrow}>ADMIN · SUGGESTIONS</span>
          <h1 style={S.heroTitle}>운영건의함 · 전체 열람</h1>
          <p style={S.heroSubtitle}>
            회원이 보낸 비공개 건의사항입니다. 작성자 닉네임만 표시되며, 연락처 정보는 노출되지 않습니다.
          </p>
        </div>
      </section>

      <div style={{ ...S.pageWrap, maxWidth: 960, padding: "28px 20px 80px", marginTop: 0, position: "relative" }}>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 16, flexWrap: "wrap" }}>
          <Link href="/admin" className="glass-hoverable" style={S.ghostBtn}>
            ← 관리자
          </Link>
        </div>

        <form
          method="get"
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="닉네임 또는 내용 검색"
            style={{ ...S.input, flex: 1 }}
          />
          <button
            type="submit"
            className="tb-press"
            style={{
              padding: "10px 20px",
              background: "#0f172a",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            검색
          </button>
          {q && (
            <Link
              href="/admin/suggestions"
              className="glass-hoverable"
              style={{ ...S.ghostBtn, padding: "10px 16px" }}
            >
              초기화
            </Link>
          )}
        </form>

        <div style={{ marginBottom: 12, fontSize: 13, color: "#64748b" }}>
          {q ? `"${q}" 검색 결과 ${items.length}건` : `최근 건의 ${items.length}건`}
          {items.length === 200 && " (최대 200건 표시)"}
        </div>

        {items.length === 0 ? (
          <div
            style={{
              padding: "48px 16px",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 14,
              background: "#fff",
              borderRadius: 14,
              border: "1px dashed #e2e8f0",
            }}
          >
            표시할 건의사항이 없습니다.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map((it) => (
              <div
                key={it.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        padding: "4px 12px",
                        background: "#f3e8ff",
                        color: "#7e22ce",
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {it.nickname}
                    </span>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>
                      {fmtDate(it.createdAt)}
                      {new Date(it.updatedAt).getTime() !== new Date(it.createdAt).getTime() && (
                        <span style={{ marginLeft: 6 }}>· 수정 {fmtDate(it.updatedAt)}</span>
                      )}
                    </span>
                  </div>
                  {isSuper && (
                    <form
                      action={async () => {
                        "use server";
                        await adminDeleteSuggestion(it.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="tb-press-soft"
                        style={{
                          padding: "6px 12px",
                          fontSize: 12,
                          fontWeight: 700,
                          borderRadius: 8,
                          border: "1px solid #fecaca",
                          background: "#fff",
                          color: "#dc2626",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        삭제
                      </button>
                    </form>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "#0f172a",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                  }}
                >
                  {it.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
