"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const COOKIE_KEY = "tbs_intro_seen";
const SCROLL_MAX = 1800;

export default function IntroPage() {
  const canvasRef = useRef(null);
  const progressRef = useRef(0);
  const targetRef = useRef(0);
  const [, force] = useState(0);

  // ── Scroll / wheel / touch / key → virtual progress ──
  useEffect(() => {
    let scrolled = 0;
    let touchY = 0;

    const setTarget = (v) => {
      targetRef.current = Math.max(0, Math.min(1, v));
    };

    const onWheel = (e) => {
      e.preventDefault();
      scrolled = Math.max(0, Math.min(SCROLL_MAX, scrolled + e.deltaY));
      setTarget(scrolled / SCROLL_MAX);
    };
    const onTouchStart = (e) => {
      if (e.touches[0]) touchY = e.touches[0].clientY;
    };
    const onTouchMove = (e) => {
      if (!e.touches[0]) return;
      const dy = touchY - e.touches[0].clientY;
      touchY = e.touches[0].clientY;
      scrolled = Math.max(0, Math.min(SCROLL_MAX, scrolled + dy * 4.5));
      setTarget(scrolled / SCROLL_MAX);
      e.preventDefault();
    };
    const onKey = (e) => {
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        scrolled = Math.min(SCROLL_MAX, scrolled + 80);
        setTarget(scrolled / SCROLL_MAX);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        scrolled = Math.max(0, scrolled - 80);
        setTarget(scrolled / SCROLL_MAX);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKey);

    let raf;
    const loop = () => {
      const cur = progressRef.current;
      const tgt = targetRef.current;
      const next = cur + (tgt - cur) * 0.08;
      progressRef.current = Math.abs(next - tgt) < 0.0002 ? tgt : next;
      force((n) => (n + 1) % 1e9);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
    };
  }, []);

  // ── Golden star field + AI brand icon flythrough ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dpr = 1, raf;
    const stars = [];
    const icons = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Gold palette (rgb tuples for fast composition)
    const goldPalette = [
      [255, 215, 0],
      [255, 224, 102],
      [255, 195, 80],
      [255, 235, 150],
      [255, 247, 200],
    ];
    const N = 240;
    for (let i = 0; i < N; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 2.6,
        y: (Math.random() - 0.5) * 1.8,
        z: Math.random(),
        r: Math.random() * 1.7 + 0.6,
        c: goldPalette[(Math.random() * goldPalette.length) | 0],
        tw: Math.random() * Math.PI * 2,
        tws: 0.04 + Math.random() * 0.06,
      });
    }

    // ── Brand icons (inline SVG → Image) ──
    const ICON_SVGS = [
      // ChatGPT (OpenAI swirl) — green circle, 3-fold curved arcs + center dot
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' width='128' height='128'><circle cx='32' cy='32' r='30' fill='#10A37F'/><g fill='none' stroke='#fff' stroke-width='2.6' stroke-linecap='round'><path d='M32 13 a19 19 0 0 1 16.5 28.5'/><path d='M48.5 41.5 a19 19 0 0 1-33 0'/><path d='M15.5 41.5 a19 19 0 0 1 16.5-28.5'/></g><circle cx='32' cy='32' r='5' fill='#fff'/></svg>`,
      // Gemini — 4-point bauhaus star, blue→purple→pink gradient (no background)
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' width='128' height='128'><defs><linearGradient id='gem' x1='10%' y1='10%' x2='90%' y2='90%'><stop offset='0%' stop-color='#4796E3'/><stop offset='50%' stop-color='#8E5DF7'/><stop offset='100%' stop-color='#E76C8E'/></linearGradient></defs><path fill='url(#gem)' d='M32 4 C 32 19 45 32 60 32 C 45 32 32 45 32 60 C 32 45 19 32 4 32 C 19 32 32 19 32 4 Z'/></svg>`,
      // Google G — multicolor on white circle
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' width='128' height='128'><circle cx='32' cy='32' r='30' fill='#fff'/><path fill='#4285F4' d='M53.5 32.6c0-1.5-.1-2.9-.4-4.3H32v8.1h12.1c-.5 2.6-2.1 4.8-4.5 6.3v5.2h7.3c4.2-3.8 6.6-9.4 6.6-15.3z'/><path fill='#34A853' d='M32 54c6 0 11.1-2 14.8-5.4l-7.3-5.2c-2 1.4-4.6 2.2-7.5 2.2-5.7 0-10.6-3.9-12.4-9.1H12.1v5.5C15.8 49 23.3 54 32 54z'/><path fill='#FBBC05' d='M19.6 36.5c-.4-1.4-.7-2.8-.7-4.3s.2-2.9.7-4.3v-5.5h-7.5C10.6 25.3 9.7 28.5 9.7 32s.9 6.7 2.4 9.6l7.5-5.1z'/><path fill='#EA4335' d='M32 18.7c3.3 0 6.1 1.1 8.5 3.3l6.4-6.4C42.9 12 38 10 32 10c-8.7 0-16.2 5-19.9 12.1l7.5 5.5c1.8-5.2 6.7-8.9 12.4-8.9z'/></svg>`,
      // Grok / xAI — black rounded square with angular X
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' width='128' height='128'><rect width='64' height='64' rx='10' fill='#000'/><path fill='#fff' d='M19 14 L28 14 L37 25 L46 14 L52 14 L40 28 L53 50 L43 50 L33 35 L23 50 L12 50 L26 32 Z'/></svg>`,
      // FLOW (Google FLOW) — rainbow gradient lens with white aperture
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' width='128' height='128'><defs><linearGradient id='flow' x1='0%' y1='10%' x2='100%' y2='90%'><stop offset='0%' stop-color='#FF8E5B'/><stop offset='35%' stop-color='#E76FB6'/><stop offset='70%' stop-color='#7E72E0'/><stop offset='100%' stop-color='#56C9E2'/></linearGradient></defs><circle cx='32' cy='32' r='30' fill='url(#flow)'/><circle cx='32' cy='32' r='13' fill='#fff'/><circle cx='32' cy='32' r='5.5' fill='url(#flow)'/></svg>`,
      // Veo (Google AI video) — spectrum gradient eye
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' width='128' height='128'><defs><linearGradient id='veo' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='#4796E3'/><stop offset='40%' stop-color='#8E5DF7'/><stop offset='75%' stop-color='#E76C8E'/><stop offset='100%' stop-color='#FFB86B'/></linearGradient></defs><circle cx='32' cy='32' r='30' fill='#0a1428'/><path fill='url(#veo)' d='M32 18 C 18 18 8 32 8 32 C 8 32 18 46 32 46 C 46 46 56 32 56 32 C 56 32 46 18 32 18 Z' fill-rule='evenodd'/><circle cx='32' cy='32' r='6' fill='#0a1428'/></svg>`,
      // CapCut — purple→pink gradient with play triangle
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' width='128' height='128'><defs><linearGradient id='cc' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='#3D2BA0'/><stop offset='100%' stop-color='#FF63A8'/></linearGradient></defs><rect width='64' height='64' rx='14' fill='url(#cc)'/><path fill='#fff' d='M26 20 L26 44 L46 32 Z'/><circle cx='17' cy='32' r='3.5' fill='#fff'/></svg>`,
    ];
    const iconImages = ICON_SVGS.map((svg) => {
      const img = new Image();
      img.src = `data:image/svg+xml;base64,${btoa(svg)}`;
      return img;
    });

    const spawnIcon = () => {
      const ready = iconImages.filter((im) => im.complete && im.naturalWidth > 0);
      if (!ready.length) return;
      icons.push({
        img: ready[(Math.random() * ready.length) | 0],
        x: (Math.random() - 0.5) * 1.4,
        y: (Math.random() - 0.5) * 1.0,
        z: 0.95,
        rot: (Math.random() - 0.5) * 0.5,
        rotSpd: (Math.random() - 0.5) * 0.012,
        size: 0.10 + Math.random() * 0.06,
      });
    };

    const focal = 0.9;
    let last = performance.now();
    let iconAcc = 0;
    let iconNext = 55 + Math.random() * 40;

    const drawStar5 = (cx, cy, R) => {
      const ir = R * 0.42;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const ang = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? R : ir;
        const px = cx + Math.cos(ang) * rad;
        const py = cy + Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    };

    const draw = (now) => {
      const dt = Math.min(48, now - last) / 16.67;
      last = now;
      const p = progressRef.current;

      // Backdrop
      const grad = ctx.createRadialGradient(
        w / 2, h * (0.58 - p * 0.18), 0,
        w / 2, h / 2, Math.max(w, h) * 0.85,
      );
      grad.addColorStop(0, "#0a3a26");
      grad.addColorStop(0.45, "#062619");
      grad.addColorStop(1, "#01080a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Halo (gold + green)
      const halo = ctx.createRadialGradient(
        w / 2, h / 2, 0,
        w / 2, h / 2, Math.max(w, h) * (0.32 + p * 0.18),
      );
      halo.addColorStop(0, "rgba(255, 200, 80, 0.30)");
      halo.addColorStop(0.5, "rgba(0, 153, 109, 0.10)");
      halo.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      // Update + sort stars by depth
      const speed = (0.0017 + p * 0.014) * dt;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.z -= speed;
        s.tw += s.tws * dt;
        if (s.z <= 0) {
          s.z = 1;
          s.x = (Math.random() - 0.5) * 2.6;
          s.y = (Math.random() - 0.5) * 1.8;
        }
      }
      stars.sort((a, b) => b.z - a.z);

      // Draw stars + comet trails (pointing back toward center)
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const z = s.z;
        if (z <= 0.02) continue;
        const scale = focal / z;
        const sx = w / 2 + s.x * w * 0.5 * scale;
        const sy = h / 2 + s.y * h * 0.5 * scale;
        if (sx < -80 || sx > w + 80 || sy < -80 || sy > h + 80) continue;
        const radius = s.r * scale * 1.0;
        const twinkle = 0.6 + Math.sin(s.tw) * 0.4;
        const alpha = Math.min(0.95, (1 - z) * 1.15) * twinkle;
        if (alpha <= 0.02) continue;
        const [cr, cg, cb] = s.c;

        if (z < 0.7) {
          const dx = sx - w / 2;
          const dy = sy - h / 2;
          const len = Math.hypot(dx, dy);
          if (len > 4) {
            const ux = -dx / len;
            const uy = -dy / len;
            const tailLen = (1 - z) * 75 + radius * 5;
            const tx = sx + ux * tailLen;
            const ty = sy + uy * tailLen;
            const lg = ctx.createLinearGradient(sx, sy, tx, ty);
            lg.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha * 0.7})`);
            lg.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
            ctx.strokeStyle = lg;
            ctx.lineWidth = Math.max(0.6, radius * 0.5);
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(tx, ty);
            ctx.stroke();
          }
        }

        // Star body
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        drawStar5(sx, sy, radius * 1.7);

        // Bright core
        ctx.globalAlpha = Math.min(1, alpha * 1.2);
        ctx.fillStyle = "#fff8d8";
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.4, radius * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Spawn brand icons periodically (~0.9–1.6s apart)
      iconAcc += dt;
      if (iconAcc > iconNext) {
        iconAcc = 0;
        iconNext = 55 + Math.random() * 40;
        spawnIcon();
      }

      // Update + draw icons
      for (let i = icons.length - 1; i >= 0; i--) {
        const ip = icons[i];
        ip.z -= speed * 1.15;
        ip.rot += ip.rotSpd * dt;
        if (ip.z <= 0.04) {
          icons.splice(i, 1);
          continue;
        }
        const scale = focal / ip.z;
        const sx = w / 2 + ip.x * w * 0.5 * scale;
        const sy = h / 2 + ip.y * h * 0.5 * scale;
        if (sx < -300 || sx > w + 300 || sy < -300 || sy > h + 300) continue;
        const sz = ip.size * scale * Math.min(w, h) * 0.6;
        const fadeIn = Math.min(1, (1 - ip.z) * 2.2);
        const alpha = Math.min(0.92, fadeIn);
        if (alpha <= 0.02) continue;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(sx, sy);
        ctx.rotate(ip.rot);
        ctx.shadowColor = "rgba(255, 230, 130, 0.55)";
        ctx.shadowBlur = 18 * (1 - ip.z);
        try {
          ctx.drawImage(ip.img, -sz / 2, -sz / 2, sz, sz);
        } catch {
          // SVG not yet decoded — skip this frame
        }
        ctx.restore();
      }
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const enter = useCallback(() => {
    try {
      const oneYear = 60 * 60 * 24 * 365;
      document.cookie = `${COOKIE_KEY}=1; path=/; max-age=${oneYear}; samesite=lax`;
      localStorage.setItem(COOKIE_KEY, "1");
    } catch {}
    window.location.href = "/";
  }, []);

  const p = progressRef.current;

  // Phase mapping
  const titleScale = 0.94 + p * 0.18;
  const titleY = -p * 70;
  const titleZ = -p * 220;
  const titleRotateX = p * 9;
  const titleOpacity = Math.max(0.12, 1 - Math.max(0, p - 0.72) * 2.6);
  const subtitleOpacity = Math.max(0, Math.min(1, (p - 0.04) * 6)) * Math.max(0.15, 1 - Math.max(0, p - 0.7) * 2.6);
  const scrollHintOpacity = Math.max(0, 1 - p * 6);
  const gridShift = -160 + p * 260;
  const haloScale = 0.85 + p * 0.45;
  const haloOpacity = 0.4 + p * 0.4;

  return (
    <main className="intro-root">
      <canvas ref={canvasRef} className="intro-canvas" />

      {/* Perspective grid floor */}
      <div className="grid-stage" aria-hidden>
        <div
          className="grid-floor"
          style={{ transform: `rotateX(72deg) translate3d(-50%, ${gridShift}px, 0)` }}
        />
      </div>

      {/* Soft halo bloom */}
      <div
        className="halo"
        aria-hidden
        style={{ opacity: haloOpacity, transform: `translate(-50%, -50%) scale(${haloScale})` }}
      />

      {/* Center stage */}
      <div className="stage">
        <div
          className="title-wrap"
          style={{
            transform: `translate3d(0, ${titleY}px, ${titleZ}px) rotateX(${titleRotateX}deg) scale(${titleScale})`,
            opacity: titleOpacity,
          }}
        >
          <h1 className="title" aria-label="TB STUDY LAB">
            <span className="title-main" aria-hidden>
              {"TB STUDY LAB".split("").map((c, i) => (
                <span
                  key={i}
                  className={c === " " ? "char space" : "char"}
                  style={{ animationDelay: `${0.25 + i * 0.09}s` }}
                >
                  {c === " " ? " " : c}
                </span>
              ))}
            </span>
            <svg
              className="flourish"
              viewBox="0 0 600 70"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                className="flourish-path"
                d="M 20 40 C 90 18, 170 50, 260 30 S 420 14, 510 36 Q 560 46, 580 28"
                fill="none"
                stroke="rgba(255,255,255,0.92)"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </h1>
          <p className="subtitle" style={{ opacity: subtitleOpacity }}>
            영상제작의 지침을 드립니다.
          </p>
        </div>

        <button type="button" className="enter-btn" onClick={enter}>
          <span className="enter-btn-glow" />
          <span className="enter-btn-label">입장하기</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Scroll hint */}
      <div className="scroll-hint" style={{ opacity: scrollHintOpacity }} aria-hidden={p > 0.05}>
        <span className="scroll-hint-text">SCROLL</span>
        <div className="scroll-hint-mouse">
          <div className="scroll-hint-dot" />
        </div>
      </div>

      {/* Brand chip */}
      <div className="brand-chip" aria-hidden>
        TB STUDY · LAB
      </div>

      {/* Progress bar */}
      <div className="progress-bar" aria-hidden>
        <div className="progress-fill" style={{ width: `${p * 100}%` }} />
      </div>

      <style jsx>{`
        .intro-root {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #02110b;
          color: #fff;
          font-family: var(--font-paperlogy), -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          perspective: 1400px;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }

        .intro-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }

        .grid-stage {
          position: absolute;
          inset: 0;
          z-index: 1;
          perspective: 900px;
          perspective-origin: 50% 38%;
          pointer-events: none;
          mask-image: radial-gradient(ellipse at 50% 30%, #000 30%, transparent 75%);
          -webkit-mask-image: radial-gradient(ellipse at 50% 30%, #000 30%, transparent 75%);
        }
        .grid-floor {
          position: absolute;
          left: 50%;
          bottom: -10%;
          width: 220vmax;
          height: 220vmax;
          transform-origin: 50% 0%;
          background-image:
            linear-gradient(to right, rgba(104, 217, 112, 0.25) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(104, 217, 112, 0.25) 1px, transparent 1px);
          background-size: 80px 80px;
          opacity: 0.8;
          animation: gridFlow 9s linear infinite;
        }
        @keyframes gridFlow {
          from { background-position: 0 0, 0 0; }
          to { background-position: 0 80px, 0 80px; }
        }

        .halo {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 90vmin;
          height: 90vmin;
          z-index: 2;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 50%, rgba(104, 217, 112, 0.55) 0%, rgba(0, 179, 128, 0.18) 35%, rgba(0, 0, 0, 0) 70%);
          filter: blur(8px);
          animation: haloPulse 6s ease-in-out infinite;
        }
        @keyframes haloPulse {
          0%, 100% { filter: blur(8px) brightness(1); }
          50% { filter: blur(14px) brightness(1.15); }
        }

        .stage {
          position: relative;
          z-index: 5;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 36px;
          padding: 24px;
          transform-style: preserve-3d;
        }

        .title-wrap {
          position: relative;
          text-align: center;
          transform-style: preserve-3d;
          will-change: transform, opacity;
          animation: floatY 7s ease-in-out infinite;
        }
        @keyframes floatY {
          0%, 100% { translate: 0 0; }
          50% { translate: 0 -6px; }
        }

        .title {
          position: relative;
          font-family: var(--font-kaushan), "Kaushan Script", "Brush Script MT", cursive;
          font-size: clamp(54px, 10vw, 132px);
          font-weight: 400;
          letter-spacing: 0.005em;
          line-height: 1.1;
          margin: 0;
          color: #fff;
          transform-style: preserve-3d;
          white-space: nowrap;
        }
        .title-main {
          position: relative;
          display: inline-block;
          color: #ffffff;
          white-space: nowrap;
        }
        .char {
          display: inline-block;
          color: #ffffff;
          text-shadow:
            0 0 18px rgba(255, 255, 255, 0.65),
            0 0 38px rgba(255, 240, 180, 0.45),
            0 0 70px rgba(255, 200, 90, 0.32),
            0 4px 14px rgba(0, 0, 0, 0.6);
          opacity: 0;
          transform: translateY(34px) scale(0.62) rotate(-10deg);
          transform-origin: 50% 90%;
          animation: charIn 1.15s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          will-change: transform, opacity;
        }
        .char.space { width: 0.32em; }
        @keyframes charIn {
          to {
            opacity: 1;
            transform: translateY(0) scale(1) rotate(0);
          }
        }

        .flourish {
          position: absolute;
          left: 8%;
          right: 8%;
          bottom: -22px;
          width: 84%;
          height: 38px;
          pointer-events: none;
          overflow: visible;
        }
        .flourish-path {
          stroke-dasharray: 1200;
          stroke-dashoffset: 1200;
          filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.55))
                  drop-shadow(0 0 18px rgba(104, 217, 112, 0.35));
          animation: drawFlourish 1.4s cubic-bezier(0.65, 0, 0.35, 1) 1.4s forwards;
        }
        @keyframes drawFlourish {
          to { stroke-dashoffset: 0; }
        }

        .subtitle {
          margin-top: 26px;
          font-size: clamp(15px, 1.7vw, 22px);
          font-weight: 500;
          letter-spacing: 0.01em;
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.6;
          text-shadow: 0 2px 14px rgba(0, 0, 0, 0.5);
        }

        .enter-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 18px 38px;
          border: 1px solid rgba(104, 217, 112, 0.55);
          border-radius: 100px;
          background: linear-gradient(135deg, #68D970 0%, #00B380 55%, #00996D 100%);
          color: #fff;
          font-family: inherit;
          font-size: 17px;
          font-weight: 800;
          letter-spacing: 0.04em;
          cursor: pointer;
          will-change: transform, opacity;
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 2), box-shadow 0.3s, filter 0.3s;
          box-shadow:
            0 18px 38px rgba(0, 153, 109, 0.45),
            0 0 0 1px rgba(255, 255, 255, 0.08) inset,
            0 1px 0 rgba(255, 255, 255, 0.4) inset;
          overflow: hidden;
        }
        .enter-btn:hover {
          transform: translateY(-2px) scale(1.04) !important;
          filter: brightness(1.08);
          box-shadow:
            0 26px 50px rgba(0, 153, 109, 0.55),
            0 0 0 1px rgba(255, 255, 255, 0.12) inset,
            0 1px 0 rgba(255, 255, 255, 0.45) inset;
        }
        .enter-btn:active {
          transform: translateY(1px) scale(0.94) !important;
          box-shadow:
            0 8px 18px rgba(0, 153, 109, 0.4),
            inset 0 2px 6px rgba(0, 0, 0, 0.25);
          transition: transform 0.08s ease-out, box-shadow 0.08s ease-out;
        }
        .enter-btn-glow {
          position: absolute;
          inset: -2px;
          border-radius: inherit;
          background: conic-gradient(from 0deg,
            transparent 0deg,
            rgba(255, 255, 255, 0.55) 60deg,
            transparent 120deg,
            transparent 360deg);
          mix-blend-mode: overlay;
          opacity: 0.4;
          animation: btnSpin 4s linear infinite;
          pointer-events: none;
        }
        @keyframes btnSpin {
          to { transform: rotate(360deg); }
        }
        .enter-btn-label {
          position: relative;
          z-index: 1;
        }
        .enter-btn svg {
          position: relative;
          z-index: 1;
        }

        .scroll-hint {
          position: absolute;
          left: 50%;
          bottom: 54px;
          transform: translateX(-50%);
          z-index: 6;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: rgba(255, 255, 255, 0.85);
          pointer-events: none;
          transition: opacity 0.4s ease;
        }
        .scroll-hint-text {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.4em;
          text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        }
        .scroll-hint-mouse {
          width: 24px;
          height: 38px;
          border: 1.5px solid rgba(255, 255, 255, 0.7);
          border-radius: 14px;
          display: flex;
          justify-content: center;
          padding-top: 7px;
          box-shadow: 0 0 12px rgba(0, 0, 0, 0.4);
        }
        .scroll-hint-dot {
          width: 3px;
          height: 7px;
          border-radius: 2px;
          background: #68D970;
          box-shadow: 0 0 8px #68D970;
          animation: scrollDot 1.6s ease-in-out infinite;
        }
        @keyframes scrollDot {
          0% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(10px); opacity: 0.4; }
          100% { transform: translateY(0); opacity: 1; }
        }

        .brand-chip {
          position: absolute;
          top: 26px;
          left: 26px;
          z-index: 10;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.32em;
          color: rgba(255, 255, 255, 0.7);
          padding: 6px 0;
          text-transform: uppercase;
          text-shadow: 0 0 8px rgba(0, 0, 0, 0.6);
        }

        .progress-bar {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 8;
          height: 3px;
          background: rgba(255, 255, 255, 0.06);
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #68D970, #00B380, #00996D);
          box-shadow: 0 0 14px rgba(104, 217, 112, 0.6);
          transition: width 0.08s linear;
        }

        @media (max-width: 640px) {
          .subtitle { margin-top: 18px; }
          .enter-btn { padding: 15px 30px; font-size: 15px; }
          .scroll-hint { bottom: 32px; }
          .brand-chip { font-size: 10px; left: 18px; top: 20px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .title-wrap, .grid-floor, .halo, .scroll-hint-dot, .enter-btn-glow {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}
