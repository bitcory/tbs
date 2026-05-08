"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Save, X } from "lucide-react";

function fmtDate(d) {
  return new Date(d).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SuggestionList({ items, updateAction, deleteAction }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <div
        style={{
          padding: "32px 16px",
          textAlign: "center",
          color: "#94a3b8",
          fontSize: 14,
          background: "#f8fafc",
          borderRadius: 12,
          border: "1px dashed #e2e8f0",
        }}
      >
        아직 작성한 건의사항이 없습니다.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((it) => {
        const isEditing = editingId === it.id;
        return (
          <div
            key={it.id}
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              padding: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
                fontSize: 12,
                color: "#94a3b8",
              }}
            >
              <span>
                작성 {fmtDate(it.createdAt)}
                {it.updatedAt && new Date(it.updatedAt).getTime() !== new Date(it.createdAt).getTime() && (
                  <span style={{ marginLeft: 8 }}>· 수정 {fmtDate(it.updatedAt)}</span>
                )}
              </span>
              {!isEditing && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(it.id);
                      setDraft(it.content);
                    }}
                    className="tb-press-soft"
                    style={iconBtn}
                  >
                    <Pencil size={14} />
                    수정
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm("정말 삭제할까요?")) return;
                      startTransition(async () => {
                        await deleteAction(it.id);
                      });
                    }}
                    className="tb-press-soft"
                    style={{ ...iconBtn, color: "#dc2626", borderColor: "#fecaca" }}
                  >
                    <Trash2 size={14} />
                    삭제
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={5}
                  style={textareaStyle}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setDraft("");
                    }}
                    className="tb-press-soft"
                    style={iconBtn}
                  >
                    <X size={14} />
                    취소
                  </button>
                  <button
                    type="button"
                    disabled={pending || !draft.trim()}
                    onClick={() => {
                      const fd = new FormData();
                      fd.set("content", draft);
                      startTransition(async () => {
                        const res = await updateAction(it.id, fd);
                        if (res?.ok) {
                          setEditingId(null);
                          setDraft("");
                        } else if (res?.message) {
                          alert(res.message);
                        }
                      });
                    }}
                    className="tb-press"
                    style={{ ...iconBtn, background: "#6366f1", color: "#fff", border: "none" }}
                  >
                    <Save size={14} />
                    저장
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  fontSize: 14,
                  color: "#0f172a",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.6,
                }}
              >
                {it.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const iconBtn = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 700,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#334155",
  cursor: "pointer",
  fontFamily: "inherit",
};

const textareaStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  fontSize: 14,
  color: "#0f172a",
  fontFamily: "inherit",
  resize: "vertical",
  outline: "none",
  lineHeight: 1.6,
};
