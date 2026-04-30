// Cinematic JSON parser — accepts multiple shapes:
//  - Production bible (full project + scenes/characters/videoClips/music/voice/screenplay)
//  - Character sheet (json.characters[] with character_id) → mapped into cinematicData.characters
//  - v4 scene block ({ scene, videoClips, bgm, sfx }) → merged into cinematicData
//  - Image-prompt-only scene ({ scene_id, image_prompts: { bg_plate, start_frame, ... } })
//  - Video-prompt-only ({ scene_id, platform_prompts } or v4 video clip array)
//
// Returns the next cinematicData. Caller passes the previous data so partial
// JSONs can merge in (e.g. add S2 after S1 was loaded earlier).

function cleanRaw(raw) {
  return String(raw || '').trim()
    .replace(/^```(?:json|JSON)?\s*\n?/gm, '')
    .replace(/\n?```\s*$/gm, '')
    .trim();
}

function sortByLeadingNum(a, b) {
  const na = parseInt((a || '').replace(/\D/g, '') || '0', 10);
  const nb = parseInt((b || '').replace(/\D/g, '') || '0', 10);
  return na - nb;
}

function mergeById(existing, incoming, key = 'id') {
  const map = new Map(existing.map((x) => [x[key], x]));
  for (const x of incoming) map.set(x[key], x);
  return Array.from(map.values());
}

