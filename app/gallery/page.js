"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GALLERY, youtubeId } from "@/lib/galleryData";

function countMedia(cls) {
  return cls.steps.reduce((n, s) => n + s.media.length, 0);
}

export default function GalleryPage() {
  const [activeCls, setActiveCls] = useState("up");
  const [playingKey, setPlayingKey] = useState(null); // only one tile plays at a time
  const [lightbox, setLightbox] = useState(null); // { src, alt }

  const active = useMemo(
    () => GALLERY.find((c) => c.cls === activeCls) || GALLERY[0],
    [activeCls]
  );

  // Starting any tile stops whatever was playing: setting the key unmounts the
  // previous YouTube iframe, and native <video>s are paused explicitly.
  const play = useCallback((key) => {
    document.querySelectorAll("video[data-media-key]").forEach((v) => {
      if (v.dataset.mediaKey !== key) v.pause();
    });
    setPlayingKey(key);
  }, []);

  const selectClass = useCallback((cls) => {
    setPlayingKey(null);
    setActiveCls(cls);
  }, []);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  // Esc closes the image lightbox; the page behind it stays put while open.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, closeLightbox]);

  const total = countMedia(active);

  return (
    // `auth-scroll` opts this page out of the desktop `body { overflow: hidden }`
    // lock in globals.css — without it the gallery cannot scroll on desktop.
    <div className="auth-scroll min-h-screen bg-[var(--tb-bg)] text-[var(--tb-text)]">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between gap-3 px-5 h-14 bg-[color-mix(in_srgb,var(--tb-bg)_82%,transparent)] backdrop-blur-xl border-b border-[var(--tb-border)]">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--tb-surface)] border border-[var(--tb-border)] text-[var(--tb-text-2)] text-sm font-bold tb-press-soft hover:border-[#f97316] hover:text-[#f97316]"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          홈으로
        </Link>
        <h1 className="text-base sm:text-lg font-black tracking-tight">갤러리</h1>
        <span className="w-[76px]" />
      </header>

      {/* Class tabs — sticky under the header, horizontally scrollable on mobile.
          No intro block above them: entering from the landing page should land
          straight on the default class (UP) and its first section. */}
      <nav className="sticky top-14 z-40 bg-[color-mix(in_srgb,var(--tb-bg)_82%,transparent)] backdrop-blur-xl border-b border-[var(--tb-border)]">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8">
          <div className="flex gap-2 overflow-x-auto py-3 justify-start sm:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {GALLERY.map((c) => {
              const isActive = c.cls === activeCls;
              const isMaster = c.cls === "master";
              const n = countMedia(c);
              return (
                <button
                  key={c.cls}
                  type="button"
                  onClick={() => selectClass(c.cls)}
                  className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider tb-press ${
                    isActive
                      ? isMaster
                        ? "text-[#1a1206] bg-gradient-to-br from-[#fb923c] to-[#f43f5e] shadow-[0_8px_18px_rgba(244,63,94,0.28)]"
                        : "text-[#1a1206] bg-gradient-to-br from-[#fb923c] to-[#f97316] shadow-[0_8px_18px_rgba(249,115,22,0.28)]"
                      : "text-[var(--tb-text-muted)] bg-[var(--tb-surface)] border border-[var(--tb-border)] hover:border-[#f97316] hover:text-[#f97316]"
                  }`}
                >
                  {c.label}
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-black/15"
                        : "bg-[var(--tb-surface-2)] text-[var(--tb-text-muted)]"
                    }`}
                  >
                    {n === 0 ? "준비중" : n}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-[1600px] mx-auto px-5 sm:px-8 pt-10 pb-28">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-32 text-[var(--tb-text-muted)]">
            <span className="flex items-center justify-center w-20 h-20 rounded-3xl bg-[var(--tb-surface)] border border-[var(--tb-border)]">
              <svg className="w-9 h-9 opacity-60" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10 9.5L14.5 12L10 14.5V9.5Z" fill="currentColor" />
              </svg>
            </span>
            <p className="text-sm font-bold">{active.label}의 작업물은 준비 중입니다.</p>
          </div>
        ) : (
          <div className="space-y-16">
            {active.steps.map((s) => (
              <section key={s.step} className="scroll-mt-32">
                {/* Full-width section header with a hairline rule */}
                <div className="flex flex-wrap items-center gap-3 pb-4 mb-6 border-b border-[var(--tb-border)]">
                  <span
                    className="text-[11px] font-black px-2.5 py-1 rounded-full text-white shadow-[0_4px_10px_-4px_rgba(0,0,0,0.4)]"
                    style={{ background: active.accent }}
                  >
                    {s.label}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight">{s.title}</h3>
                  <span className="ml-auto text-xs font-bold text-[var(--tb-text-muted)]">
                    {s.media.length}개
                  </span>
                </div>

                <div
                  className={`grid gap-5 sm:gap-6 ${
                    s.media.every((m) => m.portrait)
                      ? // All-vertical section: narrower columns so 9:16 tiles stay readable
                        "grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                      : // Landscape: 4 across on wide screens
                        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  }`}
                >
                  {s.media.map((m, i) => {
                    const key = `${s.step}-${i}`;
                    return (
                      <MediaTile
                        key={key}
                        mediaKey={key}
                        media={m}
                        playing={playingKey === key}
                        onPlay={() => play(key)}
                        onOpenImage={setLightbox}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {lightbox && <Lightbox media={lightbox} onClose={closeLightbox} />}
    </div>
  );
}

const TILE =
  "group relative block w-full rounded-2xl overflow-hidden bg-[var(--tb-surface)] border border-[var(--tb-border)] shadow-[0_10px_30px_-14px_rgba(0,0,0,0.35)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_-16px_rgba(0,0,0,0.45)] hover:border-[color-mix(in_srgb,#f97316_55%,var(--tb-border))]";

function MediaTile({ media, mediaKey, playing, onPlay, onOpenImage }) {
  if (media.type === "image") {
    return (
      <button type="button" onClick={() => onOpenImage(media)} className={`${TILE} aspect-video`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.src}
          alt={media.alt || ""}
          loading="lazy"
          className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.04]"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
        <span className="absolute right-3 top-3 flex items-center justify-center w-9 h-9 rounded-full bg-black/55 text-white opacity-0 group-hover:opacity-100 transition backdrop-blur-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 3h6v6M21 3l-8 8M9 21H3v-6M3 21l8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {media.alt && (
          <span className="absolute left-0 right-0 bottom-0 px-3.5 py-2.5 text-left text-white text-sm font-bold opacity-0 group-hover:opacity-100 transition">
            {media.alt}
          </span>
        )}
      </button>
    );
  }

  if (media.type === "video") {
    return (
      <div className={`${TILE} aspect-video bg-black`}>
        <video
          src={media.src}
          poster={media.poster}
          data-media-key={mediaKey}
          onPlay={onPlay}
          controls
          playsInline
          preload="none"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  if (media.type === "youtube") {
    const id = youtubeId(media.src);
    if (!id) return null;

    // Shorts need a 9:16 frame; `oardefault` is the untrimmed vertical thumbnail
    // (hqdefault would center-crop it to 4:3).
    const ratio = media.portrait ? "aspect-[9/16]" : "aspect-video";
    const thumb = media.portrait
      ? `https://i.ytimg.com/vi/${id}/oardefault.jpg`
      : `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

    if (playing) {
      return (
        <div
          className={`rounded-2xl overflow-hidden bg-black border border-[var(--tb-border)] shadow-[0_18px_40px_-16px_rgba(0,0,0,0.45)] ${ratio}`}
        >
          <iframe
            src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`}
            title={media.title || "video"}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      );
    }

    return (
      <button type="button" onClick={onPlay} className={`${TILE} ${ratio} bg-black`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt={media.title || "video"}
          loading="lazy"
          className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.04]"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/10 transition group-hover:from-black/75" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/92 shadow-[0_8px_22px_rgba(0,0,0,0.35)] transition duration-200 group-hover:scale-110">
            <svg className="w-6 h-6 sm:w-7 sm:h-7 ml-0.5 text-[#0f172a]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          </span>
        </span>
        {media.portrait && (
          <span className="absolute left-3 top-3 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-sm text-white text-[10px] font-black tracking-wider">
            SHORTS
          </span>
        )}
        {media.title && (
          <span className="absolute left-0 right-0 bottom-0 px-3.5 py-3 text-left text-white text-xs sm:text-sm font-bold leading-snug line-clamp-2">
            {media.title}
          </span>
        )}
      </button>
    );
  }

  return null;
}

function Lightbox({ media, onClose }) {
  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10 bg-black/80 backdrop-blur-sm animate-fadeIn"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute right-4 top-4 flex items-center justify-center w-10 h-10 rounded-full bg-white/12 border border-white/20 text-white tb-press-soft hover:bg-white/20"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={media.src}
        alt={media.alt || ""}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full object-contain rounded-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
      />
    </div>
  );
}
