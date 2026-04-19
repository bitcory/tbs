import Link from "next/link";
import { requireAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { toggleStepAccess } from "./actions";
import RoleSelect from "./RoleSelect";
import * as S from "@/lib/uiStyles";

const ROLE_LABEL = { USER: "일반", STAFF: "운영진", SUPER_ADMIN: "슈퍼" };
const ROLE_BADGE = {
  USER: S.badgeGray,
  STAFF: S.badgeBlue,
  SUPER_ADMIN: S.badgePurple,
};

export default async function AdminPage() {
  const me = await requireAdmin();
  const isSuper = me.role === "SUPER_ADMIN";
  const users = await prisma.user.findMany({
    orderBy: [{ role: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a" }} className="auth-scroll">
      <section style={S.hero}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <span style={S.heroEyebrow}>ADMIN</span>
          <h1 style={S.heroTitle}>관리자 페이지</h1>
          <p style={S.heroSubtitle}>
            총 회원 {users.length}명 · 내 권한 <b>{ROLE_LABEL[me.role]}</b>
            {!isSuper && " (운영진은 단계 권한만 변경 가능)"}
          </p>
        </div>
      </section>

      <div style={{ ...S.pageWrap, maxWidth: "100%", padding: "28px 16px 80px", marginTop: -48, position: "relative", color: "#0f172a" }}>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginBottom: 16 }}>
          <Link href="/mypage" className="glass-hoverable" style={S.ghostBtn}>마이페이지</Link>
          <Link href="/" className="glass-hoverable" style={S.ghostBtn}>← 홈으로</Link>
        </div>

        <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: "#64748b" }}>
                  <th style={th}>닉네임</th>
                  <th style={th}>이메일</th>
                  <th style={th}>권한</th>
                  <th style={th}>Step 1</th>
                  <th style={th}>Step 2</th>
                  <th style={th}>Step 2-1</th>
                  <th style={th}>Step 3</th>
                  <th style={th}>Step 4</th>
                  <th style={th}>가입일</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
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
                      <td style={td}>
                        {canEditRole ? (
                          <RoleSelect userId={u.id} role={u.role} />
                        ) : (
                          <span style={S.badge(ROLE_BADGE[u.role])}>{ROLE_LABEL[u.role]}</span>
                        )}
                      </td>
                      {[1, 2, 21, 3, 4].map((step) => {
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const th = { textAlign: "left", padding: "14px 12px", fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", textTransform: "uppercase", color: "#64748b", whiteSpace: "nowrap" };
const td = { padding: "14px 12px", verticalAlign: "middle", color: "#0f172a", whiteSpace: "nowrap" };