export function parseCinematicJson(raw, previous) {
  const cleaned = cleanRaw(raw);
  if (!cleaned) throw new Error('JSON 내용을 입력해주세요.');
  let json;
  try { json = JSON.parse(cleaned); }
  catch (e) { throw new Error(`JSON 파싱 오류: ${e.message}`); }

  // (1) 캐릭터 시트 JSON
  if (json.characters && Array.isArray(json.characters) && json.characters.length > 0
      && json.characters[0].character_id && !json.project) {
    const convertedChars = json.characters.map((ch) => {
      const desc = ch.description || {};
      const nameMatch = ch.name?.match(/^(.+?)\s*\((.+?)\)$/);
      const labelMap = { ethnicity: '민족', gender: '성별', hair: '머리', eyes: '눈', skin: '피부', clothing: '의상', distinctive_features: '특징' };
      return {
        id: ch.character_id,
        name: nameMatch ? nameMatch[1] : ch.name,
        nameEn: nameMatch ? nameMatch[2] : undefined,
        age: desc.age || '',
        role: ch.role || '',
        description: ch.personality || '',
        appearance: typeof desc === 'object'
          ? Object.fromEntries(
              Object.entries(desc).filter(([k]) => k !== 'age')
                .map(([k, v]) => [labelMap[k] || k, v]))
          : {},
        promptBase: [
          ch.visual_key,
          ...(typeof desc === 'object' ? Object.entries(desc).filter(([k]) => k !== 'age').map(([, v]) => v).filter(Boolean) : []),
        ].filter(Boolean).join(', '),
      };
    });
    const existing = previous || {};
    const merged = { ...existing, characters: convertedChars, _charSheetId: json.production_id };
    if (!merged.project) merged.project = { title: '캐릭터 시트 미리보기', subtitle: json.production_id || '' };
    return { data: merged, focusTab: 'characters' };
  }

  // (2) v4 씬별 통합 JSON
  if (json.scene && json.scene.sceneId && !json.project) {
    const existing = previous || {};
    const existingScenes = existing.scenes || [];
    const scenesMap = new Map(existingScenes.map((s) => [s.sceneId, s]));
    scenesMap.set(json.scene.sceneId, json.scene);
    const mergedScenes = Array.from(scenesMap.values())
      .sort((a, b) => sortByLeadingNum(a.sceneId, b.sceneId));

    // Merge characters from this scene into top-level characters[] (dedupe by name).
    const existingChars = existing.characters || [];
    const charMap = new Map(existingChars.map((c) => [c.name || c.id, c]));
    (json.scene.characters || []).forEach((c) => {
      const key = c.name || c.id;
      if (!key) return;
      const prev = charMap.get(key) || {};
      charMap.set(key, { ...prev, ...c });
    });
    const mergedChars = Array.from(charMap.values());

    const existingClips = existing.videoClips || [];
    const clipsMap = new Map(existingClips.map((c) => [c.id, c]));
    (json.videoClips || []).forEach((c) => clipsMap.set(c.id, c));
    const mergedClips = Array.from(clipsMap.values()).sort((a, b) => {
      const pa = String(a.id || '').match(/S(\d+).*C(\d+)/);
      const pb = String(b.id || '').match(/S(\d+).*C(\d+)/);
      return pa && pb ? (parseInt(pa[1]) - parseInt(pb[1])) || (parseInt(pa[2]) - parseInt(pb[2])) : 0;
    });

    const existingMusic = existing.music || {};
    const existingTracks = existingMusic.tracks || [];
    const tracksMap = new Map(existingTracks.map((t) => [t.id, t]));
    if (json.bgm) tracksMap.set(json.bgm.id, json.bgm);
    const mergedTracks = Array.from(tracksMap.values())
      .sort((a, b) => sortByLeadingNum(a.id, b.id));

    const existingSfx = existingMusic.sfx || [];
    const sfxMap = new Map(existingSfx.map((s) => [s.id, s]));
    (json.sfx || []).forEach((s) => sfxMap.set(s.id, s));
    const mergedSfx = Array.from(sfxMap.values());

    const merged = {
      ...existing,
      scenes: mergedScenes,
      videoClips: mergedClips,
      music: { ...existingMusic, tracks: mergedTracks, sfx: mergedSfx },
      characters: mergedChars,
    };
    if (!merged.project) merged.project = { title: '씬별 제작 진행 중', subtitle: `${mergedScenes.length}개 씬 완료` };
    else merged.project = { ...merged.project, subtitle: `${mergedScenes.length}개 씬 완료` };

    const targetIdx = mergedScenes.findIndex((s) => s.sceneId === json.scene.sceneId);
    return { data: merged, focusTab: 'scenes', focusSceneIdx: targetIdx >= 0 ? targetIdx : 0 };
  }

  // (3) 영상 프롬프트 JSON
  const isV4VideoClip = (o) => o.id && /^S\d+.*C\d+/.test(o.id) && o.prompt;
  const isPlatformVideo = (o) => o.scene_id && o.platform_prompts;
  const videoArr = isPlatformVideo(json) ? [json]
    : isV4VideoClip(json) ? [json]
    : (Array.isArray(json) && json.length > 0 && (isPlatformVideo(json[0]) || isV4VideoClip(json[0]))) ? json
    : null;
  if (videoArr && !json.project) {
    const convertedClips = videoArr.map((sc) => {
      if (sc.prompt) return sc;
      const pp = sc.platform_prompts || {};
      return {
        id: sc.scene_id,
        label: sc.title || '',
        duration: pp.kling?.settings?.match(/Duration:\s*(\d+s)/)?.[1]
          || pp.grok?.settings?.match(/Duration:\s*(\d+s)/)?.[1] || '',
        camera: pp.kling?.settings || '',
        kling:    pp.kling    ? { prompt: pp.kling.prompt,    negative: pp.kling.negative    || '', settings: pp.kling.settings    || '' } : undefined,
        seedance: pp.seedance ? { prompt: pp.seedance.prompt, negative: pp.seedance.negative || '', settings: pp.seedance.settings || '' } : undefined,
        grok:     pp.grok     ? { prompt: pp.grok.prompt,                                          settings: pp.grok.settings     || '' } : undefined,
      };
    });
    const existing = previous || {};
    const existingClips = existing.videoClips || [];
    const clipsMap = new Map(existingClips.map((c) => [c.id, c]));
    convertedClips.forEach((c) => clipsMap.set(c.id, c));
    const mergedClips = Array.from(clipsMap.values()).sort((a, b) => sortByLeadingNum(a.id, b.id));
    const merged = { ...existing, videoClips: mergedClips };
    if (!merged.project) merged.project = { title: '영상 프롬프트 미리보기', subtitle: '' };
    return { data: merged, focusTab: 'video' };
  }

  // (4) 이미지 프롬프트만 JSON
  const sceneArr = (json.scene_id && json.image_prompts) ? [json]
    : (Array.isArray(json) && json.length > 0 && json[0].scene_id && json[0].image_prompts) ? json
    : null;
  if (sceneArr && !json.project) {
    const labelMap = { bg_plate: 'BG Plate', start_frame: 'Start Frame', end_frame: 'End Frame' };
    const convertedScenes = sceneArr.map((sc) => {
      const prompts = sc.image_prompts || {};
      const shots = Object.entries(prompts)
        .filter(([k]) => k !== 'bg_plate')
        .map(([k, v], i) => ({
          id: `${sc.scene_id}-${String(i + 1).padStart(2, '0')}`,
          type: labelMap[k] || k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          prompts: [{ tag: 'EN', en: v, kr: '' }],
        }));
      return {
        sceneId: sc.scene_id,
        title: sc.title || '',
        time: '',
        setting: '',
        mood: '',
        bgPrompt: prompts.bg_plate || '',
        koreanRef: sc.korean_reference || '',
        shots,
      };
    });
    const existing = previous || {};
    const existingScenes = existing.scenes || [];
    const sceneMap = new Map(existingScenes.map((s) => [s.sceneId, s]));
    convertedScenes.forEach((s) => sceneMap.set(s.sceneId, s));
    const mergedScenes = Array.from(sceneMap.values())
      .sort((a, b) => sortByLeadingNum(a.sceneId, b.sceneId));
    const merged = { ...existing, scenes: mergedScenes };
    if (!merged.project) merged.project = { title: '씬 프롬프트 미리보기', subtitle: '' };
    const targetIdx = mergedScenes.findIndex((s) => s.sceneId === convertedScenes[0]?.sceneId);
    return { data: merged, focusTab: 'scenes', focusSceneIdx: targetIdx >= 0 ? targetIdx : 0 };
  }

  // (5) 풀 프로덕션 바이블 JSON
  if (!json.project) throw new Error('"project", "characters"(캐릭터 시트), 또는 "scene_id"(씬 프롬프트) 필드가 필요합니다.');

  const norm = { ...json };
  if (!norm.characters && norm.characters_example) norm.characters = norm.characters_example;
  if (!norm.scenes) {
    const sceneKeys = Object.keys(norm).filter((k) => /^scenes_example/.test(k));
    if (sceneKeys.length > 0) norm.scenes = sceneKeys.map((k) => norm[k]);
  }
  if (!norm.videoClips && norm.videoClips_example) norm.videoClips = norm.videoClips_example;
  if (!norm.music && norm.music_example) {
    const me = { ...norm.music_example };
    if (!me.tracks && me.tracks_example) me.tracks = Array.isArray(me.tracks_example) ? me.tracks_example : [me.tracks_example];
    norm.music = me;
  }
  if (!norm.voice && norm.voice_example) norm.voice = norm.voice_example;
  if (!norm.screenplay && norm.screenplay_example) norm.screenplay = norm.screenplay_example;

  return { data: norm, focusTab: 'overview' };
}
