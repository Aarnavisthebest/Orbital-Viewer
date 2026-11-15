import React, { useMemo, useState } from 'react';
import { ExternalLink, Maximize2, Minimize2, Radio, Tv } from 'lucide-react';
import { LIVE_STREAMS, type LiveStreamChannel, type SpaceObject } from '../data/spaceObjects';
import type { IssTelemetry } from '../hooks/useLiveIssTelemetry';

interface LiveVideoBayProps {
  objects: SpaceObject[];
  selectedObject: SpaceObject;
  activeChannelId: string;
  onChannelChange: (channelId: string) => void;
  issTelemetry: IssTelemetry;
}

export const LiveVideoBay: React.FC<LiveVideoBayProps> = ({
  objects,
  selectedObject,
  activeChannelId,
  onChannelChange,
  issTelemetry,
}) => {
  const [splitCompare, setSplitCompare] = useState(false);
  const [secondaryId, setSecondaryId] = useState('dsn-now');

  const activeChannel: LiveStreamChannel =
    LIVE_STREAMS.find((c) => c.id === activeChannelId) || LIVE_STREAMS[0];
  const secondaryChannel: LiveStreamChannel =
    LIVE_STREAMS.find((c) => c.id === secondaryId) || LIVE_STREAMS[3];

  const eyesTrackable = useMemo(
    () => objects.filter((o) => Boolean(o.nasaEyesHash)),
    [objects],
  );

  const [eyesTargetHash, setEyesTargetHash] = useState<string>(
    selectedObject.nasaEyesHash || 'sc_roman_space_telescope',
  );

  // Sync NASA Eyes hash whenever user picks a mission that has one
  React.useEffect(() => {
    if (selectedObject.nasaEyesHash) {
      setEyesTargetHash(selectedObject.nasaEyesHash);
    }
  }, [selectedObject]);

  const resolveEmbedUrl = (channel: LiveStreamChannel) => {
    if (channel.id === 'nasa-eyes-3d') {
      return `https://eyes.nasa.gov/apps/solar-system/#/${eyesTargetHash}?embed=true`;
    }
    return channel.embedUrl;
  };

  return (
    <section id="live-feeds" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <p className="text-xs font-mono text-cyan-400 tracking-wide">Live Video & Telemetry Feeds</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-100 mt-1">
            Orbital Cameras & Deep Space Network
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSplitCompare((v) => !v)}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md border border-slate-700 bg-[#0E131D] text-slate-200 hover:border-cyan-500 transition-colors whitespace-nowrap"
          >
            {splitCompare ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{splitCompare ? 'Single Feed View' : 'Dual Feed Split'}</span>
          </button>
          <a
            href={activeChannel.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-slate-700 bg-[#0E131D] text-slate-200 hover:border-slate-500 transition-colors whitespace-nowrap"
          >
            <span>Open Source Feed</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Live Channel Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {LIVE_STREAMS.map((channel) => {
          const isActive = channel.id === activeChannel.id;
          return (
            <button
              key={channel.id}
              type="button"
              onClick={() => onChannelChange(channel.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                  : 'bg-[#0E131D] text-slate-300 border-slate-800 hover:border-slate-600 hover:text-white'
              }`}
            >
              {channel.category === 'Live Video' ? (
                <Tv className="w-3.5 h-3.5" />
              ) : (
                <Radio className="w-3.5 h-3.5" />
              )}
              <span>{channel.title}</span>
            </button>
          );
        })}
      </div>

      {/* NASA Eyes Mission Selector Toolbar when NASA Eyes is active */}
      {(activeChannel.id === 'nasa-eyes-3d' || (splitCompare && secondaryChannel.id === 'nasa-eyes-3d')) && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0E131D] border border-slate-800 rounded-md px-4 py-2.5">
          <span className="text-xs text-slate-300">
            NASA Eyes 3D Target:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {eyesTrackable.slice(0, 10).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setEyesTargetHash(m.nasaEyesHash!)}
                className={`px-2.5 py-1 text-xs rounded border transition-colors whitespace-nowrap ${
                  eyesTargetHash === m.nasaEyesHash
                    ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                    : 'border-slate-700 bg-[#07090E] text-slate-300 hover:border-slate-500'
                }`}
              >
                {m.shortName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Iframe Player Grid */}
      <div className={`grid gap-6 ${splitCompare ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Primary Iframe */}
        <div className="bg-[#0E131D] border border-slate-800 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="text-cyan-400 font-medium">{activeChannel.category}</span>
                <span aria-hidden="true">·</span>
                <span>{activeChannel.source}</span>
              </div>
              <h3 className="text-base font-semibold text-slate-100 truncate mt-0.5">
                {activeChannel.title}
              </h3>
            </div>
          </div>

          <div className="relative w-full aspect-video bg-[#05070C]">
            <iframe
              key={`${activeChannel.id}-${eyesTargetHash}`}
              src={resolveEmbedUrl(activeChannel)}
              title={activeChannel.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>

          <div className="px-4 py-3 border-t border-slate-800 space-y-1">
            <p className="text-sm text-slate-300">{activeChannel.description}</p>
            <p className="text-xs text-slate-400">{activeChannel.notes}</p>
          </div>
        </div>

        {/* Secondary Split Iframe */}
        {splitCompare && (
          <div className="bg-[#0E131D] border border-slate-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="text-amber-400 font-medium">{secondaryChannel.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{secondaryChannel.source}</span>
                </div>
                <h3 className="text-base font-semibold text-slate-100 truncate mt-0.5">
                  {secondaryChannel.title}
                </h3>
              </div>
              <select
                aria-label="Secondary live feed"
                value={secondaryId}
                onChange={(e) => setSecondaryId(e.target.value)}
                className="bg-[#07090E] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus-visible:outline-2 focus-visible:outline-cyan-400"
              >
                {LIVE_STREAMS.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full aspect-video bg-[#05070C]">
              <iframe
                key={`sec-${secondaryChannel.id}-${eyesTargetHash}`}
                src={resolveEmbedUrl(secondaryChannel)}
                title={secondaryChannel.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>

            <div className="px-4 py-3 border-t border-slate-800 space-y-1">
              <p className="text-sm text-slate-300">{secondaryChannel.description}</p>
              <p className="text-xs text-slate-400">{secondaryChannel.notes}</p>
            </div>
          </div>
        )}
      </div>

      {/* Real-Time ISS Orbital Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 bg-[#0E131D] border border-slate-800 rounded-lg p-4">
        <div>
          <p className="text-xs text-slate-400">ISS Live Position</p>
          <p className="text-base font-mono font-semibold text-slate-100 mt-1">
            {issTelemetry.latitude.toFixed(2)}° / {issTelemetry.longitude.toFixed(2)}°
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Orbital Altitude</p>
          <p className="text-base font-mono font-semibold text-slate-100 mt-1">
            {issTelemetry.altitude.toFixed(1)} <span className="text-xs text-slate-400">km</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Ground Velocity</p>
          <p className="text-base font-mono font-semibold text-slate-100 mt-1">
            {Math.round(issTelemetry.velocity).toLocaleString()}{' '}
            <span className="text-xs text-slate-400">km/h</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Illumination</p>
          <p className="text-base font-mono font-semibold text-cyan-300 mt-1 capitalize">
            {issTelemetry.visibility}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Telemetry Source</p>
          <p className="text-xs font-mono text-slate-300 mt-1.5">
            {issTelemetry.source === 'live-api' ? '● Live Ephemeris' : '▲ Keplerian Model'}
          </p>
        </div>
      </div>
    </section>
  );
};
