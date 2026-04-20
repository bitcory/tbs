"use client";

import { useState, useTransition } from "react";
import * as S from "@/lib/uiStyles";

export default function ProfileEditor({
  initialNickname,
  initialEmail,
  initialPhone,
  initialPrivacyAgreedAt,
  initialMarketingOptIn,
  updateProfile,
}) {
  const hadPrivacy = !!initialPrivacyAgreedAt;
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(initialNickname ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [privacyAgreed, setPrivacyAgreed] = useState(hadPrivacy);
  const [marketingOptIn, setMarketingOptIn] = useState(!!initialMarketingOptIn);
  const [savedNickname, setSavedNickname] = useState(initialNickname ?? "");
  const [savedEmail, setSavedEmail] = useState(initialEmail ?? "");
  const [savedPhone, setSavedPhone] = useState(initialPhone ?? "");
  const [savedMarketing, setSavedMarketing] = useState(!!initialMarketingOptIn);
  const [errorMsg, setErrorMsg] = useState("");
  const [pending, startTransition] = useTransition();

  function onCancel() {
    setNickname(savedNickname);
    setEmail(savedEmail);
    setPhone(savedPhone);
    setPrivacyAgreed(hadPrivacy);
    setMarketingOptIn(savedMarketing);
    setErrorMsg("");
    setEditing(false);
  }

  function onSave(e) {
    e.preventDefault();
    setErrorMsg("");
    if (!privacyAgreed) {
      setErrorMsg("개인정보 수집·이용에 동의해 주세요.");
      return;
    }
    const fd = new FormData();
    fd.set("nickname", nickname);
    fd.set("email", email);
    fd.set("phone", phone);
    if (privacyAgreed) fd.set("privacyAgreed", "on");
    if (marketingOptIn) fd.set("marketingOptIn", "on");
    startTransition(async () => {
      const res = await updateProfile(fd);
      if (res && res.ok === false) {
        setErrorMsg(res.message || "저장에 실패했습니다.");
        return;
      }
      setSavedNickname(nickname);
      setSavedEmail(email);
      setSavedPhone(phone);
      setSavedMarketing(marketingOptIn);
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

      <div style={{ marginBottom: 18 }}>
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

      <ConsentBlock
        editing={editing}
        privacyAgreed={privacyAgreed}
        setPrivacyAgreed={setPrivacyAgreed}
        marketingOptIn={marketingOptIn}
        setMarketingOptIn={setMarketingOptIn}
        privacyAgreedAt={initialPrivacyAgreedAt}
      />

      {errorMsg && (
        <div style={{ color: "#dc2626", fontSize: 13, marginTop: 12 }}>{errorMsg}</div>
      )}

      {editing && (
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
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

      <div
        style={{
          marginTop: 18,
          padding: "12px 14px",
          background: "#ecfdf5",
          border: "1px solid #a7f3d0",
          borderRadius: 10,
          fontSize: 12.5,
          color: "#065f46",
          lineHeight: 1.55,
        }}
      >
        📧 <strong>강의자료 안내</strong> — 강의자료는 <strong>이메일 또는 전화번호가 등록된 회원</strong>에게만 발송됩니다. 정확한 수신을 위해 회원정보를 최신 상태로 유지해 주세요.
      </div>
    </form>
  );
}

function ConsentBlock({
  editing,
  privacyAgreed,
  setPrivacyAgreed,
  marketingOptIn,
  setMarketingOptIn,
  privacyAgreedAt,
}) {
  const hasAgreedPrivacy = !!privacyAgreedAt;
  const box = {
    marginTop: 8,
    padding: "14px 16px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  };
  const row = { display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, lineHeight: 1.55, color: "#334155" };
  const cb = { marginTop: 3, width: 16, height: 16, accentColor: "#00996D", cursor: editing ? "pointer" : "default" };

  // 이미 동의한 경우, 수정 화면에서도 "동의 완료" 로만 표시 (취소는 회원 탈퇴를 통해서만 가능)
  const privacyAgreedDisplay = {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "4px 0",
  };
  const checkBadge = {
    marginTop: 2,
    width: 18,
    height: 18,
    borderRadius: 5,
    background: "linear-gradient(135deg, #68D970, #00996D)",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 900,
    flexShrink: 0,
  };

  return (
    <div style={box}>
      {hasAgreedPrivacy ? (
        <div style={privacyAgreedDisplay}>
          <span style={checkBadge}>✓</span>
          <span style={{ fontSize: 13, lineHeight: 1.55, color: "#334155" }}>
            <strong style={{ color: "#0f172a" }}>개인정보 수집·이용 동의 완료</strong>
            <br />
            <span style={{ color: "#64748b", fontSize: 12 }}>
              동의일자: {new Date(privacyAgreedAt).toLocaleDateString("ko-KR")} · 수집 항목: 닉네임, 이메일, 핸드폰번호 · 보관 기간: 회원 탈퇴 시까지
              <br />
              동의 철회는 회원 탈퇴를 통해서만 가능합니다.
            </span>
          </span>
        </div>
      ) : (
        <label style={row}>
          <input
            type="checkbox"
            checked={privacyAgreed}
            onChange={(e) => setPrivacyAgreed(e.target.checked)}
            disabled={!editing}
            style={cb}
          />
          <span>
            <strong style={{ color: "#0f172a" }}>[필수]</strong> 개인정보 수집·이용에 동의합니다.
            <br />
            <span style={{ color: "#64748b", fontSize: 12 }}>
              수집 항목: 닉네임, 이메일, 핸드폰번호 · 이용 목적: 강의 제공 및 회원 관리 · 보관 기간: 회원 탈퇴 시까지
            </span>
          </span>
        </label>
      )}

      <label style={row}>
        <input
          type="checkbox"
          checked={marketingOptIn}
          onChange={(e) => setMarketingOptIn(e.target.checked)}
          disabled={!editing}
          style={cb}
        />
        <span>
          <strong style={{ color: "#0f172a" }}>[선택]</strong> TOOLB의 강의 일정, AI 정보 등 마케팅 정보 수신에 동의합니다.
          <br />
          <span style={{ color: "#64748b", fontSize: 12 }}>
            이메일·문자로 발송되며 언제든지 수신 거부할 수 있습니다.
          </span>
        </span>
      </label>
    </div>
  );
}
