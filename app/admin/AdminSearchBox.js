"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";

// 입력 → 300ms 디바운스 → URL push (?q=...). 서버 컴포넌트가 새 결과를 렌더링.
export default function AdminSearchBox({ initialQ = "", resultLabel = "" }) {
  const [value, setValue] = useState(initialQ);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (value === initialQ) return;
    const t = setTimeout(() => {
      const trimmed = value.trim();
      const params = new URLSearchParams();
      if (trimmed) params.set("q", trimmed);
      // 검색이 바뀌면 페이지는 1로 리셋 (page param 미설정)
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [value, initialQ, router, pathname]);

  // initialQ 가 외부(다른 링크 등)에서 바뀌면 입력값도 동기화
  useEffect(() => {
    setValue(initialQ);
  }, [initialQ]);

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        marginBottom: 14,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="닉네임 / 이름 / 이메일 / 전화번호 검색"
          style={{
            width: "100%",
            padding: "10px 38px 10px 14px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            background: "#fff",
            fontSize: 14,
            fontFamily: "inherit",
            color: "#0f172a",
            outline: "none",
          }}
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue("")}
            aria-label="지우기"
            className="tb-press-soft"
            style={{
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              width: 26,
              height: 26,
              padding: 0,
              borderRadius: 13,
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#64748b",
              fontSize: 14,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>
      <div style={{ marginLeft: "auto", fontSize: 13, color: "#64748b" }}>
        {pending ? "검색 중..." : resultLabel}
      </div>
    </div>
  );
}
