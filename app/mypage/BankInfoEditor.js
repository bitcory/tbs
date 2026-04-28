"use client";

import { useState, useTransition } from "react";
import * as S from "@/lib/uiStyles";

export default function BankInfoEditor({
  initialBankName,
  initialBankAccount,
  initialAccountHolder,
  updateBankInfo,
}) {
  const [editing, setEditing] = useState(false);
  const [bankName, setBankName] = useState(initialBankName ?? "");
  const [bankAccount, setBankAccount] = useState(initialBankAccount ?? "");
  const [accountHolder, setAccountHolder] = useState(initialAccountHolder ?? "");
  const [savedBankName, setSavedBankName] = useState(initialBankName ?? "");
  const [savedBankAccount, setSavedBankAccount] = useState(initialBankAccount ?? "");
  const [savedAccountHolder, setSavedAccountHolder] = useState(initialAccountHolder ?? "");
  const [errorMsg, setErrorMsg] = useState("");
  const [pending, startTransition] = useTransition();

  function onCancel() {
    setBankName(savedBankName);
    setBankAccount(savedBankAccount);
    setAccountHolder(savedAccountHolder);
    setErrorMsg("");
    setEditing(false);
  }

  function onSave(e) {
    e.preventDefault();
    setErrorMsg("");
    const fd = new FormData();
    fd.set("bankName", bankName);
    fd.set("bankAccount", bankAccount);
    fd.set("accountHolder", accountHolder);
    startTransition(async () => {
      const res = await updateBankInfo(fd);
      if (res && res.ok === false) {
        setErrorMsg(res.message || "저장에 실패했습니다.");
        return;
      }
      setSavedBankName(bankName);
      setSavedBankAccount(bankAccount);
      setSavedAccountHolder(accountHolder);
      setEditing(false);
    });
  }

  const inputStyle = (on) => ({
    ...S.input,
    background: on ? "#fff" : "#f8fafc",
    cursor: on ? "text" : "default",
  });

  return (
    <form onSubmit={onSave} style={{ ...S.card, marginTop: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={S.sectionTitle}>정산 정보 (강사 계좌)</div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="glass-hoverable"
            style={{ ...S.ghostBtn, padding: "8px 14px" }}
          >
            수정
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 14 }}>
        <div>
          <label style={S.label}>은행명</label>
          <input
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            disabled={!editing}
            placeholder="예: 국민은행"
            maxLength={30}
            style={inputStyle(editing)}
          />
        </div>
        <div>
          <label style={S.label}>계좌번호</label>
          <input
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
            disabled={!editing}
            placeholder="예: 123-456-789012"
            maxLength={40}
            style={inputStyle(editing)}
          />
        </div>
        <div>
          <label style={S.label}>예금주</label>
          <input
            value={accountHolder}
            onChange={(e) => setAccountHolder(e.target.value)}
            disabled={!editing}
            placeholder="예: 홍길동"
            maxLength={30}
            style={inputStyle(editing)}
          />
        </div>
      </div>

      {errorMsg && (
        <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 10 }}>{errorMsg}</div>
      )}

      {editing && (
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="submit"
            disabled={pending}
            className="glass-hoverable"
            style={{ ...S.primaryBtn, width: "auto", padding: "12px 24px", opacity: pending ? 0.6 : 1 }}
          >
            {pending ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="glass-hoverable"
            style={{ ...S.ghostBtn, padding: "12px 20px" }}
          >
            취소
          </button>
        </div>
      )}

      <div style={{
        marginTop: 14, padding: "10px 14px",
        background: "#fef9c3", border: "1px solid #fde047",
        borderRadius: 10, fontSize: 12.5, color: "#713f12", lineHeight: 1.55,
      }}>
        💡 강의 정산 시 이 계좌로 송금됩니다. 운영진/슈퍼관리자만 수집되며, 변경 즉시 반영됩니다.
      </div>
    </form>
  );
}
