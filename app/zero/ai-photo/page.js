'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Copy } from 'lucide-react';

const ITEMS = [
  {
    id: 'id-photo',
    category: '증명사진',
    title: '증명사진 만들기',
    subtitle: '깔끔하고 단정한 느낌의 AI 증명사진.',
    image: '/images/zero/ai-photo/id-photo.png',
    prompt: '[Image #13]',
  },
  {
    id: 'profile-photo',
    category: '프로필사진',
    title: '프로필사진 만들기',
    subtitle: '검정 블레이저 × 화이트 셔츠, 스튜디오 감성의 프로페셔널 프로필.',
    image: '/images/zero/ai-photo/profile-photo.png',
    prompt: `Please refer to the attached model image for facial and physical features. This is a professional studio medium-shot portrait of the model wearing a custom-made black blazer over a white shirt. With arms crossed and looking straight ahead, the model displays a soft, confident smile, exuding a professional and elegant atmosphere. The gaze is direct toward the camera, conveying a competent and sophisticated vibe. Please accurately maintain the facial features, bone structure, hair texture, and depiction of the figure in the reference image. Background: A dark, textured studio background with a mottled blend of deep blue and reddish-brown creates an atmospheric and sophisticated feel. Lighting: Professional studio lighting is used to illuminate the hair and shoulders (left from the viewer's perspective), while soft, subtle key lighting is cast from the front left to highlight facial features and fabric texture. Pose: A confident and professional pose with arms crossed and the body slightly tilted emphasizes authority and elegance. Camera: Using an eye-level angle and a medium-shot composition, the focus is placed solely on the subject to capture the details of the clothing. Sharp detail and soft bokeh effects were achieved using the Canon EOS R5 full-frame DSLR and an 85mm f/1.8 lens. Style: Shot in full color like a high-end studio photograph, the composition centers on a single person, capturing a professional and elegant atmosphere.`,
  },
  {
    id: 'najeon-hanbok',
    category: '자개한복',
    title: '자개한복 입히기',
    subtitle: '검정 옻칠 위 오색 자개의 광택 — 한국 전통 자개(나전칠기) 스타일 초상.',
    image: '/images/zero/ai-photo/najeon-hanbok.png',
    prompt: `Use the attached reference image as a facial identity reference.
Preserve the same facial structure, proportions, and likeness from the reference image, while allowing artistic Mother-of-Pearl Nacre Inlay styling adjustments.
Do not change the person's identity.

Main Concept Summary:
A luxurious and refined knee-up portrait of the subject from image_0.png, rendered in a high-end Najeonchilgi lacquerware style. The colorful iridescence is balanced against a deep, polished black lacquer base for a sophisticated aesthetic.

Pose & Composition:
A graceful knee-up shot (medium shot) showing the subject from the head down to the knees. The subject is posed with a regal and elegant posture, looking directly forward with a serene expression. Her hands are placed naturally to emphasize the flow of the traditional garments.

Lighting & Color Palette:
Chiaroscuro-inspired lighting that emphasizes the contrast between the deep, lustrous black lacquer (Ottchil) and the vivid, multi-colored pearlescence. The colors are sophisticated, featuring emerald greens, deep violets, and rose golds that shimmer with a high-end metallic luster rather than simple brightness.

Subject Details:
The subject maintains the exact features from the reference. The skin is flawless, smooth, and evenly toned, with no moles, no frec`,
  },
];

