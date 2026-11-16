import { useState } from 'react';
import { AiSpaceExplorer } from './components/AiSpaceExplorer';
import { CelestialBodyViewer } from './components/CelestialBodyViewer';
import { LaunchArchivePanel } from './components/LaunchArchivePanel';
import { LiveVideoBay } from './components/LiveVideoBay';
import { MissionCatalog } from './components/MissionCatalog';
import { MissionDossier } from './components/MissionDossier';
import { OrbitalViewport3D, type ExtendedAtlasScale } from './components/OrbitalViewport3D';
import { SpaceFlightTracker } from './components/SpaceFlightTracker';
import { CELESTIAL_BODIES, type CelestialBody } from './data/celestialBodies';
import { LAUNCH_ARCHIVE, type LaunchRecord } from './data/launchArchive';
import { SPACE_OBJECTS, type SpaceObject } from './data/spaceObjects';
import { useLiveIssTelemetry } from './hooks/useLiveIssTelemetry';
import { useLiveSpaceTracker } from './hooks/useLiveSpaceTracker';
import { getCurrentEpochYear } from './utils/ephemeris';

const SPACECRAFT_TO_NORAD: Record<string, number> = {
  iss: 25544,
  tiangong: 48274,
  hubble: 20580,
  'landsat-9': 49260,
  'goes-east': 41866,
  gps: 48859,
  starlink: 44713,
  tess: 43435,
  chandra: 25867,
};

