'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Upload, Copy, ExternalLink, Gem, X,
  Clapperboard, Image as ImageIcon, Film, MessageSquare, Music, Scissors, Droplets, Wrench, Trash2,
  Languages, Camera, Layers, Sparkles, ScrollText, Clock, FileText,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { serializeBoardToPrompt } from './serialize';
const FrameExtractor = dynamic(() => import('@/app/components/FrameExtractor'), { ssr: false });
const WatermarkRemover = dynamic(() => import('@/app/components/WatermarkRemover'), { ssr: false });

const CACHE_KEY = 'toolb_step7_cinematic_v6';

const FUNCTION_LABEL = {
  establishing: '오프닝',
  character_intro: '인물 소개',
  inciting_action: '발단',
  macro_detail: '디테일',
  texture_beauty: '텍스처',
  interaction: '상호작용',
  emotional_beat: '감정',
  abstract_motif: '모티프',
  wide_climax_build: '빌드업',
  hero_climax: '클라이맥스',
  resolution: '레졸루션',
  brand_reveal: '브랜드',
  bridge_frame_end: '브릿지 끝',
  bridge_frame_start: '브릿지 시작',
};

const BOARD_DOT = { A: '#f97316', B: '#fb7185' };

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

// Accept either a real storyboard object or the schema-doc form (schema_definition + examples).
// When the user pastes the schema itself, transparently use the first embedded example.
function unwrapDoc(json) {
  if (json && typeof json === 'object' && (json.boards || json.scene || json.project)) {
    return json;
  }
  if (json && typeof json === 'object') {
    for (const key of Object.keys(json)) {
      if (key.startsWith('example_') && json[key]?.boards) return json[key];
    }
  }
  return json;
}

function parsePanel(p, pi) {
  return {
    number: typeof p.number === 'number' ? p.number : pi + 1,
    timecode: p.timecode || '',
    duration_seconds: typeof p.duration_seconds === 'number' ? p.duration_seconds : 0,
    function: p.function || '',
    is_bridge: !!p.is_bridge,
    image_prompt_en: p.image_prompt_en || '',
    labels: {
      action_visual: p.labels?.action_visual || '',
      camera_movement: p.labels?.camera_movement || '',
      sound_dialogue: p.labels?.sound_dialogue || '',
      transition: p.labels?.transition || '',
    },
  };
}

function parseV6(raw) {
  let json = cleanJson(raw);
  json = unwrapDoc(json);

  if (!json || typeof json !== 'object') throw new Error('JSON 객체가 아닙니다.');
  if (!Array.isArray(json.boards) || json.boards.length === 0) {
    throw new Error('boards 배열이 필요합니다 (1~2개).');
  }
  if (!json.project) throw new Error('project 객체가 필요합니다.');
  if (!json.scene) throw new Error('scene 객체가 필요합니다.');

  const mode = json.mode === 'B' ? 'B' : 'A';

  const boards = json.boards.map((b, i) => ({
    label: b.label || (i === 0 ? 'A' : 'B'),
    title_suffix: b.title_suffix || '',
    duration_seconds: typeof b.duration_seconds === 'number' ? b.duration_seconds : 10,
    main_frame: { prompt_en: b.main_frame?.prompt_en || '' },
    panels: (Array.isArray(b.panels) ? b.panels : []).map(parsePanel),
    production_notes: Array.isArray(b.production_notes) ? b.production_notes : [],
    moodboard_keywords: Array.isArray(b.moodboard_keywords) ? b.moodboard_keywords : [],
  }));

  return {
    version: json.version || '6.0',
    mode,
    project: json.project,
    scene: json.scene,
    consistency_lock: json.consistency_lock || null,
    bridge_frame: json.bridge_frame || null,
    boards,
    production: json.production || null,
    grok_workflow: json.grok_workflow || null,
  };
}

