'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Upload, Copy, ExternalLink, Gem, X,
  Clapperboard, Image as ImageIcon, Film, MessageSquare, Music, Scissors, Droplets, Wrench, Trash2,
  User,
} from 'lucide-react';
import dynamic from 'next/dynamic';
const FrameExtractor = dynamic(() => import('@/app/components/FrameExtractor'), { ssr: false });
const WatermarkRemover = dynamic(() => import('@/app/components/WatermarkRemover'), { ssr: false });

const CACHE_KEY = 'toolb_step4_ad_v3';
const CHAR_CACHE_KEY = 'toolb_step4_character';

const ACTS = ['Hook', 'Build', 'Climax', 'CTA'];

const ACT_COLORS = [
  { dot: '#ef4444', label: '기', english: 'Hook' },
  { dot: '#f59e0b', label: '승', english: 'Build' },
  { dot: '#8b5cf6', label: '전', english: 'Climax' },
  { dot: '#10b981', label: '결', english: 'CTA' },
];

const NARRATIVE_ROLES = [
  'Hook', 'Setup', 'Problem', 'Escalation', 'Turn', 'Decision',
  'Action', 'Obstacle', 'Reveal', 'Experience', 'Peak', 'CTA',
];

const ACT_MAP = {
  // 기 (Hook)
  'hook': 'Hook', 'setup': 'Hook', 'opening': 'Hook', 'introduction': 'Hook', 'intro': 'Hook',
  '후킹': 'Hook', '도입': 'Hook', '기': 'Hook', 'ki': 'Hook',

  // 승 (Build)
  'problem': 'Build', 'escalation': 'Build', 'rising_action': 'Build', 'development': 'Build',
  'build': 'Build', '전개': 'Build', '승': 'Build', 'seung': 'Build',

  // 전 (Climax)
  'turn': 'Climax', 'decision': 'Climax', 'action': 'Climax', 'obstacle': 'Climax',
  'reveal': 'Climax', 'experience': 'Climax', 'peak': 'Climax', 'climax': 'Climax',
  'twist': 'Climax', 'solution': 'Climax', 'confrontation': 'Climax',
  '절정': 'Climax', '전': 'Climax', 'jeon': 'Climax',

  // 결 (CTA)
  'resolution': 'CTA', 'falling_action': 'CTA', 'cta': 'CTA', 'ending': 'CTA',
  'conclusion': 'CTA', 'call_to_action': 'CTA', 'outro': 'CTA',
  '마무리': 'CTA', '결말': 'CTA', '결': 'CTA', 'gyeol': 'CTA',
};

const normalizeAct = (v) => {
  const key = String(v || '').toLowerCase();
  return ACT_MAP[key] || ACT_MAP[v] || 'Hook';
};

const defaultRoleForScene = (num, total = 12) => {
  if (total === 12) return NARRATIVE_ROLES[(num - 1) % 12];
  if (num === 1) return 'Hook';
  if (num === total) return 'CTA';
  const mid = total / 2;
  if (num <= mid) return 'Setup';
  return 'Action';
};

