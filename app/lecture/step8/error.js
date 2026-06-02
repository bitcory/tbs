'use client';

import { useEffect } from 'react';

// step8(그림책 만들기) 전용 에러 바운더리.
// 예전 형태로 저장된 localStorage 캐시가 렌더 중 예외를 일으키면 흰 에러 화면 대신
// 깨진 캐시를 자동으로 비우고 "다시 시도"로 복구하게 한다. (시크릿창에선 정상인데
// 일반 창에서만 그림책 페이지가 안 열리던 증상의 근본 처리)
const CACHE_KEY = 'toolb_step8_picbook_v1';
const SCRIPT_KEY = 'toolb_step8_script_v1';

export default function Step8Error({ error, reset }) {
  useEffect(() => {
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(SCRIPT_KEY);
    } catch {}
    // eslint-disable-next-line no-console
    console.error('[step8] render error, cleared cache:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '40px 24px',
        textAlign: 'center',
        fontFamily: "'Gaegu', system-ui, sans-serif",
      }}
    >
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#3a2f1a' }}>
        그림책을 불러오는 중 문제가 있었어요
      </div>
      <p style={{ color: '#6b6150', maxWidth: 360, lineHeight: 1.6, margin: 0 }}>
        저장된 데이터를 정리했어요. 아래 버튼을 누르면 다시 불러옵니다.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        style={{
          marginTop: 4,
          padding: '10px 24px',
          borderRadius: 999,
          border: '1.5px solid #d8cdb4',
          background: '#fff',
          color: '#3a2f1a',
          fontWeight: 700,
          fontSize: '1rem',
          cursor: 'pointer',
        }}
      >
        다시 시도
      </button>
    </div>
  );
}
