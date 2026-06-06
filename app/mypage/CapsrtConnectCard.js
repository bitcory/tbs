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
    <div style={S.card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ ...S.sectionTitle, marginBottom: 0 }}>캡컷SRT 앱 연결</div>
        <span style={S.badge(hasAccess ? { background: "rgba(34,211,238,0.18)", color: CYAN } : S.badgeGray)}>
          {hasAccess ? "사용 가능" : "권한 없음"}
        </span>
      </div>

      {!hasAccess ? (
        <p style={{ color: "#a8a4b2", fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
          캡컷SRT 데스크톱 앱 사용 권한이 아직 없습니다.<br />
          관리자에게 사용 승인을 요청하면 이곳에서 연결코드를 발급할 수 있어요.
        </p>
      ) : (
        <>
          <p style={{ color: "#a8a4b2", fontSize: 13, lineHeight: 1.6, marginTop: 0, marginBottom: 14 }}>
            아래 연결코드를 복사해 캡컷SRT 앱의 로그인 화면에 붙여넣으면 사용이 시작됩니다.
            코드는 외부에 공유하지 마세요. 분실하거나 유출되면 <b>재발급</b>하면 됩니다.
          </p>

          {code ? (
            <>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                  padding: "14px 16px", borderRadius: 12,
                  background: "#1f1d26", border: `1px solid ${CYAN}33`,
                }}
              >
                <code style={{ flex: 1, minWidth: 180, fontSize: 16, fontWeight: 700, letterSpacing: "0.04em", color: "#f5f4f7", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                  {code}
                </code>
                <button onClick={copy} className="tb-press-soft" style={btn(CYAN, "#15141a")}>
                  {copied ? "✓ 복사됨" : "복사"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <button onClick={issue} disabled={pending} className="tb-press-soft" style={btnGhost}>
                  {pending ? "처리 중…" : "재발급"}
                </button>
                <button onClick={revoke} disabled={pending} className="tb-press-soft" style={btnGhost}>
                  연결 해제
                </button>
              </div>
            </>
          ) : (
            <button onClick={issue} disabled={pending} className="tb-press-soft" style={{ ...btn(CYAN, "#15141a"), width: "100%", padding: "14px" }}>
              {pending ? "발급 중…" : "연결코드 발급"}
            </button>
          )}

          {msg && <p style={{ color: "#fb7185", fontSize: 12.5, marginTop: 10, marginBottom: 0 }}>{msg}</p>}
        </>
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
  background: "#26242e", color: "#a8a4b2", fontSize: 13, fontWeight: 700,
  border: "1px solid #34323d", fontFamily: "inherit",
};
