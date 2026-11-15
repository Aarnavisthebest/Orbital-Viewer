import React, { useEffect, useRef, useState } from 'react';
import { FastForward, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import {
  LAUNCH_ARCHIVE,
  type LaunchProgram,
  type LaunchRecord,
} from '../data/launchArchive';

interface LaunchArchivePanelProps {
  selectedLaunch: LaunchRecord;
  onSelectLaunch: (record: LaunchRecord) => void;
  onAskAiAboutLaunch: (record: LaunchRecord) => void;
}

const PROGRAMS: Array<'All' | LaunchProgram> = [
  'All',
  'Apollo & Saturn',
  'Artemis Program',
  'Shuttle & Probes',
  'Future Missions',
];

export const LaunchArchivePanel: React.FC<LaunchArchivePanelProps> = ({
  selectedLaunch,
  onSelectLaunch,
  onAskAiAboutLaunch,
}) => {
  const [programFilter, setProgramFilter] = useState<'All' | LaunchProgram>('All');
  const [progress, setProgress] = useState<number>(0.35);
  const [playing, setPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const filteredLaunches = LAUNCH_ARCHIVE.filter(
    (l) => programFilter === 'All' || l.program === programFilter,
  );

  useEffect(() => {
    setProgress(0);
    setPlaying(true);
  }, [selectedLaunch.id]);

  // Smooth flight profile animation loop
  useEffect(() => {
    if (!playing) return;
    let rafId = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      setProgress((prev) => {
        const next = prev + dt * 0.08 * simSpeed;
        return next >= 1 ? 0 : next;
      });
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [playing, simSpeed]);

  // Draw richly detailed atmospheric + Earth-limb ascent trajectory simulation canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // 1. Multi-layer atmospheric -> orbital space gradient backdrop
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#04060B');
    skyGrad.addColorStop(0.55, '#070E1C');
    skyGrad.addColorStop(0.84, '#0C213D');
    skyGrad.addColorStop(1, '#123359');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Upper-atmosphere pinpoint starfield
    for (let i = 0; i < 48; i++) {
      const sx = ((i * 137 + 29) % (w - 20)) + 10;
      const sy = ((i * 53 + 11) % Math.floor(h * 0.62)) + 8;
      const alpha = 0.25 + ((i % 5) * 0.14);
      ctx.fillStyle = `rgba(226, 232, 240, ${alpha.toFixed(2)})`;
      ctx.fillRect(sx, sy, i % 4 === 0 ? 2 : 1.2, i % 4 === 0 ? 2 : 1.2);
    }

    // Precision grid & Kármán line reference
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
    ctx.lineWidth = 1;
    for (let x = 56; x < w; x += 72) {
      ctx.beginPath();
      ctx.moveTo(x, 14);
      ctx.lineTo(x, h - 24);
      ctx.stroke();
    }

    const karmanY = Math.round(h * 0.44);
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(16, karmanY);
    ctx.lineTo(w - 16, karmanY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(125, 211, 252, 0.68)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('KÁRMÁN LINE · 100 KM', 16, karmanY - 6);
    ctx.restore();

    // 2. Curved Earth surface & luminous blue atmospheric limb
    const earthCenterX = w * 0.46;
    const earthRadius = 1120;
    const earthCenterY = h + earthRadius - 28;

    ctx.save();
    ctx.beginPath();
    ctx.arc(earthCenterX, earthCenterY, earthRadius + 10, Math.PI * 1.25, Math.PI * 1.75);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.38)';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(earthCenterX, earthCenterY, earthRadius, 0, Math.PI * 2);
    const surfGrad = ctx.createLinearGradient(0, h - 38, 0, h);
    surfGrad.addColorStop(0, '#0F3D66');
    surfGrad.addColorStop(1, '#071B30');
    ctx.fillStyle = surfGrad;
    ctx.fill();
    ctx.restore();

    // Launch pad gantry tower silhouette at startX
    const startX = 52;
    const endX = w - 48;
    const baseY = h - 34;
    const apexY = 38;

    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX - 10, baseY + 6);
    ctx.lineTo(startX - 10, baseY - 22);
    ctx.lineTo(startX - 2, baseY - 22);
    ctx.stroke();

    const getPoint = (t: number) => {
      const clampedT = Math.max(0, Math.min(1, t));
      const x = startX + (endX - startX) * clampedT;
      const arc = 1 - Math.pow(1 - clampedT, 2.05);
      const y = baseY - (baseY - apexY) * arc;
      return { x, y };
    };

    // Dashed planned trajectory arc
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.55)';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const p = getPoint(i / 60);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    const isCancelledOrLoss =
      selectedLaunch.outcome === 'Cancelled Hardware' ||
      selectedLaunch.outcome === 'Loss of Vehicle';
    const isWarning = selectedLaunch.outcome === 'Partial Failure / Safe Return';
    const trackColor = isCancelledOrLoss
      ? '#F43F5E'
      : isWarning
        ? '#F59E0B'
        : '#22D3EE';

    // Glowing traversed trajectory ribbon
    ctx.save();
    ctx.shadowColor = trackColor;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = trackColor;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    const steps = Math.max(1, Math.floor(progress * 60));
    for (let i = 0; i <= steps; i++) {
      const p = getPoint(i / 60);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();

    // Stage separation milestones along arc
    const stageCount = selectedLaunch.stages.length;
    selectedLaunch.stages.forEach((st, idx) => {
      const t = stageCount > 1 ? idx / (stageCount - 1) : 0;
      const pt = getPoint(t);
      const reached = progress >= t;

      if (reached) {
        ctx.strokeStyle = trackColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 7.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = reached ? trackColor : '#334155';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = reached ? '#F1F5F9' : '#94A3B8';
      ctx.font = '10px "JetBrains Mono", monospace';
      const tx = Math.min(w - 70, Math.max(12, pt.x - 16));
      const ty = idx === 0 ? pt.y - 12 : pt.y + 18;
      ctx.fillText(st.tPlus, tx, ty);
    });

    // Separated Spent Booster dropping gently after T+02 staging (progress > 0.34)
    if (progress > 0.34 && progress < 0.72) {
      const sepT = progress - 0.34;
      const sepOrigin = getPoint(0.32);
      const bx = sepOrigin.x + sepT * 55;
      const by = sepOrigin.y + sepT * sepT * 210;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(sepT * 2.1);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.75)';
      ctx.fillRect(-5, -2, 10, 4);
      ctx.restore();
    }

    // Active pitching launch vehicle silhouette + multi-layer exhaust plume
    const cur = getPoint(progress);
    const ahead = getPoint(Math.min(1, progress + 0.015));
    const angle = Math.atan2(ahead.y - cur.y, ahead.x - cur.x);

    ctx.save();
    ctx.translate(cur.x, cur.y);
    ctx.rotate(angle);

    // Flickering ionized exhaust plume when ascending
    if (progress < 0.96) {
      const flicker = 0.85 + Math.sin(progress * 260) * 0.25;
      const plumeLen = 22 * flicker;

      const plumeGrad = ctx.createLinearGradient(-7, 0, -7 - plumeLen, 0);
      plumeGrad.addColorStop(0, '#FFFFFF');
      plumeGrad.addColorStop(0.28, '#FDE047');
      plumeGrad.addColorStop(0.68, isCancelledOrLoss ? '#FB7185' : '#F97316');
      plumeGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');

      ctx.fillStyle = plumeGrad;
      ctx.beginPath();
      ctx.moveTo(-7, -3.2);
      ctx.lineTo(-7 - plumeLen, 0);
      ctx.lineTo(-7, 3.2);
      ctx.closePath();
      ctx.fill();
    }

    // Booster fins
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.moveTo(-7, -3);
    ctx.lineTo(-10, -6.5);
    ctx.lineTo(-3, -3);
    ctx.lineTo(-3, 3);
    ctx.lineTo(-10, 6.5);
    ctx.lineTo(-7, 3);
    ctx.closePath();
    ctx.fill();

    // Main cylindrical fuselage
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(-7, -2.8, 15, 5.6);

    // Stage intertank band
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-2, -2.8, 2.5, 5.6);

    // Fairing nosecone
    ctx.fillStyle = trackColor;
    ctx.beginPath();
    ctx.moveTo(8, -2.8);
    ctx.lineTo(14.5, 0);
    ctx.lineTo(8, 2.8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }, [progress, selectedLaunch]);

  const stageIdx = Math.min(
    selectedLaunch.stages.length - 1,
    Math.floor(progress * selectedLaunch.stages.length),
  );
  const currentStage = selectedLaunch.stages[stageIdx] || selectedLaunch.stages[0];

  const outcomeTextColor =
    selectedLaunch.outcome === 'Cancelled Hardware' || selectedLaunch.outcome === 'Loss of Vehicle'
      ? 'text-rose-400'
      : selectedLaunch.outcome === 'Partial Failure / Safe Return'
        ? 'text-amber-400'
        : selectedLaunch.outcome === 'Scheduled Future' || selectedLaunch.outcome === 'Concept Study'
          ? 'text-cyan-300'
          : 'text-emerald-400';

  return (
    <section id="launch-archive" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <p className="text-xs font-mono text-cyan-400 tracking-wide">
            Past, Cancelled & Future Flight Archive
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-100 mt-1">
            Launch History, Outcomes & Ascent Simulation
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {PROGRAMS.map((prog) => (
            <button
              key={prog}
              type="button"
              onClick={() => setProgramFilter(prog)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                programFilter === prog
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                  : 'bg-[#0E131D] text-slate-300 border-slate-800 hover:border-slate-600'
              }`}
            >
              {prog}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal Visual Mission Timeline Selector */}
      <div className="flex items-stretch gap-3 overflow-x-auto pb-2">
        {filteredLaunches.map((item) => {
          const isSelected = item.id === selectedLaunch.id;
          const showImg = item.imageUrl && !failedImages[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectLaunch(item)}
              className={`min-w-[230px] max-w-[230px] text-left rounded-lg border overflow-hidden transition-colors shrink-0 flex flex-col ${
                isSelected
                  ? 'border-cyan-400 bg-cyan-500/10'
                  : 'border-slate-800 bg-[#0E131D] hover:border-slate-600'
              }`}
            >
              {showImg && (
                <div className="relative h-20 w-full bg-[#05070C] overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.missionName}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [item.id]: true }))
                    }
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0E131D] via-transparent to-black/25" />
                  <span className="absolute top-2 left-2.5 text-[10px] font-mono text-slate-100 bg-black/65 px-1.5 py-0.5 rounded">
                    {item.year}
                  </span>
                </div>
              )}
              <div className="p-3.5 flex-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  {!showImg && <span>{item.year}</span>}
                  <span>{item.program}</span>
                </div>
                <p className="text-sm font-semibold text-slate-100 mt-1 truncate">
                  {item.missionName}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{item.vehicle}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 2-Column Simulator + Outcome Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Interactive Ascent & Trajectory Simulator */}
        <div className="lg:col-span-6 bg-[#0E131D] border border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-mono text-slate-400">
                {selectedLaunch.dateLabel} <span aria-hidden="true">·</span> {selectedLaunch.launchSite}
              </p>
              <h3 className="text-base font-semibold text-slate-100">
                {selectedLaunch.missionName} — Flight Profile
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onAskAiAboutLaunch(selectedLaunch)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Deep Dive</span>
            </button>
          </div>

          <div className="p-4 space-y-4">
            <canvas
              ref={canvasRef}
              width={640}
              height={265}
              className="w-full h-60 rounded border border-slate-800 bg-[#05070C]"
            />

            {/* Stage Telemetry Readout */}
            <div className="grid grid-cols-3 gap-3 bg-[#07090E] border border-slate-800 rounded p-3">
              <div>
                <span className="text-[11px] text-slate-400 block">Stage Event</span>
                <span className="text-xs font-semibold text-slate-100">
                  {currentStage.phase}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Altitude</span>
                <span className="text-xs font-mono text-cyan-300 tabular-nums">
                  {currentStage.altitudeKm.toLocaleString()} km
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Velocity</span>
                <span className="text-xs font-mono text-amber-300 tabular-nums">
                  {currentStage.velocityKmS.toFixed(2)} km/s
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-300">{currentStage.detail}</p>
          </div>

          {/* Playback Controls */}
          <div className="px-4 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-[#07090E]">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-slate-700 bg-[#0E131D] text-slate-200 hover:border-slate-500 whitespace-nowrap"
              >
                {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{playing ? 'Pause' : 'Simulate'}</span>
              </button>
              {[1, 5, 20].map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => setSimSpeed(sp)}
                  className={`inline-flex items-center gap-0.5 px-2 py-1 text-xs font-mono rounded border whitespace-nowrap ${
                    simSpeed === sp
                      ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                      : 'border-slate-700 bg-[#0E131D] text-slate-300'
                  }`}
                >
                  <FastForward className="w-3 h-3" />
                  <span>{sp}×</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setProgress(0)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-slate-700 bg-[#0E131D] text-slate-300 hover:text-white"
                aria-label="Restart flight profile simulation"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            <input
              type="range"
              aria-label="Flight profile progress"
              min={0}
              max={1}
              step={0.01}
              value={progress}
              onChange={(e) => {
                setPlaying(false);
                setProgress(Number(e.target.value));
              }}
              className="w-36 accent-cyan-400"
            />
          </div>
        </div>

        {/* Right: What Happened & Historical/Future Outcome */}
        <div className="lg:col-span-6 bg-[#0E131D] border border-slate-800 rounded-lg p-6 flex flex-col justify-between space-y-5">
          {selectedLaunch.imageUrl && !failedImages[selectedLaunch.id] && (
            <div className="relative rounded-md overflow-hidden border border-slate-800 aspect-[16/6] bg-[#05070C]">
              <img
                src={selectedLaunch.imageUrl}
                alt={`${selectedLaunch.missionName} vehicle`}
                referrerPolicy="no-referrer"
                onError={() =>
                  setFailedImages((prev) => ({ ...prev, [selectedLaunch.id]: true }))
                }
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-3.5 py-2 flex items-center justify-between text-[11px] font-mono">
                <span className="text-cyan-300">{selectedLaunch.vehicle}</span>
                <span className="text-slate-300">{selectedLaunch.dateLabel}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs text-slate-400 block">Launch Vehicle</span>
                <span className="text-sm font-mono font-medium text-slate-100">
                  {selectedLaunch.vehicle}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Outcome / Status</span>
                <span className={`text-sm font-semibold ${outcomeTextColor}`}>
                  {selectedLaunch.outcome}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Mission Summary
              </h4>
              <p className="text-sm text-slate-200 mt-1.5 leading-relaxed">
                {selectedLaunch.summary}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                What Happened
              </h4>
              <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
                {selectedLaunch.whatHappened}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-mono text-amber-400 uppercase tracking-wider">
                Engineering Legacy & Future Impact
              </h4>
              <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
                {selectedLaunch.legacyImpact}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-400 mb-2">Flight Milestones</p>
            <div className="space-y-1.5">
              {selectedLaunch.stages.map((st) => (
                <div key={st.tPlus} className="flex items-baseline gap-3 text-xs">
                  <span className="font-mono text-cyan-400 w-24 shrink-0">{st.tPlus}</span>
                  <span className="text-slate-200 font-medium shrink-0">{st.phase}</span>
                  <span className="text-slate-400 truncate">{st.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
