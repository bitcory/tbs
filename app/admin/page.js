import Link from "next/link";
import { requireAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { toggleStepAccess, toggleSuggestionViewer, toggleCapsrtAccess } from "./actions";
import RoleSelect from "./RoleSelect";
import DeleteUserButton from "./DeleteUserButton";
import StepGroupDropdown from "./StepGroupDropdown";
import MembersTable from "./MembersTable";
import * as S from "@/lib/uiStyles";
import { maskPhone } from "@/lib/format";

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
  { step: 5, label: "PRO 2" },
  { step: 7, label: "PRO 3" },
  { step: 8, label: "PRO 4" },
];

const MASTER_STEPS = [
  { step: 4, label: "MASTER 1" },
  { step: 3, label: "MASTER 2" },
];

const PAGE_SIZE = 30;

export default async function AdminPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const tab = sp.tab === "staff" ? "staff" : "user";

  const me = await requireAdmin();
  const isSuper = me.role === "SUPER_ADMIN";

  // 운영건의함 열람 권한 — 슈퍼 또는 슈퍼가 지정한 STAFF
  const meRow = await prisma.user.findUnique({
    where: { id: me.id },
    select: { canViewSuggestions: true },
  });
  const canViewSuggestions = isSuper || !!meRow?.canViewSuggestions;

  // 검색/페이지네이션은 클라이언트(MembersTable)에서 처리하므로
  // 활성 탭의 전체 회원을 한 번에 가져온다 (서버 왕복 없이 즉시 검색).
  const [userTotalCount, staffTotalCount, visibleRows] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({ where: { role: { in: ["STAFF", "SUPER_ADMIN"] } } }),
    tab === "staff"
      ? prisma.user.findMany({
          where: { role: { in: ["STAFF", "SUPER_ADMIN"] } },
          orderBy: [{ role: "desc" }, { createdAt: "asc" }],
        })
      : prisma.user.findMany({
          where: { role: "USER" },
          orderBy: { createdAt: "desc" },
        }),
  ]);

  // 검색용 메타 텍스트 (소문자). 전화번호 검색은 슈퍼 관리자만.
  const searchMeta = visibleRows.map((u) =>
    [u.nickname, u.name, u.email, isSuper ? u.phone : ""]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
  );

  // 탭 전환은 URL Link 로 유지 (다른 param 보존)
  function tabHref(t) {
    return t === "staff" ? "/admin?tab=staff" : "/admin";
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--tb-bg)", color: "var(--tb-text)" }} className="auth-scroll">
      <section style={S.hero}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <span style={S.heroEyebrow}>ADMIN</span>
          <h1 style={S.heroTitle}>관리자 페이지</h1>
          <p style={S.heroSubtitle}>
            운영진 {staffTotalCount}명 · 일반 회원 {userTotalCount}명 · 내 권한 <b>{ROLE_LABEL[me.role]}</b>
            {!isSuper && " (운영진은 단계 권한만 변경 가능)"}
          </p>
        </div>
      </section>

      <div style={{ ...S.pageWrap, maxWidth: "100%", padding: "20px 16px 80px", marginTop: 0, position: "relative", color: "var(--tb-text)" }}>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginBottom: 16, flexWrap: "wrap" }}>
          <Link href="/admin/schedule" className="glass-hoverable" style={S.ghostBtn}>강의 일정</Link>
          {canViewSuggestions && (
            <Link href="/admin/suggestions" className="glass-hoverable" style={S.ghostBtn}>운영건의함</Link>
          )}
          {isSuper && (
            <Link href="/admin/pricing" className="glass-hoverable" style={S.ghostBtn}>단가/요율</Link>
          )}
          <Link href="/mypage" className="glass-hoverable" style={S.ghostBtn}>마이페이지</Link>
          <Link href="/" className="glass-hoverable" style={S.ghostBtn}>← 홈으로</Link>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 14,
            borderBottom: "1px solid var(--tb-border)",
          }}
        >
          {[
            { key: "user",  label: "일반 회원", count: userTotalCount },
            { key: "staff", label: "운영진",   count: staffTotalCount },
          ].map((t) => {
            const active = tab === t.key;
            return (
              <Link
                key={t.key}
                href={tabHref(t.key)}
                style={{
                  padding: "12px 20px",
                  fontSize: 14,
                  fontWeight: 700,
                  color: active ? "#f97316" : "var(--tb-text-muted)",
                  borderBottom: active ? "3px solid #f97316" : "3px solid transparent",
                  marginBottom: -1,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {t.label}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: active ? "rgba(249,115,22,0.18)" : "var(--tb-surface-2)",
                    color: active ? "#fb923c" : "var(--tb-text-muted)",
                  }}
                >
                  {t.count}
                </span>
              </Link>
            );
          })}
        </div>

        <MembersTable
          tab={tab}
          pageSize={PAGE_SIZE}
          paginated={tab === "user"}
          emptyColSpan={(isSuper ? 15 : 14) + (tab === "staff" ? 1 : 0)}
          meta={searchMeta}
          thead={
            <thead>
              {/* Group header row */}
              <tr style={{ background: "var(--tb-surface)", color: "var(--tb-text)", fontSize: 11 }}>
                <th colSpan={tab === "staff" ? 5 : 4} style={groupTh("var(--tb-text-muted)")}>기본 정보</th>
                <th colSpan={1} style={groupTh("var(--tb-text-muted)")}>ZERO CLASS</th>
                <th colSpan={1 + SINGLE_STEPS.length} style={groupTh("#f97316")}>UP CLASS</th>
                <th colSpan={PRO_STEPS.length} style={groupTh("var(--tb-text)")}>PRO CLASS</th>
                <th colSpan={MASTER_STEPS.length} style={groupTh("#fb7185")}>MASTER CLASS</th>
                <th colSpan={1} style={groupTh("#22d3ee")}>CAPCUT SRT</th>
                <th colSpan={isSuper ? 2 : 1} style={groupTh("var(--tb-text-muted)")}>메타</th>
              </tr>
              <tr style={{ background: "var(--tb-surface-2)", color: "var(--tb-text-muted)" }}>
                <th style={th}>닉네임</th>
                <th style={th}>이메일</th>
                <th style={th}>전화번호</th>
                <th style={th}>권한</th>
                {tab === "staff" && <th style={th}>건의함 열람</th>}
                <th style={th}>ZERO 전체</th>
                <th style={th}>UP 1</th>
                {SINGLE_STEPS.map((s) => (
                  <th key={s.step} style={th}>{s.label}</th>
                ))}
                {PRO_STEPS.map((s) => (
                  <th key={s.step} style={th}>{s.label}</th>
                ))}
                {MASTER_STEPS.map((s) => (
                  <th key={s.step} style={th}>{s.label}</th>
                ))}
                <th style={th}>캡컷SRT 앱</th>
                <th style={th}>가입일</th>
                {isSuper && <th style={th}>관리</th>}
              </tr>
            </thead>
          }
          rows={visibleRows.map((u) => {
                  const isSelf = u.id === me.id;
                  const isTargetSuper = u.role === "SUPER_ADMIN";
                  const canEditRole = isSuper && !isSelf && !isTargetSuper;
                  const canEditSteps = u.role === "USER";

                  return (
                    <tr key={u.id} style={{ borderTop: "1px solid var(--tb-border)" }}>
                      <td style={td}>
                        <b>{u.nickname ?? "-"}</b>
                        {isSelf && <span style={{ marginLeft: 6, fontSize: 11, color: "var(--tb-text-muted)" }}>(나)</span>}
                      </td>
                      <td style={{ ...td, color: "var(--tb-text-muted)" }}>{u.email ?? "-"}</td>
                      <td style={{ ...td, color: "var(--tb-text-muted)" }}>
                        {isSuper || isSelf ? (u.phone ?? "-") : maskPhone(u.phone)}
                      </td>
                      <td style={td}>
                        {canEditRole ? (
                          <RoleSelect userId={u.id} role={u.role} />
                        ) : (
                          <span style={S.badge(ROLE_BADGE[u.role])}>{ROLE_LABEL[u.role]}</span>
                        )}
                      </td>

                      {/* 건의함 열람 (운영진 탭 전용) */}
                      {tab === "staff" && (() => {
                        const isTargetSuperAdmin = u.role === "SUPER_ADMIN";
                        const enabled = isTargetSuperAdmin || u.canViewSuggestions;
                        const canToggle = isSuper && !isTargetSuperAdmin;
                        return (
                          <td style={td}>
                            {canToggle ? (
                              <form
                                action={async () => {
                                  "use server";
                                  await toggleSuggestionViewer(u.id, !enabled);
                                }}
                              >
                                <button
                                  className="tb-press-soft"
                                  style={{
                                    ...S.badge(enabled ? S.badgePurple : S.badgeGray),
                                    border: "none",
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  {enabled ? "✓ 허용" : "✕ 차단"}
                                </button>
                              </form>
                            ) : (
                              <span
                                style={{
                                  ...S.badge(enabled ? S.badgePurple : S.badgeGray),
                                  opacity: 0.6,
                                }}
                              >
                                {isTargetSuperAdmin ? "자동" : enabled ? "허용" : "-"}
                              </span>
                            )}
                          </td>
                        );
                      })()}

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
                            accent="#f97316"
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

                      {/* MASTER CLASS */}
                      {MASTER_STEPS.map(({ step }) => {
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
                                    ...S.badge(hasAccess ? S.badgePurple : S.badgeGray),
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
                                  ...S.badge(hasAccess ? S.badgePurple : S.badgeGray),
                                  opacity: 0.6,
                                }}
                              >
                                {hasAccess ? "자동" : "-"}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* CAPCUT SRT 데스크톱 앱 허용 */}
                      {(() => {
                        const cyan = { background: "rgba(34,211,238,0.18)", color: "#22d3ee" };
                        const hasAccess = u.role !== "USER" || u.capsrtAccess;
                        const canToggle = u.role === "USER";
                        return (
                          <td style={td}>
                            {canToggle ? (
                              <form
                                action={async () => {
                                  "use server";
                                  await toggleCapsrtAccess(u.id, !hasAccess);
                                }}
                              >
                                <button
                                  className="tb-press-soft"
                                  style={{
                                    ...S.badge(hasAccess ? cyan : S.badgeGray),
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
                                  ...S.badge(hasAccess ? cyan : S.badgeGray),
                                  opacity: 0.6,
                                }}
                              >
                                {hasAccess ? "자동" : "-"}
                              </span>
                            )}
                          </td>
                        );
                      })()}

                      <td style={{ ...td, color: "var(--tb-text-muted)", fontSize: 12 }}>
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
        />
      </div>
    </div>
  );
}

const th = { textAlign: "left", padding: "14px 12px", fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--tb-text-muted)", whiteSpace: "nowrap" };
const td = { padding: "14px 12px", verticalAlign: "middle", color: "var(--tb-text)", whiteSpace: "nowrap" };

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
