"use client";

import { useState, useTransition } from "react";
import * as S from "@/lib/uiStyles";

export default function MaterialRequestButton({
  step,
  hasAccess,
  ready,
  requestMaterials,
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState(null);

  const disabled = !hasAccess || !ready || pending;

  function onClick() {
    setResult(null);
    startTransition(async () => {
      const r = await requestMaterials(step);
      setResult(r);
      if (r?.ok) {
        setTimeout(() => setResult(null), 6000);
      }
    });
  }

  let label;
  if (!hasAccess) label = "🔒 권한 없음";
  else if (!ready) label = "⏳ 준비중";
  else if (pending) label = "📤 발송 중...";
  else label = "📩 강의자료 신청하기";

  const btnStyle = {
    ...S.primaryPill,
    padding: "10px 18px",
    fontSize: 13,
    width: "auto",
    minWidth: 160,
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
    ...(hasAccess && ready
      ? {}
      : {
          background: "#e2e8f0",
          color: "#64748b",
          boxShadow: "none",
          border: "1px solid #cbd5e1",
        }),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={hasAccess && ready ? "glass-hoverable" : undefined}
        style={btnStyle}
      >
        {label}
      </button>
      {result && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: "8px 12px",
            borderRadius: 10,
            background: result.ok ? "#dcfce7" : "#fee2e2",
            color: result.ok ? "#166534" : "#b91c1c",
            lineHeight: 1.5,
          }}
        >
          {result.ok ? "✓ " : "⚠ "}
          {result.message}
        </div>
      )}
    </div>
  );
}
