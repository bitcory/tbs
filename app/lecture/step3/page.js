'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Upload, Copy, ExternalLink, Gem, X,
  Clapperboard, Image as ImageIcon, Film, MessageSquare, Music, Scissors, Droplets, Wrench, Trash2, Languages,
} from 'lucide-react';
import dynamic from 'next/dynamic';
const FrameExtractor = dynamic(() => import('@/app/components/FrameExtractor'), { ssr: false });
const WatermarkRemover = dynamic(() => import('@/app/components/WatermarkRemover'), { ssr: false });

const CACHE_KEY = 'toolb_step3_story';

const ACTS = ['기', '승', '전', '결'];

const ACT_COLORS = [
  { dot: '#22c55e', label: '기' },
  { dot: '#3b82f6', label: '승' },
  { dot: '#f59e0b', label: '전' },
  { dot: '#a855f7', label: '결' },
];

const ACT_MAP = {
  '기': '기', 'introduction': '기', 'intro': '기', 'ki': '기',
  '승': '승', 'rising_action': '승', 'development': '승', 'seung': '승',
  '전': '전', 'climax': '전', 'turn': '전', 'jeon': '전',
  '결': '결', 'conclusion': '결', 'resolution': '결', 'falling_action': '결', 'gyeol': '결',
};

const normalizeAct = (v) => {
  const key = String(v || '').toLowerCase();
  return ACT_MAP[key] || ACT_MAP[v] || '기';
};

function parseStoryboard(raw) {
  let cleaned = raw.trim()
    .replace(/^```(?:json|JSON)?\s*\n?/gm, '')
    .replace(/\n?```\s*$/gm, '')
    .trim();
  if (!cleaned) throw new Error('JSON 내용을 입력해주세요.');

  let json;
  try { json = JSON.parse(cleaned); }
  catch (e) { throw new Error(`JSON 파싱 오류: ${e.message}`); }

  if (json.storyboard && typeof json.storyboard === 'object') json = json.storyboard;
  if (!Array.isArray(json.scenes)) throw new Error('"scenes" 배열이 필요합니다.');

  const meta = json.meta || {};

  const scenes = json.scenes.map((s, i) => {
    if (!s.id) throw new Error(`씬 ${i + 1}: "id" 필드가 누락되었습니다.`);
    return {
      id: s.id,
      scene_number: s.scene_number || (i + 1),
      act: normalizeAct(s.act),
      title: s.title || '',
      description: s.description || '',
      emotion: s.emotion || '',
      imageUpload: s.imageUpload || '',
      prompts: {
        image: {
          id: s.prompts?.image?.id || `img_${String(i + 1).padStart(2, '0')}`,
          tool: s.prompts?.image?.tool || 'image_gen',
          prompt: s.prompts?.image?.prompt || '',
        },
        video: {
          id: s.prompts?.video?.id || `vid_${String(i + 1).padStart(2, '0')}`,
          tool: s.prompts?.video?.tool || 'video_gen',
          duration: s.prompts?.video?.duration || 6,
          prompt: s.prompts?.video?.prompt || '',
        },
      },
      dialogue: s.dialogue || '',
    };
  });

  return {
    id: json.id || `SB-${Date.now()}`,
    title: json.title || '스토리 영상',
    created_at: json.created_at,
    version: json.version,
    meta: {
      aspect_ratio: meta.aspect_ratio || '16:9',
      total_scenes: scenes.length,
      genre: meta.genre || '',
      subject_type: meta.subject_type || '',
      mood: meta.mood || '',
    },
    scenes,
  };
}

