'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Copy, Clipboard, ExternalLink, Gem, X, Layers, List, Info, Film, Droplets, Wrench, Mic } from 'lucide-react';
import dynamic from 'next/dynamic';
const FrameExtractor = dynamic(() => import('@/app/components/FrameExtractor'), { ssr: false });
const WatermarkRemover = dynamic(() => import('@/app/components/WatermarkRemover'), { ssr: false });

const COMP_MAP = {
  comp_character: '캐릭터', comp_landscape: '풍경', comp_object: '사물',
  comp_creature: '생물', comp_env: '환경', comp_camera: '카메라',
  comp_style: '스타일', comp_outfit: '복장', comp_props: '소품',
  comp_background: '배경', comp_lighting: '조명',
  comp_camera_settings: '카메라 설정', comp_render: '렌더링 스타일',
};

const TAB_COLORS = [
  { dot: '#22c55e' },
  { dot: '#3b82f6' },
  { dot: '#f59e0b' },
  { dot: '#a855f7' },
  { dot: '#ef4444' },
];

const CACHE_KEY = 'toolb_step1_template';

function normalize(tpl) {
  if (!tpl.meta_data) tpl.meta_data = {};
  if (!tpl.global_settings) tpl.global_settings = { prompt_separator: ', ', section_separator: ', ', auto_capitalize: false, remove_duplicates: true };
  if (!Array.isArray(tpl.prompt_sections)) tpl.prompt_sections = [];
  for (const s of tpl.prompt_sections) {
    if (s.is_active === undefined) s.is_active = true;
    if (!s.section_label_ko) s.section_label_ko = s.section_label || s.section_id;
    for (const c of s.components || []) {
      if (c.is_active === undefined) c.is_active = true;
      if (!c.component_label_ko) c.component_label_ko = COMP_MAP[c.component_id] || c.component_label || c.component_id;
      for (const a of c.attributes || []) {
        if (a.is_active === undefined) a.is_active = true;
        if (!a.type) a.type = 'textarea';
      }
    }
  }
  return tpl;
}

