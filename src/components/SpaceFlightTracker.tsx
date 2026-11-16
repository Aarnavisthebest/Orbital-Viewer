import React, { useMemo, useState } from 'react';
import {
  Compass,
  Crosshair,
  Globe,
  Navigation,
  Radar,
  Radio,
  Search,
  Sparkles,
} from 'lucide-react';
import type { CelestialBody } from '../data/celestialBodies';
import type { SpaceObject } from '../data/spaceObjects';
import type {
  DeepSpaceRadarItem,
  GroundTrackPoint,
  LiveOrbitalTrackItem,
} from '../hooks/useLiveSpaceTracker';

interface SpaceFlightTrackerProps {
  nowDate: Date;
  feedSource: 'celestrak-live' | 'hybrid-fallback';
  tracks: LiveOrbitalTrackItem[];
  selectedNoradId: number;
  onSelectNoradId: (noradId: number) => void;
  selectedGroundTrack: {
    past: GroundTrackPoint[];
    future: GroundTrackPoint[];
  };
  deepSpaceContacts: DeepSpaceRadarItem[];
  subsolar: { latDeg: number; lonDeg: number };
  spaceObjects: SpaceObject[];
  celestialBodies: CelestialBody[];
  onFocusSpacecraftIn3D: (obj: SpaceObject) => void;
  onInspectMission: (obj: SpaceObject) => void;
  onLocateBodyIn3D: (body: CelestialBody) => void;
  onAskAi: (topic: string, category: string, question?: string) => void;
}

const SVG_W = 1000;
const SVG_H = 500;

function lonToX(lonDeg: number): number {
  return ((lonDeg + 180) / 360) * SVG_W;
}

function latToY(latDeg: number): number {
  return ((90 - latDeg) / 180) * SVG_H;
}

/**
 * Splits a ground track array into SVG polyline strings whenever crossing the +/-180° antimeridian
 * so tracks wrap cleanly around the globe without horizontal artifacts.
 */
