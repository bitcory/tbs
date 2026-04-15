"use client";

import { useTransition } from "react";
import { setRole } from "./actions";

export default function RoleSelect({ userId, role }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      disabled={pending}
      defaultValue={role}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => setRole(userId, next));
      }}
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid #cbd5e1",
        background: "#fff",
        fontSize: 13,
        fontFamily: "inherit",
        color: "#0f172a",
        cursor: pending ? "wait" : "pointer",
      }}
    >
      <option value="USER">일반</option>
      <option value="STAFF">운영진</option>
    </select>
  );
}
