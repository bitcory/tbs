"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

// 입력 → 150ms 디바운스 → URL push (q 변경, page 리셋, 다른 param 은 보존).
export default function AdminSearchBox({ initialQ = "", resultLabel = "" }) {
  const [value, setValue] = useState(initialQ);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (value === initialQ) return;
    const t = setTimeout(() => {
      const trimmed = value.trim();
      const params = new URLSearchParams(searchParams);
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      // 검색이 바뀌면 페이지는 1로 리셋
      params.delete("page");
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    }, 150);
    return () => clearTimeout(t);
  }, [value, initialQ, router, pathname, searchParams]);

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
            border: "1px solid #34323d",
            background: "#26242e",
            fontSize: 14,
            fontFamily: "inherit",
            color: "#f5f4f7",
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
              border: "1px solid #34323d",
              background: "#26242e",
              color: "#a8a4b2",
              fontSize: 14,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>
      <div style={{ marginLeft: "auto", fontSize: 13, color: "#a8a4b2" }}>
        {pending ? "검색 중..." : resultLabel}
      </div>
    </div>
  );
}
