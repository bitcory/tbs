// Storyboard JSON → Master Prompt Serializer
// Ported from /Users/toolb/tb/지침/PROCLASS/시네마광고영상/serialize.ts
// Output is a single English text block intended for image generators
// (Nano Banana / Midjourney / DALL·E / Aurora).

function header(s) {
  return `[${s}]`;
}

function panelLine(panel) {
  return `${panel.number}. ${panel.timecode} — ${panel.image_prompt_en}`;
}

function voiceLine(panel) {
  const v = panel.voice;
  if (!v || v.type === 'none' || !v.line_en) return null;
  const tag = v.type === 'tagline' ? 'TAGLINE' : v.type === 'dialogue' ? 'DIALOGUE' : 'VO';
  const speaker = v.speaker ? ` (${v.speaker})` : '';
  return `   ${tag}${speaker}: "${v.line_en}"`;
}

function panelBlock(panel, includeVoice) {
  const main = panelLine(panel);
  if (!includeVoice) return main;
  const voice = voiceLine(panel);
  return voice ? `${main}\n${voice}` : main;
}

export function serializeBoardToPrompt(board, data) {
  const { project, scene, audio_mode, mode, consistency_lock, bridge_frame } = data;
  const includeVoice = audio_mode !== 'silent';
  const isModeB = mode === 'B';

  const panelCount = board.panels.length;
  const gridLayout = panelCount === 12 ? '6 × 2 grid' : '3 × 2 grid';

  const partLabel = board.part_label;
  const durationLabel = board.duration_label;
  const titleSuffix = board.title_suffix ? ` — ${board.title_suffix}` : '';
  const titleLine = `${project.title}${titleSuffix}`;

  const sections = [];

  if (isModeB) {
    sections.push(`Create a single premium cinematic ${panelCount}-panel director storyboard presentation board, PART ${partLabel}.`);
    sections.push(`A professional film director's pitch-deck sheet, NOT a comic page.`);
    sections.push(`This board covers ${durationLabel.replace(' SECONDS', '')} of a continuous ${project.total_duration_seconds}-second cinematic sequence.`);
  } else {
    sections.push(`Create a single premium cinematic ${panelCount}-panel director storyboard presentation board.`);
    sections.push(`A professional film director's pitch-deck sheet, NOT a comic page.`);
  }

  sections.push('');

  // [TOP HEADER]
  sections.push(header('TOP HEADER'));
  sections.push(`PROJECT TITLE: ${titleLine}    PART: ${partLabel}    DURATION: ${durationLabel}`);
  const toneStr = Array.isArray(project.tone) ? project.tone.join(' • ') : (project.tone || '');
  sections.push(`GENRE: ${project.genre}    TONE: ${toneStr}`);
  sections.push('');

  // [LEFT ZONE]
  sections.push(header('LEFT ZONE'));
  const sceneTitle = `${scene.title}${titleSuffix}`;
  sections.push(`SCENE TITLE: ${sceneTitle}`);
  sections.push(`LOGLINE: ${scene.logline}`);
  sections.push(`SCENE OVERVIEW:`);
  const ov = scene.overview || {};
  sections.push(`  LOCATION: ${ov.location || ''}`);
  sections.push(`  TIME: ${ov.time || ''}`);
  sections.push(`  LIGHTING: ${ov.lighting || ''}`);
  sections.push(`  MOOD: ${ov.mood || ''}`);
  sections.push(`  SOUND THEME: ${ov.sound_theme || ''}`);
  sections.push(`  DIALOGUE: ${ov.dialogue || ''}`);
  sections.push(`  TRANSITION STYLE: ${ov.transition_style || ''}`);
  sections.push('');

  // [CENTER HERO FRAME]
  sections.push(header('CENTER HERO FRAME'));
  sections.push(board.main_frame?.prompt_en || '');
  sections.push('');

  // [RIGHT ZONE]
  sections.push(`[RIGHT ZONE: TOTAL DURATION ${project.total_duration_seconds} SECONDS / ${panelCount} PANELS]`);
  sections.push('');

  // [PANELS]
  sections.push(`[${panelCount} PANELS — ${gridLayout}]`);
  for (const panel of board.panels) {
    sections.push(panelBlock(panel, includeVoice));
  }
  sections.push('');
  sections.push(`Each panel includes 4 small-cap labels:`);
  sections.push(`ACTION / VISUAL  •  CAMERA / MOVEMENT  •  SOUND / DIALOGUE  •  TRANSITION`);
  sections.push('');

  // Voice section
  if (includeVoice) {
    const voiceLines = board.panels
      .map((p) => {
        const v = p.voice;
        if (!v || v.type === 'none') return null;
        const koLine = v.line_ko ? `  ko: "${v.line_ko}"` : '';
        const enLine = v.line_en ? `  en: "${v.line_en}"` : '';
        const delivery = v.delivery ? `  delivery: ${v.delivery}` : '';
        return `Panel ${p.number} [${p.timecode}] ${v.type.toUpperCase()}${
          v.speaker ? ` — ${v.speaker}` : ''
        }\n${koLine}\n${enLine}\n${delivery}`;
      })
      .filter(Boolean);

    if (voiceLines.length) {
      sections.push(header('VOICE / NARRATION / DIALOGUE'));
      sections.push(voiceLines.join('\n\n'));
      sections.push('');
    }
  }

  // [BOTTOM]
  sections.push(header('BOTTOM'));
  sections.push(`NOTES FOR PRODUCTION:`);
  for (const note of (board.production_notes || [])) {
    sections.push(`- ${note}`);
  }
  sections.push('');
  sections.push(`VISUAL REFERENCES & MOODBOARD: ${(board.moodboard_keywords || []).join(', ')}.`);
  sections.push('');

  // [DESIGN STYLE]
  const tokens = data.production?.design_tokens || {};
  sections.push(header('DESIGN STYLE'));
  sections.push(`Dark luxury director-board, charcoal background (${tokens.color_background_primary || '#0A0A0A'} / ${tokens.color_background_secondary || '#1A1A1A'}),`);
  sections.push(`gold accents (${tokens.color_accent_gold || '#C9A96E'}), off-white type (${tokens.color_text_primary || '#F5F0E6'}),`);
  sections.push(`elegant serif headlines, small-cap labels, thin gold dividers,`);
  sections.push(`magazine-spread quality, no comic style, no random text, no real-world brand logos.`);
  sections.push('');

  // [VISUAL STYLE]
  sections.push(header('VISUAL STYLE'));
  sections.push(`Cinematic realistic, high contrast lighting, shallow depth of field,`);
  sections.push(`filmic color grading, anamorphic flare, atmospheric highlights,`);
  sections.push(`${(project.genre || '').toLowerCase()} look, consistent subject/lighting/palette across all ${panelCount} panels.`);

  // Mode B — consistency lock + bridge note
  if (isModeB && bridge_frame && consistency_lock) {
    sections.push('');
    sections.push(header('CONSISTENCY LOCK (byte-identical across both boards)'));
    sections.push(`SUBJECT: ${consistency_lock.subject_en}`);
    sections.push(`SETTING: ${consistency_lock.setting_en}`);
    sections.push(`LIGHTING: ${consistency_lock.lighting_en}`);
    sections.push(`BGM POLICY: ${consistency_lock.bgm_policy}`);

    if (board.index === 1) {
      sections.push(`→ Continues to Part 2 of 2. Bridge frame: ${bridge_frame.summary_ko || ''}`);
    } else {
      sections.push(`← Continues from Part 1 of 2. Starts from: ${bridge_frame.summary_ko || ''}`);
    }
  }

  sections.push('');
  sections.push(`Aspect ratio ${data.production?.aspect_ratio || '16:9'}. Ultra-detailed, magazine-spread quality.`);

  return sections.join('\n');
}

export function serializeAllBoards(data) {
  return data.boards.map((board) => ({
    board_index: board.index,
    title: `${data.project.title}${board.title_suffix ? ' — ' + board.title_suffix : ''} (${board.part_label})`,
    prompt: serializeBoardToPrompt(board, data),
  }));
}
