'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Upload, Copy, ExternalLink, Gem, X,
  Clapperboard, Image as ImageIcon, Film, MessageSquare, Music, Scissors, Droplets, Wrench, Trash2,
  User, Languages, Camera, FileText,
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
  S02: '#f97316',
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

// v3.0 sheet_prompt 는 9-섹션 객체. 편집/복사용으로는 compiled_prompt 문자열을 쓴다.
// 레거시(문자열) sheet_prompt 도 그대로 통과.
function sheetPromptString(sp) {
  if (typeof sp === 'string') return sp;
  if (sp && typeof sp === 'object') return sp.compiled_prompt || '';
  return '';
}

// 대사 화자 키('A'/'B' 또는 'Taesik' 같은 로마자 이름)를 캐릭터로 해소.
function resolveSpeaker(key, characters) {
  if (!key) return { id: '', name: '' };
  if (characters?.[key]) return { id: key, name: characters[key].name || key };
  const lower = String(key).toLowerCase();
  for (const id of ['A', 'B']) {
    const c = characters?.[id];
    if (!c) continue;
    if (c.name === key || c.name_romanized === key
        || String(c.name_romanized || '').toLowerCase() === lower) {
      return { id, name: c.name || key };
    }
  }
  return { id: key, name: key };
}

// 대사 한 줄의 한국어 텍스트 추출.
// v3: ko / v4 cinematic_sequence: text / 기타: line·kr·subtitle·en.
function dialogueLineText(l) {
  if (!l || typeof l !== 'object') return '';
  return l.ko || l.text || l.line || l.kr || l.subtitle || l.en || '';
}

// 대사 화자 표시 이름 — flattenDialogue 와 video_prompt 주입에서 동일하게 사용.
// speaker('A'/'B'), character_id('A'/'B'), character(이름) 모두 수용.
function dialogueSpeakerLabel(l, characters) {
  if (!l || typeof l !== 'object') return '';
  const key = l.speaker || l.character_id || l.character || '';
  const resolved = resolveSpeaker(key, characters);
  if (resolved.name && resolved.name !== key) return resolved.name;
  // 캐릭터 미로딩 시 character_name 폴백
  return l.character_name || resolved.name || key;
}

// video_prompt 끝의 BGM 정책 문장과, 그 앞에 붙은 대사 구간을 분리.
function splitVideoPrompt(videoPrompt) {
  let body = String(videoPrompt || '');
  let tail = '';
  const tailMatch = body.match(/\s*(No background music\.?|no bgm\.?)\s*$/i);
  if (tailMatch) {
    tail = tailMatch[1];
    body = body.slice(0, tailMatch.index);
  }
  // 끝에 붙은  화자: "대사"  세그먼트를 하나씩 제거 (라벨은 문장부호를 넘지 않음)
  const segRe = /\s*[^"“”\n.!?]*?[:：]\s*["“”][^"“”]*["“”]\s*$/;
  let guard = 0;
  while (segRe.test(body) && guard < 10) {
    body = body.replace(segRe, '');
    guard += 1;
  }
  return { base: body.replace(/\s+$/, ''), tail };
}

// 대사 텍스트창 내용("화자: 대사" 줄들)을  화자: "대사"  세그먼트 문자열로 변환.
function buildDialogueSegments(dialogueText) {
  return String(dialogueText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^([^:：]{1,24})[:：]\s*(.+)$/);
      return m ? `${m[1].trim()}: "${m[2].trim()}"` : `"${line}"`;
    })
    .join(' ');
}

// 대사 텍스트창 → video_prompt 의 대사 구간을 통째로 재구성 (편집 시 동기화).
function syncDialogueIntoPrompt(videoPrompt, dialogueText) {
  if (!videoPrompt) return videoPrompt;
  const { base, tail } = splitVideoPrompt(videoPrompt);
  const seg = buildDialogueSegments(dialogueText);
  let result = base;
  if (seg) result = result ? `${result} ${seg}` : seg;
  if (tail) result = result ? `${result} ${tail}` : tail;
  return result;
}

// video_prompt 에 대사가 빠져 있으면 v3/v4 형식(화자: "대사")으로 끼워넣는다.
// cinematic_sequence variant 대응. 이미 들어있으면 건드리지 않음.
function ensureDialogueInVideoPrompt(videoPrompt, dialogueObj, characters) {
  if (!videoPrompt) return videoPrompt;
  const lines = dialogueObj && Array.isArray(dialogueObj.lines) ? dialogueObj.lines : [];
  if (lines.length === 0) return videoPrompt;
  const firstText = dialogueLineText(lines[0]);
  if (firstText && videoPrompt.includes(firstText)) return videoPrompt;
  const segs = lines.map((l) => {
    const text = dialogueLineText(l);
    if (!text) return '';
    const sp = dialogueSpeakerLabel(l, characters);
    return sp ? `${sp}: "${text}"` : `"${text}"`;
  }).filter(Boolean);
  if (segs.length === 0) return videoPrompt;
  const { base, tail } = splitVideoPrompt(videoPrompt);
  let result = base ? `${base} ${segs.join(' ')}` : segs.join(' ');
  if (tail) result = `${result} ${tail}`;
  return result;
}

function appendNoBgm(videoPrompt) {
  if (!videoPrompt) return videoPrompt;
  const trimmed = videoPrompt.replace(/\s+$/, '');
  // v3.0 영상 프롬프트는 이미 "No background music." 으로 끝남. 레거시 "no bgm" 도 인정.
  if (/no\s*(bgm|background\s+music)\.?$/i.test(trimmed)) return trimmed;
  return `${trimmed} No background music.`;
}

