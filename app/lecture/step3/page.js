'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Upload, Copy, Clipboard, ExternalLink, Gem, X,
  Clapperboard, Image as ImageIcon, Film, Layers, Palette, List, Music, Droplets, Wrench,
} from 'lucide-react';
import dynamic from 'next/dynamic';
const FrameExtractor = dynamic(() => import('@/app/components/FrameExtractor'), { ssr: false });
const WatermarkRemover = dynamic(() => import('@/app/components/WatermarkRemover'), { ssr: false });

const CACHE_KEY = 'toolb_step3_intro';

const TYPES = ['오프닝', '타이틀', '엔드'];

const TYPE_COLORS = [
  { dot: '#a855f7', label: '오프닝' },
  { dot: '#ec4899', label: '타이틀' },
  { dot: '#f59e0b', label: '엔드' },
];

// ─── Normalization helpers ───────────────────────────────
const TYPE_MAP = {
  opening_frame: '오프닝', opening: '오프닝', '오프닝': '오프닝',
  title_card: '타이틀', title: '타이틀', '타이틀': '타이틀',
  end_card: '엔드', end: '엔드', outro: '엔드', '엔드': '엔드',
};

const SHOT_TYPE_MAP = {
  'extreme wide shot': 'extreme wide shot', 'wide shot': 'wide shot',
  'medium-wide shot': 'medium-wide shot', 'medium wide shot': 'medium-wide shot',
  'medium shot': 'medium shot', 'medium close-up': 'medium close-up',
  'close-up': 'close-up', 'closeup': 'close-up',
  'extreme close-up': 'extreme close-up', 'extreme closeup': 'extreme close-up',
  'full shot': 'full shot', 'over-the-shoulder': 'over-the-shoulder',
  'wide tracking': 'wide shot', 'extreme angle': 'extreme wide shot',
  'medium angle': 'medium shot', 'top shot': 'extreme wide shot',
  'top shot, overhead': 'extreme wide shot', 'overhead': 'extreme wide shot',
};

const ANGLE_MAP = {
  'eye level': 'eye-level', 'eye-level': 'eye-level',
  'low angle': 'low angle', 'high angle': 'high angle',
  'slightly low angle': 'slightly low angle', 'slightly high angle': 'slightly high angle',
  'dutch angle': 'dutch angle', "bird's eye": "bird's eye", "worm's eye": "worm's eye",
};

const TRANSITION_MAP = {
  'fade in from black': 'fade in from black', 'cut': 'cut',
  'dissolve': 'dissolve', 'slow dissolve': 'slow dissolve',
  'fade to white': 'fade to white', 'fade to black': 'fade to black', 'wipe': 'wipe',
};

const extractEnglish = (v) => {
  if (!v) return '';
  const m = String(v).match(/\(([^)]+)\)/);
  return m ? m[1].trim() : String(v);
};

const normalizeType = (v) => {
  const key = String(v || '').toLowerCase();
  return TYPE_MAP[key] || TYPE_MAP[v] || '오프닝';
};

const normalizeShot = (v) => {
  const eng = extractEnglish(v).toLowerCase();
  return SHOT_TYPE_MAP[eng] || eng || v || '';
};

const normalizeAngle = (v) => {
  const eng = extractEnglish(v).toLowerCase();
  return ANGLE_MAP[eng] || eng || v || '';
};

const normalizeTransition = (v) => {
  const eng = extractEnglish(v).toLowerCase();
  return TRANSITION_MAP[eng] || eng || v || '';
};

