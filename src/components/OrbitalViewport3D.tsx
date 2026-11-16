import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  ChevronDown,
  ChevronUp,
  Compass,
  FastForward,
  Pause,
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { CelestialBody } from '../data/celestialBodies';
import type { AtlasScale, SpaceObject } from '../data/spaceObjects';
import type { GroundTrackPoint, LiveOrbitalTrackItem } from '../hooks/useLiveSpaceTracker';
import {
  PLANET_AXIAL_TILT_DEG,
  createAsteroidOrCometModel,
  createAtmosphereHaloMesh,
  createDeepSpaceDome,
  createNebulaGlowTexture,
  createSaturnRingGeometry,
  createSpacecraftModel,
  createStellarSurfaceMaterial,
  getRealEarthTextureBundle,
  getRealPlanetTextureBundle,
  getRealSaturnRingsTexture,
  getRealSunTexture,
  solveKeplerPosition,
} from '../three/proceduralAssets';
import {
  epochYearToDate,
  geodeticToSceneVec3,
  getCurrentEpochYear,
  getHeliocentricScenePosition,
  getMoonRelativeScenePos,
  getSubsolarLatLon,
  sampleRealOrbitalLoop,
} from '../utils/ephemeris';

export type ExtendedAtlasScale = AtlasScale | 'galaxy' | 'universe';

interface OrbitalViewport3DProps {
  objects: SpaceObject[];
  celestialBodies: CelestialBody[];
  selectedId: string;
  selectedBodyId: string;
  onSelectObject: (obj: SpaceObject) => void;
  onSelectCelestialBody: (body: CelestialBody) => void;
  onInspectBodySurface: (body: CelestialBody) => void;
  activeScale: ExtendedAtlasScale;
  onScaleChange: (scale: ExtendedAtlasScale) => void;
  epochYear: number;
  onEpochYearChange: (year: number) => void;
  liveTracks?: LiveOrbitalTrackItem[];
  selectedGroundTrack?: {
    past: GroundTrackPoint[];
    future: GroundTrackPoint[];
  };
}

const _vec3 = new THREE.Vector3();
const _targetVec3 = new THREE.Vector3();
const _camGoal = new THREE.Vector3();
const _projVec = new THREE.Vector3();
const _dummyObj = new THREE.Object3D();
const _color = new THREE.Color();

const SCALE_ORDER: ExtendedAtlasScale[] = [
  'earth-l2',
  'inner-solar',
  'outer-solar',
  'galaxy',
  'universe',
];

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const EPOCH_PRESETS = [
  { year: 1969.55, label: '1969 Apollo 11' },
  { year: 1977.68, label: '1977 Voyager' },
  { year: 1990.31, label: '1990 Hubble' },
  { year: 2021.98, label: '2021 JWST' },
  { year: 2026.87, label: '2026 Present' },
  { year: 2028.5, label: '2028 Dragonfly' },
  { year: 2040.0, label: '2040 Future' },
];

function parseLaunchYear(launchDate: string): number {
  const m = launchDate.match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : 2020;
}

function formatEpochDate(epoch: number): string {
  const yr = Math.floor(epoch);
  const frac = Math.max(0, Math.min(0.999, epoch - yr));
  const monthIdx = Math.floor(frac * 12);
  return `${yr} · ${MONTH_NAMES[monthIdx]}`;
}

