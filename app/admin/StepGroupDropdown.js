"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { toggleStepAccess } from "./actions";

export default function StepGroupDropdown({
  userId,
  options,
  currentSteps,
  canEdit = true,
  accent = "#f97316",
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stepSet = new Set(currentSteps);
  const granted = options.filter((o) => stepSet.has(o.step)).length;
  const total = options.length;
  const allOn = granted === total;
  const noneOn = granted === 0;

  // 버튼 기준 viewport 좌표로 메뉴를 고정 배치 (테이블 overflow 로 잘리는 것 방지).
  // 아래 공간이 부족하면 위로 펼친다.
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const btn = btnRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const menuHeight = Math.min(48 + options.length * 36, 320);
      const gap = 6;
      const spaceBelow = window.innerHeight - r.bottom;
      const flipUp = spaceBelow < menuHeight + gap && r.top > menuHeight + gap;
      setMenuPos({
        left: r.left,
        top: flipUp ? r.top - gap - menuHeight : r.bottom + gap,
        maxHeight: Math.max(120, (flipUp ? r.top : window.innerHeight - r.bottom) - gap - 8),
      });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const badgeBg = allOn
    ? "rgba(249,115,22,0.18)"
    : noneOn
    ? "#26242e"
    : "rgba(245,158,11,0.18)";
  const badgeColor = allOn
    ? "#fb923c"
    : noneOn
    ? "#a8a4b2"
    : "#fcd34d";
  const badgeBorder = allOn
    ? "rgba(249,115,22,0.45)"
    : noneOn
    ? "#34323d"
    : "rgba(245,158,11,0.45)";

  const onToggle = (step, nextEnabled) => {
    startTransition(() => toggleStepAccess(userId, step, nextEnabled));
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        ref={btnRef}
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

      {mounted && open && menuPos && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: menuPos.top,
            left: menuPos.left,
            zIndex: 9999,
            minWidth: 220,
            maxHeight: menuPos.maxHeight,
            overflowY: "auto",
            background: "#1f1d26",
            border: "1px solid #34323d",
            borderRadius: 12,
            boxShadow: "0 14px 36px rgba(0,0,0,0.45)",
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
                  color: "#f5f4f7",
                  background: checked ? "rgba(249,115,22,0.12)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!checked) e.currentTarget.style.background = "#26242e";
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
        </div>,
        document.body
      )}
    </div>
  );
}
