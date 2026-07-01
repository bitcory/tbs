'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, ExternalLink, Gem, X, Film, Droplets, Wrench, Mic, Languages, FileText, FileJson, MessageSquare } from 'lucide-react';
import dynamic from 'next/dynamic';
const FrameExtractor = dynamic(() => import('@/app/components/FrameExtractor'), { ssr: false });
const WatermarkRemover = dynamic(() => import('@/app/components/WatermarkRemover'), { ssr: false });

const CACHE_KEY = 'toolb_step1_json_';

// talking(AI 인플루언서) variant 기본 예시 JSON
const DEFAULT_TALKING_JSON = `{
  "project_title": "AI INFLUENCER LECTURE VLOG",
  "duration": "10 seconds",
  "format": "vertical 9:16 short-form video",
  "reference_image_usage": {
    "use_reference_image": true,
    "preserve_identity": true,
    "preserve_core_features": [
      "round face shape",
      "short black hair",
      "mature professional appearance",
      "middle-aged age impression",
      "formal business fashion"
    ],
    "style_transformation": "realistic educational vlog style"
  },
  "subject": {
    "gender": "male",
    "age_range": "middle-aged",
    "appearance": "Professional Korean male lecturer with a round face, neatly styled short black hair, confident and approachable presence",
    "outfit": "navy business suit, white dress shirt, patterned tie, formal shoes",
    "expression": "confident, friendly, knowledgeable"
  },
  "visual_style": {
    "style": "realistic classroom vlog",
    "camera": "26mm phone lens",
    "color": "natural and neutral",
    "lighting": "bright classroom lighting",
    "texture": "realistic skin texture",
    "grading": "clean educational content look",
    "avoid": [
      "cinematic grading",
      "heavy motion blur",
      "lens flare",
      "overly dramatic lighting",
      "beauty filter"
    ]
  },
  "location": {
    "place": "AI education classroom",
    "atmosphere": "modern lecture room with projector screen, desks, students, laptops and AI presentation materials"
  },
  "timeline": [
    {
      "time": "0:00-0:01",
      "scene_title": "Classroom Introduction",
      "camera": "wide shot",
      "action": "The lecturer stands at the front of the classroom preparing to begin.",
      "background": "Students seated facing a presentation screen.",
      "expression": "welcoming smile",
      "lighting": "bright classroom lighting",
      "dialogue": "안녕하세요!",
      "transition": "hard cut"
    },
    {
      "time": "0:01-0:02",
      "scene_title": "AI Topic Reveal",
      "camera": "medium shot",
      "action": "The lecturer points toward a slide displaying AI Influencer concepts.",
      "background": "Large presentation screen.",
      "expression": "confident",
      "lighting": "even indoor lighting",
      "dialogue": "오늘은 AI 인플루언서를 배워봅니다.",
      "transition": "quick cut"
    },
    {
      "time": "0:02-0:03",
      "scene_title": "Student Perspective",
      "camera": "over-the-shoulder shot",
      "action": "The camera shows the lecturer from a student's viewpoint.",
      "background": "Rows of desks and notebooks.",
      "expression": "engaged",
      "lighting": "natural classroom light",
      "dialogue": "",
      "transition": "cut"
    },
    {
      "time": "0:03-0:04",
      "scene_title": "Explaining AI Tools",
      "camera": "medium close-up",
      "action": "The lecturer gestures while explaining AI content creation.",
      "background": "AI workflow slide.",
      "expression": "focused",
      "lighting": "bright indoor light",
      "dialogue": "누구나 AI 크리에이터가 될 수 있습니다.",
      "transition": "cut on gesture"
    },
    {
      "time": "0:04-0:05",
      "scene_title": "Screen Demonstration",
      "camera": "close-up",
      "action": "Presentation screen displays AI influencer examples.",
      "background": "Projected visuals.",
      "expression": "professional",
      "lighting": "screen and room lighting",
      "dialogue": "",
      "transition": "snap cut"
    },
    {
      "time": "0:05-0:06",
      "scene_title": "Audience Reaction",
      "camera": "wide classroom shot",
      "action": "Students pay attention and take notes.",
      "background": "Lecture room environment.",
      "expression": "encouraging",
      "lighting": "balanced classroom lighting",
      "dialogue": "",
      "transition": "quick cut"
    },
    {
      "time": "0:06-0:07",
      "scene_title": "Key Point Emphasis",
      "camera": "medium shot",
      "action": "The lecturer raises a finger while emphasizing a key idea.",
      "background": "Presentation slide.",
      "expression": "confident",
      "lighting": "bright indoor lighting",
      "dialogue": "핵심은 꾸준한 콘텐츠입니다.",
      "transition": "cut"
    },
    {
      "time": "0:07-0:08",
      "scene_title": "Interactive Moment",
      "camera": "handheld vlog style shot",
      "action": "The lecturer looks directly into the camera.",
      "background": "Classroom and students.",
      "expression": "friendly",
      "lighting": "natural indoor lighting",
      "dialogue": "여러분도 할 수 있습니다.",
      "transition": "fast cut"
    },
    {
      "time": "0:08-0:09",
      "scene_title": "Lecture Wrap-up",
      "camera": "medium-wide shot",
      "action": "The lecturer concludes the main explanation.",
      "background": "AI Influencer title slide.",
      "expression": "satisfied",
      "lighting": "clean classroom lighting",
      "dialogue": "",
      "transition": "cut"
    },
    {
      "time": "0:09-0:10",
      "scene_title": "Closing Greeting",
      "camera": "close-up",
      "action": "The lecturer smiles and gives a small wave toward the camera.",
      "background": "Lecture room.",
      "expression": "warm and approachable",
      "lighting": "bright indoor lighting",
      "dialogue": "강의에서 만나요!",
      "transition": "fade out"
    }
  ],
  "music_direction": {
    "mood": "upbeat professional educational vlog",
    "editing_rhythm": "fast-paced short-form cuts with clean transitions"
  },
  "final_output_instruction": "Generate a realistic 10-second vertical vlog featuring the same person as the reference image while preserving core facial structure, hairstyle, age impression, body type, professional appearance and business suit style."
}`;

