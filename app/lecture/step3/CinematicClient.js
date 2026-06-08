'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Upload, Copy, ExternalLink, Gem, X, Trash2,
  Clapperboard, Image as ImageIcon, Film, MessageSquare, Music, Scissors, Droplets, Wrench, Languages,
  User, Check, FileText,
} from 'lucide-react';
import { parseCinematicJson } from './parser';

const CACHE_KEY = 'toolb_step3_cinematic_v1';

const CINE_TABS = [
  { id: 'overview',   label: '개요',     dot: 'var(--tb-text-muted)' },
  { id: 'characters', label: '캐릭터',   dot: '#0ea5e9' },
  { id: 'scenes',     label: '이미지',   dot: '#f59e0b' },
  { id: 'video',      label: '영상',     dot: '#ec4899' },
  { id: 'music',      label: '음악',     dot: '#f97316' },
  { id: 'voice',      label: '보이스',   dot: '#fb7185' },
];

// Repeating palette for scene buttons / shot accents.
const TAB_COLORS = [
  { bg: '#3a2212', dot: '#f97316' }, // green
  { bg: '#3a330f', dot: '#fbbf24' }, // yellow
  { bg: '#16243f', dot: '#3b82f6' }, // blue
  { bg: '#3a1626', dot: '#ec4899' }, // pink
  { bg: '#311a3a', dot: '#fb7185' }, // purple
  { bg: '#1d1f3a', dot: '#6366f1' }, // indigo
];

