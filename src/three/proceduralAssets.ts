import * as THREE from 'three';
import type { CelestialBody, CelestialVisualKind } from '../data/celestialBodies';
import type { SpacecraftModelType } from '../data/spaceObjects';

export const PLANET_AXIAL_TILT_DEG: Record<string, number> = {
  mercury: 0.03,
  venus: 177.36,
  earth: 23.44,
  moon: 6.68,
  mars: 25.19,
  jupiter: 3.13,
  saturn: 26.73,
  uranus: 97.77,
  neptune: 28.32,
  ceres: 4.0,
};

/**
 * Solves Kepler's Equation M = E - e * sin(E) via Newton-Raphson with the attractor at focus (0,0,0).
 * Perihelion occurs at E = 0 -> x = a(1 - e); Aphelion at E = PI -> x = -a(1 + e).
 */
export function solveKeplerPosition(
  semiMajor: number,
  eccentricity: number,
  incRad: number,
  meanAnomaly: number,
  target: THREE.Vector3 = new THREE.Vector3(),
): THREE.Vector3 {
  const e = Math.max(0, Math.min(0.92, eccentricity));
  let E = meanAnomaly + e * Math.sin(meanAnomaly);
  for (let iter = 0; iter < 4; iter++) {
    const f = E - e * Math.sin(E) - meanAnomaly;
    const fp = 1 - e * Math.cos(E);
    E -= f / Math.max(0.05, fp);
  }
  const semiMinor = semiMajor * Math.sqrt(1 - e * e);
  const xOrb = semiMajor * (Math.cos(E) - e);
  const zOrb = semiMinor * Math.sin(E);
  return target.set(xOrb, zOrb * Math.sin(incRad), zOrb * Math.cos(incRad));
}

function createNormalMapFromBumpCanvas(
  bumpCanvas: HTMLCanvasElement,
  strength: number,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = bumpCanvas.width;
  const h = bumpCanvas.height;
  const srcCtx = bumpCanvas.getContext('2d')!;
  const srcData = srcCtx.getImageData(0, 0, w, h).data;

  const normCanvas = document.createElement('canvas');
  normCanvas.width = w;
  normCanvas.height = h;
  const nCtx = normCanvas.getContext('2d')!;
  const nImg = nCtx.createImageData(w, h);

  const sample = (x: number, y: number) => {
    const wx = ((x % w) + w) % w;
    const wy = Math.max(0, Math.min(h - 1, y));
    return srcData[(wy * w + wx) * 4] / 255;
  };

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const hL = sample(px - 1, py);
      const hR = sample(px + 1, py);
      const hD = sample(px, py - 1);
      const hU = sample(px, py + 1);

      const dx = (hL - hR) * strength;
      const dy = (hD - hU) * strength;
      const dz = 1.0;
      const invLen = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz);

      const idx = (py * w + px) * 4;
      nImg.data[idx] = Math.round((dx * invLen * 0.5 + 0.5) * 255);
      nImg.data[idx + 1] = Math.round((dy * invLen * 0.5 + 0.5) * 255);
      nImg.data[idx + 2] = Math.round((dz * invLen * 0.5 + 0.5) * 255);
      nImg.data[idx + 3] = 255;
    }
  }
  nCtx.putImageData(nImg, 0, 0);

  const normalMap = new THREE.CanvasTexture(normCanvas);
  normalMap.anisotropy = maxAnisotropy;
  return normalMap;
}

/**
 * Exact Three.js SphereGeometry UV-aligned lat/lon -> 3D Cartesian coordinate mapping.
 * Ensures procedural canvas craters & 3D surface landmark pins align pixel-for-pixel.
 */
export function latLonToVector3(latDeg: number, lonDeg: number, radius: number): THREE.Vector3 {
  const normLon = (((lonDeg + 180) % 360) + 360) % 360;
  const u = normLon / 360;
  const phi = u * Math.PI * 2;
  const theta = ((90 - latDeg) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function latLonToCanvas(latDeg: number, lonDeg: number, width: number, height: number): [number, number] {
  const normLon = (((lonDeg + 180) % 360) + 360) % 360;
  const u = normLon / 360;
  const v = (latDeg + 90) / 180;
  return [u * width, (1 - v) * height];
}

// Fast deterministic tileable spherical value noise helpers
function hash2(ix: number, iy: number, seed: number): number {
  const n = Math.sin(ix * 127.1 + iy * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise2D(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm3D(x: number, y: number, z: number, seed: number, octaves = 4): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let o = 0; o < octaves; o++) {
    const n1 = valueNoise2D(x * freq + z * freq * 0.71, y * freq - z * freq * 0.53, seed + o * 19);
    const n2 = valueNoise2D(z * freq - x * freq * 0.63, y * freq + x * freq * 0.41, seed + o * 31);
    sum += ((n1 + n2) * 0.5) * amp;
    freq *= 2.05;
    amp *= 0.5;
  }
  return sum;
}

function drawCrater(
  ctx: CanvasRenderingContext2D,
  bumpCtx: CanvasRenderingContext2D | null,
  cx: number,
  cy: number,
  r: number,
  floorColor: string,
  rimColor: string,
  rays = false,
) {
  if (rays) {
    ctx.save();
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.32)';
    ctx.lineWidth = Math.max(1, r * 0.14);
    for (let k = 0; k < 10; k++) {
      const ang = (k / 10) * Math.PI * 2 + (cx % 1);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r * 1.05, cy + Math.sin(ang) * r * 1.05);
      ctx.lineTo(cx + Math.cos(ang) * r * (2.6 + (k % 3) * 0.9), cy + Math.sin(ang) * r * (2.6 + (k % 3) * 0.9));
      ctx.stroke();
    }
    ctx.restore();
  }

  // Rim highlight
  ctx.fillStyle = rimColor;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.12, 0, Math.PI * 2);
  ctx.fill();

  // Floor depression
  ctx.fillStyle = floorColor;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2);
  ctx.fill();

  if (bumpCtx) {
    const grad = bumpCtx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 1.25);
    grad.addColorStop(0, 'rgba(30, 30, 30, 0.85)');
    grad.addColorStop(0.74, 'rgba(20, 20, 20, 0.9)');
    grad.addColorStop(0.9, 'rgba(235, 235, 235, 0.85)');
    grad.addColorStop(1, 'rgba(128, 128, 128, 0)');
    bumpCtx.fillStyle = grad;
    bumpCtx.beginPath();
    bumpCtx.arc(cx, cy, r * 1.25, 0, Math.PI * 2);
    bumpCtx.fill();
  }
}

export interface PlanetTextureBundle {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  normalMap?: THREE.CanvasTexture;
  roughnessMap?: THREE.CanvasTexture;
  cloudMap?: THREE.CanvasTexture;
  emissiveMap?: THREE.CanvasTexture;
}