// 캐릭터시트 버튼 복사용 프롬프트
const CHARACTER_SHEET_PROMPT = `Cinematic character reference sheet, split-frame layout, photorealistic.
Left panel — facial close-up: a [AGE]-year-old [ORIGIN/ETHNICITY] [GENDER], [SKIN TONE] skin tone, the entire head fully inside the frame including all the hair, nothing cropped, [HAIR: length/texture/color], [FACE DETAILS: freckles/scars/facial hair/glasses—or "clean features"], real skin texture with subtle pores, [EXPRESSION] expression, looking straight into lens. Shot on 85mm portrait lens, shallow depth of field, soft cinematic key light with gentle fill.
Right panel — full-body front and back views side by side: the same [GENDER] shown twice within this panel — on the left, a full-body front view facing the camera; on the right, a full-body back view photographed from directly behind. In both, the figure stands in [POSE], full height in frame head-to-toe, [BUILD] build ([HEIGHT]), [SKIN TONE] skin, [HAIR], same [OUTFIT]. The front view shows the face and the front of the garment; the back view shows the back of the head, hair, shoulders, garment seams and the rear of the pants and shoes. Both figures matched in framing, scale and lighting for consistency. Shot on 35mm lens, even full-length lighting.
Look: clean studio character sheet, plain solid [BG COLOR] background, consistent character across all views, soft diffused cinematic lighting, [COLOR GRADE], fine detail, true-to-life skin tones, vertical divider lines separating each view.`;

