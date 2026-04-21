"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { toggleStepAccess } from "./actions";

export default function StepGroupDropdown({
  userId,
  options,
  currentSteps,
  canEdit = true,
  accent = "#00996D",
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef(null);

  const stepSet = new Set(currentSteps);
  const granted = options.filter((o) => stepSet.has(o.step)).length;
  const total = options.length;
  const allOn = granted === total;
  const noneOn = granted === 0;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const badgeBg = allOn
    ? "#dcfce7"
    : noneOn
    ? "#f1f5f9"
    : "#fef3c7";
  const badgeColor = allOn
    ? "#166534"
    : noneOn
    ? "#64748b"
    : "#92400e";
  const badgeBorder = allOn
    ? "#86efac"
    : noneOn
    ? "#cbd5e1"
    : "#fcd34d";

  const onToggle = (step, nextEnabled) => {
    startTransition(() => toggleStepAccess(userId, step, nextEnabled));
  };

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        disabled={!canEdit || pending}
        onClick={() => canEdit && setOpen((v) => !v)}
        style={{
          padding: "6px 10px",
          borderRadius: 100,
          border: `1px solid ${badgeBorder}`,
          background: badgeBg,
          color: badgeColor,
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "inherit",
          cursor: canEdit ? (pending ? "wait" : "pointer") : "default",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          whiteSpace: "nowrap",
          opacity: canEdit ? 1 : 0.55,
        }}
      >
        <span>{granted}/{total}</span>
        {canEdit && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M2 3.5L5 6.5L8 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 50,
            minWidth: 220,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            boxShadow: "0 14px 36px rgba(15,23,42,0.18)",
            padding: 6,
          }}
        >
          {options.map((opt) => {
            const checked = stepSet.has(opt.step);
            return (
              <label
                key={opt.step}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 8,
                  cursor: pending ? "wait" : "pointer",
                  fontSize: 13,
                  color: "#0f172a",
                  background: checked ? "#ecfdf5" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!checked) e.currentTarget.style.background = "#f8fafc";
                }}
                onMouseLeave={(e) => {
                  if (!checked) e.currentTarget.style.background = "transparent";
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={pending}
                  onChange={(e) => onToggle(opt.step, e.target.checked)}
                  style={{
                    width: 16,
                    height: 16,
                    accentColor: accent,
                    cursor: pending ? "wait" : "pointer",
                  }}
                />
                <span style={{ fontWeight: checked ? 700 : 500 }}>{opt.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