function generatePromptString(tpl) {
  if (!tpl || !Array.isArray(tpl.prompt_sections)) return '';
  const parts = [], params = [];
  const sep = tpl.global_settings?.prompt_separator || ', ';
  const secSep = tpl.global_settings?.section_separator || ', ';

  const sorted = [...tpl.prompt_sections]
    .filter(s => s && s.is_active !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  for (const section of sorted) {
    if (section.is_midjourney_params) {
      for (const comp of section.components || []) {
        if (comp.is_active === false) continue;
        for (const attr of comp.attributes || []) {
          if (attr.is_active === false || !attr.value) continue;
          params.push((attr.prefix || '') + attr.value);
        }
      }
      continue;
    }
    const sp = [];
    for (const comp of section.components || []) {
      if (comp.is_active === false) continue;
      for (const attr of comp.attributes || []) {
        if (attr.is_active === false || (!attr.value && attr.value !== 0)) continue;
        const _v = String(attr.value).trim().toLowerCase();
        if (['none', '없음', 'n/a', '-', ''].includes(_v)) continue;
        let v = Array.isArray(attr.value) ? attr.value.join(', ') : String(attr.value);
        if (attr.weight?.enabled && attr.weight.value !== 1) v += '::' + attr.weight.value;
        sp.push(v);
      }
    }
    if (sp.length) parts.push(sp.join(sep));
  }

  let prompt = parts.join(secSep);
  if (tpl.global_settings?.remove_duplicates) {
    const words = prompt.split(',').map(s => s.trim()).filter(Boolean);
    prompt = [...new Set(words)].join(', ');
  }
  if (params.length) prompt += ' ' + params.join(' ');
  return prompt;
}

function getDisplayValue(attr) {
  if (attr.value_ko) return attr.value_ko;
  const v = Array.isArray(attr.value) ? attr.value.join(', ') : String(attr.value || '');
  if (!attr.options) return v;
  const opt = attr.options.find(o => typeof o === 'string' ? o === v : o.value === v);
  if (!opt) return v;
  if (typeof opt === 'string') return opt;
  return opt.label_ko || opt.label || opt.value;
}

export default function Step1Page() {
  const [template, setTemplate] = useState({
    meta_data: {},
    global_settings: { prompt_separator: ', ', section_separator: ', ', remove_duplicates: true },
    prompt_sections: [],
  });
  const [activeTab, setActiveTab] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [toast, setToast] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [toolView, setToolView] = useState(null);
  const [speakPromptOpen, setSpeakPromptOpen] = useState(false);
  const [variant, setVariant] = useState('talking');

  const VARIANTS = {
    talking: {
      label: '말하는 프롬프트',
      sub: 'Step 1-1',
      prompt: `The character is a native Korean speaker.
All dialogue must be spoken in Korean ONLY.
English is strictly prohibited.
Voice requirements:
- Native Korean pronunciation
- Natural Korean intonation and rhythm
- No foreign accent
- Sounds like a professional Korean voice actor
Dialogue (Korean only):
Korean man "안녕? 나는 툴비야."
"이 세상의 주인공은 나야. 어떠케 생가케?"
"우리 모험을 떠나볼까?."
Performance:
- Natural pauses
- Realistic emotions
- Not robotic
- Not exaggerated
Subtitles, title, text is strictly prohibited.`,
    },
    dance: {
      label: '춤추는 영상 프롬프트',
      sub: 'Step 1-2',
      prompt: `The person begins with quick rhythmic footwork, alternating sharp heel and toe stomps on the floor, then sharply spins around to face away and swings their hips playfully side to side, next explosively jumps up and rotates 180 degrees mid-air, finally landing to face forward with one arm thrusting diagonally upward toward the sky and holding the victory pose. Preserve the exact appearance, clothing, and footwear from the source image. Locked frontal medium shot rises subtly with the jump, then freezes completely still on the final pose. Sharp percussive footstep sounds alternating between heel and toe, fabric swishing, a whoosh on the jump, one solid landing sound, a short crowd cheer sustaining into the freeze. No music.`,
    },
    fly: {
      label: '날아가는 영상 프롬프트',
      sub: 'Step 1-3',
      prompt: `Ultra-realistic cinematic aerial rear follow shot using the uploaded image as exact identity reference. Camera strictly positioned behind the subject, slight rear-left tracking only. Wide-angle cinematic lens with subtle telephoto compression. Very far camera distance subject appears small in frame. Low altitude flight just above ocean surface. High-speed forward motion. Subject seen only from behind. Fully horizontal flying posture. Arms stretched outward like wings. Legs slightly bent. Clothing pushed backward from wind resistance. Environment: open ocean at sunset. Large ocean dominating frame. Infinite cinematic horizon in upper third. Smooth reflective water with extreme horizontal motion blur streaks. Subtle haze near horizon. Lighting: Low golden sunset directly in front of subject. Strong backlit rim light outlining arms and shoulders. Intense golden reflections across water surface. Sky gradient from peach and pink into deep blue ocean shadows. Hyper-realistic DSLR photography. No CGI look. Extreme 8K clarity. Mood: freedom, speed, solitude. Important: Camera must stay behind subject. No side profile. Subject far from camera. Water motion blur very strong.`,
    },
    interview: {
      label: '동물 인터뷰 프롬프트',
      sub: 'Step 1-4',
      prompt: `An anthropomorphic animal character speaks directly to the camera in an interview style.
Setup:
- Medium close-up, eye-level framing
- Soft bokeh background as if on a documentary set
- Natural studio lighting with a gentle key light
Voice requirements:
- Speaks in Korean ONLY, English is strictly prohibited
- Warm, conversational tone like a TV interview
- Natural pauses and subtle breathing sounds
Animal performance:
- Mouth moves in sync with speech
- Ears, whiskers, or fur subtly react to emotion
- Blinks and slight head tilts for naturalness
Dialogue (Korean only):
"안녕하세요, 저는 오늘의 주인공이에요."
"제가 겪은 이야기를 들려드릴게요."
"끝까지 함께해 주세요."
Subtitles, title, text is strictly prohibited.`,
    },
  };

  const currentVariant = VARIANTS[variant] || VARIANTS.talking;
  const SPEAK_PROMPT = currentVariant.prompt;
  const promptRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('v');
    if (v && VARIANTS[v]) setVariant(v);
  }, []);

  // Load cache on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.prompt_sections)) {
          setTemplate(normalize(parsed));
        }
      }
    } catch (e) {}
    setHydrated(true);
  }, []);

  // Auto-save
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(template)); } catch (e) {}
  }, [template, hydrated]);

  // Auto-resize prompt textarea
  useEffect(() => {
    if (promptRef.current) {
      promptRef.current.style.height = 'auto';
      promptRef.current.style.height = promptRef.current.scrollHeight + 'px';
    }
  }, [template, activeTab]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const updateAttr = (sectionId, compId, attrId, newVal) => {
    setTemplate(prev => {
      const tpl = JSON.parse(JSON.stringify(prev));
      const s = tpl.prompt_sections.find(s => s.section_id === sectionId);
      const c = s?.components.find(c => c.component_id === compId);
      const a = c?.attributes.find(a => a.attr_id === attrId);
      if (a) a.value = newVal;
      return tpl;
    });
  };

  const copyText = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => showToast('복사됨!')).catch(() => showToast('복사 실패'));
  };

  const pasteText = async (sectionId, compId, attrId) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) updateAttr(sectionId, compId, attrId, text);
    } catch (e) {
      showToast('클립보드 접근 불가');
    }
  };

  const loadJson = () => {
    const raw = jsonInput.trim();
    if (!raw) { setUploadError('JSON을 입력하세요.'); return; }
    const cleaned = raw.replace(/^```(?:json|JSON)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch (e) { setUploadError(`JSON 파싱 오류: ${e.message}`); return; }
    if (!parsed || typeof parsed !== 'object') {
      setUploadError('유효한 JSON 객체가 아닙니다.');
      return;
    }
    if (!Array.isArray(parsed.prompt_sections)) {
      setUploadError('"prompt_sections" 배열이 없습니다.');
      return;
    }
    setTemplate(normalize(parsed));
    setActiveTab(0);
    setUploadOpen(false);
    setUploadError('');
    setJsonInput('');
    showToast('템플릿 로드 완료!');
  };

  const sections = template.prompt_sections || [];
  const promptString = generatePromptString(template);
  const palette = template.color_palette;
  const hasPalette = palette && (palette.primary || palette.secondary || palette.accent);
  const currentSection = sections[activeTab];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      <style jsx global>{`
        .tb-hero {
          position: relative;
          padding: 22px 20px 56px;
          background: linear-gradient(135deg, #016837 0%, #00996D 45%, #00B380 100%);
          color: #fff;
          text-align: center;
          overflow: hidden;
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
          height: 60px;
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
          font-size: 11px; font-weight: 800;
          letter-spacing: 0.28em; text-transform: uppercase;
          padding: 6px 14px; border-radius: 100px;
          background: rgba(255,255,255,0.16);
          border: 1px solid rgba(255,255,255,0.35);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          margin-bottom: 14px;
        }
        .tb-hero-title {
          font-size: clamp(26px, 7vw, 34px);
          font-weight: 900;
          line-height: 1.2;
          letter-spacing: -0.01em;
          position: relative;
          z-index: 2;
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
      `}</style>

      {/* Hero */}
      <section className="tb-hero">
        <div className="tb-hero-glow" />
        <span className="tb-hero-eyebrow">TB STUDY · {currentVariant.sub}</span>
        <h1 className="tb-hero-title">영상기초다지기</h1>
      </section>

      {/* Glass bar (hovering over hero wave) */}
      <div className="tb-glass-bar">
        <Link href="/?c=up&s=step1" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full tb-pill-ghost text-xs sm:text-sm font-bold transition">
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

      <div className="flex flex-col md:flex-row md:h-[calc(100vh-220px)] w-full px-4 pt-6 gap-4 2xl:px-6">
        {/* Sidebar */}
        <aside className="w-full md:w-[300px] flex-shrink-0 bg-white border border-[#e2e8f0] rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.06)] md:overflow-y-auto">
          {/* Template info */}
          <div className="p-4 border-b border-[#e2e8f0]">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-[#64748b]">
              <Info className="w-3 h-3" />
              템플릿 정보
            </div>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="text-sm text-[#64748b] font-medium w-12 pt-0.5">이름</span>
                <span className="text-sm text-[#0f172a] font-bold flex-1 break-all">{template.meta_data?.template_name || '—'}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm text-[#64748b] font-medium w-12 pt-0.5">버전</span>
                <span className="text-sm text-[#0f172a] font-bold flex-1">{template.meta_data?.version || '—'}</span>
              </div>
            </div>
          </div>


          {/* Tools */}
          <div className="p-4 border-b border-[#e2e8f0]">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-[#64748b]">
              <Wrench className="w-3 h-3" />
              도구
            </div>
            <div className="space-y-1">
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

          {/* Gem guide */}
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-[#64748b]">
              <Gem className="w-3 h-3" />
              젬 가이드
            </div>
            <a
              href="https://gemini.google.com/gem/13HOLZGAzOKloWSBnxejnMvWDOJHNvdyu?usp=sharing"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full tb-pill-primary text-sm font-bold transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              1단계 젬 가이드 열기
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
              href="https://grok.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[#0f172a] hover:opacity-90 text-white text-sm font-bold tb-press"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Grok 바로가기
            </a>
          </div>

          {/* Variant prompt */}
          <div className="p-4 border-t border-[#e2e8f0]">
            <button
              onClick={() => setSpeakPromptOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-sm font-bold text-white hover:opacity-90 tb-press"
              style={{
                background: 'linear-gradient(112.34deg, #A855F7 -38.67%, #6D28D9 99.56%)',
                boxShadow: '0 10px 24px rgba(109, 40, 217, 0.3)',
              }}
            >
              <Mic className="w-4 h-4" />
              {currentVariant.label}
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col md:overflow-hidden bg-white border border-[#e2e8f0] rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          {toolView === 'frame-extractor' ? (
            <FrameExtractor accentColor="#00996D" />
          ) : toolView === 'watermark-remover' ? (
            <WatermarkRemover accentColor="#00996D" />
          ) : (
          <>
          {sections.length > 0 && (
            <div className="flex-shrink-0 px-4 py-3 border-b border-[#e2e8f0] bg-[#ecfdf5]/40 rounded-t-2xl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#64748b] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00996D]" />
                  이미지 프롬프트
                </span>
                <button
                  onClick={() => copyText(promptString)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#f1f5f9] border border-[#e2e8f0] text-[12px] font-bold text-[#334155] tb-press-soft"
                >
                  <Copy className="w-3 h-3" />
                  복사
                </button>
              </div>
              <textarea
                ref={promptRef}
                value={promptString}
                readOnly
                placeholder="템플릿을 로드하면 자동으로 생성됩니다..."
                className="w-full min-h-[60px] resize-none bg-white border border-[#e2e8f0] rounded-xl p-2.5 text-[13px] leading-relaxed text-[#0f172a] focus:outline-none focus:border-[#00B380] focus:ring-[3px] focus:ring-[#00B380]/20"
              />
            </div>
          )}

          {sections.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
              <h3 className="text-lg font-bold text-[#0f172a] mb-2">템플릿을 로드하세요</h3>
              <p className="text-sm text-[#64748b] mb-5 leading-relaxed">
                JSON 업로드 버튼을 클릭하여 템플릿을 불러오거나,<br />
                기본 샘플이 자동으로 로드됩니다.
              </p>
              <button
                onClick={() => { setUploadOpen(true); setUploadError(''); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full tb-pill-primary text-sm font-bold transition"
              >
                <Upload className="w-3.5 h-3.5" />
                JSON 업로드 시작
              </button>
            </div>
          ) : (
            <>
              {/* Tab bar */}
              <div className="flex-shrink-0 flex gap-1.5 p-3 border-b border-[#e2e8f0] bg-white overflow-x-auto">
                {sections.map((s, i) => {
                  const tc = TAB_COLORS[i % TAB_COLORS.length];
                  const isActive = i === activeTab;
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveTab(i)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-bold whitespace-nowrap rounded-full transition ${
                        isActive
                          ? 'tb-pill-primary'
                          : 'text-[#64748b] bg-[#f1f5f9] hover:bg-[#e2e8f0] tb-press-soft'
                      }`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: isActive ? '#fff' : tc.dot, opacity: isActive ? 1 : 0.6 }}
                      />
                      {s.section_label_ko || s.section_id}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {currentSection && (currentSection.components || []).filter(c => c.is_active !== false).map(comp => {
                  const tc = TAB_COLORS[activeTab % TAB_COLORS.length];
                  return (
                    <div key={comp.component_id} className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-[#64748b] px-1">
                        <Layers className="w-3 h-3" />
                        {comp.component_label_ko || comp.component_id}
                      </div>
                      <div className="space-y-1.5">
                        {(comp.attributes || []).map(attr => {
                          const displayVal = getDisplayValue(attr);
                          const engVal = Array.isArray(attr.value) ? attr.value.join(', ') : (attr.value || '');
                          const isInactive = attr.is_active === false;
                          const isNoneVal = ['none', '없음', 'n/a', '-', ''].includes(String(attr.value || '').trim().toLowerCase());
                          const opacity = isInactive ? 0.55 : isNoneVal ? 0.5 : 1;
                          return (
                            <div
                              key={attr.attr_id}
                              className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
                              style={{ opacity }}
                            >
                              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#e2e8f0] bg-[#f8fafc]">
                                <div className="flex items-center gap-1.5 text-sm font-bold text-[#0f172a] min-w-0">
                                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tc.dot }} />
                                  <span className="truncate">{attr.label_ko || attr.label || attr.attr_id}</span>
                                  {attr.is_locked && (
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#fef3c7] border border-[#fcd34d] text-[#92400e] flex-shrink-0">고정</span>
                                  )}
                                  {isInactive && (
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#fee2e2] border border-[#fca5a5] text-[#b91c1c] flex-shrink-0">비활성</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => copyText(engVal)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#f1f5f9] border border-[#e2e8f0] text-[12px] font-bold text-[#64748b] tb-press-soft"
                                  >
                                    <Copy className="w-3 h-3" />
                                    복사
                                  </button>
                                  <button
                                    onClick={() => pasteText(currentSection.section_id, comp.component_id, attr.attr_id)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#f1f5f9] border border-[#e2e8f0] text-[12px] font-bold text-[#64748b] tb-press-soft"
                                  >
                                    <Clipboard className="w-3 h-3" />
                                    붙여넣기
                                  </button>
                                </div>
                              </div>
                              <div className="flex gap-2 p-3 items-stretch">
                                <div className="flex-1 min-w-0 text-sm font-semibold text-[#334155] leading-relaxed py-1.5 px-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                                  {displayVal}
                                </div>
                                <div className="w-px bg-[#e2e8f0] self-stretch" />
                                <textarea
                                  rows={2}
                                  value={engVal}
                                  placeholder="영문 값 입력..."
                                  onChange={(e) => updateAttr(currentSection.section_id, comp.component_id, attr.attr_id, e.target.value)}
                                  className="flex-1 min-w-0 resize-none text-[13px] leading-relaxed text-[#0f172a] py-1.5 px-2.5 rounded-xl bg-white border border-[#e2e8f0] focus:outline-none focus:border-[#00B380] focus:ring-[3px] focus:ring-[#00B380]/20"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
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
            className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_24px_60px_rgba(15,23,42,0.25)] w-[560px] max-w-[95vw] max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e8f0]">
              <span className="text-base font-bold text-[#0f172a] uppercase tracking-wider">JSON 템플릿 업로드</span>
              <button
                onClick={() => setUploadOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569] tb-press-soft"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
              <p className="text-sm text-[#64748b] leading-relaxed">
                TB_V5 Lite 형식의 JSON을 붙여넣으세요. <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px]">prompt_sections</code> 배열이 포함되어야 합니다.
              </p>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full h-[220px] resize-y font-mono text-[13px] leading-relaxed p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:outline-none focus:border-[#00B380] focus:ring-[3px] focus:ring-[#00B380]/20"
                placeholder='{"meta_data": {...}, "prompt_sections": [...]}'
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

      {/* Speak Prompt Modal */}
      {speakPromptOpen && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0f172a]/60 backdrop-blur-md"
          onClick={() => setSpeakPromptOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_24px_60px_rgba(15,23,42,0.25)] w-[640px] max-w-[95vw] max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e8f0]">
              <span className="text-base font-bold text-[#0f172a] uppercase tracking-wider flex items-center gap-2">
                <Mic className="w-4 h-4 text-[#7C3AED]" />
                {currentVariant.label}
              </span>
              <button
                onClick={() => setSpeakPromptOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569] tb-press-soft"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
              <textarea
                value={SPEAK_PROMPT}
                readOnly
                className="w-full h-[420px] resize-none font-mono text-[13px] leading-relaxed p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:outline-none focus:border-[#00B380] focus:ring-[3px] focus:ring-[#00B380]/20"
              />
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#e2e8f0]">
              <button
                onClick={() => setSpeakPromptOpen(false)}
                className="px-4 py-1.5 rounded-full tb-pill-ghost text-sm font-bold transition"
              >
                닫기
              </button>
              <button
                onClick={() => copyText(SPEAK_PROMPT)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold text-white hover:opacity-90 tb-press"
                style={{
                  background: 'linear-gradient(112.34deg, #A855F7 -38.67%, #6D28D9 99.56%)',
                  boxShadow: '0 10px 24px rgba(109, 40, 217, 0.3)',
                }}
              >
                <Copy className="w-3.5 h-3.5" />
                복사하기
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
