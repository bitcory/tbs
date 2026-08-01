import * as S from "@/lib/uiStyles";

const PROVIDER_LABEL = { kakao: "카카오", google: "구글" };

function GoogleMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}

/**
 * 로그인 수단 관리 카드.
 *
 * 핵심: 이미 로그인한 상태에서 구글 OAuth 를 타면 Auth.js 가 이메일과 무관하게
 * "현재 세션의 계정"에 구글을 연결한다. 카카오 가입 이메일이 naver 라도 문제없이
 * 붙기 때문에, 권한을 유지한 채 로그인 수단만 늘릴 수 있다.
 */
export default function LinkedAccountsCard({ providers, googleEnabled, linkAction, status }) {
  const hasGoogle = providers.includes("google");
  const hasKakao = providers.includes("kakao");

  return (
    <div style={{ ...S.card, padding: 22 }}>
      <div style={{ ...S.sectionTitle, marginBottom: 6 }}>로그인 수단</div>
      <p style={{ color: "var(--tb-text-muted)", fontSize: 12.5, lineHeight: 1.6, marginBottom: 16 }}>
        계정 하나에 여러 로그인 수단을 연결할 수 있습니다. 연결해두면 어느 쪽으로 로그인해도
        <strong> 같은 계정 · 같은 권한</strong>으로 들어옵니다.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        <ProviderRow
          icon={<span style={{ fontSize: 16 }}>💬</span>}
          label={PROVIDER_LABEL.kakao}
          connected={hasKakao}
        />
        <ProviderRow icon={<GoogleMark size={16} />} label={PROVIDER_LABEL.google} connected={hasGoogle} />
      </div>

      {status === "linked" && (
        <Notice tone="ok">구글 계정이 연결됐습니다. 이제 구글로도 로그인할 수 있습니다.</Notice>
      )}
      {status === "already-linked" && (
        <Notice tone="warn">
          이 구글 계정은 <strong>다른 회원에게 이미 연결</strong>되어 있어 연결하지 못했습니다.
          예전에 구글로 따로 가입하신 적이 있다면 관리자에게 계정 병합을 요청해 주세요.
        </Notice>
      )}
      {status === "error" && (
        <Notice tone="warn">연결에 실패했습니다. 잠시 후 다시 시도해 주세요.</Notice>
      )}

      {googleEnabled && !hasGoogle && (
        <form action={linkAction}>
          <button type="submit" className="glass-hoverable" style={{ ...S.googleBtn, marginTop: 2 }}>
            <GoogleMark />
            구글 계정 연결하기
          </button>
        </form>
      )}

      {hasGoogle && hasKakao && (
        <p style={{ fontSize: 12, color: "var(--tb-text-muted)", lineHeight: 1.6, margin: 0 }}>
          두 수단이 모두 연결되어 있습니다.
        </p>
      )}
    </div>
  );
}

function ProviderRow({ icon, label, connected }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "11px 14px",
        borderRadius: 12,
        background: "var(--tb-surface-2)",
        border: "1px solid var(--tb-border)",
      }}
    >
      <span style={{ display: "inline-flex", width: 20, justifyContent: "center" }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: "var(--tb-text)" }}>{label}</span>
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 800,
          padding: "3px 9px",
          borderRadius: 999,
          color: connected ? "#065f46" : "var(--tb-text-muted)",
          background: connected ? "#a7f3d0" : "transparent",
          border: connected ? "1px solid #6ee7b7" : "1px solid var(--tb-border)",
        }}
      >
        {connected ? "연결됨" : "미연결"}
      </span>
    </div>
  );
}

function Notice({ tone, children }) {
  const ok = tone === "ok";
  return (
    <p
      style={{
        margin: "0 0 12px",
        padding: "10px 12px",
        borderRadius: 10,
        fontSize: 12.5,
        lineHeight: 1.6,
        color: ok ? "#065f46" : "#7c2d12",
        background: ok ? "#d1fae5" : "#ffedd5",
        border: `1px solid ${ok ? "#6ee7b7" : "#fdba74"}`,
      }}
    >
      {children}
    </p>
  );
}
