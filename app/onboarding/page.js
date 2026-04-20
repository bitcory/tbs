import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as S from "@/lib/uiStyles";
import { logConsent } from "@/lib/consent";

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
    const phoneRaw = String(formData.get("phone") ?? "").trim();
    const phone = phoneRaw.replace(/[^\d+\-]/g, "");
    const privacyAgreed = formData.get("privacyAgreed") === "on";
    const marketingOptIn = formData.get("marketingOptIn") === "on";

    if (!nickname || !email || !privacyAgreed) return;

    const now = new Date();
    await prisma.user.update({
      where: { id: s.user.id },
      data: {
        nickname,
        email,
        phone: phone || null,
        onboarded: true,
        privacyAgreedAt: now,
        marketingOptIn,
        marketingAgreedAt: marketingOptIn ? now : null,
      },
    });

    // 동의 이력 로그 (INSERT-only, 감사 추적용)
    await logConsent(s.user.id, "privacy", "granted", "onboarding");
    if (marketingOptIn) {
      await logConsent(s.user.id, "marketing", "granted", "onboarding");
    }

    revalidatePath("/", "layout");
    redirect("/mypage");
  }

  const consentBox = {
    padding: "14px 16px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 20,
  };
  const consentRow = {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    fontSize: 13,
    lineHeight: 1.55,
    color: "#334155",
  };
  const cb = { marginTop: 3, width: 16, height: 16, accentColor: "#00996D", cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a" }} className="auth-scroll">
      <section style={S.hero}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <span style={S.heroEyebrow}>STEP 1 · 회원 정보</span>
          <h1 style={S.heroTitle}>환영합니다!</h1>
          <p style={S.heroSubtitle}>회원 정보를 입력하고 동의 후 바로 시작할 수 있어요.</p>
        </div>
      </section>

      <div style={{ ...S.pageWrap, maxWidth: 520, marginTop: -48, position: "relative" }}>
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

          <div style={{ marginBottom: 18 }}>
            <label style={S.label}>이메일</label>
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              style={S.input}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={S.label}>핸드폰 번호</label>
            <input
              name="phone"
              type="tel"
              placeholder="010-1234-5678"
              inputMode="tel"
              pattern="[0-9+\-\s]*"
              maxLength={20}
              style={S.input}
            />
          </div>

          <div style={consentBox}>
            <label style={consentRow}>
              <input type="checkbox" name="privacyAgreed" required style={cb} />
              <span>
                <strong style={{ color: "#0f172a" }}>[필수]</strong> 개인정보 수집·이용에 동의합니다.
                <br />
                <span style={{ color: "#64748b", fontSize: 12 }}>
                  수집 항목: 닉네임, 이메일, 핸드폰번호 · 이용 목적: 강의 제공 및 회원 관리 · 보관 기간: 회원 탈퇴 시까지
                </span>
              </span>
            </label>
            <label style={consentRow}>
              <input type="checkbox" name="marketingOptIn" style={cb} />
              <span>
                <strong style={{ color: "#0f172a" }}>[선택]</strong> TOOLB의 강의 일정, AI 정보 등 마케팅 정보 수신에 동의합니다.
                <br />
                <span style={{ color: "#64748b", fontSize: 12 }}>
                  이메일·문자로 발송되며 언제든지 수신 거부할 수 있습니다.
                </span>
              </span>
            </label>
          </div>

          <button type="submit" className="glass-hoverable" style={S.primaryBtn}>
            저장하고 시작하기 →
          </button>
        </form>
      </div>
    </div>
  );
}