function formatDialogueLine(l, characters) {
  if (!l) return '';
  if (typeof l === 'string') return l;
  const display = dialogueSpeakerLabel(l, characters);
  const text = dialogueLineText(l);
  return display ? `${display}: ${text}` : text;
}

function flattenDialogue(d, characters) {
  if (!d) return '';
  if (typeof d === 'string') return d;
  if (typeof d !== 'object') return '';
  // v2.2 schema: { lines: [{speaker, ko, en, delivery, subtitle}, ...] }
  if (Array.isArray(d.lines)) {
    return d.lines.map((l) => formatDialogueLine(l, characters)).filter(Boolean).join('\n');
  }
  // legacy GPT output that put an array under subtitle
  if (Array.isArray(d.subtitle)) {
    return d.subtitle.map((l) => formatDialogueLine(l, characters)).filter(Boolean).join('\n');
  }
  // legacy single subtitle string
  if (d.subtitle && typeof d.subtitle === 'string') return d.subtitle;
  // legacy single-object form
  return formatDialogueLine(d, characters);
}

function normalizeDialogueMeta(d) {
  if (!d || typeof d !== 'object') return null;
  if (Array.isArray(d.lines)) {
    if (d.lines.length === 0) return { lines: [] };
    const first = d.lines[0] || {};
    return {
      speaker: first.speaker || first.character_id || first.character || '',
      delivery: first.delivery || '',
      lines: d.lines,
    };
  }
  if (Array.isArray(d.subtitle)) {
    const first = d.subtitle[0] || {};
    return {
      speaker: first.speaker || first.character_id || first.character || '',
      delivery: first.delivery || '',
      lines: d.subtitle,
    };
  }
  if (d.speaker || d.delivery || d.subtitle || d.ko || d.kr) return d;
  return null;
}

function arrOrStr(v) {
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'string') return v;
  return null;
}

function normalizeAudio(a) {
  if (!a || typeof a !== 'object') return null;
  // v3/v4: ambient/foley/sfx/music_cue/bgm_policy.
  // cinematic_sequence variant: ambient_sounds[]/sound_fx[]. legacy: ambient_layers/foley_layers.
  return {
    ambient:    arrOrStr(a.ambient    ?? a.ambient_sounds ?? a.ambient_layers),
    foley:      arrOrStr(a.foley      ?? a.foley_layers),
    sfx:        arrOrStr(a.sfx        ?? a.sound_fx),
    music_cue:  a.music_cue ?? null,
    bgm_policy: a.bgm_policy || a.music_policy || null,
  };
}

// v3 shots 는 camera 객체. cinematic_sequence variant 는 flat camera_move + composition.
function normalizeCamera(s) {
  if (s.camera && typeof s.camera === 'object') return s.camera;
  const cam = {};
  if (s.camera_move) cam.movement = s.camera_move;
  if (s.composition) cam.composition = s.composition;
  return cam;
}

function normalizeShots(rawShots, characters) {
  return rawShots.map((s, i) => ({
    shot_id: s.shot_id || `S${String(i + 1).padStart(2, '0')}`,
    shot_type: s.shot_type || '',
    shot_label: s.shot_label || '',
    duration_sec: typeof s.duration_sec === 'number'
      ? s.duration_sec
      : typeof s.duration_seconds === 'number' ? s.duration_seconds : null,
    // v3/v4: shot_purpose. cinematic_sequence variant: visual_description. legacy: purpose/scene_purpose.
    purpose: s.shot_purpose || s.purpose || s.scene_purpose || s.visual_description || '',
    characters_in_frame: Array.isArray(s.characters_in_frame) ? s.characters_in_frame : ['A', 'B'],
    camera: normalizeCamera(s),
    blocking: s.blocking || {},
    // legacy: actor_micro_expression. v2.2: emotion.
    emotion: s.emotion || s.actor_micro_expression || {},
    // v2.2: audio object. legacy: sound_design.
    audio: normalizeAudio(s.audio || s.sound_design || null),
    dialogue_meta: normalizeDialogueMeta(s.dialogue),
    // Accept both new (image_prompt) and legacy (i2i_prompt) field names.
    image_prompt: s.image_prompt || s.i2i_prompt || '',
    // cinematic_sequence variant 는 video_prompt 에 대사가 없어 v3 형식으로 끼워넣는다.
    video_prompt: ensureDialogueInVideoPrompt(
      typeof s.video_prompt === 'string' ? s.video_prompt : '',
      s.dialogue,
      characters,
    ),
    dialogue: flattenDialogue(s.dialogue, characters),
    imageUpload: '',
  }));
}

function normalizeOneCharacter(c) {
  const raw = c || {};
  const sp = raw.sheet_prompt;
  return {
    ...raw,
    // 편집/복사용 문자열 (v3 객체면 compiled_prompt, 레거시면 원문)
    sheet_prompt: sheetPromptString(sp),
    // v3 9-섹션 구조 원본 (있을 때만) — 구조화 표시용
    sheet_struct: (sp && typeof sp === 'object') ? sp : null,
    imageUpload: '',
  };
}

function normalizeCharacters(chars) {
  return {
    A: normalizeOneCharacter(chars?.A),
    B: normalizeOneCharacter(chars?.B),
  };
}

function emptyCharacters() {
  return {
    A: { name: '캐릭터 A', sheet_prompt: '', imageUpload: '' },
    B: { name: '캐릭터 B', sheet_prompt: '', imageUpload: '' },
  };
}

