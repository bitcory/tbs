'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Library, UsersRound, Clapperboard,
  Menu, FileInput, FolderOpen, X, BookOpen, ArrowLeft, Ruler,
  ExternalLink, MessageSquare, AudioLines, Music, Workflow, ScrollText, Wand2,
} from 'lucide-react';

const SAMPLE_URL = '/picbook/sample_library.json';
const CACHE_KEY = 'toolb_step8_picbook_v1';
const SCRIPT_KEY = 'toolb_step8_script_v1';

const DOT_RULES = [
  { rx: /scarlet|콩쥐|다홍/, color: '#d6452f' },
  { rx: /purple|teal|팥쥐|보라/, color: '#6b5b95' },
  { rx: /grey|charcoal|소|ox/, color: '#5a5550' },
  { rx: /green|두꺼비|toad/, color: '#8aa05a' },
  { rx: /brown|참새|sparrow/, color: '#a9733f' },
  { rx: /yellow-star|다다|dada/, color: '#e0a32e' },
  { rx: /glow|moonlight|깜깜이|glim/, color: '#f3d674' },
  { rx: /black cat|까망|고양이|cat/, color: '#3a3742' },
];

function dotColor(c) {
  const t = (c?.id_point || '') + (c?.id || '');
  for (const { rx, color } of DOT_RULES) if (rx.test(t)) return color;
  return '#c9a14a';
}

function splitNegative(common) {
  if (!common) return { negative: '' };
  const m = String(common).match(/(\bNo\s+text\b[\s\S]*?(?:wordless\s+illustration\.?|$))/i);
  return { negative: m ? m[1].trim() : '' };
}

function buildPrompt(book, base, kind) {
  const sb = book?.style_block || {};
  const add =
    kind === 'char' ? (sb.character_add ? ' ' + sb.character_add : '') :
    kind === 'cover' ? (sb.cover_add ? ' ' + sb.cover_add : '') :
    (sb.scene_add ? ' ' + sb.scene_add : '');
  const { negative } = splitNegative(sb.common);
  return base + add + (negative ? ' ' + negative : '');
}

function escapeId(s) {
  return String(s || '');
}

function parseScript(text) {
  if (!text) return '';
  // 1, 1., 1), [1], (1), <1>, 1: 같은 단독 넘버링 라벨을 인식
  const onlyNum = /^(?:\[\s*\d+\s*\]|\(\s*\d+\s*\)|<\s*\d+\s*>|\d+\s*[.):]?)$/;
  const inlineNum = /^(?:\[\s*\d+\s*\]|\(\s*\d+\s*\)|<\s*\d+\s*>|\d+\s*[.):])\s*/;
  // 본문 안에 [N] 만 있는 줄도 안전하게 제거
  const cleaned = String(text)
    .split('\n')
    .filter((ln) => !onlyNum.test(ln.trim()))
    .join('\n');
  const blocks = cleaned.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean);
  const scenes = blocks.map((b) => b.replace(inlineNum, ''));
  return scenes.join('\n\n');
}