// Parse a raw JSON string into a normalized opening sequence
function parseStoryboard(raw) {
  let cleaned = raw.trim()
    .replace(/^```(?:json|JSON)?\s*\n?/gm, '')
    .replace(/\n?```\s*$/gm, '')
    .trim();
  if (!cleaned) throw new Error('JSON 내용을 입력해주세요.');

  let json;
  try { json = JSON.parse(cleaned); }
  catch (e) { throw new Error(`JSON 파싱 오류: ${e.message}`); }

  // unwrap { opening_sequence: {...} } or { storyboard: {...} }
  if (json.opening_sequence && typeof json.opening_sequence === 'object') json = json.opening_sequence;
  else if (json.storyboard && typeof json.storyboard === 'object') json = json.storyboard;

  if (!Array.isArray(json.scenes)) throw new Error('"scenes" 배열이 필요합니다.');

  const meta = json.meta || {};

  const scenes = json.scenes.map((s, i) => {
    if (!s.id) throw new Error(`씬 ${i + 1}: "id" 필드가 누락되었습니다.`);
    if (!s.prompts?.image?.prompt) throw new Error(`씬 ${s.id}: 이미지 프롬프트가 누락되었습니다.`);
    const hasVideo = !!s.prompts?.video?.prompt;
    return {
      id: s.id,
      scene_number: s.scene_number || (i + 1),
      type: normalizeType(s.type),
      title: s.title || '',
      description: s.description || '',
      emotion: s.emotion || '',
      key_visual: s.key_visual || '',
      camera: s.camera ? {
        shot_type: normalizeShot(s.camera.shot_type || ''),
        angle: normalizeAngle(s.camera.angle || ''),
        movement: extractEnglish(s.camera.movement || ''),
        lighting: extractEnglish(s.camera.lighting || ''),
        transition: normalizeTransition(s.camera.transition || ''),
      } : null,
      prompts: {
        image: {
          id: s.prompts.image.id || `img_${String(i + 1).padStart(2, '0')}`,
          tool: s.prompts.image.tool || 'image_gen',
          prompt: s.prompts.image.prompt,
        },
        video: hasVideo ? {
          id: s.prompts.video.id || `vid_${String(i + 1).padStart(2, '0')}`,
          tool: s.prompts.video.tool || 'veo3_or_grok_video',
          duration: s.prompts.video.duration || 5,
          motion_type: s.prompts.video.motion_type || '',
          prompt: s.prompts.video.prompt,
        } : null,
      },
    };
  });

  return {
    id: json.id || `OS-${Date.now()}`,
    title: json.title || '인트로영상',
    final_title: json.final_title || '',
    created_at: json.created_at,
    version: json.version,
    meta: {
      genre: meta.genre || '',
      format: meta.format || '',
      opening_type: meta.opening_type || '',
      mise_en_scene: meta.mise_en_scene || '',
      aspect_ratio: meta.aspect_ratio || '9:16',
      quality: meta.quality || '',
      total_scenes: scenes.length,
      color_palette: Array.isArray(meta.color_palette) ? meta.color_palette : [],
      mood: meta.mood || '',
    },
    scenes,
  };
}

function buildGridText(prompts) {
  const n = prompts.length;
  if (n === 0) return '';
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const header = `[GRID INSTRUCTION]
Create a ${cols}×${rows} seamless grid image (${cols} columns, ${rows} rows).
Each panel represents one scene from a story, reading left-to-right, top-to-bottom (Panel 1 = top-left → Panel ${n} = bottom-right).
Maintain perfect consistency: same character face, body, hairstyle, costume, and art style across all ${n} panels.
No visible borders, gaps, or dividing lines between panels.
Each panel flows naturally into the next like a cinematic storyboard.
Uniform lighting temperature and color grading across all panels.

[Reference image: character design and style guide]

`;
  const panels = prompts.map((p, i) => `Panel ${i + 1}: ${p}`).join('\n');
  return header + panels;
}

