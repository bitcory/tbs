'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Upload, Copy, ExternalLink, Gem, X,
  Clapperboard, Image as ImageIcon, Film, MessageSquare, Music, Scissors, Droplets, Wrench, Trash2,
  User, Languages, Camera,
} from 'lucide-react';
import dynamic from 'next/dynamic';
const FrameExtractor = dynamic(() => import('@/app/components/FrameExtractor'), { ssr: false });
const WatermarkRemover = dynamic(() => import('@/app/components/WatermarkRemover'), { ssr: false });

const CACHE_KEY = 'toolb_step6_cinematic_v2';

const SHOT_FALLBACK_LABEL = {
  S01: 'Two Shot · Master',
  S02: 'A OTS · B 시점',
  S03: 'B OTS · A 시점',
  S04: 'A Close-up',
  S05: 'B Close-up',
};

const SHOT_DOT = {
  S01: '#0ea5e9',
  S02: '#10b981',
  S03: '#f59e0b',
  S04: '#ec4899',
  S05: '#8b5cf6',
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

function flattenDialogue(d, characters) {
  if (!d) return '';
  if (typeof d === 'string') return d;
  if (typeof d !== 'object') return '';
  // v2 object form: { speaker, ko, en, delivery, subtitle }
  if (d.subtitle && typeof d.subtitle === 'string') return d.subtitle;
  const name = d.speaker && characters?.[d.speaker]?.name
    ? characters[d.speaker].name
    : (d.speaker || '');
  const line = d.ko || d.en || '';
  return name ? `${name}: ${line}` : line;
}

function parseProject(raw) {
  const json = cleanJson(raw);
  if (!json.characters?.A || !json.characters?.B) {
    throw new Error('characters.A 와 characters.B 가 모두 필요합니다.');
  }
  if (!Array.isArray(json.shots) || json.shots.length === 0) {
    throw new Error('shots 배열이 필요합니다.');
  }
  const characters = json.characters;
  const shots = json.shots.map((s, i) => ({
    shot_id: s.shot_id || `S${String(i + 1).padStart(2, '0')}`,
    shot_type: s.shot_type || '',
    shot_label: s.shot_label || '',
    duration_sec: typeof s.duration_sec === 'number' ? s.duration_sec : null,
    purpose: s.purpose || '',
    characters_in_frame: Array.isArray(s.characters_in_frame) ? s.characters_in_frame : ['A', 'B'],
    camera: s.camera || {},
    blocking: s.blocking || {},
    emotion: s.emotion || {},
    audio: s.audio || null,
    dialogue_meta: (s.dialogue && typeof s.dialogue === 'object') ? s.dialogue : null,
    // Accept both new (image_prompt) and legacy (i2i_prompt) field names.
    image_prompt: s.image_prompt || s.i2i_prompt || '',
    video_prompt: typeof s.video_prompt === 'string' ? s.video_prompt : '',
    dialogue: flattenDialogue(s.dialogue, characters),
    imageUpload: '',
  }));
  return {
    project: json.project || {},
    scene_context: json.scene_context || {},
    characters: {
      A: { ...characters.A, imageUpload: '' },
      B: { ...characters.B, imageUpload: '' },
    },
    shots,
  };
}

function UploadSlot({ image, onFile }) {
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
      className="tb-upload-slot aspect-video rounded-xl flex flex-col items-center justify-center gap-2.5 p-6 cursor-pointer text-[#64748b] outline-none focus:ring-[3px] focus:ring-[#00B380]/40 focus:border-[#00B380] focus:bg-[#ecfdf5]"
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); openPicker(); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => { e.stopPropagation(); handleDrop(e); }}
        className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#00996D] hover:bg-[#00774f] text-white text-sm font-bold tb-press shadow-[0_6px_16px_rgba(0,153,109,0.3)]"
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

