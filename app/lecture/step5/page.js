'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Upload, Copy, ExternalLink, X,
  Music, Image as ImageIcon, Film, Scissors, Droplets, Wrench, Trash2,
  User, Languages, BookOpen, Sparkles, ListTree, FileText,
} from 'lucide-react';
import dynamic from 'next/dynamic';
const FrameExtractor = dynamic(() => import('@/app/components/FrameExtractor'), { ssr: false });
const WatermarkRemover = dynamic(() => import('@/app/components/WatermarkRemover'), { ssr: false });

const CACHE_KEY = 'toolb_step5_music_v2';

const ACCENT = '#d97706';
const ACCENT_DARK = '#b45309';
const ACCENT_LIGHT = '#fef3c7';
const ACCENT_BG = '#fffbeb';

const PHASE_LABEL = {
  intro: '도입',
  rising: '상승',
  climax: '절정',
  outro: '여운',
};
const PHASE_COLOR = {
  intro: '#0ea5e9',
  rising: '#10b981',
  climax: '#f43f5e',
  outro: '#a855f7',
};

const STYLE_LABEL = {
  watercolor: '수채화 일러스트',
  photorealistic: '실사 시네마틱',
  anime: '애니메이션 스타일',
  dreamy: '몽환 판타지',
  minimalist: '미니멀 포스터',
  children_book: '동화책 일러스트',
  dark_cinematic: '다크 시네마틱',
  vintage_film: '빈티지 필름',
};

function cleanJson(raw) {
  const cleaned = String(raw || '').trim()
    .replace(/^```(?:json|JSON)?\s*\n?/gm, '')
    .replace(/\n?```\s*$/gm, '')
    .trim();
  if (!cleaned) throw new Error('JSON 내용을 입력해주세요.');
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`JSON 파싱 오류: ${e.message}`);
  }
}

function normalizeScene(s) {
  let chars_in = [];
  if (Array.isArray(s.chars_in)) {
    chars_in = s.chars_in.filter((x) => typeof x === 'string');
  } else if (s.char_in === true) {
    // back-compat: 옛 단일 boolean → char_1 등장으로 간주
    chars_in = ['char_1'];
  }
  return {
    id: typeof s.id === 'number' ? s.id : Number(s.id) || 0,
    sub: s.sub || '',
    phase: s.phase || 'intro',
    chars_in,
    motif: s.motif || '',
    prompt: s.prompt || '',
    imageUpload: '',
  };
}

function normalizeMaster(m, idx, prevById) {
  const id = m.id || `char_${idx + 1}`;
  return {
    id,
    description: m.description || '',
    prompt: m.prompt || '',
    character_sheet_prompt: m.character_sheet_prompt || '',
    imageUpload: prevById[id] || '',
  };
}

/**
 * Parse a single JSON part. If `prev` exists and the new part is a continuation
 * (part >= 2), merge scenes & titles into the previous state. Part 1 resets,
 * but preserves any previously-uploaded image data per matching scene id.
 */
function parsePart(raw, prev) {
  const json = cleanJson(raw);
  if (typeof json !== 'object' || json === null) throw new Error('유효한 JSON이 아닙니다.');
  if (!Array.isArray(json.scenes)) throw new Error('scenes 배열이 필요합니다.');

  const part = typeof json.part === 'number' ? json.part : 1;
  const incoming = json.scenes.map(normalizeScene);

  if (part === 1) {
    if (!json.meta) throw new Error('part 1에는 meta가 필요합니다.');
    // v2.3: master_characters 배열 / 옛 단일형(master_character)도 수용
    let masterArr = null;
    if (Array.isArray(json.master_characters) && json.master_characters.length > 0) {
      masterArr = json.master_characters;
    } else if (json.master_character && typeof json.master_character === 'object') {
      masterArr = [json.master_character];
    }
    if (!masterArr) throw new Error('part 1에는 master_characters 배열이 필요합니다.');

    const prevById = {};
    (prev?.master_characters || []).forEach((m) => {
      if (m?.id) prevById[m.id] = m.imageUpload || '';
    });

    return {
      meta: json.meta,
      input_mode: json.input_mode || prev?.input_mode || 'text_only',
      master_characters: masterArr.map((m, i) => normalizeMaster(m, i, prevById)),
      scenes: incoming.map((s) => {
        const old = prev?.scenes?.find((x) => x.id === s.id);
        return { ...s, imageUpload: old?.imageUpload || '' };
      }),
      titles: Array.isArray(json.titles) ? json.titles : (prev?.titles || []),
      total_parts: typeof json.total_parts === 'number' ? json.total_parts : 1,
    };
  }

  if (!prev) {
    throw new Error('part 1을 먼저 불러와주세요. part 2는 단독으로 로드할 수 없습니다.');
  }
  const map = new Map();
  prev.scenes.forEach((s) => map.set(s.id, s));
  incoming.forEach((s) => {
    const old = map.get(s.id);
    map.set(s.id, { ...s, imageUpload: old?.imageUpload || '' });
  });
  const merged = Array.from(map.values()).sort((a, b) => a.id - b.id);
  return {
    ...prev,
    scenes: merged,
    titles: Array.isArray(json.titles) && json.titles.length > 0 ? json.titles : prev.titles,
  };
}