function cleanJson(raw) {
  const cleaned = raw.trim()
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

function parseSceneNumber(sceneId, fallback) {
  if (typeof sceneId === 'number') return sceneId;
  if (typeof sceneId === 'string') {
    const m = sceneId.match(/\d+/);
    if (m) return parseInt(m[0], 10);
  }
  return fallback;
}

function buildImagePromptText(scene) {
  const parts = [];

  // v3.8: image_prompt is a single string
  if (typeof scene.image_prompt === 'string' && scene.image_prompt.trim()) {
    parts.push(scene.image_prompt.trim());
  } else {
    // v3.0 legacy: image_prompt is an object
    const ip = scene.image_prompt || {};
    const bg = scene.background || {};
    const cam = scene.camera || {};

    if (ip.subject) {
      parts.push(ip.subject);
    } else if (scene.description) {
      parts.push(scene.description);
    }
    if (ip.description) parts.push(ip.description);

    if (ip.character_in_scene) {
      const c = ip.character_in_scene;
      const charParts = [
        c.description,
        c.action && `action: ${c.action}`,
        c.expression && `expression: ${c.expression}`,
        c.position && `position: ${c.position}`,
        c.facing && `facing: ${c.facing}`,
      ].filter(Boolean);
      if (charParts.length > 0) parts.push(`Character: ${charParts.join(', ')}`);
    } else if (scene.character_action) {
      parts.push(`Character action: ${scene.character_action}`);
    }

    if (ip.scene_composition) parts.push(`Composition: ${ip.scene_composition}`);

    const bgParts = [
      bg.location,
      bg.description_ko,
      bg.color_grading && `color: ${bg.color_grading}`,
      bg.lighting && `lighting: ${bg.lighting}`,
      bg.mood && `mood: ${bg.mood}`,
    ].filter(Boolean);
    if (bgParts.length > 0) parts.push(`Background: ${bgParts.join(', ')}`);

    const camParts = [cam.shot_type, cam.angle, cam.lens].filter(Boolean);
    if (camParts.length > 0) parts.push(`Camera: ${camParts.join(', ')}`);

    if (ip.text_overlay?.enabled) {
      const t = ip.text_overlay;
      parts.push(`Text overlay: "${t.text || ''}" (${t.language || 'ko'}, ${t.position || 'lower third'})`);
    }

    if (ip.quality) parts.push(`Quality: ${ip.quality}`);
    if (ip.aspect_ratio) parts.push(`Aspect: ${ip.aspect_ratio}`);

    if (scene.visual_rules) parts.push(`Visual rules: ${scene.visual_rules}`);

    if (ip.negative) parts.push(`Negative: ${ip.negative}`);
  }

  // v3.8: negative_prompt at scene level
  if (scene.negative_prompt) {
    parts.push(`Negative: ${scene.negative_prompt}`);
  }

  // NOTE: scene.subtitle is post-edit reference data (for CapCut/AE).
  // Do NOT include in image prompt — stored on scene object for separate display.

  return parts.join('\n');
}

function buildVideoPromptBase(scene) {
  const parts = [];

  // v3.8: video_prompt is a single string; motion fields are at scene level
  if (typeof scene.video_prompt === 'string' && scene.video_prompt.trim()) {
    parts.push(scene.video_prompt.trim());
    if (scene.camera_motion) parts.push(`Camera motion: ${scene.camera_motion}`);
    if (scene.character_motion) parts.push(`Character motion: ${scene.character_motion}`);
    if (scene.environment_motion) parts.push(`Environment: ${scene.environment_motion}`);
    if (scene.end_frame_description) parts.push(`End frame: ${scene.end_frame_description}`);
    if (scene.scene_connection?.transition_type) {
      parts.push(`Transition: ${scene.scene_connection.transition_type}`);
    }
    return parts.join('\n');
  }

  // v3.0 legacy: delegated to legacy builder below
  return buildVideoPromptLegacy(scene);
}

function buildVideoPromptLegacy(scene) {
  const parts = [];

  // v3.0 legacy: video_prompt is an object
  const vp = scene.video_prompt || scene;

  if (vp.frame_strategy) {
    const fs = vp.frame_strategy;
    parts.push(`Frame strategy: ${fs.type || ''}${fs.note ? ` — ${fs.note}` : ''}`);
  }
  if (vp.starting_image) parts.push(`Starting image: ${vp.starting_image}`);
  if (vp.ending_image) parts.push(`Ending image: ${vp.ending_image}`);

  if (vp.camera_motion && typeof vp.camera_motion === 'object') {
    const cm = vp.camera_motion;
    const cmParts = [cm.type, cm.speed && `speed: ${cm.speed}`, cm.direction && `direction: ${cm.direction}`].filter(Boolean);
    if (cmParts.length > 0) parts.push(`Camera motion: ${cmParts.join(', ')}`);
  } else if (typeof vp.camera_motion === 'string') {
    parts.push(`Camera motion: ${vp.camera_motion}`);
  }

  if (vp.character_motion && typeof vp.character_motion === 'object') {
    const m = vp.character_motion;
    const mParts = [
      m.action,
      m.pace && `pace: ${m.pace}`,
      m.expression_change && `expression: ${m.expression_change}`,
      m.facing_change && `facing: ${m.facing_change}`,
    ].filter(Boolean);
    if (mParts.length > 0) parts.push(`Character motion: ${mParts.join(', ')}`);
  } else if (typeof vp.character_motion === 'string') {
    parts.push(`Character motion: ${vp.character_motion}`);
  }

  if (vp.scene_mood) parts.push(`Mood: ${vp.scene_mood}`);
  if (vp.environment_motion) parts.push(`Environment: ${vp.environment_motion}`);

  if (vp.sound_design) {
    const sd = vp.sound_design;
    const sfxArr = Array.isArray(sd.sfx) ? sd.sfx : (sd.sfx ? [sd.sfx] : []);
    const sdParts = [sd.bgm && `BGM: ${sd.bgm}`, sfxArr.length > 0 && `SFX: ${sfxArr.join(', ')}`].filter(Boolean);
    if (sdParts.length > 0) parts.push(`Sound: ${sdParts.join(' / ')}`);
  }

  if (vp.end_frame_description) parts.push(`End frame: ${vp.end_frame_description}`);

  if (vp.duration_sec) parts.push(`Duration: ${vp.duration_sec}s`);
  if (vp.aspect_ratio) parts.push(`Aspect: ${vp.aspect_ratio}`);

  return parts.join('\n');
}

function extractDialogueText(d) {
  // Only text + delivery (for dialogue textarea). Timing/SFX live in meta.
  if (!d) return '';
  if (typeof d === 'string') return d;
  if (d.enabled === false) return '';
  if (d.versions && typeof d.versions === 'object') {
    return Object.entries(d.versions)
      .filter(([, v]) => v?.text)
      .map(([lang, v]) => `[${lang}] ${v.text}${v.delivery ? ` (${v.delivery})` : ''}`)
      .join('\n');
  }
  const parts = [];
  if (d.text) parts.push(d.text);
  if (d.delivery) parts.push(`(${d.delivery})`);
  return parts.join(' ');
}

function extractDialogueMeta(d) {
  if (!d || typeof d !== 'object') return { timing: '', sfx: '' };
  return {
    timing: d.timing || '',
    sfx: d.sfx || '',
  };
}

function composeDialogueLine(dialogueText, meta) {
  const hasDialogue = dialogueText && dialogueText.trim();
  const hasTiming = meta?.timing;
  const hasSfx = meta?.sfx;
  if (!hasDialogue && !hasTiming && !hasSfx) return '';

  const pieces = [];
  if (hasDialogue) pieces.push(dialogueText.trim());
  if (hasTiming) pieces.push(`@ ${meta.timing}`);
  if (hasSfx) {
    pieces.push((hasDialogue || hasTiming) ? `/ SFX: ${meta.sfx}` : `SFX: ${meta.sfx}`);
  }
  return pieces.join(' ');
}

// Back-compat wrapper — callers of extractDialogue get full text including meta.
function extractDialogue(videoScene) {
  const d = videoScene?.dialogue || videoScene?.video_prompt?.dialogue;
  return extractDialogueText(d);
}

function parseImagePrompts(raw) {
  const json = cleanJson(raw);

  const sceneArr = Array.isArray(json.scenes) ? json.scenes
    : Array.isArray(json.image_prompts) ? json.image_prompts
    : Array.isArray(json.storyboard?.scenes) ? json.storyboard.scenes
    : null;

  if (!sceneArr || sceneArr.length === 0) {
    throw new Error('"scenes" 또는 "image_prompts" 배열이 필요합니다.');
  }

  const project = json.project || {};
  const total = sceneArr.length;
  const sharedNegative = project.shared_negative || '';

  const scenes = sceneArr.map((s, i) => {
    const sceneNumber = parseSceneNumber(s.scene_id ?? s.id, i + 1);
    const narrative = s.narrative_role || defaultRoleForScene(sceneNumber, total);
    const act = normalizeAct(narrative);

    // v3.8: background_description_ko (flat string) / v3.0: background.description_ko (object)
    const description = s.background_description_ko
      || (typeof s.background === 'object' && s.background?.description_ko)
      || s.character_action
      || s.description
      || '';
    const emotion = (typeof s.background === 'object' && s.background?.mood) || s.emotion || '';

    // Fallback negative to project.shared_negative (v3.8)
    const sceneForPrompt = {
      ...s,
      negative_prompt: s.negative_prompt || sharedNegative,
    };

    return {
      id: String(s.scene_id ?? s.id ?? `scene_${sceneNumber}`),
      scene_number: sceneNumber,
      act,
      narrative_role: narrative,
      time_range: s.time_range || '',
      background_group: s.background_group || '',
      ad_role: s.ad_role || '',
      product_exposure: s.product_exposure || null,
      subtitle: s.subtitle || null,
      title: narrative || s.title || `Scene ${sceneNumber}`,
      description,
      emotion,
      imageUpload: '',
      prompts: {
        image: {
          id: `img_${String(sceneNumber).padStart(2, '0')}`,
          tool: 'image_gen',
          prompt: buildImagePromptText(sceneForPrompt),
        },
        video: {
          id: `vid_${String(sceneNumber).padStart(2, '0')}`,
          tool: 'video_gen',
          duration: 6,
          prompt: '',
        },
      },
      dialogue: '',
    };
  });

  scenes.sort((a, b) => a.scene_number - b.scene_number);

  const title = project.brand || json.project_title || json.title || '광고영상';
  const aspect = project.aspect_ratio || '9:16';
  const renderingStyle = project.rendering_style || json.style || '';

  return {
    id: project.character_ref || json.id || `SB-${Date.now()}`,
    title,
    meta: {
      aspect_ratio: aspect,
      total_scenes: scenes.length,
      brand: project.brand || '',
      rendering_style: renderingStyle,
      narrative_arc: project.narrative_arc || '',
      total_duration_sec: project.total_duration_sec || 0,
      character_ref: project.character_ref || json.character || '',
      genre_tone: project.genre_tone || '',
      concept_direction: project.concept_direction || '',
      brand_assets: project.brand_assets || null,
      ad_balance_check: project.ad_balance_check || null,
      shared_negative: sharedNegative,
    },
    scenes,
  };
}

function parseVideoPrompts(raw) {
  const json = cleanJson(raw);

  const sceneArr = Array.isArray(json.scenes) ? json.scenes
    : Array.isArray(json.video_prompts) ? json.video_prompts
    : null;

  if (!sceneArr || sceneArr.length === 0) {
    throw new Error('"scenes" 또는 "video_prompts" 배열이 필요합니다.');
  }

  return sceneArr.map((s, i) => {
    const sceneNumber = parseSceneNumber(s.scene_id ?? s.id, i + 1);
    const baseText = buildVideoPromptBase(s);
    const d = s.dialogue || s.video_prompt?.dialogue;
    const dialogueText = extractDialogueText(d);
    const dialogueMeta = extractDialogueMeta(d);
    const dialogueLine = composeDialogueLine(dialogueText, dialogueMeta);
    const promptText = [baseText, dialogueLine].filter(Boolean).join('\n');

    return {
      scene_id: String(s.scene_id ?? s.id ?? `scene_${sceneNumber}`),
      scene_number: sceneNumber,
      baseText,
      dialogue: dialogueText,
      dialogueMeta,
      prompt_text: promptText,
    };
  });
}

function mergeVideoPromptsIntoStoryboard(storyboard, videoScenes) {
  if (!storyboard || !Array.isArray(storyboard.scenes)) return storyboard;

  const byNumber = new Map();
  const byId = new Map();
  videoScenes.forEach((v) => {
    byNumber.set(v.scene_number, v);
    byId.set(v.scene_id, v);
  });

  let matched = 0;
  const updated = storyboard.scenes.map((s) => {
    const v = byId.get(s.id) || byNumber.get(s.scene_number);
    if (!v) return s;
    matched += 1;
    return {
      ...s,
      prompts: {
        ...s.prompts,
        video: {
          ...s.prompts.video,
          prompt: v.prompt_text,
          baseText: v.baseText,
        },
      },
      dialogue: v.dialogue,
      dialogueMeta: v.dialogueMeta,
    };
  });

  return { storyboard: { ...storyboard, scenes: updated }, matched, total: videoScenes.length };
}

function parseCharacter(raw) {
  let cleaned = raw.trim()
    .replace(/^```(?:json|JSON)?\s*\n?/gm, '')
    .replace(/\n?```\s*$/gm, '')
    .trim();
  if (!cleaned) throw new Error('JSON 내용을 입력해주세요.');

  let json;
  try { json = JSON.parse(cleaned); }
  catch (e) { throw new Error(`JSON 파싱 오류: ${e.message}`); }

  if (json.character && typeof json.character === 'object') json = json.character;

  const meta = json.meta || {};
  const name = json.name || meta.name || '';
  const role = meta.role || json.role || json.archetype || '';

  const promptParts = [];

  // v3.8: image_prompt is a single string
  if (typeof json.image_prompt === 'string' && json.image_prompt.trim()) {
    promptParts.push(json.image_prompt.trim());
  } else if (json.image_prompt && typeof json.image_prompt === 'object') {
    // v3.0 legacy: image_prompt is an object
    const ip = json.image_prompt;
    const corePositive = [ip.subject, ip.description, ip.composition, ip.quality]
      .filter(Boolean).join('. ');
    if (corePositive) promptParts.push(corePositive);
  } else {
    // fallback header
    const styleStr = typeof json.style === 'string' ? json.style : '';
    const header = [
      name && `Character: ${name}`,
      role && `(${role})`,
      styleStr && `Style: ${styleStr}`,
    ].filter(Boolean).join(' ');
    if (header) promptParts.push(header);
  }

  // Consistency identifiers (v3.8)
  if (Array.isArray(json.consistency_identifiers) && json.consistency_identifiers.length > 0) {
    promptParts.push(`Consistency identifiers: ${json.consistency_identifiers.join(' | ')}`);
  }

  // Legacy v3.0 fallback fields — only added if v3.8 image_prompt missing
  if (typeof json.image_prompt !== 'string') {
    const visual = json.visual_identity || {};
    const appearance = json.appearance || {};
    const outfit = appearance.outfit || {};
    const facial = appearance.facial_features || {};
    const rules = json.consistency_rules || {};
    const styleObj = (json.style && typeof json.style === 'object') ? json.style : {};

    const visualLines = [
      visual.age && `- Age: ${visual.age}`,
      visual.physique && `- Physique: ${visual.physique}`,
      visual.face && `- Face: ${visual.face}`,
      visual.outfit && `- Outfit: ${visual.outfit}`,
      visual.key_item && `- Key item: ${visual.key_item}`,
    ].filter(Boolean);
    if (visualLines.length > 0) promptParts.push(`Visual identity:\n${visualLines.join('\n')}`);

    const appearanceLines = [
      appearance.body_type && `- Body: ${appearance.body_type}`,
      outfit.top && `- Top: ${outfit.top}`,
      outfit.bottom && `- Bottom: ${outfit.bottom}`,
      outfit.accessory && `- Accessory: ${outfit.accessory}`,
      outfit.tool && `- Tool: ${outfit.tool}`,
      facial.hair && `- Hair: ${facial.hair}`,
      facial.eyes && `- Eyes: ${facial.eyes}`,
      facial.default_expression && `- Default expression: ${facial.default_expression}`,
    ].filter(Boolean);
    if (appearanceLines.length > 0) promptParts.push(`Appearance:\n${appearanceLines.join('\n')}`);

    if (json.personality) promptParts.push(`Personality: ${json.personality}`);

    const styleLines = [
      styleObj.rendering && `- Rendering: ${styleObj.rendering}`,
      styleObj.mood && `- Mood: ${styleObj.mood}`,
      styleObj.lighting_theme && `- Lighting: ${styleObj.lighting_theme}`,
    ].filter(Boolean);
    if (styleLines.length > 0) promptParts.push(`Style:\n${styleLines.join('\n')}`);

    const rulesLines = [
      rules.color_palette && `- Color palette: ${rules.color_palette}`,
      rules.lighting && `- Lighting: ${rules.lighting}`,
      rules.camera_angle && `- Camera angle: ${rules.camera_angle}`,
    ].filter(Boolean);
    if (rulesLines.length > 0) promptParts.push(`Consistency rules:\n${rulesLines.join('\n')}`);
  }

  // Expressions
  const expressions = Array.isArray(json.expressions)
    ? json.expressions
        .map((e) => {
          const id = e?.id || '';
          const desc = e?.description || '';
          if (!id && !desc) return '';
          return id ? `- ${id}: ${desc}` : `- ${desc}`;
        })
        .filter(Boolean)
    : [];
  if (expressions.length > 0) promptParts.push(`Expressions:\n${expressions.join('\n')}`);

  // Negative prompt — v3.8 top-level, or v3.0 nested
  const negative = json.negative_prompt
    || (json.image_prompt && typeof json.image_prompt === 'object' && json.image_prompt.negative)
    || '';
  if (negative) promptParts.push(`Negative: ${negative}`);

  const prompt = promptParts.join('\n');

  if (!prompt && !name) {
    throw new Error('캐릭터 정보를 찾을 수 없습니다. name/image_prompt 중 하나 이상이 필요합니다.');
  }

  return {
    character_id: json.character_id || `char_${Date.now()}`,
    name,
    role,
    aspect_ratio: '',
    prompt,
    imageUpload: '',
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
          <img
            src={image}
            alt="uploaded"
            className="w-full h-auto max-h-[70vh] object-contain block"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center pointer-events-none">
            <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
              교체
            </span>
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

export default function Step4Page() {
  const [storyboard, setStoryboard] = useState(null);
  const [character, setCharacter] = useState(null);
  const [activeAct, setActiveAct] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState('image_prompts');
  const [jsonInput, setJsonInput] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [toast, setToast] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [toolView, setToolView] = useState(null);
  const [pendingScrollId, setPendingScrollId] = useState(null);
  const sceneRefs = useRef({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.scenes)) setStoryboard(parsed);
      }
      const charRaw = localStorage.getItem(CHAR_CACHE_KEY);
      if (charRaw) {
        const parsedChar = JSON.parse(charRaw);
        if (parsedChar && typeof parsedChar.prompt === 'string') setCharacter(parsedChar);
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

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (character) localStorage.setItem(CHAR_CACHE_KEY, JSON.stringify(character));
      else localStorage.removeItem(CHAR_CACHE_KEY);
    } catch (e) { }
  }, [character, hydrated]);

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

  const updateDialogue = (sceneId, v) => {
    setStoryboard((prev) => prev && {
      ...prev,
      scenes: prev.scenes.map((s) => {
        if (s.id !== sceneId) return s;
        const meta = s.dialogueMeta || {};
        const oldLine = composeDialogueLine(s.dialogue, meta);
        const newLine = composeDialogueLine(v, meta);

        let newVideoPrompt = s.prompts?.video?.prompt || '';
        if (oldLine && newVideoPrompt.includes(oldLine)) {
          if (newLine) {
            newVideoPrompt = newVideoPrompt.replace(oldLine, newLine);
          } else {
            newVideoPrompt = newVideoPrompt
              .replace('\n' + oldLine, '')
              .replace(oldLine, '');
          }
        } else if (newLine) {
          newVideoPrompt = newVideoPrompt
            ? `${newVideoPrompt}\n${newLine}`
            : newLine;
        }

        return {
          ...s,
          dialogue: v,
          prompts: {
            ...s.prompts,
            video: {
              ...s.prompts.video,
              prompt: newVideoPrompt,
            },
          },
        };
      }),
    });
  };

  const updateCharacter = (patch) => setCharacter((prev) => prev && { ...prev, ...patch });
  const updateCharacterPrompt = (v) => updateCharacter({ prompt: v });

  const handleCharacterImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드 가능합니다.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('5MB 이하의 이미지만 업로드 가능합니다.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => updateCharacter({ imageUpload: String(e.target.result) });
    reader.readAsDataURL(file);
  };

  const clearCharacterImage = () => updateCharacter({ imageUpload: '' });

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
      if (uploadType === 'character') {
        const parsed = parseCharacter(jsonInput);
        setCharacter(parsed);
        setActiveAct('character');
        setUploadOpen(false);
        setJsonInput('');
        showToast('캐릭터 로드 완료!');
      } else if (uploadType === 'video_prompts') {
        if (!storyboard) {
          throw new Error('이미지 프롬프트를 먼저 업로드하세요.');
        }
        const videoScenes = parseVideoPrompts(jsonInput);
        const result = mergeVideoPromptsIntoStoryboard(storyboard, videoScenes);
        setStoryboard(result.storyboard);
        setUploadOpen(false);
        setJsonInput('');
        showToast(`영상 프롬프트 병합 완료! (${result.matched}/${result.total})`);
      } else {
        const parsed = parseImagePrompts(jsonInput);
        setStoryboard(parsed);
        setActiveAct(0);
        setUploadOpen(false);
        setJsonInput('');
        showToast('이미지 프롬프트 로드 완료!');
      }
    } catch (e) {
      setUploadError(e.message || 'JSON 파싱 오류가 발생했습니다.');
    }
  };

  const openUpload = (type) => {
    setUploadType(type);
    setUploadOpen(true);
    setUploadError('');
    setJsonInput('');
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
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      <style jsx global>{`
        .tb-hero {
          position: relative;
          padding: 28px 20px 72px;
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
        <span className="tb-hero-eyebrow">TB STUDY · STEP 4</span>
        <h1 className="tb-hero-title">광고영상 만들기</h1>
      </section>

      {/* Glass bar */}
      <div className="tb-glass-bar">
        <Link href="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full tb-pill-ghost text-xs sm:text-sm font-bold transition">
          <ArrowLeft className="w-3.5 h-3.5" />
          홈
        </Link>
        <span className="text-[11px] font-bold tracking-[0.18em] text-[#00996D] uppercase hidden sm:inline">TOOLB LAB</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => openUpload('character')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full tb-pill-ghost text-xs sm:text-sm font-bold transition"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">캐릭터</span>
          </button>
          <button
            onClick={() => openUpload('image_prompts')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full tb-pill-primary text-xs sm:text-sm font-bold transition"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">이미지 </span>프롬프트
          </button>
          <button
            onClick={() => openUpload('video_prompts')}
            disabled={!storyboard}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition ${
              storyboard ? 'tb-pill-ghost' : 'opacity-40 cursor-not-allowed bg-white/40 border border-white/70 text-[#64748b]'
            }`}
            title={!storyboard ? '이미지 프롬프트를 먼저 업로드하세요' : ''}
          >
            <Film className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">영상 </span>프롬프트
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:h-[calc(100vh-220px)] w-full px-4 pt-6 gap-4 2xl:px-6">
        {/* Sidebar */}
        <aside className="w-full md:w-[300px] flex-shrink-0 bg-white border border-[#e2e8f0] rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.06)] md:overflow-y-auto">
          <div className="p-4 border-b border-[#e2e8f0]">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-[#64748b]">
              <Clapperboard className="w-3.5 h-3.5" />
              광고영상 정보
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
                {storyboard.meta.rendering_style && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[#64748b] font-medium w-14 pt-0.5">스타일</span>
                    <span className="text-sm text-[#0f172a] font-bold flex-1">{storyboard.meta.rendering_style}</span>
                  </div>
                )}
                {storyboard.meta.total_duration_sec > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[#64748b] font-medium w-14 pt-0.5">러닝타임</span>
                    <span className="text-sm text-[#0f172a] font-bold flex-1">{storyboard.meta.total_duration_sec}초</span>
                  </div>
                )}
                {storyboard.meta.narrative_arc && (
                  <div className="flex items-start gap-2 pt-1">
                    <span className="text-xs text-[#64748b] font-medium italic leading-relaxed">“{storyboard.meta.narrative_arc}”</span>
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
              4단계 젬 가이드 열기
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
              <h3 className="text-lg font-bold text-[#0f172a] mb-2">이미지 프롬프트가 없습니다</h3>
              <p className="text-sm text-[#64748b] mb-5 leading-relaxed">
                <b>image_prompts.json</b> 을 먼저 업로드하여 씬과 프롬프트를 확인하세요.<br />
                이후 이미지 생성 → <b>video_prompts.json</b> 업로드로 영상 프롬프트를 병합합니다.
              </p>
              <button
                onClick={() => openUpload('image_prompts')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full tb-pill-primary text-sm font-bold transition"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                이미지 프롬프트 JSON 업로드
              </button>
              {character && (
                <div className="mt-5 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ecfdf5] border border-[#a7f3d0] text-[#00774f] text-xs font-bold">
                  <User className="w-3.5 h-3.5" />
                  캐릭터 "{character.name || character.character_id}" 로드됨 — 이미지 프롬프트 업로드 후 표시됩니다
                </div>
              )}
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
                {character && (
                  <button
                    onClick={() => setActiveAct('character')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-bold whitespace-nowrap rounded-full transition ${activeAct === 'character'
                      ? 'tb-pill-primary'
                      : 'text-[#64748b] bg-[#f1f5f9] hover:bg-[#e2e8f0] tb-press-soft'
                      }`}
                  >
                    <User className="w-3.5 h-3.5" style={{ opacity: activeAct === 'character' ? 1 : 0.7 }} />
                    캐릭터
                  </button>
                )}
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
                      <span className="flex items-baseline gap-1">
                        <span>{tc.label}</span>
                        <span className="text-[10px] font-semibold opacity-60">{tc.english}</span>
                      </span>
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
                {activeAct === 'character' ? (
                  character ? (
                    <div className="rounded-2xl overflow-hidden border border-[#e2e8f0] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                      <div className="px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between gap-3 bg-[#ecfdf5]/60">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[12px] font-black px-2 py-0.5 rounded-full bg-[#00996D]/15 text-[#00996D] flex items-center gap-1">
                            <User className="w-3 h-3" />
                            CHAR
                          </span>
                          <span className="text-base font-bold text-[#0f172a] truncate">
                            {character.name || '(이름 없음)'}
                          </span>
                          {character.role && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#e2e8f0] text-[#334155] flex-shrink-0">
                              {character.role}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => { setCharacter(null); setActiveAct(0); }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#fee2e2] border border-[#e2e8f0] text-[11px] font-bold text-[#b91c1c] tb-press-soft flex-shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                          제거
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-[minmax(400px,520px)_minmax(0,1fr)]">
                        {/* LEFT: image upload */}
                        <div className="p-4 border-b md:border-b-0 md:border-r border-[#e2e8f0]">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5 text-[#00996D]" />
                              <span className="text-[11px] uppercase tracking-wider text-[#64748b] font-bold">이미지</span>
                            </div>
                            {character.imageUpload && (
                              <button
                                onClick={clearCharacterImage}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white hover:bg-[#fee2e2] border border-[#e2e8f0] text-[11px] font-bold text-[#b91c1c] tb-press-soft"
                              >
                                <Trash2 className="w-3 h-3" />
                                제거
                              </button>
                            )}
                          </div>
                          <UploadSlot
                            image={character.imageUpload}
                            onFile={handleCharacterImageFile}
                          />
                        </div>

                        {/* RIGHT: prompt textarea */}
                        <div className="p-4 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <ImageIcon className="w-3.5 h-3.5 text-[#00996D] flex-shrink-0" />
                              <span className="text-[11px] uppercase tracking-wider text-[#64748b] font-bold">캐릭터 프롬프트</span>
                              {character.aspect_ratio && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#ecfdf5] text-[#00996D] font-bold">
                                  {character.aspect_ratio}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => copyText(character.prompt)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#f1f5f9] border border-[#e2e8f0] text-[11px] font-bold text-[#64748b] tb-press-soft flex-shrink-0"
                            >
                              <Copy className="w-3 h-3" />
                              복사
                            </button>
                          </div>
                          <textarea
                            value={character.prompt}
                            onChange={(e) => updateCharacterPrompt(e.target.value)}
                            rows={12}
                            placeholder="캐릭터 프롬프트... (네거티브 포함)"
                            className="w-full min-h-[300px] resize-y bg-white border border-[#e2e8f0] rounded-xl p-2.5 text-[13px] leading-relaxed font-mono text-[#0f172a] focus:outline-none focus:border-[#00B380] focus:ring-[3px] focus:ring-[#00B380]/20"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-[#64748b] text-sm">
                      캐릭터 JSON이 없습니다.
                    </div>
                  )
                ) : scenesByAct[activeAct].length === 0 ? (
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
                            <UploadSlot
                              image={scene.imageUpload}
                              onFile={(file) => handleImageFile(scene.id, file)}
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
              <span className="text-base font-bold text-[#0f172a] uppercase tracking-wider">
                {uploadType === 'character' ? '캐릭터 JSON 업로드'
                  : uploadType === 'video_prompts' ? '영상 프롬프트 JSON 업로드'
                  : '이미지 프롬프트 JSON 업로드'}
              </span>
              <button
                onClick={() => setUploadOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569] tb-press-soft"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
              {uploadType === 'character' ? (
                <p className="text-sm text-[#64748b] leading-relaxed">
                  <b>character.json</b> 을 붙여넣으세요.
                  <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px] mx-1">meta</code>,
                  <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px] mx-1">appearance</code>,
                  <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px] mx-1">image_prompt</code>,
                  <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px] mx-1">expressions</code>
                  또는 <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px]">visual_identity</code>,
                  <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px]">consistency_rules</code> 필드 지원.
                </p>
              ) : uploadType === 'video_prompts' ? (
                <p className="text-sm text-[#64748b] leading-relaxed">
                  <b>video_prompts.json</b> 을 붙여넣으세요. 각 씬의
                  <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px] mx-1">scene_id</code>로 기존 씬에 병합되며,
                  <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px] mx-1">video_prompt</code>(camera_motion, character_motion, sound_design 등)와
                  <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px] mx-1">dialogue</code>가 반영됩니다.
                </p>
              ) : (
                <p className="text-sm text-[#64748b] leading-relaxed">
                  <b>image_prompts.json</b> 을 붙여넣으세요. <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px]">scenes</code> (또는 <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px]">image_prompts</code>) 배열이 필요하며, 각 씬은
                  <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px] mx-1">scene_id</code>,
                  <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px] mx-1">narrative_role</code>(Hook/Setup/Problem/Escalation/Turn/Decision/Action/Obstacle/Reveal/Experience/Peak/CTA),
                  <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px] mx-1">background</code>,
                  <code className="bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[#00996D] font-mono text-[12px] mx-1">image_prompt</code> 필드를 가질 수 있습니다.
                </p>
              )}
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full h-[260px] resize-y font-mono text-[13px] leading-relaxed p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:outline-none focus:border-[#00B380] focus:ring-[3px] focus:ring-[#00B380]/20"
                placeholder={uploadType === 'character'
                  ? '{"character":{"character_id":"...","meta":{"name":"..."},"appearance":{...},"image_prompt":{...},"expressions":[...]}}'
                  : uploadType === 'video_prompts'
                  ? '{"project":{...},"scenes":[{"scene_id":1,"video_prompt":{"camera_motion":{...},"dialogue":{...}}}]}'
                  : '{"project":{"brand":"..."},"scenes":[{"scene_id":1,"narrative_role":"Hook","image_prompt":{...}}]}'
                }
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
