"use client";

import { useEffect, useState } from "react";

// 카카오톡 인앱브라우저(웹뷰)에서는 카카오 OAuth 콜백 도중 쿠키가 끊기거나 콜백이 두 번 처리되어
// 회원가입이 실패/중복되는 경우가 있다. 구글은 한술 더 떠 인앱 웹뷰를 disallowed_useragent 로
// 아예 거부한다. 인앱브라우저로 진입한 경우 외부 브라우저로 강제 오픈한다.
export default function KakaoInAppGuard() {
  const [isInApp, setIsInApp] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    // 안드로이드: KAKAOTALK / 아이폰: KAKAOTALK-iPhone
    if (/KAKAOTALK/i.test(ua)) {
      setIsInApp(true);
    }
  }, []);

  if (!isInApp) return null;

  const openExternal = () => {
    const target = window.location.href;
    // 안드로이드: kakaotalk:// 스킴으로 외부 브라우저 강제 오픈
    // iOS: 같은 스킴으로 동작 (실패 시 안내)
    window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(target)}`;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.92)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "28px 22px",
          maxWidth: 360,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>🌐</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "#0f172a" }}>
          외부 브라우저로 열어주세요
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#475569", marginBottom: 18 }}>
          카카오톡 안에서는 로그인이 정상 동작하지 않습니다.
          <br />
          아래 버튼으로 Chrome / Safari 에서 열어주세요.
        </p>
        <button
          onClick={openExternal}
          style={{
            width: "100%",
            padding: "14px 16px",
            background: "#FEE500",
            color: "#191919",
            border: "none",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
          className="tb-press"
        >
          외부 브라우저로 열기
        </button>
        <p style={{ marginTop: 14, fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
          버튼이 동작하지 않으면 우측 상단 메뉴(⋮) → <strong>다른 브라우저로 열기</strong>를
          눌러주세요.
        </p>
      </div>
    </div>
  );
}
