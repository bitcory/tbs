'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Copy, Clipboard, ExternalLink, Gem, X, Layers, List, Info } from 'lucide-react';

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
  const promptRef = useRef(null);

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-900/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-3 sm:px-5 h-16 gap-2 sm:gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-sm sm:text-base font-bold text-emerald-400 tracking-wider">TOOLB LAB</span>
        </Link>
        <span className="text-zinc-700 hidden sm:inline">/</span>
        <span className="text-sm text-zinc-400 hidden sm:inline truncate">
          <span className="text-zinc-100 font-bold">1단계</span> 마스터 이미지 만들기
        </span>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => { setUploadOpen(true); setUploadError(''); setJsonInput(''); }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">JSON </span>업로드
          </button>
          <Link
            href="/"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 text-xs sm:text-sm font-bold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            홈
          </Link>
        </div>
      </header>

      <div className="flex flex-col md:flex-row md:h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside className="w-full md:w-[300px] flex-shrink-0 border-b md:border-b-0 md:border-r border-white/[0.06] bg-zinc-900/40 md:overflow-y-auto">
          {/* Template info */}
          <div className="p-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-zinc-500">
              <Info className="w-3 h-3" />
              템플릿 정보
            </div>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="text-sm text-zinc-500 font-medium w-12 pt-0.5">이름</span>
                <span className="text-sm text-zinc-100 font-bold flex-1 break-all">{template.meta_data?.template_name || '—'}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm text-zinc-500 font-medium w-12 pt-0.5">버전</span>
                <span className="text-sm text-zinc-100 font-bold flex-1">{template.meta_data?.version || '—'}</span>
              </div>
            </div>
          </div>

          {/* Palette */}
          {hasPalette && (
            <div className="p-4 border-b border-white/[0.06]">
              <div className="mb-2.5 text-[12px] font-bold uppercase tracking-wider text-zinc-500">
                컬러 팔레트
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {['primary', 'secondary', 'accent']
                  .filter(k => palette[k])
                  .map(k => (
                    <span key={k} className="text-[12px] font-semibold px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-zinc-400">
                      {palette[k]}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Section nav */}
          <div className="p-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-zinc-500">
              <List className="w-3 h-3" />
              섹션 목록
            </div>
            {sections.length === 0 ? (
              <p className="text-[13px] text-zinc-600">템플릿을 로드하면 표시됩니다.</p>
            ) : (
              <div className="space-y-0.5">
                {sections.map((s, i) => {
                  const tc = TAB_COLORS[i % TAB_COLORS.length];
                  const count = (s.components || []).reduce((n, c) => n + (c.attributes || []).length, 0);
                  const isActive = i === activeTab;
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveTab(i)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-sm font-semibold border-l-2 transition-colors ${
                        isActive
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                          : 'border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tc.dot }} />
                      <span className="truncate flex-1 text-left">{s.section_label_ko || s.section_id}</span>
                      <span className="text-[12px] font-bold text-zinc-500 bg-white/[0.04] border border-white/[0.06] rounded px-1.5">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Gem guide */}
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-bold uppercase tracking-wider text-zinc-500">
              <Gem className="w-3 h-3" />
              젬 가이드
            </div>
            <a
              href="https://gemini.google.com/gem/13HOLZGAzOKloWSBnxejnMvWDOJHNvdyu?usp=sharing"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-bold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              1단계 젬 가이드 열기
            </a>
            <a
              href="https://kr.pinterest.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
              </svg>
              핀터레스트
            </a>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col md:overflow-hidden">
          {sections.length > 0 && (
            <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.06] bg-zinc-900/40">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  이미지 프롬프트
                </span>
                <button
                  onClick={() => copyText(promptString)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[12px] font-bold text-zinc-300 transition-colors"
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
                className="w-full min-h-[60px] resize-none bg-zinc-950/60 border border-white/[0.06] rounded-lg p-2.5 text-[13px] leading-relaxed text-zinc-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          )}

          {sections.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
              <h3 className="text-lg font-bold text-zinc-100 mb-2">템플릿을 로드하세요</h3>
              <p className="text-sm text-zinc-500 mb-5 leading-relaxed">
                JSON 업로드 버튼을 클릭하여 템플릿을 불러오거나,<br />
                기본 샘플이 자동으로 로드됩니다.
              </p>
              <button
                onClick={() => { setUploadOpen(true); setUploadError(''); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                JSON 업로드 시작
              </button>
            </div>
          ) : (
            <>
              {/* Tab bar */}
              <div className="flex-shrink-0 flex border-b border-white/[0.06] bg-zinc-900/30 overflow-x-auto">
                {sections.map((s, i) => {
                  const tc = TAB_COLORS[i % TAB_COLORS.length];
                  const isActive = i === activeTab;
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveTab(i)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                        isActive
                          ? 'text-zinc-100 border-emerald-500 bg-zinc-900/50'
                          : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/[0.02]'
                      }`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: tc.dot, opacity: isActive ? 1 : 0.4 }}
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
                      <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-zinc-500 px-1">
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
                              className="bg-zinc-900/50 border border-white/[0.06] rounded-lg overflow-hidden"
                              style={{ opacity }}
                            >
                              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">
                                <div className="flex items-center gap-1.5 text-sm font-bold text-zinc-100 min-w-0">
                                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tc.dot }} />
                                  <span className="truncate">{attr.label_ko || attr.label || attr.attr_id}</span>
                                  {attr.is_locked && (
                                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 flex-shrink-0">고정</span>
                                  )}
                                  {isInactive && (
                                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 flex-shrink-0">비활성</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => copyText(engVal)}
                                    className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[12px] font-bold text-zinc-400 transition-colors"
                                  >
                                    <Copy className="w-3 h-3" />
                                    복사
                                  </button>
                                  <button
                                    onClick={() => pasteText(currentSection.section_id, comp.component_id, attr.attr_id)}
                                    className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[12px] font-bold text-zinc-400 transition-colors"
                                  >
                                    <Clipboard className="w-3 h-3" />
                                    붙여넣기
                                  </button>
                                </div>
                              </div>
                              <div className="flex gap-2 p-3 items-stretch">
                                <div className="flex-1 min-w-0 text-sm font-semibold text-zinc-200 leading-relaxed py-1.5 px-2.5 rounded bg-white/[0.02] border border-white/[0.06]">
                                  {displayVal}
                                </div>
                                <div className="w-px bg-white/[0.06] self-stretch" />
                                <textarea
                                  rows={2}
                                  value={engVal}
                                  placeholder="영문 값 입력..."
                                  onChange={(e) => updateAttr(currentSection.section_id, comp.component_id, attr.attr_id, e.target.value)}
                                  className="flex-1 min-w-0 resize-none text-[13px] leading-relaxed text-zinc-100 py-1.5 px-2.5 rounded bg-zinc-950/60 border border-white/[0.06] focus:outline-none focus:border-emerald-500/50"
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
        </main>
      </div>

      {/* Upload Modal */}
      {uploadOpen && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setUploadOpen(false)}
        >
          <div
            className="bg-zinc-900 rounded-2xl border border-white/[0.08] shadow-2xl w-[560px] max-w-[95vw] max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <span className="text-base font-bold text-zinc-100 uppercase tracking-wider">JSON 템플릿 업로드</span>
              <button
                onClick={() => setUploadOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/[0.06] text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
              <p className="text-sm text-zinc-400 leading-relaxed">
                TB_V5 Lite 형식의 JSON을 붙여넣으세요. <code className="bg-white/[0.04] px-1.5 py-0.5 rounded text-emerald-400 font-mono text-[12px]">prompt_sections</code> 배열이 포함되어야 합니다.
              </p>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full h-[220px] resize-y font-mono text-[13px] leading-relaxed p-3 rounded-lg bg-zinc-950 border border-white/[0.06] text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                placeholder='{"meta_data": {...}, "prompt_sections": [...]}'
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
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors"
              >
                불러오기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[400] bg-emerald-500 text-zinc-950 px-4 py-2.5 rounded-lg shadow-2xl text-sm font-bold animate-fadeIn">
          {toast}
        </div>
      )}
    </div>
  );
}
