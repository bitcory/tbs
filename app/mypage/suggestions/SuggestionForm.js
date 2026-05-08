"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";

export default function SuggestionForm({ nickname, createAction }) {
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!content.trim()) return;
        const fd = new FormData();
        fd.set("content", content);
        startTransition(async () => {
          const res = await createAction(fd);
          if (res?.ok) setContent("");
          else if (res?.message) alert(res.message);
        });
      }}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748b" }}>
        <span>작성자</span>
        <span
          style={{
            padding: "4px 10px",
            background: "#f1f5f9",
            borderRadius: 999,
            fontWeight: 700,
            color: "#334155",
            fontSize: 12,
          }}
        >
          {nickname ?? "이름없음"}
        </span>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>· 프로필 닉네임이 자동으로 사용됩니다</span>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={6}
        maxLength={4000}
        placeholder="운영진에게 전달하고 싶은 의견·건의·문의를 자유롭게 작성해 주세요."
        style={{
          width: "100%",
          padding: "14px 16px",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          fontSize: 14,
          color: "#0f172a",
          fontFamily: "inherit",
          resize: "vertical",
          outline: "none",
          lineHeight: 1.6,
          minHeight: 140,
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>{content.length} / 4000자</span>
        <button
          type="submit"
          disabled={pending || !content.trim()}
          className="tb-press"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 22px",
            borderRadius: 12,
            background: !content.trim() || pending
              ? "#cbd5e1"
              : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 800,
            border: "none",
            cursor: !content.trim() || pending ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          <Send size={16} />
          {pending ? "등록 중…" : "건의사항 등록"}
        </button>
      </div>
    </form>
  );
}
