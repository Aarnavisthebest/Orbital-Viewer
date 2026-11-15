import React, { useState } from 'react';
import { Compass, Eye, Orbit, Radio } from 'lucide-react';
import type { SpaceObject } from '../data/spaceObjects';

interface MissionDossierProps {
  mission: SpaceObject;
  onFocusIn3D: (obj: SpaceObject) => void;
  onOpenNasaEyes: (obj: SpaceObject) => void;
}

type DossierTab = 'overview' | 'instruments' | 'orbit' | 'timeline';

export const MissionDossier: React.FC<MissionDossierProps> = ({
  mission,
  onFocusIn3D,
  onOpenNasaEyes,
}) => {
  const [activeTab, setActiveTab] = useState<DossierTab>('overview');
  const [imgFailed, setImgFailed] = useState(false);

  React.useEffect(() => {
    setImgFailed(false);
  }, [mission.id]);

  return (
    <section id="mission-dossier" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <p className="text-xs font-mono text-cyan-400 tracking-wide">
            Mission Education Dossier
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-100 mt-1">
            {mission.name}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {mission.agency} <span aria-hidden="true">·</span> {mission.orbitLabel}{' '}
            <span aria-hidden="true">·</span> {mission.status}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onFocusIn3D(mission)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md border border-slate-700 bg-[#0E131D] text-slate-200 hover:border-cyan-400 hover:text-cyan-200 transition-colors whitespace-nowrap"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Locate in 3D Atlas</span>
          </button>
          {mission.nasaEyesHash && (
            <button
              type="button"
              onClick={() => onOpenNasaEyes(mission)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors whitespace-nowrap"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Track Live in NASA Eyes</span>
            </button>
          )}
        </div>
      </div>

      {/* 2-Column Balanced Split: Visual Stage + Key Engineering Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-[#0E131D] border border-slate-800 rounded-lg overflow-hidden min-h-[280px] relative">
          {mission.featuredImage && !imgFailed ? (
            <img
              src={mission.featuredImage}
              alt={mission.name}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover min-h-[280px] max-h-[380px]"
            />
          ) : (
            <div className="w-full h-full min-h-[280px] flex flex-col justify-between p-6 bg-gradient-to-br from-[#0B1220] via-[#0E131D] to-[#07090E]">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Orbital Schematic</span>
                <span>{mission.regime}</span>
              </div>

              {/* Clean Technical Orbital SVG Diagram Fallback */}
              <div className="my-4 flex items-center justify-center">
                <svg
                  viewBox="0 0 360 150"
                  className="w-full max-w-md h-36"
                  aria-label={`${mission.name} orbital geometry diagram`}
                >
                  <ellipse
                    cx="180"
                    cy="75"
                    rx="148"
                    ry="48"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <ellipse
                    cx="180"
                    cy="75"
                    rx="96"
                    ry="32"
                    fill="none"
                    stroke={mission.orbitConfig.color}
                    strokeWidth="1.75"
                    strokeOpacity="0.65"
                  />
                  <circle cx="145" cy="75" r="16" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.5" />
                  <circle cx="145" cy="75" r="5" fill="#38BDF8" />
                  <circle cx="276" cy="75" r="6" fill={mission.orbitConfig.color} />
                  <circle
                    cx="276"
                    cy="75"
                    r="12"
                    fill="none"
                    stroke={mission.orbitConfig.color}
                    strokeOpacity="0.4"
                  />
                </svg>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                <span>{mission.launchVehicle}</span>
                <span className="font-mono text-slate-200">{mission.distanceLabel}</span>
              </div>
            </div>
          )}

          {/* Measured contrast scrim for caption */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 pointer-events-none">
            <p className="text-xs font-mono text-slate-300">
              Launch: {mission.launchDate} · {mission.launchVehicle}
            </p>
          </div>
        </div>

        {/* Right Engineering & Telemetry Specs Panel */}
        <div className="lg:col-span-5 bg-[#0E131D] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400">Distance From Earth</p>
              <p className="text-xl font-mono font-semibold text-slate-100 mt-1">
                {mission.distanceLabel}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Velocity</p>
              <p className="text-xl font-mono font-semibold text-slate-100 mt-1">
                {mission.velocityKmS.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-400">km/s</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Orbital Period</p>
              <p className="text-sm font-mono text-slate-200 mt-1">{mission.orbitalPeriod}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Launch Mass</p>
              <p className="text-sm font-mono text-slate-200 mt-1">{mission.massKg}</p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800 space-y-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Power Architecture</span>
              <span className="text-slate-200 text-right">{mission.powerSource}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Launch Site</span>
              <span className="text-slate-200 text-right">{mission.launchSite}</span>
            </div>
            {mission.keplerianElements && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">One-Way Light Time</span>
                <span className="font-mono text-amber-300 text-right tabular-nums">
                  {mission.keplerianElements.oneWayLightTime}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Regime</span>
              <span className="font-mono text-cyan-300 text-right">{mission.regime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Educational Content Tabs */}
      <div className="bg-[#0E131D] border border-slate-800 rounded-lg">
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-800">
          {(
            [
              { id: 'overview', label: 'Overview & Science' },
              { id: 'instruments', label: `Instruments (${mission.instruments.length})` },
              { id: 'orbit', label: 'Orbital Mechanics' },
              { id: 'timeline', label: 'Mission Timeline' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-slate-100 text-slate-950'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-slate-100">Mission Profile</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{mission.summary}</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-slate-100">Scientific Significance</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{mission.whyItMatters}</p>
              </div>
            </div>
          )}

          {activeTab === 'instruments' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mission.instruments.map((inst) => (
                <div
                  key={inst.name}
                  className="border border-slate-800 bg-[#07090E] rounded-md p-4 space-y-1.5"
                >
                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                    <Radio className="w-3.5 h-3.5 shrink-0" />
                    <span>{inst.role}</span>
                  </div>
                  <h4 className="text-base font-semibold text-slate-100">{inst.name}</h4>
                  <p className="text-sm text-slate-300 leading-relaxed">{inst.detail}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'orbit' && (
            <div className="space-y-5">
              <div className="max-w-3xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
                  <Orbit className="w-4 h-4" />
                  <span>{mission.orbitLabel}</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{mission.orbitExplanation}</p>
              </div>

              {mission.keplerianElements && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 border-t border-slate-800">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Periapsis</span>
                    <span className="text-xs font-mono text-slate-100 tabular-nums mt-0.5 block">
                      {mission.keplerianElements.periapsis}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Apoapsis</span>
                    <span className="text-xs font-mono text-slate-100 tabular-nums mt-0.5 block">
                      {mission.keplerianElements.apoapsis}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Inclination</span>
                    <span className="text-xs font-mono text-slate-100 tabular-nums mt-0.5 block">
                      {mission.keplerianElements.inclination}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Eccentricity</span>
                    <span className="text-xs font-mono text-slate-100 tabular-nums mt-0.5 block">
                      {mission.keplerianElements.eccentricity}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">RF Comms Link</span>
                    <span className="text-xs font-mono text-cyan-300 mt-0.5 block">
                      {mission.keplerianElements.commsBand}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">One-Way Light Time</span>
                    <span className="text-xs font-mono text-amber-300 tabular-nums mt-0.5 block">
                      {mission.keplerianElements.oneWayLightTime}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4 max-w-3xl">
              {mission.milestones.map((item) => (
                <div
                  key={`${item.date}-${item.event}`}
                  className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 pb-3 border-b border-slate-800/70 last:border-b-0 last:pb-0"
                >
                  <span className="text-xs font-mono text-cyan-400 w-32 shrink-0">
                    {item.date}
                  </span>
                  <p className="text-sm text-slate-200">{item.event}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
