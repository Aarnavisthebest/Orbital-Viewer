import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  Compass,
  Crosshair,
  Orbit,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  ZoomIn,
} from 'lucide-react';
import type { CelestialBody, SurfaceLandmark, SystemPlanetSpec } from '../data/celestialBodies';
import {
  createCelestialPreviewGroup,
  createDeepSpaceDome,
  createStarSystemModel,
  latLonToVector3,
} from '../three/proceduralAssets';
import { getLiveBodyEphemeris } from '../utils/ephemeris';

interface CelestialBodyViewerProps {
  bodies: CelestialBody[];
  selectedBody: CelestialBody;
  onSelectBody: (body: CelestialBody) => void;
  onLocateIn3DAtlas: (body: CelestialBody) => void;
  onAskAiAboutBody: (
    body: CelestialBody,
    landmark?: SurfaceLandmark | null,
    systemPlanet?: SystemPlanetSpec | null,
  ) => void;
}

const _worldPos = new THREE.Vector3();
const _projVec = new THREE.Vector3();
const _camNormal = new THREE.Vector3();
const _pinNormal = new THREE.Vector3();
const _camGoal = new THREE.Vector3();
const _targetGoal = new THREE.Vector3();

function detectSoftwareGl(): boolean {
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

const SPECTRAL_BANDS = [
  { cls: 'O', color: '#60A5FA', label: '30,000+ K' },
  { cls: 'B', color: '#93C5FD', label: '15,000 K' },
  { cls: 'A', color: '#E0F2FE', label: '9,000 K' },
  { cls: 'F', color: '#FEF9C3', label: '6,800 K' },
  { cls: 'G', color: '#FDE047', label: '5,700 K' },
  { cls: 'K', color: '#FB923C', label: '4,200 K' },
  { cls: 'M', color: '#EF4444', label: '3,000 K' },
];

export const CelestialBodyViewer: React.FC<CelestialBodyViewerProps> = ({
  bodies,
  selectedBody,
  onSelectBody,
  onLocateIn3DAtlas,
  onAskAiAboutBody,
}) => {
  const [filterType, setFilterType] = useState<
    'All' | 'Planet' | 'Exoplanet' | 'Asteroid' | 'Star' | 'Universe'
  >('All');
  const [viewMode, setViewMode] = useState<'surface' | 'system'>(
    selectedBody.systemPlanets && selectedBody.systemPlanets.length > 0 ? 'system' : 'surface',
  );
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string | null>(
    selectedBody.landmarks[0]?.id ?? null,
  );
  const [selectedSystemPlanetId, setSelectedSystemPlanetId] = useState<string | null>(
    selectedBody.systemPlanets?.find((p) => p.inHabitableZone)?.id ??
      selectedBody.systemPlanets?.[0]?.id ??
      null,
  );
  const [isSpinning, setIsSpinning] = useState<boolean>(true);
  const [isZoomedToLandmark, setIsZoomedToLandmark] = useState<boolean>(false);
  const [imgFailed, setImgFailed] = useState<boolean>(false);
  const [ephemTick, setEphemTick] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setEphemTick(Date.now()), 2000);
    return () => window.clearInterval(id);
  }, []);

  const liveEphem = getLiveBodyEphemeris(selectedBody.id, new Date(ephemTick));

  const mountRef = useRef<HTMLDivElement>(null);
  const stageWrapperRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const previewGroupRef = useRef<THREE.Group | null>(null);
  const maxAnisotropyRef = useRef<number>(1);
  const landmarkLabelRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const selectedBodyRef = useRef<CelestialBody>(selectedBody);
  const viewModeRef = useRef<'surface' | 'system'>(viewMode);
  const selectedLandmarkIdRef = useRef<string | null>(selectedLandmarkId);
  const isSpinningRef = useRef<boolean>(isSpinning);
  const flyToLandmarkIdRef = useRef<string | null>(null);
  const resetOverviewRef = useRef<boolean>(false);

  const landmarkPinListRef = useRef<
    Array<{ landmark: SurfaceLandmark; pinGroup: THREE.Group; hitProxy: THREE.Mesh; ring: THREE.Mesh }>
  >([]);

  const selectedLandmark =
    selectedBody.landmarks.find((l) => l.id === selectedLandmarkId) || null;
  const hasSystem = Boolean(selectedBody.systemPlanets && selectedBody.systemPlanets.length > 0);
  const selectedSystemPlanet =
    selectedBody.systemPlanets?.find((p) => p.id === selectedSystemPlanetId) || null;

  // Reset landmark & system selection cleanly whenever user switches planet/star/galaxy
  useEffect(() => {
    selectedBodyRef.current = selectedBody;
    const nextHasSystem = Boolean(selectedBody.systemPlanets && selectedBody.systemPlanets.length > 0);
    const nextMode: 'surface' | 'system' = nextHasSystem ? 'system' : 'surface';
    setViewMode(nextMode);
    viewModeRef.current = nextMode;

    const firstLandmark = selectedBody.landmarks[0]?.id ?? null;
    setSelectedLandmarkId(firstLandmark);
    selectedLandmarkIdRef.current = firstLandmark;

    const defaultSysPlanet =
      selectedBody.systemPlanets?.find((p) => p.inHabitableZone)?.id ??
      selectedBody.systemPlanets?.[0]?.id ??
      null;
    setSelectedSystemPlanetId(defaultSysPlanet);

    flyToLandmarkIdRef.current = null;
    resetOverviewRef.current = true;
    setIsZoomedToLandmark(false);
    setIsSpinning(true);
    isSpinningRef.current = true;
    setImgFailed(false);
  }, [selectedBody]);

  useEffect(() => {
    viewModeRef.current = viewMode;
    flyToLandmarkIdRef.current = null;
    resetOverviewRef.current = true;
  }, [viewMode]);

  useEffect(() => {
    selectedLandmarkIdRef.current = selectedLandmarkId;
  }, [selectedLandmarkId]);

  useEffect(() => {
    isSpinningRef.current = isSpinning;
  }, [isSpinning]);

  const handleZoomToLandmark = (landmark: SurfaceLandmark) => {
    setViewMode('surface');
    viewModeRef.current = 'surface';
    setSelectedLandmarkId(landmark.id);
    selectedLandmarkIdRef.current = landmark.id;
    setIsSpinning(false);
    isSpinningRef.current = false;
    setIsZoomedToLandmark(true);
    flyToLandmarkIdRef.current = landmark.id;
    resetOverviewRef.current = false;
  };

  const handleResetOverview = () => {
    setIsZoomedToLandmark(false);
    setIsSpinning(true);
    isSpinningRef.current = true;
    flyToLandmarkIdRef.current = null;
    resetOverviewRef.current = true;
  };

  const filteredBodies = bodies.filter((b) => {
    if (filterType === 'All') return true;
    if (filterType === 'Planet') return b.type === 'Planet' || b.type === 'Moon';
    if (filterType === 'Exoplanet') return b.type === 'Exoplanet';
    if (filterType === 'Asteroid') return b.type === 'Asteroid' || b.type === 'Comet';
    if (filterType === 'Universe') return b.type === 'Galaxy' || b.type === 'Cosmic Structure';
    return b.type === 'Star' || b.type === 'Galactic Core';
  });

  // Helper to attach surface landmark pins directly onto the rotating preview group
  const populateLandmarkPins = (group: THREE.Group, body: CelestialBody) => {
    landmarkPinListRef.current = [];
    const pinRadius =
      body.visualKind === 'comet-67p' || body.visualKind === 'bennu' || body.visualKind === 'psyche'
        ? 1.18
        : body.visualKind === 'blackhole'
          ? 1.45
          : body.visualKind === 'cosmic-web'
            ? 1.68
            : body.visualKind === 'galaxy-spiral'
              ? 1.54
              : 1.41;

    for (const lm of body.landmarks) {
      const pos = latLonToVector3(lm.lat, lm.lon, pinRadius);
      const normal = pos.clone().normalize();
      const pinGroup = new THREE.Group();
      pinGroup.position.copy(pos);
      pinGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

      const accent = new THREE.Color(lm.color || body.accentColor);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.052, 0.082, 24),
        new THREE.MeshBasicMaterial({
          color: accent,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.94,
        }),
      );
      ring.position.z = 0.015;
      pinGroup.add(ring);

      const outerReticle = new THREE.Mesh(
        new THREE.RingGeometry(0.11, 0.125, 24),
        new THREE.MeshBasicMaterial({
          color: accent,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.42,
        }),
      );
      outerReticle.position.z = 0.014;
      pinGroup.add(outerReticle);

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
      );
      dot.position.z = 0.018;
      pinGroup.add(dot);

      const hitProxy = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 10, 8),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hitProxy.userData.landmark = lm;
      pinGroup.add(hitProxy);

      group.add(pinGroup);
      landmarkPinListRef.current.push({ landmark: lm, pinGroup, hitProxy, ring });
    }
  };

  // Initialize single stable WebGL inspector renderer
  useEffect(() => {
    const mount = mountRef.current;
    const wrapper = stageWrapperRef.current;
    if (!mount || !wrapper) return;
    const isSoftwareGl = detectSoftwareGl();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    const w = mount.clientWidth || 440;
    const h = mount.clientHeight || 380;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    mount.appendChild(renderer.domElement);

    maxAnisotropyRef.current = renderer.capabilities.getMaxAnisotropy();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070c);
    sceneRef.current = scene;

    const skyDome = createDeepSpaceDome(48);
    scene.add(skyDome);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 120);
    camera.position.set(0, 1.1, 4.35);

    let composer: EffectComposer | null = null;
    if (!isSoftwareGl) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.34, 0.45, 0.82);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.minDistance = 1.72;
    controls.maxDistance = 8.5;

    const handleControlStart = () => {
      flyToLandmarkIdRef.current = null;
      resetOverviewRef.current = false;
    };
    controls.addEventListener('start', handleControlStart);

    // Three-point calibrated space studio rig + background micro-starfield
    const key = new THREE.DirectionalLight(0xfff5e4, 2.75);
    key.position.set(6, 3.2, 4.5);
    scene.add(key);

    const fill = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.55);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0x38bdf8, 0.75);
    rim.position.set(-5, -2.5, -4);
    scene.add(rim);

    // Subtle deep-space micro starfield in globe inspector
    const starCount = 320;
    const starGeo = new THREE.OctahedronGeometry(0.055, 0);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xcbd5e1 });
    const bgStars = new THREE.InstancedMesh(starGeo, starMat, starCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < starCount; i++) {
      const r = 18 + (i % 16);
      const theta = (i * 2.39996) % (Math.PI * 2);
      const phi = Math.acos(2 * ((i % 67) / 67) - 1);
      dummy.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta),
      );
      const s = 0.45 + (i % 4) * 0.25;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      bgStars.setMatrixAt(i, dummy.matrix);
    }
    bgStars.instanceMatrix.needsUpdate = true;
    bgStars.computeBoundingSphere();
    scene.add(bgStars);

    const initialIsSystem =
      viewModeRef.current === 'system' &&
      Boolean(selectedBodyRef.current.systemPlanets && selectedBodyRef.current.systemPlanets.length > 0);
    const preview = initialIsSystem
      ? createStarSystemModel(selectedBodyRef.current)
      : createCelestialPreviewGroup(
          selectedBodyRef.current.visualKind,
          maxAnisotropyRef.current,
        );
    if (!initialIsSystem) {
      populateLandmarkPins(preview, selectedBodyRef.current);
    } else {
      landmarkPinListRef.current = [];
    }
    previewGroupRef.current = preview;
    scene.add(preview);

    // Raycast directly onto 3D surface crater/landmark pins OR orbiting exoplanet proxies
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downPos = { x: 0, y: 0 };

    const onPointerDown = (ev: PointerEvent) => {
      downPos = { x: ev.clientX, y: ev.clientY };
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (Math.hypot(ev.clientX - downPos.x, ev.clientY - downPos.y) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const sysProxies: THREE.Object3D[] = [];
      previewGroupRef.current?.traverse((child) => {
        if (child.userData?.systemPlanet) sysProxies.push(child);
      });
      if (sysProxies.length > 0) {
        const sysHits = raycaster.intersectObjects(sysProxies, false);
        if (sysHits.length > 0 && sysHits[0].object.userData.systemPlanet) {
          const sp = sysHits[0].object.userData.systemPlanet as SystemPlanetSpec;
          setSelectedSystemPlanetId(sp.id);
          return;
        }
      }

      const proxies = landmarkPinListRef.current.map((p) => p.hitProxy);
      const hits = raycaster.intersectObjects(proxies, false);
      if (hits.length > 0 && hits[0].object.userData.landmark) {
        const lm = hits[0].object.userData.landmark as SurfaceLandmark;
        handleZoomToLandmark(lm);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      if (!mount) return;
      const nw = mount.clientWidth || 440;
      const nh = mount.clientHeight || 380;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      composer?.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    let disposed = false;
    let frameId = 0;
    let lastTime = performance.now();
    let elapsedTotal = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const st =
          sync && gl.getSyncParameter ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (st === gl.UNSIGNALED) {
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
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      elapsedTotal += dt;

      const grp = previewGroupRef.current;
      if (grp) {
        if (isSpinningRef.current && viewModeRef.current !== 'system') {
          grp.rotation.y += dt * 0.22;
        }
        // Slowly drift Earth/Exoplanet clouds independently if present
        grp.traverse((child) => {
          if (child.userData?.isCloudLayer) {
            child.rotation.y += dt * 0.045;
          }
        });
        if (typeof grp.userData.updateTime === 'function') {
          grp.userData.updateTime(elapsedTotal);
        }
      }

      // Smooth camera zoom onto clicked surface landmark (crater, volcano, canyon)
      if (flyToLandmarkIdRef.current) {
        const pinObj = landmarkPinListRef.current.find(
          (p) => p.landmark.id === flyToLandmarkIdRef.current,
        );
        if (pinObj) {
          pinObj.pinGroup.getWorldPosition(_worldPos);
          _pinNormal.copy(_worldPos).normalize();
          _targetGoal.copy(_pinNormal).multiplyScalar(0.82);

          // Offset polar landmarks slightly off straight-up vector to avoid OrbitControls gimbal lock
          _camGoal.copy(_pinNormal).multiplyScalar(2.38);
          if (Math.abs(_pinNormal.y) > 0.94) {
            _camGoal.z += 0.35;
          }

          controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetGoal.x, 6.5, dt);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetGoal.y, 6.5, dt);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetGoal.z, 6.5, dt);
          camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoal.x, 6.5, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoal.y, 6.5, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoal.z, 6.5, dt);

          if (camera.position.distanceTo(_camGoal) < 0.04) {
            flyToLandmarkIdRef.current = null;
          }
        }
      } else if (resetOverviewRef.current) {
        const goalY = viewModeRef.current === 'system' ? 2.5 : 1.1;
        const goalZ = viewModeRef.current === 'system' ? 4.35 : 4.35;
        controls.target.x = THREE.MathUtils.damp(controls.target.x, 0, 6.0, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, 0, 6.0, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, 0, 6.0, dt);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, 6.0, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, goalY, 6.0, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, goalZ, 6.0, dt);
        if (camera.position.distanceTo(_camGoal.set(0, goalY, goalZ)) < 0.05) {
          resetOverviewRef.current = false;
        }
      }

      controls.update();
      if (composer) composer.render();
      else renderer.render(scene, camera);

      // Update projected surface landmark labels (visible only on camera-facing hemisphere)
      const viewW = mount?.clientWidth || w;
      const viewH = mount?.clientHeight || h;
      _camNormal.copy(camera.position).sub(controls.target).normalize();

      for (const item of landmarkPinListRef.current) {
        const isSel = item.landmark.id === selectedLandmarkIdRef.current;
        item.ring.scale.setScalar(isSel ? 1.38 : 1.0);

        const el = landmarkLabelRefs.current[item.landmark.id];
        if (!el) continue;

        item.pinGroup.getWorldPosition(_worldPos);
        _pinNormal.copy(_worldPos).normalize();
        const facingDot = _pinNormal.dot(_camNormal);

        if (facingDot < 0.14) {
          el.style.display = 'none';
          continue;
        }

        _projVec.copy(_worldPos);
        _projVec.project(camera);
        if (_projVec.z > 1 || _projVec.z < -1) {
          el.style.display = 'none';
          continue;
        }

        const sx = ((_projVec.x + 1) * 0.5) * viewW;
        const sy = ((-_projVec.y + 1) * 0.5) * viewH;
        if (sx < 12 || sx > viewW - 12 || sy < 14 || sy > viewH - 14) {
          el.style.display = 'none';
          continue;
        }

        el.style.display = 'inline-flex';
        el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -125%)`;
      }

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      controls.removeEventListener('start', handleControlStart);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      composer?.dispose();
      envTex.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Swap 3D preview geometry cleanly when user switches world/star, view mode, or highlighted planet
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (previewGroupRef.current) {
      scene.remove(previewGroupRef.current);
      previewGroupRef.current.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          const disposeTex = (tex?: THREE.Texture | null) => {
            if (tex && !tex.userData?.isSharedTexture) tex.dispose();
          };
          const disposeMat = (mat: THREE.Material) => {
            const std = mat as THREE.MeshStandardMaterial;
            disposeTex(std.map);
            disposeTex(std.bumpMap);
            disposeTex(std.normalMap);
            disposeTex(std.roughnessMap);
            disposeTex(std.emissiveMap);
            mat.dispose();
          };
          if (Array.isArray(m.material)) m.material.forEach(disposeMat);
          else disposeMat(m.material);
        }
      });
    }
    const showSystem =
      viewMode === 'system' &&
      Boolean(selectedBody.systemPlanets && selectedBody.systemPlanets.length > 0);
    const nextGroup = showSystem
      ? createStarSystemModel(selectedBody, selectedSystemPlanetId)
      : createCelestialPreviewGroup(selectedBody.visualKind, maxAnisotropyRef.current);

    if (showSystem) {
      landmarkPinListRef.current = [];
    } else {
      populateLandmarkPins(nextGroup, selectedBody);
    }
    previewGroupRef.current = nextGroup;
    scene.add(nextGroup);
  }, [selectedBody, viewMode, selectedSystemPlanetId]);

  // Compute star marker position along Harvard O-B-A-F-G-K-M spectral scale (0% left hot -> 100% right cool)
  const getTempMarkerPercent = (tempK: number): number => {
    const logT = Math.log10(Math.max(2200, Math.min(35000, tempK)));
    const minL = Math.log10(2200);
    const maxL = Math.log10(35000);
    return Math.round(((maxL - logT) / (maxL - minL)) * 100);
  };

  return (
    <section id="celestial-worlds" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <p className="text-xs font-mono text-cyan-400 tracking-wide">
            3D Planetary, Habitable Exoplanet, Star System & Extragalactic Observatory
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-100 mt-1">
            Explore Planets, TRAPPIST-1 / Kepler-452 Habitable Systems & Andromeda
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(['All', 'Planet', 'Exoplanet', 'Asteroid', 'Star', 'Universe'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterType(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                filterType === tab
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                  : 'bg-[#0E131D] text-slate-300 border-slate-800 hover:border-slate-600'
              }`}
            >
              {tab === 'All'
                ? 'All Worlds'
                : tab === 'Planet'
                  ? 'Planets & Moon'
                  : tab === 'Exoplanet'
                    ? 'Habitable Exoplanets'
                    : tab === 'Asteroid'
                      ? 'Asteroids & Comets'
                      : tab === 'Star'
                        ? 'Stars & Systems'
                        : 'Observable Universe'}
            </button>
          ))}
        </div>
      </div>

      {/* Selector Strip */}
      <div className="flex flex-wrap items-center gap-1.5">
        {filteredBodies.map((body) => {
          const active = body.id === selectedBody.id;
          return (
            <button
              key={body.id}
              type="button"
              onClick={() => onSelectBody(body)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                  : 'border-slate-800 bg-[#0E131D] text-slate-300 hover:border-slate-600 hover:text-white'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: body.accentColor }}
              />
              <span>{body.name}</span>
            </button>
          );
        })}
      </div>

      {/* 2-Column 3D Globe / Star System + Landmarks & Telemetry Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Interactive 3D Planet / Crater Zoom / Star System Stage */}
        <div
          ref={stageWrapperRef}
          className="lg:col-span-6 bg-[#05070C] border border-slate-800 rounded-lg overflow-hidden flex flex-col"
        >
          <div className="px-4 py-3 border-b border-slate-800 bg-[#0E131D] flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs text-slate-400">
                {selectedBody.type} <span aria-hidden="true">·</span> {selectedBody.designation}
              </p>
              <h3 className="text-base font-semibold text-slate-100">{selectedBody.name}</h3>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {hasSystem && (
                <div className="flex items-center bg-[#07090E] border border-slate-800 rounded p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('system')}
                    className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                      viewMode === 'system'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Orbit className="w-3 h-3" />
                    <span>3D System & HZ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('surface')}
                    className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                      viewMode === 'surface'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Star Close-Up
                  </button>
                </div>
              )}

              {viewMode !== 'system' && (
                <button
                  type="button"
                  onClick={() => setIsSpinning((prev) => !prev)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border border-slate-700 bg-[#07090E] text-slate-200 hover:border-slate-500 whitespace-nowrap"
                >
                  {isSpinning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isSpinning ? 'Pause Spin' : 'Spin'}</span>
                </button>
              )}
              {isZoomedToLandmark && (
                <button
                  type="button"
                  onClick={handleResetOverview}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border border-cyan-500/50 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25 whitespace-nowrap"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Overview</span>
                </button>
              )}
            </div>
          </div>

          <div className="relative flex-1 min-h-[380px]">
            <div
              ref={mountRef}
              className="w-full h-full min-h-[380px] cursor-grab active:cursor-grabbing"
            />

            {/* Projected Clickable Crater / Surface Landmark Labels */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
              {selectedBody.landmarks.map((lm) => {
                const isSel = lm.id === selectedLandmarkId;
                return (
                  <button
                    key={lm.id}
                    ref={(el) => {
                      landmarkLabelRefs.current[lm.id] = el;
                    }}
                    type="button"
                    onClick={() => handleZoomToLandmark(lm)}
                    style={{ display: 'none', top: 0, left: 0 }}
                    className={`pointer-events-auto absolute items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap border transition-colors ${
                      isSel
                        ? 'bg-cyan-500 text-slate-950 border-cyan-200 z-20'
                        : 'bg-[#0B0F17]/95 text-slate-100 border-slate-700 hover:border-cyan-400'
                    }`}
                  >
                    <Crosshair className="w-3 h-3 shrink-0" />
                    <span>{lm.name}</span>
                  </button>
                );
              })}
            </div>

            {viewMode === 'system' && hasSystem ? (
              <div className="absolute bottom-3 left-3 z-10 pointer-events-none bg-[#0B0F17]/95 border border-emerald-500/40 rounded px-2.5 py-1 text-[11px] text-emerald-200">
                Emerald ring = Liquid-Water Habitable Zone · Click an orbiting planet or select below
              </div>
            ) : (
              selectedBody.landmarks.length > 0 && (
                <div className="absolute bottom-3 left-3 z-10 pointer-events-none bg-[#0B0F17]/95 border border-slate-800 rounded px-2.5 py-1 text-[11px] text-slate-300">
                  Click any pin on the 3D surface or select a landmark below to zoom in
                </div>
              )
            )}
          </div>

          <div className="px-4 py-3 border-t border-slate-800 bg-[#0E131D] flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onLocateIn3DAtlas(selectedBody)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-slate-700 bg-[#07090E] text-slate-200 hover:border-cyan-400 hover:text-cyan-200 transition-colors whitespace-nowrap"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Locate in 3D Atlas</span>
            </button>
            <button
              type="button"
              onClick={() => onAskAiAboutBody(selectedBody, selectedLandmark, null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Live AI Briefing</span>
            </button>
          </div>
        </div>

        {/* Right: Scientific Properties, Surface Crater/Landmark Zoom & Stellar Data */}
        <div className="lg:col-span-6 bg-[#0E131D] border border-slate-800 rounded-lg p-6 flex flex-col justify-between space-y-5">
          {selectedBody.featuredImage && !imgFailed && (
            <div className="relative rounded-md overflow-hidden border border-slate-800 aspect-[16/7] bg-[#05070C]">
              <img
                src={selectedBody.featuredImage}
                alt={`${selectedBody.name} reconnaissance view`}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3.5 py-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-cyan-300">
                  Reconnaissance Visual <span aria-hidden="true">·</span> {selectedBody.name}
                </span>
                <span className="text-[11px] font-mono text-slate-300">
                  {selectedBody.designation}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-slate-200 leading-relaxed">{selectedBody.summary}</p>
            <p className="text-sm text-slate-300 leading-relaxed">
              {selectedBody.geologyAndScience}
            </p>
          </div>

          {/* Interactive Orbiting Planets & Goldilocks Habitable Zone Panel (Shown for Stars / Host Systems) */}
          {selectedBody.systemPlanets && selectedBody.systemPlanets.length > 0 && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono text-emerald-400">
                  Planetary System & Habitable Zone
                  {selectedBody.habitableZoneAu && (
                    <span className="text-slate-400 font-normal">
                      {' '}
                      · HZ {selectedBody.habitableZoneAu[0]}–{selectedBody.habitableZoneAu[1]} AU
                    </span>
                  )}
                </span>
                <span className="text-xs text-slate-400 tabular-nums">
                  {selectedBody.systemPlanets.filter((p) => p.inHabitableZone).length} habitable-zone worlds
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {selectedBody.systemPlanets.map((sp) => {
                  const active = sp.id === selectedSystemPlanetId;
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => {
                        setSelectedSystemPlanetId(sp.id);
                        setViewMode('system');
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
                        active
                          ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200'
                          : 'border-slate-700 bg-[#07090E] text-slate-300 hover:border-emerald-400/70 hover:text-white'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: sp.inHabitableZone ? '#34D399' : sp.color }}
                      />
                      <span>{sp.name}</span>
                    </button>
                  );
                })}
              </div>

              {selectedSystemPlanet && (
                <div className="bg-[#07090E] border border-slate-800 rounded-md p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-100">
                      {selectedSystemPlanet.name}{' '}
                      <span className="text-xs font-normal text-slate-400">
                        · {selectedSystemPlanet.planetClass}
                      </span>
                    </p>
                    <span
                      className={`text-xs font-mono tabular-nums ${
                        selectedSystemPlanet.inHabitableZone ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {selectedSystemPlanet.inHabitableZone ? 'Habitable Zone' : 'Outside HZ'} · ESI{' '}
                      {selectedSystemPlanet.esiScore.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[11px] font-sans text-slate-400 block">Orbit</span>
                      <span className="text-slate-100 tabular-nums">
                        {selectedSystemPlanet.orbitRadiusAu} AU
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-sans text-slate-400 block">Period</span>
                      <span className="text-slate-100 tabular-nums">
                        {selectedSystemPlanet.orbitalPeriod}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-sans text-slate-400 block">Size / Mass</span>
                      <span className="text-slate-100 tabular-nums">
                        {selectedSystemPlanet.radiusEarth} · {selectedSystemPlanet.massEarth}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-sans text-slate-400 block">Eq. Temp</span>
                      <span className="text-slate-100 tabular-nums">
                        {selectedSystemPlanet.tempKelvin} K (
                        {Math.round(selectedSystemPlanet.tempKelvin - 273.15)} °C)
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedSystemPlanet.summary}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {selectedSystemPlanet.linkedBodyId && (
                      <button
                        type="button"
                        onClick={() => {
                          const linked = bodies.find(
                            (b) => b.id === selectedSystemPlanet.linkedBodyId,
                          );
                          if (linked) onSelectBody(linked);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border border-cyan-500/50 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25 whitespace-nowrap"
                      >
                        <ZoomIn className="w-3 h-3" />
                        <span>Open 3D Planet Model</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onAskAiAboutBody(selectedBody, null, selectedSystemPlanet)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border border-slate-700 bg-[#0E131D] text-slate-200 hover:border-cyan-400 whitespace-nowrap"
                    >
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      <span>Ask AI About {selectedSystemPlanet.name}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Interactive Surface Landmarks / Craters Zoom Panel */}
          {selectedBody.landmarks.length > 0 && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-cyan-400">
                  Surface & Structure Features (Click to Zoom 3D)
                </span>
                <span className="text-xs text-slate-400 tabular-nums">
                  {selectedBody.landmarks.length} mapped sites
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {selectedBody.landmarks.map((lm) => {
                  const active = lm.id === selectedLandmarkId && viewMode === 'surface';
                  return (
                    <button
                      key={lm.id}
                      type="button"
                      onClick={() => handleZoomToLandmark(lm)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
                        active
                          ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                          : 'border-slate-700 bg-[#07090E] text-slate-300 hover:border-cyan-400 hover:text-white'
                      }`}
                    >
                      <ZoomIn className="w-3 h-3 shrink-0 text-cyan-400" />
                      <span>{lm.name}</span>
                    </button>
                  );
                })}
              </div>

              {selectedLandmark && (
                <div className="bg-[#07090E] border border-slate-800 rounded-md p-3.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-100">{selectedLandmark.name}</p>
                    <span className="text-xs font-mono text-cyan-300 tabular-nums">
                      {Math.abs(selectedLandmark.lat).toFixed(1)}°
                      {selectedLandmark.lat >= 0 ? 'N' : 'S'}{' '}
                      {Math.abs(selectedLandmark.lon).toFixed(1)}°
                      {selectedLandmark.lon >= 0 ? 'E' : 'W'}
                    </span>
                  </div>
                  <p className="text-xs text-amber-300">
                    {selectedLandmark.featureType} <span aria-hidden="true">·</span>{' '}
                    <span className="font-mono">{selectedLandmark.dimensions}</span>
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedLandmark.description}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Surveyed by: <span className="text-slate-200">{selectedLandmark.missions}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Rich Stellar Astrophysics Block (Shown for Stars & Galactic Core) */}
          {selectedBody.stellarProfile && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-amber-300">
                  Stellar Classification & Milky Way Kinematics
                </span>
                <span className="text-xs font-mono text-slate-300">
                  {selectedBody.stellarProfile.spectralClass}
                </span>
              </div>

              {/* Harvard Spectral Temperature Scale */}
              <div className="space-y-1.5 bg-[#07090E] border border-slate-800 rounded-md p-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Harvard Spectral Temperature Scale (Hot O → Cool M)</span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {selectedBody.stellarProfile.tempKelvin.toLocaleString()} K
                  </span>
                </div>
                <div className="relative h-3 rounded overflow-hidden flex">
                  {SPECTRAL_BANDS.map((band) => (
                    <div
                      key={band.cls}
                      className="flex-1 h-full"
                      style={{ backgroundColor: band.color, opacity: 0.78 }}
                      title={`${band.cls} Class (${band.label})`}
                    />
                  ))}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-slate-950 ring-2 ring-white"
                    style={{
                      left: `calc(${getTempMarkerPercent(selectedBody.stellarProfile.tempKelvin)}% - 2px)`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  {SPECTRAL_BANDS.map((b) => (
                    <span key={b.cls}>{b.cls}</span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Constellation</span>
                  <span className="font-medium text-slate-100">
                    {selectedBody.stellarProfile.constellation}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Apparent Magnitude</span>
                  <span className="font-mono text-slate-100 tabular-nums">
                    {selectedBody.stellarProfile.apparentMag}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Estimated Age</span>
                  <span className="font-mono text-slate-100 tabular-nums">
                    {selectedBody.stellarProfile.ageGyr}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-slate-400 block">Galactic Sector & Planets / Remnant</span>
                  <span className="text-slate-200">
                    {selectedBody.stellarProfile.galacticSector} <span aria-hidden="true">·</span>{' '}
                    {selectedBody.stellarProfile.exoplanetsSummary}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Core Physical Telemetry */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
            <div>
              <span className="text-xs text-slate-400 block">Distance</span>
              <span className="text-sm font-mono font-medium text-slate-100 tabular-nums">
                {selectedBody.distanceFromEarth}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Dimensions</span>
              <span className="text-sm font-mono font-medium text-slate-100 tabular-nums">
                {selectedBody.radiusOrSize}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Mass</span>
              <span className="text-sm font-mono font-medium text-slate-100 tabular-nums">
                {selectedBody.massLabel}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Gravity / Luminosity</span>
              <span className="text-sm font-mono font-medium text-slate-100 tabular-nums">
                {selectedBody.gravityOrLuminosity}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Temperature</span>
              <span className="text-sm font-mono font-medium text-slate-100 tabular-nums">
                {selectedBody.temperature}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Rotation / Period</span>
              <span className="text-sm font-mono font-medium text-slate-100 tabular-nums">
                {selectedBody.dayOrRotation}
              </span>
            </div>

            {selectedBody.axialTilt && (
              <div>
                <span className="text-xs text-slate-400 block">Axial Tilt</span>
                <span className="text-sm font-mono font-medium text-cyan-200 tabular-nums">
                  {selectedBody.axialTilt}
                </span>
              </div>
            )}
            {selectedBody.escapeVelocity && (
              <div>
                <span className="text-xs text-slate-400 block">Escape Velocity</span>
                <span className="text-sm font-mono font-medium text-slate-100 tabular-nums">
                  {selectedBody.escapeVelocity}
                </span>
              </div>
            )}
            {selectedBody.meanDensity && (
              <div>
                <span className="text-xs text-slate-400 block">Mean Density</span>
                <span className="text-sm font-mono font-medium text-slate-100 tabular-nums">
                  {selectedBody.meanDensity}
                </span>
              </div>
            )}
            {selectedBody.albedoOrMag && (
              <div>
                <span className="text-xs text-slate-400 block">Albedo / Index</span>
                <span className="text-sm font-mono font-medium text-slate-100 tabular-nums">
                  {selectedBody.albedoOrMag}
                </span>
              </div>
            )}
            {selectedBody.lightTimeFromEarth && (
              <div>
                <span className="text-xs text-slate-400 block">
                  {liveEphem ? 'Live 1-Way Light Time' : 'One-Way Light Time'}
                </span>
                <span className="text-sm font-mono font-medium text-amber-300 tabular-nums">
                  {liveEphem ? liveEphem.oneWayLightTimeLabel : selectedBody.lightTimeFromEarth}
                </span>
              </div>
            )}
            {liveEphem && selectedBody.id !== 'earth' && (
              <>
                <div>
                  <span className="text-xs text-slate-400 block">Live Range (Now)</span>
                  <span className="text-sm font-mono font-medium text-cyan-300 tabular-nums">
                    {liveEphem.auFromEarth < 0.05
                      ? `${Math.round(liveEphem.kmFromEarth).toLocaleString()} km`
                      : `${liveEphem.auFromEarth.toFixed(4)} AU`}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">J2000 RA / Dec</span>
                  <span className="text-xs font-mono font-medium text-slate-100 tabular-nums">
                    {liveEphem.raFormatted} · {liveEphem.decFormatted}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Illumination / Mag</span>
                  <span className="text-sm font-mono font-medium text-slate-100 tabular-nums">
                    {liveEphem.phasePercent.toFixed(1)}% · mag {liveEphem.magnitude}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Atmospheric / Plasma Chemistry Breakdown */}
          {selectedBody.atmosphericComposition &&
            selectedBody.atmosphericComposition.length > 0 && (
              <div className="pt-4 border-t border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-cyan-400">Atmospheric & Plasma Chemistry</span>
                  <span className="text-slate-400 font-mono">Spectroscopic Share</span>
                </div>
                <div className="h-2.5 rounded-sm overflow-hidden flex bg-[#07090E] border border-slate-800">
                  {selectedBody.atmosphericComposition.map((c) => (
                    <div
                      key={c.gas}
                      style={{
                        width: `${Math.max(2, c.pct)}%`,
                        backgroundColor: c.color,
                      }}
                      title={`${c.gas}: ${c.share}`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono">
                  {selectedBody.atmosphericComposition.map((c) => (
                    <span key={c.gas} className="inline-flex items-center gap-1.5 text-slate-200">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      <span>{c.gas}</span>
                      <span className="text-slate-400 tabular-nums">{c.share}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* Interior Structure Cross-Section */}
          {selectedBody.interiorStructure && selectedBody.interiorStructure.length > 0 && (
            <div className="pt-4 border-t border-slate-800 space-y-2.5">
              <span className="text-xs font-mono text-amber-300 block">
                Interior Structure & Geophysical Cross-Section
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {selectedBody.interiorStructure.map((layer) => (
                  <div
                    key={layer.layer}
                    className="bg-[#07090E] border border-slate-800 rounded px-3 py-2 space-y-0.5"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-100">{layer.layer}</span>
                      <span className="text-[11px] font-mono text-cyan-300 tabular-nums shrink-0">
                        {layer.extent}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{layer.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
              <span className="text-slate-400">Composition / Class</span>
              <span className="font-mono text-cyan-300">{selectedBody.atmosphereOrClass}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
              <span className="text-slate-400">Exploring Spacecraft</span>
              <span className="text-slate-200">{selectedBody.missionsVisited.join(' · ')}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