function UploadSlot({ image, onFile, aspect = 'aspect-video' }) {
  const fileRef = useRef(null);
  const slotRef = useRef(null);

  const openPicker = () => fileRef.current?.click();

  const handlePaste = (e) => {
    const items = e.clipboardData?.items || [];
    for (const item of items) {
      if (item.type && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          onFile(file);
          break;
        }
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  if (image) {
    return (
      <>
        <div
          className="relative w-full rounded-xl overflow-hidden border border-[#e2e8f0] cursor-pointer group bg-[#0f172a] flex items-center justify-center"
          onClick={openPicker}
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={handleDrop}
          style={{ maxHeight: '70vh' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="uploaded" className="w-full h-auto max-h-[70vh] object-contain block" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center pointer-events-none">
            <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">교체</span>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = '';
          }}
        />
      </>
    );
  }

  return (
    <div
      ref={slotRef}
      tabIndex={0}
      onClick={() => slotRef.current?.focus()}
      onPaste={handlePaste}
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
      onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
      onDrop={handleDrop}
      className={`tb-upload-slot ${aspect} rounded-xl flex flex-col items-center justify-center gap-2.5 p-6 cursor-pointer text-[#64748b] outline-none focus:ring-[3px] focus:ring-[#f59e0b]/40 focus:border-[#d97706] focus:bg-[#fffbeb]`}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); openPicker(); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => { e.stopPropagation(); handleDrop(e); }}
        className="flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-bold tb-press shadow-[0_6px_16px_rgba(217,119,6,0.3)]"
        style={{ background: ACCENT }}
      >
        <Upload className="w-4 h-4" />
        이미지 선택
      </button>
      <div className="text-center text-[11px] leading-relaxed mt-1">
        <div className="font-bold text-[#475569]">클릭 · 드래그&amp;드롭 · Ctrl+V 붙여넣기</div>
        <div className="text-[10px] mt-0.5 text-[#94a3b8]">PNG · JPG · WEBP (≤5MB)</div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export default function Step5Page() {
  const [data, setData] = useState(null);
  // view: 'scenes' | 'master' | 'titles'
  const [view, setView] = useState('scenes');
  // scenePhase: 'intro' | 'rising' | 'climax' | 'outro'
  const [scenePhase, setScenePhase] = useState('intro');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [toast, setToast] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [toolView, setToolView] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.meta && Array.isArray(parsed?.scenes) && Array.isArray(parsed?.master_characters)) {
          setData(parsed);
        }
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
    setTimeout(() => setToast(''), 2000);
  };

  const copyText = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => showToast('복사됨!'))
      .catch(() => showToast('복사 실패'));
  };

  const loadJson = () => {
    setUploadError('');
    try {
      const merged = parsePart(jsonInput, data);
      setData(merged);
      setUploadOpen(false);
      setJsonInput('');
      const sceneCount = merged.scenes.length;
      const total = merged.meta?.total_scenes || sceneCount;
      const isComplete = sceneCount >= total && (merged.titles?.length || 0) >= 5;
      if (isComplete) {
        showToast(`전체 ${sceneCount}컷 로드 완료!`);
      } else if (sceneCount < total) {
        showToast(`${sceneCount}/${total}컷 로드됨 — part 2를 추가로 불러오세요`);
      } else {
        showToast(`${sceneCount}컷 로드됨 — 제목 5개를 추가로 불러오세요`);
      }
    } catch (e) {
      setUploadError(e.message || 'JSON 파싱 오류');
    }
  };

  const reset = () => {
    if (!confirm('현재 작업을 모두 지우고 초기화할까요?')) return;
    setData(null);
    showToast('초기화됨');
  };

  const updateScene = (id, patch) => {
    setData((prev) => prev && {
      ...prev,
      scenes: prev.scenes.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  };

  const updateMaster = (id, patch) => {
    setData((prev) => prev && {
      ...prev,
      master_characters: (prev.master_characters || []).map((m) =>
        m.id === id ? { ...m, ...patch } : m
      ),
    });
  };

  const handleSceneImageFile = (id, file) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드 가능합니다.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('5MB 이하의 이미지만 업로드 가능합니다.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => updateScene(id, { imageUpload: String(e.target.result) });
    reader.readAsDataURL(file);
  };

  const handleMasterImageFile = (id, file) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드 가능합니다.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('5MB 이하의 이미지만 업로드 가능합니다.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => updateMaster(id, { imageUpload: String(e.target.result) });
    reader.readAsDataURL(file);
  };

  const allPrompts = useMemo(
    () => data ? data.scenes.map((s) => s.prompt).filter(Boolean).join('\n\n') : '',
    [data]
  );
  const allSubs = useMemo(
    () => data ? data.scenes.map((s) => s.sub).join('\n') : '',
    [data]
  );

  const phaseCounts = useMemo(() => {
    if (!data) return null;
    return data.scenes.reduce((acc, s) => {
      acc[s.phase] = (acc[s.phase] || 0) + 1;
      return acc;
    }, {});
  }, [data]);

  const meta = data?.meta || {};
  const sceneCount = data?.scenes?.length || 0;
  const totalScenes = meta.total_scenes || sceneCount;
  const isPartial = sceneCount > 0 && sceneCount < totalScenes;
  const titleCount = data?.titles?.length || 0;

  return (
    <div className="min-h-screen md:h-screen md:flex md:flex-col md:overflow-hidden bg-[#f8fafc] text-[#0f172a]">
      <style jsx global>{`
        .tb-hero {
          position: relative;
          padding: 16px 20px 36px;
          background: linear-gradient(135deg, #92400e 0%, #b45309 35%, #d97706 70%, #f59e0b 100%);
          color: #fff;
          text-align: center;
          overflow: hidden;
        }
        .tb-hero-row {
          position: relative; z-index: 2;
          display: grid; grid-template-columns: 1fr auto 1fr;
          align-items: center; gap: 12px;
        }
        @media (max-width: 640px) { .tb-hero-row { display: block; } }
        .tb-hero::before {
          content: ''; position: absolute; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.22'/%3E%3C/svg%3E");
          mix-blend-mode: overlay; pointer-events: none;
        }
        .tb-hero::after {
          content: ''; position: absolute; left: -10%; right: -10%; bottom: -1px;
          height: 24px; background: #f8fafc; border-radius: 50% 50% 0 0 / 100% 100% 0 0;
        }
        .tb-hero-glow {
          position: absolute; top: -40px; right: -60px; width: 260px; height: 260px;
          background: radial-gradient(circle, rgba(255,236,196,0.36), transparent 60%);
          filter: blur(30px); pointer-events: none;
        }
        .tb-hero-eyebrow {
          display: inline-block; font-size: 10px; font-weight: 800;
          letter-spacing: 0.26em; text-transform: uppercase;
          padding: 4px 11px; border-radius: 100px;
          background: rgba(255,255,255,0.16);
          border: 1px solid rgba(255,255,255,0.35);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          grid-column: 1; justify-self: start;
        }
        .tb-hero-title {
          font-size: clamp(20px, 4.5vw, 26px);
          font-weight: 900; line-height: 1.2; letter-spacing: -0.01em;
          margin: 0; grid-column: 2; justify-self: center;
        }
        @media (max-width: 640px) {
          .tb-hero-eyebrow { margin-bottom: 8px; }
        }
        .tb-glass-bar {
          position: relative; z-index: 3;
          margin: -22px 16px 0;
          padding: 10px 14px;
          display: flex; align-items: center; gap: 10px;
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.9);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 100px;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.1);
        }
        .tb-pill-primary {
          background: rgba(255,255,255,0.4);
          color: #b45309;
          border: 1.5px solid rgba(217,119,6,0.35);
          backdrop-filter: blur(18px) saturate(180%);
          -webkit-backdrop-filter: blur(18px) saturate(180%);
          box-shadow:
            0 10px 24px rgba(217,119,6,0.22),
            inset 2px 2px 1px 0 rgba(255,255,255,0.85),
            inset -1px -1px 1px 1px rgba(255,255,255,0.5);
          transition: transform 0.4s cubic-bezier(0.175,0.885,0.32,2.2), box-shadow 0.3s, background 0.3s;
        }
        .tb-pill-primary:hover {
          background: rgba(255,255,255,0.55);
          transform: translateY(-1px) scale(1.03);
          box-shadow:
            0 16px 32px rgba(217,119,6,0.3),
            inset 2px 2px 1px 0 rgba(255,255,255,0.95),
            inset -1px -1px 1px 1px rgba(255,255,255,0.6);
        }
        .tb-pill-primary:active {
          transform: translateY(1px) scale(0.94);
          box-shadow:
            0 4px 10px rgba(217,119,6,0.18),
            inset 2px 2px 2px 0 rgba(0,0,0,0.08),
            inset -1px -1px 1px 1px rgba(255,255,255,0.3);
          transition: transform 0.08s ease-out, box-shadow 0.08s ease-out;
        }
        .tb-pill-ghost {
          background: rgba(255,255,255,0.55);
          color: #334155;
          border: 1px solid rgba(255,255,255,0.7);
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
          box-shadow:
            0 6px 16px rgba(15,23,42,0.08),
            inset 1.5px 1.5px 0.5px 0 rgba(255,255,255,0.85),
            inset -1px -1px 0.5px 1px rgba(255,255,255,0.45);
          transition: transform 0.4s cubic-bezier(0.175,0.885,0.32,2.2), box-shadow 0.3s, background 0.3s;
        }
        .tb-pill-ghost:hover {
          background: rgba(255,255,255,0.75);
          transform: translateY(-1px) scale(1.03);
        }
        .tb-pill-ghost:active {
          transform: translateY(1px) scale(0.94);
          box-shadow:
            0 3px 8px rgba(15,23,42,0.1),
            inset 1.5px 1.5px 2px 0 rgba(0,0,0,0.08),
            inset -1px -1px 0.5px 1px rgba(255,255,255,0.3);
          transition: transform 0.08s ease-out, box-shadow 0.08s ease-out;
        }
        .tb-upload-slot {
          border: 2px dashed #cbd5e1;
          transition: border-color 0.2s, background 0.2s;
        }
        .tb-upload-slot:hover {
          border-color: #d97706;
          background: #fffbeb;
        }
        .tb-upload-slot.dragover {
          border-color: #d97706;
          background: #fffbeb;
        }
      `}</style>

      {/* Hero */}
      <section className="tb-hero">
        <div className="tb-hero-glow" />
        <div className="tb-hero-row">
          <span className="tb-hero-eyebrow">TB STUDY · PRO 2</span>
          <h1 className="tb-hero-title">뮤직영상 마스터</h1>
        </div>
      </section>

      {/* Glass bar */}
      <div className="tb-glass-bar">
        <Link href="/?c=pro&s=step5" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full tb-pill-ghost text-xs sm:text-sm font-bold transition">
          <ArrowLeft className="w-3.5 h-3.5" />
          홈
        </Link>
        <span className="text-[11px] font-bold tracking-[0.18em] text-[#b45309] uppercase hidden sm:inline">TOOLB LAB</span>
        <div className="ml-auto flex items-center gap-2">
          {data && isPartial && (
            <span className="hidden md:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#fef3c7] border border-[#fde68a] text-[11px] font-bold text-[#b45309]">
              <Sparkles className="w-3 h-3" />
              {sceneCount}/{totalScenes}컷 · part 2 대기
            </span>
          )}
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full tb-pill-primary text-xs sm:text-sm font-bold transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">JSON </span>{data ? '추가/교체' : '불러오기'}
          </button>
          {data && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#fecaca] text-[#dc2626] text-xs sm:text-sm font-bold tb-press-soft transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">초기화</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:flex-1 md:min-h-0 w-full px-4 pt-6 pb-4 gap-4 2xl:px-6">
        {/* Sidebar */}
        <aside className="w-full md:w-[300px] flex-shrink-0 bg-white border border-[#e2e8f0] rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.06)] md:overflow-y-auto">
          <div className="p-4 border-b border-[#e2e8f0]">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-[#64748b]">
              <Music className="w-3.5 h-3.5" />
              프로젝트 정보
            </div>
            {data ? (
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-sm text-[#64748b] font-medium w-14 pt-0.5">컷 수</span>
                  <span className="text-sm text-[#0f172a] font-bold flex-1">
                    {sceneCount}{totalScenes !== sceneCount ? ` / ${totalScenes}` : ''}컷
                  </span>
                </div>
                {meta.style && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[#64748b] font-medium w-14 pt-0.5">스타일</span>
                    <span className="text-sm text-[#0f172a] font-bold flex-1">
                      {STYLE_LABEL[meta.style] || meta.style}
                    </span>
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
              <a
                href="https://translate.google.co.kr/?sl=ko&tl=en&op=translate"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold transition text-[#1e40af] bg-[#eff6ff] hover:bg-[#dbeafe] tb-press-soft"
              >
                <Languages className="w-4 h-4" />
                구글번역기
              </a>
              <button
                onClick={() => setToolView(toolView === 'frame-extractor' ? null : 'frame-extractor')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold transition ${
                  toolView === 'frame-extractor'
                    ? 'tb-pill-primary'
                    : 'text-[#92400e] bg-[#fef3c7] hover:bg-[#fde68a] tb-press-soft'
                }`}
              >
                <Film className="w-4 h-4" />
                프레임추출기
              </button>
              <button
                onClick={() => setToolView(toolView === 'watermark-remover' ? null : 'watermark-remover')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold transition ${
                  toolView === 'watermark-remover'
                    ? 'tb-pill-primary'
                    : 'text-[#155e75] bg-[#cffafe] hover:bg-[#a5f3fc] tb-press-soft'
                }`}
              >
                <Droplets className="w-4 h-4" />
                워터마크제거
              </button>
              <a
                href="https://tbnc.aitoolb.com/"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold transition text-[#6b21a8] bg-[#f3e8ff] hover:bg-[#e9d5ff] tb-press-soft"
              >
                <FileText className="w-4 h-4" />
                파일명변경
              </a>
            </div>
          </div>

          <div className="p-4 space-y-2">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-[#64748b]">
              <Sparkles className="w-3.5 h-3.5" />
              GPT 가이드
            </div>
            <a
              href="https://chatgpt.com/g/g-69f0d402cc788191bd5da040ae3126fa-pro-class-tb-myujigyeongsangmandeulgi-eumagmandeulgi-1-3"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full tb-pill-primary text-sm font-bold transition"
            >
              <Music className="w-3.5 h-3.5" />
              뮤직생성 1/3
            </a>
            <a
              href="https://gemini.google.com/gem/1DVP7H4Dz6mFhtR2oPircgAHuCx8qTQ7B?usp=sharing"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full tb-pill-primary text-sm font-bold transition"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              이미지생성 2/3
            </a>
            <a
              href="https://chatgpt.com/g/g-69f0dde853148191a837f2820c8b9098-pro-class-tb-myujigyeongsangmandeulgi-yeongsangpeurompeuteu-2-3"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full tb-pill-primary text-sm font-bold transition"
            >
              <Film className="w-3.5 h-3.5" />
              영상생성 3/3
            </a>
            <a
              href="https://kr.pinterest.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[#E60023] hover:opacity-90 text-white text-sm font-bold tb-press"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
              </svg>
              핀터레스트
            </a>
            <a
              href="https://gemini.google.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[#1a73e8] hover:opacity-90 text-white text-sm font-bold tb-press"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              제미나이
            </a>
            <a
              href="https://labs.google/fx/ko/tools/flow"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[#7c3aed] hover:opacity-90 text-white text-sm font-bold tb-press"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              FLOW 바로가기
            </a>
            <a
              href="https://splitter.aitoolb.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[#0ea5e9] hover:opacity-90 text-white text-sm font-bold tb-press"
            >
              <Scissors className="w-3.5 h-3.5" />
              이미지분할기
            </a>
            <a
              href="https://suno.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[#f97316] hover:opacity-90 text-white text-sm font-bold tb-press"
            >
              <Music className="w-3.5 h-3.5" />
              SUNO 바로가기
            </a>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col md:overflow-hidden bg-white border border-[#e2e8f0] rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          {toolView === 'frame-extractor' ? (
            <FrameExtractor accentColor={ACCENT} />
          ) : toolView === 'watermark-remover' ? (
            <WatermarkRemover accentColor={ACCENT} />
          ) : !data ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
              <div className="w-20 h-20 mb-5 rounded-full flex items-center justify-center bg-[#fffbeb] border border-[#fde68a]">
                <Music className="w-10 h-10 text-[#d97706]" />
              </div>
              <h3 className="text-lg font-bold text-[#0f172a] mb-2">JSON을 불러와서 시작하세요</h3>
              <p className="text-sm text-[#64748b] mb-5 leading-relaxed">
                Gemini 젬에서 받은 뮤직영상 프롬프트 JSON을 붙여넣으면<br />
                마스터 캐릭터와 컷별 프롬프트가 탭으로 정리됩니다.<br />
                <span className="text-[12px] text-[#94a3b8]">26컷 이상은 part 1 → part 2 순서로 두 번 불러오세요.</span>
              </p>
              <button
                onClick={() => setUploadOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full tb-pill-primary text-sm font-bold transition"
              >
                <Upload className="w-3.5 h-3.5" />
                JSON 불러오기
              </button>
            </div>
          ) : (
            <>
              {/* Top bulk-copy bar */}
              <div className="flex-shrink-0 px-4 py-3 border-b border-[#e2e8f0] bg-[#fffbeb]/50 rounded-t-2xl flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <Music className="w-4 h-4 text-[#d97706] flex-shrink-0" />
                  <h2 className="text-base font-black text-[#0f172a] uppercase truncate">뮤직영상 프롬프트</h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#e2e8f0] text-[#64748b] flex-shrink-0">
                    {sceneCount}컷
                  </span>
                  {meta.style && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#e2e8f0] text-[#64748b] flex-shrink-0 hidden sm:inline">
                      {STYLE_LABEL[meta.style] || meta.style}
                    </span>
                  )}
                  {isPartial && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#fef3c7] border border-[#fde68a] text-[#b45309] flex-shrink-0">
                      part 2 필요
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  <button
                    onClick={() => copyText(allPrompts)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full tb-pill-primary text-sm font-bold transition"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    프롬프트 전체
                  </button>
                  <button
                    onClick={() => copyText(allSubs)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#f1f5f9] border border-[#e2e8f0] text-[#334155] text-sm font-bold tb-press-soft"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    가사 전체
                  </button>
                </div>
              </div>

              {/* Tab bar */}
              <div className="flex-shrink-0 flex gap-1.5 p-3 border-b border-[#e2e8f0] bg-white">
                <button
                  onClick={() => setView('titles')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-bold whitespace-nowrap rounded-full transition ${
                    view === 'titles' ? 'tb-pill-primary' : 'text-[#64748b] bg-[#f1f5f9] hover:bg-[#e2e8f0] tb-press-soft'
                  }`}
                >
                  <ListTree className="w-3.5 h-3.5" />
                  <span>제목</span>
                  {titleCount > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      view === 'titles' ? 'bg-white/60 text-[#b45309]' : 'bg-white border border-[#e2e8f0] text-[#64748b]'
                    }`}>
                      {titleCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setView('master')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-bold whitespace-nowrap rounded-full transition ${
                    view === 'master' ? 'tb-pill-primary' : 'text-[#64748b] bg-[#f1f5f9] hover:bg-[#e2e8f0] tb-press-soft'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>마스터 캐릭터</span>
                </button>
                <button
                  onClick={() => setView('scenes')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-bold whitespace-nowrap rounded-full transition ${
                    view === 'scenes' ? 'tb-pill-primary' : 'text-[#64748b] bg-[#f1f5f9] hover:bg-[#e2e8f0] tb-press-soft'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>장면</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    view === 'scenes' ? 'bg-white/60 text-[#b45309]' : 'bg-white border border-[#e2e8f0] text-[#64748b]'
                  }`}>
                    {sceneCount}
                  </span>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5">
                {view === 'master' ? (
                  <div className="space-y-4">
                    {(data.master_characters || []).map((m, idx) => (
                      <MasterCard
                        key={m.id || idx}
                        master={m}
                        index={idx}
                        total={data.master_characters.length}
                        onCopy={copyText}
                        onUpdatePrompt={(v) => updateMaster(m.id, { character_sheet_prompt: v })}
                        onUpdateRefShot={(v) => updateMaster(m.id, { prompt: v })}
                        onImageFile={(file) => handleMasterImageFile(m.id, file)}
                        onClearImage={() => updateMaster(m.id, { imageUpload: '' })}
                      />
                    ))}
                  </div>
                ) : view === 'titles' ? (
                  <TitlesCard titles={data.titles || []} onCopy={copyText} />
                ) : (
                  <div className="space-y-4">
                    {/* Phase sub-tabs */}
                    <div className="flex flex-wrap gap-1.5">
                      {['intro', 'rising', 'climax', 'outro'].map((p) => {
                        const count = (phaseCounts && phaseCounts[p]) || 0;
                        const isActive = scenePhase === p;
                        const color = PHASE_COLOR[p];
                        return (
                          <button
                            key={p}
                            onClick={() => setScenePhase(p)}
                            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-bold whitespace-nowrap rounded-full transition tb-press-soft ${
                              isActive ? 'text-white' : 'text-[#64748b] bg-[#f1f5f9] hover:bg-[#e2e8f0]'
                            }`}
                            style={isActive ? {
                              background: color,
                              boxShadow: `0 6px 16px ${color}40`,
                            } : undefined}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: isActive ? '#fff' : color }}
                            />
                            <span>{PHASE_LABEL[p]}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              isActive ? 'bg-white/25 text-white' : 'bg-white border border-[#e2e8f0] text-[#64748b]'
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Filtered scenes */}
                    {(() => {
                      const filtered = data.scenes.filter((s) => s.phase === scenePhase);
                      if (filtered.length === 0) {
                        return (
                          <div className="rounded-xl border border-dashed border-[#e2e8f0] p-10 text-center">
                            <p className="text-sm text-[#94a3b8]">
                              <span className="font-bold" style={{ color: PHASE_COLOR[scenePhase] }}>
                                {PHASE_LABEL[scenePhase]}
                              </span>
                              {' '}단계의 컷이 없습니다.
                            </p>
                          </div>
                        );
                      }
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {filtered.map((s) => (
                            <SceneCard
                              key={s.id}
                              scene={s}
                              onCopy={copyText}
                              onUpdate={(patch) => updateScene(s.id, patch)}
                              onImageFile={(file) => handleSceneImageFile(s.id, file)}
                              onClearImage={() => updateScene(s.id, { imageUpload: '' })}
                            />
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Upload Modal */}
      {uploadOpen && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0f172a]/60 backdrop-blur-md"
          onClick={() => setUploadOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_24px_60px_rgba(15,23,42,0.25)] w-[640px] max-w-[95vw] max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e8f0]">
              <span className="text-base font-bold text-[#0f172a] uppercase tracking-wider">
                뮤직영상 프롬프트 JSON 업로드
              </span>
              <button
                onClick={() => setUploadOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569] tb-press-soft"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
              <p className="text-sm text-[#64748b] leading-relaxed">
                Gemini 젬에서 받은 JSON을 붙여넣으세요. 26컷 이상은 part 1 →
                <code className="bg-[#fffbeb] px-1.5 py-0.5 rounded text-[#b45309] font-mono text-[12px] mx-1">part 2</code>
                순서로 두 번 불러오면 자동으로 병합됩니다.
              </p>
              <div className="text-[12px] text-[#475569] flex flex-wrap gap-1.5">
                <span className="font-bold text-[#0f172a]">필수 필드:</span>
                <code className="bg-[#fef3c7] px-1.5 py-0.5 rounded text-[#b45309] font-mono">part</code>
                <code className="bg-[#fef3c7] px-1.5 py-0.5 rounded text-[#b45309] font-mono">scenes[]</code>
                <span className="text-[#94a3b8]">·</span>
                <span className="text-[#64748b]">part 1은 추가로</span>
                <code className="bg-[#fef3c7] px-1.5 py-0.5 rounded text-[#b45309] font-mono">meta</code>
                <code className="bg-[#fef3c7] px-1.5 py-0.5 rounded text-[#b45309] font-mono">master_characters[]</code>
              </div>
              {data && (
                <div className="text-[12px] bg-[#fffbeb] border border-[#fde68a] rounded-xl px-3 py-2 text-[#b45309] font-semibold">
                  현재 {sceneCount}/{totalScenes}컷 로드됨. {isPartial ? 'part 2를 붙여넣으면 병합됩니다.' : 'part 1을 다시 붙여넣으면 교체됩니다.'}
                </div>
              )}
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full h-[260px] resize-y font-mono text-[13px] leading-relaxed p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:outline-none focus:border-[#d97706] focus:ring-[3px] focus:ring-[#d97706]/20"
                placeholder='{"part": 1, "total_parts": 2, "meta": {...}, "master_characters": [{"id":"char_1", ...}], "scenes": [{...}]}'
              />
              {uploadError && (
                <div className="text-sm text-[#b91c1c] bg-[#fee2e2] border border-[#fca5a5] rounded-xl px-3 py-2 font-semibold">
                  {uploadError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#e2e8f0]">
              <button
                onClick={() => setUploadOpen(false)}
                className="px-4 py-1.5 rounded-full tb-pill-ghost text-sm font-bold transition"
              >
                취소
              </button>
              <button
                onClick={loadJson}
                className="px-4 py-1.5 rounded-full tb-pill-primary text-sm font-bold transition"
              >
                불러오기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[400] px-4 py-2.5 rounded-full text-sm font-bold tb-pill-primary">
          {toast}
        </div>
      )}
    </div>
  );
}

function MasterCard({ master, index = 0, total = 1, onCopy, onUpdatePrompt, onUpdateRefShot, onImageFile, onClearImage }) {
  if (!master) return null;
  const labelNum = total > 1 ? ` ${index + 1}` : '';
  const idLabel = master.id ? master.id.toUpperCase() : `CHAR_${index + 1}`;
  return (
    <div className="rounded-2xl overflow-hidden border border-[#e2e8f0] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <div className="px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between gap-3 bg-[#fffbeb]/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[12px] font-black px-2 py-0.5 rounded-full bg-[#d97706]/15 text-[#b45309] flex items-center gap-1">
            <User className="w-3 h-3" />
            MASTER{labelNum}
          </span>
          <span className="text-base font-bold text-[#0f172a] truncate">마스터 캐릭터{labelNum}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white border border-[#e2e8f0] text-[#64748b] hidden sm:inline">
            {idLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(360px,460px)_minmax(0,1fr)]">
        <div className="p-4 border-b md:border-b-0 md:border-r border-[#e2e8f0]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#d97706]" />
              <span className="text-[11px] uppercase tracking-wider text-[#64748b] font-bold">캐릭터 시트 이미지</span>
            </div>
            {master.imageUpload && (
              <button
                onClick={onClearImage}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white hover:bg-[#fee2e2] border border-[#e2e8f0] text-[11px] font-bold text-[#b91c1c] tb-press-soft"
              >
                <Trash2 className="w-3 h-3" />
                제거
              </button>
            )}
          </div>
          <UploadSlot image={master.imageUpload} onFile={onImageFile} aspect="aspect-video" />
        </div>

        <div className="p-4 min-w-0 space-y-3">
          {master.description && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1">한국어 외형 요약</div>
              <p className="bg-[#f8fafc] border-l-4 border-[#d97706] px-3 py-2 rounded-r-md text-[13px] text-[#334155] leading-relaxed">
                {master.description}
              </p>
            </div>
          )}
          {master.prompt && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">Reference shot 프롬프트 (한 줄)</span>
                </div>
                <button
                  onClick={() => onCopy(master.prompt || '')}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white hover:bg-[#f1f5f9] border border-[#e2e8f0] text-[10px] font-bold text-[#64748b] tb-press-soft"
                >
                  <Copy className="w-2.5 h-2.5" />
                  복사
                </button>
              </div>
              <textarea
                value={master.prompt || ''}
                onChange={(e) => onUpdateRefShot(e.target.value)}
                rows={2}
                className="w-full resize-y bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-2 text-[12px] leading-relaxed font-mono text-[#475569] focus:outline-none focus:border-[#d97706] focus:ring-[3px] focus:ring-[#d97706]/20"
              />
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <ImageIcon className="w-3.5 h-3.5 text-[#d97706] flex-shrink-0" />
                <span className="text-[11px] uppercase tracking-wider text-[#64748b] font-bold">캐릭터 시트 프롬프트 (English)</span>
              </div>
              <button
                onClick={() => onCopy(master.character_sheet_prompt || '')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#f1f5f9] border border-[#e2e8f0] text-[11px] font-bold text-[#64748b] tb-press-soft"
              >
                <Copy className="w-3 h-3" />
                복사
              </button>
            </div>
            <textarea
              value={master.character_sheet_prompt || ''}
              onChange={(e) => onUpdatePrompt(e.target.value)}
              rows={10}
              placeholder="character sheet prompt..."
              className="w-full min-h-[240px] resize-y bg-white border border-[#e2e8f0] rounded-xl p-2.5 text-[13px] leading-relaxed font-mono text-[#0f172a] focus:outline-none focus:border-[#d97706] focus:ring-[3px] focus:ring-[#d97706]/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SceneCard({ scene, onCopy, onUpdate, onImageFile, onClearImage }) {
  if (!scene) return null;
  const dot = PHASE_COLOR[scene.phase] || '#94a3b8';
  return (
    <div className="rounded-xl overflow-hidden border border-[#e2e8f0] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] flex flex-col">
      {/* Header: id + phase + char_in + motif */}
      <div
        className="px-3 py-2 border-b border-[#e2e8f0] flex items-center gap-1.5 flex-wrap"
        style={{ background: `${dot}10` }}
      >
        <span
          className="text-[11px] font-black px-2 py-0.5 rounded-full"
          style={{ background: `${dot}25`, color: dot }}
        >
          S{String(scene.id).padStart(2, '0')}
        </span>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: `${dot}18`, color: dot }}
        >
          {PHASE_LABEL[scene.phase] || scene.phase}
        </span>
        {Array.isArray(scene.chars_in) && scene.chars_in.length > 0 && scene.chars_in.map((charId) => {
          const num = String(charId).replace(/^char_/, '');
          return (
            <span
              key={charId}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#fef3c7] text-[#b45309] border border-[#fde68a] inline-flex items-center gap-0.5"
              title={`마스터 ${num} 등장`}
            >
              <User className="w-2.5 h-2.5" />
              <span>{num}</span>
            </span>
          );
        })}
      </div>

      {/* Lyric */}
      <div className="px-3 py-2 border-b border-[#e2e8f0] bg-[#f8fafc]">
        <p
          className="text-[13px] font-bold text-[#0f172a] leading-snug line-clamp-2 break-keep"
          title={scene.sub}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'keep-all',
            minHeight: '2.6em',
          }}
        >
          {scene.sub || '—'}
        </p>
        <p
          className="text-[10px] mt-0.5 truncate font-medium"
          title={scene.motif ? `모티프 · ${scene.motif}` : '모티프 없음'}
        >
          <span className="text-[#cbd5e1]">◆</span>{' '}
          <span className={scene.motif ? 'text-[#94a3b8]' : 'text-[#cbd5e1] italic'}>
            {scene.motif || '모티프 없음'}
          </span>
        </p>
      </div>

      {/* Image (top, 2:3 aspect) */}
      <div className="p-3 border-b border-[#e2e8f0]">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1">
            <ImageIcon className="w-3 h-3 text-[#d97706]" />
            <span className="text-[10px] uppercase tracking-wider text-[#64748b] font-bold">이미지</span>
          </div>
          {scene.imageUpload && (
            <button
              onClick={onClearImage}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white hover:bg-[#fee2e2] border border-[#e2e8f0] text-[10px] font-bold text-[#b91c1c] tb-press-soft"
            >
              <Trash2 className="w-2.5 h-2.5" />
              제거
            </button>
          )}
        </div>
        <UploadSlot image={scene.imageUpload} onFile={onImageFile} aspect="aspect-video" />
      </div>

      {/* Prompt (bottom) */}
      <div className="p-3 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-wider text-[#64748b] font-bold">프롬프트</span>
          <button
            onClick={() => onCopy(scene.prompt)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white hover:bg-[#f1f5f9] border border-[#e2e8f0] text-[10px] font-bold text-[#64748b] tb-press-soft"
          >
            <Copy className="w-2.5 h-2.5" />
            복사
          </button>
        </div>
        <textarea
          value={scene.prompt}
          onChange={(e) => onUpdate({ prompt: e.target.value })}
          rows={6}
          placeholder="cinematic single-sentence prompt..."
          className="w-full min-h-[140px] flex-1 resize-y bg-white border border-[#e2e8f0] rounded-lg p-2 text-[12px] leading-relaxed font-mono text-[#0f172a] focus:outline-none focus:border-[#d97706] focus:ring-[3px] focus:ring-[#d97706]/20"
        />
      </div>
    </div>
  );
}

function TitlesCard({ titles, onCopy }) {
  if (!titles || titles.length === 0) {
    return (
      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-10 text-center">
        <ListTree className="w-10 h-10 mx-auto mb-3 text-[#cbd5e1]" />
        <p className="text-sm text-[#64748b]">제목은 마지막 part(또는 단일 출력)에 포함됩니다.</p>
        <p className="text-[12px] text-[#94a3b8] mt-1">part 2를 불러오면 여기에 표시됩니다.</p>
      </div>
    );
  }
  const allKr = titles.map((t) => t.kr).filter(Boolean).join('\n');
  const allEn = titles.map((t) => t.en).filter(Boolean).join('\n');
  return (
    <div className="rounded-2xl overflow-hidden border border-[#e2e8f0] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <div className="px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between gap-3 bg-[#fffbeb]/60">
        <div className="flex items-center gap-2.5">
          <span className="text-[12px] font-black px-2 py-0.5 rounded-full bg-[#d97706]/15 text-[#b45309] flex items-center gap-1">
            <ListTree className="w-3 h-3" />
            TITLES
          </span>
          <span className="text-base font-bold text-[#0f172a]">추천 제목 {titles.length}개</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onCopy(allKr)}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-white hover:bg-[#f1f5f9] border border-[#e2e8f0] text-[11px] font-bold text-[#475569] tb-press-soft"
          >
            <Copy className="w-3 h-3" />
            한글 전체
          </button>
          <button
            onClick={() => onCopy(allEn)}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-white hover:bg-[#f1f5f9] border border-[#e2e8f0] text-[11px] font-bold text-[#475569] tb-press-soft"
          >
            <Copy className="w-3 h-3" />
            영문 전체
          </button>
        </div>
      </div>
      <div className="divide-y divide-[#e2e8f0]">
        {titles.map((t, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3 group hover:bg-[#fffbeb]/30 transition-colors">
            <span className="text-[11px] font-black w-6 h-6 rounded-full bg-[#fef3c7] text-[#b45309] flex items-center justify-center flex-shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold text-[#0f172a] truncate">{t.kr}</div>
              <div className="text-[12px] text-[#64748b] truncate font-mono">{t.en}</div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={() => onCopy(t.kr)}
                className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white border border-[#e2e8f0] text-[10px] font-bold text-[#475569] tb-press-soft hover:bg-[#f1f5f9]"
              >
                <Copy className="w-2.5 h-2.5" />
                한글복사
              </button>
              <button
                onClick={() => onCopy(t.en)}
                className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white border border-[#e2e8f0] text-[10px] font-bold text-[#475569] tb-press-soft hover:bg-[#f1f5f9]"
              >
                <Copy className="w-2.5 h-2.5" />
                영문복사
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