// 입력된 JSON 이 Stage 1(캐릭터 시트) / Stage 2(5컷) / 통합본 중 어느 단계인지 판별.
function detectStage(json) {
  if (json.stage === 'character_sheet') return 'stage1';
  // v3: 'shots'. cinematic_sequence variant: 'cinematic_sequence'.
  if (json.stage === 'shots' || json.stage === 'cinematic_sequence') return 'stage2';
  const hasChars = !!(json.characters?.A && json.characters?.B);
  const hasShots = Array.isArray(json.shots) && json.shots.length > 0;
  if (hasChars && hasShots) return 'combined';
  if (hasChars) return 'stage1';
  if (hasShots) return 'stage2';
  return null;
}

function parseProject(raw) {
  const json = cleanJson(raw);
  const stage = detectStage(json);
  if (!stage) {
    throw new Error('characters 또는 shots 가 필요합니다. Stage 1(캐릭터 시트) 또는 Stage 2(5컷) JSON 을 붙여넣어 주세요.');
  }

  if (stage === 'stage1') {
    if (!json.characters?.A || !json.characters?.B) {
      throw new Error('Stage 1 JSON 은 characters.A 와 characters.B 가 모두 필요합니다.');
    }
    return {
      _kind: 'stage1',
      characters: normalizeCharacters(json.characters),
      synopsis: json.synopsis || '',
      scene_hint: json.scene_hint || {},
    };
  }

  if (stage === 'stage2') {
    if (!Array.isArray(json.shots) || json.shots.length === 0) {
      throw new Error('Stage 2 JSON 은 shots 배열이 필요합니다.');
    }
    return {
      _kind: 'stage2',
      project: json.project || {},
      scene_context: json.scene_context || {},
      scene_analysis: json.scene_analysis || {},
      shots: normalizeShots(json.shots, json.characters || null),
    };
  }

  // combined
  return {
    _kind: 'combined',
    project: json.project || {},
    scene_context: json.scene_context || {},
    scene_analysis: json.scene_analysis || {},
    characters: normalizeCharacters(json.characters),
    shots: normalizeShots(json.shots, json.characters),
  };
}

// 새 JSON 을 기존 data 와 병합. Stage 1/2 를 따로 붙여넣어도 누적되도록.
function mergeProject(prev, parsed) {
  if (parsed._kind === 'stage1') {
    if (!prev) {
      return {
        project: {},
        scene_context: {},
        scene_analysis: {},
        characters: parsed.characters,
        shots: [],
        synopsis: parsed.synopsis,
        scene_hint: parsed.scene_hint,
      };
    }
    // 기존 shots 유지하고 캐릭터만 교체. 업로드한 이미지는 보존.
    return {
      ...prev,
      characters: {
        A: { ...parsed.characters.A, imageUpload: prev.characters?.A?.imageUpload || '' },
        B: { ...parsed.characters.B, imageUpload: prev.characters?.B?.imageUpload || '' },
      },
      synopsis: parsed.synopsis,
      scene_hint: parsed.scene_hint,
    };
  }

  if (parsed._kind === 'stage2') {
    const baseChars = prev?.characters?.A && prev?.characters?.B
      ? prev.characters
      : emptyCharacters();
    const prevShotMap = new Map((prev?.shots || []).map((s) => [s.shot_id, s]));
    const mergedShots = parsed.shots.map((s) => {
      const old = prevShotMap.get(s.shot_id);
      return old?.imageUpload ? { ...s, imageUpload: old.imageUpload } : s;
    });
    return {
      ...(prev || {}),
      project: parsed.project,
      scene_context: parsed.scene_context,
      scene_analysis: parsed.scene_analysis,
      characters: baseChars,
      shots: mergedShots,
    };
  }

  // combined: 전부 교체하되 기존 업로드 이미지는 가능하면 유지
  if (!prev) return stripKind(parsed);
  const prevShotMap = new Map((prev.shots || []).map((s) => [s.shot_id, s]));
  return {
    project: parsed.project,
    scene_context: parsed.scene_context,
    scene_analysis: parsed.scene_analysis,
    characters: {
      A: { ...parsed.characters.A, imageUpload: prev.characters?.A?.imageUpload || '' },
      B: { ...parsed.characters.B, imageUpload: prev.characters?.B?.imageUpload || '' },
    },
    shots: parsed.shots.map((s) => {
      const old = prevShotMap.get(s.shot_id);
      return old?.imageUpload ? { ...s, imageUpload: old.imageUpload } : s;
    }),
  };
}