export default function CinematicClient() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('scenes');
  const [sceneIdx, setSceneIdx] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [toast, setToast] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') setData(parsed);
      }
    } catch (e) { }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (data) localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      else localStorage.removeItem(CACHE_KEY);
    } catch (e) { }
  }, [data, hydrated]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1600);
  };

  const copyText = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => {
        if (id) { setCopiedId(id); setTimeout(() => setCopiedId(null), 1400); }
        showToast('복사됨!');
      })
      .catch(() => showToast('복사 실패'));
  };

  const loadJson = () => {
    setUploadError('');
    try {
      const result = parseCinematicJson(jsonInput, data);
      setData(result.data);
      if (result.focusTab) setTab(result.focusTab);
      if (typeof result.focusSceneIdx === 'number') setSceneIdx(result.focusSceneIdx);
      setUploadOpen(false);
      setJsonInput('');
      showToast('JSON 로드 완료!');
    } catch (e) {
      setUploadError(e.message || 'JSON 파싱 오류');
    }
  };

  const reset = () => {
    if (!confirm('현재 작업을 모두 지우고 초기화할까요?')) return;
    setData(null);
    setTab('scenes');
    setSceneIdx(0);
    showToast('초기화됨');
  };

  return (
    <div className="min-h-screen md:h-screen md:flex md:flex-col md:overflow-hidden bg-[var(--tb-bg)] text-[var(--tb-text)]">
      <style jsx global>{`
        .tb-hero { position: relative; padding: 16px 20px 36px;
          background: linear-gradient(135deg, #7c2d12 0%, #ea580c 45%, #f97316 100%);
          color: #fff; text-align: center; overflow: hidden; }
        .tb-hero-row { position: relative; z-index: 2; display: grid;
          grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; }
        @media (max-width: 640px) { .tb-hero-row { display: block; } }
        .tb-hero::before { content: ''; position: absolute; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.22'/%3E%3C/svg%3E");
          mix-blend-mode: overlay; pointer-events: none; }
        .tb-hero::after { content: ''; position: absolute; left: -10%; right: -10%; bottom: -1px;
          height: 24px; background: var(--tb-bg); border-radius: 50% 50% 0 0 / 100% 100% 0 0; }
        .tb-hero-glow { position: absolute; top: -40px; right: -60px; width: 260px; height: 260px;
          background: radial-gradient(circle, rgba(255,255,255,0.22), transparent 60%);
          filter: blur(30px); pointer-events: none; }
        .tb-hero-eyebrow { display: inline-block; font-size: 10px; font-weight: 800;
          letter-spacing: 0.26em; text-transform: uppercase; padding: 4px 11px; border-radius: 100px;
          background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.35);
          backdrop-filter: blur(14px); grid-column: 1; justify-self: start; }
        .tb-hero-title { font-size: clamp(20px, 4.5vw, 26px); font-weight: 900;
          line-height: 1.2; letter-spacing: -0.01em; margin: 0; grid-column: 2; justify-self: center; }
        .tb-glass-bar { position: relative; z-index: 3; margin: -22px 16px 0;
          padding: 10px 14px; display: flex; align-items: center; gap: 10px;
          background: rgba(var(--tb-glass-bar-rgb),0.7); border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(16px); border-radius: 100px;
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.4); }
        .tb-pill-primary { background: rgba(249,115,22,0.18); color: #fb923c;
          border: 1.5px solid rgba(249,115,22,0.35); backdrop-filter: blur(18px) saturate(180%);
          box-shadow: 0 10px 24px rgba(249,115,22,0.22), inset 2px 2px 1px 0 rgba(255,255,255,0.12);
          transition: transform 0.3s, box-shadow 0.3s, background 0.3s; }
        .tb-pill-primary:hover { background: rgba(249,115,22,0.28); transform: translateY(-1px) scale(1.03); }
        .tb-pill-primary:active { transform: translateY(1px) scale(0.94); transition: transform 0.08s ease-out; }
        .tb-pill-ghost { background: rgba(var(--tb-ghost-rgb),0.6); color: var(--tb-text);
          border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(14px) saturate(140%);
          box-shadow: 0 6px 16px rgba(0,0,0,0.3); transition: transform 0.3s; }
        .tb-pill-ghost:hover { background: rgba(var(--tb-ghost-rgb),0.85); transform: translateY(-1px) scale(1.03); }
        .tb-pill-ghost:active { transform: translateY(1px) scale(0.94); transition: transform 0.08s ease-out; }
      `}</style>

      <section className="tb-hero">
        <div className="tb-hero-glow" />
        <div className="tb-hero-row">
          <span className="tb-hero-eyebrow">TB STUDY · MASTER 2단계</span>
          <h1 className="tb-hero-title">프리프로덕션</h1>
        </div>
      </section>

      <div className="tb-glass-bar">
        <Link href="/?c=master&s=step3" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full tb-pill-ghost text-xs sm:text-sm font-bold">
          <ArrowLeft className="w-3.5 h-3.5" /> 홈
        </Link>
        <span className="text-[11px] font-bold tracking-[0.18em] text-[#f97316] uppercase hidden sm:inline">TOOLB LAB</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full tb-pill-primary text-xs sm:text-sm font-bold"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">JSON </span>불러오기
          </button>
          {data && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--tb-surface)] border border-[#7f1d1d] text-[color-mix(in_srgb,#f87171_62%,var(--tb-text))] text-xs sm:text-sm font-bold tb-press-soft"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">초기화</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:flex-1 md:min-h-0 w-full px-4 pt-6 pb-4 gap-4 2xl:px-6">
        {/* Sidebar (step4 style) */}
        <aside className="w-full md:w-[300px] flex-shrink-0 bg-[var(--tb-surface)] border border-[var(--tb-border)] rounded-2xl shadow-[0_10px_30px_-14px_rgba(0,0,0,0.16)] md:overflow-y-auto">
          <div className="p-4 border-b border-[var(--tb-border)]">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-[var(--tb-text-muted)]">
              <Clapperboard className="w-3.5 h-3.5" />
              프로젝트 정보
            </div>
            {data?.project ? (
              <div className="space-y-1.5">
                {data.project.title && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[var(--tb-text-muted)] font-medium w-14 pt-0.5">제목</span>
                    <span className="text-sm text-[var(--tb-text)] font-bold flex-1 break-all">{data.project.title}</span>
                  </div>
                )}
                {data.project.subtitle && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[var(--tb-text-muted)] font-medium w-14 pt-0.5">부제</span>
                    <span className="text-sm text-[var(--tb-text)] font-bold flex-1 break-all">{data.project.subtitle}</span>
                  </div>
                )}
                {(data.scenes?.length > 0) && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[var(--tb-text-muted)] font-medium w-14 pt-0.5">씬 수</span>
                    <span className="text-sm text-[var(--tb-text)] font-bold flex-1">{data.scenes.length}개</span>
                  </div>
                )}
                {(data.characters?.length > 0) && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[var(--tb-text-muted)] font-medium w-14 pt-0.5">캐릭터</span>
                    <span className="text-sm text-[var(--tb-text)] font-bold flex-1">{data.characters.length}명</span>
                  </div>
                )}
                {(data.videoClips?.length > 0) && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[var(--tb-text-muted)] font-medium w-14 pt-0.5">영상</span>
                    <span className="text-sm text-[var(--tb-text)] font-bold flex-1">{data.videoClips.length} 클립</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-[var(--tb-text-muted)]">JSON을 업로드하면 표시됩니다.</p>
            )}
          </div>

          <div className="p-4 border-b border-[var(--tb-border)]">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-[var(--tb-text-muted)]">
              <Wrench className="w-3.5 h-3.5" />
              도구
            </div>
            <div className="space-y-1">
              <a href="https://translate.google.co.kr/?sl=ko&tl=en&op=translate" target="_blank" rel="noreferrer"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold transition text-[var(--tb-text)] bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] tb-press-soft">
                <Languages className="w-4 h-4" /> 구글번역기
              </a>
              <a href="https://tbnc.aitoolb.com/" target="_blank" rel="noreferrer"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold transition text-[var(--tb-text)] bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] tb-press-soft">
                <FileText className="w-4 h-4" /> 파일명변경
              </a>
            </div>
          </div>

          <div className="p-4 space-y-2">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-[var(--tb-text-muted)]">
              <Gem className="w-3.5 h-3.5" />
              젬 가이드
            </div>
            <a href="https://gemini.google.com/gem/1RntwRH_DcDRUBlVdvPPPlRNrSsFd_n0z?usp=sharing" target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full tb-pill-primary text-sm font-bold transition">
              <ExternalLink className="w-3.5 h-3.5" /> 프리프로덕션 젬 열기
            </a>
            <a href="https://kr.pinterest.com/" target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[var(--tb-surface)] border border-[var(--tb-border)] hover:bg-[var(--tb-surface-2)] text-[var(--tb-text)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-sm font-bold tb-press">
              <ExternalLink className="w-3.5 h-3.5 text-[#E60023]" /> 핀터레스트
            </a>
            <a href="https://gemini.google.com/" target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[var(--tb-surface)] border border-[var(--tb-border)] hover:bg-[var(--tb-surface-2)] text-[var(--tb-text)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-sm font-bold tb-press">
              <ExternalLink className="w-3.5 h-3.5 text-[#1a73e8]" /> 제미나이
            </a>
            <a href="https://splitter.aitoolb.com/" target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[var(--tb-surface)] border border-[var(--tb-border)] hover:bg-[var(--tb-surface-2)] text-[var(--tb-text)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-sm font-bold tb-press">
              <Scissors className="w-3.5 h-3.5 text-[#0ea5e9]" /> 이미지분할기
            </a>
            <a href="https://grok.com/" target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[var(--tb-surface)] border border-[var(--tb-border)] hover:bg-[var(--tb-surface-2)] text-[var(--tb-text)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-sm font-bold tb-press">
              <ExternalLink className="w-3.5 h-3.5 text-[#0f172a]" /> Grok 바로가기
            </a>
            <a href="https://suno.com/" target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[var(--tb-surface)] border border-[var(--tb-border)] hover:bg-[var(--tb-surface-2)] text-[var(--tb-text)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-sm font-bold tb-press">
              <Music className="w-3.5 h-3.5 text-[#f97316]" /> SUNO 바로가기
            </a>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col md:overflow-hidden bg-[var(--tb-surface)] border border-[var(--tb-border)] rounded-2xl shadow-[0_10px_30px_-14px_rgba(0,0,0,0.16)]">
          {!data ? (
            <EmptyState onOpen={() => setUploadOpen(true)} />
          ) : (
            <>
              {/* 6 tabs (overview / characters / scenes / video / music / voice) */}
              <div className="flex-shrink-0 flex gap-1.5 p-3 border-b border-[var(--tb-border)] bg-[var(--tb-surface)] overflow-x-auto">
                {CINE_TABS.map((t) => {
                  const isActive = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-bold whitespace-nowrap rounded-full transition ${
                        isActive ? 'tb-pill-primary' : 'text-[var(--tb-text-muted)] hover:bg-[var(--tb-surface-2)] tb-press-soft'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.dot, opacity: isActive ? 1 : 0.7 }} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {tab === 'scenes' && (
                  <ScenesTab
                    scenes={data.scenes || []}
                    sceneIdx={sceneIdx}
                    setSceneIdx={setSceneIdx}
                    onCopy={copyText}
                    copiedId={copiedId}
                  />
                )}
                {tab === 'overview' && <OverviewPlaceholder data={data} />}
                {tab === 'characters' && (
                  <CharactersTab characters={data.characters || []} onCopy={copyText} copiedId={copiedId} />
                )}
                {tab === 'video' && <PlaceholderCard label="영상" />}
                {tab === 'music' && <PlaceholderCard label="음악" />}
                {tab === 'voice' && <PlaceholderCard label="보이스" />}
              </div>
            </>
          )}
        </main>
      </div>

      {uploadOpen && (
        <UploadModal
          jsonInput={jsonInput}
          setJsonInput={setJsonInput}
          uploadError={uploadError}
          onClose={() => { setUploadOpen(false); setUploadError(''); }}
          onLoad={loadJson}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-[400] px-4 py-2.5 rounded-full text-sm font-bold tb-pill-primary">
          {toast}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onOpen }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
      <div className="w-20 h-20 mb-5 rounded-full flex items-center justify-center bg-[#3a2212] border border-[var(--tb-border)]">
        <Clapperboard className="w-10 h-10 text-[#f97316]" />
      </div>
      <h3 className="text-lg font-bold text-[var(--tb-text)] mb-2">프로덕션 바이블이 없습니다</h3>
      <p className="text-sm text-[var(--tb-text-muted)] mb-5 leading-relaxed">
        젬에서 받은 시나리오·캐릭터·씬 JSON을 붙여넣으면<br />
        프리프로덕션 자료가 탭으로 정리됩니다.
      </p>
      <button
        onClick={onOpen}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full tb-pill-primary text-sm font-bold transition"
      >
        <Upload className="w-3.5 h-3.5" /> JSON 불러오기
      </button>
    </div>
  );
}

function PlaceholderCard({ label }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-[var(--tb-border)] bg-[var(--tb-surface-2)] p-10 text-center">
      <div className="text-sm font-bold text-[var(--tb-text-2)] mb-1">{label} 탭</div>
      <p className="text-xs text-[var(--tb-text-muted)]">JSON에 해당 정보가 있으면 여기에 표시됩니다 (Phase 2에서 구현 예정).</p>
    </div>
  );
}

function OverviewPlaceholder({ data }) {
  const p = data?.project || {};
  return (
    <div className="rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-surface)] p-5">
      <h3 className="text-base font-extrabold mb-3">{p.title || '프로젝트'}</h3>
      {p.subtitle && <p className="text-sm text-[var(--tb-text-muted)] mb-3">{p.subtitle}</p>}
      <p className="text-xs text-[var(--tb-text-muted)]">개요 탭의 풍부한 표시는 Phase 2에서 구현 예정입니다. 지금은 [이미지] 탭에서 씬별 프롬프트를 확인하세요.</p>
    </div>
  );
}

function CharactersTab({ characters, onCopy, copiedId }) {
  if (!characters || characters.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-[var(--tb-text-muted)]">
        등록된 캐릭터가 없습니다. JSON에 <code className="px-1.5 py-0.5 rounded bg-[var(--tb-surface-2)] text-[var(--tb-text-2)]">characters</code> 배열 또는 씬의 <code className="px-1.5 py-0.5 rounded bg-[var(--tb-surface-2)] text-[var(--tb-text-2)]">scene.characters</code>가 포함되어야 합니다.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {characters.map((c, i) => {
        const stc = TAB_COLORS[i % TAB_COLORS.length];
        const name = c.name || c.id || `Character ${i + 1}`;
        const promptText = c.prompt || c.promptBase || '';
        const appearance = c.appearance && typeof c.appearance === 'object' ? c.appearance : null;

        return (
          <div key={i} className="rounded-2xl overflow-hidden border-2 border-[var(--tb-border)] bg-[var(--tb-surface)]">
            <div className="px-4 py-2.5 border-b-2 border-[var(--tb-border)] flex items-center justify-between gap-2 flex-wrap"
                 style={{ background: stc.bg }}>
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <User className="w-4 h-4 text-[var(--tb-text)]" />
                <span className="text-sm font-bold text-[var(--tb-text)] truncate">{name}</span>
                {c.nameEn && (
                  <span className="text-[11px] text-[var(--tb-text-2)] font-medium">{c.nameEn}</span>
                )}
                {c.age && (
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-white/10 text-[var(--tb-text-2)] border border-[color-mix(in_srgb,var(--tb-text)_15%,transparent)]">
                    {c.age}
                  </span>
                )}
                {c.role && (
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-white/10 text-[var(--tb-text-2)] border border-[color-mix(in_srgb,var(--tb-text)_15%,transparent)]">
                    {c.role}
                  </span>
                )}
              </div>
            </div>

            {c.description && (
              <div className="px-4 py-2 text-xs text-[var(--tb-text-2)] border-b border-[var(--tb-border)] leading-relaxed">
                {c.description}
              </div>
            )}

            <div className="p-4 space-y-3">
              {c.outfit && (
                <div className="rounded-lg border border-[var(--tb-border)] bg-[var(--tb-surface)] overflow-hidden">
                  <div className="px-3 py-1.5 bg-[var(--tb-surface-2)] border-b border-[var(--tb-border)]">
                    <span className="text-[10px] font-bold text-[var(--tb-text-2)] uppercase tracking-wider">의상</span>
                  </div>
                  <div className="p-3 text-sm text-[var(--tb-text)] leading-relaxed">{c.outfit}</div>
                </div>
              )}

              {appearance && Object.keys(appearance).length > 0 && (
                <div className="rounded-lg border border-[var(--tb-border)] bg-[var(--tb-surface)] overflow-hidden">
                  <div className="px-3 py-1.5 bg-[var(--tb-surface-2)] border-b border-[var(--tb-border)]">
                    <span className="text-[10px] font-bold text-[var(--tb-text-2)] uppercase tracking-wider">외형</span>
                  </div>
                  <dl className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    {Object.entries(appearance).map(([k, v]) => (
                      <div key={k} className="flex gap-2 min-w-0">
                        <dt className="text-[var(--tb-text-muted)] font-bold shrink-0 w-16 capitalize">{k}</dt>
                        <dd className="text-[var(--tb-text)] truncate" title={String(v)}>{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {promptText && (
                <div className="rounded-lg border-2 border-[var(--tb-border)] overflow-hidden bg-[var(--tb-tint-olive)]">
                  <div className="px-3 py-1.5 bg-[var(--tb-surface-2)] flex items-center justify-between border-b border-[var(--tb-border)]">
                    <span className="text-[10px] font-bold text-[var(--tb-text-2)] uppercase tracking-wider">캐릭터 프롬프트</span>
                    <CopyBtn text={promptText} id={`char-${i}`} label="EN 복사" onCopy={onCopy} copiedId={copiedId} />
                  </div>
                  <div className="p-3 text-sm text-[var(--tb-text)] leading-relaxed font-mono whitespace-pre-wrap">{promptText}</div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScenesTab({ scenes, sceneIdx, setSceneIdx, onCopy, copiedId }) {
  if (scenes.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-[var(--tb-text-muted)]">
        등록된 씬이 없습니다. JSON에 <code className="px-1.5 py-0.5 rounded bg-[var(--tb-surface-2)] text-[var(--tb-text-2)]">scenes</code> 배열을 포함하세요.
      </div>
    );
  }
  const safeIdx = Math.min(sceneIdx, scenes.length - 1);
  const s = scenes[safeIdx];
  const sceneId = s?.sceneId || `S${safeIdx + 1}`;
  const headerColor = TAB_COLORS[safeIdx % TAB_COLORS.length];

  const buildSceneAllText = () => {
    const blocks = [];
    if (s.bgPrompt) {
      let block = s.bgPrompt;
      if (s.bgNegative) block += `\n[Negative] ${s.bgNegative}`;
      blocks.push(block);
    }
    s.shots?.forEach((shot) => {
      shot.prompts?.forEach((pr) => {
        let block = pr.en;
        if (pr.negative) block += `\n[Negative] ${pr.negative}`;
        blocks.push(block);
      });
    });
    return blocks.join('\n\n');
  };

  return (
    <div className="space-y-4">
      {/* Scene selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {scenes.map((sc, si) => {
          const stc = TAB_COLORS[si % TAB_COLORS.length];
          const isActive = si === safeIdx;
          return (
            <button
              key={si}
              onClick={() => setSceneIdx(si)}
              className={`shrink-0 px-4 py-2 text-sm font-bold whitespace-nowrap transition rounded-lg border-2 ${
                isActive ? 'border-[#f97316] shadow-md' : 'border-[var(--tb-border)] hover:border-[var(--tb-text-muted)]'
              } flex items-center gap-2`}
              style={{ background: isActive ? stc.bg : 'var(--tb-surface)', color: 'var(--tb-text)' }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: stc.dot, opacity: isActive ? 1 : 0.5 }} />
              <span>{sc.sceneId || `S${si + 1}`}</span>
            </button>
          );
        })}
      </div>

      {/* Scene header card */}
      <div className="rounded-2xl overflow-hidden border-2 border-[var(--tb-border)] bg-[var(--tb-surface)]">
        <div className="px-4 py-3 border-b-2 border-[var(--tb-border)]" style={{ background: headerColor.bg }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-base font-black text-[var(--tb-text)]">{sceneId}. {s.title || ''}</div>
            <CopyBtn text={buildSceneAllText()} id={`scene-all-${safeIdx}`} label={`${sceneId} 전체 복사`} onCopy={onCopy} copiedId={copiedId} />
          </div>
          {(s.time || s.setting || s.mood) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {s.time    && <Badge>{s.time}</Badge>}
              {s.setting && <Badge>{s.setting}</Badge>}
              {s.mood    && <Badge soft>{s.mood}</Badge>}
            </div>
          )}
        </div>
        {s.koreanRef && (
          <div className="px-4 py-2.5 border-b border-[var(--tb-border)] text-sm text-[var(--tb-text-2)] leading-relaxed">{s.koreanRef}</div>
        )}
        {s.bgPrompt && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#0ea5e9]" />
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-[#16243f] text-[#93c5fd]">BG PLATE</span>
              </div>
              <CopyBtn text={s.bgPrompt} id={`bg-${safeIdx}`} onCopy={onCopy} copiedId={copiedId} />
            </div>
            <div className="p-3 rounded-lg border-2 border-[var(--tb-border)] bg-[var(--tb-tint-olive)] text-sm text-[var(--tb-text)] leading-relaxed font-mono whitespace-pre-wrap">{s.bgPrompt}</div>
            {s.bgPromptKr && <div className="mt-2 text-xs text-[var(--tb-text-muted)] leading-relaxed">{s.bgPromptKr}</div>}
          </div>
        )}
      </div>

      {/* Shot cards */}
      {(s.shots || []).map((shot, si) => {
        const stc = TAB_COLORS[si % TAB_COLORS.length];
        return (
          <div key={si} className="rounded-2xl overflow-hidden border-2 border-[var(--tb-border)] bg-[var(--tb-surface)]">
            <div className="px-4 py-2.5 border-b-2 border-[var(--tb-border)] flex items-center justify-between gap-2 flex-wrap"
                 style={{ background: stc.bg }}>
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#f97316] text-white">{shot.id}</span>
                {shot.type && (
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-[#16243f] text-[#93c5fd]">{shot.type}</span>
                )}
                {shot.label && <span className="text-sm font-bold text-[var(--tb-text)] truncate">{shot.label}</span>}
              </div>
              {shot.category && (
                <span className="text-[10px] px-2 py-0.5 rounded font-bold border border-[color-mix(in_srgb,var(--tb-text)_15%,transparent)] bg-white/10 text-[var(--tb-text-2)]">
                  {shot.category}
                </span>
              )}
            </div>
            {shot.note && (
              <div className="px-4 py-2 text-xs text-[var(--tb-text-2)] border-b border-[var(--tb-border)]">{shot.note}</div>
            )}
            <div className="p-4 space-y-3">
              {(shot.prompts || []).map((pr, pi) => (
                <div key={pi} className="rounded-lg border-2 border-[var(--tb-border)] overflow-hidden bg-[var(--tb-tint-olive)]">
                  <div className="px-3 py-1.5 bg-[var(--tb-surface-2)] flex items-center justify-between border-b border-[var(--tb-border)]">
                    <span className="text-[10px] font-bold text-[var(--tb-text-2)] uppercase tracking-wider">{pr.tag}</span>
                    <CopyBtn text={pr.en} id={`shot-${safeIdx}-${si}-${pi}`} label="EN 복사" onCopy={onCopy} copiedId={copiedId} />
                  </div>
                  <div className="p-3 text-sm text-[var(--tb-text)] leading-relaxed font-mono whitespace-pre-wrap">{pr.en}</div>
                  {pr.kr && (
                    <div className="px-3 py-2 text-xs text-[var(--tb-text-muted)] leading-relaxed bg-[var(--tb-surface-2)] border-t border-[var(--tb-border)]">{pr.kr}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Badge({ children, soft }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded${soft ? '-full' : ''} font-bold border border-[color-mix(in_srgb,var(--tb-text)_15%,transparent)] ${soft ? 'bg-[var(--tb-surface-2)]' : 'bg-white/10'}`}>
      {children}
    </span>
  );
}

function CopyBtn({ text, id, label = '복사', onCopy, copiedId }) {
  const isCopied = copiedId === id;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onCopy(text, id); }}
      disabled={!text}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border-2 transition disabled:opacity-40 ${
        isCopied
          ? 'border-[#f97316] text-[#fb923c] bg-[#3a2212]'
          : 'border-[var(--tb-border)] text-[var(--tb-text)] bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)]'
      }`}
    >
      {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {isCopied ? '복사됨' : label}
    </button>
  );
}

function UploadModal({ jsonInput, setJsonInput, uploadError, onClose, onLoad }) {
  return (
    <div onClick={onClose} className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div onClick={(e) => e.stopPropagation()}
        className="bg-[var(--tb-surface)] rounded-2xl border border-[var(--tb-border)] shadow-[0_24px_60px_rgba(0,0,0,0.5)] w-[640px] max-w-[95vw] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--tb-border)]">
          <span className="text-base font-bold text-[var(--tb-text)] uppercase tracking-wider">프로덕션 바이블 JSON 업로드</span>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] text-[var(--tb-text-2)] tb-press-soft">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
          <p className="text-sm text-[var(--tb-text-muted)] leading-relaxed">
            JSON을 붙여넣으세요. 풀 프로덕션 바이블, 캐릭터 시트, 씬별 통합(v4),
            영상 프롬프트, 이미지 프롬프트 단독 등 다양한 형식을 자동 감지합니다.
          </p>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="w-full h-[260px] resize-y font-mono text-[13px] leading-relaxed p-3 rounded-xl bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[var(--tb-text)] focus:outline-none focus:border-[#f97316] focus:ring-[3px] focus:ring-[#f97316]/20"
            placeholder='{"project": {...}, "scenes": [...], "characters": [...], ...}'
          />
          {uploadError && (
            <div className="text-sm text-[#f87171] bg-[#3a1414] border border-[#7f1d1d] rounded-xl px-3 py-2 font-semibold">
              {uploadError}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[var(--tb-border)]">
          <button onClick={onClose} className="px-4 py-1.5 rounded-full tb-pill-ghost text-sm font-bold">취소</button>
          <button onClick={onLoad} className="px-4 py-1.5 rounded-full tb-pill-primary text-sm font-bold">불러오기</button>
        </div>
      </div>
    </div>
  );
}