export default function Step3Page() {
  const [storyboard, setStoryboard] = useState(null);
  const [activeAct, setActiveAct] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [toast, setToast] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [toolView, setToolView] = useState(null);
  const [pendingScrollId, setPendingScrollId] = useState(null);
  const sceneRefs = useRef({});
  const fileInputRefs = useRef({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.scenes)) setStoryboard(parsed);
      }
    } catch (e) { }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (storyboard) localStorage.setItem(CACHE_KEY, JSON.stringify(storyboard));
      else localStorage.removeItem(CACHE_KEY);
    } catch (e) { }
  }, [storyboard, hydrated]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const copyText = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => showToast('복사됨!')).catch(() => showToast('복사 실패'));
  };

  const updateScene = (sceneId, patch) => {
    setStoryboard(prev => prev && {
      ...prev,
      scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, ...patch } : s),
    });
  };

  const updateImagePrompt = (sceneId, v) => {
    setStoryboard(prev => prev && {
      ...prev,
      scenes: prev.scenes.map(s =>
        s.id === sceneId ? { ...s, prompts: { ...s.prompts, image: { ...s.prompts.image, prompt: v } } } : s
      ),
    });
  };

  const updateVideoPrompt = (sceneId, v) => {
    setStoryboard(prev => prev && {
      ...prev,
      scenes: prev.scenes.map(s =>
        s.id === sceneId ? { ...s, prompts: { ...s.prompts, video: { ...s.prompts.video, prompt: v } } } : s
      ),
    });
  };

  const updateDialogue = (sceneId, v) => updateScene(sceneId, { dialogue: v });

  const handleImageFile = (sceneId, file) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드 가능합니다.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('5MB 이하의 이미지만 업로드 가능합니다.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      updateScene(sceneId, { imageUpload: String(e.target.result) });
    };
    reader.readAsDataURL(file);
  };

  const clearImage = (sceneId) => updateScene(sceneId, { imageUpload: '' });

  const loadJson = () => {
    setUploadError('');
    try {
      const parsed = parseStoryboard(jsonInput);
      setStoryboard(parsed);
      setActiveAct(0);
      setUploadOpen(false);
      setJsonInput('');
      showToast('스토리 영상 로드 완료!');
    } catch (e) {
      setUploadError(e.message || 'JSON 파싱 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    if (!pendingScrollId) return;
    const el = sceneRefs.current[pendingScrollId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-emerald-500/60');
      setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-500/60'), 2000);
    }
    setPendingScrollId(null);
  }, [activeAct, pendingScrollId]);

  const scenesByAct = ACTS.map(a => (storyboard?.scenes || []).filter(s => s.act === a));
  const allImagePrompts = storyboard ? storyboard.scenes.map(s => s.prompts.image.prompt).filter(Boolean).join('\n\n') : '';
  const allVideoPrompts = storyboard ? storyboard.scenes.map(s => s.prompts.video.prompt).filter(Boolean).join('\n\n') : '';
  const allDialogues = storyboard ? storyboard.scenes.map(s => s.dialogue).filter(Boolean).join('\n\n') : '';

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
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 12px;
        }
        @media (max-width: 640px) {
          .tb-hero-row {
            display: block;
          }
        }
        .tb-hero::before {
          content: '';
          position: absolute; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.22'/%3E%3C/svg%3E");
          mix-blend-mode: overlay;
          pointer-events: none;
        }
        .tb-hero::after {
          content: '';
          position: absolute; left: -10%; right: -10%; bottom: -1px;
          height: 24px;
          background: #f8fafc;
          border-radius: 50% 50% 0 0 / 100% 100% 0 0;
        }
        .tb-hero-glow {
          position: absolute; top: -40px; right: -60px; width: 260px; height: 260px;
          background: radial-gradient(circle, rgba(255,255,255,0.22), transparent 60%);
          filter: blur(30px);
          pointer-events: none;
        }
        .tb-hero-eyebrow {
          display: inline-block;
          font-size: 10px; font-weight: 800;
          letter-spacing: 0.26em; text-transform: uppercase;
          padding: 4px 11px; border-radius: 100px;
          background: rgba(255,255,255,0.16);
          border: 1px solid rgba(255,255,255,0.35);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          grid-column: 1;
          justify-self: start;
        }
        .tb-hero-title {
          font-size: clamp(20px, 4.5vw, 26px);
          font-weight: 900;
          line-height: 1.2;
          letter-spacing: -0.01em;
          margin: 0;
          grid-column: 2;
          justify-self: center;
        }
        @media (max-width: 640px) {
          .tb-hero-eyebrow {
            margin-bottom: 8px;
          }
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
          <span className="tb-hero-eyebrow">TB STUDY · STEP 3</span>
          <h1 className="tb-hero-title">스토리 영상 만들기</h1>
        </div>
      </section>

      {/* Glass bar */}
      <div className="tb-glass-bar">
        <Link href="/?c=up&s=step3" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full tb-pill-ghost text-xs sm:text-sm font-bold transition">
          <ArrowLeft className="w-3.5 h-3.5" />
          홈
        </Link>
        <span className="text-[11px] font-bold tracking-[0.18em] text-[#00996D] uppercase hidden sm:inline">TOOLB LAB</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => { setUploadOpen(true); setUploadError(''); setJsonInput(''); }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full tb-pill-primary text-xs sm:text-sm font-bold transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">JSON </span>업로드
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:flex-1 md:min-h-0 w-full px-4 pt-6 pb-4 gap-4 2xl:px-6">
        {/* Sidebar */}
        <aside className="w-full md:w-[300px] flex-shrink-0 bg-white border border-[#e2e8f0] rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.06)] md:overflow-y-auto">
          <div className="p-4 border-b border-[#e2e8f0]">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-[#64748b]">
              <Clapperboard className="w-3.5 h-3.5" />
              스토리 영상 정보
            </div>
            {storyboard ? (
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-sm text-[#64748b] font-medium w-14 pt-0.5">제목</span>
                  <span className="text-sm text-[#0f172a] font-bold flex-1 break-all">{storyboard.title}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm text-[#64748b] font-medium w-14 pt-0.5">씬 수</span>
                  <span className="text-sm text-[#0f172a] font-bold flex-1">{storyboard.meta.total_scenes}개</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm text-[#64748b] font-medium w-14 pt-0.5">비율</span>
                  <span className="text-sm text-[#0f172a] font-bold flex-1">{storyboard.meta.aspect_ratio}</span>
                </div>
                {storyboard.meta.genre && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[#64748b] font-medium w-14 pt-0.5">장르</span>
                    <span className="text-sm text-[#0f172a] font-bold flex-1">{storyboard.meta.genre}</span>
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
              href="#"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full tb-pill-primary text-sm font-bold transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              3단계 젬 가이드 열기
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
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M11.04 19.32Q12 18.72 12.84 17.76Q13.68 16.8 14.04 15.6H11.04V19.32ZM9 19.68V15.6H5.58Q6.18 17.04 7.32 18.06Q8.46 19.08 9 19.68ZM5.1 14.4H9V10.2H4.62Q4.44 10.8 4.38 11.28Q4.32 11.76 4.32 12.24Q4.32 13.08 4.5 13.68Q4.68 14.28 5.1 14.4ZM10.2 14.4H13.8V10.2H10.2V14.4ZM14.4 9H19.08Q18.72 8.04 18.12 7.2Q17.52 6.36 16.74 5.7Q15.72 6.48 14.88 7.08Q14.04 7.68 14.4 9ZM9 9H13.44Q13.08 7.68 12.36 6.6Q11.64 5.52 10.68 4.68Q9.72 5.52 9 6.6Q8.28 7.68 9 9ZM4.92 9H9.36Q9 8.04 8.7 7.2Q8.4 6.36 7.98 5.64Q7.08 6.24 6.36 7.08Q5.64 7.92 4.92 9ZM12 21.6Q10.68 21.6 9.42 21.12Q8.16 20.64 7.14 19.86Q6.12 19.08 5.34 18.06Q4.56 17.04 4.08 15.78Q3.6 14.52 3.6 13.2Q3.6 10.68 5.04 8.64Q6.48 6.6 8.76 5.52Q8.16 4.56 7.68 3.48Q7.2 2.4 6.96 1.2H8.16Q8.4 2.16 8.76 3.06Q9.12 3.96 9.6 4.68Q10.32 4.2 11.16 3.96Q12 3.72 12 3.72Q12 3.72 12.84 3.96Q13.68 4.2 14.4 4.68Q14.88 3.96 15.24 3.06Q15.6 2.16 15.84 1.2H17.04Q16.8 2.4 16.32 3.48Q15.84 4.56 15.24 5.52Q17.52 6.6 18.96 8.64Q20.4 10.68 20.4 13.2Q20.4 14.52 19.92 15.78Q19.44 17.04 18.66 18.06Q17.88 19.08 16.86 19.86Q15.84 20.64 14.58 21.12Q13.32 21.6 12 21.6Z" />
              </svg>
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
          ) : !storyboard ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
              <div className="w-20 h-20 mb-5 rounded-full flex items-center justify-center bg-[#ecfdf5] border border-[#e2e8f0]">
                <Clapperboard className="w-10 h-10 text-[#00996D]" />
              </div>
              <h3 className="text-lg font-bold text-[#0f172a] mb-2">스토리보드가 없습니다</h3>
              <p className="text-sm text-[#64748b] mb-5 leading-relaxed">
                JSON을 업로드하여 기/승/전/결<br />
                장면과 프롬프트를 확인하세요.
              </p>
              <button
                onClick={() => { setUploadOpen(true); setUploadError(''); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full tb-pill-primary text-sm font-bold transition"
              >
                <Upload className="w-3.5 h-3.5" />
                스토리보드 JSON 업로드
              </button>
            </div>
          ) : (
            <>
              {/* Top bulk-copy bar */}
              <div className="flex-shrink-0 px-4 py-3 border-b border-[#e2e8f0] bg-[#ecfdf5]/40 rounded-t-2xl flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <Clapperboard className="w-4 h-4 text-[#00996D] flex-shrink-0" />
                  <h2 className="text-base font-black text-[#0f172a] uppercase truncate">{storyboard.title}</h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#e2e8f0] text-[#64748b] flex-shrink-0">
                    {storyboard.meta.total_scenes}씬
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#e2e8f0] text-[#64748b] flex-shrink-0">
                    {storyboard.meta.aspect_ratio}
                  </span>
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

              {/* Act tab bar */}
              <div className="flex-shrink-0 flex gap-1.5 p-3 border-b border-[#e2e8f0] bg-white overflow-x-auto">
                {ACTS.map((act, i) => {
                  const tc = ACT_COLORS[i];
                  const count = scenesByAct[i].length;
                  const isActive = i === activeAct;
                  return (
                    <button
                      key={act}
                      onClick={() => setActiveAct(i)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-bold whitespace-nowrap rounded-full transition ${isActive
                        ? 'tb-pill-primary'
                        : 'text-[#64748b] bg-[#f1f5f9] hover:bg-[#e2e8f0] tb-press-soft'
                        }`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: isActive ? '#fff' : tc.dot, opacity: isActive ? 1 : 0.6 }}
                      />
                      {act}
                      {count > 0 && (
                        <span
                          className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                          style={isActive ? { background: 'rgba(255,255,255,0.25)', color: '#fff' } : { background: `${tc.dot}25`, color: tc.dot }}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Scene cards */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {scenesByAct[activeAct].length === 0 ? (
                  <div className="text-center py-10 text-[#64748b] text-sm">
                    이 구간에 해당하는 씬이 없습니다.
                  </div>
                ) : (
                  scenesByAct[activeAct].map((scene) => {
                    const tc = ACT_COLORS[activeAct];
                    return (
                      <div
                        key={scene.id}
                        ref={(el) => { sceneRefs.current[scene.id] = el; }}
                        className="rounded-2xl overflow-hidden border border-[#e2e8f0] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all"
                      >
                        {/* Scene header */}
                        <div
                          className="px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between gap-3"
                          style={{ background: `${tc.dot}10` }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="text-[12px] font-black px-2 py-0.5 rounded-full"
                              style={{ background: `${tc.dot}25`, color: tc.dot }}
                            >
                              #{String(scene.scene_number).padStart(2, '0')}
                            </span>
                            <span className="text-base font-bold text-[#0f172a] truncate">{scene.title}</span>
                          </div>
                          {scene.emotion && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#e2e8f0] text-[#334155] flex-shrink-0">
                              감정: {scene.emotion}
                            </span>
                          )}
                        </div>

                        {scene.description && (
                          <div className="px-4 py-3 border-b border-[#e2e8f0]">
                            <p className="text-sm text-[#334155] leading-relaxed">{scene.description}</p>
                          </div>
                        )}

                        {/* 3-column content */}
                        <div className="grid grid-cols-1 md:grid-cols-[minmax(400px,520px)_minmax(0,1fr)_minmax(220px,320px)]">
                          {/* LEFT: image upload */}
                          <div className="p-4 border-b md:border-b-0 md:border-r border-[#e2e8f0]">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <ImageIcon className="w-3.5 h-3.5 text-[#00996D]" />
                                <span className="text-[11px] uppercase tracking-wider text-[#64748b] font-bold">이미지</span>
                              </div>
                              {scene.imageUpload && (
                                <button
                                  onClick={() => clearImage(scene.id)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white hover:bg-[#fee2e2] border border-[#e2e8f0] text-[11px] font-bold text-[#b91c1c] tb-press-soft"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  제거
                                </button>
                              )}
                            </div>
                            {scene.imageUpload ? (
                              <div
                                className="relative w-full rounded-xl overflow-hidden border border-[#e2e8f0] cursor-pointer group bg-[#0f172a] flex items-center justify-center"
                                onClick={() => fileInputRefs.current[scene.id]?.click()}
                                style={{ maxHeight: '70vh' }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={scene.imageUpload}
                                  alt={`scene ${scene.scene_number}`}
                                  className="w-full h-auto max-h-[70vh] object-contain block"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center pointer-events-none">
                                  <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                    교체
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="tb-upload-slot aspect-video rounded-xl flex flex-col items-center justify-center cursor-pointer text-[#64748b]"
                                onClick={() => fileInputRefs.current[scene.id]?.click()}
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
                                onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.remove('dragover');
                                  const file = e.dataTransfer.files?.[0];
                                  if (file) handleImageFile(scene.id, file);
                                }}
                              >
                                <Upload className="w-6 h-6 mb-1.5" />
                                <span className="text-xs font-bold">드래그/클릭 업로드</span>
                                <span className="text-[10px] mt-0.5">PNG · JPG · WEBP (≤5MB)</span>
                              </div>
                            )}
                            <input
                              ref={(el) => { fileInputRefs.current[scene.id] = el; }}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageFile(scene.id, file);
                                e.target.value = '';
                              }}
                            />
                          </div>

                          {/* MIDDLE: image + video prompts */}
                          <div className="p-4 border-b md:border-b-0 md:border-r border-[#e2e8f0] space-y-3 min-w-0">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <ImageIcon className="w-3.5 h-3.5 text-[#00996D] flex-shrink-0" />
                                  <span className="text-[11px] uppercase tracking-wider text-[#64748b] font-bold">이미지 프롬프트</span>
                                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#ecfdf5] text-[#00996D] font-bold">
                                    {scene.prompts.image.tool}
                                  </span>
                                </div>
                                <button
                                  onClick={() => copyText(scene.prompts.image.prompt)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#f1f5f9] border border-[#e2e8f0] text-[11px] font-bold text-[#64748b] tb-press-soft flex-shrink-0"
                                >
                                  <Copy className="w-3 h-3" />
                                  복사
                                </button>
                              </div>
                              <textarea
                                value={scene.prompts.image.prompt}
                                onChange={(e) => updateImagePrompt(scene.id, e.target.value)}
                                rows={4}
                                placeholder="이미지 프롬프트..."
                                className="w-full min-h-[90px] resize-y bg-white border border-[#e2e8f0] rounded-xl p-2.5 text-[13px] leading-relaxed font-mono text-[#0f172a] focus:outline-none focus:border-[#00B380] focus:ring-[3px] focus:ring-[#00B380]/20"
                              />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Film className="w-3.5 h-3.5 text-[#f43f5e] flex-shrink-0" />
                                  <span className="text-[11px] uppercase tracking-wider text-[#64748b] font-bold">영상 프롬프트</span>
                                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#fee2e2] text-[#b91c1c] font-bold">
                                    {scene.prompts.video.tool} · {scene.prompts.video.duration}s
                                  </span>
                                </div>
                                <button
                                  onClick={() => copyText(scene.prompts.video.prompt)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#f1f5f9] border border-[#e2e8f0] text-[11px] font-bold text-[#64748b] tb-press-soft flex-shrink-0"
                                >
                                  <Copy className="w-3 h-3" />
                                  복사
                                </button>
                              </div>
                              <textarea
                                value={scene.prompts.video.prompt}
                                onChange={(e) => updateVideoPrompt(scene.id, e.target.value)}
                                rows={4}
                                placeholder="영상 프롬프트..."
                                className="w-full min-h-[90px] resize-y bg-white border border-[#e2e8f0] rounded-xl p-2.5 text-[13px] leading-relaxed font-mono text-[#0f172a] focus:outline-none focus:border-[#00B380] focus:ring-[3px] focus:ring-[#00B380]/20"
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
                                onClick={() => copyText(scene.dialogue)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#f1f5f9] border border-[#e2e8f0] text-[11px] font-bold text-[#64748b] tb-press-soft flex-shrink-0"
                              >
                                <Copy className="w-3 h-3" />
                                복사
                              </button>
                            </div>
                            <textarea
                              value={scene.dialogue}
                              onChange={(e) => updateDialogue(scene.id, e.target.value)}
                              rows={9}
                              placeholder="등장인물의 대사나 내레이션..."
                              className="w-full min-h-[220px] resize-y bg-white border border-[#e2e8f0] rounded-xl p-2.5 text-[13px] leading-relaxed text-[#0f172a] focus:outline-none focus:border-[#6d28d9] focus:ring-[3px] focus:ring-[#6d28d9]/20"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
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
              <span className="text-base font-bold text-[#0f172a] uppercase tracking-wider">스토리보드 JSON 업로드</span>
              <button
                onClick={() => setUploadOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569] tb-press-soft"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
              <p className="text-sm text-[#64748b] leading-relaxed">
                스토리보드 JSON을 붙여넣으세요. <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px]">scenes</code> 배열이 필요하며, 각 씬은
                <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px]">act</code>(기/승/전/결),
                <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px]">prompts.image</code>,
                <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px]">prompts.video</code>,
                <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px]">dialogue</code> 필드를 가질 수 있습니다.
              </p>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full h-[260px] resize-y font-mono text-[13px] leading-relaxed p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:outline-none focus:border-[#00B380] focus:ring-[3px] focus:ring-[#00B380]/20"
                placeholder='{"title": "...", "meta": {...}, "scenes": [{"id":"s01","act":"기",...,"dialogue":"..."}]}'
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
        <div className="fixed bottom-5 right-5 z-[400] px-4 py-2.5 rounded-full text-sm font-bold animate-fadeIn tb-pill-primary">
          {toast}
        </div>
      )}
    </div>
  );
}