function stripKind(p) {
  const { _kind, ...rest } = p;
  return rest;
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
          className="relative w-full rounded-xl overflow-hidden border border-[var(--tb-border)] cursor-pointer group bg-[#0f172a] flex items-center justify-center"
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
      className="tb-upload-slot aspect-video rounded-xl flex flex-col items-center justify-center gap-2.5 p-6 cursor-pointer text-[var(--tb-text-muted)] outline-none focus:ring-[3px] focus:ring-[#fb923c]/40 focus:border-[#fb923c] focus:bg-[var(--tb-surface-2)]"
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); openPicker(); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => { e.stopPropagation(); handleDrop(e); }}
        className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#f97316] hover:bg-[#ea580c] text-white text-sm font-bold tb-press shadow-[0_6px_16px_rgba(249,115,22,0.3)]"
      >
        <Upload className="w-4 h-4" />
        이미지 선택
      </button>
      <div className="text-center text-[11px] leading-relaxed mt-1">
        <div className="font-bold text-[var(--tb-text)]">클릭 · 드래그&amp;드롭 · Ctrl+V 붙여넣기</div>
        <div className="text-[10px] mt-0.5 text-[var(--tb-text-muted)]">PNG · JPG · WEBP (≤5MB)</div>
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
        // 캐릭터 또는 샷 중 하나라도 있으면 복원 (Stage 1 만 받은 상태도 보존).
        const hasChars = !!(parsed?.characters?.A && parsed?.characters?.B);
        const hasShots = Array.isArray(parsed?.shots) && parsed.shots.length > 0;
        if (hasChars || hasShots) {
          setData({
            project: parsed.project || {},
            scene_context: parsed.scene_context || {},
            scene_analysis: parsed.scene_analysis || {},
            characters: hasChars ? parsed.characters : emptyCharacters(),
            shots: Array.isArray(parsed.shots) ? parsed.shots : [],
            synopsis: parsed.synopsis,
            scene_hint: parsed.scene_hint,
          });
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
      setData((prev) => mergeProject(prev, parsed));
      // Stage 1 → 캐릭터 탭, Stage 2 → 첫 샷 탭, 통합 → 캐릭터 탭
      if (parsed._kind === 'stage2') {
        const firstShot = parsed.shots?.[0]?.shot_id || 'S01';
        setActiveTab(firstShot);
      } else {
        setActiveTab('A');
      }
      setUploadOpen(false);
      setJsonInput('');
      const msg =
        parsed._kind === 'stage1'   ? '캐릭터 시트(Stage 1) 병합 완료!' :
        parsed._kind === 'stage2'   ? '5컷 시퀀스(Stage 2) 병합 완료!' :
        '프로젝트 로드 완료!';
      showToast(msg);
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
      shots: prev.shots.map((s) => {
        if (s.shot_id !== shotId) return s;
        const next = { ...s, ...patch };
        // 대사 텍스트창이 바뀌면 video_prompt 의 대사 구간을 통째로 재구성
        if ('dialogue' in patch && next.video_prompt) {
          next.video_prompt = syncDialogueIntoPrompt(next.video_prompt, next.dialogue);
        }
        return next;
      }),
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

  const allCharacterPrompts = data
    ? ['A', 'B'].map((who) => data.characters?.[who]?.sheet_prompt).filter(Boolean).join('\n\n')
    : '';
  const allImagePrompts = data ? data.shots.map((s) => s.image_prompt).filter(Boolean).join('\n\n') : '';
  const allVideoPrompts = data ? data.shots.map((s) => s.video_prompt).filter(Boolean).map(appendNoBgm).join('\n\n') : '';
  const allDialogues = data ? data.shots.map((s) => s.dialogue).filter(Boolean).join('\n\n') : '';

  const sc = data?.scene_context || {};
  // 제목: project.title (v3/v4 shots) → scene_context.title (cinematic_sequence variant)
  const projectTitle = data?.project?.title || sc.title || '';

  return (
    <div className="min-h-screen md:h-screen md:flex md:flex-col md:overflow-hidden bg-[var(--tb-bg)] text-[var(--tb-text)]">
      <style jsx global>{`
        .tb-hero {
          position: relative;
          padding: 16px 20px 36px;
          background: linear-gradient(135deg, #7c2d12 0%, #f97316 45%, #fb923c 100%);
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
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 100px;
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
        }
        .tb-pill-primary {
          background: rgba(249,115,22,0.16);
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
          background: rgba(249,115,22,0.26);
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
          background: rgba(255,255,255,0.05);
          color: var(--tb-text);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
          box-shadow:
            0 6px 16px rgba(0,0,0,0.3),
            inset 1.5px 1.5px 0.5px 0 rgba(255,255,255,0.08),
            inset -1px -1px 0.5px 1px rgba(255,255,255,0.04);
          transition: transform 0.4s cubic-bezier(0.175,0.885,0.32,2.2), box-shadow 0.3s, background 0.3s;
        }
        .tb-pill-ghost:hover {
          background: rgba(255,255,255,0.1);
          transform: translateY(-1px) scale(1.03);
        }
        .tb-pill-ghost:active {
          transform: translateY(1px) scale(0.94);
          box-shadow:
            0 3px 8px rgba(0,0,0,0.35),
            inset 1.5px 1.5px 2px 0 rgba(0,0,0,0.3),
            inset -1px -1px 0.5px 1px rgba(255,255,255,0.04);
          transition: transform 0.08s ease-out, box-shadow 0.08s ease-out;
        }
        .tb-upload-slot {
          border: 2px dashed var(--tb-border);
          transition: border-color 0.2s, background 0.2s;
        }
        .tb-upload-slot:hover {
          border-color: #fb923c;
          background: var(--tb-surface-2);
        }
        .tb-upload-slot.dragover {
          border-color: #fb923c;
          background: var(--tb-surface-2);
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
        <aside className="w-full md:w-[300px] flex-shrink-0 bg-[var(--tb-surface)] border border-[var(--tb-border)] rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.06)] md:overflow-y-auto">
          <div className="p-4 border-b border-[var(--tb-border)]">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-[var(--tb-text-muted)]">
              <Clapperboard className="w-3.5 h-3.5" />
              프로젝트 정보
            </div>
            {data ? (
              <div className="space-y-1.5">
                {projectTitle && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[var(--tb-text-muted)] font-medium w-14 pt-0.5">제목</span>
                    <span className="text-sm text-[var(--tb-text)] font-bold flex-1 break-all">{projectTitle}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-sm text-[var(--tb-text-muted)] font-medium w-14 pt-0.5">컷 수</span>
                  <span className="text-sm text-[var(--tb-text)] font-bold flex-1">{data.shots.length}컷</span>
                </div>
                {data.project?.aspect_ratio && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[var(--tb-text-muted)] font-medium w-14 pt-0.5">비율</span>
                    <span className="text-sm text-[var(--tb-text)] font-bold flex-1">{data.project.aspect_ratio}</span>
                  </div>
                )}
                {sc.location && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[var(--tb-text-muted)] font-medium w-14 pt-0.5">장소</span>
                    <span className="text-sm text-[var(--tb-text)] font-bold flex-1">{sc.location}</span>
                  </div>
                )}
                {sc.time_of_day && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[var(--tb-text-muted)] font-medium w-14 pt-0.5">시간</span>
                    <span className="text-sm text-[var(--tb-text)] font-bold flex-1">{sc.time_of_day}</span>
                  </div>
                )}
                {data.project?.total_duration_sec > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[var(--tb-text-muted)] font-medium w-14 pt-0.5">러닝</span>
                    <span className="text-sm text-[var(--tb-text)] font-bold flex-1">
                      {data.project.total_duration_sec}초
                      {data.project?.clip_duration_sec ? ` (컷당 ${data.project.clip_duration_sec}초)` : ''}
                    </span>
                  </div>
                )}
                {data.project?.video_model && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[var(--tb-text-muted)] font-medium w-14 pt-0.5">영상</span>
                    <span className="text-sm text-[var(--tb-text)] font-bold flex-1">{data.project.video_model}</span>
                  </div>
                )}
                {data.project?.image_model && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-[var(--tb-text-muted)] font-medium w-14 pt-0.5">이미지</span>
                    <span className="text-sm text-[var(--tb-text)] font-bold flex-1">{data.project.image_model}</span>
                  </div>
                )}
                {(data.synopsis || sc.synopsis) && (
                  <div className="flex items-start gap-2 pt-1">
                    <span className="text-sm text-[var(--tb-text-muted)] font-medium w-14 pt-0.5">시놉시스</span>
                    <span className="text-[12px] text-[var(--tb-text)] leading-relaxed flex-1">{data.synopsis || sc.synopsis}</span>
                  </div>
                )}
                {(sc.mood || sc.atmosphere || sc.tone) && (
                  <div className="flex items-start gap-2 pt-1">
                    <span className="text-xs text-[var(--tb-text-muted)] font-medium italic leading-relaxed">"{sc.mood || sc.atmosphere || sc.tone}"</span>
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
              href="https://chatgpt.com/g/g-6a02ce44665881919ced116b08fac385-pro-class-sinematig-5keos-daieolrogeu-1dangye"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full tb-pill-primary text-sm font-bold transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              시네마틱 5컷 지침열기
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
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-full bg-[var(--tb-surface-2)] hover:opacity-90 text-[var(--tb-text)] text-sm font-bold tb-press"
            >
              <ExternalLink className="w-3.5 h-3.5" />
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
        <main className="flex-1 min-w-0 flex flex-col md:overflow-hidden bg-[var(--tb-surface)] border border-[var(--tb-border)] rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
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
              <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--tb-border)] bg-[color-mix(in_srgb,var(--tb-surface-2)_40%,transparent)] rounded-t-2xl flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <Clapperboard className="w-4 h-4 text-[#f97316] flex-shrink-0" />
                  <h2 className="text-base font-black text-[var(--tb-text)] uppercase truncate">{projectTitle || '시네마틱 5컷'}</h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[var(--tb-text-muted)] flex-shrink-0">
                    {data.shots.length}컷
                  </span>
                  {data.project?.aspect_ratio && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[var(--tb-text-muted)] flex-shrink-0">
                      {data.project.aspect_ratio}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  <button
                    onClick={() => copyText(allCharacterPrompts)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] border border-[var(--tb-border)] text-[var(--tb-text)] text-sm font-bold tb-press-soft"
                  >
                    <User className="w-3.5 h-3.5" />
                    캐릭터 전체
                  </button>
                  <button
                    onClick={() => copyText(allImagePrompts)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full tb-pill-primary text-sm font-bold transition"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    이미지 전체
                  </button>
                  <button
                    onClick={() => copyText(allVideoPrompts)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] border border-[var(--tb-border)] text-[var(--tb-text)] text-sm font-bold tb-press-soft"
                  >
                    <Film className="w-3.5 h-3.5" />
                    영상 전체
                  </button>
                  <button
                    onClick={() => copyText(allDialogues)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--tb-surface)] border border-[var(--tb-border)] hover:bg-[var(--tb-surface-2)] text-[var(--tb-text)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-sm font-bold tb-press"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#f43f5e]" />
                    대사 전체
                  </button>
                </div>
              </div>

              {/* Tab bar */}
              <div className="flex-shrink-0 flex gap-1.5 p-3 border-b border-[var(--tb-border)] bg-[var(--tb-surface)] overflow-x-auto">
                {['A', 'B'].map((who) => {
                  const isActive = activeTab === who;
                  const ch = data.characters[who];
                  return (
                    <button
                      key={who}
                      onClick={() => setActiveTab(who)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-bold whitespace-nowrap rounded-full transition ${
                        isActive ? 'tb-pill-primary' : 'text-[var(--tb-text-muted)] hover:bg-[var(--tb-surface-2)] tb-press-soft'
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
                  const dot = SHOT_DOT[s.shot_id] || 'var(--tb-text-muted)';
                  return (
                    <button
                      key={s.shot_id}
                      onClick={() => setActiveTab(s.shot_id)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-bold whitespace-nowrap rounded-full transition ${
                        isActive ? 'tb-pill-primary' : 'text-[var(--tb-text-muted)] hover:bg-[var(--tb-surface-2)] tb-press-soft'
                      }`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: dot, opacity: isActive ? 1 : 0.7 }}
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
            className="bg-[var(--tb-surface)] rounded-2xl border border-[var(--tb-border)] shadow-[0_24px_60px_rgba(15,23,42,0.25)] w-[640px] max-w-[95vw] max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--tb-border)]">
              <span className="text-base font-bold text-[var(--tb-text)] uppercase tracking-wider">
                시네마틱 5컷 JSON 업로드
              </span>
              <button
                onClick={() => setUploadOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] text-[var(--tb-text)] tb-press-soft"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
              <p className="text-sm text-[var(--tb-text-muted)] leading-relaxed">
                v3.0 Stage 1 (캐릭터 시트) 와 Stage 2 (5컷) 를 따로 붙여넣어도 자동으로 병합됩니다.
                <br />
                <span className="inline-flex items-center gap-1 mt-1 flex-wrap">
                  <code className="bg-[var(--tb-surface-2)] px-1.5 py-0.5 rounded text-[#f97316] font-mono text-[12px]">stage: "character_sheet"</code>
                  <span className="text-[var(--tb-text-muted)]">·</span>
                  <code className="bg-[var(--tb-surface-2)] px-1.5 py-0.5 rounded text-[#f97316] font-mono text-[12px]">stage: "shots"</code>
                  <span className="text-[var(--tb-text-muted)]">·</span>
                  <code className="bg-[var(--tb-surface-2)] px-1.5 py-0.5 rounded text-[#f97316] font-mono text-[12px]">stage: "cinematic_sequence"</code>
                  <span className="text-[var(--tb-text-muted)]">자동 인식</span>
                </span>
              </p>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full h-[260px] resize-y font-mono text-[13px] leading-relaxed p-3 rounded-xl bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[var(--tb-text)] focus:outline-none focus:border-[#fb923c] focus:ring-[3px] focus:ring-[#fb923c]/20"
                placeholder={'Stage 1: { "stage": "character_sheet", "version": "3.0", "characters": { "A": {...}, "B": {...} } }\nStage 2: { "stage": "shots", "version": "3.0", "shots": [{"shot_id": "S01", ...}, ...] }'}
              />
              {uploadError && (
                <div className="text-sm text-[#fca5a5] bg-[#3a1f24] border border-[#7f1d1d] rounded-xl px-3 py-2 font-semibold">
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

function CharacterCard({ who, character, onCopy, onUpdatePrompt, onImageFile, onClearImage }) {
  const c = character;
  if (!c) return null;

  return (
    <div className="rounded-2xl overflow-hidden border border-[var(--tb-border)] bg-[var(--tb-surface)] shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--tb-border)] flex items-center justify-between gap-3 bg-[color-mix(in_srgb,var(--tb-surface-2)_60%,transparent)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[12px] font-black px-2 py-0.5 rounded-full bg-[var(--tb-surface-2)] text-[var(--tb-text-muted)] flex items-center gap-1">
            <User className="w-3 h-3" />
            CHAR {who}
          </span>
          <span className="text-base font-bold text-[var(--tb-text)] truncate">
            {c.name || '(이름 없음)'}
          </span>
          {c.role && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[var(--tb-text)] flex-shrink-0">
              {c.role}
            </span>
          )}
        </div>
        {c.demographics && (
          <div className="hidden md:flex items-center gap-1 flex-shrink-0">
            {(c.demographics.age_range || c.demographics.age) && (
              <Tag>{c.demographics.age_range || `${c.demographics.age}세`}</Tag>
            )}
            {c.demographics.gender && <Tag>{c.demographics.gender}</Tag>}
            {c.demographics.ethnicity && <Tag>{c.demographics.ethnicity}</Tag>}
          </div>
        )}
      </div>

      {/* 2-col: image upload | sheet prompt */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(400px,520px)_minmax(0,1fr)]">
        {/* LEFT: image */}
        <div className="p-4 border-b md:border-b-0 md:border-r border-[var(--tb-border)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#f97316]" />
              <span className="text-[11px] uppercase tracking-wider text-[var(--tb-text-muted)] font-bold">캐릭터 시트 이미지</span>
            </div>
            {c.imageUpload && (
              <button
                onClick={onClearImage}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--tb-surface-2)] hover:bg-[#3a1f24] border border-[var(--tb-border)] text-[11px] font-bold text-[color-mix(in_srgb,#fca5a5_62%,var(--tb-text))] tb-press-soft"
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
            <p className="bg-[var(--tb-surface-2)] border-l-4 border-[#f97316] px-3 py-2 rounded-r-md text-[13px] text-[var(--tb-text)] italic leading-snug">
              {c.vibe}
            </p>
          )}
          {c.sheet_struct?.character_identity?.summary && (
            <p className="bg-[var(--tb-surface-2)] border border-[#7c2d12] px-3 py-2 rounded-md text-[12.5px] text-[#fdba74] leading-snug">
              {c.sheet_struct.character_identity.summary}
            </p>
          )}
          {c.voice_profile && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 py-2 rounded-xl bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[12px]">
              <span className="text-[10px] font-black text-[#fbbf24] uppercase tracking-wider self-center">VOICE</span>
              {c.voice_profile.tone && <Stat k="톤" v={c.voice_profile.tone} />}
              {c.voice_profile.pace && <Stat k="페이스" v={c.voice_profile.pace} />}
              {c.voice_profile.emotion_baseline && <Stat k="기본감정" v={c.voice_profile.emotion_baseline} />}
            </div>
          )}
          <CharSpecGrid character={c} />
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <ImageIcon className="w-3.5 h-3.5 text-[#f97316] flex-shrink-0" />
                <span className="text-[11px] uppercase tracking-wider text-[var(--tb-text-muted)] font-bold">캐릭터 시트 프롬프트</span>
                {c.sheet_struct && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[var(--tb-surface-2)] text-[#f97316] font-bold">
                    v3 · 9섹션 compiled
                  </span>
                )}
              </div>
              <button
                onClick={() => onCopy(c.sheet_prompt || '')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] border border-[var(--tb-border)] text-[11px] font-bold text-[var(--tb-text-muted)] tb-press-soft"
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
              className="w-full min-h-[240px] resize-y bg-[var(--tb-surface-2)] border border-[var(--tb-border)] rounded-xl p-2.5 text-[13px] leading-relaxed font-mono text-[var(--tb-text)] focus:outline-none focus:border-[#fb923c] focus:ring-[3px] focus:ring-[#fb923c]/20"
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
  const distinguishing = p.distinguishing_features || p.distinguishing;
  const accessoriesText = Array.isArray(w.accessories)
    ? w.accessories.join(', ')
    : (typeof w.accessories === 'string' ? w.accessories : '');
  const items = [
    p.hair && ['머리', p.hair],
    p.eyes && ['눈', p.eyes],
    p.face_shape && ['얼굴형', p.face_shape],
    p.skin && ['피부', p.skin],
    p.height_build && ['체격', p.height_build],
    distinguishing && ['특징', distinguishing],
    w.outerwear && w.outerwear !== '없음' && ['아우터', w.outerwear],
    w.top && ['상의', w.top],
    w.bottom && ['하의', w.bottom],
    accessoriesText && ['액세서리', accessoriesText],
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px] bg-[var(--tb-surface-2)] rounded-xl p-3 border border-[var(--tb-border)]">
      {items.map(([k, v]) => (
        <div key={k} className="flex gap-2 min-w-0">
          <span className="text-[var(--tb-text-muted)] font-bold shrink-0 w-12">{k}</span>
          <span className="text-[var(--tb-text)] truncate" title={v}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function ShotCard({ shot, characters, onCopy, onUpdate, onImageFile, onClearImage }) {
  if (!shot) return null;
  const dot = SHOT_DOT[shot.shot_id] || 'var(--tb-text-muted)';
  const cam = shot.camera || {};
  const blocking = shot.blocking || {};
  const emotion = shot.emotion || {};
  const audio = shot.audio || null;
  const dm = shot.dialogue_meta || null;

  return (
    <div className="rounded-2xl overflow-hidden border border-[var(--tb-border)] bg-[var(--tb-surface)] shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-[var(--tb-border)] flex items-center justify-between gap-3"
        style={{ background: `${dot}10` }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="text-[12px] font-black px-2 py-0.5 rounded-full"
            style={{ background: `${dot}25`, color: dot }}
          >
            {shot.shot_id}
          </span>
          <span className="text-base font-bold text-[var(--tb-text)] truncate">
            {shot.shot_label || SHOT_FALLBACK_LABEL[shot.shot_id] || shot.shot_type}
          </span>
          {shot.duration_sec > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[var(--tb-text)] flex-shrink-0">
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
        <div className="px-4 py-3 border-b border-[var(--tb-border)]">
          <p className="text-sm text-[var(--tb-text)] leading-relaxed">{shot.purpose}</p>
        </div>
      )}

      {/* Camera / Blocking / Emotion summary strip */}
      <div className="px-4 py-3 border-b border-[var(--tb-border)] bg-[var(--tb-surface-2)] flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px]">
        {cam.framing && <Stat icon={Camera} k="프레이밍" v={cam.framing} />}
        {cam.lens && <Stat k="렌즈" v={cam.lens} />}
        {cam.aperture && <Stat k="조리개" v={cam.aperture} />}
        {cam.angle && <Stat k="앵글" v={cam.angle} />}
        {cam.movement && <Stat k="무빙" v={cam.movement} />}
        {cam.composition && <Stat k="구도" v={cam.composition} />}
        {cam.depth_of_field && <Stat k="심도" v={cam.depth_of_field} />}
        {(blocking.A || blocking.B) && <Stat k="블로킹" v={[blocking.A && `A: ${blocking.A}`, blocking.B && `B: ${blocking.B}`].filter(Boolean).join(' / ')} />}
        {(emotion.A || emotion.B) && <Stat k="감정" v={[emotion.A && `A: ${emotion.A}`, emotion.B && `B: ${emotion.B}`].filter(Boolean).join(' / ')} />}
      </div>

      {/* Audio strip (v2) */}
      {audio && (audio.ambient || audio.foley || audio.sfx || audio.music_cue) && (
        <div className="px-4 py-2.5 border-b border-[var(--tb-border)] bg-[var(--tb-surface-2)] flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px]">
          <span className="text-[10px] font-black text-[#e879f9] uppercase tracking-wider self-center">AUDIO</span>
          {audio.ambient && audio.ambient !== '없음' && <Stat k="앰비언트" v={audio.ambient} />}
          {audio.foley && audio.foley !== '없음' && <Stat k="폴리" v={audio.foley} />}
          {audio.sfx && audio.sfx !== '없음' && <Stat k="SFX" v={audio.sfx} />}
          {audio.music_cue && audio.music_cue !== '없음' && <Stat k="음악" v={audio.music_cue} />}
          {audio.bgm_policy && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[#e879f9] self-center">
              {audio.bgm_policy}
            </span>
          )}
        </div>
      )}

      {/* Dialogue meta strip — speaker / delivery (preserved from JSON).
          v2.2 lines[] 일 경우 모든 발화의 화자/딜리버리를 노출. */}
      {dm && (Array.isArray(dm.lines) ? dm.lines.length > 0 : (dm.speaker || dm.delivery)) && (
        <div className="px-4 py-2.5 border-b border-[var(--tb-border)] bg-[var(--tb-surface-2)] flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px]">
          <span className="text-[10px] font-black text-[#fbbf24] uppercase tracking-wider self-center">DIALOGUE</span>
          {Array.isArray(dm.lines) ? (
            dm.lines.map((l, idx) => {
              const sp = l.speaker || l.character_id || l.character || '';
              const labelSp = dialogueSpeakerLabel(l, characters);
              return (
                <span key={idx} className="inline-flex items-center gap-2">
                  {sp && <Stat k={`화자${dm.lines.length > 1 ? ` ${idx + 1}` : ''}`} v={labelSp} />}
                  {l.delivery && <Stat k="딜리버리" v={l.delivery} />}
                </span>
              );
            })
          ) : (
            <>
              {dm.speaker && (() => {
                const { id, name } = resolveSpeaker(dm.speaker, characters);
                return <Stat k="화자" v={id && name && id !== name ? `${id} · ${name}` : (name || dm.speaker)} />;
              })()}
              {dm.delivery && <Stat k="딜리버리" v={dm.delivery} />}
            </>
          )}
        </div>
      )}

      {/* 3-col: image | image+video prompts | dialogue */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(400px,520px)_minmax(0,1fr)_minmax(220px,320px)]">
        {/* LEFT: image upload */}
        <div className="p-4 border-b md:border-b-0 md:border-r border-[var(--tb-border)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#f97316]" />
              <span className="text-[11px] uppercase tracking-wider text-[var(--tb-text-muted)] font-bold">이미지</span>
            </div>
            {shot.imageUpload && (
              <button
                onClick={onClearImage}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--tb-surface-2)] hover:bg-[#3a1f24] border border-[var(--tb-border)] text-[11px] font-bold text-[color-mix(in_srgb,#fca5a5_62%,var(--tb-text))] tb-press-soft"
              >
                <Trash2 className="w-3 h-3" />
                제거
              </button>
            )}
          </div>
          <UploadSlot image={shot.imageUpload} onFile={onImageFile} />
        </div>

        {/* MIDDLE: i2i + video prompts */}
        <div className="p-4 border-b md:border-b-0 md:border-r border-[var(--tb-border)] space-y-3 min-w-0">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <ImageIcon className="w-3.5 h-3.5 text-[#f97316] flex-shrink-0" />
                <span className="text-[11px] uppercase tracking-wider text-[var(--tb-text-muted)] font-bold">이미지 프롬프트 (i2i)</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[var(--tb-surface-2)] text-[#f97316] font-bold">
                  Nano Banana
                </span>
              </div>
              <button
                onClick={() => onCopy(shot.image_prompt)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] border border-[var(--tb-border)] text-[11px] font-bold text-[var(--tb-text-muted)] tb-press-soft flex-shrink-0"
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
              className="w-full min-h-[110px] resize-y bg-[var(--tb-surface-2)] border border-[var(--tb-border)] rounded-xl p-2.5 text-[13px] leading-relaxed font-mono text-[var(--tb-text)] focus:outline-none focus:border-[#fb923c] focus:ring-[3px] focus:ring-[#fb923c]/20"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <Film className="w-3.5 h-3.5 text-[#f43f5e] flex-shrink-0" />
                <span className="text-[11px] uppercase tracking-wider text-[var(--tb-text-muted)] font-bold">영상 프롬프트</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#3a1f24] text-[#fca5a5] font-bold">
                  사용자 입력
                </span>
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[var(--tb-surface-2)] text-[#f43f5e] font-bold border border-[var(--tb-border)]">
                  대사 ↔ "..." 자동 동기화
                </span>
              </div>
              <button
                onClick={() => onCopy(appendNoBgm(shot.video_prompt))}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] border border-[var(--tb-border)] text-[11px] font-bold text-[var(--tb-text-muted)] tb-press-soft flex-shrink-0"
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
              className="w-full min-h-[110px] resize-y bg-[var(--tb-surface-2)] border border-[var(--tb-border)] rounded-xl p-2.5 text-[13px] leading-relaxed font-mono text-[var(--tb-text)] focus:outline-none focus:border-[#fb923c] focus:ring-[3px] focus:ring-[#fb923c]/20"
            />
          </div>
        </div>

        {/* RIGHT: dialogue */}
        <div className="p-4 bg-[var(--tb-surface-2)] min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <MessageSquare className="w-3.5 h-3.5 text-[#f43f5e] flex-shrink-0" />
              <span className="text-[11px] uppercase tracking-wider text-[var(--tb-text-muted)] font-bold">대사</span>
            </div>
            <button
              onClick={() => onCopy(shot.dialogue)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--tb-surface-2)] hover:bg-[var(--tb-border)] border border-[var(--tb-border)] text-[11px] font-bold text-[var(--tb-text-muted)] tb-press-soft flex-shrink-0"
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
                  className="px-2.5 py-1 rounded-full bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[11px] font-bold text-[var(--tb-text)] tb-press-soft hover:bg-[var(--tb-border)]"
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
            className="w-full min-h-[220px] resize-y bg-[var(--tb-surface-2)] border border-[var(--tb-border)] rounded-xl p-2.5 text-[13px] leading-relaxed text-[var(--tb-text)] focus:outline-none focus:border-[#f43f5e] focus:ring-[3px] focus:ring-[#f43f5e]/20"
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, k, v }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {Icon && <Icon className="w-3 h-3 text-[var(--tb-text-muted)] flex-shrink-0" />}
      <span className="text-[var(--tb-text-muted)] font-bold uppercase tracking-wider text-[10px]">{k}</span>
      <span className="text-[var(--tb-text)] truncate" title={v}>{v}</span>
    </div>
  );
}

function Tag({ children }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--tb-surface-2)] border border-[var(--tb-border)] text-[var(--tb-text)] text-[11px] font-bold whitespace-nowrap">
      {children}
    </span>
  );
}