export default function Step6Page() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('A'); // 'A' | 'B' | 'S01'..'S05'
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
        if (parsed?.characters?.A && parsed?.characters?.B && Array.isArray(parsed?.shots)) {
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
    setTimeout(() => setToast(''), 1800);
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
      const parsed = parseProject(jsonInput);
      setData(parsed);
      setActiveTab('A');
      setUploadOpen(false);
      setJsonInput('');
      showToast('프로젝트 로드 완료!');
    } catch (e) {
      setUploadError(e.message || 'JSON 파싱 오류');
    }
  };

  const reset = () => {
    if (!confirm('현재 작업을 모두 지우고 초기화할까요?')) return;
    setData(null);
    setActiveTab('A');
    showToast('초기화됨');
  };

  const updateCharacter = (who, patch) => {
    setData((prev) => prev && {
      ...prev,
      characters: { ...prev.characters, [who]: { ...prev.characters[who], ...patch } },
    });
  };

  const updateShot = (shotId, patch) => {
    setData((prev) => prev && {
      ...prev,
      shots: prev.shots.map((s) => (s.shot_id === shotId ? { ...s, ...patch } : s)),
    });
  };

  const handleCharacterImageFile = (who, file) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드 가능합니다.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('5MB 이하의 이미지만 업로드 가능합니다.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => updateCharacter(who, { imageUpload: String(e.target.result) });
    reader.readAsDataURL(file);
  };

  const handleShotImageFile = (shotId, file) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드 가능합니다.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('5MB 이하의 이미지만 업로드 가능합니다.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => updateShot(shotId, { imageUpload: String(e.target.result) });
    reader.readAsDataURL(file);
  };

  const allImagePrompts = data ? data.shots.map((s) => s.image_prompt).filter(Boolean).join('\n\n') : '';
  const allVideoPrompts = data ? data.shots.map((s) => s.video_prompt).filter(Boolean).join('\n\n') : '';
  const allDialogues = data ? data.shots.map((s) => s.dialogue).filter(Boolean).join('\n\n') : '';

  const sc = data?.scene_context || {};

  return (
    <div className="min-h-screen md:h-screen md:flex md:flex-col md:overflow-hidden bg-[#f8fafc] text-[#0f172a]">
      <style jsx global>{`
        .tb-hero {
          position: relative;
          padding: 16px 20px 36px;
          background: linear-gradient(135deg, #016837 0%, #00996D 45%, #00B380 100%);
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
          background: radial-gradient(circle, rgba(255,255,255,0.22), transparent 60%);
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
          color: #00774f;
          border: 1.5px solid rgba(0,153,109,0.35);
          backdrop-filter: blur(18px) saturate(180%);
          -webkit-backdrop-filter: blur(18px) saturate(180%);
          box-shadow:
            0 10px 24px rgba(0,153,109,0.22),
            inset 2px 2px 1px 0 rgba(255,255,255,0.85),
            inset -1px -1px 1px 1px rgba(255,255,255,0.5);
          transition: transform 0.4s cubic-bezier(0.175,0.885,0.32,2.2), box-shadow 0.3s, background 0.3s;
        }
        .tb-pill-primary:hover {
          background: rgba(255,255,255,0.55);
          transform: translateY(-1px) scale(1.03);
          box-shadow:
            0 16px 32px rgba(0,153,109,0.3),
            inset 2px 2px 1px 0 rgba(255,255,255,0.95),
            inset -1px -1px 1px 1px rgba(255,255,255,0.6);
        }
        .tb-pill-primary:active {
          transform: translateY(1px) scale(0.94);
          box-shadow:
            0 4px 10px rgba(0,153,109,0.18),
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
          border-color: #00B380;
          background: #ecfdf5;
        }
        .tb-upload-slot.dragover {
          border-color: #00B380;
          background: #ecfdf5;
        }
      `}</style>

      {/* Hero */}
      <section className="tb-hero">
        <div className="tb-hero-glow" />
        <div className="tb-hero-row">
          <span className="tb-hero-eyebrow">TB STUDY · PRO 1</span>
          <h1 className="tb-hero-title">시네마틱 5컷 다이얼로그</h1>
        </div>
      </section>

      {/* Glass bar */}
      <div className="tb-glass-bar">
        <Link href="/?c=pro&s=step6" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full tb-pill-ghost text-xs sm:text-sm font-bold transition">
          <ArrowLeft className="w-3.5 h-3.5" />
          홈
        </Link>
        <span className="text-[11px] font-bold tracking-[0.18em] text-[#00996D] uppercase hidden sm:inline">TOOLB LAB</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full tb-pill-primary text-xs sm:text-sm font-bold transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">JSON </span>불러오기
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
              <Clapperboard className="w-3.5 h-3.5" />
              프로젝트 정보
            </div>
            {data ? (
              <div className="space-y-1.5">
                {data.project?.title && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[#64748b] font-medium w-14 pt-0.5">제목</span>
                    <span className="text-sm text-[#0f172a] font-bold flex-1 break-all">{data.project.title}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-sm text-[#64748b] font-medium w-14 pt-0.5">컷 수</span>
                  <span className="text-sm text-[#0f172a] font-bold flex-1">{data.shots.length}컷</span>
                </div>
                {data.project?.aspect_ratio && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[#64748b] font-medium w-14 pt-0.5">비율</span>
                    <span className="text-sm text-[#0f172a] font-bold flex-1">{data.project.aspect_ratio}</span>
                  </div>
                )}
                {sc.location && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[#64748b] font-medium w-14 pt-0.5">장소</span>
                    <span className="text-sm text-[#0f172a] font-bold flex-1">{sc.location}</span>
                  </div>
                )}
                {sc.time_of_day && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[#64748b] font-medium w-14 pt-0.5">시간</span>
                    <span className="text-sm text-[#0f172a] font-bold flex-1">{sc.time_of_day}</span>
                  </div>
                )}
                {data.project?.total_duration_sec > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[#64748b] font-medium w-14 pt-0.5">러닝</span>
                    <span className="text-sm text-[#0f172a] font-bold flex-1">
                      {data.project.total_duration_sec}초
                      {data.project?.clip_duration_sec ? ` (컷당 ${data.project.clip_duration_sec}초)` : ''}
                    </span>
                  </div>
                )}
                {data.project?.video_model && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[#64748b] font-medium w-14 pt-0.5">영상</span>
                    <span className="text-sm text-[#0f172a] font-bold flex-1">{data.project.video_model}</span>
                  </div>
                )}
                {data.project?.image_model && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[#64748b] font-medium w-14 pt-0.5">이미지</span>
                    <span className="text-sm text-[#0f172a] font-bold flex-1">{data.project.image_model}</span>
                  </div>
                )}
                {sc.mood && (
                  <div className="flex items-start gap-2 pt-1">
                    <span className="text-xs text-[#64748b] font-medium italic leading-relaxed">"{sc.mood}"</span>
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
                className="w-full flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold transition text-[#334155] bg-[#f1f5f9] hover:bg-[#e2e8f0] tb-press-soft"
              >
                <Languages className="w-4 h-4" />
                구글번역기
              </a>
              <button
                onClick={() => setToolView(toolView === 'frame-extractor' ? null : 'frame-extractor')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold transition ${
                  toolView === 'frame-extractor'
                    ? 'tb-pill-primary'
                    : 'text-[#334155] bg-[#f1f5f9] hover:bg-[#e2e8f0] tb-press-soft'
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
                    : 'text-[#334155] bg-[#f1f5f9] hover:bg-[#e2e8f0] tb-press-soft'
                }`}
              >
                <Droplets className="w-4 h-4" />
                워터마크제거
              </button>
            </div>
          </div>

          <div className="p-4 space-y-2">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-[#64748b]">
              <Gem className="w-3.5 h-3.5" />
              젬 가이드
            </div>
            <a
              href="https://gemini.google.com/gem/14w4k5_zTEEBu_-mgXFBM0MWyCJPYQBKb?usp=sharing"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full tb-pill-primary text-sm font-bold transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              시네마틱 5컷 젬 열기
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
              href="https://splitter.aitoolb.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[#0ea5e9] hover:opacity-90 text-white text-sm font-bold tb-press"
            >
              <Scissors className="w-3.5 h-3.5" />
              이미지분할기
            </a>
            <a
              href="https://grok.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[#0f172a] hover:opacity-90 text-white text-sm font-bold tb-press"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Grok 바로가기
            </a>
            <a
              href="https://gemini.google.com/gem/1Wy6XhDIfeb1rO9AiYYDMdc6-wDoixF60?usp=sharing"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[#f43f5e] hover:opacity-90 text-white text-sm font-bold tb-press"
            >
              <Music className="w-3.5 h-3.5" />
              음악만들기
            </a>
            <a
              href="https://suno.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[#f97316] hover:opacity-90 text-white text-sm font-bold tb-press"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              SUNO 바로가기
            </a>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col md:overflow-hidden bg-white border border-[#e2e8f0] rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          {toolView === 'frame-extractor' ? (
            <FrameExtractor accentColor="#00996D" />
          ) : toolView === 'watermark-remover' ? (
            <WatermarkRemover accentColor="#00996D" />
          ) : !data ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
              <div className="w-20 h-20 mb-5 rounded-full flex items-center justify-center bg-[#ecfdf5] border border-[#e2e8f0]">
                <Clapperboard className="w-10 h-10 text-[#00996D]" />
              </div>
              <h3 className="text-lg font-bold text-[#0f172a] mb-2">JSON을 불러와서 시작하세요</h3>
              <p className="text-sm text-[#64748b] mb-5 leading-relaxed">
                Gemini 젬에서 받은 시네마틱 5컷 JSON을 붙여넣으면<br />
                캐릭터 시트(A·B)와 5컷 프롬프트가 탭으로 정리됩니다.
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
              <div className="flex-shrink-0 px-4 py-3 border-b border-[#e2e8f0] bg-[#ecfdf5]/40 rounded-t-2xl flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <Clapperboard className="w-4 h-4 text-[#00996D] flex-shrink-0" />
                  <h2 className="text-base font-black text-[#0f172a] uppercase truncate">{data.project?.title || '시네마틱 5컷'}</h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#e2e8f0] text-[#64748b] flex-shrink-0">
                    {data.shots.length}컷
                  </span>
                  {data.project?.aspect_ratio && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#e2e8f0] text-[#64748b] flex-shrink-0">
                      {data.project.aspect_ratio}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  <button
                    onClick={() => copyText(allImagePrompts)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full tb-pill-primary text-sm font-bold transition"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    이미지 전체
                  </button>
                  <button
                    onClick={() => copyText(allVideoPrompts)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#f1f5f9] border border-[#e2e8f0] text-[#334155] text-sm font-bold tb-press-soft"
                  >
                    <Film className="w-3.5 h-3.5" />
                    영상 전체
                  </button>
                  <button
                    onClick={() => copyText(allDialogues)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#6d28d9] hover:opacity-90 text-white text-sm font-bold tb-press"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    대사 전체
                  </button>
                </div>
              </div>

              {/* Tab bar */}
              <div className="flex-shrink-0 flex gap-1.5 p-3 border-b border-[#e2e8f0] bg-white overflow-x-auto">
                {['A', 'B'].map((who) => {
                  const isActive = activeTab === who;
                  const ch = data.characters[who];
                  return (
                    <button
                      key={who}
                      onClick={() => setActiveTab(who)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-bold whitespace-nowrap rounded-full transition ${
                        isActive ? 'tb-pill-primary' : 'text-[#64748b] bg-[#f1f5f9] hover:bg-[#e2e8f0] tb-press-soft'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" style={{ opacity: isActive ? 1 : 0.7 }} />
                      <span>캐릭터 {who}</span>
                      {ch?.name && (
                        <span className="text-[10px] font-semibold opacity-70">{ch.name}</span>
                      )}
                    </button>
                  );
                })}
                {data.shots.map((s) => {
                  const isActive = activeTab === s.shot_id;
                  const dot = SHOT_DOT[s.shot_id] || '#94a3b8';
                  return (
                    <button
                      key={s.shot_id}
                      onClick={() => setActiveTab(s.shot_id)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-bold whitespace-nowrap rounded-full transition ${
                        isActive ? 'tb-pill-primary' : 'text-[#64748b] bg-[#f1f5f9] hover:bg-[#e2e8f0] tb-press-soft'
                      }`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: isActive ? '#fff' : dot, opacity: isActive ? 1 : 0.7 }}
                      />
                      <span>{s.shot_id}</span>
                      <span className="text-[10px] font-semibold opacity-60 hidden md:inline">
                        {s.shot_label || SHOT_FALLBACK_LABEL[s.shot_id] || s.shot_type}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {(activeTab === 'A' || activeTab === 'B') ? (
                  <CharacterCard
                    who={activeTab}
                    character={data.characters[activeTab]}
                    onCopy={copyText}
                    onUpdatePrompt={(v) => updateCharacter(activeTab, { sheet_prompt: v })}
                    onImageFile={(file) => handleCharacterImageFile(activeTab, file)}
                    onClearImage={() => updateCharacter(activeTab, { imageUpload: '' })}
                  />
                ) : (
                  <ShotCard
                    shot={data.shots.find((s) => s.shot_id === activeTab)}
                    characters={data.characters}
                    onCopy={copyText}
                    onUpdate={(patch) => updateShot(activeTab, patch)}
                    onImageFile={(file) => handleShotImageFile(activeTab, file)}
                    onClearImage={() => updateShot(activeTab, { imageUpload: '' })}
                  />
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
                시네마틱 5컷 JSON 업로드
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
                Gemini 젬에서 받은 JSON을 붙여넣으세요. 필요한 필드:
                <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px] mx-1">project</code>,
                <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px] mx-1">scene_context</code>,
                <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px] mx-1">characters.A / B</code>,
                <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px] mx-1">shots[]</code>
              </p>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full h-[260px] resize-y font-mono text-[13px] leading-relaxed p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:outline-none focus:border-[#00B380] focus:ring-[3px] focus:ring-[#00B380]/20"
                placeholder='{"project": {...}, "scene_context": {...}, "characters": {"A": {...}, "B": {...}}, "shots": [{"shot_id": "S01", ...}, ...]}'
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

function CharacterCard({ who, character, onCopy, onUpdatePrompt, onImageFile, onClearImage }) {
  const c = character;
  if (!c) return null;

  return (
    <div className="rounded-2xl overflow-hidden border border-[#e2e8f0] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between gap-3 bg-[#ecfdf5]/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[12px] font-black px-2 py-0.5 rounded-full bg-[#00996D]/15 text-[#00996D] flex items-center gap-1">
            <User className="w-3 h-3" />
            CHAR {who}
          </span>
          <span className="text-base font-bold text-[#0f172a] truncate">
            {c.name || '(이름 없음)'}
          </span>
          {c.role && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#e2e8f0] text-[#334155] flex-shrink-0">
              {c.role}
            </span>
          )}
        </div>
        {c.demographics && (
          <div className="hidden md:flex items-center gap-1 flex-shrink-0">
            {c.demographics.age_range && <Tag>{c.demographics.age_range}</Tag>}
            {c.demographics.gender && <Tag>{c.demographics.gender}</Tag>}
            {c.demographics.ethnicity && <Tag>{c.demographics.ethnicity}</Tag>}
          </div>
        )}
      </div>

      {/* 2-col: image upload | sheet prompt */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(400px,520px)_minmax(0,1fr)]">
        {/* LEFT: image */}
        <div className="p-4 border-b md:border-b-0 md:border-r border-[#e2e8f0]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#00996D]" />
              <span className="text-[11px] uppercase tracking-wider text-[#64748b] font-bold">캐릭터 시트 이미지</span>
            </div>
            {c.imageUpload && (
              <button
                onClick={onClearImage}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white hover:bg-[#fee2e2] border border-[#e2e8f0] text-[11px] font-bold text-[#b91c1c] tb-press-soft"
              >
                <Trash2 className="w-3 h-3" />
                제거
              </button>
            )}
          </div>
          <UploadSlot image={c.imageUpload} onFile={onImageFile} />
        </div>

        {/* RIGHT: info + sheet prompt */}
        <div className="p-4 min-w-0 space-y-3">
          {c.vibe && (
            <p className="bg-[#f8fafc] border-l-4 border-[#00996D] px-3 py-2 rounded-r-md text-[13px] text-[#334155] italic leading-snug">
              {c.vibe}
            </p>
          )}
          {c.voice_profile && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 py-2 rounded-xl bg-[#fefce8] border border-[#fde68a] text-[12px]">
              <span className="text-[10px] font-black text-[#a16207] uppercase tracking-wider self-center">VOICE</span>
              {c.voice_profile.tone && <Stat k="톤" v={c.voice_profile.tone} />}
              {c.voice_profile.pace && <Stat k="페이스" v={c.voice_profile.pace} />}
              {c.voice_profile.emotion_baseline && <Stat k="기본감정" v={c.voice_profile.emotion_baseline} />}
            </div>
          )}
          <CharSpecGrid character={c} />
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <ImageIcon className="w-3.5 h-3.5 text-[#00996D] flex-shrink-0" />
                <span className="text-[11px] uppercase tracking-wider text-[#64748b] font-bold">캐릭터 시트 프롬프트</span>
              </div>
              <button
                onClick={() => onCopy(c.sheet_prompt || '')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#f1f5f9] border border-[#e2e8f0] text-[11px] font-bold text-[#64748b] tb-press-soft"
              >
                <Copy className="w-3 h-3" />
                복사
              </button>
            </div>
            <textarea
              value={c.sheet_prompt || ''}
              onChange={(e) => onUpdatePrompt(e.target.value)}
              rows={10}
              placeholder="sheet_prompt..."
              className="w-full min-h-[240px] resize-y bg-white border border-[#e2e8f0] rounded-xl p-2.5 text-[13px] leading-relaxed font-mono text-[#0f172a] focus:outline-none focus:border-[#00B380] focus:ring-[3px] focus:ring-[#00B380]/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CharSpecGrid({ character }) {
  const p = character.physical || {};
  const w = character.wardrobe || {};
  const items = [
    p.hair && ['머리', p.hair],
    p.eyes && ['눈', p.eyes],
    p.face_shape && ['얼굴형', p.face_shape],
    p.skin && ['피부', p.skin],
    p.height_build && ['체격', p.height_build],
    p.distinguishing && ['특징', p.distinguishing],
    w.outerwear && w.outerwear !== '없음' && ['아우터', w.outerwear],
    w.top && ['상의', w.top],
    w.bottom && ['하의', w.bottom],
    w.accessories && ['액세서리', w.accessories],
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px] bg-[#f8fafc] rounded-xl p-3 border border-[#e2e8f0]">
      {items.map(([k, v]) => (
        <div key={k} className="flex gap-2 min-w-0">
          <span className="text-[#94a3b8] font-bold shrink-0 w-12">{k}</span>
          <span className="text-[#334155] truncate" title={v}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function ShotCard({ shot, characters, onCopy, onUpdate, onImageFile, onClearImage }) {
  if (!shot) return null;
  const dot = SHOT_DOT[shot.shot_id] || '#94a3b8';
  const cam = shot.camera || {};
  const blocking = shot.blocking || {};
  const emotion = shot.emotion || {};
  const audio = shot.audio || null;
  const dm = shot.dialogue_meta || null;

  return (
    <div className="rounded-2xl overflow-hidden border border-[#e2e8f0] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between gap-3"
        style={{ background: `${dot}10` }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="text-[12px] font-black px-2 py-0.5 rounded-full"
            style={{ background: `${dot}25`, color: dot }}
          >
            {shot.shot_id}
          </span>
          <span className="text-base font-bold text-[#0f172a] truncate">
            {shot.shot_label || SHOT_FALLBACK_LABEL[shot.shot_id] || shot.shot_type}
          </span>
          {shot.duration_sec > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#e2e8f0] text-[#334155] flex-shrink-0">
              {shot.duration_sec}초
            </span>
          )}
        </div>
        <div className="hidden md:flex items-center gap-1 flex-shrink-0">
          {(shot.characters_in_frame || []).map((id) => (
            <Tag key={id}>등장 {id}</Tag>
          ))}
        </div>
      </div>

      {shot.purpose && (
        <div className="px-4 py-3 border-b border-[#e2e8f0]">
          <p className="text-sm text-[#334155] leading-relaxed">{shot.purpose}</p>
        </div>
      )}

      {/* Camera / Blocking / Emotion summary strip */}
      <div className="px-4 py-3 border-b border-[#e2e8f0] bg-[#f8fafc] flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px]">
        {cam.framing && <Stat icon={Camera} k="프레이밍" v={cam.framing} />}
        {cam.lens && <Stat k="렌즈" v={cam.lens} />}
        {cam.aperture && <Stat k="조리개" v={cam.aperture} />}
        {cam.angle && <Stat k="앵글" v={cam.angle} />}
        {cam.movement && <Stat k="무빙" v={cam.movement} />}
        {(blocking.A || blocking.B) && <Stat k="블로킹" v={[blocking.A && `A: ${blocking.A}`, blocking.B && `B: ${blocking.B}`].filter(Boolean).join(' / ')} />}
        {(emotion.A || emotion.B) && <Stat k="감정" v={[emotion.A && `A: ${emotion.A}`, emotion.B && `B: ${emotion.B}`].filter(Boolean).join(' / ')} />}
      </div>

      {/* Audio strip (v2) */}
      {audio && (audio.ambient || audio.foley || audio.sfx || audio.music_cue) && (
        <div className="px-4 py-2.5 border-b border-[#e2e8f0] bg-[#fdf4ff] flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px]">
          <span className="text-[10px] font-black text-[#a21caf] uppercase tracking-wider self-center">AUDIO</span>
          {audio.ambient && audio.ambient !== '없음' && <Stat k="앰비언트" v={audio.ambient} />}
          {audio.foley && audio.foley !== '없음' && <Stat k="폴리" v={audio.foley} />}
          {audio.sfx && audio.sfx !== '없음' && <Stat k="SFX" v={audio.sfx} />}
          {audio.music_cue && audio.music_cue !== '없음' && <Stat k="음악" v={audio.music_cue} />}
          {audio.bgm_policy && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#e9d5ff] text-[#a21caf] self-center">
              {audio.bgm_policy}
            </span>
          )}
        </div>
      )}

      {/* Dialogue meta strip — speaker / delivery (preserved from JSON) */}
      {dm && (dm.speaker || dm.delivery) && (
        <div className="px-4 py-2.5 border-b border-[#e2e8f0] bg-[#fefce8] flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px]">
          <span className="text-[10px] font-black text-[#a16207] uppercase tracking-wider self-center">DIALOGUE</span>
          {dm.speaker && (
            <Stat k="화자" v={`${dm.speaker}${characters?.[dm.speaker]?.name ? ` · ${characters[dm.speaker].name}` : ''}`} />
          )}
          {dm.delivery && <Stat k="딜리버리" v={dm.delivery} />}
        </div>
      )}

      {/* 3-col: image | image+video prompts | dialogue */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(400px,520px)_minmax(0,1fr)_minmax(220px,320px)]">
        {/* LEFT: image upload */}
        <div className="p-4 border-b md:border-b-0 md:border-r border-[#e2e8f0]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#00996D]" />
              <span className="text-[11px] uppercase tracking-wider text-[#64748b] font-bold">이미지</span>
            </div>
            {shot.imageUpload && (
              <button
                onClick={onClearImage}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white hover:bg-[#fee2e2] border border-[#e2e8f0] text-[11px] font-bold text-[#b91c1c] tb-press-soft"
              >
                <Trash2 className="w-3 h-3" />
                제거
              </button>
            )}
          </div>
          <UploadSlot image={shot.imageUpload} onFile={onImageFile} />
        </div>

        {/* MIDDLE: i2i + video prompts */}
        <div className="p-4 border-b md:border-b-0 md:border-r border-[#e2e8f0] space-y-3 min-w-0">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <ImageIcon className="w-3.5 h-3.5 text-[#00996D] flex-shrink-0" />
                <span className="text-[11px] uppercase tracking-wider text-[#64748b] font-bold">이미지 프롬프트 (i2i)</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#ecfdf5] text-[#00996D] font-bold">
                  Nano Banana
                </span>
              </div>
              <button
                onClick={() => onCopy(shot.image_prompt)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#f1f5f9] border border-[#e2e8f0] text-[11px] font-bold text-[#64748b] tb-press-soft flex-shrink-0"
              >
                <Copy className="w-3 h-3" />
                복사
              </button>
            </div>
            <textarea
              value={shot.image_prompt}
              onChange={(e) => onUpdate({ image_prompt: e.target.value })}
              rows={5}
              placeholder="이미지 프롬프트..."
              className="w-full min-h-[110px] resize-y bg-white border border-[#e2e8f0] rounded-xl p-2.5 text-[13px] leading-relaxed font-mono text-[#0f172a] focus:outline-none focus:border-[#00B380] focus:ring-[3px] focus:ring-[#00B380]/20"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Film className="w-3.5 h-3.5 text-[#f43f5e] flex-shrink-0" />
                <span className="text-[11px] uppercase tracking-wider text-[#64748b] font-bold">영상 프롬프트</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#fee2e2] text-[#b91c1c] font-bold">
                  사용자 입력
                </span>
              </div>
              <button
                onClick={() => onCopy(shot.video_prompt)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#f1f5f9] border border-[#e2e8f0] text-[11px] font-bold text-[#64748b] tb-press-soft flex-shrink-0"
              >
                <Copy className="w-3 h-3" />
                복사
              </button>
            </div>
            <textarea
              value={shot.video_prompt}
              onChange={(e) => onUpdate({ video_prompt: e.target.value })}
              rows={5}
              placeholder="이 컷의 영상 프롬프트를 자유롭게 작성하세요. 카메라 워크, 인물 동작, 컷 길이 등."
              className="w-full min-h-[110px] resize-y bg-white border border-[#e2e8f0] rounded-xl p-2.5 text-[13px] leading-relaxed font-mono text-[#0f172a] focus:outline-none focus:border-[#00B380] focus:ring-[3px] focus:ring-[#00B380]/20"
            />
          </div>
        </div>

        {/* RIGHT: dialogue */}
        <div className="p-4 bg-[#faf5ff] min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <MessageSquare className="w-3.5 h-3.5 text-[#6d28d9] flex-shrink-0" />
              <span className="text-[11px] uppercase tracking-wider text-[#64748b] font-bold">대사</span>
            </div>
            <button
              onClick={() => onCopy(shot.dialogue)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#f1f5f9] border border-[#e2e8f0] text-[11px] font-bold text-[#64748b] tb-press-soft flex-shrink-0"
            >
              <Copy className="w-3 h-3" />
              복사
            </button>
          </div>
          {/* Speaker quick-insert helpers */}
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {['A', 'B'].map((who) => {
              const name = characters?.[who]?.name || who;
              return (
                <button
                  key={who}
                  onClick={() => {
                    const prefix = `${name}: `;
                    onUpdate({ dialogue: (shot.dialogue ? shot.dialogue + '\n' : '') + prefix });
                  }}
                  className="px-2.5 py-1 rounded-full bg-white border border-[#e2e8f0] text-[11px] font-bold text-[#475569] tb-press-soft hover:bg-[#f1f5f9]"
                >
                  + {who} 대사
                </button>
              );
            })}
          </div>
          <textarea
            value={shot.dialogue}
            onChange={(e) => onUpdate({ dialogue: e.target.value })}
            rows={9}
            placeholder={`A: 첫 대사\nB: 답변...`}
            className="w-full min-h-[220px] resize-y bg-white border border-[#e2e8f0] rounded-xl p-2.5 text-[13px] leading-relaxed text-[#0f172a] focus:outline-none focus:border-[#6d28d9] focus:ring-[3px] focus:ring-[#6d28d9]/20"
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, k, v }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {Icon && <Icon className="w-3 h-3 text-[#94a3b8] flex-shrink-0" />}
      <span className="text-[#94a3b8] font-bold uppercase tracking-wider text-[10px]">{k}</span>
      <span className="text-[#334155] truncate" title={v}>{v}</span>
    </div>
  );
}

function Tag({ children }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white border border-[#e2e8f0] text-[#475569] text-[11px] font-bold whitespace-nowrap">
      {children}
    </span>
  );
}
