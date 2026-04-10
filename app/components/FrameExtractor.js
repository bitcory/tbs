'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Film, Image as ImageIcon, RefreshCw, Download, ExternalLink, X, Check, AlertCircle,
} from 'lucide-react';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatTimePrecise = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

export default function FrameExtractor({ accentColor = '#f59e0b' }) {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [frameInterval, setFrameInterval] = useState(1);
  const [extractedFrames, setExtractedFrames] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionError, setExtractionError] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoMetadata, setVideoMetadata] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [detectedFps, setDetectedFps] = useState(0);
  const [useAllFrames, setUseAllFrames] = useState(false);
  const [selectedFrameIds, setSelectedFrameIds] = useState(new Set());
  const [previewFrame, setPreviewFrame] = useState(null);
  const videoRef = useRef(null);

  const toggleSelectFrame = (id) => {
    setSelectedFrameIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFrames = () => {
    if (selectedFrameIds.size === extractedFrames.length) {
      setSelectedFrameIds(new Set());
    } else {
      setSelectedFrameIds(new Set(extractedFrames.map(f => f.id)));
    }
  };

  const downloadFrame = (frame) => {
    const link = document.createElement('a');
    link.href = frame.dataUrl;
    link.download = frame.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSelectedFrames = async () => {
    const targets = extractedFrames.filter(f => selectedFrameIds.has(f.id));
    for (let i = 0; i < targets.length; i++) {
      downloadFrame(targets[i]);
      if (i < targets.length - 1) await new Promise(r => setTimeout(r, 200));
    }
  };

  const downloadAllFrames = async () => {
    for (let i = 0; i < extractedFrames.length; i++) {
      downloadFrame(extractedFrames[i]);
      if (i < extractedFrames.length - 1) await new Promise(r => setTimeout(r, 200));
    }
  };

  const handleVideoFile = (file) => {
    if (!file.type.startsWith('video/')) {
      setExtractionError('동영상 파일만 업로드할 수 있습니다.');
      return;
    }
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setExtractedFrames([]);
    setExtractionError(null);
    setExtractionProgress(0);
    setDetectedFps(0);
    setUseAllFrames(false);
  };

  const handleDrop = (e) => { e.preventDefault(); setIsDragOver(false); const file = e.dataTransfer.files[0]; if (file) handleVideoFile(file); };
  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false); };
  const handleFileSelect = (e) => { const file = e.target.files?.[0]; if (file) handleVideoFile(file); };

  const handleVideoLoaded = (e) => {
    const video = e.currentTarget;
    setVideoDuration(video.duration);
    setVideoMetadata({ width: video.videoWidth, height: video.videoHeight });

    const COMMON_FPS = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60];
    const snapToCommonFps = (raw) => {
      let closest = raw, minDiff = Infinity;
      for (const std of COMMON_FPS) {
        const diff = Math.abs(raw - std);
        if (diff < minDiff) { minDiff = diff; closest = std; }
      }
      return minDiff <= 1.5 ? Math.round(closest) : Math.round(raw);
    };

    if ('requestVideoFrameCallback' in video) {
      let frameCount = 0, startTime = 0;
      const SAMPLE_COUNT = 30;
      const detectFps = () => {
        video.requestVideoFrameCallback((_now, metadata) => {
          if (frameCount === 0) startTime = metadata.mediaTime;
          frameCount++;
          if (frameCount < SAMPLE_COUNT) { detectFps(); }
          else {
            const elapsed = metadata.mediaTime - startTime;
            setDetectedFps(elapsed > 0 ? snapToCommonFps((frameCount - 1) / elapsed) : 30);
            video.pause();
            video.currentTime = 0;
          }
        });
      };
      video.muted = true;
      video.currentTime = 0;
      video.play().then(() => detectFps()).catch(() => setDetectedFps(30));
    } else {
      setDetectedFps(30);
    }
  };

  const extractFrames = async () => {
    if (!videoUrl || !videoFile) return;
    setIsExtracting(true);
    setExtractionError(null);
    setExtractionProgress(0);
    setExtractedFrames([]);

    try {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'auto';

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('동영상을 로드할 수 없습니다.'));
      });

      const duration = video.duration;
      if (!isFinite(duration) || duration <= 0) throw new Error('동영상 길이를 읽을 수 없습니다.');

      const timestamps = [];
      const effectiveInterval = useAllFrames && detectedFps > 0 ? 1 / detectedFps : frameInterval;
      for (let t = 0; t < duration; t += effectiveInterval) timestamps.push(t);

      const lastFrameTime = duration - 0.05;
      if (lastFrameTime > 0) {
        const lastTs = timestamps[timestamps.length - 1];
        if (lastTs === undefined || (lastFrameTime - lastTs) > (effectiveInterval * 0.5)) timestamps.push(lastFrameTime);
      }

      if (timestamps.length > 500) {
        const confirmed = window.confirm(`총 ${timestamps.length}개의 프레임이 추출됩니다. 메모리 사용량이 많을 수 있습니다. 계속하시겠습니까?`);
        if (!confirmed) { setIsExtracting(false); return; }
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth * 2;
      canvas.height = video.videoHeight * 2;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const frames = [];
      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i];
        await new Promise((resolve) => {
          const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(); };
          video.addEventListener('seeked', onSeeked);
          video.currentTime = timestamp;
        });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        const baseName = videoFile.name.replace(/\.[^.]+$/, '');
        frames.push({
          id: i + 1,
          timestamp,
          dataUrl,
          filename: `${baseName}_frame_${String(i + 1).padStart(4, '0')}_${formatTime(timestamp).replace(':', 'm')}s.png`,
        });
        setExtractionProgress(Math.round(((i + 1) / timestamps.length) * 100));
      }
      setExtractedFrames(frames);
    } catch (err) {
      setExtractionError(err.message || '프레임 추출 중 오류가 발생했습니다.');
    } finally {
      setIsExtracting(false);
    }
  };

  const resetAll = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoFile(null);
    setVideoUrl(null);
    setExtractedFrames([]);
    setExtractionError(null);
    setExtractionProgress(0);
    setVideoDuration(0);
    setVideoMetadata(null);
    setDetectedFps(0);
    setUseAllFrames(false);
  };

  const captureCurrentFrame = () => {
    const video = videoRef.current;
    if (!video || !videoFile || !videoMetadata) return;
    video.pause();
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth * 2;
    canvas.height = video.videoHeight * 2;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    const timestamp = video.currentTime;
    const baseName = videoFile.name.replace(/\.[^.]+$/, '');
    const nextId = extractedFrames.length > 0 ? Math.max(...extractedFrames.map(f => f.id)) + 1 : 1;
    setExtractedFrames(prev => [...prev, {
      id: nextId, timestamp, dataUrl,
      filename: `${baseName}_frame_${String(nextId).padStart(4, '0')}_${formatTime(timestamp).replace(':', 'm')}s.png`,
    }]);
  };

  const captureEndFrame = async () => {
    const video = videoRef.current;
    if (!video || !videoFile || !videoMetadata) return;
    video.pause();
    const seekTo = (time) => new Promise((resolve) => {
      const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(); };
      video.addEventListener('seeked', onSeeked);
      video.currentTime = time;
    });
    await seekTo(99999);
    if (video.currentTime < video.duration - 0.01) {
      const fps = detectedFps || 30;
      await seekTo(video.duration - (1 / fps));
      await seekTo(99999);
    }
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 100)));
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth * 2;
    canvas.height = video.videoHeight * 2;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    const actualTime = video.currentTime;
    const baseName = videoFile.name.replace(/\.[^.]+$/, '');
    const nextId = extractedFrames.length > 0 ? Math.max(...extractedFrames.map(f => f.id)) + 1 : 1;
    setExtractedFrames(prev => [...prev, {
      id: nextId, timestamp: actualTime, dataUrl,
      filename: `${baseName}_endframe_${String(nextId).padStart(4, '0')}.png`,
    }]);
  };

  const effectiveInterval = useAllFrames && detectedFps > 0 ? 1 / detectedFps : frameInterval;
  const estimatedFrameCount = videoDuration > 0
    ? (() => {
        let count = Math.floor(videoDuration / effectiveInterval);
        const lastTs = count > 0 ? (count - 1) * effectiveInterval : 0;
        const lastFrameTime = videoDuration - 0.05;
        if (lastFrameTime > 0 && (count === 0 || (lastFrameTime - lastTs) > (effectiveInterval * 0.5))) count += 1;
        if (count === 0) count = 1;
        return count;
      })()
    : 0;

  // Upload state
  if (!videoFile) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className={`w-full max-w-lg p-10 rounded-2xl text-center cursor-pointer bg-zinc-900/50 border-2 border-dashed transition-colors ${isDragOver ? 'border-amber-400 bg-amber-500/5' : 'border-white/[0.1] hover:border-white/[0.2]'}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('frame-video-input')?.click()}
        >
          <input id="frame-video-input" type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
          <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center bg-white/[0.04] border border-white/[0.06]">
            <Film className="w-10 h-10" style={{ color: accentColor }} />
          </div>
          <p className="text-lg font-bold text-zinc-300 mb-2">동영상을 드래그하거나 클릭하여 업로드</p>
          <p className="text-sm text-zinc-500">MP4, WebM, MOV 등 지원</p>
        </div>
      </div>
    );
  }

  // Video loaded state
  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0 p-3 md:p-4 gap-3">
      {/* LEFT: Video + Settings */}
      <div className="w-full md:w-1/2 shrink-0 flex flex-col gap-3 md:overflow-y-auto">
        <div className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-3">
          <div className="relative" onDragStart={(e) => e.preventDefault()}>
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              draggable={false}
              className="w-full max-h-[50vh] rounded-lg border border-white/[0.1] select-none object-contain bg-black/30"
              style={{ WebkitUserDrag: 'none' }}
              onLoadedMetadata={handleVideoLoaded}
            />
          </div>
          {videoMetadata && (
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="text-[10px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-300">{videoMetadata.width}x{videoMetadata.height}</span>
              <span className="text-[10px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">{formatTime(videoDuration)}</span>
              {detectedFps > 0 && (
                <span className="text-[10px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/30 text-red-300">{detectedFps}fps</span>
              )}
              <span className="text-[10px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300">출력: {videoMetadata.width * 2}x{videoMetadata.height * 2}</span>
            </div>
          )}

          {/* Extraction settings */}
          <div className="mt-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-zinc-400 whitespace-nowrap">추출 간격</label>
              <input
                type="range" min={1} max={60} value={frameInterval}
                onChange={(e) => { setFrameInterval(Number(e.target.value)); setUseAllFrames(false); }}
                className="flex-1 accent-amber-500"
                disabled={useAllFrames}
              />
              <span className="text-xs font-bold text-zinc-300 w-8 text-right">{frameInterval}초</span>
            </div>
            {detectedFps > 0 && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={useAllFrames} onChange={(e) => setUseAllFrames(e.target.checked)} className="accent-amber-500" />
                <span className="text-xs font-bold text-zinc-400">전체 프레임 추출 ({detectedFps}fps)</span>
              </label>
            )}
            {estimatedFrameCount > 0 && (
              <p className="text-[11px] text-zinc-500">예상 프레임 수: <strong className="text-zinc-300">{estimatedFrameCount}개</strong></p>
            )}
            <button
              onClick={extractFrames}
              disabled={isExtracting || videoDuration <= 0}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-30"
              style={{ background: accentColor, color: '#18181b' }}
            >
              <Film className="w-4 h-4" />
              {isExtracting ? `추출 중... ${extractionProgress}%` : '프레임 추출 시작'}
            </button>
          </div>

          <div className="flex gap-1.5 mt-2">
            <button
              onClick={captureCurrentFrame}
              disabled={isExtracting || videoDuration <= 0}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-30"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              현재 프레임
            </button>
            <button
              onClick={captureEndFrame}
              disabled={isExtracting || videoDuration <= 0}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-30"
            >
              <Film className="w-3.5 h-3.5" />
              엔드프레임
            </button>
            <button
              onClick={resetAll}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Progress */}
        {isExtracting && (
          <div className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-zinc-400">진행률</span>
              <span className="text-xs font-bold" style={{ color: accentColor }}>{extractionProgress}%</span>
            </div>
            <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full transition-all duration-200 ease-out rounded-full" style={{ width: `${extractionProgress}%`, background: accentColor }} />
            </div>
          </div>
        )}

        {extractionError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-2.5 flex items-start gap-1.5 text-xs">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <span className="text-zinc-300">{extractionError}</span>
          </div>
        )}
      </div>

      {/* RIGHT: Results */}
      <div className="w-full md:w-1/2 flex flex-col min-h-0 min-w-0">
        {extractedFrames.length > 0 ? (
          <>
            <div className="shrink-0 bg-zinc-900/50 border border-white/[0.06] rounded-xl p-2.5 mb-3 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" style={{ color: accentColor }} />
                  <h3 className="text-sm font-black text-zinc-100 uppercase">추출 결과</h3>
                  <span className="text-[10px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded border" style={{ background: `${accentColor}20`, borderColor: `${accentColor}50`, color: accentColor }}>{extractedFrames.length}개 프레임</span>
                </div>
                <button
                  onClick={() => { setExtractedFrames([]); setExtractionProgress(0); setSelectedFrameIds(new Set()); }}
                  className="text-xs font-medium flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300"
                >
                  <RefreshCw className="w-3 h-3" />
                  초기화
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={selectAllFrames}
                  className={`text-xs font-bold flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${
                    selectedFrameIds.size === extractedFrames.length
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-white/[0.04] text-zinc-400 border-white/[0.06] hover:border-white/[0.15]'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${selectedFrameIds.size === extractedFrames.length ? 'bg-emerald-500/30 border-emerald-500' : 'bg-zinc-800 border-zinc-600'}`}>
                    {selectedFrameIds.size === extractedFrames.length && <Check className="w-2.5 h-2.5 text-emerald-300" />}
                  </div>
                  전체 선택
                </button>
                {selectedFrameIds.size > 0 ? (
                  <button onClick={downloadSelectedFrames} className="text-xs font-medium flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white">
                    <Download className="w-3 h-3" />
                    선택 다운로드 ({selectedFrameIds.size})
                  </button>
                ) : (
                  <button onClick={downloadAllFrames} className="text-xs font-medium flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white">
                    <Download className="w-3 h-3" />
                    전체 다운로드
                  </button>
                )}
              </div>
            </div>

            {/* Frame Grid */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {extractedFrames.map((frame) => {
                  const isSelected = selectedFrameIds.has(frame.id);
                  return (
                    <div
                      key={frame.id}
                      className={`bg-zinc-900/50 border rounded-xl overflow-hidden group cursor-pointer transition-all ${
                        isSelected ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-white/[0.06] hover:border-white/[0.15]'
                      }`}
                      onClick={() => toggleSelectFrame(frame.id)}
                    >
                      <div className="relative">
                        <img src={frame.dataUrl} alt={`Frame ${frame.id}`} className="w-full aspect-video object-cover" />
                        <div className={`absolute top-1.5 left-1.5 w-5 h-5 rounded border flex items-center justify-center transition-all ${
                          isSelected ? 'bg-emerald-500/30 border-emerald-500' : 'bg-black/50 border-zinc-500'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-300" />}
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          <button
                            onClick={(e) => { e.stopPropagation(); setPreviewFrame(frame); }}
                            className="p-1.5 rounded-lg bg-amber-500 text-zinc-900 hover:bg-amber-400"
                            title="미리보기"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); downloadFrame(frame); }}
                            className="p-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-400"
                            title="다운로드"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="px-2 py-1 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-500">#{frame.id}</span>
                        <span className="text-[10px] font-mono text-zinc-500">{formatTimePrecise(frame.timestamp)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Preview Modal */}
            {previewFrame && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPreviewFrame(null)}>
                <div className="bg-zinc-900 border border-white/[0.08] rounded-2xl max-w-[95vw] max-h-[95vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" style={{ color: accentColor }} />
                      <span className="text-sm font-black text-zinc-100">#{previewFrame.id}</span>
                      <span className="text-xs font-mono text-zinc-500">{formatTimePrecise(previewFrame.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => downloadFrame(previewFrame)} className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white">
                        <Download className="w-3.5 h-3.5" />
                        다운로드
                      </button>
                      <button onClick={() => setPreviewFrame(null)} className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden p-3 bg-black/20 flex items-center justify-center">
                    <img src={previewFrame.dataUrl} alt={`Frame ${previewFrame.id}`} className="max-w-full max-h-[calc(95vh-60px)] object-contain rounded-lg border border-white/[0.1]" />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-white/[0.04] border border-white/[0.06]">
                <ImageIcon className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-sm font-bold text-zinc-500">추출된 프레임이 여기에 표시됩니다</p>
              <p className="text-xs text-zinc-600 mt-1">간격 추출 또는 현재 프레임 캡처를 사용하세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