export default function App() {
  const [selectedObject, setSelectedObject] = useState<SpaceObject>(SPACE_OBJECTS[0]);
  const [selectedBody, setSelectedBody] = useState<CelestialBody>(
    CELESTIAL_BODIES.find((b) => b.id === 'mars') || CELESTIAL_BODIES[0],
  );
  const [selectedLaunch, setSelectedLaunch] = useState<LaunchRecord>(
    LAUNCH_ARCHIVE.find((l) => l.id === 'apollo-18') || LAUNCH_ARCHIVE[0],
  );
  const [activeScale, setActiveScale] = useState<ExtendedAtlasScale>('earth-l2');
  const [epochYear, setEpochYear] = useState<number>(() =>
    Number(getCurrentEpochYear().toFixed(3)),
  );
  const [activeChannelId, setActiveChannelId] = useState<string>('iss-hd-earth');
  const [selectedNoradId, setSelectedNoradId] = useState<number>(25544);

  const [aiContext, setAiContext] = useState<{ topic: string; category: string }>({
    topic: SPACE_OBJECTS[0].name,
    category: SPACE_OBJECTS[0].category,
  });
  const [aiTrigger, setAiTrigger] = useState<{
    topic: string;
    category: string;
    question?: string;
    nonce: number;
  } | null>(null);

  const issTelemetry = useLiveIssTelemetry();
  const spaceTracker = useLiveSpaceTracker(selectedNoradId);
  const issLiveTrack = spaceTracker.tracks.find((t) => t.noradId === 25544);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSelectSpacecraft = (obj: SpaceObject) => {
    setSelectedObject(obj);
    setAiContext({ topic: obj.name, category: `${obj.agency} ${obj.category}` });
    if (SPACECRAFT_TO_NORAD[obj.id]) {
      setSelectedNoradId(SPACECRAFT_TO_NORAD[obj.id]);
    }
  };

  const handleSelectCelestialBody = (body: CelestialBody) => {
    setSelectedBody(body);
    setAiContext({ topic: body.name, category: body.type });
  };

  const handleFocusIn3D = (obj: SpaceObject) => {
    handleSelectSpacecraft(obj);
    setActiveScale(obj.orbitConfig.scale);
    scrollToSection('atlas-stage');
  };

  const handleLocateBodyIn3D = (body: CelestialBody) => {
    handleSelectCelestialBody(body);
    setActiveScale(body.atlasScale);
    scrollToSection('atlas-stage');
  };

  const handleInspectBodySurface = (body: CelestialBody) => {
    handleSelectCelestialBody(body);
    scrollToSection('celestial-worlds');
  };

  const handleInspectMission = (obj: SpaceObject) => {
    handleSelectSpacecraft(obj);
    scrollToSection('mission-dossier');
  };

  const handleOpenNasaEyes = (obj: SpaceObject) => {
    handleSelectSpacecraft(obj);
    setActiveChannelId('nasa-eyes-3d');
    scrollToSection('live-feeds');
  };

  const triggerAiBrief = (topic: string, category: string, question?: string) => {
    setAiContext({ topic, category });
    setAiTrigger({ topic, category, question, nonce: Date.now() });
    scrollToSection('ai-explorer');
  };

  const handleWatchLive = () => {
    setActiveChannelId('iss-hd-earth');
    scrollToSection('live-feeds');
  };

  const displayIssAlt = issLiveTrack?.altitudeKm ?? issTelemetry.altitude;
  const displayIssCoords = issLiveTrack
    ? `${issLiveTrack.latitude.toFixed(1)}°, ${issLiveTrack.longitude.toFixed(1)}°`
    : `${issTelemetry.latitude.toFixed(1)}°, ${issTelemetry.longitude.toFixed(1)}°`;

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col">
      {/* 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#07090E]/95 border-b border-slate-800">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#atlas-stage"
            className="font-display text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
          >
            Orbital Atlas
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <a
              href="#atlas-stage"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              3D Universe
            </a>
            <a
              href="#space-flight-tracker"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Flight Tracker
            </a>
            <a
              href="#celestial-worlds"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Worlds & Exoplanets
            </a>
            <a
              href="#launch-archive"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Launches
            </a>
            <a
              href="#live-feeds"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Live Feeds
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={handleWatchLive}
              className="px-4 py-2 text-xs font-semibold rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors whitespace-nowrap shrink-0"
            >
              Watch Live
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-8 space-y-16">
        {/* Section 1: Hero Intro + Interactive 3D Orbital-to-Universe Viewport */}
        <section id="atlas-stage" className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-mono text-cyan-400 tracking-wide">
                Live SGP4 Flight Radar, NASA Planetary Photography & Ephemeris · Epoch{' '}
                {Math.floor(epochYear)}
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-semibold text-slate-100 tracking-tight leading-tight mt-1.5">
                Track Live Spacecraft, Photorealistic Planets & the Observable Universe
              </h1>
            </div>
            <p className="text-sm text-slate-300 max-w-md leading-relaxed">
              Real-time SGP4 satellite positions over Earth, exact J2000 planetary ephemerides,
              NASA surface maps, TRAPPIST-1 & Kepler-452 exoplanets, and the Cosmic Web horizon.
            </p>
          </div>

          <OrbitalViewport3D
            objects={SPACE_OBJECTS}
            celestialBodies={CELESTIAL_BODIES}
            selectedId={selectedObject.id}
            selectedBodyId={selectedBody.id}
            onSelectObject={handleSelectSpacecraft}
            onSelectCelestialBody={handleSelectCelestialBody}
            onInspectBodySurface={handleInspectBodySurface}
            activeScale={activeScale}
            onScaleChange={setActiveScale}
            epochYear={epochYear}
            onEpochYearChange={setEpochYear}
            liveTracks={spaceTracker.tracks}
            selectedGroundTrack={spaceTracker.selectedGroundTrack}
          />

          {/* 4-Column Telemetry & Selection Strip Below Stage */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-[#0E131D] border border-slate-800 rounded-lg p-4">
            <div>
              <p className="text-xs text-slate-400">Live Tracked Transponders</p>
              <p className="text-xl font-mono font-semibold text-slate-100 mt-1 tabular-nums">
                {spaceTracker.tracks.length + spaceTracker.deepSpaceContacts.length}{' '}
                <span className="text-xs font-normal text-slate-400">live objects</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">ISS Live Position & Altitude</p>
              <p className="text-xl font-mono font-semibold text-slate-100 mt-1 tabular-nums">
                {displayIssAlt.toFixed(1)}{' '}
                <span className="text-xs font-normal text-cyan-300">km · {displayIssCoords}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Selected Spacecraft</p>
              <p className="text-base font-semibold text-cyan-300 mt-1.5 truncate">
                {selectedObject.name}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Selected Planet / Star / Asteroid</p>
              <p className="text-base font-semibold text-amber-300 mt-1.5 truncate">
                {selectedBody.name}
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: FlightRadar24-style Live Space Flight Tracker & Ground-Track Radar */}
        <SpaceFlightTracker
          nowDate={spaceTracker.nowDate}
          feedSource={spaceTracker.feedSource}
          tracks={spaceTracker.tracks}
          selectedNoradId={selectedNoradId}
          onSelectNoradId={setSelectedNoradId}
          selectedGroundTrack={spaceTracker.selectedGroundTrack}
          deepSpaceContacts={spaceTracker.deepSpaceContacts}
          subsolar={spaceTracker.subsolar}
          spaceObjects={SPACE_OBJECTS}
          celestialBodies={CELESTIAL_BODIES}
          onFocusSpacecraftIn3D={handleFocusIn3D}
          onInspectMission={handleInspectMission}
          onLocateBodyIn3D={handleLocateBodyIn3D}
          onAskAi={triggerAiBrief}
        />

        {/* Section 3: Interactive 3D Planets (Real NASA Photography), Exoplanets, Star Systems & Universe Viewer */}
        <CelestialBodyViewer
          bodies={CELESTIAL_BODIES}
          selectedBody={selectedBody}
          onSelectBody={handleSelectCelestialBody}
          onLocateIn3DAtlas={handleLocateBodyIn3D}
          onAskAiAboutBody={(body, landmark, systemPlanet) =>
            triggerAiBrief(
              systemPlanet
                ? `${systemPlanet.name} (${body.name})`
                : landmark
                  ? `${body.name} — ${landmark.name}`
                  : body.name,
              `${body.type} (${body.designation})`,
              systemPlanet
                ? `Explain ${systemPlanet.name} orbiting ${body.name}: its orbit at ${systemPlanet.orbitRadiusAu} AU (${systemPlanet.orbitalPeriod}), habitability potential (ESI ${systemPlanet.esiScore.toFixed(2)}, ${systemPlanet.tempKelvin} K), atmosphere prospects, and observatory observations.`
                : landmark
                  ? `Explain ${landmark.name} on ${body.name}: its geology or astrophysics, physical dimensions, scientific significance, and the missions that explored it.`
                  : `Give a live scientific briefing on ${body.name}, its physical structure, habitability or cosmology, and missions that explored it.`,
            )
          }
        />

        {/* Section 4: Past, Cancelled (Apollo 18 / Saturn V) & Future Launch Simulator */}
        <LaunchArchivePanel
          selectedLaunch={selectedLaunch}
          onSelectLaunch={(rec) => {
            setSelectedLaunch(rec);
            setEpochYear(rec.year);
            setAiContext({ topic: rec.missionName, category: rec.program });
          }}
          onAskAiAboutLaunch={(rec) =>
            triggerAiBrief(
              rec.missionName,
              `${rec.program} · ${rec.vehicle}`,
              `Explain the full story and technical outcome of ${rec.missionName} (${rec.vehicle}, ${rec.dateLabel}): what happened during the mission or why it was cancelled/scheduled, and its legacy.`,
            )
          }
        />

        {/* Section 5: Real-Time AI Cosmic Explorer */}
        <AiSpaceExplorer
          contextTopic={aiContext.topic}
          contextCategory={aiContext.category}
          epochYear={epochYear}
          externalPromptTrigger={aiTrigger}
        />

        {/* Section 6: Educational Mission Dossier */}
        <MissionDossier
          mission={selectedObject}
          onFocusIn3D={handleFocusIn3D}
          onOpenNasaEyes={handleOpenNasaEyes}
        />

        {/* Section 7: Live Video & Telemetry Iframes */}
        <LiveVideoBay
          objects={SPACE_OBJECTS}
          selectedObject={selectedObject}
          activeChannelId={activeChannelId}
          onChannelChange={setActiveChannelId}
          issTelemetry={issTelemetry}
        />

        {/* Section 8: Complete Active Space Objects Directory */}
        <MissionCatalog
          objects={SPACE_OBJECTS}
          selectedId={selectedObject.id}
          onInspectMission={handleInspectMission}
          onFocusIn3D={handleFocusIn3D}
        />
      </main>

      <footer className="border-t border-slate-800 mt-16">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>Orbital Atlas — Live Spaceflight Radar, Ephemeris & Observatory</p>
          <div className="flex items-center gap-6">
            <a href="#atlas-stage" className="hover:text-slate-200 transition-colors">
              3D Universe
            </a>
            <a href="#space-flight-tracker" className="hover:text-slate-200 transition-colors">
              Flight Tracker
            </a>
            <a href="#celestial-worlds" className="hover:text-slate-200 transition-colors">
              Worlds & Exoplanets
            </a>
            <a href="#launch-archive" className="hover:text-slate-200 transition-colors">
              Launch Archive
            </a>
            <a href="#live-feeds" className="hover:text-slate-200 transition-colors">
              Live Video
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