// key → 사람이 읽기 좋은 라벨
function humanize(key) {
  return String(key).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderValue(v) {
  if (Array.isArray(v)) {
    return v.map((x) => (x && typeof x === 'object' ? JSON.stringify(x) : String(x))).join(', ');
  }
  return String(v);
}

// JSON 프롬프트를 "구조"가 아니라 값 중심의 읽기 좋은 프롬프트 텍스트로 변환
function renderPrompt(obj) {
  if (!obj || typeof obj !== 'object') return '';
  const lines = [];
  for (const [key, val] of Object.entries(obj)) {
    if (val === '' || val == null) continue;

    if (key === 'timeline' && Array.isArray(val)) {
      lines.push('');
      lines.push('■ Timeline');
      val.forEach((sc, i) => {
        if (!sc || typeof sc !== 'object') return;
        const time = sc.time || `#${i + 1}`;
        const title = sc.scene_title ? ` ${sc.scene_title}` : '';
        lines.push('');
        lines.push(`[${time}]${title}`);
        for (const [k, v] of Object.entries(sc)) {
          if (k === 'time' || k === 'scene_title') continue;
          if (v === '' || v == null) continue;
          lines.push(`  · ${humanize(k)}: ${renderValue(v)}`);
        }
      });
      continue;
    }

    if (typeof val === 'object' && !Array.isArray(val)) {
      lines.push('');
      lines.push(`■ ${humanize(key)}`);
      for (const [k, v] of Object.entries(val)) {
        if (v === '' || v == null) continue;
        lines.push(`  · ${humanize(k)}: ${renderValue(v)}`);
      }
      continue;
    }

    lines.push(`${humanize(key)}: ${renderValue(val)}`);
  }
  return lines.join('\n').trim();
}

export default function Step1Client({ variant = 'talking' }) {
  const [rawJson, setRawJson] = useState('');
  const [toast, setToast] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [toolView, setToolView] = useState(null);
  const [speakPromptOpen, setSpeakPromptOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [pasteError, setPasteError] = useState('');

  const VARIANTS = {
    talking: {
      label: '말하는 프롬프트',
      sub: 'UP 1-1',
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
      sub: 'UP 1-2',
      prompts: [
        {
          title: '댄스인트로',
          prompt: `The character is a native Korean speaker in [her 20s]. All dialogue must be spoken in Korean ONLY. English is strictly prohibited.
Voice requirements:
Native Korean pronunciation
Natural Korean intonation and rhythm
No foreign accent
Sounds like a professional Korean voice actor
Dialogue (Korean only):
Korean girl "안녕하세요. 저는 [**]라고 합니다."
"오늘은 제가 춤을 춰볼건데 잘 봐주세요"
Performance:
Natural pauses
Realistic emotions
Not robotic
Not exaggerated
No subtitles
Subtitles, title, text is strictly prohibited.
After speaking, The character begins with quick rhythmic footwork, alternating sharp heel and toe stomps on the floor, then sharply spins around to face away and swings their hips playfully side to side, next explosively jumps up and rotates 180 degrees mid-air, finally landing to face forward with one arm thrusting diagonally upward toward the sky and holding the victory pose.
Preserve the exact appearance, clothing, and footwear from the source image.
Locked frontal medium shot rises subtly with the jump, then freezes completely still on the final pose.
Sharp percussive footstep sounds alternating between heel and toe, fabric swishing, a whoosh on the jump, one solid landing sound. No music. No cheers. No clap.`,
        },
        {
          title: '댄싱타임',
          prompt: `The character is a native Korean speaker in her 20s. All dialogue must be spoken in Korean ONLY. English is strictly prohibited.
Voice requirements:
Native Korean pronunciation
Natural Korean intonation and rhythm
No foreign accent
Sounds like a professional Korean voice actor
Dialogue (Korean only):
Korean girl "제 춤 어때요? 괜찮나요?".
"그럼 이 춤은 어떤지 봐주세요~"
Performance:
Natural pauses
Realistic emotions
Not robotic
Not exaggerated
No subtitles
Subtitles, title, text is strictly prohibited.
After speaking, Energetic 6-second funky disco dance animation featuring dramatic Saturday Night Fever moves, spins, hip shakes, and a confident victory stance. No music. No cheers. No clap.`,
        },
        {
          title: '댄싱끝',
          prompt: `The character is a native Korean speaker in her 20s. All dialogue must be spoken in Korean ONLY. English is strictly prohibited.
Voice requirements:
Native Korean pronunciation
Natural Korean intonation and rhythm
No foreign accent
Sounds like a professional Korean voice actor
Dialogue (Korean only):
Korean girl "오늘 저와 함께 춤도 배우고 AI 영상도 배워보니까 어떠신가요?"
Performance:
Natural pauses
Realistic emotions
Not robotic
Not exaggerated
No subtitles
Subtitles, title, text is strictly prohibited.`,
        },
      ],
    },
    fly: {
      label: '날아가는 영상 프롬프트',
      sub: 'UP 1-3',
      prompt: `Ultra-realistic cinematic aerial rear follow shot using the uploaded image as exact identity reference. Camera strictly positioned behind the subject, slight rear-left tracking only. Wide-angle cinematic lens with subtle telephoto compression. Very far camera distance subject appears small in frame. Low altitude flight just above ocean surface. High-speed forward motion. Subject seen only from behind. Fully horizontal flying posture. Arms stretched outward like wings. Legs slightly bent. Clothing pushed backward from wind resistance. Environment: open ocean at sunset. Large ocean dominating frame. Infinite cinematic horizon in upper third. Smooth reflective water with extreme horizontal motion blur streaks. Subtle haze near horizon. Lighting: Low golden sunset directly in front of subject. Strong backlit rim light outlining arms and shoulders. Intense golden reflections across water surface. Sky gradient from peach and pink into deep blue ocean shadows. Hyper-realistic DSLR photography. No CGI look. Extreme 8K clarity. Mood: freedom, speed, solitude. Important: Camera must stay behind subject. No side profile. Subject far from camera. Water motion blur very strong.`,
    },
    interview: {
      label: '동물 인터뷰 프롬프트',
      sub: 'UP 1-4',
      promptUrl: 'https://chatgpt.com/g/g-69f5a7ea5a4c81919235dce165e93a8e-up-class-inteobyu-yeongsang-mandeulgi-jicim',
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

  // Load cache on mount (per-variant)
  useEffect(() => {
    let initial = '';
    try {
      const raw = localStorage.getItem(CACHE_KEY + variant);
      if (raw != null) initial = raw;
      else if (variant === 'talking') initial = DEFAULT_TALKING_JSON;
    } catch (e) {
      if (variant === 'talking') initial = DEFAULT_TALKING_JSON;
    }
    setRawJson(initial);
    setHydrated(true);
  }, [variant]);

  // Auto-save (per-variant)
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(CACHE_KEY + variant, rawJson); } catch (e) { }
  }, [rawJson, hydrated, variant]);

  // Parse JSON from the left editor
  const { parsed, parseError } = useMemo(() => {
    const raw = (rawJson || '').trim();
    if (!raw) return { parsed: null, parseError: '' };
    const cleaned = raw.replace(/^```(?:json|JSON)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
    for (const cand of [raw, cleaned]) {
      try {
        const o = JSON.parse(cand);
        if (o && typeof o === 'object') return { parsed: o, parseError: '' };
      } catch (e) { }
    }
    return { parsed: null, parseError: 'JSON 형식이 올바르지 않습니다.' };
  }, [rawJson]);

  // Extract editable dialogue lines from timeline
  const dialogues = useMemo(() => {
    const tl = parsed && Array.isArray(parsed.timeline) ? parsed.timeline : [];
    const out = [];
    tl.forEach((e, i) => {
      if (e && typeof e === 'object' && 'dialogue' in e) {
        out.push({
          index: i,
          time: e.time || `#${i + 1}`,
          scene_title: e.scene_title || '',
          dialogue: typeof e.dialogue === 'string' ? e.dialogue : String(e.dialogue ?? ''),
        });
      }
    });
    return out;
  }, [parsed]);

  // 왼쪽에 표시할 값 중심 프롬프트 텍스트
  const promptText = useMemo(() => renderPrompt(parsed), [parsed]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const copyText = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => showToast('복사됨!')).catch(() => showToast('복사 실패'));
  };

  // Edit a dialogue on the right → reflect back into the left JSON
  const onDialogueChange = (index, val) => {
    if (!parsed) return;
    const next = JSON.parse(JSON.stringify(parsed));
    if (Array.isArray(next.timeline) && next.timeline[index]) {
      next.timeline[index].dialogue = val;
      setRawJson(JSON.stringify(next, null, 2));
    }
  };

  const loadPaste = () => {
    const raw = (pasteInput || '').trim();
    if (!raw) { setPasteError('JSON을 붙여넣으세요.'); return; }
    const cleaned = raw.replace(/^```(?:json|JSON)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
    let obj = null;
    for (const cand of [raw, cleaned]) {
      try { const o = JSON.parse(cand); if (o && typeof o === 'object') { obj = o; break; } } catch (e) { }
    }
    if (!obj) { setPasteError('유효한 JSON이 아닙니다.'); return; }
    setRawJson(JSON.stringify(obj, null, 2));
    setPasteOpen(false);
    setPasteError('');
    setPasteInput('');
    showToast('불러오기 완료!');
  };

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
          background: var(--tb-bg);
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
          background: rgba(var(--tb-glass-bar-rgb),0.7);
          border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 100px;
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.4);
        }
        .tb-pill-primary {
          background: rgba(249,115,22,0.18);
          color: #fb923c;
          border: 1.5px solid rgba(249,115,22,0.45);
          backdrop-filter: blur(18px) saturate(180%);
          -webkit-backdrop-filter: blur(18px) saturate(180%);
          box-shadow:
            0 10px 24px rgba(249,115,22,0.22),
            inset 2px 2px 1px 0 rgba(255,255,255,0.18),
            inset -1px -1px 1px 1px rgba(255,255,255,0.08);
          transition: transform 0.4s cubic-bezier(0.175,0.885,0.32,2.2), box-shadow 0.3s, background 0.3s;
        }
        .tb-pill-primary:hover {
          background: rgba(249,115,22,0.28);
          transform: translateY(-1px) scale(1.03);
          box-shadow:
            0 16px 32px rgba(249,115,22,0.3),
            inset 2px 2px 1px 0 rgba(255,255,255,0.22),
            inset -1px -1px 1px 1px rgba(255,255,255,0.1);
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
            0 6px 16px rgba(0,0,0,0.3),
            inset 1.5px 1.5px 0.5px 0 rgba(255,255,255,0.14),
            inset -1px -1px 0.5px 1px rgba(255,255,255,0.06);
          transition: transform 0.4s cubic-bezier(0.175,0.885,0.32,2.2), box-shadow 0.3s, background 0.3s;
        }
        .tb-pill-ghost:hover {
          background: rgba(var(--tb-ghost-rgb),0.75);
          transform: translateY(-1px) scale(1.03);
        }
        .tb-pill-ghost:active {
          transform: translateY(1px) scale(0.94);
          box-shadow:
            0 3px 8px rgba(0,0,0,0.4),
            inset 1.5px 1.5px 2px 0 rgba(0,0,0,0.3),
            inset -1px -1px 0.5px 1px rgba(255,255,255,0.06);
          transition: transform 0.08s ease-out, box-shadow 0.08s ease-out;
        }
      `}</style>

      {/* Hero */}
      <section className="tb-hero">
        <div className="tb-hero-glow" />
        <div className="tb-hero-row">
          <span className="tb-hero-eyebrow">TB STUDY · {currentVariant.sub}</span>
          <h1 className="tb-hero-title">AI영상기초다지기</h1>
        </div>
      </section>

      {/* Glass bar (hovering over hero wave) */}
      <div className="tb-glass-bar">
        <Link href="/?c=up&s=step1" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full tb-pill-ghost text-xs sm:text-sm font-bold transition">
          <ArrowLeft className="w-3.5 h-3.5" />
          홈
        </Link>
        <span className="text-[11px] font-bold tracking-[0.18em] text-[#f97316] uppercase hidden sm:inline">TOOLB LAB</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => { setPasteOpen(true); setPasteError(''); setPasteInput(''); }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full tb-pill-primary text-xs sm:text-sm font-bold transition"
          >
            <FileJson className="w-3.5 h-3.5" />
            JSON <span className="hidden sm:inline">붙여넣기</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:flex-1 md:min-h-0 w-full px-4 pt-6 pb-4 gap-4 2xl:px-6">
        {/* Sidebar */}
        <aside className="w-full md:w-[300px] flex-shrink-0 bg-[var(--tb-surface)] border border-[var(--tb-border)] rounded-2xl shadow-[0_10px_30px_-14px_rgba(0,0,0,0.18)] md:overflow-y-auto">
          {/* Tools */}
          <div className="p-4 border-b border-[var(--tb-border)]">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-[var(--tb-text-muted)]">
              <Wrench className="w-3 h-3" />
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
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold transition ${toolView === 'frame-extractor'
                  ? 'tb-pill-primary'
                  : 'text-[var(--tb-text)] bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] tb-press-soft'
                  }`}
              >
                <Film className="w-4 h-4" />
                프레임추출기
              </button>
              <button
                onClick={() => setToolView(toolView === 'watermark-remover' ? null : 'watermark-remover')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold transition ${toolView === 'watermark-remover'
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

          {/* Gem guide */}
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-[var(--tb-text-muted)]">
              <Gem className="w-3 h-3" />
              젬 가이드
            </div>
            <a
              href="https://chatgpt.com/g/g-6a44d63463988191ae075e76e10e5bfa-ai-inpeulrueonseo-mandeulgi-gicogwajeong"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[var(--tb-surface)] border border-[var(--tb-border)] hover:bg-[var(--tb-surface-2)] text-[var(--tb-text)] text-sm font-bold shadow-[0_1px_2px_rgba(0,0,0,0.04)] tb-press-soft"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#f97316]" />
              지침열기
            </a>
            <a
              href="https://kr.pinterest.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[var(--tb-surface)] border border-[var(--tb-border)] hover:bg-[var(--tb-surface-2)] text-[var(--tb-text)] text-sm font-bold shadow-[0_1px_2px_rgba(0,0,0,0.04)] tb-press-soft"
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
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[var(--tb-surface)] border border-[var(--tb-border)] hover:bg-[var(--tb-surface-2)] text-[var(--tb-text)] text-sm font-bold shadow-[0_1px_2px_rgba(0,0,0,0.04)] tb-press-soft"
            >
              <svg className="w-3.5 h-3.5 text-[#1a73e8]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M11.04 19.32Q12 18.72 12.84 17.76Q13.68 16.8 14.04 15.6H11.04V19.32ZM9 19.68V15.6H5.58Q6.18 17.04 7.32 18.06Q8.46 19.08 9 19.68ZM5.1 14.4H9V10.2H4.62Q4.44 10.8 4.38 11.28Q4.32 11.76 4.32 12.24Q4.32 13.08 4.5 13.68Q4.68 14.28 5.1 14.4ZM10.2 14.4H13.8V10.2H10.2V14.4ZM14.4 9H19.08Q18.72 8.04 18.12 7.2Q17.52 6.36 16.74 5.7Q15.72 6.48 14.88 7.08Q14.04 7.68 14.4 9ZM9 9H13.44Q13.08 7.68 12.36 6.6Q11.64 5.52 10.68 4.68Q9.72 5.52 9 6.6Q8.28 7.68 9 9ZM4.92 9H9.36Q9 8.04 8.7 7.2Q8.4 6.36 7.98 5.64Q7.08 6.24 6.36 7.08Q5.64 7.92 4.92 9ZM12 21.6Q10.68 21.6 9.42 21.12Q8.16 20.64 7.14 19.86Q6.12 19.08 5.34 18.06Q4.56 17.04 4.08 15.78Q3.6 14.52 3.6 13.2Q3.6 10.68 5.04 8.64Q6.48 6.6 8.76 5.52Q8.16 4.56 7.68 3.48Q7.2 2.4 6.96 1.2H8.16Q8.4 2.16 8.76 3.06Q9.12 3.96 9.6 4.68Q10.32 4.2 11.16 3.96Q12 3.72 12 3.72Q12 3.72 12.84 3.96Q13.68 4.2 14.4 4.68Q14.88 3.96 15.24 3.06Q15.6 2.16 15.84 1.2H17.04Q16.8 2.4 16.32 3.48Q15.84 4.56 15.24 5.52Q17.52 6.6 18.96 8.64Q20.4 10.68 20.4 13.2Q20.4 14.52 19.92 15.78Q19.44 17.04 18.66 18.06Q17.88 19.08 16.86 19.86Q15.84 20.64 14.58 21.12Q13.32 21.6 12 21.6Z" />
              </svg>
              제미나이
            </a>
            <a
              href="https://grok.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[var(--tb-surface)] border border-[var(--tb-border)] hover:bg-[var(--tb-surface-2)] text-[var(--tb-text)] text-sm font-bold shadow-[0_1px_2px_rgba(0,0,0,0.04)] tb-press-soft"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[var(--tb-text-muted)]" />
              Grok 바로가기
            </a>
          </div>

          {/* Character sheet (talking) */}
          {variant === 'talking' && (
            <div className="p-4 border-t border-[var(--tb-border)]">
              <button
                onClick={() => copyText(CHARACTER_SHEET_PROMPT)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-sm font-bold text-white hover:opacity-90 tb-press"
                style={{
                  background: 'linear-gradient(112.34deg, #fb7185 -38.67%, #f43f5e 99.56%)',
                  boxShadow: '0 10px 24px rgba(244, 63, 94, 0.3)',
                }}
              >
                <Copy className="w-4 h-4" />
                캐릭터시트
              </button>
            </div>
          )}

          {/* Variant prompt */}
          {variant !== 'talking' && (
          <div className="p-4 border-t border-[var(--tb-border)]">
            {currentVariant.promptUrl ? (
              <a
                href={currentVariant.promptUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-sm font-bold text-white hover:opacity-90 tb-press"
                style={{
                  background: 'linear-gradient(112.34deg, #fb7185 -38.67%, #f43f5e 99.56%)',
                  boxShadow: '0 10px 24px rgba(244, 63, 94, 0.3)',
                }}
              >
                <ExternalLink className="w-4 h-4" />
                {currentVariant.label}
              </a>
            ) : (
              <button
                onClick={() => setSpeakPromptOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-sm font-bold text-white hover:opacity-90 tb-press"
                style={{
                  background: 'linear-gradient(112.34deg, #fb7185 -38.67%, #f43f5e 99.56%)',
                  boxShadow: '0 10px 24px rgba(244, 63, 94, 0.3)',
                }}
              >
                <Mic className="w-4 h-4" />
                {currentVariant.label}
              </button>
            )}
          </div>
          )}
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col md:overflow-hidden bg-[var(--tb-surface)] border border-[var(--tb-border)] rounded-2xl shadow-[0_10px_30px_-14px_rgba(0,0,0,0.18)]">
          {toolView === 'frame-extractor' ? (
            <FrameExtractor accentColor="#f97316" />
          ) : toolView === 'watermark-remover' ? (
            <WatermarkRemover accentColor="#f97316" />
          ) : (
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
              {/* Left: rendered prompt values (not raw JSON) */}
              <section className="flex flex-col min-h-0 lg:w-1/2 border-b lg:border-b-0 lg:border-r border-[var(--tb-border)]">
                <div className="flex-shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--tb-border)]">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--tb-text)] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#f97316]" />
                    프롬프트
                  </span>
                  <button
                    onClick={() => copyText(promptText)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] border border-[var(--tb-border)] text-[12px] font-bold text-[var(--tb-text)] tb-press-soft"
                  >
                    <Copy className="w-3 h-3" />
                    복사
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-4">
                  {promptText ? (
                    <div className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[var(--tb-text)] select-text">
                      {promptText}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-center text-[var(--tb-text-muted)] text-sm px-6 leading-relaxed">
                      {parseError
                        ? 'JSON 형식이 올바르지 않습니다. 다시 붙여넣어 주세요.'
                        : '상단 “JSON 붙여넣기” 로 프롬프트를 불러오세요.'}
                    </div>
                  )}
                </div>
              </section>

              {/* Right: dialogue editor */}
              <section className="flex flex-col min-h-0 lg:w-1/2">
                <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--tb-border)]">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--tb-text)] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#f97316]" />
                    대사 수정
                  </span>
                  <p className="text-[12px] text-[var(--tb-text-muted)] mt-0.5">
                    대사를 수정하면 왼쪽 JSON 에 자동 반영됩니다.
                  </p>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                  {dialogues.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-[var(--tb-text-muted)] text-sm px-6 leading-relaxed">
                      {parseError
                        ? 'JSON 을 올바르게 입력하면 대사가 여기에 표시됩니다.'
                        : '대사(dialogue) 가 포함된 timeline 이 없습니다.'}
                    </div>
                  ) : (
                    dialogues.map((d) => (
                      <div
                        key={d.index}
                        className="bg-[var(--tb-surface)] border border-[var(--tb-border)] rounded-2xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
                      >
                        <div className="flex items-center gap-2 mb-1.5 text-[11px] font-bold text-[var(--tb-text-muted)]">
                          <span className="px-2 py-0.5 rounded-full bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[#f97316] flex-shrink-0">
                            {d.time}
                          </span>
                          <span className="truncate">{d.scene_title}</span>
                        </div>
                        <textarea
                          rows={2}
                          value={d.dialogue}
                          placeholder="대사 입력..."
                          onChange={(e) => onDialogueChange(d.index, e.target.value)}
                          className="w-full resize-none text-[14px] leading-relaxed text-[var(--tb-text)] py-2 px-3 rounded-xl bg-[var(--tb-surface-2)] border border-[var(--tb-border)] focus:outline-none focus:border-[#f97316] focus:ring-[3px] focus:ring-[#f97316]/20"
                        />
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {/* Paste JSON Modal */}
      {pasteOpen && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0f172a]/60 backdrop-blur-md"
          onClick={() => setPasteOpen(false)}
        >
          <div
            className="bg-[var(--tb-surface)] rounded-2xl border border-[var(--tb-border)] shadow-[0_24px_60px_rgba(0,0,0,0.6)] w-[560px] max-w-[95vw] max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--tb-border)]">
              <span className="text-base font-bold text-[var(--tb-text)] uppercase tracking-wider flex items-center gap-2">
                <FileJson className="w-4 h-4 text-[#f97316]" />
                JSON 붙여넣기
              </span>
              <button
                onClick={() => setPasteOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] text-[var(--tb-text-muted)] tb-press-soft"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
              <p className="text-sm text-[var(--tb-text-muted)] leading-relaxed">
                JSON 프롬프트를 붙여넣으세요. 왼쪽에는 값이 읽기 좋게 표시되고, 오른쪽에서 대사만 수정할 수 있습니다.
              </p>
              <textarea
                value={pasteInput}
                onChange={(e) => setPasteInput(e.target.value)}
                spellCheck={false}
                className="w-full h-[240px] resize-y font-mono text-[13px] leading-relaxed p-3 rounded-xl bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[var(--tb-text)] focus:outline-none focus:border-[#f97316] focus:ring-[3px] focus:ring-[#f97316]/20"
                placeholder='{"project_title": "...", "timeline": [ ... ]}'
              />
              {pasteError && (
                <div className="text-sm text-[#fca5a5] bg-[#450a0a] border border-[#7f1d1d] rounded-xl px-3 py-2 font-semibold">
                  {pasteError}
                </div>
              )}
            </div>
            <div className="flex justify-between gap-2 px-5 py-3 border-t border-[var(--tb-border)]">
              {variant === 'talking' ? (
                <button
                  onClick={() => { setPasteInput(DEFAULT_TALKING_JSON); setPasteError(''); }}
                  className="px-4 py-1.5 rounded-full tb-pill-ghost text-sm font-bold transition"
                >
                  예시 채우기
                </button>
              ) : <span />}
              <div className="flex gap-2">
                <button
                  onClick={() => setPasteOpen(false)}
                  className="px-4 py-1.5 rounded-full tb-pill-ghost text-sm font-bold transition"
                >
                  취소
                </button>
                <button
                  onClick={loadPaste}
                  className="px-4 py-1.5 rounded-full tb-pill-primary text-sm font-bold transition"
                >
                  불러오기
                </button>
              </div>
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
            className="bg-[var(--tb-surface)] rounded-2xl border border-[var(--tb-border)] shadow-[0_24px_60px_rgba(0,0,0,0.6)] w-[640px] max-w-[95vw] max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--tb-border)]">
              <span className="text-base font-bold text-[var(--tb-text)] uppercase tracking-wider flex items-center gap-2">
                <Mic className="w-4 h-4 text-[#fb7185]" />
                {currentVariant.label}
              </span>
              <button
                onClick={() => setSpeakPromptOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] text-[var(--tb-text-muted)] tb-press-soft"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
              {currentVariant.prompts ? (
                currentVariant.prompts.map((p, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[var(--tb-text)] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#fb7185]" />
                        {p.title}
                      </span>
                      <button
                        onClick={() => copyText(p.prompt)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold text-white hover:opacity-90 tb-press"
                        style={{
                          background: 'linear-gradient(112.34deg, #fb7185 -38.67%, #f43f5e 99.56%)',
                          boxShadow: '0 6px 14px rgba(244, 63, 94, 0.25)',
                        }}
                      >
                        <Copy className="w-3 h-3" />
                        복사하기
                      </button>
                    </div>
                    <textarea
                      value={p.prompt}
                      readOnly
                      className="w-full h-[180px] resize-none font-mono text-[13px] leading-relaxed p-3 rounded-xl bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[var(--tb-text)] focus:outline-none focus:border-[#f97316] focus:ring-[3px] focus:ring-[#f97316]/20"
                    />
                  </div>
                ))
              ) : (
                <textarea
                  value={SPEAK_PROMPT}
                  readOnly
                  className="w-full h-[420px] resize-none font-mono text-[13px] leading-relaxed p-3 rounded-xl bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[var(--tb-text)] focus:outline-none focus:border-[#f97316] focus:ring-[3px] focus:ring-[#f97316]/20"
                />
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-[var(--tb-border)]">
              <button
                onClick={() => setSpeakPromptOpen(false)}
                className="px-4 py-1.5 rounded-full tb-pill-ghost text-sm font-bold transition"
              >
                닫기
              </button>
              {!currentVariant.prompts && (
                <button
                  onClick={() => copyText(SPEAK_PROMPT)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold text-white hover:opacity-90 tb-press"
                  style={{
                    background: 'linear-gradient(112.34deg, #fb7185 -38.67%, #f43f5e 99.56%)',
                    boxShadow: '0 10px 24px rgba(244, 63, 94, 0.3)',
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                  복사하기
                </button>
              )}
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
