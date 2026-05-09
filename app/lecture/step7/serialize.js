// Storyboard JSON v6 → Master Prompt Serializer
// Visual-only mode: no narration, dialogue, or tagline. Music & SFX only.
//
// Each board = exactly 10 seconds, 6 panels with mixed durations (1–3s each).
// Mode A = 1 board (10s). Mode B = 2 boards A+B (20s total).

function hdr(s) {
  return `[${s}]`;
}

function panelLine(panel) {
  const dur = panel.duration_seconds ? ` (${panel.duration_seconds}s)` : '';
  return `${panel.number}. ${panel.timecode}${dur} — ${panel.image_prompt_en}`;
}

function pacingString(panels) {
  return panels.map(p => p.duration_seconds || '?').join('-');
}

export function serializeBoardToPrompt(board, data) {
  const { project, scene, mode, consistency_lock, bridge_frame } = data;
  const isModeB = mode === 'B';
  const panelCount = board.panels.length;
  const gridLayout = panelCount === 12 ? '6 × 2 grid' : '3 × 2 grid';

  const boardLabel = board.label || 'A';
  const titleSuffix = board.title_suffix ? ` — ${board.title_suffix}` : '';
  const titleLine = `${project.title}${titleSuffix}`;
  const boardDuration = board.duration_seconds || 10;
  const pacing = pacingString(board.panels);

  const out = [];

  if (isModeB) {
    out.push(`Create a single premium cinematic ${panelCount}-panel director storyboard presentation board, BOARD ${boardLabel}.`);
    out.push(`A professional film director's pitch-deck sheet, NOT a comic page.`);
    out.push(`This board covers ${boardDuration} seconds (pacing ${pacing}) of a continuous ${project.total_duration_seconds}-second cinematic sequence.`);
  } else {
    out.push(`Create a single premium cinematic ${panelCount}-panel director storyboard presentation board (${boardDuration} SECONDS, mixed pacing ${pacing}).`);
    out.push(`A professional film director's pitch-deck sheet, NOT a comic page.`);
  }
  out.push('');

  // [TOP HEADER]
  out.push(hdr('TOP HEADER'));
  const partLabel = isModeB ? `BOARD ${boardLabel} OF 2` : `BOARD ${boardLabel} OF 1`;
  out.push(`PROJECT TITLE: ${titleLine}    PART: ${partLabel}    DURATION: ${boardDuration} SECONDS`);
  const toneStr = Array.isArray(project.tone) ? project.tone.join(' • ') : (project.tone || '');
  out.push(`GENRE: ${project.genre}    TONE: ${toneStr}    PACING: ${pacing}`);
  out.push('');

  // [LEFT ZONE]
  out.push(hdr('LEFT ZONE'));
  out.push(`SCENE TITLE: ${scene.title}${titleSuffix}`);
  out.push(`LOGLINE: ${scene.logline}`);
  out.push(`SCENE OVERVIEW:`);
  const ov = scene.overview || {};
  out.push(`  LOCATION: ${ov.location || ''}`);
  out.push(`  TIME: ${ov.time || ''}`);
  out.push(`  LIGHTING: ${ov.lighting || ''}`);
  out.push(`  MOOD: ${ov.mood || ''}`);
  out.push(`  SOUND THEME: ${ov.sound_theme || ''}`);
  out.push(`  DIALOGUE: ${ov.dialogue || 'None (Music & SFX only)'}`);
  out.push(`  TRANSITION STYLE: ${ov.transition_style || ''}`);
  out.push('');

  // [CENTER HERO FRAME]
  out.push(hdr('CENTER HERO FRAME'));
  out.push(board.main_frame?.prompt_en || '');
  out.push('');

  // [RIGHT ZONE]
  out.push(`[RIGHT ZONE: TOTAL DURATION ${project.total_duration_seconds} SECONDS / ${panelCount} PANELS]`);
  out.push('');

  // [PANELS]
  out.push(`[${panelCount} PANELS — ${gridLayout}]`);
  for (const panel of board.panels) {
    out.push(panelLine(panel));
  }
  out.push('');
  out.push(`Each panel includes 4 small-cap labels:`);
  out.push(`ACTION / VISUAL  •  CAMERA / MOVEMENT  •  SOUND / DIALOGUE (music & SFX only)  •  TRANSITION`);

  // [BOTTOM]
  out.push('');
  out.push(hdr('BOTTOM'));
  out.push(`NOTES FOR PRODUCTION:`);
  for (const note of (board.production_notes || [])) {
    out.push(`- ${note}`);
  }
  out.push('');
  out.push(`VISUAL REFERENCES & MOODBOARD: ${(board.moodboard_keywords || []).join(', ')}.`);
  out.push('');

  // [DESIGN STYLE]
  const tokens = data.production?.design_tokens || {};
  out.push(hdr('DESIGN STYLE'));
  out.push(`Dark luxury director-board, charcoal background (${tokens.color_background_primary || '#0A0A0A'} / ${tokens.color_background_secondary || '#1A1A1A'}),`);
  out.push(`gold accents (${tokens.color_accent_gold || '#C9A96E'}), off-white type (${tokens.color_text_primary || '#F5F0E6'}),`);
  out.push(`elegant serif headlines, small-cap labels, thin gold dividers,`);
  out.push(`magazine-spread quality, no comic style, no random text, no real-world brand logos.`);
  out.push('');

  // [VISUAL STYLE]
  out.push(hdr('VISUAL STYLE'));
  out.push(`Cinematic realistic, high contrast lighting, shallow depth of field,`);
  out.push(`filmic color grading, anamorphic flare, atmospheric highlights,`);
  out.push(`${(project.genre || '').toLowerCase()} look, consistent subject/lighting/palette across all ${panelCount} panels.`);

  // Mode B only — consistency lock + bridge note
  if (isModeB && bridge_frame && consistency_lock) {
    out.push('');
    out.push(hdr('CONSISTENCY LOCK (byte-identical across both boards)'));
    out.push(`SUBJECT: ${consistency_lock.subject_en}`);
    out.push(`SETTING: ${consistency_lock.setting_en}`);
    out.push(`LIGHTING: ${consistency_lock.lighting_en}`);
    out.push(`BGM POLICY: ${consistency_lock.bgm_policy}`);
    if (boardLabel === 'A') {
      out.push(`→ Continues to Board B. Bridge: ${bridge_frame.summary || ''}`);
    } else {
      out.push(`← Continues from Board A. Starts from: ${bridge_frame.summary || ''}`);
    }
  }

  out.push('');
  out.push(`Aspect ratio ${data.production?.aspect_ratio || '16:9'}. Ultra-detailed, magazine-spread quality.`);

  return out.join('\n');
}

export function serializeAllBoards(data) {
  return data.boards.map((board) => ({
    board_label: board.label,
    title: `${data.project.title}${board.title_suffix ? ' — ' + board.title_suffix : ''} (Board ${board.label})`,
    prompt: serializeBoardToPrompt(board, data),
  }));
}
