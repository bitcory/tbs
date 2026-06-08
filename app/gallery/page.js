"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GALLERY, youtubeId } from "@/lib/galleryData";

function countMedia(cls) {
  return cls.steps.reduce((n, s) => n + s.media.length, 0);
}

export default function GalleryPage() {
  const [activeCls, setActiveCls] = useState("up");
  const [playing, setPlaying] = useState({}); // { 'step7-0': true }

  const active = useMemo(
    () => GALLERY.find((c) => c.cls === activeCls) || GALLERY[0],
    [activeCls]
  );

  const play = (key) => setPlaying((p) => ({ ...p, [key]: true }));

  return (
    <div className="min-h-screen bg-[var(--tb-bg)] text-[var(--tb-text)]">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between gap-3 px-5 py-3 bg-[color-mix(in_srgb,var(--tb-bg)_85%,transparent)] backdrop-blur-md border-b border-white/10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[var(--tb-text-2)] text-sm font-bold tb-press-soft hover:border-[#f97316] hover:text-[#fb923c]"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          홈으로
        </Link>
        <h1 className="text-lg font-black tracking-tight">갤러리</h1>
        <span className="w-[72px]" />
      </header>

      {/* Class tabs */}
      <nav className="flex flex-wrap justify-center gap-2 px-5 pt-6 pb-2">
        {GALLERY.map((c) => {
          const isActive = c.cls === activeCls;
          const isMaster = c.cls === "master";
          return (
            <button
              key={c.cls}
              type="button"
              onClick={() => setActiveCls(c.cls)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider tb-press ${
                isActive
                  ? isMaster
                    ? "text-[#1a1206] bg-gradient-to-br from-[#fb923c] to-[#f43f5e] shadow-[0_8px_18px_rgba(244,63,94,0.32)]"
                    : "text-[#1a1206] bg-gradient-to-br from-[#fb923c] to-[#f97316] shadow-[0_8px_18px_rgba(249,115,22,0.32)]"
                  : "text-[var(--tb-text-muted)] bg-white/5 border border-white/10 hover:bg-white/10 hover:text-[#fb923c]"
              }`}
            >
              {c.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-black/15" : "bg-white/10"}`}>
                {countMedia(c)}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <main className="max-w-[1100px] mx-auto px-5 pb-24 pt-4">
        {active.steps.length === 0 || countMedia(active) === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-28 text-[#94a3b8]">
            <svg className="w-14 h-14 opacity-50" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 9.5L14.5 12L10 14.5V9.5Z" fill="currentColor" />
            </svg>
            <p className="text-sm font-bold">{active.label}의 준비 중인 영상이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {active.steps.map((s) => (
              <section key={s.step}>
                <div className="flex items-center gap-2.5 mb-4">
                  <span
                    className="text-[11px] font-black px-2.5 py-1 rounded-full text-white"
                    style={{ background: active.accent }}
                  >
                    {s.label}
                  </span>
                  <h2 className="text-lg font-extrabold">{s.title}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {s.media.map((m, i) => {
                    const key = `${s.step}-${i}`;
                    return (
                      <MediaTile
                        key={key}
                        media={m}
                        playing={!!playing[key]}
                        onPlay={() => play(key)}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function MediaTile({ media, playing, onPlay }) {
  if (media.type === "image") {
    return (
      <a
        href={media.src}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-2xl overflow-hidden border border-white/10 bg-[var(--tb-surface)] shadow-[0_8px_22px_rgba(0,0,0,0.45)] aspect-video"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={media.src} alt={media.alt || ""} className="w-full h-full object-cover" />
      </a>
    );
  }

  if (media.type === "video") {
    return (
      <div className="rounded-2xl overflow-hidden bg-black shadow-[0_8px_22px_rgba(15,23,42,0.12)] aspect-video">
        <video
          src={media.src}
          poster={media.poster}
          controls
          preload="none"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  if (media.type === "youtube") {
    const id = youtubeId(media.src);
    if (!id) return null;
    if (playing) {
      return (
        <div className="rounded-2xl overflow-hidden bg-black shadow-[0_8px_22px_rgba(15,23,42,0.12)] aspect-video">
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
      <button
        type="button"
        onClick={onPlay}
        className="group relative block w-full rounded-2xl overflow-hidden bg-black shadow-[0_8px_22px_rgba(15,23,42,0.12)] aspect-video tb-press-soft"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
          alt={media.title || "video"}
          className="w-full h-full object-cover transition group-hover:scale-105"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition">
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-white/90 shadow-lg">
            <svg className="w-6 h-6 ml-0.5 text-[#0f172a]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          </span>
        </span>
        {media.title && (
          <span className="absolute left-0 right-0 bottom-0 px-3 py-2 text-left text-white text-sm font-bold bg-gradient-to-t from-black/70 to-transparent">
            {media.title}
          </span>
        )}
      </button>
    );
  }

  return null;
}
