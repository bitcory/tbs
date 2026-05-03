import Link from "next/link";
import { requireAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { toggleStepAccess } from "./actions";
import RoleSelect from "./RoleSelect";
import DeleteUserButton from "./DeleteUserButton";
import StepGroupDropdown from "./StepGroupDropdown";
import AdminSearchBox from "./AdminSearchBox";
import * as S from "@/lib/uiStyles";

const ROLE_LABEL = { USER: "일반", STAFF: "운영진", SUPER_ADMIN: "슈퍼" };
const ROLE_BADGE = {
  USER: S.badgeGray,
  STAFF: S.badgeBlue,
  SUPER_ADMIN: S.badgePurple,
};

const ZERO_STEP = 100;

const STEP1_OPTIONS = [
  { step: 11, label: "UP 1-1 · 말하는" },
  { step: 12, label: "UP 1-2 · 춤추는" },
  { step: 13, label: "UP 1-3 · 날아가는" },
  { step: 14, label: "UP 1-4 · 동물 인터뷰" },
];

const SINGLE_STEPS = [
  { step: 2, label: "UP 2" },
  { step: 21, label: "UP 3" },
];

const PRO_STEPS = [
  { step: 6, label: "PRO 1" },
  { step: 4, label: "PRO 2" },
  { step: 3, label: "PRO 4" },
];

const PAGE_SIZE = 30;

export default async function AdminPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const q = (typeof sp.q === "string" ? sp.q : "").trim();
  const pageRaw = parseInt(typeof sp.page === "string" ? sp.page : "1", 10);
  const reqPage = Math.max(1, Number.isFinite(pageRaw) ? pageRaw : 1);

  const me = await requireAdmin();
  const isSuper = me.role === "SUPER_ADMIN";

  // 운영진(STAFF / SUPER_ADMIN)은 항상 상단에 전체 표시 (검색·페이지네이션 무관).
  // 일반회원(USER)만 검색 + 페이지네이션 적용.
  const userWhere = {
    role: "USER",
    ...(q
      ? {
          OR: [
            { nickname: { contains: q, mode: "insensitive" } },
            { name:     { contains: q, mode: "insensitive" } },
            { email:    { contains: q, mode: "insensitive" } },
            { phone:    { contains: q } },
          ],
        }
      : {}),
  };

  const [staffUsers, filteredCount, totalUserCount] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["STAFF", "SUPER_ADMIN"] } },
      orderBy: [{ role: "desc" }, { createdAt: "asc" }], // SUPER_ADMIN → STAFF (enum 순서: USER, STAFF, SUPER_ADMIN → desc 시 SUPER_ADMIN 우선)
    }),
    prisma.user.count({ where: userWhere }),
    prisma.user.count({ where: { role: "USER" } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const page = Math.min(reqPage, totalPages);

  const userRows = await prisma.user.findMany({
    where: userWhere,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const start = filteredCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, filteredCount);

  function pageHref(p) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin?${qs}` : "/admin";
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a" }} className="auth-scroll">
      <section style={S.hero}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <span style={S.heroEyebrow}>ADMIN</span>
          <h1 style={S.heroTitle}>관리자 페이지</h1>
          <p style={S.heroSubtitle}>
            운영진 {staffUsers.length}명 · 일반 회원 {totalUserCount}명 · 내 권한 <b>{ROLE_LABEL[me.role]}</b>
            {!isSuper && " (운영진은 단계 권한만 변경 가능)"}
          </p>
        </div>
      </section>

      <div style={{ ...S.pageWrap, maxWidth: "100%", padding: "28px 16px 80px", marginTop: -48, position: "relative", color: "#0f172a" }}>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginBottom: 16, flexWrap: "wrap" }}>
          <Link href="/admin/schedule" className="glass-hoverable" style={S.ghostBtn}>강의 일정</Link>
          {isSuper && (
            <Link href="/admin/pricing" className="glass-hoverable" style={S.ghostBtn}>단가/요율</Link>
          )}
          <Link href="/mypage" className="glass-hoverable" style={S.ghostBtn}>마이페이지</Link>
          <Link href="/" className="glass-hoverable" style={S.ghostBtn}>← 홈으로</Link>
        </div>

        <AdminSearchBox
          initialQ={q}
          resultLabel={
            (q
              ? `"${q}" 검색 결과 ${filteredCount}명`
              : `일반 회원 ${filteredCount}명`) +
            (filteredCount > 0 ? ` · ${start}-${end} 표시 중` : "")
          }
        />

        <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                {/* Group header row */}
                <tr style={{ background: "#f1f5f9", color: "#334155", fontSize: 11 }}>
                  <th colSpan={4} style={groupTh("#64748b")}>기본 정보</th>
                  <th colSpan={1} style={groupTh("#64748b")}>ZERO CLASS</th>
                  <th colSpan={1 + SINGLE_STEPS.length} style={groupTh("#00996D")}>UP CLASS</th>
                  <th colSpan={PRO_STEPS.length} style={groupTh("#1E293B")}>PRO CLASS</th>
                  <th colSpan={isSuper ? 2 : 1} style={groupTh("#64748b")}>메타</th>
                </tr>
                <tr style={{ background: "#f8fafc", color: "#64748b" }}>
                  <th style={th}>닉네임</th>
                  <th style={th}>이메일</th>
                  <th style={th}>전화번호</th>
                  <th style={th}>권한</th>
                  <th style={th}>ZERO 전체</th>
                  <th style={th}>UP 1</th>
                  {SINGLE_STEPS.map((s) => (
                    <th key={s.step} style={th}>{s.label}</th>
                  ))}
                  {PRO_STEPS.map((s) => (
                    <th key={s.step} style={th}>{s.label}</th>
                  ))}
                  <th style={th}>가입일</th>
                  {isSuper && <th style={th}>관리</th>}
                </tr>
              </thead>
              <tbody>
                {[
                  ...staffUsers.map((u) => ({ kind: "user", u })),
                  ...(staffUsers.length > 0 && userRows.length > 0
                    ? [{ kind: "divider" }]
                    : []),
                  ...userRows.map((u) => ({ kind: "user", u })),
                ].map((row, idx) => {
                  if (row.kind === "divider") {
                    return (
                      <tr key="divider-staff-user">
                        <td
                          colSpan={isSuper ? 13 : 12}
                          style={{
                            padding: "8px 12px",
                            background: "#f8fafc",
                            color: "#64748b",
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            borderTop: "1px solid #e2e8f0",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          일반 회원
                          {q && ` · "${q}" 검색 결과 ${filteredCount}명`}
                        </td>
                      </tr>
                    );
                  }
                  const u = row.u;
                  const isSelf = u.id === me.id;
                  const isTargetSuper = u.role === "SUPER_ADMIN";
                  const canEditRole = isSuper && !isSelf && !isTargetSuper;
                  const canEditSteps = u.role === "USER";

                  return (
                    <tr key={u.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                      <td style={td}>
                        <b>{u.nickname ?? "-"}</b>
                        {isSelf && <span style={{ marginLeft: 6, fontSize: 11, color: "#94a3b8" }}>(나)</span>}
                      </td>
                      <td style={{ ...td, color: "#64748b" }}>{u.email ?? "-"}</td>
                      <td style={{ ...td, color: "#64748b" }}>{u.phone ?? "-"}</td>
                      <td style={td}>
                        {canEditRole ? (
                          <RoleSelect userId={u.id} role={u.role} />
                        ) : (
                          <span style={S.badge(ROLE_BADGE[u.role])}>{ROLE_LABEL[u.role]}</span>
                        )}
                      </td>

                      {/* ZERO CLASS (single toggle) */}
                      {(() => {
                        const hasAccess = u.role !== "USER" || u.stepAccess.includes(ZERO_STEP);
                        return (
                          <td style={td}>
                            {canEditSteps ? (
                              <form
                                action={async () => {
                                  "use server";
                                  await toggleStepAccess(u.id, ZERO_STEP, !hasAccess);
                                }}
                              >
                                <button
                                  className="tb-press-soft"
                                  style={{
                                    ...S.badge(hasAccess ? S.badgeGreen : S.badgeGray),
                                    border: "none",
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  {hasAccess ? "✓ 허용" : "✕ 차단"}
                                </button>
                              </form>
                            ) : (
                              <span
                                style={{
                                  ...S.badge(hasAccess ? S.badgeGreen : S.badgeGray),
                                  opacity: 0.6,
                                }}
                              >
                                {hasAccess ? "자동" : "-"}
                              </span>
                            )}
                          </td>
                        );
                      })()}

                      {/* UP CLASS - Step 1 variants dropdown */}
                      <td style={td}>
                        {canEditSteps ? (
                          <StepGroupDropdown
                            userId={u.id}
                            options={STEP1_OPTIONS}
                            currentSteps={u.stepAccess}
                            accent="#00996D"
                          />
                        ) : (
                          <span style={{ ...S.badge(S.badgeGreen), opacity: 0.6 }}>자동</span>
                        )}
                      </td>

                      {/* UP CLASS - single-toggle steps */}
                      {SINGLE_STEPS.map(({ step }) => {
                        const hasAccess = u.role !== "USER" || u.stepAccess.includes(step);
                        return (
                          <td key={step} style={td}>
                            {canEditSteps ? (
                              <form
                                action={async () => {
                                  "use server";
                                  await toggleStepAccess(u.id, step, !hasAccess);
                                }}
                              >
                                <button
                                  className="tb-press-soft"
                                  style={{
                                    ...S.badge(hasAccess ? S.badgeGreen : S.badgeGray),
                                    border: "none",
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  {hasAccess ? "✓ 허용" : "✕ 차단"}
                                </button>
                              </form>
                            ) : (
                              <span
                                style={{
                                  ...S.badge(hasAccess ? S.badgeGreen : S.badgeGray),
                                  opacity: 0.6,
                                }}
                              >
                                {hasAccess ? "자동" : "-"}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* PRO CLASS */}
                      {PRO_STEPS.map(({ step }) => {
                        const hasAccess = u.role !== "USER" || u.stepAccess.includes(step);
                        return (
                          <td key={step} style={td}>
                            {canEditSteps ? (
                              <form
                                action={async () => {
                                  "use server";
                                  await toggleStepAccess(u.id, step, !hasAccess);
                                }}
                              >
                                <button
                                  className="tb-press-soft"
                                  style={{
                                    ...S.badge(hasAccess ? S.badgeGreen : S.badgeGray),
                                    border: "none",
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  {hasAccess ? "✓ 허용" : "✕ 차단"}
                                </button>
                              </form>
                            ) : (
                              <span
                                style={{
                                  ...S.badge(hasAccess ? S.badgeGreen : S.badgeGray),
                                  opacity: 0.6,
                                }}
                              >
                                {hasAccess ? "자동" : "-"}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      <td style={{ ...td, color: "#94a3b8", fontSize: 12 }}>
                        {new Date(u.createdAt).toLocaleDateString("ko-KR")}
                      </td>
                      {isSuper && (
                        <td style={td}>
                          {!isSelf && (
                            <DeleteUserButton
                              userId={u.id}
                              label={u.nickname ?? u.email ?? u.id}
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {userRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={isSuper ? 13 : 12}
                      style={{ padding: "40px 12px", textAlign: "center", color: "#94a3b8", fontSize: 14, borderTop: "1px solid #e2e8f0" }}
                    >
                      {q ? `"${q}" 검색 결과가 없습니다.` : "표시할 일반 회원이 없습니다."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
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
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="tb-press-soft" style={pageBtn}>
                ‹ 이전
              </Link>
            ) : (
              <span style={{ ...pageBtn, opacity: 0.4, cursor: "not-allowed" }}>‹ 이전</span>
            )}

            {pageNumbers(page, totalPages).map((p, i) =>
              p === "…" ? (
                <span key={`gap-${i}`} style={{ padding: "0 6px", color: "#94a3b8" }}>…</span>
              ) : p === page ? (
                <span
                  key={p}
                  style={{ ...pageBtn, background: "#016837", color: "#fff", fontWeight: 800, border: "1px solid #016837" }}
                >
                  {p}
                </span>
              ) : (
                <Link key={p} href={pageHref(p)} className="tb-press-soft" style={pageBtn}>
                  {p}
                </Link>
              )
            )}

            {page < totalPages ? (
              <Link href={pageHref(page + 1)} className="tb-press-soft" style={pageBtn}>
                다음 ›
              </Link>
            ) : (
              <span style={{ ...pageBtn, opacity: 0.4, cursor: "not-allowed" }}>다음 ›</span>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}

// 1 … 4 5 [6] 7 8 … 23 형태로 페이지 번호 배열 만들기
function pageNumbers(current, total) {
  const out = [];
  const window = 1; // current ± window
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
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#0f172a",
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
};

const th = { textAlign: "left", padding: "14px 12px", fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", textTransform: "uppercase", color: "#64748b", whiteSpace: "nowrap" };
const td = { padding: "14px 12px", verticalAlign: "middle", color: "#0f172a", whiteSpace: "nowrap" };

function groupTh(color) {
  return {
    textAlign: "center",
    padding: "10px 12px",
    fontWeight: 800,
    fontSize: 11,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color,
    borderBottom: `2px solid ${color}`,
    whiteSpace: "nowrap",
  };
}
