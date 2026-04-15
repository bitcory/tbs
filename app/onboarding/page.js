import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as S from "@/lib/uiStyles";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (me?.onboarded) redirect("/mypage");

  async function save(formData) {
    "use server";
    const s = await auth();
    if (!s?.user) redirect("/login");

    const nickname = String(formData.get("nickname") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();

    if (!nickname || !email) return;

    await prisma.user.update({
      where: { id: s.user.id },
      data: { nickname, email, onboarded: true },
    });
    revalidatePath("/", "layout");
    redirect("/mypage");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a" }} className="auth-scroll">
      <section style={S.hero}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <span style={S.heroEyebrow}>STEP 1 · 회원 정보</span>
          <h1 style={S.heroTitle}>환영합니다!</h1>
          <p style={S.heroSubtitle}>닉네임과 이메일만 입력하면 바로 시작할 수 있어요.</p>
        </div>
      </section>

      <div style={{ ...S.pageWrap, maxWidth: 460, marginTop: -48, position: "relative" }}>
        <form action={save} style={S.card}>
          <div style={{ marginBottom: 18 }}>
            <label style={S.label}>닉네임</label>
            <input
              name="nickname"
              defaultValue={me?.name ?? ""}
              required
              minLength={2}
              maxLength={20}
              placeholder="강의에서 표시될 닉네임"
              style={S.input}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={S.label}>이메일</label>
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              style={S.input}
            />
          </div>

          <button type="submit" className="glass-hoverable" style={S.primaryBtn}>
            저장하고 시작하기 →
          </button>
        </form>
      </div>
    </div>
  );
}
