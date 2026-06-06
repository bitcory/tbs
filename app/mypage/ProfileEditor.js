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
    <form onSubmit={onSave} style={{ ...S.card, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
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

      <div style={{ marginBottom: 10 }}>
        <label style={S.label}>닉네임</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          disabled={!editing}
          required
          minLength={2}
          maxLength={20}
          style={{ ...S.input, padding: "9px 12px", fontSize: 14, background: editing ? "#26242e" : "#201f27", cursor: editing ? "text" : "default" }}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={S.label}>이메일</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={!editing}
          required
          style={{ ...S.input, padding: "9px 12px", fontSize: 14, background: editing ? "#26242e" : "#201f27", cursor: editing ? "text" : "default" }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
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
          style={{ ...S.input, padding: "9px 12px", fontSize: 14, background: editing ? "#26242e" : "#201f27", cursor: editing ? "text" : "default" }}
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
        <div style={{ color: "#f87171", fontSize: 13, marginTop: 12 }}>{errorMsg}</div>
      )}

      {editing && (
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
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
          marginTop: 12,
          padding: "9px 12px",
          background: "rgba(249,115,22,0.12)",
          border: "1px solid rgba(249,115,22,0.35)",
          borderRadius: 10,
          fontSize: 12,
          color: "#fb923c",
          lineHeight: 1.5,
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
  const [open, setOpen] = useState(false);
  const hasAgreedPrivacy = !!privacyAgreedAt;

  const wrap = {
    marginTop: 8,
    background: "#1f1d26",
    border: "1px solid #34323d",
    borderRadius: 12,
    overflow: "hidden",
  };
  const summary = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "9px 14px",
    cursor: "pointer",
    background: "transparent",
    border: "none",
    width: "100%",
    textAlign: "left",
    fontFamily: "inherit",
    color: "#f5f4f7",
  };
  const body = {
    padding: "0 16px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    borderTop: "1px solid #34323d",
    paddingTop: 14,
  };
  const row = { display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, lineHeight: 1.55, color: "#f5f4f7" };
  const cb = { marginTop: 3, width: 16, height: 16, accentColor: "#f97316", cursor: editing ? "pointer" : "default" };
  const miniBadge = (ok) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 8px",
    borderRadius: 100,
    fontSize: 11,
    fontWeight: 700,
    background: ok ? "rgba(249,115,22,0.18)" : "#26242e",
    color: ok ? "#fb923c" : "#a8a4b2",
  });

  return (
    <div style={wrap}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={summary}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#f5f4f7" }}>
            동의 내역
          </span>
          <span style={miniBadge(hasAgreedPrivacy)}>
            개인정보 {hasAgreedPrivacy ? "✓" : "미동의"}
          </span>
          <span style={miniBadge(marketingOptIn)}>
            마케팅 {marketingOptIn ? "ON" : "OFF"}
          </span>
        </span>
        <span
          style={{
            fontSize: 12,
            color: "#a8a4b2",
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            display: "inline-block",
          }}
        >
          ▼
        </span>
      </button>

      {open && (
        <div style={body}>
          {hasAgreedPrivacy ? (
            <div style={row}>
              <span
                style={{
                  marginTop: 2,
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  background: "linear-gradient(135deg, #fb923c, #f97316)",
                  color: "#f5f4f7",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                ✓
              </span>
              <span>
                <strong style={{ color: "#f5f4f7" }}>개인정보 수집·이용 동의 완료</strong>
                <br />
                <span style={{ color: "#a8a4b2", fontSize: 12 }}>
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
                <strong style={{ color: "#f5f4f7" }}>[필수]</strong> 개인정보 수집·이용에 동의합니다.
                <br />
                <span style={{ color: "#a8a4b2", fontSize: 12 }}>
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
              <strong style={{ color: "#f5f4f7" }}>[선택]</strong> TOOLB의 강의 일정, AI 정보 등 마케팅 정보 수신에 동의합니다.
              <br />
              <span style={{ color: "#a8a4b2", fontSize: 12 }}>
                이메일·문자로 발송되며 언제든지 수신 거부할 수 있습니다.
              </span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