function buildSplitTrackPaths(points: GroundTrackPoint[]): string[] {
  if (points.length < 2) return [];
  const paths: string[] = [];
  let current: string[] = [];

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const x = lonToX(pt.lon);
    const y = latToY(pt.lat);
    if (i > 0 && Math.abs(pt.lon - points[i - 1].lon) > 180) {
      if (current.length > 1) paths.push(current.join(' '));
      current = [`M ${x.toFixed(1)} ${y.toFixed(1)}`];
    } else {
      current.push(`${current.length === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
  }
  if (current.length > 1) paths.push(current.join(' '));
  return paths;
}

/**
 * Generates an accurate SVG polygon path for the Earth's real-time solar terminator night shadow.
 */
function buildTerminatorPolygon(subsolarLatDeg: number, subsolarLonDeg: number): string {
  const lat = Math.abs(subsolarLatDeg) < 0.25 ? (subsolarLatDeg >= 0 ? 0.25 : -0.25) : subsolarLatDeg;
  const tanLat = Math.tan((lat * Math.PI) / 180);
  const steps = 120;
  const coords: Array<[number, number]> = [];

  for (let i = 0; i <= steps; i++) {
    const lon = -180 + (i / steps) * 360;
    const dLonRad = ((lon - subsolarLonDeg) * Math.PI) / 180;
    const termLatRad = Math.atan(-Math.cos(dLonRad) / tanLat);
    const termLatDeg = (termLatRad * 180) / Math.PI;
    coords.push([lonToX(lon), latToY(termLatDeg)]);
  }

  // Fill dark pole side depending on hemisphere of subsolar declination
  const nightPoleY = lat >= 0 ? SVG_H : 0;
  const start = `M 0 ${nightPoleY}`;
  const curve = coords.map(([x, y]) => `L ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return `${start} ${curve} L ${SVG_W} ${nightPoleY} Z`;
}

export const SpaceFlightTracker: React.FC<SpaceFlightTrackerProps> = ({
  nowDate,
  feedSource,
  tracks,
  selectedNoradId,
  onSelectNoradId,
  selectedGroundTrack,
  deepSpaceContacts,
  subsolar,
  spaceObjects,
  celestialBodies,
  onFocusSpacecraftIn3D,
  onInspectMission,
  onLocateBodyIn3D,
  onAskAi,
}) => {
  const [radarMode, setRadarMode] = useState<'earth-orbit' | 'deep-space'>('earth-orbit');
  const [regimeFilter, setRegimeFilter] = useState<'ALL' | 'LEO' | 'SSO' | 'MEO' | 'GEO' | 'HEO'>('ALL');
  const [query, setQuery] = useState('');

  const selectedTrack = useMemo(
    () => tracks.find((t) => t.noradId === selectedNoradId) ?? tracks[0],
    [tracks, selectedNoradId],
  );

  const filteredTracks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tracks.filter((t) => {
      if (regimeFilter !== 'ALL' && t.regime !== regimeFilter) return false;
      if (!q) return true;
      return (
        t.callsign.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        String(t.noradId).includes(q) ||
        t.agency.toLowerCase().includes(q)
      );
    });
  }, [tracks, regimeFilter, query]);

  const filteredDeepSpace = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return deepSpaceContacts;
    return deepSpaceContacts.filter(
      (c) =>
        c.callsign.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.regime.toLowerCase().includes(q),
    );
  }, [deepSpaceContacts, query]);

  const pastPaths = useMemo(
    () => buildSplitTrackPaths(selectedGroundTrack.past),
    [selectedGroundTrack.past],
  );
  const futurePaths = useMemo(
    () => buildSplitTrackPaths(selectedGroundTrack.future),
    [selectedGroundTrack.future],
  );
  const terminatorPath = useMemo(
    () => buildTerminatorPolygon(subsolar.latDeg, subsolar.lonDeg),
    [subsolar.latDeg, subsolar.lonDeg],
  );

  const linkedSpaceObject = selectedTrack?.spaceObjectId
    ? spaceObjects.find((o) => o.id === selectedTrack.spaceObjectId)
    : undefined;

  const utcTimeStr = nowDate.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  return (
    <section id="space-flight-tracker" className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <p className="text-xs font-mono text-cyan-400 tracking-wide">
            Real-Time Orbital Surveillance · CelesTrak SGP4 & NASA JPL Astronomy Engine
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-100 mt-1">
            Live Space Flight Tracker & Ground-Track Radar
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-md bg-[#0E131D] border border-slate-800 text-xs font-mono text-amber-300 tabular-nums whitespace-nowrap">
            {utcTimeStr}
          </div>

          <div className="flex items-center bg-[#0E131D] border border-slate-800 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setRadarMode('earth-orbit')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                radarMode === 'earth-orbit'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Radar className="w-3.5 h-3.5" />
              <span>Earth Orbit Radar ({tracks.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setRadarMode('deep-space')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                radarMode === 'deep-space'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Deep Space Ephemeris ({deepSpaceContacts.length})</span>
            </button>
          </div>
        </div>
      </div>

      {radarMode === 'earth-orbit' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left: Live Equirectangular World Radar Map */}
          <div className="xl:col-span-8 bg-[#05070C] border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-[#0E131D] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="font-medium text-slate-100">
                  Live SGP4 Ground Track & Solar Terminator
                </span>
                <span className="text-slate-500" aria-hidden="true">·</span>
                <span className="font-mono text-slate-400">
                  {feedSource === 'celestrak-live' ? 'CelesTrak GP Live' : 'Synchronized GP Propagator'}
                </span>
              </div>
              {selectedTrack && (
                <div className="font-mono text-cyan-300 tabular-nums">
                  Locked: {selectedTrack.callsign} · {selectedTrack.latitude.toFixed(2)}°,{' '}
                  {selectedTrack.longitude.toFixed(2)}° · {selectedTrack.altitudeKm.toFixed(1)} km
                </div>
              )}
            </div>

            {/* 2:1 Equirectangular NASA Earth Map + SVG Radar Overlay */}
            <div className="relative w-full aspect-[2/1] bg-[#04060B] overflow-hidden select-none">
              <img
                src="/textures/planets/earth_day.jpg"
                alt="NASA Blue Marble Equirectangular World Map"
                className="w-full h-full object-cover opacity-85"
                draggable={false}
              />

              <svg
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                className="absolute inset-0 w-full h-full"
                preserveAspectRatio="none"
              >
                {/* Live Solar Terminator Night Hemisphere Shadow */}
                <path d={terminatorPath} fill="rgba(4, 7, 15, 0.54)" />

                {/* Subtle 30-deg Latitude / Longitude Graticule */}
                {[-60, -30, 0, 30, 60].map((lat) => (
                  <line
                    key={`lat-${lat}`}
                    x1={0}
                    y1={latToY(lat)}
                    x2={SVG_W}
                    y2={latToY(lat)}
                    stroke={lat === 0 ? 'rgba(56, 189, 248, 0.25)' : 'rgba(148, 163, 184, 0.14)'}
                    strokeWidth={lat === 0 ? 1 : 0.6}
                    strokeDasharray={lat === 0 ? undefined : '4 4'}
                  />
                ))}
                {[-120, -60, 0, 60, 120].map((lon) => (
                  <line
                    key={`lon-${lon}`}
                    x1={lonToX(lon)}
                    y1={0}
                    x2={lonToX(lon)}
                    y2={SVG_H}
                    stroke={lon === 0 ? 'rgba(56, 189, 248, 0.22)' : 'rgba(148, 163, 184, 0.14)'}
                    strokeWidth={0.6}
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Subsolar Noon Point */}
                <g transform={`translate(${lonToX(subsolar.lonDeg)}, ${latToY(subsolar.latDeg)})`}>
                  <circle r={6} fill="none" stroke="#FBBF24" strokeWidth={1.2} opacity={0.85} />
                  <circle r={2.2} fill="#FDE047" />
                </g>

                {/* Past 35-min Orbital Ground Trail */}
                {pastPaths.map((d, idx) => (
                  <path
                    key={`past-${idx}`}
                    d={d}
                    fill="none"
                    stroke={selectedTrack?.color || '#22D3EE'}
                    strokeWidth={1.8}
                    opacity={0.45}
                  />
                ))}

                {/* Future 95-min Predicted Orbital Ground Track */}
                {futurePaths.map((d, idx) => (
                  <path
                    key={`fut-${idx}`}
                    d={d}
                    fill="none"
                    stroke={selectedTrack?.color || '#22D3EE'}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    opacity={0.92}
                  />
                ))}

                {/* Locked Spacecraft Sensor Footprint Horizon */}
                {selectedTrack && (
                  <circle
                    cx={lonToX(selectedTrack.longitude)}
                    cy={latToY(selectedTrack.latitude)}
                    r={Math.min(180, Math.max(18, (selectedTrack.footprintKm / 40075) * SVG_W * 0.5))}
                    fill="rgba(34, 211, 238, 0.08)"
                    stroke={selectedTrack.color}
                    strokeWidth={1.2}
                    strokeDasharray="3 3"
                  />
                )}

                {/* All Active Orbital Craft Callsign & Heading Markers */}
                {tracks.map((trk) => {
                  const x = lonToX(trk.longitude);
                  const y = latToY(trk.latitude);
                  const isSel = trk.noradId === selectedTrack?.noradId;
                  const labelLeft = x > SVG_W - 140;
                  return (
                    <g
                      key={trk.id}
                      transform={`translate(${x.toFixed(1)}, ${y.toFixed(1)})`}
                      className="cursor-pointer"
                      onClick={() => onSelectNoradId(trk.noradId)}
                    >
                      {isSel && (
                        <circle
                          r={14}
                          fill="none"
                          stroke={trk.color}
                          strokeWidth={1.5}
                          opacity={0.95}
                        />
                      )}
                      {/* Directional spacecraft arrow oriented to live orbital heading */}
                      <g transform={`rotate(${trk.headingDeg.toFixed(1)})`}>
                        <polygon
                          points="0,-9 6,7 0,3 -6,7"
                          fill={isSel ? trk.color : '#F8FAFC'}
                          stroke="#05070C"
                          strokeWidth={1.2}
                        />
                      </g>
                      <g transform={`translate(${labelLeft ? -10 : 10}, -6)`}>
                        <rect
                          x={labelLeft ? -96 : 0}
                          y={-9}
                          width={96}
                          height={16}
                          rx={3}
                          fill={isSel ? trk.color : 'rgba(11, 15, 23, 0.88)'}
                          stroke={isSel ? trk.color : 'rgba(71, 85, 105, 0.9)'}
                          strokeWidth={0.8}
                        />
                        <text
                          x={labelLeft ? -48 : 48}
                          y={2.5}
                          textAnchor="middle"
                          fontSize={9.5}
                          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                          fontWeight={isSel ? 700 : 600}
                          fill={isSel ? '#04070E' : '#E2E8F0'}
                        >
                          {trk.callsign}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Selected Spacecraft Live Flight Strip Below Map */}
            {selectedTrack && (
              <div className="p-4 bg-[#0E131D] border-t border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-mono text-cyan-400">
                      {selectedTrack.callsign} · NORAD #{selectedTrack.noradId} ·{' '}
                      {selectedTrack.regime} · {selectedTrack.agency}
                    </p>
                    <h3 className="text-lg font-semibold text-slate-100 mt-0.5">
                      {selectedTrack.name}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {linkedSpaceObject && (
                      <>
                        <button
                          type="button"
                          onClick={() => onFocusSpacecraftIn3D(linkedSpaceObject)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors whitespace-nowrap"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          <span>Track in 3D Viewport</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onInspectMission(linkedSpaceObject)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-slate-700 bg-[#07090E] text-slate-200 hover:border-cyan-400 transition-colors whitespace-nowrap"
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                          <span>Mission Dossier</span>
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        onAskAi(
                          selectedTrack.name,
                          `NORAD ${selectedTrack.noradId} · ${selectedTrack.regime}`,
                          `Give a live flight director status report for ${selectedTrack.name} (NORAD #${selectedTrack.noradId}) currently at ${selectedTrack.latitude.toFixed(2)}°, ${selectedTrack.longitude.toFixed(2)}° at altitude ${selectedTrack.altitudeKm.toFixed(1)} km traveling ${selectedTrack.velocityKmS.toFixed(2)} km/s (${selectedTrack.visibility}).`,
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-slate-700 bg-[#07090E] text-slate-200 hover:border-cyan-400 transition-colors whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>AI Flight Brief</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-800/80">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Sub-Satellite Lat / Lon</span>
                    <span className="text-sm font-mono font-semibold text-slate-100 tabular-nums">
                      {selectedTrack.latitude.toFixed(2)}°, {selectedTrack.longitude.toFixed(2)}°
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Live Altitude</span>
                    <span className="text-sm font-mono font-semibold text-cyan-300 tabular-nums">
                      {selectedTrack.altitudeKm.toFixed(1)} km
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Orbital Velocity</span>
                    <span className="text-sm font-mono font-semibold text-slate-100 tabular-nums">
                      {selectedTrack.velocityKmS.toFixed(2)} km/s
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Ground Heading</span>
                    <span className="text-sm font-mono font-semibold text-slate-100 tabular-nums inline-flex items-center gap-1">
                      <Navigation
                        className="w-3 h-3 text-cyan-400"
                        style={{ transform: `rotate(${selectedTrack.headingDeg}deg)` }}
                      />
                      {Math.round(selectedTrack.headingDeg)}°
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Inclination / Period</span>
                    <span className="text-sm font-mono font-semibold text-slate-100 tabular-nums">
                      {selectedTrack.inclinationDeg.toFixed(1)}° · {Math.round(selectedTrack.periodMin)}m
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Solar Illumination</span>
                    <span
                      className={`text-sm font-mono font-semibold tabular-nums ${
                        selectedTrack.visibility === 'Daylight' ? 'text-amber-300' : 'text-indigo-300'
                      }`}
                    >
                      {selectedTrack.visibility} · {selectedTrack.footprintKm.toLocaleString()} km
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Live Transponder / NORAD Flight Board */}
          <div className="xl:col-span-4 bg-[#0E131D] border border-slate-800 rounded-lg overflow-hidden flex flex-col">
            <div className="p-3.5 border-b border-slate-800 space-y-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter callsign, NORAD ID, agency..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#07090E] border border-slate-700 rounded text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex flex-wrap gap-1">
                {(['ALL', 'LEO', 'SSO', 'MEO', 'GEO', 'HEO'] as const).map((reg) => (
                  <button
                    key={reg}
                    type="button"
                    onClick={() => setRegimeFilter(reg)}
                    className={`px-2.5 py-1 text-[11px] font-mono rounded border transition-colors whitespace-nowrap ${
                      regimeFilter === reg
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-semibold'
                        : 'bg-[#07090E] text-slate-300 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {reg}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-800/80 max-h-[480px] overflow-y-auto">
              {filteredTracks.map((trk) => {
                const active = trk.noradId === selectedTrack?.noradId;
                return (
                  <button
                    key={trk.id}
                    type="button"
                    onClick={() => onSelectNoradId(trk.noradId)}
                    className={`w-full text-left px-4 py-3 transition-colors flex items-start justify-between gap-3 ${
                      active ? 'bg-cyan-500/12 border-l-2 border-l-cyan-400' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: trk.color }}
                        />
                        <span className="text-xs font-mono font-semibold text-slate-100 truncate">
                          {trk.callsign}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          #{trk.noradId}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 truncate mt-0.5">{trk.name}</p>
                      <p className="text-[11px] font-mono text-slate-400 tabular-nums mt-1">
                        {trk.latitude.toFixed(1)}°, {trk.longitude.toFixed(1)}° ·{' '}
                        {trk.visibility}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-semibold text-cyan-300 tabular-nums block">
                        {trk.altitudeKm >= 1000
                          ? `${Math.round(trk.altitudeKm).toLocaleString()} km`
                          : `${trk.altitudeKm.toFixed(1)} km`}
                      </span>
                      <span className="text-[11px] font-mono text-slate-300 tabular-nums block mt-0.5">
                        {trk.velocityKmS.toFixed(2)} km/s
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                        {trk.regime} · {Math.round(trk.headingDeg)}°
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Deep Space Ephemeris Board (Roman, JWST, SOHO, Moon, Mars, Jupiter, Voyager 1) */
        <div className="bg-[#0E131D] border border-slate-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-300">
              Live second-by-second geocentric & heliocentric ephemeris computed for{' '}
              <span className="font-mono text-amber-300">{utcTimeStr}</span>
            </p>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search deep-space target..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#07090E] border border-slate-700 rounded text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#07090E] border-b border-slate-800 text-slate-400 font-mono">
                  <th className="py-2.5 px-4 font-medium">Callsign / Target</th>
                  <th className="py-2.5 px-4 font-medium">Regime</th>
                  <th className="py-2.5 px-4 font-medium">Earth Range</th>
                  <th className="py-2.5 px-4 font-medium">1-Way Light Time</th>
                  <th className="py-2.5 px-4 font-medium">RA / Dec (J2000)</th>
                  <th className="py-2.5 px-4 font-medium">Speed / Phase</th>
                  <th className="py-2.5 px-4 font-medium text-right">Locate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredDeepSpace.map((item) => {
                  const sc = item.spaceObjectId
                    ? spaceObjects.find((o) => o.id === item.spaceObjectId)
                    : undefined;
                  const body = item.celestialBodyId
                    ? celestialBodies.find((b) => b.id === item.celestialBodyId)
                    : undefined;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/35 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <div>
                            <span className="font-mono font-semibold text-slate-100 block">
                              {item.callsign}
                            </span>
                            <span className="text-slate-300">{item.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{item.regime}</td>
                      <td className="py-3 px-4 font-mono text-cyan-300 tabular-nums">
                        {item.distanceLabel}
                      </td>
                      <td className="py-3 px-4 font-mono text-amber-300 tabular-nums">
                        {item.lightTimeOneWay}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-200 tabular-nums">
                        {item.raFormatted} <span className="text-slate-500">·</span>{' '}
                        {item.decFormatted}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300 tabular-nums">
                        {item.velocityKmS.toFixed(2)} km/s · {item.phaseOrElong}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {sc && (
                            <button
                              type="button"
                              onClick={() => onFocusSpacecraftIn3D(sc)}
                              className="px-2.5 py-1 rounded bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-semibold text-[11px] whitespace-nowrap"
                            >
                              3D Craft
                            </button>
                          )}
                          {body && (
                            <button
                              type="button"
                              onClick={() => onLocateBodyIn3D(body)}
                              className="px-2.5 py-1 rounded border border-slate-700 bg-[#07090E] text-slate-200 hover:border-cyan-400 font-medium text-[11px] whitespace-nowrap"
                            >
                              3D Planet
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
