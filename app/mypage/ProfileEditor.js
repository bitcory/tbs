"use client";

import { useState, useTransition } from "react";
import * as S from "@/lib/uiStyles";

export default function ProfileEditor({ initialNickname, initialEmail, initialPhone, updateProfile }) {
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(initialNickname ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [savedNickname, setSavedNickname] = useState(initialNickname ?? "");
  const [savedEmail, setSavedEmail] = useState(initialEmail ?? "");
  const [savedPhone, setSavedPhone] = useState(initialPhone ?? "");
  const [pending, startTransition] = useTransition();

  function onCancel() {
    setNickname(savedNickname);
    setEmail(savedEmail);
    setPhone(savedPhone);
    setEditing(false);
  }

  function onSave(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("nickname", nickname);
    fd.set("email", email);
    fd.set("phone", phone);
    startTransition(async () => {
      await updateProfile(fd);
      setSavedNickname(nickname);
      setSavedEmail(email);
      setSavedPhone(phone);
      setEditing(false);
    });
  }

  return (
    <form onSubmit={onSave} style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={S.sectionTitle}>회원 정보</div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)} className="glass-hoverable"
            style={{ ...S.ghostBtn, padding: "8px 14px" }}
          >
            수정
          </button>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={S.label}>닉네임</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          disabled={!editing}
          required
          minLength={2}
          maxLength={20}
          style={{ ...S.input, background: editing ? "#fff" : "#f8fafc", cursor: editing ? "text" : "default" }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={S.label}>이메일</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={!editing}
          required
          style={{ ...S.input, background: editing ? "#fff" : "#f8fafc", cursor: editing ? "text" : "default" }}
        />
      </div>

      <div style={{ marginBottom: editing ? 20 : 0 }}>
        <label style={S.label}>핸드폰 번호</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={!editing}
          placeholder="010-1234-5678"
          inputMode="tel"
          pattern="[0-9+\-\s]*"
          maxLength={20}
          style={{ ...S.input, background: editing ? "#fff" : "#f8fafc", cursor: editing ? "text" : "default" }}
        />
      </div>

      {editing && (
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="submit"
            disabled={pending} className="glass-hoverable"
            style={{ ...S.primaryBtn, width: "auto", padding: "12px 24px", opacity: pending ? 0.6 : 1 }}
          >
            {pending ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending} className="glass-hoverable"
            style={{ ...S.ghostBtn, padding: "12px 20px" }}
          >
            취소
          </button>
        </div>
      )}
    </form>
  );
}
