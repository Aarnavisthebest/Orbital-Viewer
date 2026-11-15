import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Compass, Search } from 'lucide-react';
import type { OrbitalRegime, SpaceObject } from '../data/spaceObjects';

interface MissionCatalogProps {
  objects: SpaceObject[];
  selectedId: string;
  onInspectMission: (obj: SpaceObject) => void;
  onFocusIn3D: (obj: SpaceObject) => void;
}

const REGIME_FILTERS: Array<'All' | OrbitalRegime> = [
  'All',
  'L1 / L2',
  'LEO / MEO / GEO',
  'Lunar & Solar',
  'Mars & Asteroids',
  'Outer & Interstellar',
];

function getAnchorBodyStyle(center: SpaceObject['orbitConfig']['center']): {
  fill: string;
  stroke: string;
  label: string;
} {
  if (center === 'sun') return { fill: '#F59E0B', stroke: '#FDE047', label: 'SOL' };
  if (center === 'moon') return { fill: '#94A3B8', stroke: '#E2E8F0', label: 'LUNA' };
  if (center === 'mars') return { fill: '#DC2626', stroke: '#FCA5A5', label: 'MARS' };
  if (center === 'jupiter') return { fill: '#EA580C', stroke: '#FDBA74', label: 'JUPITER' };
  return { fill: '#0284C7', stroke: '#38BDF8', label: 'EARTH' };
}

