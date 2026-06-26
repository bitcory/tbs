"use client";

import { useState, useMemo } from "react";
import * as S from "@/lib/uiStyles";

// 서버에서 미리 렌더된 행 노드(rows)와 검색용 메타(meta, 소문자 텍스트)를 받아
// 클라이언트에서 즉시 필터 + 페이지네이션 한다. 서버 왕복 없음.
// 행 안의 서버 액션 토글은 그대로 동작(노드를 그대로 렌더만 하므로).
export default function MembersTable({
  tab,
  thead,        // <thead> 노드 (탭별로 서버에서 렌더)
  rows,         // <tr> 노드 배열
  meta,         // rows 와 같은 순서의 소문자 검색 텍스트 배열
  pageSize = 30,
  emptyColSpan,
  paginated = false,
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const q = query.trim().toLowerCase();

  const filteredIdx = useMemo(() => {
    if (!q) return rows.map((_, i) => i);
    return meta.reduce((acc, t, i) => {
      if (t.includes(q)) acc.push(i);
      return acc;
    }, []);
  }, [q, meta, rows]);

  const filteredCount = filteredIdx.length;
  const totalPages = paginated ? Math.max(1, Math.ceil(filteredCount / pageSize)) : 1;
  const curPage = Math.min(page, totalPages);

  const pageIdx = paginated
    ? filteredIdx.slice((curPage - 1) * pageSize, curPage * pageSize)
    : filteredIdx;

  const start = filteredCount === 0 ? 0 : paginated ? (curPage - 1) * pageSize + 1 : 1;
  const end = paginated ? Math.min(curPage * pageSize, filteredCount) : filteredCount;

  const label =
    (query.trim()
      ? `"${query.trim()}" 검색 결과 ${filteredCount}명`
      : `${tab === "staff" ? "운영진" : "일반 회원"} ${filteredCount}명`) +
    (paginated && filteredCount > 0 ? ` · ${start}-${end} 표시 중` : "");

  function onChangeQuery(v) {
    setQuery(v);
    setPage(1);
  }

  return (
    <>
      {/* 검색창 — 클라이언트 즉시 필터 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 14,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            placeholder="닉네임 / 이름 / 이메일 / 전화번호 검색"
            style={{
              width: "100%",
              padding: "10px 38px 10px 14px",
              borderRadius: 10,
              border: "1px solid var(--tb-border)",
              background: "var(--tb-surface-2)",
              fontSize: 14,
              fontFamily: "inherit",
              color: "var(--tb-text)",
              outline: "none",
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => onChangeQuery("")}
              aria-label="지우기"
              className="tb-press-soft"
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                width: 26,
                height: 26,
                padding: 0,
                borderRadius: 13,
                border: "1px solid var(--tb-border)",
                background: "var(--tb-surface-2)",
                color: "var(--tb-text-muted)",
                fontSize: 14,
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>
        <div style={{ marginLeft: "auto", fontSize: 13, color: "var(--tb-text-muted)" }}>
          {label}
        </div>
      </div>

      <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            {thead}
            <tbody>
              {pageIdx.map((i) => rows[i])}
              {filteredCount === 0 && (
                <tr>
                  <td
                    colSpan={emptyColSpan}
                    style={{
                      padding: "40px 12px",
                      textAlign: "center",
                      color: "var(--tb-text-muted)",
                      fontSize: 14,
                      borderTop: "1px solid var(--tb-border)",
                    }}
                  >
                    {query.trim()
                      ? `"${query.trim()}" 검색 결과가 없습니다.`
                      : tab === "staff"
                      ? "운영진이 없습니다."
                      : "표시할 일반 회원이 없습니다."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 페이지네이션 — user 탭에서만, 클라이언트 처리 */}
      {paginated && totalPages > 1 && (
        <nav
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            marginTop: 18,
            flexWrap: "wrap",
          }}
        >
          {curPage > 1 ? (
            <button type="button" onClick={() => setPage(curPage - 1)} className="tb-press-soft" style={pageBtn}>
              ‹ 이전
            </button>
          ) : (
            <span style={{ ...pageBtn, opacity: 0.4, cursor: "not-allowed" }}>‹ 이전</span>
          )}

          {pageNumbers(curPage, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} style={{ padding: "0 6px", color: "var(--tb-text-muted)" }}>
                …
              </span>
            ) : p === curPage ? (
              <span
                key={p}
                style={{ ...pageBtn, background: "#f97316", color: "#1a1206", fontWeight: 800, border: "1px solid #f97316" }}
              >
                {p}
              </span>
            ) : (
              <button key={p} type="button" onClick={() => setPage(p)} className="tb-press-soft" style={pageBtn}>
                {p}
              </button>
            )
          )}

          {curPage < totalPages ? (
            <button type="button" onClick={() => setPage(curPage + 1)} className="tb-press-soft" style={pageBtn}>
              다음 ›
            </button>
          ) : (
            <span style={{ ...pageBtn, opacity: 0.4, cursor: "not-allowed" }}>다음 ›</span>
          )}
        </nav>
      )}
    </>
  );
}

// 1 … 4 5 [6] 7 8 … 23 형태로 페이지 번호 배열 만들기
function pageNumbers(current, total) {
  const out = [];
  const window = 1;
  const lo = Math.max(2, current - window);
  const hi = Math.min(total - 1, current + window);
  out.push(1);
  if (lo > 2) out.push("…");
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < total - 1) out.push("…");
  if (total > 1) out.push(total);
  return out;
}

const pageBtn = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 36,
  height: 36,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid var(--tb-border)",
  background: "var(--tb-surface)",
  color: "var(--tb-text)",
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
  cursor: "pointer",
  fontFamily: "inherit",
};
