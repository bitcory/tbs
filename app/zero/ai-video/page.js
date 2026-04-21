'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Check, Copy, ExternalLink } from 'lucide-react';

const GENDER_OPTIONS = [
  { value: 'Korean man', label: '남성 (Man)' },
  { value: 'Korean woman', label: '여성 (Woman)' },
  { value: 'Korean boy', label: '소년 (Boy)' },
  { value: 'Korean girl', label: '소녀 (Girl)' },
];

function buildPrompt({ gender, age, dialogue }) {
  const ageSafe = age.trim() || '30s';
  const dialogueSafe = dialogue.trim() || '...';
  return `A hyper-realistic cinematic close-up of a ${gender} in their ${ageSafe}. The character has an intense and expressive facial look. The setting is realistic with professional cinematic lighting and high-fidelity textures. The character speaks in a professional, native Korean voice with natural intonation: "${dialogueSafe}". No subtitles, no on-screen text, no titles, no bgm, no background music. 4k, cinematic film look.`;
}

export default function AIVideoPage() {
  const [gender, setGender] = useState(GENDER_OPTIONS[0].value);
  const [age, setAge] = useState('30s');
  const [dialogue, setDialogue] = useState('우리 집에서 치킨이랑 떡볶이 먹고 갈래?');
  const [copied, setCopied] = useState(false);

  const preview = buildPrompt({ gender, age, dialogue });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      alert('복사에 실패했어요. 다시 시도해주세요.');
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <Link href="/" className="tb-press-soft" style={styles.backBtn}>
          <ArrowLeft size={15} strokeWidth={2.5} /> 메인으로
        </Link>
        <span style={styles.topCat}>ZERO CLASS</span>
      </div>

      <article style={styles.article}>
        <header style={styles.header}>
          <p style={styles.category}>Step 04 · AI 영상</p>
          <h1 style={styles.title}>말하는 AI 영상 만들기</h1>
          <p style={styles.subtitle}>
            성별·나이·한국어 대사만 입력하면 Veo3 용 프롬프트가 자동 완성됩니다.
          </p>
        </header>

        <div style={styles.card}>
          <div style={styles.row2}>
            <div>
              <label style={styles.label}>성별 (Gender)</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                style={styles.input}
              >
                {GENDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={styles.label}>나이대 (Age)</label>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="예: 30s, late 20s"
                style={styles.input}
              />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={styles.label}>대사 내용 (Korean Dialogue)</label>
            <textarea
              value={dialogue}
              onChange={(e) => setDialogue(e.target.value)}
              rows={3}
              placeholder="한국어 대사를 입력하세요..."
              style={{ ...styles.input, resize: 'vertical', minHeight: 90, fontFamily: 'inherit' }}
            />
          </div>

          <div style={styles.btnRow}>
            <button
              type="button"
              onClick={handleCopy}
              className="tb-press"
              style={{
                ...styles.copyBtn,
                ...(copied ? styles.copyBtnDone : {}),
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? '복사됨' : '프롬프트 생성 및 복사'}</span>
            </button>

            <a
              href="https://flow.google/"
              target="_blank"
              rel="noopener noreferrer"
              className="tb-press-soft"
              style={styles.flowBtn}
            >
              <ExternalLink size={16} />
              <span>영상 생성 바로가기</span>
            </a>
          </div>

          <div style={styles.tipBox}>
            💡 <strong>사용 팁</strong> — 생성된 프롬프트를 <strong>Veo3</strong> 나 비슷한 영상 생성 AI 에 붙여넣으면 해당 대사를 말하는 한국인 캐릭터 영상이 만들어집니다. 대사가 짧고 자연스러울수록 품질이 좋아요.
          </div>
        </div>

        <div style={styles.footer}>
          <Link href="/" style={styles.footerBtn}>← 다른 과정 보기</Link>
        </div>
      </article>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    color: '#0f172a',
    fontFamily: "'Paperlogy', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  topbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 24px',
    borderBottom: '1px solid #e2e8f0',
    background: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px 8px 10px',
    color: '#0f172a',
    fontSize: 13,
    fontWeight: 700,
    textDecoration: 'none',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: 100,
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
  },
  topCat: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.14em',
    color: '#00996D',
  },
  article: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '48px 24px 100px',
  },
  header: { marginBottom: 32, textAlign: 'center' },
  category: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '0.14em',
    color: '#00996D',
    marginBottom: 12,
  },
  title: {
    fontSize: 'clamp(26px, 3.4vw, 38px)',
    fontWeight: 800,
    lineHeight: 1.3,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 1.6,
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '28px 26px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 10px 28px rgba(15, 23, 42, 0.08)',
  },
  row2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 14,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    background: '#fff',
    fontSize: 14,
    color: '#0f172a',
    outline: 'none',
    fontFamily: 'inherit',
  },
  btnRow: {
    marginTop: 20,
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  copyBtn: {
    flex: '1 1 240px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '14px 18px',
    background: 'linear-gradient(112.34deg, #68D970 -38.67%, #00996D 99.56%)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    borderRadius: 14,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 10px 22px rgba(0, 153, 109, 0.25)',
    fontFamily: 'inherit',
    transition: 'transform 0.2s, box-shadow 0.2s, background 0.25s',
  },
  copyBtnDone: {
    background: 'linear-gradient(112.34deg, #0f172a, #334155)',
    boxShadow: '0 6px 16px rgba(15, 23, 42, 0.25)',
  },
  flowBtn: {
    flex: '1 1 200px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '14px 18px',
    background: '#fff',
    color: '#0f172a',
    fontSize: 15,
    fontWeight: 700,
    borderRadius: 14,
    border: '1.5px solid #00996D',
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: 'inherit',
    transition: 'transform 0.2s, background 0.2s',
  },
  tipBox: {
    marginTop: 18,
    padding: '12px 14px',
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: 10,
    fontSize: 12.5,
    color: '#065f46',
    lineHeight: 1.55,
  },
  footer: {
    marginTop: 48,
    paddingTop: 28,
    borderTop: '1px solid #e2e8f0',
    textAlign: 'center',
  },
  footerBtn: {
    display: 'inline-block',
    padding: '12px 24px',
    background: 'linear-gradient(112.34deg, #68D970 -38.67%, #00996D 99.56%)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 100,
    textDecoration: 'none',
  },
};
