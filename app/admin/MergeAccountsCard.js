"use client";

import { useState, useTransition } from "react";
import * as S from "@/lib/uiStyles";

/**
 * 중복 계정 병합 UI.
 *
 * candidates = 로그인 수단만 있고 권한/이력이 없는 껍데기 계정들. 카카오 회원이
 * 이메일이 달라 구글로 새로 가입해버린 전형적인 케이스가 여기 잡힌다.
 */
export default function MergeAccountsCard({ candidates, allUsers, mergeAction }) {
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [result, setResult] = useState(null);
  const [pending, startTransition] = useTransition();

  const source = candidates.find((c) => c.id === sourceId);

  const run = () => {
    if (!sourceId || !targetId) {
      setResult({ ok: false, message: "두 계정을 모두 선택하세요." });
      return;
    }
    const target = allUsers.find((u) => u.id === targetId);
    const ok = window.confirm(
      `아래 병합을 실행합니다.\n\n` +
        `삭제될 계정: ${label(source)}\n` +
        `남길 계정:   ${label(target)}\n\n` +
        `삭제될 계정의 로그인 수단이 남길 계정으로 옮겨지고, 삭제될 계정은 제거됩니다. 되돌릴 수 없습니다.`
    );
    if (!ok) return;

    startTransition(async () => {
      const r = await mergeAction(sourceId, targetId);
      setResult(r);
      if (r?.ok) {
        setSourceId("");
        setTargetId("");
      }
    });
  };

  return (
    <div style={{ ...S.card, padding: 20, marginBottom: 18 }}>
      <div style={{ ...S.sectionTitle, marginBottom: 6 }}>중복 계정 병합</div>
      <p style={{ color: "var(--tb-text-muted)", fontSize: 12.5, lineHeight: 1.65, marginBottom: 14 }}>
        기존 회원이 다른 이메일로 구글 가입을 해버려 계정이 둘로 나뉜 경우에 사용합니다.
        새로 생긴 껍데기 계정의 <strong>로그인 수단만 원래 계정으로 옮기고</strong> 껍데기는 삭제합니다.
        원래 계정의 권한·수강이력은 그대로 유지됩니다.
      </p>

      {candidates.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--tb-text-muted)", margin: 0 }}>
          병합할 후보가 없습니다. (권한·이력이 전혀 없는 계정만 후보로 잡힙니다)
        </p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 12 }}>
            <Field label="삭제될 계정 (껍데기)">
              <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} style={selectStyle}>
                <option value="">선택하세요</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {label(c)} · {c.providers.join("/")}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="남길 계정 (원래 계정)">
              <select value={targetId} onChange={(e) => setTargetId(e.target.value)} style={selectStyle}>
                <option value="">선택하세요</option>
                {allUsers
                  .filter((u) => u.id !== sourceId)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {label(u)}
                    </option>
                  ))}
              </select>
            </Field>
          </div>

          <button
            type="button"
            onClick={run}
            disabled={pending}
            className="tb-press"
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "none",
              background: pending ? "var(--tb-surface-2)" : "linear-gradient(135deg, #fb923c 0%, #f97316 100%)",
              color: pending ? "var(--tb-text-muted)" : "#1a1206",
              fontSize: 13.5,
              fontWeight: 800,
              cursor: pending ? "default" : "pointer",
            }}
          >
            {pending ? "병합 중…" : "병합 실행"}
          </button>

          {result && (
            <p
              style={{
                marginTop: 12,
                marginBottom: 0,
                padding: "10px 12px",
                borderRadius: 10,
                fontSize: 12.5,
                lineHeight: 1.6,
                color: result.ok ? "#065f46" : "#7c2d12",
                background: result.ok ? "#d1fae5" : "#ffedd5",
                border: `1px solid ${result.ok ? "#6ee7b7" : "#fdba74"}`,
              }}
            >
              {result.message}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function label(u) {
  if (!u) return "";
  return `${u.nickname || u.name || "(이름없음)"} · ${u.email || "이메일없음"}`;
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--tb-text-muted)", marginBottom: 6 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const selectStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--tb-border)",
  background: "var(--tb-surface-2)",
  color: "var(--tb-text)",
  fontSize: 13,
  fontFamily: "inherit",
};