export function createEarthTextureBundle(maxAnisotropy: number): PlanetTextureBundle {
  const w = 1024;
  const h = 512;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = w;
  albedoCanvas.height = h;
  const aCtx = albedoCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = w;
  bumpCanvas.height = h;
  const bCtx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = w;
  roughCanvas.height = h;
  const rCtx = roughCanvas.getContext('2d')!;

  const lightsCanvas = document.createElement('canvas');
  lightsCanvas.width = w;
  lightsCanvas.height = h;
  const lCtx = lightsCanvas.getContext('2d')!;

  const aImg = aCtx.createImageData(w, h);
  const bImg = bCtx.createImageData(w, h);
  const rImg = rCtx.createImageData(w, h);
  const lImg = lCtx.createImageData(w, h);

  for (let py = 0; py < h; py++) {
    const v = 1 - py / h;
    const latRad = (v - 0.5) * Math.PI;
    const cosLat = Math.cos(latRad);
    const sinLat = Math.sin(latRad);

    for (let px = 0; px < w; px++) {
      const u = px / w;
      const phi = u * Math.PI * 2;
      const sx = -Math.cos(phi) * cosLat;
      const sy = sinLat;
      const sz = Math.sin(phi) * cosLat;

      const elev = fbm3D(sx * 2.2, sy * 2.2, sz * 2.2, 11, 5);
      const moisture = fbm3D(sx * 3.1 + 4, sy * 3.1, sz * 3.1 - 2, 29, 4);
      const cityNoise = fbm3D(sx * 16.5, sy * 16.5, sz * 16.5, 193, 3);
      const absLat = Math.abs(sinLat);

      const idx = (py * w + px) * 4;
      let r = 10;
      let g = 45;
      let b = 88;
      let bumpVal = 110;
      let roughVal = 52; // specular oceans
      let lightIntensity = 0;

      if (absLat > 0.91 - elev * 0.06) {
        // Polar ice caps
        r = 228;
        g = 238;
        b = 248;
        bumpVal = 155;
        roughVal = 175;
      } else if (elev > 0.525) {
        // Landmasses
        const landAlt = Math.min(1, (elev - 0.525) / 0.25);
        bumpVal = Math.round(135 + landAlt * 115);
        roughVal = 224;

        if (landAlt > 0.72) {
          // Alpine snow-capped ridges
          r = 175;
          g = 172;
          b = 168;
        } else if (absLat < 0.48 && moisture < 0.45) {
          // Deserts & savannahs
          r = 168;
          g = 142;
          b = 98;
        } else {
          // Temperate & tropical forests
          r = 34 + Math.round(landAlt * 46);
          g = 86 + Math.round(moisture * 38);
          b = 54 + Math.round(landAlt * 20);
        }

        // Coastal & temperate urbanization corridors for night lights
        const coastalFactor = landAlt < 0.34 ? 1.0 : 0.35;
        if (absLat < 0.76 && cityNoise > 0.59) {
          lightIntensity = Math.min(255, Math.round((cityNoise - 0.59) * 1650 * coastalFactor));
        }
      } else {
        // Ocean bathymetry shading
        const shelf = Math.max(0, (elev - 0.44) / 0.085);
        r = Math.round(8 + shelf * 18);
        g = Math.round(38 + shelf * 56);
        b = Math.round(82 + shelf * 64);
      }

      aImg.data[idx] = r;
      aImg.data[idx + 1] = g;
      aImg.data[idx + 2] = b;
      aImg.data[idx + 3] = 255;

      bImg.data[idx] = bumpVal;
      bImg.data[idx + 1] = bumpVal;
      bImg.data[idx + 2] = bumpVal;
      bImg.data[idx + 3] = 255;

      rImg.data[idx] = roughVal;
      rImg.data[idx + 1] = roughVal;
      rImg.data[idx + 2] = roughVal;
      rImg.data[idx + 3] = 255;

      lImg.data[idx] = lightIntensity;
      lImg.data[idx + 1] = Math.round(lightIntensity * 0.8);
      lImg.data[idx + 2] = Math.round(lightIntensity * 0.42);
      lImg.data[idx + 3] = 255;
    }
  }

  aCtx.putImageData(aImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  lCtx.putImageData(lImg, 0, 0);

  // Subtle continental cloud swirl overlay texture
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = w;
  cloudCanvas.height = h;
  const cCtx = cloudCanvas.getContext('2d')!;
  const cImg = cCtx.createImageData(w, h);
  for (let py = 0; py < h; py++) {
    const v = 1 - py / h;
    const latRad = (v - 0.5) * Math.PI;
    const cosLat = Math.cos(latRad);
    const sinLat = Math.sin(latRad);
    for (let px = 0; px < w; px++) {
      const u = px / w;
      const phi = u * Math.PI * 2;
      const sx = -Math.cos(phi) * cosLat;
      const sy = sinLat;
      const sz = Math.sin(phi) * cosLat;
      const n = fbm3D(sx * 3.8 + sy * 1.4, sy * 4.2, sz * 3.8 - sy * 1.1, 77, 4);
      const alpha = n > 0.51 ? Math.min(220, Math.round((n - 0.51) * 780)) : 0;
      const idx = (py * w + px) * 4;
      cImg.data[idx] = 245;
      cImg.data[idx + 1] = 248;
      cImg.data[idx + 2] = 255;
      cImg.data[idx + 3] = alpha;
    }
  }
  cCtx.putImageData(cImg, 0, 0);

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.anisotropy = maxAnisotropy;

  const normalMap = createNormalMapFromBumpCanvas(bumpCanvas, 2.6, maxAnisotropy);

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.anisotropy = maxAnisotropy;

  const cloudMap = new THREE.CanvasTexture(cloudCanvas);
  cloudMap.colorSpace = THREE.SRGBColorSpace;
  cloudMap.anisotropy = maxAnisotropy;

  const emissiveMap = new THREE.CanvasTexture(lightsCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.anisotropy = maxAnisotropy;

  return { map, bumpMap, normalMap, roughnessMap, cloudMap, emissiveMap };
}

export function createEarthTexture(maxAnisotropy: number): THREE.CanvasTexture {
  return createEarthTextureBundle(maxAnisotropy).map;
}

export function createPlanetTextureBundle(
  kind:
    | 'moon'
    | 'mercury'
    | 'venus'
    | 'mars'
    | 'jupiter'
    | 'saturn'
    | 'uranus'
    | 'neptune'
    | 'ceres'
    | 'exoplanet-temperate'
    | 'exoplanet-ocean'
    | 'exoplanet-lava',
  maxAnisotropy: number,
): PlanetTextureBundle {
  const w = kind === 'mars' || kind === 'moon' || kind === 'jupiter' ? 1024 : 768;
  const h = w / 2;

  const albedo = document.createElement('canvas');
  albedo.width = w;
  albedo.height = h;
  const ctx = albedo.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = w;
  bump.height = h;
  const bCtx = bump.getContext('2d')!;

  const img = ctx.createImageData(w, h);
  const bImg = bCtx.createImageData(w, h);

  for (let py = 0; py < h; py++) {
    const v = 1 - py / h;
    const latRad = (v - 0.5) * Math.PI;
    const cosLat = Math.cos(latRad);
    const sinLat = Math.sin(latRad);
    const absLat = Math.abs(sinLat);

    for (let px = 0; px < w; px++) {
      const u = px / w;
      const phi = u * Math.PI * 2;
      const sx = -Math.cos(phi) * cosLat;
      const sy = sinLat;
      const sz = Math.sin(phi) * cosLat;

      const idx = (py * w + px) * 4;
      let r = 140;
      let g = 140;
      let b = 140;
      let bumpVal = 128;

      if (kind === 'mars') {
        const terrain = fbm3D(sx * 2.8, sy * 2.8, sz * 2.8, 3, 5);
        const fine = fbm3D(sx * 9.5, sy * 9.5, sz * 9.5, 41, 3);
        const polar = absLat > 0.935 - terrain * 0.04;
        if (polar) {
          r = 236;
          g = 238;
          b = 242;
          bumpVal = 175;
        } else {
          // Basalt lowlands vs ochre ferric oxide dust
          const basalt = terrain < 0.45 ? (0.45 - terrain) * 2.2 : 0;
          r = Math.round(188 - basalt * 82 + fine * 30);
          g = Math.round(88 - basalt * 34 + fine * 22);
          b = Math.round(52 - basalt * 16 + fine * 14);
          bumpVal = Math.round(80 + terrain * 115 + fine * 35);
        }
      } else if (kind === 'moon' || kind === 'mercury' || kind === 'ceres') {
        const maria = fbm3D(sx * 2.1, sy * 2.1, sz * 2.1, kind === 'moon' ? 7 : 19, 4);
        const regolith = fbm3D(sx * 10, sy * 10, sz * 10, 53, 3);
        const baseTone =
          kind === 'moon'
            ? maria < 0.45
              ? 88 + regolith * 26
              : 152 + regolith * 36
            : kind === 'ceres'
              ? 98 + regolith * 34
              : 118 + maria * 24 + regolith * 30;
        r = Math.round(baseTone * (kind === 'mercury' ? 1.03 : 0.98));
        g = Math.round(baseTone * (kind === 'mercury' ? 0.98 : 0.99));
        b = Math.round(baseTone * (kind === 'mercury' ? 0.92 : 1.02));
        bumpVal = Math.round(90 + maria * 80 + regolith * 60);
      } else if (kind === 'jupiter') {
        const turb = fbm3D(sx * 6.5, sy * 12, sz * 6.5, 83, 4);
        const latBand = Math.sin(latRad * 14 + turb * 3.2) * 0.5 + 0.5;
        const zone = Math.cos(latRad * 26 + turb * 2.0) * 0.5 + 0.5;
        r = Math.round(166 + latBand * 58 + zone * 16);
        g = Math.round(112 + latBand * 62 + zone * 24);
        b = Math.round(78 + latBand * 52 + zone * 26);
        bumpVal = Math.round(120 + latBand * 25);
      } else if (kind === 'saturn') {
        const turb = fbm3D(sx * 4.5, sy * 9, sz * 4.5, 91, 3);
        const band = Math.sin(latRad * 16 + turb * 1.4) * 0.5 + 0.5;
        r = Math.round(202 + band * 34);
        g = Math.round(176 + band * 36);
        b = Math.round(126 + band * 38);
        bumpVal = Math.round(124 + band * 12);
      } else if (kind === 'venus') {
        const swirl = fbm3D(sx * 3.5 + sy * 1.8, sy * 5.2, sz * 3.5, 67, 4);
        const chevron = Math.sin(latRad * 8 + swirl * 3.5) * 0.5 + 0.5;
        r = Math.round(196 + chevron * 38);
        g = Math.round(154 + chevron * 42);
        b = Math.round(86 + chevron * 36);
        bumpVal = Math.round(122 + chevron * 18);
      } else if (kind === 'uranus') {
        const haze = fbm3D(sx * 3.5, sy * 6.5, sz * 3.5, 37, 3);
        const polarHood = sinLat > 0.72 ? (sinLat - 0.72) * 2.4 : 0;
        r = Math.round(112 + haze * 28 + polarHood * 80);
        g = Math.round(204 + haze * 22 + polarHood * 35);
        b = Math.round(224 + haze * 18 + polarHood * 25);
        bumpVal = 128;
      } else if (kind === 'exoplanet-temperate') {
        const elev = fbm3D(sx * 2.6 + 1.5, sy * 2.6, sz * 2.6 - 0.8, 131, 5);
        const lush = fbm3D(sx * 4.1, sy * 4.1 + 2.0, sz * 4.1, 149, 4);
        if (absLat > 0.88 - elev * 0.05) {
          r = 232;
          g = 242;
          b = 248;
          bumpVal = 158;
        } else if (elev > 0.51) {
          const alt = Math.min(1, (elev - 0.51) / 0.25);
          r = Math.round(32 + alt * 88 + (1 - lush) * 52);
          g = Math.round(98 + lush * 68 + alt * 18);
          b = Math.round(64 + alt * 34);
          bumpVal = Math.round(135 + alt * 105);
        } else {
          const shelf = Math.max(0, (elev - 0.42) / 0.09);
          r = Math.round(8 + shelf * 24);
          g = Math.round(64 + shelf * 78);
          b = Math.round(112 + shelf * 68);
          bumpVal = 112;
        }
      } else if (kind === 'exoplanet-ocean') {
        const swell = fbm3D(sx * 3.2, sy * 5.2, sz * 3.2, 163, 4);
        const cyclone = Math.sin(latRad * 10 + swell * 4.2) * 0.5 + 0.5;
        r = Math.round(12 + cyclone * 28 + swell * 18);
        g = Math.round(92 + cyclone * 66 + swell * 24);
        b = Math.round(168 + cyclone * 54);
        bumpVal = Math.round(124 + cyclone * 14);
      } else if (kind === 'exoplanet-lava') {
        const crack = fbm3D(sx * 5.4, sy * 5.4, sz * 5.4, 179, 4);
        const magma = crack < 0.41 ? Math.min(1, (0.41 - crack) * 4.5) : 0;
        r = Math.round(36 + magma * 215);
        g = Math.round(30 + magma * 88);
        b = Math.round(28 + magma * 16);
        bumpVal = Math.round(95 + crack * 120);
      } else {
        // Neptune
        const storm = fbm3D(sx * 4.8, sy * 9.0, sz * 4.8, 101, 4);
        const band = Math.sin(latRad * 11 + storm * 2.2) * 0.5 + 0.5;
        r = Math.round(28 + band * 34 + storm * 14);
        g = Math.round(84 + band * 52 + storm * 20);
        b = Math.round(196 + band * 48);
        bumpVal = Math.round(124 + band * 12);
      }

      img.data[idx] = Math.min(255, Math.max(0, r));
      img.data[idx + 1] = Math.min(255, Math.max(0, g));
      img.data[idx + 2] = Math.min(255, Math.max(0, b));
      img.data[idx + 3] = 255;

      bImg.data[idx] = Math.min(255, Math.max(0, bumpVal));
      bImg.data[idx + 1] = bImg.data[idx];
      bImg.data[idx + 2] = bImg.data[idx];
      bImg.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  bCtx.putImageData(bImg, 0, 0);

  // Paint named geological features onto exact UV lat/lon positions!
  if (kind === 'mars') {
    // 1. Valles Marineris rift canyon scar
    const [vmX, vmY] = latLonToCanvas(-13.9, -59.2, w, h);
    ctx.save();
    ctx.strokeStyle = 'rgba(66, 22, 14, 0.9)';
    ctx.lineWidth = w * 0.014;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(vmX - w * 0.075, vmY - h * 0.015);
    ctx.quadraticCurveTo(vmX, vmY + h * 0.015, vmX + w * 0.08, vmY - h * 0.008);
    ctx.stroke();

    bCtx.strokeStyle = 'rgba(18, 18, 18, 0.95)';
    bCtx.lineWidth = w * 0.016;
    bCtx.lineCap = 'round';
    bCtx.beginPath();
    bCtx.moveTo(vmX - w * 0.075, vmY - h * 0.015);
    bCtx.quadraticCurveTo(vmX, vmY + h * 0.015, vmX + w * 0.08, vmY - h * 0.008);
    bCtx.stroke();
    ctx.restore();

    // 2. Olympus Mons shield edifice
    const [omX, omY] = latLonToCanvas(18.65, -133.8, w, h);
    const omGrad = ctx.createRadialGradient(omX, omY, 2, omX, omY, w * 0.038);
    omGrad.addColorStop(0, '#f09c6e');
    omGrad.addColorStop(0.55, '#c96a42');
    omGrad.addColorStop(1, 'rgba(168, 72, 44, 0)');
    ctx.fillStyle = omGrad;
    ctx.beginPath();
    ctx.arc(omX, omY, w * 0.038, 0, Math.PI * 2);
    ctx.fill();

    const omBump = bCtx.createRadialGradient(omX, omY, 2, omX, omY, w * 0.038);
    omBump.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    omBump.addColorStop(0.7, 'rgba(200, 200, 200, 0.6)');
    omBump.addColorStop(1, 'rgba(128, 128, 128, 0)');
    bCtx.fillStyle = omBump;
    bCtx.beginPath();
    bCtx.arc(omX, omY, w * 0.038, 0, Math.PI * 2);
    bCtx.fill();

    // 3. Hellas Planitia giant basin
    const [hpX, hpY] = latLonToCanvas(-42.4, 70.5, w, h);
    drawCrater(ctx, bCtx, hpX, hpY, w * 0.055, 'rgba(198, 126, 92, 0.45)', 'rgba(122, 48, 28, 0.5)');

    // 4. Jezero Crater, Gale Crater, and Korolev Ice Crater
    const [jzX, jzY] = latLonToCanvas(18.38, 77.58, w, h);
    drawCrater(ctx, bCtx, jzX, jzY, w * 0.015, 'rgba(138, 66, 42, 0.88)', 'rgba(226, 146, 108, 0.82)');

    const [glX, glY] = latLonToCanvas(-5.4, 137.8, w, h);
    drawCrater(ctx, bCtx, glX, glY, w * 0.022, 'rgba(108, 48, 32, 0.9)', 'rgba(218, 132, 94, 0.85)');

    const [krX, krY] = latLonToCanvas(72.8, -164.5, w, h);
    drawCrater(ctx, bCtx, krX, krY, w * 0.018, '#f1f5f9', 'rgba(148, 74, 52, 0.8)');

    // Additional scattered Martian craters
    for (let i = 0; i < 65; i++) {
      const cx = ((i * 137) % (w - 40)) + 20;
      const cy = 40 + ((i * 83) % (h - 80));
      drawCrater(ctx, bCtx, cx, cy, 2.5 + (i % 7) * 1.4, 'rgba(105,44,28,0.45)', 'rgba(204,118,86,0.35)');
    }
  } else if (kind === 'moon' || kind === 'mercury') {
    for (let i = 0; i < 150; i++) {
      const cx = ((i * 113) % (w - 30)) + 15;
      const cy = 20 + ((i * 71) % (h - 40));
      const r = 3 + (i % 15) * 1.5;
      drawCrater(ctx, bCtx, cx, cy, r, 'rgba(58,64,74,0.45)', 'rgba(212,218,228,0.28)');
    }
    if (kind === 'moon') {
      const [tyX, tyY] = latLonToCanvas(-43.3, -11.2, w, h);
      drawCrater(ctx, bCtx, tyX, tyY, w * 0.018, '#94a3b8', '#f8fafc', true);

      const [cpX, cpY] = latLonToCanvas(9.6, -20.1, w, h);
      drawCrater(ctx, bCtx, cpX, cpY, w * 0.021, '#64748b', '#e2e8f0', true);

      const [trX, trY] = latLonToCanvas(0.67, 23.47, w, h);
      ctx.fillStyle = 'rgba(42, 48, 58, 0.55)';
      ctx.beginPath();
      ctx.ellipse(trX, trY, w * 0.055, h * 0.08, 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const [cbX, cbY] = latLonToCanvas(30.5, -170.2, w, h);
      drawCrater(ctx, bCtx, cbX, cbY, w * 0.055, 'rgba(165, 148, 128, 0.55)', 'rgba(72, 66, 60, 0.65)');
    }
  } else if (kind === 'ceres') {
    for (let i = 0; i < 90; i++) {
      const cx = ((i * 97) % w);
      const cy = 20 + ((i * 61) % (h - 40));
      drawCrater(ctx, bCtx, cx, cy, 3 + (i % 8) * 1.2, 'rgba(55,60,70,0.45)', 'rgba(180,185,195,0.25)');
    }
    const [ocX, ocY] = latLonToCanvas(19.8, -120.7, w, h);
    drawCrater(ctx, bCtx, ocX, ocY, w * 0.022, '#64748b', '#94a3b8');
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(ocX, ocY, w * 0.008, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'jupiter') {
    const [grsX, grsY] = latLonToCanvas(-22.0, 38.0, w, h);
    const grsGrad = ctx.createRadialGradient(grsX, grsY, 2, grsX, grsY, w * 0.042);
    grsGrad.addColorStop(0, '#b91c1c');
    grsGrad.addColorStop(0.55, '#dc4c2e');
    grsGrad.addColorStop(0.85, '#f29e74');
    grsGrad.addColorStop(1, 'rgba(216, 196, 166, 0)');
    ctx.save();
    ctx.translate(grsX, grsY);
    ctx.scale(1.45, 0.82);
    ctx.fillStyle = grsGrad;
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.036, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (kind === 'neptune') {
    const [dsX, dsY] = latLonToCanvas(-20.0, 25.0, w, h);
    ctx.save();
    ctx.translate(dsX, dsY);
    ctx.scale(1.5, 0.8);
    ctx.fillStyle = 'rgba(15, 36, 98, 0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.028, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(224, 242, 254, 0.8)';
    ctx.beginPath();
    ctx.ellipse(0, -w * 0.018, w * 0.024, w * 0.005, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const map = new THREE.CanvasTexture(albedo);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bump);
  bumpMap.anisotropy = maxAnisotropy;

  const normalStrength =
    kind === 'mars' || kind === 'moon' || kind === 'mercury' || kind === 'ceres'
      ? 3.1
      : kind === 'exoplanet-temperate' || kind === 'exoplanet-lava'
        ? 2.2
        : 0.9;
  const normalMap = createNormalMapFromBumpCanvas(bump, normalStrength, maxAnisotropy);

  return { map, bumpMap, normalMap };
}

export function createPlanetTexture(
  kind:
    | 'moon'
    | 'mercury'
    | 'venus'
    | 'mars'
    | 'jupiter'
    | 'saturn'
    | 'uranus'
    | 'neptune'
    | 'ceres'
    | 'exoplanet-temperate'
    | 'exoplanet-ocean'
    | 'exoplanet-lava',
  maxAnisotropy: number,
): THREE.CanvasTexture {
  return createPlanetTextureBundle(kind, maxAnisotropy).map;
}

export function createSaturnRingsTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 512;
  const h = 32;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  for (let x = 0; x < w; x++) {
    const t = x / w; // 0 = inner edge, 1 = outer edge
    let alpha = 0;
    let r = 224;
    let g = 202;
    let b = 158;

    if (t > 0.04 && t < 0.22) {
      // C-Ring: translucent smoky inner ring
      alpha = 0.24 + Math.sin(t * 140) * 0.05;
      r = 165;
      g = 152;
      b = 132;
    } else if (t >= 0.22 && t < 0.57) {
      // B-Ring: dense bright icy main ring
      alpha = 0.88 + Math.sin(t * 210) * 0.08;
      r = 236;
      g = 216;
      b = 172;
    } else if (t >= 0.57 && t < 0.64) {
      // Cassini Division gap
      alpha = 0.06;
    } else if (t >= 0.64 && t < 0.92) {
      // A-Ring with Encke Gap at 0.83
      const encke = Math.abs(t - 0.83) < 0.012;
      alpha = encke ? 0.08 : 0.68 + Math.sin(t * 180) * 0.08;
      r = 214;
      g = 198;
      b = 162;
    } else if (t >= 0.95 && t <= 0.97) {
      // Thin F-Ring strand
      alpha = 0.45;
    }

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
    ctx.fillRect(x, 0, 1, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createSaturnRingGeometry(innerR: number, outerR: number): THREE.RingGeometry {
  const geo = new THREE.RingGeometry(innerR, outerR, 96, 2);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const v3 = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    const radius = v3.length();
    const u = (radius - innerR) / (outerR - innerR);
    uv.setXY(i, u, 0.5);
  }
  return geo;
}

export function createAtmosphereHaloMesh(
  radius: number,
  colorHex: number,
  intensity = 0.72,
): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uIntensity: { value: intensity },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      void main() {
        vec3 n = normalize(vNormal);
        vec3 v = normalize(vViewPos);
        float rim = pow(clamp(0.68 - dot(n, v), 0.0, 1.0), 2.8);
        gl_FragColor = vec4(uColor, rim * uIntensity);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });

  return new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 36), mat);
}

export function createNebulaGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.28, 'rgba(255, 255, 255, 0.45)');
  grad.addColorStop(0.65, 'rgba(255, 255, 255, 0.10)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createDeepSpaceDome(radius = 300): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDir;

      float hash(vec3 p) {
        return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
      }

      float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float n000 = hash(i);
        float n100 = hash(i + vec3(1.0, 0.0, 0.0));
        float n010 = hash(i + vec3(0.0, 1.0, 0.0));
        float n110 = hash(i + vec3(1.0, 1.0, 0.0));
        float n001 = hash(i + vec3(0.0, 0.0, 1.0));
        float n101 = hash(i + vec3(1.0, 0.0, 1.0));
        float n011 = hash(i + vec3(0.0, 1.0, 1.0));
        float n111 = hash(i + vec3(1.0, 1.0, 1.0));
        return mix(
          mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
          mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
          f.z
        );
      }

      float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p *= 2.08;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 d = normalize(vDir);
        // Tilted galactic plane normal
        float plane = abs(dot(d, normalize(vec3(0.24, 0.88, -0.41))));
        float band = exp(-plane * 6.5);

        float neb1 = fbm(d * 3.4 + vec3(1.2, -0.7, 2.1));
        float neb2 = fbm(d * 7.2 - vec3(0.5, 1.8, -1.1));
        float dustLane = smoothstep(0.36, 0.68, neb2) * exp(-plane * 14.0);

        vec3 base = vec3(0.015, 0.022, 0.042);
        vec3 milkyCore = vec3(0.11, 0.17, 0.30) * band * (0.45 + neb1 * 0.85);
        vec3 cyanNeb = vec3(0.04, 0.19, 0.28) * pow(clamp(neb1, 0.0, 1.0), 2.2) * (0.35 + band * 0.65);
        vec3 warmCore = vec3(0.24, 0.12, 0.08) * band * smoothstep(0.45, 0.85, neb2) * 0.65;

        vec3 col = base + milkyCore + cyanNeb + warmCore;
        col *= (1.0 - dustLane * 0.42);

        // Ultra-fine far background pinpoint stars
        float microStar = pow(hash(floor(d * 240.0)), 34.0);
        col += vec3(0.75, 0.85, 1.0) * microStar * 0.9;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
  });

  const dome = new THREE.Mesh(new THREE.SphereGeometry(radius, 36, 24), mat);
  dome.frustumCulled = false;
  return dome;
}

export function createStellarSurfaceMaterial(
  kind: 'sun' | 'star-blue' | 'star-red' | 'star-gold' | 'star-orange' | 'pulsar',
): THREE.ShaderMaterial {
  let coreColor = new THREE.Color(0xfff3b0);
  let midColor = new THREE.Color(0xfbbf24);
  let limbColor = new THREE.Color(0xd97706);

  if (kind === 'star-blue') {
    coreColor = new THREE.Color(0xe0f2fe);
    midColor = new THREE.Color(0x60a5fa);
    limbColor = new THREE.Color(0x1d4ed8);
  } else if (kind === 'star-red') {
    coreColor = new THREE.Color(0xfca5a5);
    midColor = new THREE.Color(0xef4444);
    limbColor = new THREE.Color(0x7f1d1d);
  } else if (kind === 'star-orange') {
    coreColor = new THREE.Color(0xfed7aa);
    midColor = new THREE.Color(0xf97316);
    limbColor = new THREE.Color(0x9a3412);
  } else if (kind === 'pulsar') {
    coreColor = new THREE.Color(0xf5d0fe);
    midColor = new THREE.Color(0xa855f7);
    limbColor = new THREE.Color(0x4c1d95);
  }

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCore: { value: coreColor },
      uMid: { value: midColor },
      uLimb: { value: limbColor },
    },
    vertexShader: `
      varying vec3 vObjPos;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vObjPos = position;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uCore;
      uniform vec3 uMid;
      uniform vec3 uLimb;
      varying vec3 vObjPos;
      varying vec3 vNormal;
      varying vec3 vViewDir;

      float hash(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
      }

      float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float n000 = hash(i);
        float n100 = hash(i + vec3(1.0, 0.0, 0.0));
        float n010 = hash(i + vec3(0.0, 1.0, 0.0));
        float n110 = hash(i + vec3(1.0, 1.0, 0.0));
        float n001 = hash(i + vec3(0.0, 0.0, 1.0));
        float n101 = hash(i + vec3(1.0, 0.0, 1.0));
        float n011 = hash(i + vec3(0.0, 1.0, 1.0));
        float n111 = hash(i + vec3(1.0, 1.0, 1.0));
        return mix(
          mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
          mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
          f.z
        );
      }

      float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p *= 2.05;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 p = normalize(vObjPos) * 4.5;
        float n1 = fbm(p + vec3(uTime * 0.14, -uTime * 0.09, uTime * 0.11));
        float n2 = fbm(p * 2.2 - vec3(uTime * 0.18));
        float plasma = clamp(n1 * 0.65 + n2 * 0.35, 0.0, 1.0);
        float spotMask = smoothstep(0.24, 0.36, plasma);
        float ndotv = clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0);
        float limb = pow(ndotv, 0.52);

        vec3 col = mix(uLimb, uMid, clamp(plasma * 1.15 + limb * 0.25, 0.0, 1.0));
        col = mix(col, uCore, smoothstep(0.58, 0.92, plasma) * limb);
        col *= (0.45 + 0.55 * spotMask) * (0.48 + 0.62 * limb);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

function displaceIrregularGeometry(geo: THREE.BufferGeometry, mode: 'bennu' | 'psyche' | 'rock') {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;

    let scale = 1;
    if (mode === 'bennu') {
      const eqRidge = Math.max(0, 1 - Math.abs(ny) * 2.2) * 0.28;
      const noise = Math.sin(nx * 9.0 + ny * 5.0) * Math.cos(nz * 8.0) * 0.09;
      scale = 0.88 + eqRidge + noise;
    } else if (mode === 'psyche') {
      const crater = Math.sin(nx * 5.5 + nz * 4.2) * 0.15;
      scale = 0.95 + crater;
    } else {
      scale = 0.92 + Math.sin(nx * 6 + ny * 4) * 0.13;
    }

    pos.setXYZ(
      i,
      x * scale * (mode === 'psyche' ? 1.18 : 1.0),
      y * scale * (mode === 'bennu' ? 0.92 : 0.86),
      z * scale,
    );
  }
  geo.computeVertexNormals();
}

export function createAsteroidOrCometModel(
  kind: 'bennu' | 'comet-67p' | 'psyche' | 'ceres',
  maxAnisotropy: number,
): THREE.Group {
  const group = new THREE.Group();

  if (kind === 'bennu') {
    const geo = new THREE.IcosahedronGeometry(1.15, 4);
    displaceIrregularGeometry(geo, 'bennu');
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x4b4a48,
      roughness: 0.92,
      metalness: 0.06,
      flatShading: true,
    });
    group.add(new THREE.Mesh(geo, rockMat));

    const boulderMat = new THREE.MeshStandardMaterial({
      color: 0x787670,
      roughness: 0.88,
      metalness: 0.08,
    });
    const boulderOffsets: [number, number, number, number][] = [
      [0.95, 0.2, 0.38, 0.18],
      [-0.86, -0.24, 0.48, 0.15],
      [0.28, 0.84, -0.38, 0.14],
      [-0.32, 0.14, -1.02, 0.2],
      [0.62, -0.58, -0.55, 0.12],
      [-0.55, 0.62, 0.44, 0.13],
    ];
    for (const [bx, by, bz, bs] of boulderOffsets) {
      const b = new THREE.Mesh(new THREE.DodecahedronGeometry(bs, 0), boulderMat);
      b.position.set(bx, by, bz);
      group.add(b);
    }
  } else if (kind === 'comet-67p') {
    const cometMat = new THREE.MeshStandardMaterial({
      color: 0x62666d,
      roughness: 0.92,
      metalness: 0.05,
      flatShading: true,
    });

    const bodyGeo = new THREE.IcosahedronGeometry(0.92, 3);
    displaceIrregularGeometry(bodyGeo, 'rock');
    const body = new THREE.Mesh(bodyGeo, cometMat);
    body.position.set(-0.5, -0.1, 0);
    body.scale.set(1.16, 0.88, 0.95);
    group.add(body);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.44, 0.68, 16), cometMat);
    neck.rotation.z = Math.PI / 2 - 0.25;
    neck.position.set(0.24, 0.12, 0);
    group.add(neck);

    const headGeo = new THREE.IcosahedronGeometry(0.6, 3);
    displaceIrregularGeometry(headGeo, 'rock');
    const head = new THREE.Mesh(headGeo, cometMat);
    head.position.set(0.78, 0.36, 0.08);
    head.scale.set(1.06, 0.85, 0.9);
    group.add(head);

    const coma = createAtmosphereHaloMesh(1.78, 0x38bdf8, 0.48);
    group.add(coma);

    // Ionized anti-sunward cometary tail & twin coma gas jets
    const tailMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ionTail = new THREE.Mesh(new THREE.ConeGeometry(0.95, 3.6, 24, 1, true), tailMat);
    ionTail.rotation.z = -Math.PI / 2 - 0.18;
    ionTail.position.set(-2.05, -0.35, 0);
    group.add(ionTail);
  } else if (kind === 'psyche') {
    const geo = new THREE.IcosahedronGeometry(1.15, 4);
    displaceIrregularGeometry(geo, 'psyche');
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.34,
      metalness: 0.78,
    });
    group.add(new THREE.Mesh(geo, metalMat));
  } else {
    const bundle = createPlanetTextureBundle('ceres', maxAnisotropy);
    const ceresMat = new THREE.MeshStandardMaterial({
      map: bundle.map,
      bumpMap: bundle.bumpMap,
      bumpScale: 0.06,
      roughness: 0.86,
      metalness: 0.06,
    });
    group.add(new THREE.Mesh(new THREE.SphereGeometry(1.22, 48, 36), ceresMat));
  }

  return group;
}

export function createCelestialPreviewGroup(
  kind: CelestialVisualKind,
  maxAnisotropy: number,
): THREE.Group {
  const group = new THREE.Group();

  if (kind === 'bennu' || kind === 'comet-67p' || kind === 'psyche' || kind === 'ceres') {
    return createAsteroidOrCometModel(kind, maxAnisotropy);
  }

  if (kind === 'galaxy-spiral') {
    const galaxyGroup = new THREE.Group();
    galaxyGroup.rotation.x = 0.42;
    galaxyGroup.rotation.z = -0.18;

    const count = 3200;
    const starMesh = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.022, 0),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      count,
    );
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const arm = i % 2;
      const t = Math.pow(i / count, 0.7);
      const r = 0.08 + t * 2.15;
      const spin = r * 2.15 + arm * Math.PI + Math.sin(i * 19.3) * 0.25;
      const spread = Math.sin(i * 11.7) * 0.14 * (0.4 + r * 0.45);
      const y = Math.cos(i * 37.1) * 0.12 / (1 + r * 1.4);
      dummy.position.set(
        Math.cos(spin) * r + spread,
        y,
        Math.sin(spin) * r + Math.cos(i * 7.1) * spread,
      );
      const s = r < 0.35 ? 1.5 : 0.65 + (i % 4) * 0.3;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      starMesh.setMatrixAt(i, dummy.matrix);

      if (r < 0.42) col.setHSL(0.11, 0.9, 0.76);
      else if (i % 15 === 0) col.setHSL(0.92, 0.8, 0.72);
      else col.setHSL(0.56 + (i % 4) * 0.03, 0.82, 0.76);
      starMesh.setColorAt(i, col);
    }
    starMesh.instanceMatrix.needsUpdate = true;
    if (starMesh.instanceColor) starMesh.instanceColor.needsUpdate = true;
    galaxyGroup.add(starMesh);

    const coreHalo = createAtmosphereHaloMesh(0.42, 0xfde68a, 0.9);
    galaxyGroup.add(coreHalo);
    const outerHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 2.25, 72),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    outerHalo.rotation.x = Math.PI / 2;
    galaxyGroup.add(outerHalo);

    group.add(galaxyGroup);
    return group;
  }

  if (kind === 'cosmic-web') {
    const webRadius = 1.65;
    const nodeCount = 52;
    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < nodeCount; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / nodeCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 0.45 + ((i * 37) % 100) / 100 * (webRadius - 0.55);
      nodes.push(
        new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta),
        ),
      );
    }

    const filamentPositions: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].distanceTo(nodes[j]) < 1.15) {
          filamentPositions.push(nodes[i].x, nodes[i].y, nodes[i].z);
          filamentPositions.push(nodes[j].x, nodes[j].y, nodes[j].z);
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(filamentPositions, 3));
    group.add(
      new THREE.LineSegments(
        lineGeo,
        new THREE.LineBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.52,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );

    const clusterMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.055, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 }),
      nodes.length,
    );
    const dummy = new THREE.Object3D();
    nodes.forEach((n, idx) => {
      dummy.position.copy(n);
      dummy.scale.setScalar(idx % 5 === 0 ? 1.6 : 0.85);
      dummy.updateMatrix();
      clusterMesh.setMatrixAt(idx, dummy.matrix);
    });
    clusterMesh.instanceMatrix.needsUpdate = true;
    group.add(clusterMesh);

    const cmbShell = new THREE.Mesh(
      new THREE.SphereGeometry(webRadius + 0.14, 24, 18),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        wireframe: true,
        transparent: true,
        opacity: 0.14,
      }),
    );
    group.add(cmbShell);
    return group;
  }

  if (kind === 'blackhole') {
    // Event horizon black shadow
    const horizon = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 48, 36),
      new THREE.MeshBasicMaterial({ color: 0x010205 }),
    );
    group.add(horizon);

    // Relativistic Doppler-beamed accretion disk (approaching left edge brighter/bluer, receding dimmed red)
    const diskMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vPos;
        void main() {
          float r = length(vPos.xy);
          float ang = atan(vPos.y, vPos.x);
          float omega = 1.8 / pow(max(0.9, r), 1.35);
          float swirl1 = sin(ang * 4.0 - r * 7.2 + uTime * omega * 2.2) * 0.5 + 0.5;
          float swirl2 = cos(ang * 9.0 - r * 14.0 + uTime * omega * 3.1) * 0.5 + 0.5;
          float plasma = swirl1 * 0.65 + swirl2 * 0.35;

          float radial = smoothstep(1.04, 1.24, r) * (1.0 - smoothstep(1.85, 3.05, r));
          float isco = smoothstep(1.45, 1.05, r);

          // Relativistic Doppler beaming: approaching edge (-cos(ang)) appears hotter & boosted
          float doppler = clamp(0.72 + 0.58 * (-cos(ang)), 0.25, 1.45);
          vec3 outerCol = vec3(0.88, 0.24, 0.04);
          vec3 midCol = vec3(1.0, 0.68, 0.22);
          vec3 innerCol = vec3(0.96, 0.94, 1.0);
          vec3 col = mix(outerCol, midCol, clamp(plasma + isco * 0.4, 0.0, 1.0));
          col = mix(col, innerCol, clamp(isco * 0.65 * doppler, 0.0, 1.0));

          gl_FragColor = vec4(col * doppler * (0.65 + plasma * 0.65), radial * 0.95);
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const accretion = new THREE.Mesh(new THREE.RingGeometry(1.04, 3.05, 112, 6), diskMat);
    accretion.rotation.x = Math.PI / 2 - 0.34;
    group.add(accretion);

    // Gravitationally lensed upper/lower Einstein arc bent over the black hole shadow
    const lensArcMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vPos;
        void main() {
          float r = length(vPos.xy);
          float ang = atan(vPos.y, vPos.x);
          float doppler = clamp(0.78 + 0.46 * (-cos(ang)), 0.3, 1.35);
          float ringMask = smoothstep(0.92, 1.06, r) * (1.0 - smoothstep(1.22, 1.62, r));
          float shimmer = sin(ang * 5.0 + uTime * 1.9) * 0.18 + 0.82;
          vec3 col = mix(vec3(0.98, 0.42, 0.08), vec3(1.0, 0.92, 0.72), doppler * 0.6);
          gl_FragColor = vec4(col * doppler * shimmer, ringMask * 0.68);
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const lensArc = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.62, 96, 2), lensArcMat);
    lensArc.rotation.x = 0.22;
    group.add(lensArc);

    const photonHalo = createAtmosphereHaloMesh(1.08, 0xf59e0b, 0.92);
    group.add(photonHalo);

    // Subtle collimated relativistic polar plasma jets
    const jetMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const nJet = new THREE.Mesh(new THREE.ConeGeometry(0.22, 2.6, 24, 1, true), jetMat);
    nJet.position.y = 1.65;
    nJet.rotation.x = Math.PI;
    group.add(nJet);

    const sJet = new THREE.Mesh(new THREE.ConeGeometry(0.22, 2.6, 24, 1, true), jetMat);
    sJet.position.y = -1.65;
    group.add(sJet);

    group.userData.updateTime = (t: number) => {
      diskMat.uniforms.uTime.value = t;
      lensArcMat.uniforms.uTime.value = t;
    };
    return group;
  }

  if (
    kind === 'sun' ||
    kind === 'star-blue' ||
    kind === 'star-red' ||
    kind === 'star-gold' ||
    kind === 'star-orange' ||
    kind === 'pulsar'
  ) {
    const surfaceMat = createStellarSurfaceMaterial(kind);
    const radius = kind === 'pulsar' ? 0.85 : 1.38;
    const core = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 36), surfaceMat);
    group.add(core);

    const coronaColor =
      kind === 'star-blue'
        ? 0x60a5fa
        : kind === 'star-red'
          ? 0xea580c
          : kind === 'star-orange'
            ? 0xf97316
            : kind === 'pulsar'
              ? 0xc084fc
              : 0xfbbf24;

    const corona = createAtmosphereHaloMesh(radius * 1.24, coronaColor, 0.85);
    group.add(corona);

    if (kind !== 'pulsar') {
      // Three arched coronal magnetic prominence loops
      const flareMat = new THREE.MeshBasicMaterial({
        color: coronaColor,
        transparent: true,
        opacity: 0.48,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const flareAngles = [0.2, 2.35, 4.4];
      flareAngles.forEach((ang, idx) => {
        const yOff = (idx - 1) * 0.36;
        const rBase = radius * 0.97;
        const rPeak = radius * (1.28 + idx * 0.05);
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(Math.cos(ang - 0.24) * rBase, yOff - 0.18, Math.sin(ang - 0.24) * rBase),
          new THREE.Vector3(Math.cos(ang) * rPeak, yOff + 0.12, Math.sin(ang) * rPeak),
          new THREE.Vector3(Math.cos(ang + 0.24) * rBase, yOff + 0.3, Math.sin(ang + 0.24) * rBase),
        ]);
        group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.025, 8, false), flareMat));
      });
    } else {
      const jetMat = new THREE.MeshBasicMaterial({
        color: 0xc084fc,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const northJet = new THREE.Mesh(new THREE.ConeGeometry(0.32, 2.2, 24, 1, true), jetMat);
      northJet.position.y = 1.65;
      northJet.rotation.x = Math.PI;
      group.add(northJet);

      const southJet = new THREE.Mesh(new THREE.ConeGeometry(0.32, 2.2, 24, 1, true), jetMat);
      southJet.position.y = -1.65;
      group.add(southJet);

      const torus = new THREE.Mesh(
        new THREE.RingGeometry(1.2, 2.15, 64),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.38,
          blending: THREE.AdditiveBlending,
        }),
      );
      torus.rotation.x = Math.PI / 2 - 0.15;
      group.add(torus);
    }

    group.userData.updateTime = (t: number) => {
      surfaceMat.uniforms.uTime.value = t;
    };
    return group;
  }

  // Planets & Moon (PBR + Tangent-Space Normal Map + Nightside Lights + Real Axial Tilt)
  const bundle =
    kind === 'earth'
      ? createEarthTextureBundle(maxAnisotropy)
      : createPlanetTextureBundle(kind, maxAnisotropy);

  const planetMat = new THREE.MeshStandardMaterial({
    map: bundle.map,
    bumpMap: bundle.bumpMap,
    bumpScale: kind === 'mars' || kind === 'moon' || kind === 'mercury' ? 0.045 : 0.02,
    normalMap: bundle.normalMap,
    normalScale: new THREE.Vector2(
      kind === 'mars' || kind === 'moon' || kind === 'mercury' ? 0.95 : 0.55,
      kind === 'mars' || kind === 'moon' || kind === 'mercury' ? 0.95 : 0.55,
    ),
    roughnessMap: bundle.roughnessMap,
    roughness: kind === 'earth' ? 0.86 : kind === 'mars' || kind === 'moon' ? 0.88 : 0.72,
    metalness: 0.06,
    emissiveMap: bundle.emissiveMap,
    emissive: bundle.emissiveMap ? new THREE.Color(0xffd280) : new THREE.Color(0x000000),
    emissiveIntensity: bundle.emissiveMap ? 0.42 : 0,
  });

  const planetRadius = 1.38;
  const planet = new THREE.Mesh(new THREE.SphereGeometry(planetRadius, 64, 48), planetMat);
  planet.userData.isPlanetSurface = true;
  group.add(planet);

  // Apply realistic axial tilt while preserving ZYX spin around the tilted pole
  const tiltDeg = PLANET_AXIAL_TILT_DEG[kind] ?? 0;
  if (tiltDeg !== 0) {
    group.rotation.order = 'ZYX';
    // Keep Uranus visually approachable at ~78 deg tilt so landmarks remain easy to inspect
    const visualTilt = kind === 'uranus' ? 76 : kind === 'venus' ? 177.36 : tiltDeg;
    group.rotation.z = THREE.MathUtils.degToRad(visualTilt);
  }

  if ((kind === 'earth' || kind === 'exoplanet-temperate') && bundle.cloudMap) {
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(planetRadius * 1.016, 48, 36),
      new THREE.MeshStandardMaterial({
        map: bundle.cloudMap,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        roughness: 0.9,
      }),
    );
    clouds.userData.isCloudLayer = true;
    group.add(clouds);
  }

  const atmoColors: Partial<Record<CelestialVisualKind, [number, number]>> = {
    earth: [0x38bdf8, 0.85],
    mars: [0xfb7185, 0.45],
    venus: [0xfbbf24, 0.68],
    jupiter: [0xfdba74, 0.35],
    saturn: [0xfde68a, 0.35],
    uranus: [0x67e8f9, 0.55],
    neptune: [0x3b82f6, 0.65],
    'exoplanet-temperate': [0x34d399, 0.78],
    'exoplanet-ocean': [0x22d3ee, 0.84],
    'exoplanet-lava': [0xf97316, 0.65],
  };

  const atmo = atmoColors[kind];
  if (atmo) {
    group.add(createAtmosphereHaloMesh(planetRadius * 1.075, atmo[0], atmo[1]));
  }

  if (kind === 'saturn') {
    const ringGeo = createSaturnRingGeometry(1.72, 2.95);
    const ringMat = new THREE.MeshStandardMaterial({
      map: createSaturnRingsTexture(maxAnisotropy),
      side: THREE.DoubleSide,
      transparent: true,
      roughness: 0.8,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  } else if (kind === 'uranus') {
    const uRing = new THREE.Mesh(
      new THREE.RingGeometry(1.78, 2.18, 72),
      new THREE.MeshBasicMaterial({
        color: 0xa5f3fc,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
    );
    uRing.rotation.x = Math.PI / 2;
    group.add(uRing);
  }

  // Orbiting 3D Companion Moons on hairline orbital tracks aligned with equatorial ring plane
  const moonPivots: Array<{ pivot: THREE.Group; speed: number }> = [];
  const addCompanionMoon = (
    orbitR: number,
    moonR: number,
    colorHex: number,
    speed: number,
    tiltX = 0.08,
    phase = 0,
    rocky = false,
  ) => {
    const orbitLoopPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      orbitLoopPts.push(new THREE.Vector3(Math.cos(a) * orbitR, 0, Math.sin(a) * orbitR));
    }
    const orbitFrame = new THREE.Group();
    orbitFrame.rotation.x = tiltX;
    orbitFrame.add(
      new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(orbitLoopPts),
        new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.45 }),
      ),
    );

    const pivot = new THREE.Group();
    pivot.rotation.y = phase;
    const mesh = new THREE.Mesh(
      rocky ? new THREE.DodecahedronGeometry(moonR, 1) : new THREE.SphereGeometry(moonR, 20, 16),
      new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: rocky ? 0.92 : 0.78,
        metalness: 0.05,
        flatShading: rocky,
      }),
    );
    mesh.position.set(orbitR, 0, 0);
    pivot.add(mesh);
    orbitFrame.add(pivot);
    group.add(orbitFrame);
    moonPivots.push({ pivot, speed });
  };

  if (kind === 'earth') {
    addCompanionMoon(2.45, 0.22, 0xcbd5e1, 0.38, 0.09, 0.8);
  } else if (kind === 'mars') {
    addCompanionMoon(1.98, 0.085, 0xa8a29e, 0.72, 0.02, 0.4, true); // Phobos
    addCompanionMoon(2.46, 0.06, 0x94a3b8, 0.35, 0.03, 2.7, true); // Deimos
  } else if (kind === 'jupiter') {
    addCompanionMoon(1.95, 0.12, 0xfbbf24, 0.85, 0.01, 0.2); // Io
    addCompanionMoon(2.3, 0.105, 0xe2e8f0, 0.54, -0.01, 1.9); // Europa
    addCompanionMoon(2.72, 0.15, 0x94a3b8, 0.32, 0.02, 4.1); // Ganymede
  } else if (kind === 'saturn') {
    addCompanionMoon(3.3, 0.17, 0xf59e0b, 0.32, 0.01, 1.1); // Titan
    addCompanionMoon(2.15, 0.07, 0xf8fafc, 0.65, 0.0, 3.8); // Enceladus
  }

  if (moonPivots.length > 0) {
    group.userData.updateTime = (t: number) => {
      for (const mp of moonPivots) {
        mp.pivot.rotation.y = t * mp.speed;
      }
    };
  }

  return group;
}

/**
 * Interactive 3D Host Star + Orbiting Planets + Goldilocks Habitable Zone Ring
 * Used when inspecting any Star System (The Sun, TRAPPIST-1, Kepler-452, Tau Ceti, Proxima).
 */
export function createStarSystemModel(
  body: CelestialBody,
  selectedPlanetId?: string | null,
): THREE.Group {
  const group = new THREE.Group();
  const planets = body.systemPlanets || [];

  const starKind =
    body.visualKind === 'star-blue' ||
    body.visualKind === 'star-red' ||
    body.visualKind === 'star-gold' ||
    body.visualKind === 'star-orange' ||
    body.visualKind === 'pulsar' ||
    body.visualKind === 'sun'
      ? body.visualKind
      : 'sun';

  const starMat = createStellarSurfaceMaterial(starKind);
  const starRadius = starKind === 'star-red' ? 0.36 : 0.44;
  group.add(new THREE.Mesh(new THREE.SphereGeometry(starRadius, 36, 28), starMat));

  const coronaHex =
    starKind === 'star-red' ? 0xfb7185 : starKind === 'star-blue' ? 0x60a5fa : 0xfbbf24;
  group.add(createAtmosphereHaloMesh(starRadius * 1.38, coronaHex, 0.92));

  // Map physical AU values cleanly onto compact visual radii [0.85 .. 2.75]
  const auValues = planets.map((p) => p.orbitRadiusAu);
  if (body.habitableZoneAu) {
    auValues.push(body.habitableZoneAu[0], body.habitableZoneAu[1]);
  }
  const minAu = Math.max(0.005, Math.min(...auValues, 0.01));
  const maxAu = Math.max(minAu * 2, Math.max(...auValues, 1));
  const logMin = Math.log10(minAu);
  const logSpan = Math.max(0.25, Math.log10(maxAu) - logMin);

  const mapAuToSceneR = (au: number) => {
    const t = (Math.log10(Math.max(0.004, au)) - logMin) / logSpan;
    return 0.78 + Math.max(0, Math.min(1.05, t)) * 1.85;
  };

  if (body.habitableZoneAu) {
    const hzInner = mapAuToSceneR(body.habitableZoneAu[0]);
    const hzOuter = Math.max(hzInner + 0.16, mapAuToSceneR(body.habitableZoneAu[1]));
    const hzRing = new THREE.Mesh(
      new THREE.RingGeometry(hzInner, hzOuter, 84),
      new THREE.MeshBasicMaterial({
        color: 0x10b981,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.17,
        depthWrite: false,
      }),
    );
    hzRing.rotation.x = Math.PI / 2;
    group.add(hzRing);
  }

  const orbits: Array<{ pivot: THREE.Group; speed: number }> = [];

  planets.forEach((planet, idx) => {
    const orbitR = mapAuToSceneR(planet.orbitRadiusAu);
    const loopPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      loopPts.push(new THREE.Vector3(Math.cos(a) * orbitR, 0, Math.sin(a) * orbitR));
    }
    group.add(
      new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(loopPts),
        new THREE.LineBasicMaterial({
          color: planet.inHabitableZone ? 0x34d399 : 0x334155,
          transparent: true,
          opacity: planet.inHabitableZone ? 0.68 : 0.45,
        }),
      ),
    );

    const pivot = new THREE.Group();
    pivot.rotation.y = idx * 1.15;

    const pRadius = planet.planetClass.includes('Giant')
      ? 0.14
      : planet.inHabitableZone
        ? 0.105
        : 0.085;
    const pMesh = new THREE.Mesh(
      new THREE.SphereGeometry(pRadius, 24, 18),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(planet.color),
        roughness: 0.55,
        metalness: 0.1,
        emissive: new THREE.Color(planet.color),
        emissiveIntensity: planet.inHabitableZone ? 0.25 : 0.12,
      }),
    );
    pMesh.position.set(orbitR, 0, 0);
    pivot.add(pMesh);

    if (planet.inHabitableZone || planet.id === selectedPlanetId) {
      const selRing = new THREE.Mesh(
        new THREE.RingGeometry(pRadius * 1.45, pRadius * 1.8, 28),
        new THREE.MeshBasicMaterial({
          color: planet.id === selectedPlanetId ? 0x22d3ee : 0x34d399,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: planet.id === selectedPlanetId ? 0.95 : 0.6,
        }),
      );
      selRing.rotation.x = Math.PI / 2;
      selRing.position.set(orbitR, 0, 0);
      pivot.add(selRing);
    }

    const hitProxy = new THREE.Mesh(
      new THREE.SphereGeometry(pRadius * 2.5, 10, 8),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hitProxy.position.set(orbitR, 0, 0);
    hitProxy.userData.systemPlanet = planet;
    pivot.add(hitProxy);

    group.add(pivot);
    const orbitalSpeed = 0.72 / Math.pow(orbitR, 1.15);
    orbits.push({ pivot, speed: orbitalSpeed });
  });

  group.userData.updateTime = (t: number) => {
    starMat.uniforms.uTime.value = t;
    for (const o of orbits) {
      o.pivot.rotation.y = t * o.speed;
    }
  };

  return group;
}

export function createSpacecraftModel(
  modelType: SpacecraftModelType,
  accentHex: string,
): THREE.Group {
  const group = new THREE.Group();

  const goldFoil = new THREE.MeshStandardMaterial({
    color: 0xe6a817,
    metalness: 0.92,
    roughness: 0.22,
  });
  const brushedSilver = new THREE.MeshStandardMaterial({
    color: 0xdbe2ea,
    metalness: 0.85,
    roughness: 0.2,
  });
  const matteWhite = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.08,
    roughness: 0.62,
  });
  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.28,
    roughness: 0.64,
  });
  const solarCellMat = new THREE.MeshStandardMaterial({
    color: 0x102a4c,
    metalness: 0.68,
    roughness: 0.16,
  });
  const copperSolarMat = new THREE.MeshStandardMaterial({
    color: 0x9a5b25,
    metalness: 0.74,
    roughness: 0.2,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentHex),
    emissive: new THREE.Color(accentHex),
    emissiveIntensity: 0.45,
    roughness: 0.3,
    metalness: 0.22,
  });

  if (modelType === 'telescope-roman') {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.15, 24), matteWhite);
    barrel.rotation.z = Math.PI / 2;
    group.add(barrel);

    const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.33, 0.28, 24, 1, true), brushedSilver);
    cowl.rotation.z = Math.PI / 2;
    cowl.position.x = 0.68;
    group.add(cowl);

    const mirror = new THREE.Mesh(new THREE.CircleGeometry(0.28, 24), accentMat);
    mirror.rotation.y = Math.PI / 2;
    mirror.position.x = 0.56;
    group.add(mirror);

    const bus = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.42, 8), goldFoil);
    bus.rotation.z = Math.PI / 2;
    bus.position.x = -0.68;
    group.add(bus);

    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.03, 1.35), solarCellMat);
      wing.position.set(-0.25, 0, side * 1.08);
      group.add(wing);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.04, 0.04), brushedSilver);
      frame.position.set(-0.25, 0, side * 0.42);
      group.add(frame);
    }

    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.4), matteWhite);
    dish.position.set(-0.75, 0.46, 0);
    dish.rotation.x = Math.PI;
    group.add(dish);
  } else if (modelType === 'telescope-jwst') {
    for (let i = 0; i < 3; i++) {
      const shield = new THREE.Mesh(new THREE.BoxGeometry(1.75 - i * 0.08, 0.025, 1.05 - i * 0.05), brushedSilver);
      shield.position.y = -0.18 - i * 0.07;
      shield.rotation.y = Math.PI / 4;
      group.add(shield);
    }

    const hexGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.04, 6);
    const hexOffsets: [number, number][] = [
      [0, 0],
      [0, 0.25],
      [0, -0.25],
      [0.22, 0.125],
      [0.22, -0.125],
      [-0.22, 0.125],
      [-0.22, -0.125],
    ];
    for (const [hz, hy] of hexOffsets) {
      const seg = new THREE.Mesh(hexGeo, goldFoil);
      seg.rotation.z = Math.PI / 2;
      seg.position.set(0.08, 0.34 + hy, hz);
      group.add(seg);
    }

    const secMirror = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 12), carbonMat);
    secMirror.rotation.z = Math.PI / 2;
    secMirror.position.set(0.68, 0.34, 0);
    group.add(secMirror);

    const strutTop = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.65, 8), carbonMat);
    strutTop.position.set(0.38, 0.48, 0);
    strutTop.rotation.z = Math.PI / 2 + 0.38;
    group.add(strutTop);

    const bus = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.35), goldFoil);
    bus.position.set(-0.08, -0.45, 0);
    group.add(bus);
  } else if (modelType === 'station-iss') {
    const truss = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 2.5), brushedSilver);
    group.add(truss);

    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.3, 16), matteWhite);
    core.rotation.z = Math.PI / 2;
    group.add(core);

    const labCross = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.72, 16), brushedSilver);
    labCross.rotation.x = Math.PI / 2;
    labCross.position.x = 0.25;
    group.add(labCross);

    for (const zPos of [-1.05, -0.78, 0.78, 1.05]) {
      for (const xSide of [-0.55, 0.55]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.2), copperSolarMat);
        wing.position.set(xSide, 0, zPos);
        group.add(wing);
      }
    }

    for (const zPos of [-0.36, 0.36]) {
      const rad = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.16), matteWhite);
      rad.position.set(-0.32, 0.08, zPos);
      group.add(rad);
    }
  } else if (modelType === 'station-tiangong') {
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 16), matteWhite);
    core.rotation.z = Math.PI / 2;
    group.add(core);

    const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.1, 16), brushedSilver);
    cross.rotation.x = Math.PI / 2;
    cross.position.x = 0.45;
    group.add(cross);

    for (const zSide of [-0.75, 0.75]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.7), solarCellMat);
      wing.position.set(0.45, 0, zSide);
      group.add(wing);
    }
    for (const zSide of [-0.48, 0.48]) {
      const rearWing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.45), solarCellMat);
      rearWing.position.set(-0.35, 0, zSide);
      group.add(rearWing);
    }
  } else if (modelType === 'probe-voyager') {
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.08, 0.18, 24, 1, true), matteWhite);
    dish.rotation.z = Math.PI / 2;
    dish.position.x = 0.18;
    group.add(dish);

    const bus = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.24, 10), goldFoil);
    bus.rotation.z = Math.PI / 2;
    bus.position.x = -0.05;
    group.add(bus);

    const magBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 1.65, 8), brushedSilver);
    magBoom.position.set(-0.1, 0.75, 0);
    group.add(magBoom);

    const rtgBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.85, 8), carbonMat);
    rtgBoom.rotation.x = Math.PI / 3;
    rtgBoom.position.set(-0.15, -0.35, 0.4);
    group.add(rtgBoom);

    const feed = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), accentMat);
    feed.position.set(0.45, 0, 0);
    group.add(feed);
  } else if (modelType === 'probe-solar') {
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 6), carbonMat);
    shield.rotation.z = Math.PI / 2;
    shield.position.x = 0.42;
    group.add(shield);

    const bus = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.65, 8), brushedSilver);
    bus.rotation.z = Math.PI / 2;
    group.add(bus);

    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.48), solarCellMat);
      wing.position.set(-0.1, 0, side * 0.45);
      wing.rotation.y = side * 0.35;
      group.add(wing);
    }

    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), goldFoil);
    boom.rotation.z = Math.PI / 2;
    boom.position.x = -0.65;
    group.add(boom);
  } else if (modelType === 'rover-mars') {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.24, 0.42), matteWhite);
    chassis.position.y = 0.22;
    group.add(chassis);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 8), brushedSilver);
    mast.position.set(0.18, 0.5, 0.08);
    group.add(mast);

    const camHead = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.18), matteWhite);
    camHead.position.set(0.2, 0.72, 0.08);
    group.add(camHead);

    const rtg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.28, 10), goldFoil);
    rtg.rotation.z = -0.5;
    rtg.position.set(-0.34, 0.28, 0);
    group.add(rtg);

    const wheelGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.07, 12);
    for (const wx of [-0.25, 0, 0.25]) {
      for (const wz of [-0.26, 0.26]) {
        const w = new THREE.Mesh(wheelGeo, carbonMat);
        w.rotation.x = Math.PI / 2;
        w.position.set(wx, 0.09, wz);
        group.add(w);
      }
    }
  } else {
    const bus = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, modelType === 'telescope-hubble' ? 0.95 : 0.48, 12),
      modelType === 'telescope-hubble' ? brushedSilver : goldFoil,
    );
    bus.rotation.z = Math.PI / 2;
    group.add(bus);

    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.06, 0.1, 16), matteWhite);
    dish.rotation.z = Math.PI / 2;
    dish.position.x = modelType === 'telescope-hubble' ? -0.52 : 0.34;
    group.add(dish);

    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.95), solarCellMat);
      wing.position.set(0, 0, side * 0.72);
      group.add(wing);
    }

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), accentMat);
    beacon.position.y = 0.28;
    group.add(beacon);
  }

  return group;
}
