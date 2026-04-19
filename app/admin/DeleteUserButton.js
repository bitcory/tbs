"use client";

import { useTransition } from "react";
import { deleteUser } from "./actions";

export default function DeleteUserButton({ userId, label }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="tb-press-soft"
      disabled={pending}
      onClick={() => {
        const ok = confirm(
          `'${label}' 회원을 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
        );
        if (!ok) return;
        startTransition(() => deleteUser(userId));
      }}
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        border: "none",
        background: "#fee2e2",
        color: "#b91c1c",
        fontSize: 12,
        fontWeight: 700,
        cursor: pending ? "wait" : "pointer",
        fontFamily: "inherit",
      }}
    >
      {pending ? "삭제 중…" : "삭제"}
    </button>
  );
}