export const MissionCatalog: React.FC<MissionCatalogProps> = ({
  objects,
  selectedId,
  onInspectMission,
  onFocusIn3D,
}) => {
  const [regimeFilter, setRegimeFilter] = useState<'All' | OrbitalRegime>('All');
  const [query, setQuery] = useState('');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return objects.filter((obj) => {
      if (regimeFilter !== 'All' && obj.regime !== regimeFilter) return false;
      if (!q) return true;
      return (
        obj.name.toLowerCase().includes(q) ||
        obj.agency.toLowerCase().includes(q) ||
        obj.orbitLabel.toLowerCase().includes(q) ||
        obj.category.toLowerCase().includes(q) ||
        obj.summary.toLowerCase().includes(q)
      );
    });
  }, [objects, regimeFilter, query]);

  return (
    <section id="catalog" className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <p className="text-xs font-mono text-cyan-400 tracking-wide">
            Active Spacecraft Directory
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-100 mt-1">
            Objects Currently Operating in Space
          </h2>
        </div>

        {/* Search input */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by mission, agency, or orbit..."
            className="w-full bg-[#0E131D] border border-slate-800 rounded-md pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Regime Filter Controls */}
      <div className="flex flex-wrap items-center gap-1.5">
        {REGIME_FILTERS.map((regime) => {
          const isActive = regimeFilter === regime;
          const count =
            regime === 'All'
              ? objects.length
              : objects.filter((o) => o.regime === regime).length;
          return (
            <button
              key={regime}
              type="button"
              onClick={() => setRegimeFilter(regime)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                  : 'bg-[#0E131D] text-slate-300 border-slate-800 hover:border-slate-600 hover:text-white'
              }`}
            >
              {regime} <span className="font-mono opacity-75 ml-1">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="bg-[#0E131D] border border-slate-800 rounded-lg p-10 text-center">
          <p className="text-base font-medium text-slate-200">
            No active missions match "{query}".
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setRegimeFilter('All');
            }}
            className="mt-4 px-4 py-2 text-xs font-medium rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((obj) => {
            const isSelected = obj.id === selectedId;
            const showPhoto = Boolean(obj.featuredImage && !failedImages[obj.id]);
            const anchor = getAnchorBodyStyle(obj.orbitConfig.center);
            const eccShift = Math.min(34, Math.round(obj.orbitConfig.eccentricity * 55));
            const incRot = Math.max(-24, Math.min(24, obj.orbitConfig.inclinationDeg * 0.35));

            return (
              <article
                key={obj.id}
                className={`flex flex-col justify-between bg-[#0E131D] border rounded-lg overflow-hidden transition-colors ${
                  isSelected
                    ? 'border-cyan-400'
                    : 'border-slate-800 hover:border-slate-600'
                }`}
              >
                <div>
                  {/* Visual Mission Header: Bespoke Photography OR Orbital Vector Schematic */}
                  <div className="relative h-36 w-full bg-[#060911] border-b border-slate-800/80 overflow-hidden">
                    {showPhoto ? (
                      <img
                        src={obj.featuredImage}
                        alt={obj.name}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [obj.id]: true }))
                        }
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg
                        viewBox="0 0 320 128"
                        className="w-full h-full"
                        aria-hidden="true"
                      >
                        <defs>
                          <radialGradient id={`glow-${obj.id}`} cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor={obj.orbitConfig.color} stopOpacity="0.28" />
                            <stop offset="100%" stopColor="#060911" stopOpacity="0" />
                          </radialGradient>
                        </defs>
                        <rect width="320" height="128" fill="#060911" />
                        <circle cx={145 - eccShift * 0.5} cy="64" r="56" fill={`url(#glow-${obj.id})`} />
                        <g transform={`rotate(${incRot.toFixed(1)} 160 64)`}>
                          <ellipse
                            cx="160"
                            cy="64"
                            rx="108"
                            ry="34"
                            fill="none"
                            stroke="#1E293B"
                            strokeWidth="1.2"
                            strokeDasharray="4 4"
                          />
                          <ellipse
                            cx="160"
                            cy="64"
                            rx="74"
                            ry="24"
                            fill="none"
                            stroke={obj.orbitConfig.color}
                            strokeOpacity="0.72"
                            strokeWidth="1.6"
                          />
                          <circle
                            cx="234"
                            cy="64"
                            r="5"
                            fill={obj.orbitConfig.color}
                          />
                          <circle
                            cx="234"
                            cy="64"
                            r="10"
                            fill="none"
                            stroke={obj.orbitConfig.color}
                            strokeOpacity="0.45"
                            strokeWidth="1"
                          />
                        </g>
                        <circle
                          cx={145 - eccShift * 0.5}
                          cy="64"
                          r="13"
                          fill={anchor.fill}
                          stroke={anchor.stroke}
                          strokeWidth="1.5"
                        />
                        <text
                          x={145 - eccShift * 0.5}
                          y="92"
                          textAnchor="middle"
                          fill="#64748B"
                          fontSize="8"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {anchor.label}
                        </text>
                      </svg>
                    )}

                    <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#0E131D] via-[#0E131D]/55 to-transparent pointer-events-none" />
                    <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-200 bg-black/60 px-2 py-0.5 rounded">
                        {obj.regime}
                      </span>
                      <span className="text-cyan-300 bg-black/60 px-2 py-0.5 rounded tabular-nums">
                        {obj.launchDate}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 pb-0">
                    {/* Quiet 1-line unboxed metadata (Zero-Pill Rule) */}
                    <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: obj.orbitConfig.color }}
                      />
                      <span className="truncate">{obj.agency}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{obj.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-300 truncate">{obj.status}</span>
                    </div>

                    <h3 className="text-lg font-semibold text-slate-100 mt-2">
                      {obj.name}
                    </h3>
                    <p className="text-xs font-mono text-cyan-400 mt-0.5">
                      {obj.orbitLabel}
                    </p>
                    <p className="text-sm text-slate-300 mt-3 line-clamp-3 leading-relaxed">
                      {obj.summary}
                    </p>
                  </div>
                </div>

                <div className="p-5 mt-4 pt-4 border-t border-slate-800/80 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Distance</span>
                      <span className="font-mono font-medium text-slate-100 tabular-nums">
                        {obj.distanceLabel}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Orbital Speed</span>
                      <span className="font-mono font-medium text-slate-100 tabular-nums">
                        {obj.velocityKmS.toFixed(2)} km/s
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onInspectMission(obj)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-slate-100 text-slate-950 hover:bg-white transition-colors whitespace-nowrap"
                    >
                      <span>Learn Mission</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onFocusIn3D(obj)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-slate-700 bg-[#07090E] text-slate-200 hover:border-cyan-400 hover:text-cyan-200 transition-colors whitespace-nowrap"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>3D View</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
