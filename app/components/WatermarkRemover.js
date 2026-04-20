'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Droplets, Download, RefreshCw, Check, AlertCircle, X,
  ZoomIn, ZoomOut, Undo2, Redo2, Loader2, Image as ImageIcon, GripVertical,
} from 'lucide-react';

// --- Utilities ---
const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Failed to load image'));
  img.src = src;
});

const getImageDimensions = (url) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
  img.onerror = () => reject(new Error('Failed to load image'));
  img.src = url;
});

const canvasToBlob = (canvas, format = 'png', quality = 1.0) => new Promise((resolve, reject) => {
  const mimeType = format === 'webp' ? 'image/webp' : 'image/png';
  canvas.toBlob((blob) => { if (blob) resolve(blob); else reject(new Error('Failed to create blob')); }, mimeType, quality);
});

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
};

// --- Telea Inpainting ---
class WmMinHeap {
  constructor() { this.data = []; }
  push(item) { this.data.push(item); this._bubbleUp(this.data.length - 1); }
  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0 && last) { this.data[0] = last; this._sinkDown(0); }
    return top;
  }
  get size() { return this.data.length; }
  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[i].dist < this.data[parent].dist) {
        [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
        i = parent;
      } else break;
    }
  }
  _sinkDown(i) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.data[l].dist < this.data[smallest].dist) smallest = l;
      if (r < n && this.data[r].dist < this.data[smallest].dist) smallest = r;
      if (smallest !== i) {
        [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
        i = smallest;
      } else break;
    }
  }
}

const KNOWN = 0, BAND = 1, UNKNOWN = 2;

function wmTeleaInpaint(imageData, maskData, radius) {
  const w = imageData.width, h = imageData.height;
  const src = new Float32Array(imageData.data);
  const out = new Float32Array(src);
  const state = new Uint8Array(w * h);
  const dist = new Float32Array(w * h);
  const heap = new WmMinHeap();
  const INF = 1e10;

  for (let i = 0; i < w * h; i++) {
    if (maskData[i] > 128) { state[i] = UNKNOWN; dist[i] = INF; }
    else { state[i] = KNOWN; dist[i] = 0; }
  }

  const dx4 = [-1, 1, 0, 0], dy4 = [0, 0, -1, 1];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (state[idx] !== KNOWN) continue;
      for (let d = 0; d < 4; d++) {
        const nx = x + dx4[d], ny = y + dy4[d];
        if (nx >= 0 && nx < w && ny >= 0 && ny < h && state[ny * w + nx] === UNKNOWN) {
          state[idx] = BAND; dist[idx] = 0; heap.push({ dist: 0, x, y }); break;
        }
      }
    }
  }

  while (heap.size > 0) {
    const cur = heap.pop();
    const ci = cur.y * w + cur.x;
    if (state[ci] === KNOWN) continue;
    state[ci] = KNOWN;
    let sumR = 0, sumG = 0, sumB = 0, sumW = 0;
    const r2 = radius * radius;
    const rInt = Math.ceil(radius);
    for (let dy = -rInt; dy <= rInt; dy++) {
      for (let dx = -rInt; dx <= rInt; dx++) {
        const nx = cur.x + dx, ny = cur.y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const ni = ny * w + nx;
        if (state[ni] !== KNOWN || ni === ci) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const geoDist = 1.0 / (Math.sqrt(d2) + 1e-6);
        const levelDist = 1.0 / (1 + Math.abs(dist[ni] - dist[ci]));
        const dirFactor = Math.max(0.01, (dx * (cur.x - nx) + dy * (cur.y - ny)) / (Math.sqrt(d2) + 1e-6));
        const weight = geoDist * levelDist * dirFactor;
        const pi = ni * 4;
        sumR += out[pi] * weight; sumG += out[pi + 1] * weight; sumB += out[pi + 2] * weight; sumW += weight;
      }
    }
    if (sumW > 0) {
      const pi = ci * 4;
      out[pi] = sumR / sumW; out[pi + 1] = sumG / sumW; out[pi + 2] = sumB / sumW; out[pi + 3] = 255;
    }
    for (let d = 0; d < 4; d++) {
      const nx = cur.x + dx4[d], ny = cur.y + dy4[d];
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const ni = ny * w + nx;
      if (state[ni] !== UNKNOWN) continue;
      const newDist = dist[ci] + 1;
      if (newDist < dist[ni]) { dist[ni] = newDist; state[ni] = BAND; heap.push({ dist: newDist, x: nx, y: ny }); }
    }
  }

  const result = new ImageData(w, h);
  for (let i = 0; i < out.length; i++) result.data[i] = Math.max(0, Math.min(255, Math.round(out[i])));
  return result;
}

