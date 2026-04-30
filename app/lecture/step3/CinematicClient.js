'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Upload, Copy, ExternalLink, Gem, X, Trash2,
  Clapperboard, Image as ImageIcon, Film, MessageSquare, Music, Scissors, Droplets, Wrench, Languages,
  User, Check,
} from 'lucide-react';
import { parseCinematicJson } from './parser';

const CACHE_KEY = 'toolb_step3_cinematic_v1';

const CINE_TABS = [
  { id: 'overview',   label: '개요',     dot: '#94a3b8' },
  { id: 'characters', label: '캐릭터',   dot: '#0ea5e9' },
  { id: 'scenes',     label: '이미지',   dot: '#f59e0b' },
  { id: 'video',      label: '영상',     dot: '#ec4899' },
  { id: 'music',      label: '음악',     dot: '#10b981' },
  { id: 'voice',      label: '보이스',   dot: '#8b5cf6' },
];

// Repeating palette for scene buttons / shot accents.
const TAB_COLORS = [
  { bg: '#dcfce7', dot: '#16a34a' }, // green
  { bg: '#fef9c3', dot: '#ca8a04' }, // yellow
  { bg: '#dbeafe', dot: '#2563eb' }, // blue
  { bg: '#fce7f3', dot: '#db2777' }, // pink
  { bg: '#f3e8ff', dot: '#9333ea' }, // purple
  { bg: '#e0e7ff', dot: '#4f46e5' }, // indigo
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
    <div className="min-h-screen md:h-screen md:flex md:flex-col md:overflow-hidden bg-[#f8fafc] text-[#0f172a]">
      <style jsx global>{`
        .tb-hero { position: relative; padding: 16px 20px 36px;
          background: linear-gradient(135deg, #016837 0%, #00996D 45%, #00B380 100%);
          color: #fff; text-align: center; overflow: hidden; }
        .tb-hero-row { position: relative; z-index: 2; display: grid;
          grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; }
        @media (max-width: 640px) { .tb-hero-row { display: block; } }
        .tb-hero::before { content: ''; position: absolute; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.22'/%3E%3C/svg%3E");
          mix-blend-mode: overlay; pointer-events: none; }
        .tb-hero::after { content: ''; position: absolute; left: -10%; right: -10%; bottom: -1px;
          height: 24px; background: #f8fafc; border-radius: 50% 50% 0 0 / 100% 100% 0 0; }
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
          background: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.9);
          backdrop-filter: blur(16px); border-radius: 100px;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.1); }
        .tb-pill-primary { background: rgba(255,255,255,0.4); color: #00774f;
          border: 1.5px solid rgba(0,153,109,0.35); backdrop-filter: blur(18px) saturate(180%);
          box-shadow: 0 10px 24px rgba(0,153,109,0.22), inset 2px 2px 1px 0 rgba(255,255,255,0.85);
          transition: transform 0.3s, box-shadow 0.3s, background 0.3s; }
        .tb-pill-primary:hover { background: rgba(255,255,255,0.55); transform: translateY(-1px) scale(1.03); }
        .tb-pill-primary:active { transform: translateY(1px) scale(0.94); transition: transform 0.08s ease-out; }
        .tb-pill-ghost { background: rgba(255,255,255,0.55); color: #334155;
          border: 1px solid rgba(255,255,255,0.7); backdrop-filter: blur(14px) saturate(140%);
          box-shadow: 0 6px 16px rgba(15,23,42,0.08); transition: transform 0.3s; }
        .tb-pill-ghost:hover { background: rgba(255,255,255,0.75); transform: translateY(-1px) scale(1.03); }
        .tb-pill-ghost:active { transform: translateY(1px) scale(0.94); transition: transform 0.08s ease-out; }
      `}</style>

      <section className="tb-hero">
        <div className="tb-hero-glow" />
        <div className="tb-hero-row">
          <span className="tb-hero-eyebrow">TB STUDY · PRO 4단계</span>
          <h1 className="tb-hero-title">프리프로덕션</h1>
        </div>
      </section>

      <div className="tb-glass-bar">
        <Link href="/?c=pro&s=step3" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full tb-pill-ghost text-xs sm:text-sm font-bold">
          <ArrowLeft className="w-3.5 h-3.5" /> 홈
        </Link>
        <span className="text-[11px] font-bold tracking-[0.18em] text-[#00996D] uppercase hidden sm:inline">TOOLB LAB</span>
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#fecaca] text-[#dc2626] text-xs sm:text-sm font-bold tb-press-soft"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">초기화</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:flex-1 md:min-h-0 w-full px-4 pt-6 pb-4 gap-4 2xl:px-6">
        {/* Sidebar (step4 style) */}
        <aside className="w-full md:w-[300px] flex-shrink-0 bg-white border border-[#e2e8f0] rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.06)] md:overflow-y-auto">
          <div className="p-4 border-b border-[#e2e8f0]">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-[#64748b]">
              <Clapperboard className="w-3.5 h-3.5" />
              프로젝트 정보
            </div>
            {data?.project ? (
              <div className="space-y-1.5">
                {data.project.title && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[#64748b] font-medium w-14 pt-0.5">제목</span>
                    <span className="text-sm text-[#0f172a] font-bold flex-1 break-all">{data.project.title}</span>
                  </div>
                )}
                {data.project.subtitle && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[#64748b] font-medium w-14 pt-0.5">부제</span>
                    <span className="text-sm text-[#0f172a] font-bold flex-1 break-all">{data.project.subtitle}</span>
                  </div>
                )}
                {(data.scenes?.length > 0) && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[#64748b] font-medium w-14 pt-0.5">씬 수</span>
                    <span className="text-sm text-[#0f172a] font-bold flex-1">{data.scenes.length}개</span>
                  </div>
                )}
                {(data.characters?.length > 0) && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[#64748b] font-medium w-14 pt-0.5">캐릭터</span>
                    <span className="text-sm text-[#0f172a] font-bold flex-1">{data.characters.length}명</span>
                  </div>
                )}
                {(data.videoClips?.length > 0) && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[#64748b] font-medium w-14 pt-0.5">영상</span>
                    <span className="text-sm text-[#0f172a] font-bold flex-1">{data.videoClips.length} 클립</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-[#64748b]">JSON을 업로드하면 표시됩니다.</p>
            )}
          </div>

          <div className="p-4 border-b border-[#e2e8f0]">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-[#64748b]">
              <Wrench className="w-3.5 h-3.5" />
              도구
            </div>
            <div className="space-y-1">
              <a href="https://translate.google.co.kr/?sl=ko&tl=en&op=translate" target="_blank" rel="noreferrer"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold transition text-[#334155] bg-[#f1f5f9] hover:bg-[#e2e8f0] tb-press-soft">
                <Languages className="w-4 h-4" /> 구글번역기
              </a>
            </div>
          </div>

          <div className="p-4 space-y-2">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-[#64748b]">
              <Gem className="w-3.5 h-3.5" />
              젬 가이드
            </div>
            <a href="https://gemini.google.com/gem/1RntwRH_DcDRUBlVdvPPPlRNrSsFd_n0z?usp=sharing" target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full tb-pill-primary text-sm font-bold transition">
              <ExternalLink className="w-3.5 h-3.5" /> 프리프로덕션 젬 열기
            </a>
            <a href="https://kr.pinterest.com/" target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[#E60023] hover:opacity-90 text-white text-sm font-bold tb-press">
              <ExternalLink className="w-3.5 h-3.5" /> 핀터레스트
            </a>
            <a href="https://gemini.google.com/" target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[#1a73e8] hover:opacity-90 text-white text-sm font-bold tb-press">
              <ExternalLink className="w-3.5 h-3.5" /> 제미나이
            </a>
            <a href="https://splitter.aitoolb.com/" target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[#0ea5e9] hover:opacity-90 text-white text-sm font-bold tb-press">
              <Scissors className="w-3.5 h-3.5" /> 이미지분할기
            </a>
            <a href="https://grok.com/" target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[#0f172a] hover:opacity-90 text-white text-sm font-bold tb-press">
              <ExternalLink className="w-3.5 h-3.5" /> Grok 바로가기
            </a>
            <a href="https://suno.com/" target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[#f97316] hover:opacity-90 text-white text-sm font-bold tb-press">
              <Music className="w-3.5 h-3.5" /> SUNO 바로가기
            </a>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col md:overflow-hidden bg-white border border-[#e2e8f0] rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          {!data ? (
            <EmptyState onOpen={() => setUploadOpen(true)} />
          ) : (
            <>
              {/* 6 tabs (overview / characters / scenes / video / music / voice) */}
              <div className="flex-shrink-0 flex gap-1.5 p-3 border-b border-[#e2e8f0] bg-white overflow-x-auto">
                {CINE_TABS.map((t) => {
                  const isActive = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-bold whitespace-nowrap rounded-full transition ${
                        isActive ? 'tb-pill-primary' : 'text-[#64748b] bg-[#f1f5f9] hover:bg-[#e2e8f0] tb-press-soft'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? '#fff' : t.dot, opacity: isActive ? 1 : 0.7 }} />
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
      <div className="w-20 h-20 mb-5 rounded-full flex items-center justify-center bg-[#ecfdf5] border border-[#e2e8f0]">
        <Clapperboard className="w-10 h-10 text-[#00996D]" />
      </div>
      <h3 className="text-lg font-bold text-[#0f172a] mb-2">프로덕션 바이블이 없습니다</h3>
      <p className="text-sm text-[#64748b] mb-5 leading-relaxed">
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
    <div className="rounded-2xl border-2 border-dashed border-[#e2e8f0] bg-[#f8fafc] p-10 text-center">
      <div className="text-sm font-bold text-[#475569] mb-1">{label} 탭</div>
      <p className="text-xs text-[#94a3b8]">JSON에 해당 정보가 있으면 여기에 표시됩니다 (Phase 2에서 구현 예정).</p>
    </div>
  );
}

function OverviewPlaceholder({ data }) {
  const p = data?.project || {};
  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5">
      <h3 className="text-base font-extrabold mb-3">{p.title || '프로젝트'}</h3>
      {p.subtitle && <p className="text-sm text-[#64748b] mb-3">{p.subtitle}</p>}
      <p className="text-xs text-[#94a3b8]">개요 탭의 풍부한 표시는 Phase 2에서 구현 예정입니다. 지금은 [이미지] 탭에서 씬별 프롬프트를 확인하세요.</p>
    </div>
  );
}

function CharactersTab({ characters, onCopy, copiedId }) {
  if (!characters || characters.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-[#94a3b8]">
        등록된 캐릭터가 없습니다. JSON에 <code className="px-1.5 py-0.5 rounded bg-[#f1f5f9] text-[#475569]">characters</code> 배열 또는 씬의 <code className="px-1.5 py-0.5 rounded bg-[#f1f5f9] text-[#475569]">scene.characters</code>가 포함되어야 합니다.
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
          <div key={i} className="rounded-2xl overflow-hidden border-2 border-[#0f172a] bg-white">
            <div className="px-4 py-2.5 border-b-2 border-[#0f172a] flex items-center justify-between gap-2 flex-wrap"
                 style={{ background: stc.bg }}>
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <User className="w-4 h-4 text-[#0f172a]" />
                <span className="text-sm font-bold text-[#0f172a] truncate">{name}</span>
                {c.nameEn && (
                  <span className="text-[11px] text-[#475569] font-medium">{c.nameEn}</span>
                )}
                {c.age && (
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-white/70 text-[#475569] border border-[#0f172a]/20">
                    {c.age}
                  </span>
                )}
                {c.role && (
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-white/70 text-[#475569] border border-[#0f172a]/20">
                    {c.role}
                  </span>
                )}
              </div>
            </div>

            {c.description && (
              <div className="px-4 py-2 text-xs text-[#475569] border-b border-[#e2e8f0] leading-relaxed">
                {c.description}
              </div>
            )}

            <div className="p-4 space-y-3">
              {c.outfit && (
                <div className="rounded-lg border border-[#e2e8f0] bg-white overflow-hidden">
                  <div className="px-3 py-1.5 bg-[#f8fafc] border-b border-[#e2e8f0]">
                    <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">의상</span>
                  </div>
                  <div className="p-3 text-sm text-[#0f172a] leading-relaxed">{c.outfit}</div>
                </div>
              )}

              {appearance && Object.keys(appearance).length > 0 && (
                <div className="rounded-lg border border-[#e2e8f0] bg-white overflow-hidden">
                  <div className="px-3 py-1.5 bg-[#f8fafc] border-b border-[#e2e8f0]">
                    <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">외형</span>
                  </div>
                  <dl className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    {Object.entries(appearance).map(([k, v]) => (
                      <div key={k} className="flex gap-2 min-w-0">
                        <dt className="text-[#94a3b8] font-bold shrink-0 w-16 capitalize">{k}</dt>
                        <dd className="text-[#0f172a] truncate" title={String(v)}>{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {promptText && (
                <div className="rounded-lg border-2 border-[#e2e8f0] overflow-hidden bg-[#fef9c3]/30">
                  <div className="px-3 py-1.5 bg-white flex items-center justify-between border-b border-[#e2e8f0]">
                    <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">캐릭터 프롬프트</span>
                    <CopyBtn text={promptText} id={`char-${i}`} label="EN 복사" onCopy={onCopy} copiedId={copiedId} />
                  </div>
                  <div className="p-3 text-sm text-[#0f172a] leading-relaxed font-mono whitespace-pre-wrap">{promptText}</div>
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
      <div className="text-center py-12 text-sm text-[#94a3b8]">
        등록된 씬이 없습니다. JSON에 <code className="px-1.5 py-0.5 rounded bg-[#f1f5f9] text-[#475569]">scenes</code> 배열을 포함하세요.
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
                isActive ? 'border-[#0f172a] shadow-md' : 'border-[#e2e8f0] hover:border-[#94a3b8]'
              } flex items-center gap-2`}
              style={{ background: isActive ? stc.bg : '#fff', color: '#0f172a' }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: stc.dot, opacity: isActive ? 1 : 0.5 }} />
              <span>{sc.sceneId || `S${si + 1}`}</span>
            </button>
          );
        })}
      </div>

      {/* Scene header card */}
      <div className="rounded-2xl overflow-hidden border-2 border-[#0f172a] bg-white">
        <div className="px-4 py-3 border-b-2 border-[#0f172a]" style={{ background: headerColor.bg }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-base font-black text-[#0f172a]">{sceneId}. {s.title || ''}</div>
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
          <div className="px-4 py-2.5 border-b border-[#e2e8f0] text-sm text-[#475569] leading-relaxed">{s.koreanRef}</div>
        )}
        {s.bgPrompt && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#0ea5e9]" />
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-[#dbeafe] text-[#1d4ed8]">BG PLATE</span>
              </div>
              <CopyBtn text={s.bgPrompt} id={`bg-${safeIdx}`} onCopy={onCopy} copiedId={copiedId} />
            </div>
            <div className="p-3 rounded-lg border-2 border-[#e2e8f0] bg-[#fef9c3]/50 text-sm text-[#0f172a] leading-relaxed font-mono whitespace-pre-wrap">{s.bgPrompt}</div>
            {s.bgPromptKr && <div className="mt-2 text-xs text-[#64748b] leading-relaxed">{s.bgPromptKr}</div>}
          </div>
        )}
      </div>

      {/* Shot cards */}
      {(s.shots || []).map((shot, si) => {
        const stc = TAB_COLORS[si % TAB_COLORS.length];
        return (
          <div key={si} className="rounded-2xl overflow-hidden border-2 border-[#0f172a] bg-white">
            <div className="px-4 py-2.5 border-b-2 border-[#0f172a] flex items-center justify-between gap-2 flex-wrap"
                 style={{ background: stc.bg }}>
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#16a34a] text-white">{shot.id}</span>
                {shot.type && (
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-[#dbeafe] text-[#1d4ed8]">{shot.type}</span>
                )}
                {shot.label && <span className="text-sm font-bold text-[#0f172a] truncate">{shot.label}</span>}
              </div>
              {shot.category && (
                <span className="text-[10px] px-2 py-0.5 rounded font-bold border border-[#0f172a]/20 bg-white/60 text-[#475569]">
                  {shot.category}
                </span>
              )}
            </div>
            {shot.note && (
              <div className="px-4 py-2 text-xs text-[#475569] border-b border-[#e2e8f0]">{shot.note}</div>
            )}
            <div className="p-4 space-y-3">
              {(shot.prompts || []).map((pr, pi) => (
                <div key={pi} className="rounded-lg border-2 border-[#e2e8f0] overflow-hidden bg-[#fef9c3]/30">
                  <div className="px-3 py-1.5 bg-white flex items-center justify-between border-b border-[#e2e8f0]">
                    <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">{pr.tag}</span>
                    <CopyBtn text={pr.en} id={`shot-${safeIdx}-${si}-${pi}`} label="EN 복사" onCopy={onCopy} copiedId={copiedId} />
                  </div>
                  <div className="p-3 text-sm text-[#0f172a] leading-relaxed font-mono whitespace-pre-wrap">{pr.en}</div>
                  {pr.kr && (
                    <div className="px-3 py-2 text-xs text-[#64748b] leading-relaxed bg-white border-t border-[#e2e8f0]">{pr.kr}</div>
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
    <span className={`text-[10px] px-2 py-0.5 rounded${soft ? '-full' : ''} font-bold border border-[#0f172a]/20 ${soft ? 'bg-white' : 'bg-white/60'}`}>
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
          ? 'border-[#16a34a] text-[#16a34a] bg-[#dcfce7]'
          : 'border-[#0f172a] text-[#0f172a] bg-white hover:bg-[#f1f5f9]'
      }`}
    >
      {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {isCopied ? '복사됨' : label}
    </button>
  );
}

function UploadModal({ jsonInput, setJsonInput, uploadError, onClose, onLoad }) {
  return (
    <div onClick={onClose} className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0f172a]/60 backdrop-blur-md p-4">
      <div onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_24px_60px_rgba(15,23,42,0.25)] w-[640px] max-w-[95vw] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e8f0]">
          <span className="text-base font-bold text-[#0f172a] uppercase tracking-wider">프로덕션 바이블 JSON 업로드</span>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569] tb-press-soft">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
          <p className="text-sm text-[#64748b] leading-relaxed">
            JSON을 붙여넣으세요. 풀 프로덕션 바이블, 캐릭터 시트, 씬별 통합(v4),
            영상 프롬프트, 이미지 프롬프트 단독 등 다양한 형식을 자동 감지합니다.
          </p>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="w-full h-[260px] resize-y font-mono text-[13px] leading-relaxed p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:outline-none focus:border-[#00B380] focus:ring-[3px] focus:ring-[#00B380]/20"
            placeholder='{"project": {...}, "scenes": [...], "characters": [...], ...}'
          />
          {uploadError && (
            <div className="text-sm text-[#b91c1c] bg-[#fee2e2] border border-[#fca5a5] rounded-xl px-3 py-2 font-semibold">
              {uploadError}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#e2e8f0]">
          <button onClick={onClose} className="px-4 py-1.5 rounded-full tb-pill-ghost text-sm font-bold">취소</button>
          <button onClick={onLoad} className="px-4 py-1.5 rounded-full tb-pill-primary text-sm font-bold">불러오기</button>
        </div>
      </div>
    </div>
  );
}
