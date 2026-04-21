import Link from 'next/link';
import { ArrowLeft, Clock, Download, ExternalLink } from 'lucide-react';

export default function ZeroPost({
  category,
  title,
  subtitle,
  readingTime,
  thumbClass,
  thumbLabel,
  thumbImage,
  sections = [],
  sourceUrl,
  sourceLabel,
  stepId,
}) {
  const backHref = stepId ? `/?c=zero&s=${stepId}` : '/';
  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <Link href={backHref} className="tb-press-soft" style={styles.backBtn}>
          <ArrowLeft size={15} strokeWidth={2.5} /> 메인으로
        </Link>
        <span style={styles.topCat}>ZERO CLASS</span>
      </div>

      <article style={styles.article}>
        <header style={styles.header}>
          <p style={styles.category}>{category}</p>
          <h1 style={styles.title}>{title}</h1>
          <p style={styles.subtitle}>{subtitle}</p>
          {readingTime && (
            <div style={styles.meta}>
              <Clock size={14} /> <span>{readingTime}</span>
            </div>
          )}
        </header>

        {thumbImage ? (
          <div style={styles.thumbImgWrap}>
            <img src={thumbImage} alt={title} style={styles.thumbImg} />
          </div>
        ) : (
          <div style={{ ...styles.thumb, ...(thumbClass === 'gradient-gmail' ? styles.thumbGmail : styles.thumbCapcut) }}>
            {thumbLabel}
          </div>
        )}

        <div style={styles.body}>
          {sections.map((s, i) => (
            <section key={i} style={styles.section}>
              <h2 style={styles.h2}>{s.heading}</h2>
              {s.body.map((p, j) => (
                <p key={j} style={styles.p}>{p}</p>
              ))}
              {s.images && s.images.length > 0 && (
                <div style={styles.imageGroup}>
                  {s.images.map((img, k) => (
                    <img key={k} src={img.src} alt={img.alt || ''} style={styles.sectionImage} loading="lazy" />
                  ))}
                </div>
              )}
              {s.links && s.links.length > 0 && (
                <div style={styles.linkBox}>
                  {s.links.map((l, k) => (
                    <a key={k} href={l.href} target="_blank" rel="noopener noreferrer" style={styles.downloadBtn}>
                      <Download size={16} />
                      <span>{l.label}</span>
                      <ExternalLink size={14} style={{ opacity: 0.7 }} />
                    </a>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        {sourceUrl && (
          <div style={styles.source}>
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" style={styles.sourceLink}>
              {sourceLabel || '원문 보기'} <ExternalLink size={12} />
            </a>
          </div>
        )}

        <div style={styles.footer}>
          <Link href={backHref} style={styles.footerBtn}>← 다른 과정 보기</Link>
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
    maxWidth: 760,
    margin: '0 auto',
    padding: '48px 24px 100px',
  },
  header: { marginBottom: 32 },
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
    fontSize: 16,
    color: '#475569',
    lineHeight: 1.6,
    marginBottom: 14,
  },
  meta: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    color: '#64748b',
    fontSize: 13,
    fontWeight: 600,
  },
  thumb: {
    width: '100%',
    aspectRatio: '16/9',
    borderRadius: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 96,
    fontWeight: 900,
    marginBottom: 40,
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.14)',
  },
  thumbGmail: { background: 'linear-gradient(135deg, #EA4335, #FBBC05)' },
  thumbCapcut: { background: 'linear-gradient(135deg, #0f172a, #00B380)' },
  thumbImgWrap: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 40,
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.14)',
  },
  thumbImg: {
    width: '100%',
    display: 'block',
  },
  imageGroup: {
    marginTop: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  sectionImage: {
    width: '100%',
    borderRadius: 12,
    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.1)',
    display: 'block',
  },
  body: {},
  section: { marginBottom: 36 },
  h2: {
    fontSize: 20,
    fontWeight: 800,
    color: '#0f172a',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: '2px solid #e2e8f0',
  },
  p: {
    fontSize: 15,
    lineHeight: 1.8,
    color: '#334155',
    marginBottom: 10,
  },
  linkBox: {
    marginTop: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  downloadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 20px',
    background: 'linear-gradient(112.34deg, #68D970 -38.67%, #00996D 99.56%)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 12,
    textDecoration: 'none',
    boxShadow: '0 12px 28px rgba(0, 153, 109, 0.28)',
    wordBreak: 'keep-all',
  },
  source: {
    marginTop: 32,
    paddingTop: 20,
    borderTop: '1px dashed #cbd5e1',
    textAlign: 'center',
  },
  sourceLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    color: '#64748b',
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
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