function getEpochEraLabel(epoch: number): string {
  const yr = Math.floor(epoch);
  if (yr < 1977) return 'Apollo Lunar & Skylab Transition';
  if (yr < 1990) return 'Voyager Outer Planet Grand Tour';
  if (yr < 2011) return 'Hubble Discovery & ISS Assembly';
  if (yr < 2026) return 'JWST Infrared & Mars Rover Era';
  if (yr < 2028) return 'Roman L2 Commissioning & Artemis Return';
  return 'Dragonfly Titan, Mars Sample & Deep Future';
}

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const OrbitalViewport3D: React.FC<OrbitalViewport3DProps> = ({
  objects,
  celestialBodies,
  selectedId,
  selectedBodyId,
  onSelectObject,
  onSelectCelestialBody,
  onInspectBodySurface,
  activeScale,
  onScaleChange,
  epochYear,
  onEpochYearChange,
  liveTracks = [],
  selectedGroundTrack,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const bodyLabelRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [timeScale, setTimeScale] = useState<number>(1);
  const [liveUtcSync, setLiveUtcSync] = useState<boolean>(true);
  const [epochFilterOnly, setEpochFilterOnly] = useState<boolean>(false);
  const [webglError, setWebglError] = useState<string | null>(null);

  const activeScaleRef = useRef<ExtendedAtlasScale>(activeScale);
  const selectedIdRef = useRef<string>(selectedId);
  const selectedBodyIdRef = useRef<string>(selectedBodyId);
  const timeScaleRef = useRef<number>(timeScale);
  const liveUtcSyncRef = useRef<boolean>(liveUtcSync);
  const epochYearRef = useRef<number>(epochYear);
  const epochFilterOnlyRef = useRef<boolean>(epochFilterOnly);
  const liveTracksRef = useRef<LiveOrbitalTrackItem[]>(liveTracks);
  const groundTrackRef = useRef(selectedGroundTrack);
  const onSelectRef = useRef(onSelectObject);
  const onSelectBodyRef = useRef(onSelectCelestialBody);
  const onEpochChangeRef = useRef(onEpochYearChange);
  const flyToIdRef = useRef<string | null>(null);
  const flyToBodyIdRef = useRef<string | null>(null);
  const resetViewRequestedRef = useRef<boolean>(false);

  useEffect(() => {
    activeScaleRef.current = activeScale;
    resetViewRequestedRef.current = true;
    flyToIdRef.current = null;
    flyToBodyIdRef.current = null;
  }, [activeScale]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
    const obj = objects.find((o) => o.id === selectedId);
    if (obj && obj.orbitConfig.scale === activeScaleRef.current) {
      flyToIdRef.current = obj.id;
      flyToBodyIdRef.current = null;
    }
  }, [selectedId, objects]);

  useEffect(() => {
    selectedBodyIdRef.current = selectedBodyId;
    const body = celestialBodies.find((b) => b.id === selectedBodyId);
    if (body && body.atlasScale === activeScaleRef.current) {
      flyToBodyIdRef.current = body.id;
      flyToIdRef.current = null;
    }
  }, [selectedBodyId, celestialBodies]);

  useEffect(() => {
    timeScaleRef.current = timeScale;
    if (timeScale !== 1) setLiveUtcSync(false);
  }, [timeScale]);

  useEffect(() => {
    liveUtcSyncRef.current = liveUtcSync;
  }, [liveUtcSync]);

  useEffect(() => {
    epochYearRef.current = epochYear;
  }, [epochYear]);

  useEffect(() => {
    liveTracksRef.current = liveTracks;
  }, [liveTracks]);

  useEffect(() => {
    groundTrackRef.current = selectedGroundTrack;
  }, [selectedGroundTrack]);

  useEffect(() => {
    epochFilterOnlyRef.current = epochFilterOnly;
  }, [epochFilterOnly]);

  useEffect(() => {
    onSelectRef.current = onSelectObject;
  }, [onSelectObject]);

  useEffect(() => {
    onSelectBodyRef.current = onSelectCelestialBody;
  }, [onSelectCelestialBody]);

  useEffect(() => {
    onEpochChangeRef.current = onEpochYearChange;
  }, [onEpochYearChange]);

  const activeAtEpochCount = objects.filter(
    (o) => parseLaunchYear(o.launchDate) <= Math.floor(epochYear),
  ).length;

  const selectedBodyObj = celestialBodies.find((b) => b.id === selectedBodyId);

  useEffect(() => {
    const mount = canvasMountRef.current;
    const outer = containerRef.current;
    if (!mount || !outer) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('WebGL rendering is unavailable in this browser context.');
      return;
    }

    const width = outer.clientWidth || 1024;
    const height = outer.clientHeight || 620;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = false;
    mount.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError('WebGL graphics context paused. Restoring viewport...');
    };
    const handleContextRestored = () => {
      setWebglError(null);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060b);
    scene.fog = new THREE.FogExp2(0x04060b, 0.0022);

    const skyDome = createDeepSpaceDome(360);
    scene.add(skyDome);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 600);
    camera.position.set(16, 12, 22);

    let composer: EffectComposer | null = null;
    if (!isSoftwareGl) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.42, 0.5, 0.82);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.6;
    controls.maxDistance = 190;
    controls.target.set(0, 0, 0);

    const handleControlsStart = () => {
      flyToIdRef.current = null;
      flyToBodyIdRef.current = null;
      resetViewRequestedRef.current = false;
    };
    controls.addEventListener('start', handleControlsStart);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.75);
    keyLight.position.set(35, 18, 28);
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.65);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    rimLight.position.set(-28, -10, -24);
    scene.add(rimLight);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const glowTex = createNebulaGlowTexture();

    // Spectral Deep-Sky Starfield (2,400 instanced stars colored by spectral class)
    const starCount = 2400;
    const starGeo = new THREE.OctahedronGeometry(0.16, 0);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const stars = new THREE.InstancedMesh(starGeo, starMat, starCount);
    for (let i = 0; i < starCount; i++) {
      const r = 165 + ((i * 43) % 165);
      const theta = (i * 2.399963) % (Math.PI * 2);
      const phi = Math.acos(2 * ((i % 137) / 137) - 1);
      _dummyObj.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta),
      );
      const s = 0.35 + (i % 6) * 0.26;
      _dummyObj.scale.set(s, s, s);
      _dummyObj.updateMatrix();
      stars.setMatrixAt(i, _dummyObj.matrix);

      const spectralRoll = i % 10;
      if (spectralRoll < 2) _color.set(0x93c5fd); // O/B blue-white
      else if (spectralRoll < 6) _color.set(0xf8fafc); // A/F white
      else if (spectralRoll < 8) _color.set(0xfef08a); // G yellow
      else _color.set(0xfdba74); // K/M orange-red
      stars.setColorAt(i, _color);
    }
    stars.instanceMatrix.needsUpdate = true;
    if (stars.instanceColor) stars.instanceColor.needsUpdate = true;
    stars.computeBoundingSphere();
    scene.add(stars);

    // 5 Scale Groups
    const scaleGroups: Record<ExtendedAtlasScale, THREE.Group> = {
      'earth-l2': new THREE.Group(),
      'inner-solar': new THREE.Group(),
      'outer-solar': new THREE.Group(),
      galaxy: new THREE.Group(),
      universe: new THREE.Group(),
    };
    scene.add(scaleGroups['earth-l2']);
    scene.add(scaleGroups['inner-solar']);
    scene.add(scaleGroups['outer-solar']);
    scene.add(scaleGroups['galaxy']);
    scene.add(scaleGroups['universe']);

    const clickableMeshes: THREE.Object3D[] = [];
    const bodyNodes: {
      body: CelestialBody;
      mesh: THREE.Object3D;
      hitProxy: THREE.Mesh;
      ring: THREE.Mesh;
    }[] = [];

    const registerClickableBody = (
      body: CelestialBody,
      mesh: THREE.Object3D,
      hitRadius: number,
      ringInner: number,
    ) => {
      const hitProxy = new THREE.Mesh(
        new THREE.SphereGeometry(hitRadius, 12, 10),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hitProxy.userData.celestialBody = body;
      mesh.add(hitProxy);
      clickableMeshes.push(hitProxy);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(ringInner, ringInner + 0.14, 32),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(body.accentColor),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.visible = body.id === selectedBodyIdRef.current;
      mesh.add(ring);

      bodyNodes.push({ body, mesh, hitProxy, ring });
    };

    const makeLoop = (pts: THREE.Vector3[], color: number, opacity: number) =>
      new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
      );

    const disposableTextures: THREE.Texture[] = [];

    // --- 1. EARTH & LAGRANGE GROUP (Real NASA Photography + SGP4 Ground Track Ribbon) ---
    const earthBundle = getRealEarthTextureBundle(maxAnisotropy);
    const earthTiltRad = THREE.MathUtils.degToRad(PLANET_AXIAL_TILT_DEG.earth);
    const earthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.8, 64, 48),
      new THREE.MeshStandardMaterial({
        map: earthBundle.map,
        normalMap: earthBundle.normalMap,
        normalScale: new THREE.Vector2(0.9, 0.9),
        roughnessMap: earthBundle.roughnessMap,
        roughness: 0.92,
        metalness: 0.04,
        emissiveMap: earthBundle.emissiveMap,
        emissive: new THREE.Color(0xffd280),
        emissiveIntensity: 0.52,
      }),
    );
    earthMesh.rotation.order = 'ZYX';
    earthMesh.rotation.z = 0; // Aligned to ECEF in Live UTC mode for accurate ground-track overlay
    scaleGroups['earth-l2'].add(earthMesh);

    const earthClouds = new THREE.Mesh(
      new THREE.SphereGeometry(2.845, 48, 36),
      new THREE.MeshStandardMaterial({
        map: earthBundle.cloudMap,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        roughness: 0.9,
      }),
    );
    scaleGroups['earth-l2'].add(earthClouds);

    scaleGroups['earth-l2'].add(createAtmosphereHaloMesh(3.01, 0x38bdf8, 0.8));

    // Live 3D Orbital Ground-Track Arc around Earth for locked SGP4 spacecraft
    const liveTrackLineGeo = new THREE.BufferGeometry();
    const liveTrackLine = new THREE.Line(
      liveTrackLineGeo,
      new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85 }),
    );
    liveTrackLine.frustumCulled = false;
    scaleGroups['earth-l2'].add(liveTrackLine);

    const earthBody = celestialBodies.find((b) => b.id === 'earth');
    if (earthBody) registerClickableBody(earthBody, earthMesh, 3.1, 3.35);

    const moonBundle = getRealPlanetTextureBundle('moon', maxAnisotropy);
    const moonPivot = new THREE.Group();
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.76, 40, 32),
      new THREE.MeshStandardMaterial({
        map: moonBundle.map,
        roughness: 0.92,
        metalness: 0.02,
      }),
    );
    moonMesh.position.set(12.2, 0, 0);
    moonPivot.add(moonMesh);
    scaleGroups['earth-l2'].add(moonPivot);
    const moonBody = celestialBodies.find((b) => b.id === 'moon');
    if (moonBody) registerClickableBody(moonBody, moonMesh, 1.35, 1.1);

    const moonRingPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      moonRingPts.push(new THREE.Vector3(Math.cos(a) * 12.2, 0, Math.sin(a) * 12.2));
    }
    scaleGroups['earth-l2'].add(makeLoop(moonRingPts, 0x334155, 0.55));

    const l2HaloPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      l2HaloPts.push(new THREE.Vector3(17.5, Math.sin(a) * 2.2, Math.cos(a) * 2.7));
    }
    scaleGroups['earth-l2'].add(makeLoop(l2HaloPts, 0x06b6d4, 0.5));

    const l1HaloPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      l1HaloPts.push(new THREE.Vector3(-16.5, Math.sin(a) * 1.8, Math.cos(a) * 2.2));
    }
    scaleGroups['earth-l2'].add(makeLoop(l1HaloPts, 0xfbbf24, 0.4));

    const starlinkSwarmCount = 85;
    const starlinkSwarm = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.11, 0.03, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.25 }),
      starlinkSwarmCount,
    );
    starlinkSwarm.frustumCulled = false;
    scaleGroups['earth-l2'].add(starlinkSwarm);

    // --- 2. INNER & OUTER SOLAR SYSTEM ---
    const shaderTimeUpdaters: Array<(t: number) => void> = [];

    const buildSolarAnchor = (targetGroup: THREE.Group, sunRadius: number, clickableSun: boolean) => {
      const sunTex = getRealSunTexture(maxAnisotropy);
      const sun = new THREE.Mesh(
        new THREE.SphereGeometry(sunRadius, 48, 36),
        new THREE.MeshBasicMaterial({ map: sunTex }),
      );
      targetGroup.add(sun);

      const sunMat = createStellarSurfaceMaterial('sun');
      sunMat.transparent = true;
      sunMat.opacity = 0.22;
      sunMat.blending = THREE.AdditiveBlending;
      sunMat.depthWrite = false;
      shaderTimeUpdaters.push((t) => {
        sunMat.uniforms.uTime.value = t;
      });
      targetGroup.add(new THREE.Mesh(new THREE.SphereGeometry(sunRadius * 1.01, 40, 32), sunMat));

      targetGroup.add(createAtmosphereHaloMesh(sunRadius * 1.28, 0xfbbf24, 0.9));

      const coronaSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: 0xf97316,
          transparent: true,
          opacity: 0.35,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      coronaSprite.scale.setScalar(sunRadius * 5.2);
      targetGroup.add(coronaSprite);

      if (clickableSun) {
        const sunBody = celestialBodies.find((b) => b.id === 'sun');
        if (sunBody) registerClickableBody(sunBody, sun, sunRadius * 1.35, sunRadius * 1.5);
      }
    };

    buildSolarAnchor(scaleGroups['inner-solar'], 2.2, true);
    buildSolarAnchor(scaleGroups['outer-solar'], 1.5, false);

    // Calibrated Ecliptic Polar Grid on inner and outer solar views
    const innerGrid = new THREE.PolarGridHelper(22, 12, 4, 96, 0x1e293b, 0x0f172a);
    innerGrid.position.y = -0.35;
    scaleGroups['inner-solar'].add(innerGrid);

    const outerGrid = new THREE.PolarGridHelper(35, 12, 5, 96, 0x1e293b, 0x0f172a);
    outerGrid.position.y = -0.45;
    scaleGroups['outer-solar'].add(outerGrid);

    const orbitingBodies: {
      id: string;
      solarScale?: 'inner-solar' | 'outer-solar';
      body?: CelestialBody;
      mesh: THREE.Object3D;
      radius: number;
      speed: number;
      angle: number;
      eccentricity: number;
      inclinationDeg: number;
    }[] = [];

    const innerPlanetSpecs: Array<{
      id: string;
      kind: 'mercury' | 'venus' | 'earth' | 'mars';
      r: number;
      size: number;
      speed: number;
      a: number;
      ecc: number;
      inc: number;
      ringColor: number;
      atmoColor?: number;
    }> = [
      { id: 'mercury', kind: 'mercury', r: 6.5, size: 0.48, speed: 0.85, a: 0.4, ecc: 0.2, inc: 7, ringColor: 0x475569 },
      { id: 'venus', kind: 'venus', r: 9.8, size: 0.72, speed: 0.55, a: 2.1, ecc: 0.01, inc: 3.4, ringColor: 0x64748b, atmoColor: 0xfbbf24 },
      { id: 'earth', kind: 'earth', r: 13.4, size: 0.82, speed: 0.36, a: 3.8, ecc: 0.02, inc: 0, ringColor: 0x0ea5e9, atmoColor: 0x38bdf8 },
      { id: 'mars', kind: 'mars', r: 17.8, size: 0.68, speed: 0.24, a: 1.17, ecc: 0.09, inc: 1.85, ringColor: 0x7f1d1d, atmoColor: 0xfb7185 },
    ];

    for (const p of innerPlanetSpecs) {
      const holder = new THREE.Group();
      const tiltRad = THREE.MathUtils.degToRad(PLANET_AXIAL_TILT_DEG[p.kind] ?? 0);
      if (p.kind === 'earth') {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(p.size, 36, 28),
          new THREE.MeshStandardMaterial({
            map: earthBundle.map,
            normalMap: earthBundle.normalMap,
            normalScale: new THREE.Vector2(0.7, 0.7),
            roughnessMap: earthBundle.roughnessMap,
            roughness: 0.88,
          }),
        );
        mesh.rotation.z = tiltRad;
        holder.add(mesh);
      } else {
        const bdl = getRealPlanetTextureBundle(p.kind, maxAnisotropy);
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(p.size, 36, 28),
          new THREE.MeshStandardMaterial({
            map: bdl.map,
            bumpMap: bdl.bumpMap,
            bumpScale: p.kind === 'mars' || p.kind === 'mercury' ? 0.028 : 0.012,
            roughness: 0.85,
          }),
        );
        mesh.rotation.z = tiltRad;
        holder.add(mesh);
      }
      if (p.atmoColor) {
        holder.add(createAtmosphereHaloMesh(p.size * 1.09, p.atmoColor, 0.55));
      }
      scaleGroups['inner-solar'].add(holder);

      const body = celestialBodies.find((b) => b.id === p.id);
      if (body && p.id !== 'earth') {
        registerClickableBody(body, holder, p.size * 1.9, p.size * 1.45);
      }

      orbitingBodies.push({
        id: p.id,
        solarScale: 'inner-solar',
        body,
        mesh: holder,
        radius: p.r,
        speed: p.speed,
        angle: p.a,
        eccentricity: p.ecc,
        inclinationDeg: p.inc,
      });

      const pts = sampleRealOrbitalLoop(p.id, new Date(), 'inner-solar', 96);
      scaleGroups['inner-solar'].add(makeLoop(pts, p.ringColor, 0.52));
    }

    // Notable Asteroids & Comets in 3D: Bennu, 67P, 16 Psyche, 1 Ceres
    const asteroidIds = ['bennu', 'comet-67p', 'asteroid-psyche', 'ceres'] as const;
    for (const aid of asteroidIds) {
      const body = celestialBodies.find((b) => b.id === aid);
      if (!body || !body.solarOrbit) continue;
      const model = createAsteroidOrCometModel(
        body.visualKind as 'bennu' | 'comet-67p' | 'psyche' | 'ceres',
        maxAnisotropy,
      );
      model.scale.setScalar(0.58);
      const targetGrp = scaleGroups[body.atlasScale];
      targetGrp.add(model);
      registerClickableBody(body, model, 1.35, 1.3);

      orbitingBodies.push({
        id: aid,
        body,
        mesh: model,
        radius: body.solarOrbit.radius,
        speed: body.solarOrbit.speed,
        angle: body.solarOrbit.angle,
        eccentricity: body.solarOrbit.eccentricity,
        inclinationDeg: body.solarOrbit.inclinationDeg,
      });

      const pts: THREE.Vector3[] = [];
      const inc = THREE.MathUtils.degToRad(body.solarOrbit.inclinationDeg);
      for (let i = 0; i <= 112; i++) {
        const ang = (i / 112) * Math.PI * 2;
        pts.push(solveKeplerPosition(body.solarOrbit.radius, body.solarOrbit.eccentricity, inc, ang));
      }
      targetGrp.add(makeLoop(pts, new THREE.Color(body.accentColor).getHex(), 0.4));
    }

    // Outer solar planets (Jupiter, Saturn, Uranus, Neptune — Real NASA Planetary Maps + Live Astronomy Engine)
    const outerSpecs: Array<{
      id: string;
      kind: 'jupiter' | 'saturn' | 'uranus' | 'neptune';
      r: number;
      size: number;
      speed: number;
      a: number;
      ecc: number;
      inc: number;
      atmoColor: number;
      hasRings?: boolean;
    }> = [
      { id: 'jupiter', kind: 'jupiter', r: 17.2, size: 1.55, speed: 0.11, a: 0.4, ecc: 0.049, inc: 1.3, atmoColor: 0xfdba74 },
      { id: 'saturn', kind: 'saturn', r: 23.0, size: 1.3, speed: 0.075, a: 2.3, ecc: 0.056, inc: 2.5, atmoColor: 0xfde68a, hasRings: true },
      { id: 'uranus', kind: 'uranus', r: 28.0, size: 0.9, speed: 0.045, a: 4.1, ecc: 0.046, inc: 0.8, atmoColor: 0x67e8f9 },
      { id: 'neptune', kind: 'neptune', r: 32.0, size: 0.88, speed: 0.032, a: 1.2, ecc: 0.009, inc: 1.8, atmoColor: 0x3b82f6 },
    ];
    for (const p of outerSpecs) {
      const holder = new THREE.Group();
      const bdl = getRealPlanetTextureBundle(p.kind, maxAnisotropy);

      const tiltHolder = new THREE.Group();
      tiltHolder.rotation.z = THREE.MathUtils.degToRad(PLANET_AXIAL_TILT_DEG[p.kind] ?? 0);

      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(p.size, 36, 28),
        new THREE.MeshStandardMaterial({
          map: bdl.map,
          roughness: 0.72,
        }),
      );
      tiltHolder.add(sphere);
      tiltHolder.add(createAtmosphereHaloMesh(p.size * 1.07, p.atmoColor, 0.42));

      if (p.hasRings) {
        const ringTex = getRealSaturnRingsTexture(maxAnisotropy);
        const ringGeo = createSaturnRingGeometry(p.size * 1.32, p.size * 2.32);
        const ringMat = new THREE.MeshStandardMaterial({
          map: ringTex,
          side: THREE.DoubleSide,
          transparent: true,
          roughness: 0.78,
          depthWrite: false,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        tiltHolder.add(ringMesh);
      }

      holder.add(tiltHolder);
      scaleGroups['outer-solar'].add(holder);
      const body = celestialBodies.find((b) => b.id === p.id);
      if (body) registerClickableBody(body, holder, p.size * 1.55, p.size * 1.85);

      orbitingBodies.push({
        id: p.id,
        solarScale: 'outer-solar',
        body,
        mesh: holder,
        radius: p.r,
        speed: p.speed,
        angle: p.a,
        eccentricity: p.ecc,
        inclinationDeg: p.inc,
      });

      const pts = sampleRealOrbitalLoop(p.id, new Date(), 'outer-solar', 112);
      scaleGroups['outer-solar'].add(makeLoop(pts, 0x334155, 0.48));
    }

    // Main Asteroid Belt instanced swarm
    const asteroidCount = 220;
    const asteroidMesh = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.14, 0),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.92 }),
      asteroidCount,
    );
    for (let i = 0; i < asteroidCount; i++) {
      const a = (i / asteroidCount) * Math.PI * 2 + (i % 7) * 0.08;
      const r = 11.8 + (i % 12) * 0.22;
      _dummyObj.position.set(Math.cos(a) * r, ((i % 5) - 2) * 0.25, Math.sin(a) * r);
      _dummyObj.rotation.set(i * 0.5, i * 0.8, 0);
      const s = 0.55 + (i % 4) * 0.35;
      _dummyObj.scale.set(s, s, s);
      _dummyObj.updateMatrix();
      asteroidMesh.setMatrixAt(i, _dummyObj.matrix);
    }
    asteroidMesh.instanceMatrix.needsUpdate = true;
    asteroidMesh.computeBoundingSphere();
    scaleGroups['outer-solar'].add(asteroidMesh);

    // --- 3. MILKY WAY GALAXY SCALE (Stars + Nebula Dust Clouds + Sgr A*) ---
    const galaxyStarCount = 6800;
    const galaxyStars = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.15, 0),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      galaxyStarCount,
    );
    const armCount = 4;
    for (let i = 0; i < galaxyStarCount; i++) {
      const arm = i % armCount;
      const t = Math.pow(i / galaxyStarCount, 0.72);
      const r = 1.2 + t * 40;
      const spin = r * 0.22 + (arm * Math.PI * 2) / armCount;
      const spread = Math.sin(i * 12.9898) * 0.52 * (1.2 + r * 0.085);
      const y = Math.cos(i * 78.233) * 0.5 * (2.6 / (1 + r * 0.11));
      _dummyObj.position.set(
        Math.cos(spin) * r + spread,
        y,
        Math.sin(spin) * r + Math.cos(i * 45.1) * 0.95,
      );
      const s = r < 6 ? 1.0 : 0.42 + (i % 5) * 0.22;
      _dummyObj.scale.set(s, s, s);
      _dummyObj.updateMatrix();
      galaxyStars.setMatrixAt(i, _dummyObj.matrix);

      if (r < 7.5) {
        _color.setHSL(0.1, 0.88, 0.74); // Warm galactic bulge
      } else if (i % 17 === 0) {
        _color.setHSL(0.92, 0.75, 0.7); // H-alpha rose nebula knots
      } else {
        _color.setHSL(0.57 + (i % 5) * 0.03, 0.75, 0.76); // Blue spiral arms
      }
      galaxyStars.setColorAt(i, _color);
    }
    galaxyStars.instanceMatrix.needsUpdate = true;
    if (galaxyStars.instanceColor) galaxyStars.instanceColor.needsUpdate = true;
    galaxyStars.computeBoundingSphere();
    scaleGroups['galaxy'].add(galaxyStars);

    // Volumetric Spiral Nebula Glow Clouds along arms
    const nebulaCount = 160;
    const nebulaPositions = new Float32Array(nebulaCount * 3);
    const nebulaColors = new Float32Array(nebulaCount * 3);
    for (let i = 0; i < nebulaCount; i++) {
      const arm = i % armCount;
      const t = i / nebulaCount;
      const r = 1.8 + t * 34;
      const spin = r * 0.22 + (arm * Math.PI * 2) / armCount;
      nebulaPositions[i * 3] = Math.cos(spin) * r + Math.sin(i * 9.1) * 1.4;
      nebulaPositions[i * 3 + 1] = Math.cos(i * 13.7) * 0.45;
      nebulaPositions[i * 3 + 2] = Math.sin(spin) * r + Math.cos(i * 7.3) * 1.4;

      if (r < 7) _color.set(0xf59e0b);
      else if (i % 3 === 0) _color.set(0x38bdf8);
      else _color.set(0x6366f1);

      nebulaColors[i * 3] = _color.r;
      nebulaColors[i * 3 + 1] = _color.g;
      nebulaColors[i * 3 + 2] = _color.b;
    }
    const nebulaGeo = new THREE.BufferGeometry();
    nebulaGeo.setAttribute('position', new THREE.BufferAttribute(nebulaPositions, 3));
    nebulaGeo.setAttribute('color', new THREE.BufferAttribute(nebulaColors, 3));
    const nebulaPoints = new THREE.Points(
      nebulaGeo,
      new THREE.PointsMaterial({
        size: 5.5,
        map: glowTex,
        vertexColors: true,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    scaleGroups['galaxy'].add(nebulaPoints);

    // Galactic Reference Rings
    for (const gr of [14, 26, 38]) {
      const gPts: THREE.Vector3[] = [];
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        gPts.push(new THREE.Vector3(Math.cos(a) * gr, 0, Math.sin(a) * gr));
      }
      scaleGroups['galaxy'].add(makeLoop(gPts, 0x1e293b, 0.55));
    }

    // Named Galactic Stars, Habitable Exoplanets & Sagittarius A* nodes
    const galaxyBodies = celestialBodies.filter((b) => b.atlasScale === 'galaxy' && b.galaxyCoords);
    for (const gb of galaxyBodies) {
      const [gx, gy, gz] = gb.galaxyCoords!;
      let nodeMesh: THREE.Object3D;
      if (gb.visualKind === 'blackhole') {
        const grp = new THREE.Group();
        grp.add(
          new THREE.Mesh(
            new THREE.SphereGeometry(0.95, 28, 20),
            new THREE.MeshBasicMaterial({ color: 0x020306 }),
          ),
        );
        const disk = new THREE.Mesh(
          new THREE.RingGeometry(1.15, 2.75, 64),
          new THREE.MeshBasicMaterial({
            color: 0xf59e0b,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.88,
          }),
        );
        disk.rotation.x = Math.PI / 2 - 0.35;
        grp.add(disk);
        grp.add(createAtmosphereHaloMesh(1.16, 0xf59e0b, 0.85));
        nodeMesh = grp;
      } else if (gb.type === 'Exoplanet') {
        const col = new THREE.Color(gb.accentColor);
        const grp = new THREE.Group();
        grp.add(
          new THREE.Mesh(
            new THREE.SphereGeometry(0.42, 20, 16),
            new THREE.MeshStandardMaterial({
              color: col,
              emissive: col,
              emissiveIntensity: 0.45,
              roughness: 0.4,
            }),
          ),
        );
        const hzHalo = new THREE.Mesh(
          new THREE.RingGeometry(0.62, 0.72, 32),
          new THREE.MeshBasicMaterial({
            color: 0x34d399,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.72,
          }),
        );
        hzHalo.rotation.x = Math.PI / 2;
        grp.add(hzHalo);
        nodeMesh = grp;
      } else {
        const col = new THREE.Color(gb.accentColor);
        const grp = new THREE.Group();
        const starKind =
          gb.visualKind === 'star-blue' ||
          gb.visualKind === 'star-red' ||
          gb.visualKind === 'star-gold' ||
          gb.visualKind === 'star-orange' ||
          gb.visualKind === 'pulsar'
            ? gb.visualKind
            : 'star-gold';
        const mat = createStellarSurfaceMaterial(starKind);
        shaderTimeUpdaters.push((t) => {
          mat.uniforms.uTime.value = t;
        });
        const r = gb.id === 'betelgeuse' || gb.id === 'antares' || gb.id === 'rigel' ? 0.72 : 0.52;
        grp.add(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), mat));

        const halo = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glowTex,
            color: col,
            transparent: true,
            opacity: 0.55,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        halo.scale.setScalar(r * 4.5);
        grp.add(halo);

        if (gb.visualKind === 'pulsar') {
          const jetMat = new THREE.MeshBasicMaterial({
            color: 0xc084fc,
            transparent: true,
            opacity: 0.55,
            blending: THREE.AdditiveBlending,
          });
          const j1 = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.5, 16, 1, true), jetMat);
          j1.position.y = 1.0;
          j1.rotation.x = Math.PI;
          grp.add(j1);
          const j2 = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.5, 16, 1, true), jetMat);
          j2.position.y = -1.0;
          grp.add(j2);
        }

        nodeMesh = grp;
      }
      nodeMesh.position.set(gx, gy, gz);
      scaleGroups['galaxy'].add(nodeMesh);
      registerClickableBody(gb, nodeMesh, 1.8, 1.25);
    }

    // --- 3B. OBSERVABLE UNIVERSE SCALE (Cosmic Web, Local Group, Andromeda, Laniakea, TON 618, CMB Horizon) ---
    const universeRadius = 48;
    const cmbShell = new THREE.Mesh(
      new THREE.SphereGeometry(universeRadius, 36, 24),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        wireframe: true,
        transparent: true,
        opacity: 0.055,
        depthWrite: false,
      }),
    );
    scaleGroups['universe'].add(cmbShell);

    for (const ur of [15, 30, 46]) {
      const uPts: THREE.Vector3[] = [];
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        uPts.push(new THREE.Vector3(Math.cos(a) * ur, 0, Math.sin(a) * ur));
      }
      scaleGroups['universe'].add(makeLoop(uPts, ur === 46 ? 0x92400e : 0x1e293b, ur === 46 ? 0.5 : 0.45));
    }

    // Cosmic Web Filament Skeleton (130 supercluster knots connected across cosmic voids)
    const webKnots: THREE.Vector3[] = [];
    for (let i = 0; i < 130; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / 130);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 6 + ((i * 53) % 100) / 100 * 37;
      webKnots.push(
        new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi) * 0.72,
          r * Math.sin(phi) * Math.sin(theta),
        ),
      );
    }
    const filamentVerts: number[] = [];
    for (let i = 0; i < webKnots.length; i++) {
      for (let j = i + 1; j < webKnots.length; j++) {
        if (webKnots[i].distanceTo(webKnots[j]) < 14.2) {
          filamentVerts.push(webKnots[i].x, webKnots[i].y, webKnots[i].z);
          filamentVerts.push(webKnots[j].x, webKnots[j].y, webKnots[j].z);
        }
      }
    }
    const filamentGeo = new THREE.BufferGeometry();
    filamentGeo.setAttribute('position', new THREE.Float32BufferAttribute(filamentVerts, 3));
    scaleGroups['universe'].add(
      new THREE.LineSegments(
        filamentGeo,
        new THREE.LineBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );

    // 3,600 Distant Galaxies & Quasars distributed along Cosmic Web Filaments
    const deepGalaxyCount = 3600;
    const deepGalaxies = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.18, 0),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      deepGalaxyCount,
    );
    for (let i = 0; i < deepGalaxyCount; i++) {
      const kIdx = i % webKnots.length;
      const kNext = (i * 7 + 3) % webKnots.length;
      const knot = webKnots[kIdx];
      const lerpT = ((i * 29) % 100) / 100;
      const jitterX = Math.sin(i * 12.7) * 2.8;
      const jitterY = Math.cos(i * 31.1) * 2.2;
      const jitterZ = Math.sin(i * 47.3) * 2.8;
      _dummyObj.position.set(
        THREE.MathUtils.lerp(knot.x, webKnots[kNext].x, lerpT * 0.45) + jitterX,
        THREE.MathUtils.lerp(knot.y, webKnots[kNext].y, lerpT * 0.45) + jitterY,
        THREE.MathUtils.lerp(knot.z, webKnots[kNext].z, lerpT * 0.45) + jitterZ,
      );
      const s = 0.45 + (i % 5) * 0.28;
      _dummyObj.scale.set(s, s, s);
      _dummyObj.updateMatrix();
      deepGalaxies.setMatrixAt(i, _dummyObj.matrix);

      const distRatio = _dummyObj.position.length() / universeRadius;
      if (distRatio > 0.78) _color.set(0xfb7185); // High-z redshifted cosmic dawn galaxies
      else if (i % 6 === 0) _color.set(0xfde047); // Elliptical gold superclusters
      else if (i % 3 === 0) _color.set(0x818cf8); // Deep blue-violet spirals
      else _color.set(0x38bdf8);
      deepGalaxies.setColorAt(i, _color);
    }
    deepGalaxies.instanceMatrix.needsUpdate = true;
    if (deepGalaxies.instanceColor) deepGalaxies.instanceColor.needsUpdate = true;
    deepGalaxies.computeBoundingSphere();
    scaleGroups['universe'].add(deepGalaxies);

    // Milky Way Local Group origin marker at [0,0,0] inside Universe view
    const localAnchor = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 1.35, 32),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      }),
    );
    localAnchor.rotation.x = Math.PI / 2 - 0.3;
    scaleGroups['universe'].add(localAnchor);
    const localCore = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xfde68a,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    localCore.scale.setScalar(2.6);
    scaleGroups['universe'].add(localCore);

    // Clickable Extragalactic & Cosmic Web Structures
    const universeBodies = celestialBodies.filter((b) => b.atlasScale === 'universe' && b.galaxyCoords);
    for (const ub of universeBodies) {
      const [ux, uy, uz] = ub.galaxyCoords!;
      const grp = new THREE.Group();

      if (ub.visualKind === 'galaxy-spiral') {
        const miniSpiral = new THREE.InstancedMesh(
          new THREE.OctahedronGeometry(0.08, 0),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(ub.accentColor) }),
          320,
        );
        for (let k = 0; k < 320; k++) {
          const arm = k % 2;
          const t = k / 320;
          const r = 0.2 + t * 2.1;
          const spin = r * 2.1 + arm * Math.PI + Math.sin(k * 9.3) * 0.28;
          _dummyObj.position.set(Math.cos(spin) * r, Math.cos(k * 17) * 0.12, Math.sin(spin) * r);
          _dummyObj.scale.setScalar(r < 0.5 ? 1.4 : 0.85);
          _dummyObj.updateMatrix();
          miniSpiral.setMatrixAt(k, _dummyObj.matrix);
        }
        miniSpiral.instanceMatrix.needsUpdate = true;
        miniSpiral.rotation.x = 0.45;
        miniSpiral.rotation.z = -0.25;
        grp.add(miniSpiral);
      } else if (ub.visualKind === 'blackhole') {
        grp.add(
          new THREE.Mesh(
            new THREE.SphereGeometry(0.85, 24, 18),
            new THREE.MeshBasicMaterial({ color: 0x020306 }),
          ),
        );
        const jetMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(ub.accentColor),
          transparent: true,
          opacity: 0.65,
          blending: THREE.AdditiveBlending,
        });
        const j1 = new THREE.Mesh(new THREE.ConeGeometry(0.24, 3.2, 16, 1, true), jetMat);
        j1.position.y = 1.9;
        j1.rotation.x = Math.PI;
        grp.add(j1);
        const j2 = new THREE.Mesh(new THREE.ConeGeometry(0.24, 3.2, 16, 1, true), jetMat);
        j2.position.y = -1.9;
        grp.add(j2);
        const disk = new THREE.Mesh(
          new THREE.RingGeometry(1.1, 2.4, 48),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(ub.accentColor),
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
          }),
        );
        disk.rotation.x = Math.PI / 2 - 0.3;
        grp.add(disk);
      } else {
        grp.add(
          new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.1, 1),
            new THREE.MeshBasicMaterial({
              color: new THREE.Color(ub.accentColor),
              wireframe: true,
              transparent: true,
              opacity: 0.72,
            }),
          ),
        );
      }

      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: new THREE.Color(ub.accentColor),
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      glow.scale.setScalar(5.5);
      grp.add(glow);

      grp.position.set(ux, uy, uz);
      scaleGroups['universe'].add(grp);
      registerClickableBody(ub, grp, 2.5, 1.85);
    }

    // --- 4. SPACECRAFT NODES ---
    interface SpacecraftNode {
      obj: SpaceObject;
      launchYear: number;
      group: THREE.Group;
      hitProxy: THREE.Mesh;
      selectionHalo: THREE.Mesh;
      orbitLine: THREE.LineLoop | null;
    }

    const spacecraftNodes: SpacecraftNode[] = [];
    for (const obj of objects) {
      const parentGroup = scaleGroups[obj.orbitConfig.scale];
      const modelGroup = createSpacecraftModel(obj.orbitConfig.modelType, obj.orbitConfig.color);
      modelGroup.scale.setScalar(0.58);

      const hitProxy = new THREE.Mesh(
        new THREE.SphereGeometry(1.15, 12, 10),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hitProxy.userData.spaceObject = obj;
      modelGroup.add(hitProxy);
      clickableMeshes.push(hitProxy);

      const selectionHalo = new THREE.Mesh(
        new THREE.RingGeometry(1.3, 1.48, 32),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(obj.orbitConfig.color),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
        }),
      );
      selectionHalo.rotation.x = Math.PI / 2;
      selectionHalo.visible = obj.id === selectedIdRef.current;
      modelGroup.add(selectionHalo);

      parentGroup.add(modelGroup);

      let orbitLine: THREE.LineLoop | null = null;
      if (!obj.orbitConfig.isL2Halo && !obj.orbitConfig.isL1Halo && obj.orbitConfig.center !== 'moon') {
        const inc = THREE.MathUtils.degToRad(obj.orbitConfig.inclinationDeg);
        const r = obj.orbitConfig.radius;
        const ecc = obj.orbitConfig.eccentricity;
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 96; i++) {
          const a = (i / 96) * Math.PI * 2;
          pts.push(solveKeplerPosition(r, ecc, inc, a));
        }
        orbitLine = makeLoop(pts, new THREE.Color(obj.orbitConfig.color).getHex(), 0.3);
        parentGroup.add(orbitLine);
      }

      spacecraftNodes.push({
        obj,
        launchYear: parseLaunchYear(obj.launchDate),
        group: modelGroup,
        hitProxy,
        selectionHalo,
        orbitLine,
      });
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let lastMoveCheck = 0;

    const updatePointer = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const getActiveClickables = () => {
      const activeGroup = scaleGroups[activeScaleRef.current];
      return clickableMeshes.filter((m) => {
        let p: THREE.Object3D | null = m;
        while (p) {
          if (!p.visible) return false;
          if (p === activeGroup) return true;
          p = p.parent;
        }
        return false;
      });
    };

    const onPointerDown = (ev: PointerEvent) => {
      pointerDownPos = { x: ev.clientX, y: ev.clientY };
    };

    const onPointerUp = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - pointerDownPos.x, ev.clientY - pointerDownPos.y);
      if (dist > 6) return;
      updatePointer(ev);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(getActiveClickables(), false);
      if (hits.length > 0) {
        const hitData = hits[0].object.userData;
        if (hitData.spaceObject) {
          const spaceObj = hitData.spaceObject as SpaceObject;
          onSelectRef.current(spaceObj);
          flyToIdRef.current = spaceObj.id;
          flyToBodyIdRef.current = null;
        } else if (hitData.celestialBody) {
          const body = hitData.celestialBody as CelestialBody;
          onSelectBodyRef.current(body);
          flyToBodyIdRef.current = body.id;
          flyToIdRef.current = null;
        }
      }
    };

    const onPointerMove = (ev: PointerEvent) => {
      const now = performance.now();
      if (now - lastMoveCheck < 60) return;
      lastMoveCheck = now;
      updatePointer(ev);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(getActiveClickables(), false);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    const handleResize = () => {
      if (!outer) return;
      const w = outer.clientWidth || 1024;
      const h = outer.clientHeight || 620;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer?.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let simTime = 0;
    let shaderClock = 0;
    let lastRealTime = performance.now();
    let lastEpochSync = performance.now();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync && gl.deleteSync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;

      const now = performance.now();
      const delta = Math.min((now - lastRealTime) / 1000, 0.1);
      lastRealTime = now;
      shaderClock += delta;

      const spd = timeScaleRef.current;
      const visualMult = spd === 0 ? 0 : spd <= 1 ? 1 : 1 + Math.log10(spd) * 2.2;
      simTime += delta * visualMult;

      // Advance epoch year smoothly even at 10x / 100x / 1000x
      if (spd >= 10 && now - lastEpochSync > 160) {
        lastEpochSync = now;
        const yearStep = spd === 10 ? 0.04 : spd === 100 ? 0.18 : 0.75;
        const nextYr = Number((epochYearRef.current + yearStep).toFixed(2));
        if (nextYr <= 2045) {
          onEpochChangeRef.current(nextYr);
        }
      }

      // Epoch offset drives real astronomical ephemeris!
      const isLiveSync = liveUtcSyncRef.current;
      const simDate = isLiveSync ? new Date() : epochYearToDate(epochYearRef.current);
      const epochPhase = (epochYearRef.current - 2026) * 0.85;
      const effectiveTime = simTime + epochPhase;

      for (const updateUniform of shaderTimeUpdaters) {
        updateUniform(shaderClock);
      }

      const curScale = activeScaleRef.current;
      scaleGroups['earth-l2'].visible = curScale === 'earth-l2';
      scaleGroups['inner-solar'].visible = curScale === 'inner-solar';
      scaleGroups['outer-solar'].visible = curScale === 'outer-solar';
      scaleGroups['galaxy'].visible = curScale === 'galaxy';
      scaleGroups['universe'].visible = curScale === 'universe';

      if (curScale === 'earth-l2') {
        if (isLiveSync) {
          // Keep Earth fixed in ECEF coordinates so real-time SGP4 satellites sit over their true countries!
          earthMesh.rotation.set(0, 0, 0);
          earthClouds.rotation.set(0, shaderClock * 0.004, 0);
          const subsolar = getSubsolarLatLon(simDate);
          keyLight.position.copy(geodeticToSceneVec3(subsolar.latDeg, subsolar.lonDeg, 45));

          // Update true Moon direction relative to Earth
          const realMoonPos = getMoonRelativeScenePos(simDate, 12.2);
          moonPivot.rotation.y = 0;
          moonMesh.position.copy(realMoonPos);

          // Update 3D ground-track ribbon around Earth for the selected orbiter
          const gt = groundTrackRef.current;
          if (gt && gt.future.length > 2) {
            const pts3d: THREE.Vector3[] = [];
            for (const p of gt.future) {
              const rTrack = 2.8 + Math.min(2.4, Math.max(0.45, (p.altKm / 6371) * 2.8));
              pts3d.push(geodeticToSceneVec3(p.lat, p.lon, rTrack));
            }
            liveTrackLineGeo.setFromPoints(pts3d);
            liveTrackLine.visible = true;
          } else {
            liveTrackLine.visible = false;
          }
        } else {
          earthMesh.rotation.z = earthTiltRad;
          earthMesh.rotation.y += delta * 0.12 * visualMult;
          earthClouds.rotation.z = earthTiltRad;
          earthClouds.rotation.y += delta * 0.16 * visualMult;
          keyLight.position.set(35, 18, 28);
          moonMesh.position.set(12.2, 0, 0);
          moonPivot.rotation.y = effectiveTime * 0.08;
          liveTrackLine.visible = false;
        }
      } else {
        keyLight.position.set(35, 18, 28);
      }

      if (curScale === 'galaxy') {
        scaleGroups['galaxy'].rotation.y += delta * 0.012 * visualMult;
      } else if (curScale === 'universe') {
        scaleGroups['universe'].rotation.y += delta * 0.005 * visualMult;
      }

      if (curScale === 'earth-l2') {
        for (let i = 0; i < starlinkSwarmCount; i++) {
          const shellAngle = effectiveTime * 0.45 + i * 0.41;
          const plane = (i % 5) * 0.62;
          const r = 4.35 + (i % 3) * 0.18;
          _dummyObj.position.set(
            Math.cos(shellAngle) * r * Math.cos(plane) - Math.sin(shellAngle) * r * 0.25,
            Math.sin(shellAngle) * r * 0.72,
            Math.sin(shellAngle) * r * Math.cos(plane) + Math.cos(shellAngle) * r * 0.35,
          );
          _dummyObj.rotation.set(0, -shellAngle, 0);
          _dummyObj.scale.setScalar(1);
          _dummyObj.updateMatrix();
          starlinkSwarm.setMatrixAt(i, _dummyObj.matrix);
        }
        starlinkSwarm.instanceMatrix.needsUpdate = true;
      }

      // Orbiting Planets driven by genuine astronomy-engine J2000 ephemeris, asteroids by Keplerian solver
      for (const p of orbitingBodies) {
        if (p.solarScale) {
          getHeliocentricScenePosition(p.id, simDate, p.solarScale, p.mesh.position);
        } else {
          const a = p.angle + effectiveTime * p.speed;
          const inc = THREE.MathUtils.degToRad(p.inclinationDeg);
          solveKeplerPosition(p.radius, p.eccentricity, inc, a, p.mesh.position);
          if (p.body && (p.body.type === 'Asteroid' || p.body.type === 'Comet')) {
            p.mesh.rotation.y += delta * 0.6 * Math.max(0.2, visualMult);
          }
        }
      }

      // Selection rings on celestial bodies
      let flyBodyNode: (typeof bodyNodes)[number] | null = null;
      for (const bNode of bodyNodes) {
        const isSel = bNode.body.id === selectedBodyIdRef.current;
        bNode.ring.visible = isSel;
        if (isSel) bNode.ring.rotation.z += delta * 1.1;
        if (flyToBodyIdRef.current === bNode.body.id) flyBodyNode = bNode;
      }

      // Spacecraft positions & Epoch visibility filtering (SGP4 Live coordinates for Earth orbiters in Live Sync!)
      let flyTargetNode: SpacecraftNode | null = null;
      const curEpochFloor = Math.floor(epochYearRef.current);
      const filterPreLaunch = epochFilterOnlyRef.current;
      const liveMap = new Map<string, LiveOrbitalTrackItem>();
      for (const lt of liveTracksRef.current) {
        if (lt.spaceObjectId) liveMap.set(lt.spaceObjectId, lt);
      }

      for (const node of spacecraftNodes) {
        const isLaunched = node.launchYear <= curEpochFloor;
        const showNode = !filterPreLaunch || isLaunched;
        node.group.visible = showNode;
        if (node.orbitLine) node.orbitLine.visible = showNode;

        const cfg = node.obj.orbitConfig;
        const isSelected = node.obj.id === selectedIdRef.current;
        node.selectionHalo.visible = isSelected && showNode;
        if (isSelected) node.selectionHalo.rotation.z += delta * 1.4;
        if (flyToIdRef.current === node.obj.id && showNode) flyTargetNode = node;

        const a = cfg.initialAngle + effectiveTime * cfg.speed;
        const liveMatch = isLiveSync ? liveMap.get(node.obj.id) : undefined;

        if (liveMatch && cfg.scale === 'earth-l2' && !cfg.isL2Halo && !cfg.isL1Halo && cfg.center === 'earth') {
          // Real-time SGP4 geodetic coordinates mapped accurately onto NASA Blue Marble globe!
          const rVisual = 2.8 + Math.min(3.8, Math.max(0.5, (liveMatch.altitudeKm / 6371) * 2.8));
          node.group.position.copy(geodeticToSceneVec3(liveMatch.latitude, liveMatch.longitude, rVisual));
          node.group.lookAt(0, 0, 0);
        } else if (cfg.isL2Halo) {
          node.group.position.set(17.5 + Math.cos(a * 2) * 0.45, Math.sin(a) * 2.2, Math.cos(a) * 2.7);
          node.group.rotation.y = -a + Math.PI / 2;
        } else if (cfg.isL1Halo) {
          node.group.position.set(-16.5 + Math.cos(a * 2) * 0.35, Math.sin(a) * 1.8, Math.cos(a) * 2.2);
          node.group.rotation.y = -a + Math.PI / 2;
        } else if (cfg.center === 'moon') {
          moonMesh.getWorldPosition(_vec3);
          node.group.position.set(
            _vec3.x + Math.cos(a) * cfg.radius * 0.5,
            Math.sin(a) * cfg.radius * 0.9,
            _vec3.z + Math.sin(a) * cfg.radius * 0.5,
          );
          node.group.rotation.y = -a + Math.PI / 2;
        } else {
          const inc = THREE.MathUtils.degToRad(cfg.inclinationDeg);
          solveKeplerPosition(cfg.radius, cfg.eccentricity, inc, a, node.group.position);
          node.group.rotation.y = -a + Math.PI / 2;
        }
      }

      // Camera smooth transitions
      if (resetViewRequestedRef.current) {
        const distPreset =
          curScale === 'earth-l2'
            ? 28
            : curScale === 'inner-solar'
              ? 32
              : curScale === 'outer-solar'
                ? 52
                : curScale === 'galaxy'
                  ? 58
                  : 76;
        _targetVec3.set(0, 0, 0);
        _camGoal.set(distPreset * 0.65, distPreset * 0.48, distPreset * 0.78);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetVec3.x, 5.5, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetVec3.y, 5.5, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetVec3.z, 5.5, delta);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoal.x, 5.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoal.y, 5.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoal.z, 5.5, delta);
        if (camera.position.distanceTo(_camGoal) < 0.25) resetViewRequestedRef.current = false;
      } else if (flyTargetNode && flyTargetNode.obj.orbitConfig.scale === curScale) {
        _targetVec3.copy(flyTargetNode.group.position);
        _camGoal.set(_targetVec3.x + 3.8, _targetVec3.y + 2.4, _targetVec3.z + 4.4);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetVec3.x, 5.5, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetVec3.y, 5.5, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetVec3.z, 5.5, delta);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoal.x, 5.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoal.y, 5.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoal.z, 5.5, delta);
        if (camera.position.distanceTo(_camGoal) < 0.15) flyToIdRef.current = null;
      } else if (flyBodyNode && flyBodyNode.body.atlasScale === curScale) {
        flyBodyNode.mesh.getWorldPosition(_targetVec3);
        _camGoal.set(_targetVec3.x + 5.2, _targetVec3.y + 3.2, _targetVec3.z + 5.8);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetVec3.x, 5.5, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetVec3.y, 5.5, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetVec3.z, 5.5, delta);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoal.x, 5.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoal.y, 5.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoal.z, 5.5, delta);
        if (camera.position.distanceTo(_camGoal) < 0.25) flyToBodyIdRef.current = null;
      }

      controls.update();
      if (composer) composer.render();
      else renderer.render(scene, camera);

      const viewW = outer?.clientWidth || width;
      const viewH = outer?.clientHeight || height;

      // Update projected spacecraft labels
      for (const node of spacecraftNodes) {
        const el = labelRefs.current[node.obj.id];
        if (!el) continue;
        if (node.obj.orbitConfig.scale !== curScale || !node.group.visible) {
          el.style.display = 'none';
          continue;
        }
        _projVec.copy(node.group.position);
        _projVec.y += 0.85;
        _projVec.project(camera);
        if (_projVec.z > 1 || _projVec.z < -1) {
          el.style.display = 'none';
          continue;
        }
        const sx = ((_projVec.x + 1) * 0.5) * viewW;
        const sy = ((-_projVec.y + 1) * 0.5) * viewH;
        if (sx < 16 || sx > viewW - 16 || sy < 16 || sy > viewH - 96) {
          el.style.display = 'none';
          continue;
        }
        el.style.display = 'inline-flex';
        el.style.opacity = node.launchYear <= curEpochFloor ? '1' : '0.45';
        el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%)`;
      }

      // Update projected planet / asteroid / star labels
      for (const bNode of bodyNodes) {
        const el = bodyLabelRefs.current[bNode.body.id];
        if (!el) continue;
        if (bNode.body.atlasScale !== curScale) {
          el.style.display = 'none';
          continue;
        }
        bNode.mesh.getWorldPosition(_projVec);
        _projVec.y += bNode.body.id === 'earth' ? 3.2 : 1.15;
        _projVec.project(camera);
        if (_projVec.z > 1 || _projVec.z < -1) {
          el.style.display = 'none';
          continue;
        }
        const sx = ((_projVec.x + 1) * 0.5) * viewW;
        const sy = ((-_projVec.y + 1) * 0.5) * viewH;
        if (sx < 16 || sx > viewW - 16 || sy < 16 || sy > viewH - 96) {
          el.style.display = 'none';
          continue;
        }
        el.style.display = 'inline-flex';
        el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%)`;
      }

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', handleControlsStart);
      controls.dispose();
      composer?.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      envTex.dispose();
      glowTex.dispose();
      const safeDispose = (t?: THREE.Texture | null) => {
        if (t && !t.userData?.isSharedTexture) t.dispose();
      };
      safeDispose(earthBundle.map);
      safeDispose(earthBundle.bumpMap);
      safeDispose(earthBundle.normalMap);
      safeDispose(earthBundle.roughnessMap);
      safeDispose(earthBundle.cloudMap);
      safeDispose(earthBundle.emissiveMap);
      safeDispose(moonBundle.map);
      safeDispose(moonBundle.bumpMap);
      safeDispose(moonBundle.normalMap);
      for (const tex of disposableTextures) safeDispose(tex);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [objects, celestialBodies]);

  const stepScale = (dir: -1 | 1) => {
    const idx = SCALE_ORDER.indexOf(activeScale);
    const nextIdx = Math.max(0, Math.min(SCALE_ORDER.length - 1, idx + dir));
    onScaleChange(SCALE_ORDER[nextIdx]);
  };

  const focusPreset = (id: string, targetScale: ExtendedAtlasScale) => {
    const obj = objects.find((o) => o.id === id);
    if (obj) {
      if (activeScale !== targetScale) onScaleChange(targetScale);
      onSelectObject(obj);
      flyToIdRef.current = obj.id;
      return;
    }
    const body = celestialBodies.find((b) => b.id === id);
    if (body) {
      if (activeScale !== targetScale) onScaleChange(targetScale);
      onSelectCelestialBody(body);
      flyToBodyIdRef.current = body.id;
    }
  };

  const scaleTitle =
    activeScale === 'earth-l2'
      ? 'Earth System & Sun-Earth L1/L2'
      : activeScale === 'inner-solar'
        ? 'Inner Solar System, The Sun, Mars, Bennu & 67P'
        : activeScale === 'outer-solar'
          ? 'Outer Planets, Ceres & Interstellar Space'
          : activeScale === 'galaxy'
            ? 'Milky Way Galaxy (TRAPPIST-1, Kepler-452, Tau Ceti, Sgr A*)'
            : 'Observable Universe (Local Group, Andromeda M31, Laniakea, CMB)';

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[600px] lg:h-[680px] bg-[#04060B] border border-slate-800 rounded-lg overflow-hidden select-none"
    >
      <div ref={canvasMountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {webglError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#07090E] p-8 text-center">
          <p className="text-base font-medium text-slate-200">{webglError}</p>
          <p className="mt-2 text-sm text-slate-400 max-w-md">
            Use the 3D Surface Explorer, Launch Archive, and Live Feeds below to explore.
          </p>
        </div>
      )}

      {/* Top-Left Legend, Epoch Telemetry & Direct Planet Surface Inspect CTA */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-[#0B0F17]/95 border border-slate-800 rounded-md px-3 py-2 pointer-events-auto">
            <p className="text-xs font-medium text-slate-200">{scaleTitle}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click any spacecraft, planet, sun, exoplanet, or extragalactic cluster
            </p>
          </div>

          <div className="bg-[#0B0F17]/95 border border-slate-800 rounded-md px-3 py-2">
            <p className="text-[11px] text-slate-400">
              Epoch · <span className="text-slate-300">{getEpochEraLabel(epochYear)}</span>
            </p>
            <p className="text-sm font-mono font-semibold text-amber-300 tabular-nums mt-0.5">
              {formatEpochDate(epochYear)}{' '}
              <span className="text-[11px] font-normal text-slate-400">
                ({activeAtEpochCount}/{objects.length} active missions)
              </span>
            </p>
          </div>
        </div>

        {selectedBodyObj && (
          <button
            type="button"
            onClick={() => onInspectBodySurface(selectedBodyObj)}
            className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>
              {selectedBodyObj.systemPlanets && selectedBodyObj.systemPlanets.length > 0
                ? `Explore ${selectedBodyObj.name} System & Habitable Zone`
                : selectedBodyObj.landmarks.length > 0
                  ? `Explore ${selectedBodyObj.name} Surface & Features`
                  : `Inspect ${selectedBodyObj.name} in 3D`}
            </span>
          </button>
        )}
      </div>

      {/* Projected Spacecraft Labels */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        {objects.map((obj) => {
          const isSelected = obj.id === selectedId;
          return (
            <button
              key={obj.id}
              ref={(el) => {
                labelRefs.current[obj.id] = el;
              }}
              type="button"
              onClick={() => {
                onSelectObject(obj);
                flyToIdRef.current = obj.id;
              }}
              style={{ display: 'none', top: 0, left: 0 }}
              className={`pointer-events-auto absolute items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition-colors border ${
                isSelected
                  ? 'bg-cyan-500 text-slate-950 border-cyan-300 z-20'
                  : 'bg-[#0B0F17]/90 text-slate-200 border-slate-700 hover:border-cyan-400 hover:text-white'
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: isSelected ? '#020617' : obj.orbitConfig.color }}
              />
              <span>{obj.shortName}</span>
            </button>
          );
        })}

        {/* Projected Planet, Asteroid (Bennu / 67P), and Star Labels */}
        {celestialBodies.map((body) => {
          const isSelected = body.id === selectedBodyId;
          return (
            <button
              key={`body-${body.id}`}
              ref={(el) => {
                bodyLabelRefs.current[body.id] = el;
              }}
              type="button"
              onClick={() => {
                onSelectCelestialBody(body);
                flyToBodyIdRef.current = body.id;
              }}
              style={{ display: 'none', top: 0, left: 0 }}
              className={`pointer-events-auto absolute items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition-colors border ${
                isSelected
                  ? 'bg-amber-400 text-slate-950 border-amber-200 z-20'
                  : 'bg-[#0B0F17]/90 text-amber-200 border-amber-500/40 hover:border-amber-400'
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: isSelected ? '#020617' : body.accentColor }}
              />
              <span>{body.name}</span>
            </button>
          );
        })}
      </div>

      {/* Collapsible Bottom Control Dock */}
      <div
        className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[min(1040px,96%)] transition-transform duration-200 ${
          dockCollapsed ? 'translate-y-[calc(100%-24px)]' : 'translate-y-0'
        }`}
      >
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setDockCollapsed((c) => !c)}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0E131D] border border-b-0 border-slate-700 rounded-t-md text-[11px] font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" /> Show Controls
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" /> Hide Controls
              </>
            )}
          </button>
        </div>

        <div className="bg-[#0B0F17]/95 border border-slate-700 rounded-lg px-3 py-2.5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Scale Switcher + Step Zoom */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => stepScale(-1)}
                disabled={activeScale === 'earth-l2'}
                className="p-1.5 rounded border border-slate-700 bg-[#07090E] text-slate-300 hover:text-white disabled:opacity-40"
                title="Zoom In Scale"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1 bg-[#07090E] p-1 rounded-md border border-slate-800">
                {(
                  [
                    { id: 'earth-l2', label: 'Earth & L2' },
                    { id: 'inner-solar', label: 'Inner Solar' },
                    { id: 'outer-solar', label: 'Outer Solar' },
                    { id: 'galaxy', label: 'Milky Way' },
                    { id: 'universe', label: 'Universe' },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onScaleChange(s.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      activeScale === s.id
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => stepScale(1)}
                disabled={activeScale === 'universe'}
                className="p-1.5 rounded border border-slate-700 bg-[#07090E] text-slate-300 hover:text-white disabled:opacity-40"
                title="Zoom Out Toward Observable Universe"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Simulation Speedup Multipliers & Live UTC Sync */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setLiveUtcSync(true);
                  setTimeScale(1);
                  onEpochYearChange(Number(getCurrentEpochYear().toFixed(3)));
                }}
                className={`px-2 py-1 text-xs font-mono rounded border transition-colors whitespace-nowrap ${
                  liveUtcSync
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200 font-semibold'
                    : 'border-slate-700 bg-[#07090E] text-slate-300 hover:border-emerald-400/70'
                }`}
                title="Lock 3D planets & Earth orbiters to real-time astronomical UTC positions"
              >
                Live UTC
              </button>
              <button
                type="button"
                onClick={() => setTimeScale((prev) => (prev === 0 ? 1 : 0))}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-slate-700 bg-[#07090E] text-slate-200 hover:border-slate-500 whitespace-nowrap"
              >
                {timeScale === 0 ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                <span>{timeScale === 0 ? 'Paused' : 'Play'}</span>
              </button>
              {[1, 10, 100, 1000].map((mult) => (
                <button
                  key={mult}
                  type="button"
                  onClick={() => {
                    setLiveUtcSync(false);
                    setTimeScale(mult);
                  }}
                  className={`inline-flex items-center gap-0.5 px-2 py-1 text-xs font-mono rounded border transition-colors whitespace-nowrap ${
                    !liveUtcSync && timeScale === mult
                      ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                      : 'border-slate-700 bg-[#07090E] text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {mult > 1 && <FastForward className="w-3 h-3" />}
                  <span>{mult}×</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  flyToIdRef.current = null;
                  flyToBodyIdRef.current = null;
                  resetViewRequestedRef.current = true;
                  setLiveUtcSync(true);
                  setTimeScale(1);
                  onEpochYearChange(Number(getCurrentEpochYear().toFixed(3)));
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-slate-700 bg-[#07090E] text-slate-300 hover:border-slate-500 hover:text-white whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Row 2: Quick Jump */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 mr-0.5 whitespace-nowrap">Quick Jump:</span>
              {[
                { id: 'roman', label: 'Roman (L2)', scale: 'earth-l2' as ExtendedAtlasScale },
                { id: 'sun', label: 'The Sun', scale: 'inner-solar' as ExtendedAtlasScale },
                { id: 'mars', label: 'Mars', scale: 'inner-solar' as ExtendedAtlasScale },
                { id: 'bennu', label: 'Bennu', scale: 'inner-solar' as ExtendedAtlasScale },
                { id: 'trappist-1', label: 'TRAPPIST-1', scale: 'galaxy' as ExtendedAtlasScale },
                { id: 'kepler-452', label: 'Kepler-452', scale: 'galaxy' as ExtendedAtlasScale },
                { id: 'tau-ceti', label: 'Tau Ceti', scale: 'galaxy' as ExtendedAtlasScale },
                { id: 'andromeda-m31', label: 'Andromeda M31', scale: 'universe' as ExtendedAtlasScale },
                { id: 'laniakea-attractor', label: 'Laniakea', scale: 'universe' as ExtendedAtlasScale },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => focusPreset(item.id, item.scale)}
                  className="px-2 py-0.5 text-[11px] font-medium rounded border border-slate-700 bg-[#07090E] text-slate-300 hover:border-cyan-400 hover:text-white transition-colors whitespace-nowrap"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setEpochFilterOnly((v) => !v)}
              className={`px-2 py-0.5 text-[11px] font-medium rounded border transition-colors whitespace-nowrap ${
                epochFilterOnly
                  ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                  : 'border-slate-700 bg-[#07090E] text-slate-300 hover:border-slate-500'
              }`}
            >
              {epochFilterOnly ? 'Epoch Filter: Launched Only' : 'Epoch Filter: Show All'}
            </button>
          </div>

          {/* Row 3: Epoch Time Machine Scrubber + Milestones */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[11px] text-slate-400 mr-1 whitespace-nowrap">Epoch Era:</span>
              {EPOCH_PRESETS.map((preset) => {
                const isClose = Math.abs(epochYear - preset.year) < 0.75;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setLiveUtcSync(false);
                      onEpochYearChange(preset.year);
                    }}
                    className={`px-2 py-0.5 text-[11px] font-mono rounded border transition-colors whitespace-nowrap ${
                      isClose
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                        : 'border-slate-800 bg-[#07090E] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="range"
                aria-label="Simulation epoch year"
                min={1969}
                max={2045}
                step={0.1}
                value={epochYear}
                onChange={(e) => {
                  setLiveUtcSync(false);
                  onEpochYearChange(Number(e.target.value));
                }}
                className="w-32 accent-amber-400"
              />
              <span className="text-[11px] font-mono text-amber-300 tabular-nums whitespace-nowrap">
                {formatEpochDate(epochYear)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