export default function Step8Client() {
  const [lib, setLib] = useState(null);
  const [bookIdx, setBookIdx] = useState(0);
  const [section, setSection] = useState('chars'); // chars | cuts (cuts 안에 표지 탭 포함)
  const [activeChar, setActiveChar] = useState(0);
  const [cutFilter, setCutFilter] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonErr, setJsonErr] = useState('');
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [scriptModalOpen, setScriptModalOpen] = useState(false);
  const [scriptInput, setScriptInput] = useState('');
  const [scriptPreview, setScriptPreview] = useState('');
  const [scriptParsed, setScriptParsed] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const fileInputRef = useRef(null);
  const modalFileRef = useRef(null);
  const toastTimer = useRef(null);

  // 초기 로드: localStorage 캐시가 있으면 그것을, 없으면 샘플을 fetch.
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const obj = JSON.parse(cached);
        setLib(normalizeLib(obj));
        return;
      }
    } catch {}
    fetch(SAMPLE_URL)
      .then((r) => r.json())
      .then((obj) => setLib(normalizeLib(obj)))
      .catch(() => setLib(null));
  }, []);

  // 저장된 본문 대본 복원 — 새로고침 후에도 유지된다.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SCRIPT_KEY);
      if (saved) {
        setScriptParsed(saved);
        setScriptPreview(saved);
        setScriptInput(saved);
      }
    } catch {}
  }, []);

  const book = lib?.books?.[bookIdx] || null;
  const isNight = useMemo(() => {
    const mood = book?.meta?.mood || '';
    return /calm|night|밤|dark/.test(mood);
  }, [book]);

  // body.night 클래스 토글 — 별 배경/팔레트 전환.
  useEffect(() => {
    if (isNight) document.body.classList.add('picbook-night');
    else document.body.classList.remove('picbook-night');
    return () => document.body.classList.remove('picbook-night');
  }, [isNight]);

  const charMap = useMemo(() => {
    const m = {};
    (book?.characters || []).forEach((c) => { m[c.id] = c; });
    return m;
  }, [book]);

  function normalizeLib(obj) {
    if (!obj) return null;
    if (obj.books) return obj;
    return { library_meta: { name: '우리 그림책 서재' }, books: [obj] };
  }

  function loadLib(obj) {
    const norm = normalizeLib(obj);
    if (!norm) return;
    setLib(norm);
    setBookIdx(0);
    setActiveChar(0);
    setSection('chars');
    setCutFilter('all');
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(norm)); } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showToast(msg = '복사됐어요!') {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 1400);
  }

  function copyText(txt) {
    navigator.clipboard.writeText(txt).then(() => showToast());
  }

  function openBook(i) {
    setBookIdx(i);
    setActiveChar(0);
    setSection('chars');
    setCutFilter('all');
    if (window.innerWidth <= 900) setSidebarOpen(false);
  }

  function jumpToChar(id) {
    const idx = (book?.characters || []).findIndex((c) => c.id === id);
    if (idx < 0) return;
    setActiveChar(idx);
    setSection('chars');
    setTimeout(() => {
      document.querySelector('.char-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

  function applyJsonText() {
    const txt = jsonText.trim();
    if (!txt) { setJsonErr('JSON 내용을 입력하세요.'); return; }
    try {
      const obj = JSON.parse(txt);
      loadLib(obj);
      setJsonText('');
      setJsonErr('');
      setJsonModalOpen(false);
    } catch (err) {
      setJsonErr('JSON 파싱 실패: ' + err.message);
    }
  }

  function handleModalFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const txt = r.result;
      setJsonText(txt);
      try {
        loadLib(JSON.parse(txt));
        setJsonText('');
        setJsonErr('');
        setJsonModalOpen(false);
      } catch (err) {
        setJsonErr('JSON 파싱 실패: ' + err.message);
      }
    };
    r.readAsText(f);
    e.target.value = '';
  }

  function resetToSample() {
    try { localStorage.removeItem(CACHE_KEY); } catch {}
    fetch(SAMPLE_URL).then((r) => r.json()).then((obj) => loadLib(obj));
  }

  // 모달 ESC / Cmd+Enter
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { setJsonModalOpen(false); setScriptModalOpen(false); setMatchModalOpen(false); setSidebarOpen(false); }
      if (jsonModalOpen && (e.metaKey || e.ctrlKey) && e.key === 'Enter') applyJsonText();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jsonModalOpen, jsonText]);

  // 윈도우 리사이즈 시 모바일 사이드바 닫힘
  useEffect(() => {
    function onResize() { if (window.innerWidth > 900) setSidebarOpen(false); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const libName = lib?.library_meta?.name || '우리 그림책 서재';
  const books = lib?.books || [];
  const chars = book?.characters || [];
  const cuts = book?.cuts || [];
  const covers = book?.covers || [];
  const currentChar = chars[activeChar] || null;

  return (
    <div className="picbook-root">
      {/* TOPBAR */}
      <header className="topbar">
        <button
          type="button"
          className="menu-toggle"
          aria-label="메뉴 열기"
          onClick={() => setSidebarOpen((v) => !v)}
        >
          <Menu size={20} />
        </button>
        <div className="brand">
          <Link href="/" className="back-btn" aria-label="홈으로">
            <ArrowLeft size={16} /> 홈
          </Link>
          <span className="kicker">PRO 4 · PICTURE BOOK</span>
          <span className="lib-name">{libName}</span>
        </div>
        <div className="top-actions">
          <button type="button" className="btn ghost" onClick={resetToSample} title="책장을 초기 상태로 되돌리기">
            초기화
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setScriptModalOpen(true)}
            title="본문 대본을 붙여넣어 넘버링을 제거하고 빈 줄 두 번으로 파싱"
          >
            본문대본
          </button>
          <button type="button" className="btn" onClick={() => setJsonModalOpen(true)}>
            JSON 불러오기
          </button>
        </div>
      </header>

      {sidebarOpen && (
        <div className="sidebar-backdrop show" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="layout">
        {/* SIDEBAR */}
        <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="side-section">
            <div className="side-title">
              <Library size={18} /> 책장 <span className="badge">{books.length}권</span>
            </div>
            <div className="shelf">
              {books.length === 0 && (
                <div className="side-empty">JSON을 불러오세요</div>
              )}
              {books.map((bk, i) => {
                const col = /calm|night|밤/.test(bk?.meta?.mood || '') ? '#8aa0d8' : '#d6452f';
                const cutCount = (bk?.cuts || []).length;
                const charCount = (bk?.characters || []).length;
                return (
                  <button
                    key={i}
                    type="button"
                    className={`book-tab${i === bookIdx ? ' active' : ''}`}
                    style={{ animationDelay: `${i * 0.05}s` }}
                    onClick={() => openBook(i)}
                  >
                    <span className="bt-spine" style={{ background: col }} />
                    <div className="bt-title">{bk?.meta?.title}</div>
                    <div className="bt-sub">{bk?.meta?.source || ''} · {cutCount}컷 · 캐릭터 {charCount}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="side-section">
            <div className="nav-list">
              <button
                type="button"
                className={`nav-item${section === 'chars' ? ' active' : ''}`}
                onClick={() => { setSection('chars'); if (window.innerWidth <= 900) setSidebarOpen(false); }}
              >
                <span className="nav-ic"><UsersRound size={18} /></span>
                <span className="nav-lbl">캐릭터 시트</span>
                <span className="badge">{chars.length}</span>
              </button>
              <button
                type="button"
                className={`nav-item${section === 'cuts' ? ' active' : ''}`}
                onClick={() => { setSection('cuts'); if (window.innerWidth <= 900) setSidebarOpen(false); }}
              >
                <span className="nav-ic"><Clapperboard size={18} /></span>
                <span className="nav-lbl">본문 컷</span>
                <span className="badge">{cuts.length}{covers.length ? `+${covers.length}` : ''}</span>
              </button>
            </div>
            {!book && <div className="side-empty">책을 선택하세요</div>}
          </div>

          <div className="side-section">
            <div className="nav-list">
              <a
                className="nav-item guide-link"
                href="https://chatgpt.com/g/g-6a1394316644819192df66a06c4795ea-pro-5dangye-aiwa-hamggehaneun-geurimcaeg-mandeulgi"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="nav-ic"><BookOpen size={18} /></span>
                <span className="nav-lbl">그림책 지침 GPT</span>
                <ExternalLink size={14} className="ext-ic" />
              </a>
              <a
                className="nav-item guide-link"
                href="https://chatgpt.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="nav-ic"><MessageSquare size={18} /></span>
                <span className="nav-lbl">챗지피티 바로가기</span>
                <ExternalLink size={14} className="ext-ic" />
              </a>
              <a
                className="nav-item guide-link"
                href="https://labs.google/fx/ko/tools/flow/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="nav-ic"><Workflow size={18} /></span>
                <span className="nav-lbl">FLOW 바로가기</span>
                <ExternalLink size={14} className="ext-ic" />
              </a>
              <a
                className="nav-item guide-link"
                href="https://elevenlabs.io/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="nav-ic"><AudioLines size={18} /></span>
                <span className="nav-lbl">일레븐랩스 바로가기</span>
                <ExternalLink size={14} className="ext-ic" />
              </a>
              <a
                className="nav-item guide-link"
                href="https://gemini.google.com/gem/6bbd0e1665fb/7ebb7f6cc46ea2b4?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="nav-ic"><Wand2 size={18} /></span>
                <span className="nav-lbl">음악만들기</span>
                <ExternalLink size={14} className="ext-ic" />
              </a>
              <a
                className="nav-item guide-link"
                href="https://suno.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="nav-ic"><Music size={18} /></span>
                <span className="nav-lbl">SUNO 바로가기</span>
                <ExternalLink size={14} className="ext-ic" />
              </a>
              <a
                className="nav-item guide-link"
                href="https://tbbook.aitoolb.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="nav-ic"><BookOpen size={18} /></span>
                <span className="nav-lbl">매직북 바로가기</span>
                <ExternalLink size={14} className="ext-ic" />
              </a>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="content">
          {!book && (
            <div className="lib-empty">
              <div className="lib-empty-ic"><BookOpen size={40} /></div>
              <div className="lib-empty-title">아직 책장이 비어 있어요</div>
              <div className="lib-empty-desc">그림책 JSON 데이터를 불러와 캐릭터·컷·표지를 한눈에 펼쳐보세요.</div>
              <button type="button" className="lib-empty-btn" onClick={() => setJsonModalOpen(true)}>
                <FileInput size={18} /> JSON 불러오기
              </button>
            </div>
          )}

          {book && (
            <div className="book-view">
              <div className="book-head">
                <h1>{book.meta?.title}</h1>
                <div className="meta-row">
                  {[
                    ['원작', book.meta?.source],
                    ['연령', book.meta?.age ? `${book.meta.age}세` : null],
                    ['분위기', book.meta?.mood],
                    ['컷 수', `${cuts.length}컷`],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <span key={k} className="chip">{k} · {v}</span>
                  ))}
                </div>
                {book.meta?.message && (
                  <p className="message">{book.meta.message}</p>
                )}
              </div>

              {section === 'chars' && (
                <section className="sec-pane">
                  <div className="sec-title">
                    캐릭터 시트
                    <button
                      type="button"
                      className="mini sec-action"
                      title="모든 캐릭터의 프롬프트(본문+add+네거티브)를 빈 줄로 구분해 한 번에 복사"
                      onClick={() => copyText(chars.map((c) => buildPrompt(book, c.prompt_en || '', 'char')).join('\n\n'))}
                    >
                      전체 프롬프트 복사
                    </button>
                  </div>
                  <div className="sec-sub">{chars.length}종 · 탭으로 캐릭터를 선택하세요</div>
                  <div className="char-tabs">
                    {chars.map((c, i) => (
                      <button
                        key={c.id || i}
                        type="button"
                        className={`ctab${i === activeChar ? ' active' : ''}`}
                        style={{ animationDelay: `${i * 0.04}s` }}
                        onClick={() => setActiveChar(i)}
                      >
                        <span className="dot" style={{ background: dotColor(c) }} />
                        {c.name_ko || c.id}
                      </button>
                    ))}
                  </div>
                  {currentChar && (
                    <CharPanel
                      char={currentChar}
                      appearCuts={cuts.filter((cut) => (cut.ref || []).includes(currentChar.id)).map((cut) => cut.no)}
                      onCopy={(t) => copyText(t)}
                      buildPromptFor={(base) => buildPrompt(book, base, 'char')}
                    />
                  )}
                </section>
              )}

              {section === 'cuts' && (
                <section className="sec-pane">
                  <div className="sec-title">
                    본문 컷
                    <button
                      type="button"
                      className="mini sec-action ghost match-btn"
                      title={scriptParsed ? '파싱된 본문 대본 복사' : '먼저 우측 상단 본문대본 버튼으로 대본을 등록하세요'}
                      onClick={() => {
                        if (scriptParsed) copyText(scriptParsed);
                        else setScriptModalOpen(true);
                      }}
                    >
                      <ScrollText size={14} /> 대본추출
                    </button>
                    <button
                      type="button"
                      className="mini ghost match-btn"
                      title="컷별 등장 인물(이름·역할)을 한눈에 보기"
                      onClick={() => setMatchModalOpen(true)}
                    >
                      <UsersRound size={14} /> 인물매칭
                    </button>
                    <button
                      type="button"
                      className="mini"
                      title="모든 컷·표지 프롬프트(본문+add+네거티브)를 빈 줄로 구분해 한 번에 복사"
                      onClick={() => copyText([
                        ...cuts.map((c) => buildPrompt(book, c.prompt_en || '', 'scene')),
                        ...covers.map((c) => buildPrompt(book, c.prompt_en || '', 'cover')),
                      ].join('\n\n'))}
                    >
                      전체 프롬프트 복사
                    </button>
                  </div>
                  <div className="sec-sub">{cuts.length}컷{covers.length ? ` · 표지 ${covers.length}` : ''} · 번호/표지 탭을 누르면 해당 항목만 보기 · ref 태그를 누르면 해당 캐릭터로 이동</div>
                  <div className="filterbar">
                    <button
                      type="button"
                      className={`fb${cutFilter === 'all' ? ' active' : ''}`}
                      onClick={() => setCutFilter('all')}
                    >전체</button>
                    {cuts.map((c) => (
                      <button
                        key={c.no}
                        type="button"
                        className={`fb${cutFilter === c.no ? ' active' : ''}`}
                        onClick={() => setCutFilter(c.no)}
                      >{c.no}</button>
                    ))}
                    {covers.map((co, i) => {
                      const key = `cover-${co.type || i}`;
                      const lbl = co.type === 'front' ? '앞표지' : co.type === 'back' ? '뒤표지' : `표지${i + 1}`;
                      return (
                        <button
                          key={key}
                          type="button"
                          className={`fb fb-cover${cutFilter === key ? ' active' : ''}`}
                          onClick={() => setCutFilter(key)}
                        >{lbl}</button>
                      );
                    })}
                  </div>
                  <div className="cut-list">
                    {cuts.filter((c) => cutFilter === 'all' || c.no === cutFilter).map((cut) => (
                      <CutCard
                        key={cut.no}
                        cut={cut}
                        charMap={charMap}
                        onCopy={(t) => copyText(t)}
                        onJumpChar={jumpToChar}
                        buildPromptFor={(base) => buildPrompt(book, base, 'scene')}
                      />
                    ))}
                    {covers
                      .map((co, i) => ({ co, i, key: `cover-${co.type || i}` }))
                      .filter(({ key }) => cutFilter === 'all' || cutFilter === key)
                      .map(({ co, i, key }) => (
                        <CoverCard
                          key={key}
                          cover={co}
                          charMap={charMap}
                          onCopy={(t) => copyText(t)}
                          onJumpChar={jumpToChar}
                          buildPromptFor={(base) => buildPrompt(book, base, 'cover')}
                        />
                      ))}
                  </div>
                </section>
              )}

              <footer className="picbook-footer">이야기 → 캐릭터 → 컷 → 표지 · 한 흐름으로 만든 그림책</footer>
            </div>
          )}
        </main>
      </div>

      {/* TOAST */}
      <div className={`pb-toast${toastMsg ? ' show' : ''}`}>{toastMsg || '복사됐어요!'}</div>

      {/* JSON MODAL */}
      {jsonModalOpen && (
        <div
          className="modal-backdrop show"
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target.classList.contains('modal-backdrop')) setJsonModalOpen(false); }}
        >
          <div className="modal">
            <div className="modal-head">
              <h2><FileInput size={18} /> JSON 불러오기</h2>
              <button type="button" className="modal-close" aria-label="닫기" onClick={() => setJsonModalOpen(false)}>
                <X size={22} />
              </button>
            </div>
            <div className="modal-body">
              <div className="hint">
                아래에 JSON 내용을 붙여넣고 <b>적용</b>을 누르세요. 또는 좌측 하단 <b>파일 선택</b>으로 .json 파일을 불러올 수 있어요.
              </div>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='{"library_meta": {...}, "books": [...]}'
                autoFocus
              />
              <div className="modal-err">{jsonErr}</div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn filepick" onClick={() => modalFileRef.current?.click()}>
                <FolderOpen size={16} /> 파일 선택
              </button>
              <input
                ref={modalFileRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={handleModalFile}
              />
              <button type="button" className="btn" onClick={() => setJsonModalOpen(false)}>취소</button>
              <button type="button" className="btn apply" onClick={applyJsonText}>적용</button>
            </div>
          </div>
        </div>
      )}

      {/* SCRIPT MODAL */}
      {scriptModalOpen && (
        <div
          className="modal-backdrop show"
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target.classList.contains('modal-backdrop')) setScriptModalOpen(false); }}
        >
          <div className="modal script-modal">
            <div className="modal-head">
              <h2><ScrollText size={18} /> 본문 대본</h2>
              <button type="button" className="modal-close" aria-label="닫기" onClick={() => setScriptModalOpen(false)}>
                <X size={22} />
              </button>
            </div>
            <div className="modal-body">
              <div className="hint">
                넘버링(1, 2, 3 …)이 있는 본문 대본을 붙여넣으세요. 숫자 줄은 자동으로 빠지고 각 문단은 빈 줄 두 개로 구분됩니다. 오른쪽 결과는 직접 수정할 수도 있어요.
              </div>
              <div className="script-grid">
                <div className="script-col">
                  <div className="script-col-title">붙여넣기</div>
                  <textarea
                    value={scriptInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      setScriptInput(v);
                      setScriptPreview(parseScript(v));
                    }}
                    placeholder={'1\n\n저녁이 되면 ...\n\n2\n\n오늘 반찬은 ...'}
                    autoFocus
                  />
                </div>
                <div className="script-col">
                  <div className="script-col-title">
                    파싱 결과
                    <span className="muted">({scriptPreview ? scriptPreview.split(/\n\n+/).filter(Boolean).length : 0}문단 · 직접 수정 가능)</span>
                    <button
                      type="button"
                      className="script-reparse"
                      title="왼쪽 입력에서 다시 파싱"
                      onClick={() => setScriptPreview(parseScript(scriptInput))}
                    >다시 파싱</button>
                  </div>
                  <textarea
                    value={scriptPreview}
                    onChange={(e) => setScriptPreview(e.target.value)}
                    placeholder="여기에 결과가 표시돼요 (직접 입력·수정 가능)"
                  />
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setScriptInput(''); setScriptPreview(''); setScriptParsed('');
                  try { localStorage.removeItem(SCRIPT_KEY); } catch {}
                }}
                title="입력·결과·저장된 대본을 모두 지움"
              >
                비우기
              </button>
              <button type="button" className="btn" onClick={() => setScriptModalOpen(false)}>닫기</button>
              <button
                type="button"
                className="btn"
                disabled={!scriptPreview}
                onClick={() => { if (scriptPreview) copyText(scriptPreview); }}
              >
                복사
              </button>
              <button
                type="button"
                className="btn apply"
                disabled={!scriptPreview}
                onClick={() => {
                  setScriptParsed(scriptPreview);
                  try { localStorage.setItem(SCRIPT_KEY, scriptPreview); } catch {}
                  showToast('대본을 저장했어요!');
                  setScriptModalOpen(false);
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHARACTER-MATCH MODAL */}
      {matchModalOpen && (
        <div
          className="modal-backdrop show"
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target.classList.contains('modal-backdrop')) setMatchModalOpen(false); }}
        >
          <div className="modal match-modal">
            <div className="modal-head">
              <h2><UsersRound size={18} /> 컷별 인물 매칭</h2>
              <button type="button" className="modal-close" aria-label="닫기" onClick={() => setMatchModalOpen(false)}>
                <X size={22} />
              </button>
            </div>
            <div className="modal-body">
              <div className="hint">
                각 컷·표지에 등장하는 캐릭터를 한 번에 확인할 수 있어요.
              </div>
              {cuts.length === 0 && covers.length === 0 ? (
                <div className="match-empty">등록된 컷·표지가 없어요.</div>
              ) : (
                <div className="match-table">
                  <div className="match-row match-head-row">
                    <div className="match-col-no">#</div>
                    <div className="match-col-emo">감정</div>
                    <div className="match-col-chars">등장 인물</div>
                  </div>
                  {cuts.map((cut) => {
                    const refs = (cut.ref || [])
                      .map((id) => charMap[id])
                      .filter(Boolean);
                    return (
                      <div key={`cut-${cut.no}`} className="match-row">
                        <div className="match-col-no">
                          <span className="match-no-badge">{cut.no}</span>
                        </div>
                        <div className="match-col-emo">{cut.emotion || '—'}</div>
                        <div className="match-col-chars">
                          {refs.length === 0 ? (
                            <span className="match-none">—</span>
                          ) : (
                            refs.map((c) => (
                              <span key={c.id} className="match-chip">
                                <span className="dot" style={{ background: dotColor(c) }} />
                                <b>{c.name_ko || c.id}</b>
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {covers.map((co, i) => {
                    const refs = (co.ref || [])
                      .map((id) => charMap[id])
                      .filter(Boolean);
                    const lbl = co.type === 'front' ? '앞표지' : co.type === 'back' ? '뒤표지' : `표지${i + 1}`;
                    return (
                      <div key={`cover-${co.type || i}`} className="match-row match-row-cover">
                        <div className="match-col-no">
                          <span className="match-no-badge match-cover-badge">{lbl}</span>
                        </div>
                        <div className="match-col-emo">표지</div>
                        <div className="match-col-chars">
                          {refs.length === 0 ? (
                            <span className="match-none">—</span>
                          ) : (
                            refs.map((c) => (
                              <span key={c.id} className="match-chip">
                                <span className="dot" style={{ background: dotColor(c) }} />
                                <b>{c.name_ko || c.id}</b>
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button type="button" className="btn" onClick={() => setMatchModalOpen(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* styled-jsx 대신 일반 인라인 <style> — App Router 에서 styled-jsx 는 레지스트리
          없이는 SSR HTML 에 안 실려 첫 페인트 때 사이드바가 스타일 없이 깜빡였다(FOUC).
          전부 .picbook-root 전역 셀렉터라 스코핑이 불필요해 그대로 인라인한다. */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&family=Nanum+Myeongjo:wght@400;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        .picbook-root {
          --paper:#f7f1e3; --paper-deep:#efe6d0; --paper-soft:#fbf5e2;
          --ink:#3a3128; --ink-soft:#6b5d4a;
          --scarlet:#d6452f; --scarlet-soft:#f6d4cb;
          --gold:#e0a32e; --gold-soft:#f7e3a8;
          --sky:#7fa8b8; --sky-soft:#d2e1e8;
          --leaf:#8aa05a; --leaf-soft:#dde3c2;
          --lavender:#b69ec0; --lavender-soft:#e8dfee;
          --wood:#c79b6b; --wood-deep:#8b6336;
          --tape:rgba(230,200,120,.55);
          --card:#fffdf7; --line:#ddd0b3;
          --shadow:rgba(90,70,40,.16); --shadow-soft:rgba(90,70,40,.08);
          --topbar-h:62px;
          --sidebar-w:268px;
          font-family:'Nanum Myeongjo',serif;color:var(--ink);
          background:
            radial-gradient(circle at 12% 18%, color-mix(in srgb,var(--paper) 70%,#fff) 0%, transparent 45%),
            radial-gradient(circle at 88% 82%, var(--paper-deep) 0%, transparent 50%),
            var(--paper);
          min-height:100vh;line-height:1.6;
          position:relative;overflow-x:hidden;
          transition:background .5s, color .4s;
        }
        body.picbook-night .picbook-root {
          --paper:#161a2e; --paper-deep:#1f2542; --paper-soft:#1b2038;
          --ink:#eee6d6; --ink-soft:#b9b2c4;
          --card:#1d2238; --line:#39406a;
          --shadow:rgba(0,0,0,.5); --shadow-soft:rgba(0,0,0,.25);
          --scarlet:#e8b84b; --gold:#e8b84b;
          --scarlet-soft:#3a4068; --gold-soft:#3a4068;
          --sky:#8aa0d8; --sky-soft:#2b315a;
          --leaf:#7f93c9; --leaf-soft:#2b315a;
          --lavender:#c6b3d6; --lavender-soft:#39406a;
          --wood:#2a2f4d; --wood-deep:#11142a;
          --tape:rgba(232,184,75,.32);
        }
        .picbook-root::before{
          content:"";position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.4;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
        }
        body.picbook-night .picbook-root::after{
          content:"";position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.55;
          background-image:
            radial-gradient(1.4px 1.4px at 14% 22%, #fff 50%, transparent 51%),
            radial-gradient(1px 1px at 22% 68%, #fff 50%, transparent 51%),
            radial-gradient(1.8px 1.8px at 40% 12%, #f7e3a8 50%, transparent 51%),
            radial-gradient(1.2px 1.2px at 62% 36%, #fff 50%, transparent 51%),
            radial-gradient(1.6px 1.6px at 78% 18%, #f7e3a8 50%, transparent 51%),
            radial-gradient(1px 1px at 85% 74%, #fff 50%, transparent 51%),
            radial-gradient(1.5px 1.5px at 8% 90%, #fff 50%, transparent 51%),
            radial-gradient(1.3px 1.3px at 92% 50%, #f7e3a8 50%, transparent 51%);
          animation:pbTwinkle 4.5s ease-in-out infinite alternate;
        }
        @keyframes pbTwinkle{0%{opacity:.3}100%{opacity:.65}}

        .picbook-root .topbar{
          position:sticky;top:0;z-index:20;height:var(--topbar-h);
          display:flex;align-items:center;justify-content:space-between;
          padding:0 24px;gap:12px;
          background:color-mix(in srgb,var(--paper) 88%,transparent);
          backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
          border-bottom:1px solid var(--line);
        }
        .picbook-root .brand{display:flex;align-items:baseline;gap:12px;min-width:0;flex:1;}
        .picbook-root .brand .back-btn{
          font-family:'Gaegu',cursive;font-size:.88rem;color:var(--ink-soft);
          text-decoration:none;display:inline-flex;align-items:center;gap:4px;
          padding:4px 10px;border-radius:999px;border:1px solid var(--line);
          background:var(--card);transition:transform .12s;
        }
        .picbook-root .brand .back-btn:hover{transform:translateY(-1px);}
        .picbook-root .brand .kicker{font-family:'Gaegu',cursive;font-size:.78rem;color:var(--scarlet);letter-spacing:.18em;white-space:nowrap;}
        .picbook-root .brand .lib-name{font-family:'Gaegu',cursive;font-weight:700;font-size:clamp(1.05rem,1.8vw,1.4rem);color:var(--ink);text-shadow:1px 1px 0 var(--paper-deep);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .picbook-root .top-actions{display:flex;align-items:center;gap:10px;flex:none;}
        .picbook-root .btn{font-family:'Gaegu',cursive;font-size:.95rem;cursor:pointer;border-radius:999px;
          padding:7px 18px;background:var(--card);color:var(--ink);box-shadow:0 3px 0 var(--shadow);border:1.5px solid var(--line);
          transition:transform .12s,box-shadow .12s;display:inline-flex;align-items:center;gap:6px;}
        .picbook-root .btn:hover{transform:translateY(-1px);}
        .picbook-root .btn:active{transform:translateY(2px);box-shadow:0 1px 0 var(--shadow);}
        .picbook-root .btn.apply{background:var(--gold);box-shadow:0 3px 0 #b67f1c;}
        .picbook-root .btn.ghost{font-size:.85rem;padding:5px 12px;color:var(--ink-soft);}

        .picbook-root .layout{
          display:grid;grid-template-columns:var(--sidebar-w) 1fr;gap:24px;
          padding:20px 28px 80px;position:relative;z-index:1;
        }
        .picbook-root .menu-toggle{
          display:none;align-items:center;justify-content:center;
          width:40px;height:40px;border:1.5px solid var(--line);
          background:var(--card);border-radius:11px;cursor:pointer;
          box-shadow:0 2px 0 var(--shadow);color:var(--ink);
          flex:none;transition:transform .12s;
        }
        .picbook-root .menu-toggle:active{transform:translateY(2px);box-shadow:0 0 0 var(--shadow);}
        .picbook-root .sidebar-backdrop{
          position:fixed;inset:var(--topbar-h) 0 0 0;
          background:rgba(0,0,0,.4);z-index:14;
        }
        body.picbook-night .picbook-root .sidebar-backdrop{background:rgba(0,0,0,.6);}

        .picbook-root .sidebar{
          position:sticky;top:calc(var(--topbar-h) + 16px);align-self:start;
          max-height:calc(100vh - var(--topbar-h) - 32px);overflow-y:auto;
          padding:18px 14px;
          background:color-mix(in srgb,var(--card) 92%,transparent);
          border:1.5px solid var(--line);border-radius:18px;
          box-shadow:0 4px 0 var(--shadow), 4px 6px 14px rgba(60,40,10,.06);
          scrollbar-width:thin;scrollbar-color:var(--line) transparent;
        }
        .picbook-root .sidebar::-webkit-scrollbar{width:6px;}
        .picbook-root .sidebar::-webkit-scrollbar-thumb{background:var(--line);border-radius:3px;}
        .picbook-root .side-section + .side-section{margin-top:24px;padding-top:20px;border-top:1px dashed var(--line);}
        .picbook-root .side-title{
          font-family:'Gaegu',cursive;font-size:1.05rem;color:var(--ink);
          margin-bottom:12px;display:flex;align-items:center;gap:7px;padding:0 6px;
        }
        .picbook-root .side-title .badge{
          font-size:.7rem;color:var(--ink-soft);background:var(--paper);
          border:1px solid var(--line);border-radius:999px;padding:1px 8px;margin-left:auto;
          font-family:'Gaegu',cursive;
        }
        .picbook-root .side-empty{color:var(--ink-soft);font-size:.85rem;padding:8px 6px;font-style:italic;}

        .picbook-root .shelf{display:flex;flex-direction:column;gap:8px;}
        .picbook-root .book-tab{
          cursor:pointer;background:linear-gradient(135deg,var(--card),var(--paper-soft));
          border:1.5px solid var(--line);border-radius:6px 12px 12px 6px;
          padding:7px 14px 7px 22px;width:100%;text-align:left;
          box-shadow:0 3px 0 var(--shadow), 4px 5px 10px rgba(60,40,10,.07);
          transition:transform .15s,box-shadow .15s;position:relative;
          animation:pbPopIn .35s ease both;
        }
        .picbook-root .book-tab:hover{transform:translateX(2px) translateY(-1px);box-shadow:0 5px 0 var(--shadow), 6px 7px 12px rgba(60,40,10,.12);}
        .picbook-root .book-tab:active{transform:translateY(2px);box-shadow:0 1px 0 var(--shadow);}
        .picbook-root .book-tab.active{outline:2.5px dashed var(--scarlet);outline-offset:2px;}
        .picbook-root .book-tab .bt-title{font-family:'Gaegu',cursive;font-size:1.05rem;color:var(--ink);line-height:1.25;}
        .picbook-root .book-tab .bt-sub{font-size:.72rem;color:var(--ink-soft);margin-top:2px;}
        .picbook-root .book-tab .bt-spine{position:absolute;left:5px;top:8px;bottom:8px;width:6px;border-radius:3px;box-shadow:inset 0 1px 0 rgba(255,255,255,.35), inset 0 -1px 0 rgba(0,0,0,.2);}

        .picbook-root .nav-list{display:flex;flex-direction:column;gap:6px;}
        .picbook-root .nav-item{cursor:pointer;background:var(--card);border:1.5px solid var(--line);border-radius:12px;
          padding:6px 12px;font-family:'Gaegu',cursive;font-size:1rem;color:var(--ink-soft);
          display:flex;align-items:center;gap:10px;width:100%;text-align:left;
          box-shadow:0 2px 0 var(--shadow);transition:transform .12s,box-shadow .12s,background .15s;
          animation:pbPopIn .35s ease both;}
        .picbook-root .nav-item:hover{transform:translateX(2px);box-shadow:0 3px 0 var(--shadow);}
        .picbook-root .nav-item .nav-lbl{flex:1;}
        .picbook-root .nav-item .badge{font-size:.7rem;color:var(--ink-soft);background:var(--paper);border:1px solid var(--line);border-radius:999px;padding:1px 8px;font-family:'Gaegu',cursive;}
        .picbook-root .nav-item.active{background:var(--ink);color:var(--paper);border-color:var(--ink);box-shadow:0 2px 0 rgba(0,0,0,.3);}
        .picbook-root .nav-item.active .badge{background:color-mix(in srgb,var(--paper) 18%,transparent);color:var(--paper);border-color:transparent;}
        .picbook-root a.nav-item{text-decoration:none;}
        .picbook-root .nav-item.guide-link{color:var(--ink);}
        .picbook-root .nav-item.guide-link .ext-ic{opacity:.55;}
        .picbook-root .nav-item.guide-link:hover .ext-ic{opacity:1;}

        .picbook-root .content{min-width:0;}
        .picbook-root .lib-empty{
          display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;
          margin:48px auto;max-width:480px;padding:48px 28px;
          background:color-mix(in srgb,var(--card) 92%,transparent);
          border:1.5px dashed var(--line);border-radius:20px;
          box-shadow:0 4px 0 var(--shadow), 4px 6px 14px rgba(60,40,10,.06);
          color:var(--ink-soft);font-family:'Gaegu',cursive;
          animation:pbPopIn .4s ease both;
        }
        .picbook-root .lib-empty-ic{
          display:flex;align-items:center;justify-content:center;width:76px;height:76px;border-radius:50%;
          background:radial-gradient(circle at 35% 30%,var(--gold-soft),color-mix(in srgb,var(--scarlet-soft) 70%,var(--card)));
          color:var(--scarlet);box-shadow:inset 0 2px 4px rgba(255,255,255,.5), 0 3px 0 var(--shadow);margin-bottom:4px;
        }
        .picbook-root .lib-empty-title{font-size:1.45rem;color:var(--ink);font-weight:700;}
        .picbook-root .lib-empty-desc{font-size:1rem;line-height:1.5;max-width:340px;}
        .picbook-root .lib-empty-btn{
          margin-top:12px;cursor:pointer;font-family:'Gaegu',cursive;font-size:1.1rem;color:#4a3410;
          display:inline-flex;align-items:center;gap:8px;padding:11px 26px;border-radius:999px;
          background:var(--gold);border:1.5px solid color-mix(in srgb,var(--gold) 70%,#000);
          box-shadow:0 4px 0 #b67f1c;transition:transform .12s,box-shadow .12s;
        }
        .picbook-root .lib-empty-btn:hover{transform:translateY(-1px);box-shadow:0 5px 0 #b67f1c;}
        .picbook-root .lib-empty-btn:active{transform:translateY(3px);box-shadow:0 1px 0 #b67f1c;}
        .picbook-root .book-head{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin:0 0 4px;padding-bottom:10px;border-bottom:1px dashed var(--line);animation:pbPopIn .4s ease both;}
        .picbook-root .book-head h1{font-family:'Gaegu',cursive;font-weight:700;font-size:clamp(1.3rem,2.4vw,1.75rem);color:var(--ink);}
        .picbook-root .meta-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
        .picbook-root .chip{font-family:'Gaegu',cursive;font-size:.82rem;color:var(--ink-soft);padding:0;background:none;border:none;box-shadow:none;}
        .picbook-root .chip + .chip::before{content:"·";margin-right:8px;color:var(--line);}
        .picbook-root .message{margin:0 0 0 auto;font-style:italic;color:var(--ink-soft);font-size:.88rem;opacity:.85;}

        .picbook-root .sec-title{font-family:'Gaegu',cursive;font-size:1.6rem;color:var(--ink);margin:40px 0 6px;display:flex;align-items:center;gap:12px;position:relative;padding-bottom:10px;}
        .picbook-root .sec-title::before{content:"";width:26px;height:26px;border-radius:50%;background:radial-gradient(circle at 35% 30%,var(--gold),var(--scarlet));box-shadow:0 2px 0 var(--shadow), inset 0 2px 3px rgba(255,255,255,.4);flex:none;}
        .picbook-root .sec-title::after{
          content:"";position:absolute;left:38px;width:220px;max-width:60%;bottom:-2px;height:8px;
          background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 8' preserveAspectRatio='none'><path d='M0,5 Q15,1 30,5 T60,5 T90,5 T120,5 T150,5 T180,5 T200,5' stroke='%23c9a14a' stroke-width='1.6' fill='none' stroke-linecap='round' opacity='0.55'/></svg>");
          background-repeat:no-repeat;background-size:100% 100%;
        }
        body.picbook-night .picbook-root .sec-title::after{background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 8' preserveAspectRatio='none'><path d='M0,5 Q15,1 30,5 T60,5 T90,5 T120,5 T150,5 T180,5 T200,5' stroke='%23e8b84b' stroke-width='1.6' fill='none' stroke-linecap='round' opacity='0.55'/></svg>");}
        .picbook-root .sec-sub{color:var(--ink-soft);font-size:.92rem;margin-bottom:16px;padding-left:38px;}
        .picbook-root .sec-title .sec-action{margin-left:auto;}

        .picbook-root .char-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 14px;padding-left:38px;}
        .picbook-root .ctab{cursor:pointer;background:var(--card);border:1.5px solid var(--line);border-radius:999px;
          padding:4px 14px 4px 7px;font-family:'Gaegu',cursive;font-size:.95rem;color:var(--ink-soft);
          display:inline-flex;align-items:center;gap:7px;
          transition:transform .15s,box-shadow .15s,background .15s;
          box-shadow:0 2px 0 var(--shadow);animation:pbPopIn .35s ease both;}
        .picbook-root .ctab:hover{transform:translateY(-1px);box-shadow:0 3px 0 var(--shadow);}
        .picbook-root .ctab .dot{width:18px;height:18px;border-radius:50%;border:1.5px solid rgba(0,0,0,.15);flex:none;
          box-shadow:inset 0 -3px 5px rgba(0,0,0,.18), inset 0 3px 4px rgba(255,255,255,.45);}
        .picbook-root .ctab.active{background:var(--ink);color:var(--paper);border-color:var(--ink);}
        .picbook-root .ctab.active .dot{border-color:rgba(255,255,255,.5);}

        .picbook-root .char-panel{background:var(--card);border:1.5px solid var(--line);border-radius:14px;
          padding:26px 22px 20px;box-shadow:0 6px 0 var(--shadow), 6px 8px 18px rgba(60,40,10,.10);
          position:relative;transform:rotate(-0.35deg);transition:transform .25s;
          animation:pbPopIn .4s ease both;}
        .picbook-root .char-panel:hover{transform:rotate(0deg) translateY(-2px);}
        .picbook-root .char-panel::before{
          content:"";position:absolute;top:-11px;left:50%;width:96px;height:20px;
          transform:translateX(-50%) rotate(-2.5deg);
          background:repeating-linear-gradient(45deg,var(--tape) 0 6px, color-mix(in srgb,var(--tape) 70%,#fff) 6px 12px);
          border-left:1px dashed rgba(0,0,0,.12);border-right:1px dashed rgba(0,0,0,.12);
          box-shadow:0 1px 3px rgba(0,0,0,.1);border-radius:1px;
        }
        .picbook-root .cp-head{display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap;}
        .picbook-root .cp-name{font-family:'Gaegu',cursive;font-size:1.5rem;color:var(--ink);display:inline-flex;align-items:center;gap:9px;
          background:none;border:none;padding:2px 6px;border-radius:8px;cursor:pointer;transition:background .15s,transform .1s;}
        .picbook-root .cp-name:hover{background:color-mix(in srgb,var(--gold) 18%,transparent);}
        .picbook-root .cp-name:active{transform:translateY(1px);}
        .picbook-root .cp-name .dot{width:20px;height:20px;border-radius:50%;border:1.5px solid rgba(0,0,0,.15);
          box-shadow:inset 0 -3px 5px rgba(0,0,0,.18), inset 0 3px 4px rgba(255,255,255,.45);}
        .picbook-root .cp-role{font-family:'Gaegu',cursive;font-size:.85rem;color:#fff;background:var(--leaf);border-radius:999px;padding:2px 12px;}
        .picbook-root .cp-id{font-size:.9rem;color:var(--ink-soft);margin-bottom:14px;}
        .picbook-root .cp-idcode{font-family:'JetBrains Mono',monospace;font-size:.74rem;color:var(--sky);background:color-mix(in srgb,var(--sky) 18%,transparent);border:none;border-radius:6px;padding:2px 8px;cursor:pointer;transition:background .15s,transform .1s;}
        .picbook-root .cp-idcode:hover{background:color-mix(in srgb,var(--sky) 30%,transparent);}
        .picbook-root .cp-idcode:active{transform:translateY(1px);}
        .picbook-root .cp-appear{font-size:.85rem;color:var(--ink-soft);margin-top:14px;}
        .picbook-root .cp-appear b{color:var(--scarlet);font-family:'Gaegu',cursive;}

        .picbook-root .prompt{font-family:'JetBrains Mono',monospace;font-size:.82rem;line-height:1.65;color:var(--ink);
          background:color-mix(in srgb,var(--paper) 60%,var(--card));border:1px solid var(--line);
          border-radius:10px;padding:12px 14px;white-space:pre-wrap;word-break:break-word;}
        .picbook-root .actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;}
        .picbook-root .mini{font-family:'Gaegu',cursive;font-size:.85rem;cursor:pointer;border:none;border-radius:999px;
          padding:5px 14px;background:var(--gold);color:#4a3410;box-shadow:0 2px 0 #b67f1c;transition:transform .1s;}
        .picbook-root .mini:hover{transform:translateY(-1px);}
        .picbook-root .mini:active{transform:translateY(2px);box-shadow:0 0 0 #b67f1c;}
        .picbook-root .mini.ghost{background:var(--card);color:var(--ink-soft);box-shadow:0 2px 0 var(--shadow);border:1.3px solid var(--line);}

        .picbook-root .filterbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;padding-left:38px;}
        .picbook-root .fb{font-family:'Gaegu',cursive;font-size:.88rem;cursor:pointer;background:var(--card);border:1.5px solid var(--line);
          border-radius:999px;padding:4px 13px;color:var(--ink-soft);transition:.15s;box-shadow:0 2px 0 var(--shadow);}
        .picbook-root .fb:hover{transform:translateY(-1px);}
        .picbook-root .fb.active{background:var(--ink);color:var(--paper);border-color:var(--ink);}
        .picbook-root .fb.fb-cover{color:var(--ink);background:color-mix(in srgb,var(--sky) 18%,var(--card));border-color:color-mix(in srgb,var(--sky) 45%,var(--line));}
        .picbook-root .fb.fb-cover.active{background:var(--sky);color:#fff;border-color:var(--sky);}

        .picbook-root .cut{background:var(--card);border:1.5px solid var(--line);border-radius:16px;margin-bottom:14px;
          box-shadow:0 4px 0 var(--shadow);overflow:hidden;
          transition:transform .15s,box-shadow .15s;animation:pbPopIn .4s ease both;}
        .picbook-root .cut:hover{transform:translateY(-2px);box-shadow:0 6px 0 var(--shadow), 0 8px 16px rgba(60,40,10,.10);}
        .picbook-root .cut-top{display:flex;align-items:center;gap:13px;padding:13px 17px;border-bottom:1px dashed var(--line);flex-wrap:wrap;}
        .picbook-root .cut-no{font-family:'Gaegu',cursive;font-weight:700;font-size:1.4rem;width:44px;height:44px;border-radius:12px;flex:none;
          display:flex;align-items:center;justify-content:center;background:var(--paper-deep);color:var(--ink);
          box-shadow:inset 0 -3px 0 var(--shadow), 0 2px 0 var(--shadow-soft);
          transform:rotate(-3deg);}
        .picbook-root .cut:hover .cut-no{transform:rotate(-1deg);}
        .picbook-root .cut-emotion{font-family:'Gaegu',cursive;font-size:1.1rem;color:var(--scarlet);}
        .picbook-root .cut-refs{display:flex;gap:5px;flex-wrap:wrap;margin-left:auto;}
        .picbook-root .reftag{font-size:.8rem;font-family:'Gaegu',cursive;color:var(--ink);background:var(--paper);border:1.3px solid var(--line);
          border-radius:999px;padding:2px 10px 2px 8px;display:flex;align-items:center;gap:5px;cursor:pointer;transition:transform .12s;}
        .picbook-root .reftag:hover{transform:translateY(-1px);}
        .picbook-root .reftag .dot{width:11px;height:11px;border-radius:50%;border:1px solid rgba(0,0,0,.15);
          box-shadow:inset 0 -1.5px 2px rgba(0,0,0,.18), inset 0 1.5px 2px rgba(255,255,255,.4);}
        .picbook-root .cut-body{padding:13px 17px 15px;}

        .picbook-root .cover-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px;}
        .picbook-root .cover-grid .cut{
          box-shadow:0 6px 0 var(--shadow), 6px 10px 20px rgba(60,40,10,.18);
        }
        .picbook-root .cover-grid .cut:hover{box-shadow:0 8px 0 var(--shadow), 8px 12px 22px rgba(60,40,10,.22);}
        .picbook-root .cover-badge{font-family:'Gaegu',cursive;font-size:.84rem;color:#fff;background:var(--sky);border-radius:999px;padding:3px 13px;}
        .picbook-root .title-area{font-size:.84rem;color:var(--ink-soft);margin-top:8px;padding:6px 10px;background:var(--paper);border-radius:8px;border-left:3px solid var(--gold);display:flex;align-items:center;gap:6px;}

        .picbook-root .picbook-footer{text-align:center;margin-top:54px;color:var(--ink-soft);font-family:'Gaegu',cursive;font-size:.9rem;position:relative;}
        .picbook-root .picbook-footer::before{
          content:"";display:block;width:160px;height:8px;margin:0 auto 12px;
          background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 8' preserveAspectRatio='none'><path d='M0,5 Q10,1 20,5 T40,5 T60,5 T80,5 T100,5 T120,5 T140,5 T160,5' stroke='%23c9a14a' stroke-width='1.4' fill='none' stroke-linecap='round' opacity='0.5'/></svg>");
          background-repeat:no-repeat;background-size:100% 100%;
        }

        .picbook-root .pb-toast{position:fixed;bottom:26px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--ink);color:var(--paper);
          font-family:'Gaegu',cursive;padding:10px 22px;border-radius:999px;opacity:0;transition:.25s;z-index:50;pointer-events:none;}
        .picbook-root .pb-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}

        .picbook-root .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(3px);
          display:flex;align-items:center;justify-content:center;z-index:60;
          opacity:1;transition:opacity .2s;}
        .picbook-root .modal{background:var(--card);border:1.5px solid var(--line);border-radius:18px;
          width:min(720px,92vw);max-height:86vh;display:flex;flex-direction:column;
          box-shadow:0 10px 0 var(--shadow), 0 20px 40px rgba(0,0,0,.25);}
        .picbook-root .modal-head{display:flex;align-items:center;gap:10px;padding:16px 20px;border-bottom:1px dashed var(--line);}
        .picbook-root .modal-head h2{font-family:'Gaegu',cursive;font-size:1.25rem;color:var(--ink);font-weight:700;flex:1;display:flex;align-items:center;gap:8px;}
        .picbook-root .modal-close{cursor:pointer;border:none;background:none;color:var(--ink-soft);line-height:1;padding:4px 8px;border-radius:8px;transition:background .15s;}
        .picbook-root .modal-close:hover{background:var(--paper-deep);color:var(--ink);}
        .picbook-root .modal-body{padding:16px 20px;flex:1;overflow:auto;display:flex;flex-direction:column;gap:10px;}
        .picbook-root .modal-body .hint{font-family:'Gaegu',cursive;font-size:.92rem;color:var(--ink-soft);}
        .picbook-root .modal-body textarea{
          width:100%;min-height:280px;resize:vertical;
          font-family:'JetBrains Mono',monospace;font-size:.82rem;line-height:1.55;color:var(--ink);
          background:color-mix(in srgb,var(--paper) 60%,var(--card));
          border:1.3px solid var(--line);border-radius:10px;padding:12px 14px;
        }
        .picbook-root .modal-body textarea:focus{outline:none;border-color:var(--gold);box-shadow:0 0 0 3px color-mix(in srgb,var(--gold) 25%,transparent);}
        .picbook-root .modal-err{font-family:'Gaegu',cursive;font-size:.9rem;color:var(--scarlet);min-height:1.2em;}
        .picbook-root .modal-foot{display:flex;gap:8px;justify-content:flex-end;padding:14px 20px;border-top:1px dashed var(--line);flex-wrap:wrap;}
        .picbook-root .modal-foot .filepick{margin-right:auto;}

        .picbook-root .match-btn{display:inline-flex;align-items:center;gap:5px;}
        .picbook-root .match-modal{width:min(640px,94vw);}
        .picbook-root .match-table{display:flex;flex-direction:column;gap:4px;font-family:'Gaegu',cursive;}
        .picbook-root .match-row{display:grid;grid-template-columns:68px 96px 1fr;align-items:center;gap:10px;
          padding:8px 10px;border-radius:10px;background:color-mix(in srgb,var(--paper) 55%,var(--card));
          border:1px solid var(--line);}
        .picbook-root .match-col-no{display:flex;align-items:center;justify-content:center;}
        .picbook-root .match-row:hover{background:color-mix(in srgb,var(--paper) 70%,var(--card));}
        .picbook-root .match-head-row{background:transparent;border:none;font-size:.85rem;color:var(--ink-soft);padding:4px 10px 2px;}
        .picbook-root .match-head-row:hover{background:transparent;}
        .picbook-root .match-no-badge{display:inline-flex;align-items:center;justify-content:center;
          width:32px;height:32px;border-radius:10px;background:var(--paper-deep);color:var(--ink);
          font-weight:700;font-size:1.05rem;box-shadow:inset 0 -2px 0 var(--shadow);transform:rotate(-3deg);}
        .picbook-root .match-no-badge.match-cover-badge{width:auto;padding:0 10px;height:26px;font-size:.82rem;
          background:var(--sky);color:#fff;border-radius:999px;box-shadow:inset 0 -2px 0 rgba(0,0,0,.15);transform:rotate(0);
          white-space:nowrap;letter-spacing:-.2px;}
        .picbook-root .match-row-cover{background:color-mix(in srgb,var(--sky) 8%,var(--card));}
        .picbook-root .match-col-emo{color:var(--scarlet);font-size:1rem;}
        .picbook-root .match-col-chars{display:flex;flex-wrap:wrap;gap:5px;}
        .picbook-root .match-chip{display:inline-flex;align-items:center;gap:5px;
          background:var(--paper);border:1.3px solid var(--line);border-radius:999px;
          padding:2px 10px 2px 7px;font-size:.92rem;color:var(--ink);}
        .picbook-root .match-chip .dot{width:11px;height:11px;border-radius:50%;border:1px solid rgba(0,0,0,.15);
          box-shadow:inset 0 -1.5px 2px rgba(0,0,0,.18), inset 0 1.5px 2px rgba(255,255,255,.4);}
        .picbook-root .match-chip b{font-weight:700;}
        .picbook-root .match-none{color:var(--ink-soft);font-size:.9rem;}
        .picbook-root .match-empty{padding:24px;text-align:center;color:var(--ink-soft);font-family:'Gaegu',cursive;}

        .picbook-root .script-modal{width:min(940px,96vw);}
        .picbook-root .script-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .picbook-root .script-col{display:flex;flex-direction:column;gap:6px;min-width:0;}
        .picbook-root .script-col-title{font-family:'Gaegu',cursive;font-size:.95rem;color:var(--ink);display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
        .picbook-root .script-col-title .muted{color:var(--ink-soft);font-size:.85rem;}
        .picbook-root .script-reparse{margin-left:auto;font-family:'Gaegu',cursive;font-size:.78rem;cursor:pointer;
          background:var(--card);border:1.3px solid var(--line);border-radius:999px;padding:2px 10px;color:var(--ink-soft);
          box-shadow:0 2px 0 var(--shadow);transition:transform .12s;}
        .picbook-root .script-reparse:hover{transform:translateY(-1px);color:var(--ink);}
        .picbook-root .script-col textarea{min-height:360px;}
        .picbook-root .modal-foot .btn:disabled{opacity:.45;cursor:not-allowed;box-shadow:none;}
        @media (max-width: 720px){
          .picbook-root .script-grid{grid-template-columns:1fr;}
          .picbook-root .script-col textarea{min-height:220px;}
        }
        @media (max-width: 560px){
          .picbook-root .match-row{grid-template-columns:60px 1fr;row-gap:6px;}
          .picbook-root .match-col-emo{grid-column:2;font-size:.92rem;}
          .picbook-root .match-col-chars{grid-column:1 / -1;}
          .picbook-root .match-head-row{display:none;}
        }

        @keyframes pbPopIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

        @media (max-width: 900px){
          /* z-index:auto 로 스택 컨텍스트를 풀어, fixed 사이드바(z-index:15)가
             루트 기준으로 backdrop(z-index:14) 위로 올라오게 한다. 안 그러면
             .layout(z-index:1) 안에 갇혀 backdrop 에 가려져 버튼이 안 눌림. */
          .picbook-root .layout{grid-template-columns:1fr;gap:16px;padding:16px 18px 60px;z-index:auto;}
          .picbook-root .menu-toggle{display:inline-flex;}
          .picbook-root .sidebar{
            position:fixed;top:var(--topbar-h);left:0;
            width:min(86vw,300px);height:calc(100vh - var(--topbar-h));
            max-height:none;overflow-y:auto;
            transform:translateX(-102%);transition:transform .25s ease;
            z-index:15;border-radius:0 18px 18px 0;
            box-shadow:none;
          }
          .picbook-root .sidebar.open{transform:translateX(0);box-shadow:8px 0 28px rgba(0,0,0,.22);}
        }
        @media (max-width: 560px){
          .picbook-root{--topbar-h:54px;}
          .picbook-root .topbar{padding:0 12px;}
          .picbook-root .brand .kicker{display:none;}
          .picbook-root .brand .lib-name{font-size:1.05rem;}
          .picbook-root .btn{font-size:.85rem;padding:6px 14px;}
          .picbook-root .btn.ghost{display:none;}
          .picbook-root .layout{padding:14px 12px 60px;gap:14px;}
          .picbook-root .sec-title{font-size:1.35rem;margin:32px 0 6px;}
          .picbook-root .sec-title::after{left:34px;}
          .picbook-root .sec-sub,.picbook-root .filterbar,.picbook-root .char-tabs{padding-left:34px;}
          .picbook-root .book-head{gap:8px;padding-bottom:8px;}
          .picbook-root .book-head h1{font-size:1.2rem;}
          .picbook-root .meta-row{gap:6px;}
          .picbook-root .chip{font-size:.76rem;}
          .picbook-root .message{font-size:.8rem;margin:4px 0 0;width:100%;}
          .picbook-root .cut-top{padding:11px 13px;gap:9px;}
          .picbook-root .cut-body{padding:11px 13px 13px;}
          .picbook-root .cut-no{width:38px;height:38px;font-size:1.2rem;border-radius:10px;}
          .picbook-root .cut-emotion{font-size:1rem;}
          .picbook-root .prompt{font-size:.76rem;padding:10px 12px;line-height:1.55;}
          .picbook-root .char-panel{padding:22px 16px 16px;}
          .picbook-root .cp-name{font-size:1.3rem;}
          .picbook-root .reftag{font-size:.75rem;padding:2px 9px 2px 7px;}
          .picbook-root .cover-grid{grid-template-columns:1fr;gap:14px;}
          .picbook-root .sidebar{width:min(92vw,300px);padding:14px 12px;}
        }
        @media (prefers-reduced-motion: reduce){
          .picbook-root *{animation:none!important;transition:none!important;}
        }
      ` }} />
    </div>
  );
}

function CharPanel({ char, appearCuts, onCopy, buildPromptFor }) {
  return (
    <div className="char-panel" key={char.id}>
      <div className="cp-head">
        <button
          type="button"
          className="cp-name"
          title="클릭해서 이름 복사"
          onClick={() => onCopy(char.name_ko || char.id)}
        >
          <span className="dot" style={{ background: dotColor(char) }} />
          {char.name_ko || char.id}
        </button>
        {char.role && <span className="cp-role">{char.role}</span>}
      </div>
      <div className="cp-id">
        {char.id_point || ''}{' '}
        <button
          type="button"
          className="cp-idcode"
          title="클릭해서 id 복사"
          onClick={() => onCopy(escapeId(char.id))}
        >
          {escapeId(char.id)}
        </button>
      </div>
      <div className="prompt">{buildPromptFor(char.prompt_en || '')}</div>
      <div className="actions">
        <button
          type="button"
          className="mini"
          title="본문 + character_add + 네거티브를 합쳐 복사"
          onClick={() => onCopy(buildPromptFor(char.prompt_en || ''))}
        >
          프롬프트 복사
        </button>
      </div>
      <div className="cp-appear">등장 컷: <b>{appearCuts.length ? appearCuts.join(', ') : '없음'}</b></div>
    </div>
  );
}

function RefTags({ refs, charMap, onJumpChar }) {
  return (refs || []).map((id) => {
    const ch = charMap[id];
    const nm = ch ? ch.name_ko : id;
    const col = ch ? dotColor(ch) : '#c9a14a';
    return (
      <span
        key={id}
        className="reftag"
        onClick={() => onJumpChar(id)}
      >
        <span className="dot" style={{ background: col }} />
        {nm}
      </span>
    );
  });
}

function CutCard({ cut, charMap, onCopy, onJumpChar, buildPromptFor }) {
  return (
    <div className="cut">
      <div className="cut-top">
        <div className="cut-no">{cut.no}</div>
        <div className="cut-emotion">{cut.emotion || ''}</div>
        <div className="cut-refs">
          <RefTags refs={cut.ref} charMap={charMap} onJumpChar={onJumpChar} />
        </div>
      </div>
      <div className="cut-body">
        <div className="prompt">{buildPromptFor(cut.prompt_en || '')}</div>
        <div className="actions">
          <button
            type="button"
            className="mini"
            title="본문 + scene_add + 네거티브를 합쳐 복사"
            onClick={() => onCopy(buildPromptFor(cut.prompt_en || ''))}
          >
            프롬프트 복사
          </button>
        </div>
      </div>
    </div>
  );
}

function CoverCard({ cover, charMap, onCopy, onJumpChar, buildPromptFor }) {
  const typeLabel = cover.type === 'front' ? '앞표지' : cover.type === 'back' ? '뒤표지' : cover.type;
  return (
    <div className="cut">
      <div className="cut-top">
        <span className="cover-badge">{typeLabel}</span>
        <div className="cut-refs">
          <RefTags refs={cover.ref} charMap={charMap} onJumpChar={onJumpChar} />
        </div>
      </div>
      <div className="cut-body">
        <div className="prompt">{buildPromptFor(cover.prompt_en || '')}</div>
        {cover.title_area && (
          <div className="title-area">
            <Ruler size={14} /> {cover.title_area}
          </div>
        )}
        <div className="actions">
          <button
            type="button"
            className="mini"
            title="본문 + cover_add + 네거티브를 합쳐 복사"
            onClick={() => onCopy(buildPromptFor(cover.prompt_en || ''))}
          >
            프롬프트 복사
          </button>
        </div>
      </div>
    </div>
  );
}