export default function Step7Page() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'A' | 'B'
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
        if (Array.isArray(parsed?.boards) && parsed?.project) setData(parsed);
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
      const parsed = parseV6(jsonInput);
      setData(parsed);
      setActiveTab('overview');
      setUploadOpen(false);
      setJsonInput('');
      showToast('스토리보드 로드 완료!');
    } catch (e) {
      setUploadError(e.message || 'JSON 파싱 오류');
    }
  };

  const reset = () => {
    if (!confirm('현재 작업을 모두 지우고 초기화할까요?')) return;
    setData(null);
    setActiveTab('overview');
    showToast('초기화됨');
  };

  const updateBoard = (boardIndex, patch) => {
    setData((prev) => prev && {
      ...prev,
      boards: prev.boards.map((b, i) => (i === boardIndex ? { ...b, ...patch } : b)),
    });
  };

  const updatePanel = (boardIndex, panelIdx, patch) => {
    setData((prev) => prev && {
      ...prev,
      boards: prev.boards.map((b, i) => {
        if (i !== boardIndex) return b;
        return {
          ...b,
          panels: b.panels.map((p, pi) => (pi === panelIdx ? { ...p, ...patch } : p)),
        };
      }),
    });
  };

  // Each board (A / B) is copied from its own master-prompt CTA inside BoardView.
  const activeBoardIndex = data && (activeTab === 'A' || activeTab === 'B')
    ? data.boards.findIndex(b => b.label === activeTab)
    : -1;
  const activeBoard = activeBoardIndex >= 0 ? data?.boards?.[activeBoardIndex] : null;

  return (
    <div className="min-h-screen md:h-screen md:flex md:flex-col md:overflow-hidden bg-[var(--tb-bg)] text-[var(--tb-text)]">
      <style jsx global>{`
        .tb-hero {
          position: relative;
          padding: 16px 20px 36px;
          background: linear-gradient(135deg, #7c2d12 0%, #ea580c 45%, #f97316 100%);
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
          height: 24px; background: var(--tb-bg); border-radius: 50% 50% 0 0 / 100% 100% 0 0;
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
          background: rgba(var(--tb-glass-bar-rgb),0.7);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 100px;
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.3);
        }
        .tb-pill-primary {
          background: rgba(249,115,22,0.18);
          color: #fb923c;
          border: 1.5px solid rgba(249,115,22,0.4);
          backdrop-filter: blur(18px) saturate(180%);
          -webkit-backdrop-filter: blur(18px) saturate(180%);
          box-shadow:
            0 10px 24px rgba(249,115,22,0.22),
            inset 2px 2px 1px 0 rgba(255,255,255,0.12),
            inset -1px -1px 1px 1px rgba(255,255,255,0.06);
          transition: transform 0.4s cubic-bezier(0.175,0.885,0.32,2.2), box-shadow 0.3s, background 0.3s;
        }
        .tb-pill-primary:hover {
          background: rgba(249,115,22,0.28);
          transform: translateY(-1px) scale(1.03);
          box-shadow:
            0 16px 32px rgba(249,115,22,0.3),
            inset 2px 2px 1px 0 rgba(255,255,255,0.16),
            inset -1px -1px 1px 1px rgba(255,255,255,0.08);
        }
        .tb-pill-primary:active {
          transform: translateY(1px) scale(0.94);
          box-shadow:
            0 4px 10px rgba(249,115,22,0.18),
            inset 2px 2px 2px 0 rgba(0,0,0,0.3),
            inset -1px -1px 1px 1px rgba(255,255,255,0.06);
          transition: transform 0.08s ease-out, box-shadow 0.08s ease-out;
        }
        .tb-pill-ghost {
          background: rgba(var(--tb-ghost-rgb),0.55);
          color: var(--tb-text);
          border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
          box-shadow:
            0 6px 16px rgba(0,0,0,0.25),
            inset 1.5px 1.5px 0.5px 0 rgba(255,255,255,0.1),
            inset -1px -1px 0.5px 1px rgba(255,255,255,0.05);
          transition: transform 0.4s cubic-bezier(0.175,0.885,0.32,2.2), box-shadow 0.3s, background 0.3s;
        }
        .tb-pill-ghost:hover {
          background: rgba(var(--tb-ghost-rgb),0.75);
          transform: translateY(-1px) scale(1.03);
        }
        .tb-pill-ghost:active {
          transform: translateY(1px) scale(0.94);
          box-shadow:
            0 3px 8px rgba(0,0,0,0.3),
            inset 1.5px 1.5px 2px 0 rgba(0,0,0,0.3),
            inset -1px -1px 0.5px 1px rgba(255,255,255,0.05);
          transition: transform 0.08s ease-out, box-shadow 0.08s ease-out;
        }
      `}</style>

      {/* Hero */}
      <section className="tb-hero">
        <div className="tb-hero-glow" />
        <div className="tb-hero-row">
          <span className="tb-hero-eyebrow">TB STUDY · PRO 3</span>
          <h1 className="tb-hero-title">멀티영상 만들기</h1>
        </div>
      </section>

      {/* Glass bar */}
      <div className="tb-glass-bar">
        <Link href="/?c=pro&s=step7" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full tb-pill-ghost text-xs sm:text-sm font-bold transition">
          <ArrowLeft className="w-3.5 h-3.5" />
          홈
        </Link>
        <span className="text-[11px] font-bold tracking-[0.18em] text-[#f97316] uppercase hidden sm:inline">TOOLB LAB</span>
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--tb-surface-2)] border border-[#fecaca] text-[color-mix(in_srgb,#dc2626_62%,var(--tb-text))] text-xs sm:text-sm font-bold tb-press-soft transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">초기화</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:flex-1 md:min-h-0 w-full px-4 pt-6 pb-4 gap-4 2xl:px-6">
        {/* Sidebar */}
        <aside className="w-full md:w-[300px] flex-shrink-0 bg-[var(--tb-surface)] border border-[var(--tb-border)] rounded-2xl shadow-[0_10px_30px_-14px_rgba(0,0,0,0.16)] md:overflow-y-auto">
          <div className="p-4 border-b border-[var(--tb-border)]">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-[var(--tb-text-muted)]">
              <Clapperboard className="w-3.5 h-3.5" />
              프로젝트 정보
            </div>
            {data ? (
              <div className="space-y-1.5">
                {data.project?.title && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[var(--tb-text-muted)] font-medium w-14 pt-0.5">제목</span>
                    <span className="text-sm text-[var(--tb-text)] font-bold flex-1 break-all">{data.project.title}</span>
                  </div>
                )}
                {data.project?.genre && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[var(--tb-text-muted)] font-medium w-14 pt-0.5">장르</span>
                    <span className="text-sm text-[var(--tb-text)] font-bold flex-1">{data.project.genre}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-sm text-[var(--tb-text-muted)] font-medium w-14 pt-0.5">모드</span>
                  <span className="text-sm text-[var(--tb-text)] font-bold flex-1">
                    {data.mode === 'B' ? 'B · A+B (10초+10초 = 20초)' : 'A · 1보드 (10초)'}
                  </span>
                </div>
                {data.project?.total_duration_seconds > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[var(--tb-text-muted)] font-medium w-14 pt-0.5">러닝</span>
                    <span className="text-sm text-[var(--tb-text)] font-bold flex-1">{data.project.total_duration_seconds}초</span>
                  </div>
                )}
                {Array.isArray(data.project?.tone) && data.project.tone.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[var(--tb-text-muted)] font-medium w-14 pt-0.5">톤</span>
                    <span className="text-sm text-[var(--tb-text)] font-bold flex-1">{data.project.tone.join(' · ')}</span>
                  </div>
                )}
                {data.production?.aspect_ratio && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[var(--tb-text-muted)] font-medium w-14 pt-0.5">비율</span>
                    <span className="text-sm text-[var(--tb-text)] font-bold flex-1">{data.production.aspect_ratio}</span>
                  </div>
                )}
                {data.scene?.title && (
                  <div className="flex items-start gap-2 pt-1.5 border-t border-[var(--tb-border)] mt-1.5">
                    <span className="text-sm text-[var(--tb-text-muted)] font-medium w-14 pt-0.5">씬</span>
                    <span className="text-sm text-[var(--tb-text)] font-bold flex-1 break-words">{data.scene.title}</span>
                  </div>
                )}
                {data.scene?.logline && (
                  <p className="text-xs text-[var(--tb-text-muted)] italic leading-snug pt-1">"{data.scene.logline}"</p>
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
              <a
                href="https://translate.google.co.kr/?sl=ko&tl=en&op=translate"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold transition text-[var(--tb-text)] bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] tb-press-soft"
              >
                <Languages className="w-4 h-4" />
                구글번역기
              </a>
              <button
                onClick={() => setToolView(toolView === 'frame-extractor' ? null : 'frame-extractor')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold transition ${
                  toolView === 'frame-extractor'
                    ? 'tb-pill-primary'
                    : 'text-[var(--tb-text)] bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] tb-press-soft'
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
                    : 'text-[var(--tb-text)] bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] tb-press-soft'
                }`}
              >
                <Droplets className="w-4 h-4" />
                워터마크제거
              </button>
              <a
                href="https://tbnc.aitoolb.com/"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold transition text-[var(--tb-text)] bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] tb-press-soft"
              >
                <FileText className="w-4 h-4" />
                파일명변경
              </a>
            </div>
          </div>

          <div className="p-4 space-y-2">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-[var(--tb-text-muted)]">
              <Gem className="w-3.5 h-3.5" />
              젬 가이드
            </div>
            <a
              href="https://chatgpt.com/g/g-69ff2603eee08191bede6ce918be0f6a-pro-class-meolti-yeongsangmandeulgi-v4-0"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full tb-pill-primary text-sm font-bold transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              멀티영상 젬 열기
            </a>
            <a
              href="https://kr.pinterest.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[var(--tb-surface)] border border-[var(--tb-border)] hover:bg-[var(--tb-surface-2)] text-[var(--tb-text)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-sm font-bold tb-press"
            >
              <svg className="w-3.5 h-3.5 text-[#E60023]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
              </svg>
              핀터레스트
            </a>
            <a
              href="https://gemini.google.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[var(--tb-surface)] border border-[var(--tb-border)] hover:bg-[var(--tb-surface-2)] text-[var(--tb-text)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-sm font-bold tb-press"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#1a73e8]" />
              제미나이
            </a>
            <a
              href="https://splitter.aitoolb.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[var(--tb-surface)] border border-[var(--tb-border)] hover:bg-[var(--tb-surface-2)] text-[var(--tb-text)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-sm font-bold tb-press"
            >
              <Scissors className="w-3.5 h-3.5 text-[#0ea5e9]" />
              이미지분할기
            </a>
            <a
              href="https://grok.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[var(--tb-surface)] border border-[var(--tb-border)] hover:bg-[var(--tb-surface-2)] text-[var(--tb-text)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-sm font-bold tb-press"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#0f172a]" />
              Grok 바로가기
            </a>
            <a
              href="https://gemini.google.com/gem/1Wy6XhDIfeb1rO9AiYYDMdc6-wDoixF60?usp=sharing"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[var(--tb-surface)] border border-[var(--tb-border)] hover:bg-[var(--tb-surface-2)] text-[var(--tb-text)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-sm font-bold tb-press"
            >
              <Music className="w-3.5 h-3.5 text-[#f43f5e]" />
              음악만들기
            </a>
            <a
              href="https://suno.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[var(--tb-surface)] border border-[var(--tb-border)] hover:bg-[var(--tb-surface-2)] text-[var(--tb-text)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-sm font-bold tb-press"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#f97316]" />
              SUNO 바로가기
            </a>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col md:overflow-hidden bg-[var(--tb-surface)] border border-[var(--tb-border)] rounded-2xl shadow-[0_10px_30px_-14px_rgba(0,0,0,0.16)]">
          {toolView === 'frame-extractor' ? (
            <FrameExtractor accentColor="#f97316" />
          ) : toolView === 'watermark-remover' ? (
            <WatermarkRemover accentColor="#f97316" />
          ) : !data ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
              <div className="w-20 h-20 mb-5 rounded-full flex items-center justify-center bg-[var(--tb-surface-2)] border border-[var(--tb-border)]">
                <Clapperboard className="w-10 h-10 text-[#f97316]" />
              </div>
              <h3 className="text-lg font-bold text-[var(--tb-text)] mb-2">JSON을 불러와서 시작하세요</h3>
              <p className="text-sm text-[var(--tb-text-muted)] mb-5 leading-relaxed">
                젬에서 받은 멀티영상 스토리보드 JSON(v6)을 붙여넣으면<br />
                보드별로 마스터 프롬프트가 즉시 만들어집니다.
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
              {/* Top info bar */}
              <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--tb-border)] bg-[#f97316]/10 rounded-t-2xl flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <Clapperboard className="w-4 h-4 text-[#f97316] flex-shrink-0" />
                  <h2 className="text-base font-black text-[var(--tb-text)] uppercase truncate">
                    {data.project?.title || '멀티영상 만들기'}
                  </h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[var(--tb-text-muted)] flex-shrink-0">
                    {data.boards.length}보드
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[var(--tb-text-muted)] flex-shrink-0">
                    {data.boards.reduce((acc, b) => acc + b.panels.length, 0)}패널
                  </span>
                  {data.project?.total_duration_seconds > 0 && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[var(--tb-text-muted)] flex-shrink-0">
                      {data.project.total_duration_seconds}초
                    </span>
                  )}
                  {data.production?.aspect_ratio && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[var(--tb-text-muted)] flex-shrink-0">
                      {data.production.aspect_ratio}
                    </span>
                  )}
                </div>
              </div>

              {/* Tab bar */}
              <div className="flex-shrink-0 flex gap-1.5 p-3 border-b border-[var(--tb-border)] bg-[var(--tb-surface)] overflow-x-auto">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-bold whitespace-nowrap rounded-full transition ${
                    activeTab === 'overview' ? 'tb-pill-primary' : 'text-[var(--tb-text-muted)] hover:bg-[var(--tb-surface-2)] tb-press-soft'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  개요
                </button>
                {data.boards.map((b) => {
                  const tabId = b.label;
                  const isActive = activeTab === tabId;
                  const dot = BOARD_DOT[b.label] || '#94a3b8';
                  return (
                    <button
                      key={tabId}
                      onClick={() => setActiveTab(tabId)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-bold whitespace-nowrap rounded-full transition ${
                        isActive ? 'tb-pill-primary' : 'text-[var(--tb-text-muted)] hover:bg-[var(--tb-surface-2)] tb-press-soft'
                      }`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: dot, opacity: isActive ? 1 : 0.7 }}
                      />
                      <span>Board {b.label}</span>
                      <span className="text-[10px] font-semibold opacity-60">
                        {b.duration_seconds}초{b.title_suffix ? ` · ${b.title_suffix}` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {activeTab === 'overview' ? (
                  <OverviewCard data={data} onCopy={copyText} />
                ) : activeBoard ? (
                  <BoardView
                    board={activeBoard}
                    boardIndex={activeBoardIndex}
                    data={data}
                    onCopy={copyText}
                    onUpdateBoard={(patch) => updateBoard(activeBoardIndex, patch)}
                    onUpdatePanel={(panelIdx, patch) => updatePanel(activeBoardIndex, panelIdx, patch)}
                  />
                ) : null}
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
            className="bg-[var(--tb-surface)] rounded-2xl border border-[var(--tb-border)] shadow-[0_24px_60px_rgba(0,0,0,0.5)] w-[640px] max-w-[95vw] max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--tb-border)]">
              <span className="text-base font-bold text-[var(--tb-text)] uppercase tracking-wider">
                멀티영상 JSON 업로드 (v6)
              </span>
              <button
                onClick={() => setUploadOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] text-[var(--tb-text-muted)] tb-press-soft"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
              <p className="text-sm text-[var(--tb-text-muted)] leading-relaxed">
                Cinematic Storyboard v6 JSON을 붙여넣으세요. Mode A는 1보드(10초/6패널), Mode B는 2보드(20초/12패널) 구조입니다.
                마크다운 코드블록(```json)은 자동 제거됩니다.
              </p>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full h-[260px] resize-y font-mono text-[13px] leading-relaxed p-3 rounded-xl bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[var(--tb-text)] focus:outline-none focus:border-[#f97316] focus:ring-[3px] focus:ring-[#f97316]/20"
                placeholder='{"version": "6.0", "mode": "A|B", "project": {...}, "scene": {...}, "boards": [...]}'
              />
              {uploadError && (
                <div className="text-sm text-[#b91c1c] bg-[#fee2e2] border border-[#fca5a5] rounded-xl px-3 py-2 font-semibold">
                  {uploadError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-[var(--tb-border)]">
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

function OverviewCard({ data, onCopy }) {
  const sc = data.scene || {};
  const ov = sc.overview || {};
  const cl = data.consistency_lock;
  const bf = data.bridge_frame;
  const gw = data.grok_workflow;

  return (
    <div className="space-y-4">
      {/* Scene */}
      <div className="rounded-2xl overflow-hidden border border-[var(--tb-border)] bg-[var(--tb-surface)]">
        <div className="px-4 py-3 border-b border-[var(--tb-border)] bg-[#f97316]/10 flex items-center gap-2">
          <Clapperboard className="w-4 h-4 text-[#f97316]" />
          <span className="text-base font-bold text-[var(--tb-text)]">{sc.title || '씬'}</span>
        </div>
        {sc.logline && (
          <div className="px-4 py-3 border-b border-[var(--tb-border)]">
            <p className="text-sm italic text-[var(--tb-text)] leading-relaxed">"{sc.logline}"</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 p-4 text-[13px]">
          {ov.location && <Stat k="장소" v={ov.location} />}
          {ov.time && <Stat k="시간" v={ov.time} />}
          {ov.lighting && <Stat k="라이팅" v={ov.lighting} />}
          {ov.mood && <Stat k="무드" v={ov.mood} />}
          {ov.sound_theme && <Stat k="사운드" v={ov.sound_theme} />}
          {ov.dialogue && <Stat k="대사" v={ov.dialogue} />}
          {ov.transition_style && <Stat k="트랜지션" v={ov.transition_style} />}
        </div>
      </div>

      {/* Consistency lock (Mode B) */}
      {cl && (
        <div className="rounded-2xl overflow-hidden border border-[var(--tb-border)] bg-[var(--tb-surface)]">
          <div className="px-4 py-3 border-b border-[var(--tb-border)] bg-[#fbbf24]/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#fbbf24]" />
              <span className="text-sm font-bold text-[var(--tb-text)] uppercase tracking-wider">Consistency Lock</span>
              {cl.bgm_policy && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--tb-surface-2)] border border-[#fbbf24]/30 text-[#fbbf24]">
                  {cl.bgm_policy}
                </span>
              )}
            </div>
            <button
              onClick={() => onCopy([cl.subject_en, cl.setting_en, cl.lighting_en].filter(Boolean).join('\n'))}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] border border-[var(--tb-border)] text-[11px] font-bold text-[var(--tb-text-muted)] tb-press-soft"
            >
              <Copy className="w-3 h-3" />
              락 3종 복사
            </button>
          </div>
          <div className="p-4 space-y-2 text-[13px] font-mono">
            {cl.subject_en && <LockRow k="subject_en" v={cl.subject_en} onCopy={() => onCopy(cl.subject_en)} />}
            {cl.setting_en && <LockRow k="setting_en" v={cl.setting_en} onCopy={() => onCopy(cl.setting_en)} />}
            {cl.lighting_en && <LockRow k="lighting_en" v={cl.lighting_en} onCopy={() => onCopy(cl.lighting_en)} />}
          </div>
        </div>
      )}

      {/* Bridge frame (Mode B) */}
      {bf && (bf.summary || bf.image_prompt_en) && (
        <div className="rounded-2xl overflow-hidden border border-[var(--tb-border)] bg-[var(--tb-surface)]">
          <div className="px-4 py-3 border-b border-[var(--tb-border)] bg-[#22d3ee]/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#22d3ee]" />
              <span className="text-sm font-bold text-[var(--tb-text)] uppercase tracking-wider">Bridge Frame</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--tb-surface-2)] border border-[#22d3ee]/30 text-[#22d3ee]">
                Board {bf.from_board}-P{bf.from_panel} → Board {bf.to_board}-P{bf.to_panel}
              </span>
            </div>
            {bf.image_prompt_en && (
              <button
                onClick={() => onCopy(bf.image_prompt_en)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] border border-[var(--tb-border)] text-[11px] font-bold text-[var(--tb-text-muted)] tb-press-soft"
              >
                <Copy className="w-3 h-3" />
                복사
              </button>
            )}
          </div>
          <div className="p-4 space-y-2">
            {bf.summary && <p className="text-sm text-[var(--tb-text)]">{bf.summary}</p>}
            {bf.image_prompt_en && (
              <div className="text-[13px] font-mono text-[var(--tb-text)] bg-[var(--tb-surface-2)] border border-[var(--tb-border)] rounded-xl p-2.5">
                {bf.image_prompt_en}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grok workflow (Mode B) */}
      {gw && Array.isArray(gw.steps) && gw.steps.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-[var(--tb-border)] bg-[var(--tb-surface)]">
          <div className="px-4 py-3 border-b border-[var(--tb-border)] bg-[#0f172a] text-white flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-[#fbbf24]" />
            <span className="text-sm font-bold uppercase tracking-wider">Grok 체이닝 워크플로우</span>
          </div>
          <ol className="p-4 space-y-3">
            {gw.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0f172a] text-white text-[12px] font-black flex items-center justify-center">
                  {s.step || i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  {s.title && <div className="text-sm font-bold text-[var(--tb-text)]">{s.title}</div>}
                  {s.description && <p className="text-[12.5px] text-[var(--tb-text-muted)] leading-relaxed mt-0.5">{s.description}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function BoardView({ board, boardIndex, data, onCopy, onUpdateBoard, onUpdatePanel }) {
  const dot = BOARD_DOT[board.label] || '#94a3b8';
  const pacing = board.panels.map(p => p.duration_seconds).join('-');
  const pacingTotal = board.panels.reduce((acc, p) => acc + (p.duration_seconds || 0), 0);
  const pacingValid = pacingTotal === (board.duration_seconds || 10);

  const copyMaster = () => {
    try {
      const prompt = serializeBoardToPrompt(board, data);
      onCopy(prompt);
    } catch (e) {
      onCopy('');
    }
  };

  return (
    <div className="space-y-5">
      {/* Master prompt CTA */}
      <div
        className="rounded-2xl border p-4 flex items-center justify-between gap-3 flex-wrap"
        style={{ background: `${dot}10`, borderColor: `${dot}55` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <ScrollText className="w-4 h-4 flex-shrink-0" style={{ color: dot }} />
          <div className="min-w-0">
            <div className="text-sm font-bold text-[var(--tb-text)]">
              Board {board.label} 마스터 프롬프트
              {board.title_suffix && <span className="ml-1.5 text-[var(--tb-text-muted)] font-medium">· {board.title_suffix}</span>}
            </div>
            <div className="text-[12px] text-[var(--tb-text-muted)] leading-snug">
              헤더 / 씬 정보 / 메인 프레임 / 6패널(3×2 grid) / 라벨 / 무드보드까지 한 덩어리로 묶은 이미지 생성용 프롬프트
            </div>
          </div>
        </div>
        <button
          onClick={copyMaster}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full tb-pill-primary text-sm font-bold transition flex-shrink-0"
        >
          <Copy className="w-3.5 h-3.5" />
          Board {board.label} 프롬프트 복사
        </button>
      </div>

      {/* Pacing strip */}
      <div
        className="rounded-2xl border px-4 py-3 flex items-center gap-3 flex-wrap"
        style={{ background: `${dot}06`, borderColor: `${dot}33` }}
      >
        <Clock className="w-4 h-4 flex-shrink-0" style={{ color: dot }} />
        <span className="text-[11px] font-black uppercase tracking-wider text-[var(--tb-text-muted)]">페이싱</span>
        <span className="text-base font-mono font-bold text-[var(--tb-text)]">{pacing}</span>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${pacingValid ? 'bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[var(--tb-text)]' : 'bg-[#fee2e2] border border-[#fca5a5] text-[#b91c1c]'}`}>
          {pacingTotal}초 / {board.duration_seconds || 10}초{!pacingValid && ' · 합계 불일치'}
        </span>
      </div>

      {/* Main frame */}
      <div className="rounded-2xl overflow-hidden border border-[var(--tb-border)] bg-[var(--tb-surface)] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="px-4 py-3 border-b border-[var(--tb-border)] flex items-center justify-between gap-3" style={{ background: `${dot}10` }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[12px] font-black px-2 py-0.5 rounded-full" style={{ background: `${dot}25`, color: dot }}>
              MAIN FRAME
            </span>
            <span className="text-base font-bold text-[var(--tb-text)] truncate">
              Board {board.label} {board.title_suffix ? `· ${board.title_suffix}` : ''}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[var(--tb-text)] flex-shrink-0">
              {board.duration_seconds}초
            </span>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-[#f97316] flex-shrink-0" />
                <span className="text-[11px] uppercase tracking-wider text-[var(--tb-text-muted)] font-bold">메인 프레임 프롬프트 (50–80 words, EN)</span>
              </div>
              <button
                onClick={() => onCopy(board.main_frame?.prompt_en || '')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] border border-[var(--tb-border)] text-[11px] font-bold text-[var(--tb-text-muted)] tb-press-soft flex-shrink-0"
              >
                <Copy className="w-3 h-3" />
                복사
              </button>
            </div>
            <textarea
              value={board.main_frame?.prompt_en || ''}
              onChange={(e) => onUpdateBoard({ main_frame: { ...board.main_frame, prompt_en: e.target.value } })}
              rows={6}
              className="w-full min-h-[140px] resize-y bg-[var(--tb-surface-2)] border border-[var(--tb-border)] rounded-xl p-2.5 text-[13px] leading-relaxed font-mono text-[var(--tb-text)] focus:outline-none focus:border-[#f97316] focus:ring-[3px] focus:ring-[#f97316]/20"
            />
          </div>

          {(board.production_notes?.length > 0 || board.moodboard_keywords?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {board.production_notes?.length > 0 && (
                <div className="bg-[var(--tb-surface-2)] border border-[var(--tb-border)] rounded-xl p-3">
                  <div className="text-[10px] font-black text-[var(--tb-text-muted)] uppercase tracking-wider mb-1.5">PRODUCTION NOTES</div>
                  <ul className="space-y-1 text-[12.5px] text-[var(--tb-text)] list-disc pl-4">
                    {board.production_notes.map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                </div>
              )}
              {board.moodboard_keywords?.length > 0 && (
                <div className="bg-[#fbbf24]/10 border border-[#fbbf24]/30 rounded-xl p-3">
                  <div className="text-[10px] font-black text-[#fbbf24] uppercase tracking-wider mb-1.5">MOODBOARD</div>
                  <div className="flex flex-wrap gap-1.5">
                    {board.moodboard_keywords.map((k, i) => (
                      <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--tb-surface-2)] border border-[#fbbf24]/30 text-[#fbbf24] font-bold">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Panels */}
      {board.panels.map((panel, panelIdx) => (
        <PanelCard
          key={`${board.label}-${panel.number}`}
          panel={panel}
          boardDot={dot}
          onCopy={onCopy}
          onUpdate={(patch) => onUpdatePanel(panelIdx, patch)}
        />
      ))}
    </div>
  );
}

function PanelCard({ panel, boardDot, onCopy, onUpdate }) {
  const labels = panel.labels || {};
  const fnLabel = panel.function ? (FUNCTION_LABEL[panel.function] || panel.function) : '';

  return (
    <div className="rounded-2xl overflow-hidden border border-[var(--tb-border)] bg-[var(--tb-surface)] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div
        className="px-4 py-3 border-b border-[var(--tb-border)] flex items-center justify-between gap-3 flex-wrap"
        style={{ background: `${boardDot}08` }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[12px] font-black px-2 py-0.5 rounded-full" style={{ background: `${boardDot}25`, color: boardDot }}>
            P{String(panel.number).padStart(2, '0')}
          </span>
          {panel.timecode && (
            <span className="text-[12px] font-mono font-bold text-[var(--tb-text)]">{panel.timecode}</span>
          )}
          {panel.duration_seconds > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[var(--tb-text)]">
              <Clock className="w-3 h-3" />
              {panel.duration_seconds}초
            </span>
          )}
          {fnLabel && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[var(--tb-text)]">
              {fnLabel}
            </span>
          )}
          {panel.is_bridge && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[var(--tb-text-muted)]">
              BRIDGE
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Image prompt */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <ImageIcon className="w-3.5 h-3.5 text-[#f97316] flex-shrink-0" />
              <span className="text-[11px] uppercase tracking-wider text-[var(--tb-text-muted)] font-bold">이미지 프롬프트 (15–30 words, EN)</span>
            </div>
            <button
              onClick={() => onCopy(panel.image_prompt_en)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] border border-[var(--tb-border)] text-[11px] font-bold text-[var(--tb-text-muted)] tb-press-soft flex-shrink-0"
            >
              <Copy className="w-3 h-3" />
              복사
            </button>
          </div>
          <textarea
            value={panel.image_prompt_en}
            onChange={(e) => onUpdate({ image_prompt_en: e.target.value })}
            rows={3}
            className="w-full min-h-[80px] resize-y bg-[var(--tb-surface-2)] border border-[var(--tb-border)] rounded-xl p-2.5 text-[13px] leading-relaxed font-mono text-[var(--tb-text)] focus:outline-none focus:border-[#f97316] focus:ring-[3px] focus:ring-[#f97316]/20"
          />
        </div>

        {/* 4 Labels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <LabelField
            icon={Sparkles}
            label="ACTION / VISUAL"
            value={labels.action_visual}
            onChange={(v) => onUpdate({ labels: { ...labels, action_visual: v } })}
            onCopy={() => onCopy(labels.action_visual || '')}
          />
          <LabelField
            icon={Camera}
            label="CAMERA / MOVEMENT"
            value={labels.camera_movement}
            onChange={(v) => onUpdate({ labels: { ...labels, camera_movement: v } })}
            onCopy={() => onCopy(labels.camera_movement || '')}
          />
          <LabelField
            icon={MessageSquare}
            label="SOUND / DIALOGUE (music & SFX)"
            value={labels.sound_dialogue}
            onChange={(v) => onUpdate({ labels: { ...labels, sound_dialogue: v } })}
            onCopy={() => onCopy(labels.sound_dialogue || '')}
          />
          <LabelField
            icon={Layers}
            label="TRANSITION"
            value={labels.transition}
            onChange={(v) => onUpdate({ labels: { ...labels, transition: v } })}
            onCopy={() => onCopy(labels.transition || '')}
          />
        </div>
      </div>
    </div>
  );
}

function LabelField({ icon: Icon, label, value, onChange, onCopy }) {
  return (
    <div className="bg-[var(--tb-surface-2)] border border-[var(--tb-border)] rounded-xl p-2.5 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className="w-3 h-3 text-[var(--tb-text-muted)] flex-shrink-0" />
          <span className="text-[10px] font-black text-[var(--tb-text-muted)] uppercase tracking-wider truncate">{label}</span>
        </div>
        <button
          onClick={onCopy}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] border border-[var(--tb-border)] text-[10px] font-bold text-[var(--tb-text-muted)] tb-press-soft flex-shrink-0"
        >
          <Copy className="w-2.5 h-2.5" />
        </button>
      </div>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full min-h-[40px] resize-y bg-[var(--tb-surface-2)] border border-[var(--tb-border)] rounded-lg p-2 text-[12px] leading-snug text-[var(--tb-text)] focus:outline-none focus:border-[#f97316] focus:ring-[2px] focus:ring-[#f97316]/20"
      />
    </div>
  );
}

function LockRow({ k, v, onCopy }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[10px] font-black text-[var(--tb-text-muted)] uppercase tracking-wider w-20 pt-0.5 flex-shrink-0">{k}</span>
      <span className="flex-1 text-[var(--tb-text)] break-words">{v}</span>
      <button
        onClick={onCopy}
        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] border border-[var(--tb-border)] text-[10px] font-bold text-[var(--tb-text-muted)] tb-press-soft flex-shrink-0"
      >
        <Copy className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}

function Stat({ k, v }) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className="text-[10px] font-black text-[var(--tb-text-muted)] uppercase tracking-wider w-20 pt-0.5 flex-shrink-0">{k}</span>
      <span className="flex-1 text-[var(--tb-text)] break-words">{v}</span>
    </div>
  );
}