export default function Step3Page() {
  const [storyboard, setStoryboard] = useState(null);
  const [activeType, setActiveType] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [toast, setToast] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [toolView, setToolView] = useState(null);
  const [pendingScrollId, setPendingScrollId] = useState(null);
  const sceneRefs = useRef({});

  // Load cache
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

  // Auto-save
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

  const updateImagePrompt = (sceneId, newPrompt) => {
    setStoryboard(prev => prev && {
      ...prev,
      scenes: prev.scenes.map(s =>
        s.id === sceneId ? { ...s, prompts: { ...s.prompts, image: { ...s.prompts.image, prompt: newPrompt } } } : s
      ),
    });
  };

  const updateVideoPrompt = (sceneId, newPrompt) => {
    setStoryboard(prev => prev && {
      ...prev,
      scenes: prev.scenes.map(s =>
        s.id === sceneId ? { ...s, prompts: { ...s.prompts, video: { ...s.prompts.video, prompt: newPrompt } } } : s
      ),
    });
  };

  const loadJson = () => {
    setUploadError('');
    try {
      const parsed = parseStoryboard(jsonInput);
      setStoryboard(parsed);
      setActiveType(0);
      setUploadOpen(false);
      setJsonInput('');
      showToast('인트로영상 로드 완료!');
    } catch (e) {
      setUploadError(e.message || 'JSON 파싱 오류가 발생했습니다.');
    }
  };

  const scrollToScene = (sceneId) => {
    if (!storyboard) return;
    const scene = storyboard.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    const targetTypeIdx = TYPES.indexOf(scene.type);
    if (targetTypeIdx === -1) return;

    if (targetTypeIdx !== activeType) {
      setActiveType(targetTypeIdx);
      setPendingScrollId(sceneId);
    } else {
      const el = sceneRefs.current[sceneId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-violet-500/60');
        setTimeout(() => el.classList.remove('ring-2', 'ring-violet-500/60'), 2000);
      }
    }
  };

  // After the type switches, the new scene cards mount; scroll to the pending one.
  useEffect(() => {
    if (!pendingScrollId) return;
    const el = sceneRefs.current[pendingScrollId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-violet-500/60');
      setTimeout(() => el.classList.remove('ring-2', 'ring-violet-500/60'), 2000);
    }
    setPendingScrollId(null);
  }, [activeType, pendingScrollId]);

  const scenesByType = TYPES.map(t => (storyboard?.scenes || []).filter(s => s.type === t));
  const allImagePrompts = storyboard ? buildGridText(storyboard.scenes.map(s => s.prompts.image.prompt)) : '';
  const allVideoPrompts = storyboard ? storyboard.scenes.filter(s => s.prompts.video).map(s => s.prompts.video.prompt).join('\n\n') : '';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-900/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-3 sm:px-5 h-16 gap-2 sm:gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-sm sm:text-base font-bold text-emerald-400 tracking-wider">TOOLB LAB</span>
        </Link>
        <span className="text-zinc-700 hidden sm:inline">/</span>
        <span className="text-sm text-zinc-400 hidden sm:inline truncate">
          <span className="text-zinc-100 font-bold">3단계</span> 인트로영상 만들기
        </span>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => { setUploadOpen(true); setUploadError(''); setJsonInput(''); }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-400 text-white text-xs sm:text-sm font-bold transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">JSON </span>업로드
          </button>
          <Link
            href="/"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 text-xs sm:text-sm font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            홈
          </Link>
        </div>
      </header>

      <div className="flex flex-col md:flex-row md:h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside className="w-full md:w-[300px] flex-shrink-0 border-b md:border-b-0 md:border-r border-white/[0.06] bg-zinc-900/40 md:overflow-y-auto">
          {/* Storyboard meta */}
          <div className="p-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-zinc-500">
              <Clapperboard className="w-3.5 h-3.5" />
              인트로영상 정보
            </div>
            {storyboard ? (
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-sm text-zinc-500 font-medium w-14 pt-0.5">제목</span>
                  <span className="text-sm text-zinc-100 font-bold flex-1 break-all">{storyboard.title}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm text-zinc-500 font-medium w-14 pt-0.5">씬 수</span>
                  <span className="text-sm text-zinc-100 font-bold flex-1">{storyboard.meta.total_scenes}개</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm text-zinc-500 font-medium w-14 pt-0.5">비율</span>
                  <span className="text-sm text-zinc-100 font-bold flex-1">{storyboard.meta.aspect_ratio}</span>
                </div>
                {storyboard.meta.genre && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-zinc-500 font-medium w-14 pt-0.5">장르</span>
                    <span className="text-sm text-zinc-100 font-bold flex-1">{storyboard.meta.genre}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-zinc-600">JSON을 업로드하면 표시됩니다.</p>
            )}
          </div>

          {/* Tools */}
          <div className="p-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-zinc-500">
              <Wrench className="w-3.5 h-3.5" />
              도구
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setToolView(toolView === 'frame-extractor' ? null : 'frame-extractor')}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-bold border-l-2 transition-colors ${
                  toolView === 'frame-extractor'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                    : 'border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'
                }`}
              >
                <Film className="w-4 h-4" />
                프레임추출기
              </button>
              <button
                onClick={() => setToolView(toolView === 'watermark-remover' ? null : 'watermark-remover')}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-bold border-l-2 transition-colors ${
                  toolView === 'watermark-remover'
                    ? 'bg-violet-500/10 border-violet-500 text-violet-300'
                    : 'border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'
                }`}
              >
                <Droplets className="w-4 h-4" />
                워터마크제거
              </button>
            </div>
          </div>

          {/* Gem guide */}
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-zinc-500">
              <Gem className="w-3.5 h-3.5" />
              젬 가이드
            </div>
            <a
              href="https://gemini.google.com/gem/1_7ZqJxYVyTB82w8Q9WNuUCIvR52ZBAsS?usp=sharing"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white text-sm font-bold transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              3단계 젬 가이드 열기
            </a>
            <a
              href="https://kr.pinterest.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
              </svg>
              핀터레스트
            </a>
            <a
              href="https://gemini.google.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M11.04 19.32Q12 18.72 12.84 17.76Q13.68 16.8 14.04 15.6H11.04V19.32ZM9 19.68V15.6H5.58Q6.18 17.04 7.32 18.06Q8.46 19.08 9 19.68ZM5.1 14.4H9V10.2H4.62Q4.44 10.8 4.38 11.28Q4.32 11.76 4.32 12.24Q4.32 13.08 4.5 13.68Q4.68 14.28 5.1 14.4ZM10.2 14.4H13.8V10.2H10.2V14.4ZM14.4 9H19.08Q18.72 8.04 18.12 7.2Q17.52 6.36 16.74 5.7Q15.72 6.48 14.88 7.08Q14.04 7.68 14.4 9ZM9 9H13.44Q13.08 7.68 12.36 6.6Q11.64 5.52 10.68 4.68Q9.72 5.52 9 6.6Q8.28 7.68 9 9ZM4.92 9H9.36Q9 8.04 8.7 7.2Q8.4 6.36 7.98 5.64Q7.08 6.24 6.36 7.08Q5.64 7.92 4.92 9ZM12 21.6Q10.68 21.6 9.42 21.12Q8.16 20.64 7.14 19.86Q6.12 19.08 5.34 18.06Q4.56 17.04 4.08 15.78Q3.6 14.52 3.6 13.2Q3.6 10.68 5.04 8.64Q6.48 6.6 8.76 5.52Q8.16 4.56 7.68 3.48Q7.2 2.4 6.96 1.2H8.16Q8.4 2.16 8.76 3.06Q9.12 3.96 9.6 4.68Q10.32 4.2 11.16 3.96Q12 3.72 12 3.72Q12 3.72 12.84 3.96Q13.68 4.2 14.4 4.68Q14.88 3.96 15.24 3.06Q15.6 2.16 15.84 1.2H17.04Q16.8 2.4 16.32 3.48Q15.84 4.56 15.24 5.52Q17.52 6.6 18.96 8.64Q20.4 10.68 20.4 13.2Q20.4 14.52 19.92 15.78Q19.44 17.04 18.66 18.06Q17.88 19.08 16.86 19.86Q15.84 20.64 14.58 21.12Q13.32 21.6 12 21.6Z" />
              </svg>
              제미나이
            </a>
            <a
              href="https://gemini.google.com/gem/1Wy6XhDIfeb1rO9AiYYDMdc6-wDoixF60?usp=sharing"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-sm font-bold transition-colors"
            >
              <Music className="w-4 h-4" />
              음악만들기
            </a>
            <a
              href="https://grok.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-bold transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Grok 바로가기
            </a>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col md:overflow-hidden">
          {toolView === 'frame-extractor' ? (
            <FrameExtractor accentColor="#a855f7" />
          ) : toolView === 'watermark-remover' ? (
            <WatermarkRemover accentColor="#8b5cf6" />
          ) : !storyboard ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
              <div className="w-20 h-20 mb-5 rounded-full flex items-center justify-center bg-white/[0.04] border border-white/[0.06]">
                <Clapperboard className="w-10 h-10 text-zinc-600" />
              </div>
              <h3 className="text-lg font-bold text-zinc-100 mb-2">인트로영상 데이터가 없습니다</h3>
              <p className="text-sm text-zinc-500 mb-5 leading-relaxed">
                인트로영상 JSON을 업로드하여<br />
                이미지/영상 프롬프트를 확인하세요.
              </p>
              <button
                onClick={() => { setUploadOpen(true); setUploadError(''); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white text-sm font-bold transition-colors"
              >
                <Upload className="w-4 h-4" />
                인트로영상 JSON 업로드
              </button>
            </div>
          ) : (
            <>
              {/* Top bulk-copy bar */}
              <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.06] bg-zinc-900/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Clapperboard className="w-4 h-4 text-violet-400 flex-shrink-0" />
                  <h2 className="text-base font-black text-zinc-100 uppercase truncate">{storyboard.title}</h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-zinc-400 flex-shrink-0">
                    {storyboard.meta.total_scenes}씬
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-zinc-400 flex-shrink-0">
                    {storyboard.meta.aspect_ratio}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => copyText(allImagePrompts)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-sm font-bold transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    이미지 전체
                  </button>
                  <button
                    onClick={() => copyText(allVideoPrompts)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-sm font-bold transition-colors"
                  >
                    <Film className="w-3.5 h-3.5" />
                    영상 전체
                  </button>
                </div>
              </div>

              {/* Type tab bar */}
              <div className="flex-shrink-0 flex border-b border-white/[0.06] bg-zinc-900/30 overflow-x-auto">
                {TYPES.map((t, i) => {
                  const tc = TYPE_COLORS[i];
                  const count = scenesByType[i].length;
                  const isActive = i === activeType;
                  return (
                    <button
                      key={t}
                      onClick={() => setActiveType(i)}
                      className={`flex items-center gap-2 px-5 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${isActive
                        ? 'text-zinc-100 bg-zinc-900/50'
                        : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/[0.02]'
                        }`}
                      style={isActive ? { borderBottomColor: tc.dot } : undefined}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: tc.dot, opacity: isActive ? 1 : 0.4 }}
                      />
                      {t}
                      {count > 0 && (
                        <span
                          className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: `${tc.dot}25`, color: tc.dot }}
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
                {scenesByType[activeType].length === 0 ? (
                  <div className="text-center py-10 text-zinc-600 text-sm">
                    이 구간에 해당하는 씬이 없습니다.
                  </div>
                ) : (
                  scenesByType[activeType].map((scene) => {
                    const tc = TYPE_COLORS[activeType];
                    return (
                      <div
                        key={scene.id}
                        ref={(el) => { sceneRefs.current[scene.id] = el; }}
                        className="rounded-xl overflow-hidden border border-white/[0.06] bg-zinc-900/50 transition-all"
                      >
                        {/* Scene header */}
                        <div
                          className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between gap-3"
                          style={{ background: `${tc.dot}10` }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="text-[12px] font-black px-2 py-0.5 rounded"
                              style={{ background: `${tc.dot}25`, color: tc.dot }}
                            >
                              #{String(scene.scene_number).padStart(2, '0')}
                            </span>
                            <span className="text-base font-bold text-zinc-100 truncate">{scene.title}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {scene.camera?.shot_type && (
                              <span className="text-[11px] uppercase font-bold px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.04] text-zinc-300">
                                {scene.camera.shot_type}
                              </span>
                            )}
                            {scene.camera?.movement && (
                              <span className="text-[11px] uppercase font-bold px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.04] text-zinc-300">
                                {scene.camera.movement}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Scene info */}
                        {(scene.description || scene.emotion || scene.key_visual || scene.camera?.lighting) && (
                          <div className="px-4 py-3 border-b border-white/[0.06] space-y-2">
                            {scene.description && (
                              <p className="text-sm text-zinc-300 leading-relaxed">{scene.description}</p>
                            )}
                            <div className="flex flex-wrap gap-1.5">
                              {scene.emotion && (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-zinc-400">
                                  감정: <span className="text-zinc-200">{scene.emotion}</span>
                                </span>
                              )}
                              {scene.key_visual && (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-zinc-400">
                                  핵심: <span className="text-zinc-200">{scene.key_visual}</span>
                                </span>
                              )}
                              {scene.camera?.lighting && (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-zinc-400">
                                  조명: <span className="text-zinc-200">{scene.camera.lighting.slice(0, 50)}{scene.camera.lighting.length > 50 ? '…' : ''}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Image / Video prompts side by side */}
                        <div className="flex flex-col md:flex-row">
                          {/* Image prompt */}
                          <div className={`flex-1 p-4 min-w-0 ${scene.prompts.video ? 'border-b md:border-b-0 md:border-r border-white/[0.06]' : ''}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <ImageIcon className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">이미지 프롬프트</span>
                                <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold">
                                  {scene.prompts.image.tool}
                                </span>
                              </div>
                              <button
                                onClick={() => copyText(scene.prompts.image.prompt)}
                                className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] font-bold text-zinc-400 transition-colors flex-shrink-0"
                              >
                                <Copy className="w-3 h-3" />
                                복사
                              </button>
                            </div>
                            <textarea
                              value={scene.prompts.image.prompt}
                              onChange={(e) => updateImagePrompt(scene.id, e.target.value)}
                              rows={5}
                              className="w-full min-h-[100px] resize-y bg-zinc-950/60 border border-white/[0.06] rounded-lg p-2.5 text-[13px] leading-relaxed font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                            />
                          </div>

                          {/* Video prompt */}
                          {scene.prompts.video && (
                            <div className="flex-1 p-4 bg-white/[0.02] min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                  <Film className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                                  <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">영상 프롬프트</span>
                                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 font-bold">
                                    {scene.prompts.video.tool} · {scene.prompts.video.duration}s
                                  </span>
                                  {scene.prompts.video.motion_type && (
                                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 font-bold">
                                      {scene.prompts.video.motion_type}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => copyText(scene.prompts.video.prompt)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] font-bold text-zinc-400 transition-colors flex-shrink-0"
                                >
                                  <Copy className="w-3 h-3" />
                                  복사
                                </button>
                              </div>
                              <textarea
                                value={scene.prompts.video.prompt}
                                onChange={(e) => updateVideoPrompt(scene.id, e.target.value)}
                                rows={5}
                                className="w-full min-h-[100px] resize-y bg-zinc-950/60 border border-white/[0.06] rounded-lg p-2.5 text-[13px] leading-relaxed font-mono text-zinc-200 focus:outline-none focus:border-rose-500/50"
                              />
                            </div>
                          )}
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
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setUploadOpen(false)}
        >
          <div
            className="bg-zinc-900 rounded-2xl border border-white/[0.08] shadow-2xl w-[640px] max-w-[95vw] max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <span className="text-base font-bold text-zinc-100 uppercase tracking-wider">인트로영상 JSON 업로드</span>
              <button
                onClick={() => setUploadOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/[0.06] text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
              <p className="text-sm text-zinc-400 leading-relaxed">
                인트로영상 JSON을 붙여넣으세요. <code className="bg-white/[0.04] px-1.5 py-0.5 rounded text-violet-400 font-mono text-[12px]">scenes</code> 배열이 포함되어야 합니다.
                마크다운 코드블록(```) 래핑과 <code className="bg-white/[0.04] px-1.5 py-0.5 rounded text-violet-400 font-mono text-[12px]">{`{ "opening_sequence": ... }`}</code> 래퍼도 자동 처리됩니다.
              </p>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full h-[260px] resize-y font-mono text-[13px] leading-relaxed p-3 rounded-lg bg-zinc-950 border border-white/[0.06] text-zinc-200 focus:outline-none focus:border-violet-500/50"
                placeholder='{"opening_sequence": {"title": "...", "meta": {...}, "scenes": [...]}}'
              />
              {uploadError && (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 font-semibold">
                  {uploadError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-white/[0.06]">
              <button
                onClick={() => setUploadOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 text-sm font-bold transition-colors"
              >
                취소
              </button>
              <button
                onClick={loadJson}
                className="px-4 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-400 text-white text-sm font-bold transition-colors"
              >
                불러오기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[400] bg-violet-500 text-white px-4 py-2.5 rounded-lg shadow-2xl text-sm font-bold animate-fadeIn">
          {toast}
        </div>
      )}
    </div>
  );
}
