"use client";

import { useState, useTransition } from "react";
import * as S from "@/lib/uiStyles";

const CYAN = "#22d3ee";

// CapCutSRT 데스크톱 앱 연결코드 카드.
// - hasAccess: 관리자에게 capsrt 허용을 받았는지
// - initialCode: 이미 발급된 연결코드(없으면 null)
// - issueAction / revokeAction: 서버 액션
export default function CapsrtConnectCard({ hasAccess, initialCode, issueAction, revokeAction }) {
  const [code, setCode] = useState(initialCode || null);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();

  function issue() {
    setMsg("");
    startTransition(async () => {
      const r = await issueAction();
      if (r?.ok) {
        setCode(r.token);
        setCopied(false);
      } else {
        setMsg(r?.message || "발급에 실패했습니다.");
      }
    });
  }

  function revoke() {
    setMsg("");
    startTransition(async () => {
      const r = await revokeAction();
      if (r?.ok) setCode(null);
    });
  }

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setMsg("복사에 실패했습니다. 코드를 길게 눌러 직접 복사하세요.");
    }
  }

  return (
    <div style={{ ...S.card, padding: 22, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ ...S.sectionTitle, marginBottom: 0 }}>캡컷SRT 앱 연결</div>
        <span style={S.badge(hasAccess ? { background: "rgba(34,211,238,0.18)", color: CYAN } : S.badgeGray)}>
          {hasAccess ? "사용 가능" : "권한 없음"}
        </span>
      </div>

      {!hasAccess ? (
        <p style={{ color: "var(--tb-text-muted)", fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
          캡컷SRT 데스크톱 앱 사용 권한이 아직 없습니다.<br />
          관리자에게 사용 승인을 요청하면 이곳에서 연결코드를 발급할 수 있어요.
        </p>
      ) : (
        <div style={{ marginTop: "auto" }}>
          {code ? (
            <>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  height: 50, padding: "0 8px 0 16px", borderRadius: 14,
                  background: "var(--tb-surface)", border: `1px solid ${CYAN}33`,
                }}
              >
                <code style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, letterSpacing: "0.03em", color: "var(--tb-text)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {code}
                </code>
                <button onClick={copy} className="tb-press-soft" style={btn(CYAN, "var(--tb-bg)")}>
                  {copied ? "✓ 복사됨" : "복사"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button onClick={issue} disabled={pending} className="tb-press-soft" style={btnGhost}>
                  {pending ? "처리 중…" : "재발급"}
                </button>
                <button onClick={revoke} disabled={pending} className="tb-press-soft" style={btnGhost}>
                  연결 해제
                </button>
              </div>
            </>
          ) : (
            <button onClick={issue} disabled={pending} className="tb-press-soft" style={{ ...btn(CYAN, "var(--tb-bg)"), width: "100%", height: 50 }}>
              {pending ? "발급 중…" : "연결코드 발급"}
            </button>
          )}

          {msg && <p style={{ color: "#fb7185", fontSize: 12.5, marginTop: 10, marginBottom: 0 }}>{msg}</p>}
        </div>
      )}
    </div>
  );
}

function btn(bg, fg) {
  return {
    padding: "10px 18px", borderRadius: 10, border: "none", cursor: "pointer",
    background: bg, color: fg, fontSize: 14, fontWeight: 800, fontFamily: "inherit",
    whiteSpace: "nowrap",
  };
}

const btnGhost = {
  padding: "10px 16px", borderRadius: 10, cursor: "pointer",
  background: "var(--tb-surface-2)", color: "var(--tb-text-muted)", fontSize: 13, fontWeight: 700,
  border: "1px solid var(--tb-border)", fontFamily: "inherit",
};