export default function AIPhotoPage() {
  const [copiedId, setCopiedId] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const trackRef = useRef(null);

  const copyPrompt = async (id, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch (e) {
      alert('복사에 실패했어요. 다시 시도해주세요.');
    }
  };

  const scrollToIdx = (idx) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(ITEMS.length - 1, idx));
    const cards = track.querySelectorAll('.ai-card');
    const target = cards[clamped];
    if (!target) return;
    const trackRect = track.getBoundingClientRect();
    const cardRect = target.getBoundingClientRect();
    const delta = (cardRect.left + cardRect.width / 2) - (trackRect.left + trackRect.width / 2);
    track.scrollTo({ left: track.scrollLeft + delta, behavior: 'smooth' });
  };

  const goPrev = () => scrollToIdx(activeIdx - 1);
  const goNext = () => scrollToIdx(activeIdx + 1);

  // Drag-to-scroll + scroll position → activeIdx sync
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let isDragging = false;
    let dragMoved = 0;
    let dragStartX = 0;
    let dragStartScrollLeft = 0;
    let dragCaptured = false;
    const DRAG_THRESHOLD = 6;

    const onPointerDown = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      isDragging = true;
      dragCaptured = false;
      dragMoved = 0;
      dragStartX = e.clientX;
      dragStartScrollLeft = track.scrollLeft;
    };
    const onPointerMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX;
      dragMoved = Math.max(dragMoved, Math.abs(dx));
      if (!dragCaptured && dragMoved > DRAG_THRESHOLD) {
        dragCaptured = true;
        track.style.cursor = 'grabbing';
        track.style.scrollSnapType = 'none';
        track.style.scrollBehavior = 'auto';
        try { track.setPointerCapture(e.pointerId); } catch (_) {}
      }
      if (dragCaptured) {
        track.scrollLeft = dragStartScrollLeft - dx;
      }
    };
    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      if (dragCaptured) {
        track.style.cursor = '';
        track.style.scrollBehavior = '';
        track.style.scrollSnapType = 'x mandatory';
        try { track.releasePointerCapture(e.pointerId); } catch (_) {}
      }
      dragCaptured = false;
    };

    track.addEventListener('pointerdown', onPointerDown);
    track.addEventListener('pointermove', onPointerMove);
    track.addEventListener('pointerup', onPointerUp);
    track.addEventListener('pointercancel', onPointerUp);
    track.addEventListener('pointerleave', onPointerUp);

    track.querySelectorAll('img').forEach((img) => img.setAttribute('draggable', 'false'));
    track.style.cursor = 'grab';
    track.style.userSelect = 'none';

    let scrollTimer = null;
    const detectActive = () => {
      const trackRect = track.getBoundingClientRect();
      const trackCenter = trackRect.left + trackRect.width / 2;
      const cards = track.querySelectorAll('.ai-card');
      let closestIdx = 0;
      let minDist = Infinity;
      cards.forEach((card, idx) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const dist = Math.abs(cardCenter - trackCenter);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = idx;
        }
      });
      setActiveIdx(closestIdx);
    };
    const onScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(detectActive, 120);
    };
    track.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      track.removeEventListener('pointerdown', onPointerDown);
      track.removeEventListener('pointermove', onPointerMove);
      track.removeEventListener('pointerup', onPointerUp);
      track.removeEventListener('pointercancel', onPointerUp);
      track.removeEventListener('pointerleave', onPointerUp);
      track.removeEventListener('scroll', onScroll);
      clearTimeout(scrollTimer);
    };
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <Link href="/?c=zero&s=zero-ai-photo" className="tb-press-soft" style={styles.backBtn}>
          <ArrowLeft size={15} strokeWidth={2.5} /> 메인으로
        </Link>
        <span style={styles.topCat}>ZERO CLASS</span>
      </div>

      <article style={styles.article}>
        <header style={styles.header}>
          <h1 style={styles.title}>AI 사진 만들기</h1>
        </header>

        <div className="ai-carousel">
          <button
            type="button"
            className="ai-arrow ai-arrow-left"
            onClick={goPrev}
            disabled={activeIdx === 0}
            aria-label="이전 사진"
          >
            <ChevronLeft size={28} strokeWidth={2.5} />
          </button>

          <div className="ai-grid" ref={trackRef}>
            {ITEMS.map((item) => {
              const isCopied = copiedId === item.id;
              return (
                <div key={item.id} className="ai-slide">
                  <div className="ai-card" style={styles.card}>
                    <div style={styles.imageWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt={item.title} style={styles.image} />
                    </div>
                    <div style={styles.body}>
                      <p style={styles.cardCat}>{item.category}</p>
                      <h3 style={styles.cardTitle}>{item.title}</h3>
                      <p style={styles.cardSubtitle}>{item.subtitle}</p>
                      <button
                        type="button"
                        onClick={() => copyPrompt(item.id, item.prompt)}
                        style={{
                          ...styles.copyBtn,
                          ...(isCopied ? styles.copyBtnDone : {}),
                        }}
                        className="tb-press"
                      >
                        {isCopied ? <Check size={16} /> : <Copy size={16} />}
                        <span>{isCopied ? '복사됨' : '프롬프트 복사'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="ai-arrow ai-arrow-right"
            onClick={goNext}
            disabled={activeIdx === ITEMS.length - 1}
            aria-label="다음 사진"
          >
            <ChevronRight size={28} strokeWidth={2.5} />
          </button>

          <div className="ai-dots" aria-hidden="true">
            {ITEMS.map((_, idx) => (
              <span
                key={idx}
                className={`ai-dot${idx === activeIdx ? ' ai-dot-active' : ''}`}
              />
            ))}
          </div>
        </div>

        <div style={styles.footer}>
          <Link href="/?c=zero&s=zero-ai-photo" style={styles.footerBtn}>← 다른 과정 보기</Link>
        </div>
      </article>

      <style jsx>{`
        .ai-carousel {
          position: relative;
          margin: 36px -24px 12px;
        }

        .ai-grid {
          display: flex;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          scrollbar-width: none;
        }
        .ai-grid::-webkit-scrollbar {
          display: none;
        }

        .ai-grid :global(.ai-slide) {
          flex: 0 0 100%;
          min-width: 0;
          scroll-snap-align: center;
          display: flex;
          justify-content: center;
          padding: 4px 20px 28px;
          box-sizing: border-box;
        }

        .ai-grid :global(.ai-card) {
          width: 100%;
          max-width: 480px;
        }

        .ai-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.55);
          color: #ffffff;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          z-index: 5;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.25);
          transition: transform 0.2s ease, background 0.2s ease, opacity 0.2s ease;
          font-family: inherit;
          padding: 0;
        }
        .ai-arrow:hover:not(:disabled) {
          background: rgba(15, 23, 42, 0.8);
          transform: translateY(-50%) scale(1.08);
        }
        .ai-arrow:active:not(:disabled) {
          transform: translateY(-50%) scale(0.95);
        }
        .ai-arrow:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }
        /* Pin arrows close to card edges: 8px inside the card's left/right edge
           on wide screens (card max-width 480px), clamped to 8px from viewport
           edge on narrow screens where the card fills the width. */
        .ai-arrow-left { left: max(8px, calc(50% - 232px)); }
        .ai-arrow-right { right: max(8px, calc(50% - 232px)); }

        .ai-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 10px;
        }
        .ai-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #cbd5e1;
          transition: all 0.25s;
        }
        .ai-dot-active {
          background: #00996D;
          width: 24px;
          border-radius: 100px;
        }

        @media (max-width: 768px) {
          .ai-grid :global(.ai-slide) {
            padding: 4px 16px 28px;
          }
        }
      `}</style>
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
    maxWidth: 960,
    margin: '0 auto',
    padding: '20px 24px 100px',
  },
  header: { marginBottom: 14, textAlign: 'center' },
  title: {
    fontSize: 'clamp(22px, 3.2vw, 34px)',
    fontWeight: 800,
    lineHeight: 1.2,
    margin: 0,
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    boxShadow: '0 10px 28px rgba(15, 23, 42, 0.08)',
    display: 'flex',
    flexDirection: 'column',
  },
  imageWrap: {
    width: '100%',
    aspectRatio: '3/4',
    overflow: 'hidden',
    background: '#f1f5f9',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  body: {
    padding: '20px 22px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    flex: 1,
  },
  cardCat: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.14em',
    color: '#00996D',
    textTransform: 'uppercase',
    margin: 0,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
    lineHeight: 1.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 1.6,
    margin: 0,
    marginBottom: 6,
  },
  copyBtn: {
    marginTop: 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 18px',
    background: 'linear-gradient(112.34deg, #68D970 -38.67%, #00996D 99.56%)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 12,
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
