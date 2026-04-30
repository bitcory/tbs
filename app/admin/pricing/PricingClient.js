"use client";

import { useState, useTransition } from "react";
import * as S from "@/lib/uiStyles";
import { CLASS_TYPE_COLOR, formatClassLabel } from "@/lib/pricing";
import { updatePricing } from "./actions";

export default function PricingClient({ initial }) {
  const [rows, setRows] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState(null);

  function update(idx, patch) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function asPct(v) {
    return Number.isFinite(v) ? Math.round(v * 1000) / 10 : 0;
  }

  function setPct(idx, key, pctStr) {
    const n = Number(pctStr);
    if (!Number.isFinite(n)) return;
    update(idx, { [key]: n / 100 });
  }

  function save() {
    setMsg(null);
    const bad = rows.find((r) => Math.abs(r.toolbShare + r.mainShare + r.assistantShare - 1) > 0.001);
    if (bad) {
      setMsg({ type: "err", text: `${formatClassLabel(bad.classType, bad.stepLevel)} 요율 합이 100%가 아닙니다.` });
      return;
    }
    startTransition(async () => {
      try {
        await updatePricing(rows);
        setMsg({ type: "ok", text: "저장됨." });
      } catch (e) {
        setMsg({ type: "err", text: e?.message || "저장 실패" });
      }
    });
  }

  return (
    <div style={{ ...S.card }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {rows.map((r, idx) => {
          const c = CLASS_TYPE_COLOR[r.classType];
          const sum = r.toolbShare + r.mainShare + r.assistantShare;
          const sumOk = Math.abs(sum - 1) < 0.001;
          return (
            <div key={`${r.classType}_${r.stepLevel}`} style={{
              border: "1px solid #e2e8f0", borderRadius: 12, padding: 16,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 13, fontWeight: 800,
                  background: c.bg, color: c.fg,
                }}>
                  {formatClassLabel(r.classType, r.stepLevel)}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: sumOk ? "#16a34a" : "#dc2626" }}>
                  요율 합계 {asPct(sum)}%
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginBottom: 12 }}>
                <Field label="1인 단가 (원)">
                  <input
                    type="number" min={0} step={1000}
                    value={r.pricePerPerson}
                    onChange={(e) => update(idx, { pricePerPerson: Number(e.target.value) || 0 })}
                    style={S.input}
                  />
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <Field label="툴비 (%)">
                  <input
                    type="number" min={0} max={100} step={1}
                    value={asPct(r.toolbShare)}
                    onChange={(e) => setPct(idx, "toolbShare", e.target.value)}
                    style={S.input}
                  />
                </Field>
                <Field label="주강사 (%)">
                  <input
                    type="number" min={0} max={100} step={1}
                    value={asPct(r.mainShare)}
                    onChange={(e) => setPct(idx, "mainShare", e.target.value)}
                    style={S.input}
                  />
                </Field>
                <Field label="보조강사 (%)">
                  <input
                    type="number" min={0} max={100} step={1}
                    value={asPct(r.assistantShare)}
                    onChange={(e) => setPct(idx, "assistantShare", e.target.value)}
                    style={S.input}
                  />
                </Field>
              </div>
            </div>
          );
        })}
      </div>

      {msg && (
        <div style={{
          marginTop: 14, padding: "10px 14px", borderRadius: 10,
          background: msg.type === "ok" ? "#dcfce7" : "#fee2e2",
          color:      msg.type === "ok" ? "#166534" : "#b91c1c",
          fontSize: 13, fontWeight: 600,
        }}>{msg.text}</div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <button
          onClick={save}
          disabled={pending}
          className="tb-press"
          style={{
            padding: "10px 22px", borderRadius: 999, fontSize: 14, fontWeight: 700,
            color: "#fff", background: "#016837", border: "none", cursor: "pointer",
          }}
        >
          {pending ? "저장중..." : "저장"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}