// --- Mask Painter ---
const WM_INITIAL_ZOOM = 0.75;
const WM_MIN_ZOOM = 0.3;
const WM_MAX_ZOOM = 10;
const WM_MIN_BRUSH = 5;
const WM_MAX_BRUSH = 100;
const WM_MAX_HISTORY = 20;

function WmMaskPainter({ imageUrl, width, height, onMaskReady, processing }) {
  const containerRef = useRef(null);
  const imgCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const cursorRef = useRef(null);

  const [brushSize, setBrushSize] = useState(30);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [zoom, setZoom] = useState(WM_INITIAL_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [displayRect, setDisplayRect] = useState({ rw: 0, rh: 0, ox: 0, oy: 0 });

  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const lastPosRef = useRef(null);
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartMouseRef = useRef({ x: 0, y: 0 });
  const panStartValRef = useRef({ x: 0, y: 0 });
  const spaceHeldRef = useRef(false);
  const initialCenteredRef = useRef(false);

  const brushSizeRef = useRef(brushSize); brushSizeRef.current = brushSize;
  const zoomRef = useRef(zoom); zoomRef.current = zoom;
  const panRef = useRef(pan); panRef.current = pan;
  const undoRef = useRef(() => {});
  const redoRef = useRef(() => {});

  useEffect(() => {
    const imgCanvas = imgCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!imgCanvas || !maskCanvas) return;
    imgCanvas.width = width; imgCanvas.height = height;
    maskCanvas.width = width; maskCanvas.height = height;
    const imgCtx = imgCanvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    maskCtx.clearRect(0, 0, width, height);
    loadImage(imageUrl).then((img) => {
      imgCtx.clearRect(0, 0, width, height);
      imgCtx.drawImage(img, 0, 0, width, height);
      historyRef.current = [];
      historyIndexRef.current = -1;
      saveMaskHistory();
    });
    setZoom(WM_INITIAL_ZOOM);
    setPan({ x: 0, y: 0 });
    initialCenteredRef.current = false;
  }, [imageUrl, width, height]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || width === 0 || height === 0) return;
    const computeRect = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (cw === 0 || ch === 0) return;
      const imageAspect = width / height;
      const containerAspect = cw / ch;
      let rw, rh, ox, oy;
      if (imageAspect > containerAspect) { rw = cw; rh = cw / imageAspect; ox = 0; oy = (ch - rh) / 2; }
      else { rh = ch; rw = ch * imageAspect; ox = (cw - rw) / 2; oy = 0; }
      setDisplayRect({ rw, rh, ox, oy });
    };
    computeRect();
    const observer = new ResizeObserver(computeRect);
    observer.observe(container);
    return () => observer.disconnect();
  }, [width, height]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault(); spaceHeldRef.current = true;
        if (cursorRef.current) cursorRef.current.style.display = 'none';
        if (containerRef.current) containerRef.current.style.cursor = 'grab';
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoRef.current(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); redoRef.current(); }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') {
        spaceHeldRef.current = false;
        if (containerRef.current) containerRef.current.style.cursor = 'none';
        if (cursorRef.current) cursorRef.current.style.display = 'block';
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, []);

  const getContainedRect = useCallback(() => {
    if (displayRect.rw > 0) return { offsetX: displayRect.ox, offsetY: displayRect.oy, renderWidth: displayRect.rw, renderHeight: displayRect.rh };
    return { offsetX: 0, offsetY: 0, renderWidth: 1, renderHeight: 1 };
  }, [displayRect]);

  const clampPan = useCallback((px, py, z) => {
    const container = containerRef.current;
    if (!container) return { x: px, y: py };
    if (z <= 1) return { x: px, y: py };
    const cw = container.clientWidth, ch = container.clientHeight;
    return { x: Math.max(cw * (1 - z), Math.min(0, px)), y: Math.max(ch * (1 - z), Math.min(0, py)) };
  }, []);

  useEffect(() => {
    if (displayRect.rw === 0 || initialCenteredRef.current) return;
    initialCenteredRef.current = true;
    const container = containerRef.current;
    if (!container) return;
    const cw = container.clientWidth, ch = container.clientHeight;
    const z = zoomRef.current;
    setPan({ x: (cw - cw * z) / 2, y: (ch - ch * z) / 2 });
  }, [displayRect]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const delta = e.deltaY > 0 ? -2 : 2;
        setBrushSize(prev => Math.max(WM_MIN_BRUSH, Math.min(WM_MAX_BRUSH, prev + delta)));
      } else {
        const rect = container.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const oldZoom = zoomRef.current;
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        let newZoom = Math.max(WM_MIN_ZOOM, Math.min(WM_MAX_ZOOM, oldZoom * factor));
        if (Math.abs(newZoom - 1) < 0.05) newZoom = 1;
        const nx = mx - (mx - panRef.current.x) * (newZoom / oldZoom);
        const ny = my - (my - panRef.current.y) * (newZoom / oldZoom);
        setZoom(newZoom);
        setPan(newZoom <= 1 ? { x: nx, y: ny } : { x: Math.max(container.clientWidth * (1 - newZoom), Math.min(0, nx)), y: Math.max(container.clientHeight * (1 - newZoom), Math.min(0, ny)) });
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const saveMaskHistory = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    const data = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const idx = historyIndexRef.current;
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push(data);
    if (historyRef.current.length > WM_MAX_HISTORY) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    maskCanvas.getContext('2d').putImageData(historyRef.current[historyIndexRef.current], 0, 0);
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    maskCanvas.getContext('2d').putImageData(historyRef.current[historyIndexRef.current], 0, 0);
    setCanUndo(true);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);
  undoRef.current = undo;
  redoRef.current = redo;

  const getCanvasPos = useCallback((clientX, clientY) => {
    const canvas = imgCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return null;
    const rect = container.getBoundingClientRect();
    const cx = clientX - rect.left, cy = clientY - rect.top;
    const lx = (cx - panRef.current.x) / zoomRef.current;
    const ly = (cy - panRef.current.y) / zoomRef.current;
    const { offsetX, offsetY, renderWidth, renderHeight } = getContainedRect();
    const scaleX = canvas.width / renderWidth, scaleY = canvas.height / renderHeight;
    return { x: (lx - offsetX) * scaleX, y: (ly - offsetY) * scaleY };
  }, [getContainedRect]);

  const paint = useCallback((x, y) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    const { renderWidth } = getContainedRect();
    const baseScale = maskCanvas.width / renderWidth;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(x, y, (brushSizeRef.current / 2) * baseScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, [getContainedRect]);

  const paintLine = useCallback((from, to) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    const { renderWidth } = getContainedRect();
    const baseScale = maskCanvas.width / renderWidth;
    const r = (brushSizeRef.current / 2) * baseScale;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = r * 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    ctx.restore();
  }, [getContainedRect]);

  const moveCursor = useCallback((clientX, clientY) => {
    const container = containerRef.current;
    const cursor = cursorRef.current;
    if (!container || !cursor) return;
    const rect = container.getBoundingClientRect();
    cursor.style.left = `${clientX - rect.left}px`;
    cursor.style.top = `${clientY - rect.top}px`;
  }, []);

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    if (containerRef.current) containerRef.current.setPointerCapture(e.pointerId);
    if (e.button === 1 || e.button === 2 || (e.button === 0 && spaceHeldRef.current)) {
      isPanningRef.current = true;
      panStartMouseRef.current = { x: e.clientX, y: e.clientY };
      panStartValRef.current = { ...panRef.current };
      if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
      return;
    }
    if (e.button === 0) {
      isDrawingRef.current = true;
      const pos = getCanvasPos(e.clientX, e.clientY);
      if (pos) { paint(pos.x, pos.y); lastPosRef.current = pos; }
    }
  }, [getCanvasPos, paint]);

  const handlePointerMove = useCallback((e) => {
    if (e.pointerType === 'mouse' && !spaceHeldRef.current && !isPanningRef.current) {
      moveCursor(e.clientX, e.clientY);
      if (!cursorVisible) setCursorVisible(true);
    }
    if (isPanningRef.current) {
      const dx = e.clientX - panStartMouseRef.current.x, dy = e.clientY - panStartMouseRef.current.y;
      setPan(clampPan(panStartValRef.current.x + dx, panStartValRef.current.y + dy, zoomRef.current));
      return;
    }
    if (!isDrawingRef.current) return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    if (pos) { if (lastPosRef.current) paintLine(lastPosRef.current, pos); else paint(pos.x, pos.y); lastPosRef.current = pos; }
  }, [cursorVisible, getCanvasPos, paint, paintLine, moveCursor, clampPan]);

  const handlePointerUp = useCallback((e) => {
    if (containerRef.current) containerRef.current.releasePointerCapture(e.pointerId);
    if (isPanningRef.current) {
      isPanningRef.current = false;
      if (containerRef.current) containerRef.current.style.cursor = spaceHeldRef.current ? 'grab' : 'none';
      return;
    }
    if (isDrawingRef.current) { isDrawingRef.current = false; lastPosRef.current = null; saveMaskHistory(); }
  }, [saveMaskHistory]);

  const handlePointerLeave = useCallback(() => { setCursorVisible(false); }, []);

  const zoomTo = useCallback((newZoom) => {
    const container = containerRef.current;
    if (!container) return;
    const cw = container.clientWidth, ch = container.clientHeight;
    const oldZoom = zoomRef.current;
    const z = Math.max(WM_MIN_ZOOM, Math.min(WM_MAX_ZOOM, newZoom));
    const mx = cw / 2, my = ch / 2;
    const nx = mx - (mx - panRef.current.x) * (z / oldZoom);
    const ny = my - (my - panRef.current.y) * (z / oldZoom);
    setZoom(z); setPan(clampPan(nx, ny, z));
  }, [clampPan]);

  const handleComplete = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    const maskImageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const mask = new Uint8Array(maskCanvas.width * maskCanvas.height);
    for (let i = 0; i < mask.length; i++) mask[i] = maskImageData.data[i * 4 + 3] > 0 ? 255 : 0;
    onMaskReady(mask);
  }, [onMaskReady]);

  const cursorSize = brushSize * zoom;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 flex-wrap pb-2 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-[140px]">
          <div className="shrink-0 rounded-full bg-zinc-300" style={{ width: Math.max(8, brushSize * 0.4), height: Math.max(8, brushSize * 0.4) }} />
          <input type="range" min={WM_MIN_BRUSH} max={WM_MAX_BRUSH} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="flex-1 accent-violet-500" disabled={processing} />
          <span className="text-[10px] text-zinc-500 w-6 text-right tabular-nums font-bold">{brushSize}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={undo} disabled={!canUndo || processing} className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 disabled:opacity-30 tb-press-soft" title="실행 취소"><Undo2 className="w-3.5 h-3.5" /></button>
          <button onClick={redo} disabled={!canRedo || processing} className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 disabled:opacity-30 tb-press-soft" title="다시 실행"><Redo2 className="w-3.5 h-3.5" /></button>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => zoomTo(zoom / 1.3)} disabled={zoom <= WM_MIN_ZOOM || processing} className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 disabled:opacity-30 tb-press-soft" title="축소"><ZoomOut className="w-3.5 h-3.5" /></button>
          <button onClick={() => zoomTo(1)} disabled={zoom === 1 || processing} className="px-1.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 disabled:opacity-30 tb-press-soft text-[10px] tabular-nums min-w-[2.5rem] text-center font-bold" title="초기화">{Math.round(zoom * 100)}%</button>
          <button onClick={() => zoomTo(zoom * 1.3)} disabled={zoom >= WM_MAX_ZOOM || processing} className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 disabled:opacity-30 tb-press-soft" title="확대"><ZoomIn className="w-3.5 h-3.5" /></button>
        </div>
        <button onClick={handleComplete} disabled={processing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 tb-press">
          {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {processing ? '처리중...' : '적용'}
        </button>
      </div>
      <div
        ref={containerRef}
        className="relative flex-1 rounded-xl overflow-hidden select-none bg-zinc-800/50"
        style={{ cursor: processing ? 'wait' : 'none', touchAction: 'none' }}
        onPointerDown={processing ? undefined : handlePointerDown}
        onPointerMove={processing ? undefined : handlePointerMove}
        onPointerUp={processing ? undefined : handlePointerUp}
        onPointerLeave={processing ? undefined : handlePointerLeave}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="absolute inset-0 origin-top-left pointer-events-none" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          <div className="absolute" style={{ left: displayRect.ox, top: displayRect.oy, width: displayRect.rw || '100%', height: displayRect.rh || '100%' }}>
            <canvas ref={imgCanvasRef} className="w-full h-full block" />
            <canvas ref={maskCanvasRef} className="absolute inset-0 w-full h-full block" />
          </div>
        </div>
        <div ref={cursorRef} className="absolute pointer-events-none" style={{ width: cursorSize, height: cursorSize, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.8)', boxShadow: '0 0 0 1px rgba(0,0,0,0.3)', transform: 'translate(-50%, -50%)', display: cursorVisible && !processing ? 'block' : 'none' }} />
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 px-1.5 sm:px-2 py-0.5 bg-black/50 rounded text-[10px] sm:text-xs text-white font-medium pointer-events-none">
          마스크 모드 — 제거할 영역을 칠하세요
        </div>
        {zoom > 1 && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 px-1.5 sm:px-2 py-0.5 bg-black/50 rounded text-[10px] sm:text-xs text-white font-medium tabular-nums pointer-events-none">
            {Math.round(zoom * 100)}%
          </div>
        )}
        {processing && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            <div className="flex items-center gap-2 px-4 py-2 bg-black/70 rounded-lg">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
              <span className="text-white text-sm font-bold">워터마크 제거 중...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Component ---
const WM_MAX_FILE_SIZE = 20 * 1024 * 1024;
const WM_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const WM_DEFAULT_INPAINT_RADIUS = 5;

export default function WatermarkRemover({ accentColor = '#8b5cf6' }) {
  const [imageFile, setImageFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState(null);
  const [currentUrl, setCurrentUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [wmProcessing, setWmProcessing] = useState(false);
  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);
  const [inpaintRadius, setInpaintRadius] = useState(WM_DEFAULT_INPAINT_RADIUS);
  const [downloadFormat, setDownloadFormat] = useState('png');
  const [isDragOver, setIsDragOver] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const sliderRef = useRef(null);
  const isDragging = useRef(false);
  const originalImageDataRef = useRef(null);

  const wmValidateFile = (file) => {
    if (!WM_ACCEPTED_TYPES.includes(file.type)) return 'PNG, JPEG, WEBP 형식만 지원합니다.';
    if (file.size > WM_MAX_FILE_SIZE) return '파일 크기는 20MB 이하여야 합니다.';
    return null;
  };

  const handleImageFile = async (file) => {
    const validationError = wmValidateFile(file);
    if (validationError) { setError(validationError); return; }
    setError(null); setImageFile(file);
    const url = URL.createObjectURL(file);
    setOriginalUrl(url); setCurrentUrl(url); setResultUrl(null); setSliderPosition(50);
    try {
      const dims = await getImageDimensions(url);
      setImageWidth(dims.width); setImageHeight(dims.height);
      const img = await loadImage(url);
      const canvas = document.createElement('canvas');
      canvas.width = dims.width; canvas.height = dims.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      originalImageDataRef.current = ctx.getImageData(0, 0, dims.width, dims.height);
    } catch { setImageWidth(0); setImageHeight(0); }
    setStatus('masking');
  };

  const handleMaskReady = async (mask) => {
    if (!originalImageDataRef.current) { setError('원본 이미지 데이터를 불러올 수 없습니다.'); return; }
    let hasMask = false;
    for (let i = 0; i < mask.length; i++) { if (mask[i] > 128) { hasMask = true; break; } }
    if (!hasMask) { setError('마스크를 칠해주세요. 제거할 영역을 선택하지 않았습니다.'); return; }
    setWmProcessing(true); setError(null);
    await new Promise((resolve) => {
      setTimeout(() => {
        try {
          const result = wmTeleaInpaint(originalImageDataRef.current, mask, inpaintRadius);
          const canvas = document.createElement('canvas');
          canvas.width = imageWidth; canvas.height = imageHeight;
          const ctx = canvas.getContext('2d');
          ctx.putImageData(result, 0, 0);
          originalImageDataRef.current = result;
          const newUrl = canvas.toDataURL('image/png');
          setCurrentUrl(newUrl); setResultUrl(newUrl);
        } catch (err) { setError(err.message || '인페인팅 처리 중 오류가 발생했습니다.'); }
        setWmProcessing(false); resolve();
      }, 50);
    });
  };

  const handleDownload = async () => {
    if (!currentUrl || !imageFile) return;
    try {
      const img = await loadImage(currentUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      const blob = await canvasToBlob(canvas, downloadFormat);
      const baseName = imageFile.name.replace(/\.[^.]+$/, '');
      downloadBlob(blob, `${baseName}_wm-removed.${downloadFormat}`);
    } catch { /* download failed */ }
  };

  const resetAll = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    setImageFile(null); setOriginalUrl(null); setCurrentUrl(null); setResultUrl(null);
    setStatus('idle'); setError(null); setImageWidth(0); setImageHeight(0);
    setInpaintRadius(WM_DEFAULT_INPAINT_RADIUS); setSliderPosition(50); setWmProcessing(false);
    originalImageDataRef.current = null;
  };

  const goBackToMasking = () => { setResultUrl(null); setStatus('masking'); setError(null); };

  const handleDrop = (e) => { e.preventDefault(); setIsDragOver(false); const file = e.dataTransfer.files[0]; if (file) handleImageFile(file); };
  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false); };

  const updateSliderPosition = useCallback((clientX) => {
    const rect = sliderRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  }, []);
  const handleSliderPointerDown = useCallback((e) => { isDragging.current = true; e.target.setPointerCapture(e.pointerId); updateSliderPosition(e.clientX); }, [updateSliderPosition]);
  const handleSliderPointerMove = useCallback((e) => { if (!isDragging.current) return; updateSliderPosition(e.clientX); }, [updateSliderPosition]);
  const handleSliderPointerUp = useCallback(() => { isDragging.current = false; }, []);

  // Upload state
  if (status === 'idle') {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className={`w-full max-w-lg p-10 rounded-2xl text-center cursor-pointer bg-white/[0.06] backdrop-blur-2xl border-2 border-dashed shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_30px_rgba(0,0,0,0.25)] transition-colors ${isDragOver ? 'border-violet-400 bg-violet-500/10' : 'border-white/20 hover:border-white/35 hover:bg-white/[0.09]'}`}
          onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('wm-image-input')?.click()}
        >
          <input id="wm-image-input" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageFile(file); }} />
          <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center bg-white/[0.04] border border-white/[0.06]">
            <Droplets className="w-10 h-10" style={{ color: accentColor }} />
          </div>
          <p className="text-lg font-bold text-zinc-300 mb-2">이미지를 드래그하거나 클릭하여 업로드</p>
          <p className="text-sm text-zinc-500">PNG, JPEG, WEBP 지원 (최대 20MB)</p>
          {error && (
            <div className="mt-4 p-2.5 rounded-xl flex items-center gap-2 text-xs bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="text-zinc-300">{error}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Masking state
  if (status === 'masking') {
    return (
      <div className="flex-1 flex flex-col min-h-0 p-3 md:p-4">
        <div className="flex items-center gap-2 mb-2 shrink-0">
          <Droplets className="w-4 h-4" style={{ color: accentColor }} />
          <h3 className="text-sm font-black text-zinc-100 uppercase flex-1">워터마크 영역 선택</h3>
          <div className="flex items-center gap-2 text-xs">
            <label className="text-zinc-500 font-bold">반경</label>
            <input type="range" min={3} max={20} value={inpaintRadius} onChange={(e) => setInpaintRadius(Number(e.target.value))} className="w-20 accent-violet-500" disabled={wmProcessing} />
            <span className="text-zinc-500 tabular-nums font-bold w-4 text-right">{inpaintRadius}</span>
          </div>
          {resultUrl && (
            <div className="flex items-center gap-1">
              <select value={downloadFormat} onChange={(e) => setDownloadFormat(e.target.value)} className="px-1.5 py-1 rounded-lg text-xs font-bold uppercase bg-zinc-800 border border-white/[0.06] text-zinc-300">
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
              </select>
              <button onClick={handleDownload} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white tb-press">
                <Download className="w-3 h-3" />
              </button>
            </div>
          )}
          <button onClick={resetAll} className="px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 tb-press-soft">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
        {error && (
          <div className="mb-2 p-2.5 rounded-xl flex items-center gap-2 text-xs bg-red-500/10 border border-red-500/30 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="text-zinc-300">{error}</span>
          </div>
        )}
        <WmMaskPainter imageUrl={currentUrl} width={imageWidth} height={imageHeight} onMaskReady={handleMaskReady} processing={wmProcessing} />
      </div>
    );
  }

  // Done state — Before/After slider
  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0 p-3 md:p-4 gap-3">
      <div className="w-full md:flex-1 flex flex-col gap-3 md:overflow-y-auto">
        <div className="bg-zinc-900/50 border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-2">
            <Droplets className="w-4 h-4" style={{ color: accentColor }} />
            <h3 className="text-sm font-black text-zinc-100 uppercase flex-1">결과 비교</h3>
            <span className="text-[10px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded bg-violet-500/20 border border-violet-500/30 text-violet-300">{imageWidth}x{imageHeight}</span>
            <button onClick={resetAll} className="px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 tb-press-soft">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
          <div className="p-3">
            <div
              ref={sliderRef}
              className="relative w-full aspect-[4/3] sm:aspect-video rounded-xl overflow-hidden select-none cursor-col-resize bg-zinc-800/50"
              style={{ touchAction: 'none' }}
              onPointerDown={handleSliderPointerDown}
              onPointerMove={handleSliderPointerMove}
              onPointerUp={handleSliderPointerUp}
            >
              <img src={resultUrl} alt="After" className="absolute inset-0 w-full h-full object-contain" draggable={false} />
              <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
                <img src={originalUrl} alt="Before" className="absolute inset-0 w-full h-full object-contain" draggable={false} />
              </div>
              <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg" style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 sm:w-8 sm:h-8 bg-white rounded-full shadow-lg flex items-center justify-center border border-zinc-300">
                  <GripVertical className="w-5 h-5 sm:w-4 sm:h-4 text-zinc-500" />
                </div>
              </div>
              <div className="absolute top-2 left-2 sm:top-3 sm:left-3 px-1.5 sm:px-2 py-0.5 bg-black/50 rounded text-[10px] sm:text-xs text-white font-medium">Before</div>
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 px-1.5 sm:px-2 py-0.5 bg-black/50 rounded text-[10px] sm:text-xs text-white font-medium">After</div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full md:w-64 shrink-0 flex flex-col gap-3">
        <button onClick={goBackToMasking} className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold w-full bg-violet-600 hover:bg-violet-500 text-white tb-press">
          <Droplets className="w-4 h-4" />
          다시 마스크
        </button>
        <div className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-3 md:p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-black text-zinc-100 uppercase">다운로드</h3>
          </div>
          <div className="flex rounded-lg border border-white/[0.06] overflow-hidden">
            {['png', 'webp'].map((f) => (
              <button key={f} onClick={() => setDownloadFormat(f)} className={`flex-1 text-xs py-2 font-bold uppercase transition-colors ${downloadFormat === f ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>{f}</button>
            ))}
          </div>
          <button onClick={handleDownload} className="flex-1 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white tb-press">
            <Download className="w-4 h-4" />
            다운로드
          </button>
        </div>
        <button onClick={resetAll} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 tb-press-soft">
          <ImageIcon className="w-4 h-4" />
          새 이미지
        </button>
      </div>
    </div>
  );
}
