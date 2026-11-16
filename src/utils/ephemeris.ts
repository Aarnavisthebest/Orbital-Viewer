import * as Astronomy from 'astronomy-engine';
import * as THREE from 'three';

const AU_KM = 149597870.7;
const SPEED_OF_LIGHT_KM_S = 299792.458;
const J2000_OBLIQUITY_RAD = (23.4392911 * Math.PI) / 180;
const COS_OBL = Math.cos(J2000_OBLIQUITY_RAD);
const SIN_OBL = Math.sin(J2000_OBLIQUITY_RAD);

export const ASTRONOMY_BODIES: Record<string, Astronomy.Body> = {
  sun: Astronomy.Body.Sun,
  moon: Astronomy.Body.Moon,
  mercury: Astronomy.Body.Mercury,
  venus: Astronomy.Body.Venus,
  earth: Astronomy.Body.Earth,
  mars: Astronomy.Body.Mars,
  jupiter: Astronomy.Body.Jupiter,
  saturn: Astronomy.Body.Saturn,
  uranus: Astronomy.Body.Uranus,
  neptune: Astronomy.Body.Neptune,
};

export interface LiveBodyEphemeris {
  bodyId: string;
  auFromEarth: number;
  kmFromEarth: number;
  auFromSun: number;
  oneWayLightTimeLabel: string;
  raFormatted: string;
  decFormatted: string;
  elongationDeg: number;
  phasePercent: number;
  magnitude: number;
  eclipticLonDeg: number;
  eclipticLatDeg: number;
  /** Real heliocentric ecliptic coordinates in AU (Scene convention: X=Vernal Equinox, Y=North Ecliptic Pole, Z=-Y_ecl) */
  helioSceneAu: { x: number; y: number; z: number };
}

export function epochYearToDate(epochYear: number, liveNow?: Date): Date {
  const refNow = liveNow ?? new Date();
  const currentFrac = getCurrentEpochYear(refNow);
  if (Math.abs(epochYear - currentFrac) < 0.002) {
    return refNow;
  }
  const yr = Math.floor(epochYear);
  const frac = epochYear - yr;
  const start = Date.UTC(yr, 0, 1, 0, 0, 0);
  const end = Date.UTC(yr + 1, 0, 1, 0, 0, 0);
  return new Date(start + frac * (end - start));
}

export function getCurrentEpochYear(date: Date = new Date()): number {
  const yr = date.getUTCFullYear();
  const start = Date.UTC(yr, 0, 1, 0, 0, 0);
  const end = Date.UTC(yr + 1, 0, 1, 0, 0, 0);
  return yr + (date.getTime() - start) / (end - start);
}

/**
 * Converts a J2000 equatorial vector (astronomy-engine HelioVector / GeoVector)
 * into right-handed Three.js ecliptic coordinates (Y up = North Ecliptic Pole, counter-clockwise orbits).
 */
export function eqVectorToEclipticScene(v: Astronomy.Vector): THREE.Vector3 {
  const xEcl = v.x;
  const yEcl = v.y * COS_OBL + v.z * SIN_OBL;
  const zEcl = -v.y * SIN_OBL + v.z * COS_OBL;
  return new THREE.Vector3(xEcl, zEcl, -yEcl);
}

/**
 * Non-linear radial compression mapping real AU distances cleanly onto Three.js scene radii
 * while preserving true 360-degree heliocentric ecliptic longitudes and inclinations!
 */
export function getHeliocentricScenePosition(
  bodyId: string,
  date: Date,
  scale: 'inner-solar' | 'outer-solar',
  target: THREE.Vector3 = new THREE.Vector3(),
): THREE.Vector3 {
  const astroBody = ASTRONOMY_BODIES[bodyId];
  if (!astroBody || bodyId === 'sun') {
    return target.set(0, 0, 0);
  }
  const vec = Astronomy.HelioVector(astroBody, date);
  const dir = eqVectorToEclipticScene(vec);
  const realAu = dir.length();
  if (realAu < 1e-6) return target.set(0, 0, 0);

  let visualRadius = 10;
  if (scale === 'inner-solar') {
    // 0.39 AU (Mercury) -> ~6.3, 1.00 AU (Earth) -> ~13.0, 1.52 AU (Mars) -> ~17.8
    visualRadius = 3.2 + Math.pow(realAu, 0.72) * 9.8;
  } else {
    // 1.0 AU -> ~6.2, 5.2 AU (Jupiter) -> ~17.2, 9.5 AU (Saturn) -> ~23.2, 19.2 AU (Uranus) -> ~28.5, 30 AU -> ~32.5
    visualRadius = 2.8 + Math.log1p(realAu * 1.1) * 8.4;
  }

  return target.copy(dir).normalize().multiplyScalar(visualRadius);
}

/**
 * Samples a true full-orbit ellipse/trajectory from astronomy-engine across 1 orbital period!
 */
export function sampleRealOrbitalLoop(
  bodyId: string,
  centerDate: Date,
  scale: 'inner-solar' | 'outer-solar',
  segments = 96,
): THREE.Vector3[] {
  const periodDays: Record<string, number> = {
    mercury: 87.97,
    venus: 224.7,
    earth: 365.256,
    mars: 686.98,
    jupiter: 4332.59,
    saturn: 10759.22,
    uranus: 30688.5,
    neptune: 60182,
  };
  const totalDays = periodDays[bodyId] ?? 365.256;
  const startMs = centerDate.getTime() - (totalDays * 86400_000) / 2;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const d = new Date(startMs + (i / segments) * totalDays * 86400_000);
    pts.push(getHeliocentricScenePosition(bodyId, d, scale));
  }
  return pts;
}

/**
 * Computes real subsolar point (lat/lon in degrees) for Earth's exact solar terminator at `date`.
 */
export function getSubsolarLatLon(date: Date): { latDeg: number; lonDeg: number } {
  const observer = new Astronomy.Observer(0, 0, 0);
  const eq = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true);
  const gmstHours = Astronomy.SiderealTime(date);
  let lonDeg = (eq.ra - gmstHours) * 15;
  lonDeg = ((((lonDeg + 180) % 360) + 360) % 360) - 180;
  return {
    latDeg: eq.dec,
    lonDeg,
  };
}

/**
 * Converts geocentric ECI vector or lat/lon to Earth-local Three.js vector aligned with our SphereGeometry UVs.
 * Matches proceduralAssets.latLonToVector3 exactly.
 */
export function geodeticToSceneVec3(latDeg: number, lonDeg: number, radius: number): THREE.Vector3 {
  const normLon = (((lonDeg + 180) % 360) + 360) % 360;
  const phi = (normLon / 360) * Math.PI * 2;
  const theta = ((90 - latDeg) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export function formatRa(raHours: number): string {
  const norm = ((raHours % 24) + 24) % 24;
  const h = Math.floor(norm);
  const mFloat = (norm - h) * 60;
  const m = Math.floor(mFloat);
  const s = Math.floor((mFloat - m) * 60);
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export function formatDec(decDeg: number): string {
  const sign = decDeg >= 0 ? '+' : '-';
  const abs = Math.abs(decDeg);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  return `${sign}${String(d).padStart(2, '0')}° ${String(m).padStart(2, '0')}′`;
}

export function formatLightTime(km: number): string {
  const sec = km / SPEED_OF_LIGHT_KM_S;
  if (sec < 60) return `${sec.toFixed(2)} sec`;
  const min = sec / 60;
  if (min < 60) {
    const wholeMin = Math.floor(min);
    const remSec = Math.round((min - wholeMin) * 60);
    return `${wholeMin}m ${String(remSec).padStart(2, '0')}s`;
  }
  const hrs = min / 60;
  return `${hrs.toFixed(2)} hr`;
}

export function getLiveBodyEphemeris(
  bodyId: string,
  date: Date = new Date(),
): LiveBodyEphemeris | null {
  const astroBody = ASTRONOMY_BODIES[bodyId];
  if (!astroBody) return null;

  const observer = new Astronomy.Observer(0, 0, 0);

  if (bodyId === 'earth') {
    const sunGeo = Astronomy.GeoVector(Astronomy.Body.Sun, date, true);
    const helio = Astronomy.HelioVector(Astronomy.Body.Earth, date);
    const sceneHelio = eqVectorToEclipticScene(helio);
    const auSun = sunGeo.Length();
    return {
      bodyId,
      auFromEarth: 0,
      kmFromEarth: 0,
      auFromSun: auSun,
      oneWayLightTimeLabel: '0.00 sec (Home)',
      raFormatted: '00h 00m 00s',
      decFormatted: '+00° 00′',
      elongationDeg: 0,
      phasePercent: 100,
      magnitude: -26.74,
      eclipticLonDeg: ((Math.atan2(-sceneHelio.z, sceneHelio.x) * 180) / Math.PI + 360) % 360,
      eclipticLatDeg: 0,
      helioSceneAu: { x: sceneHelio.x, y: sceneHelio.y, z: sceneHelio.z },
    };
  }

  const geoVec = Astronomy.GeoVector(astroBody, date, true);
  const auFromEarth = geoVec.Length();
  const kmFromEarth = auFromEarth * AU_KM;

  const helioVec =
    bodyId === 'sun'
      ? new Astronomy.Vector(0, 0, 0, Astronomy.MakeTime(date))
      : Astronomy.HelioVector(astroBody, date);
  const sceneHelio = eqVectorToEclipticScene(helioVec);
  const auFromSun = bodyId === 'sun' ? 0 : helioVec.Length();

  const eq = Astronomy.Equator(astroBody, date, observer, true, true);
  const illum = Astronomy.Illumination(astroBody, date);

  let elongDeg = 0;
  if (bodyId !== 'sun') {
    try {
      elongDeg = Astronomy.Elongation(astroBody, date).elongation;
    } catch {
      elongDeg = 0;
    }
  }

  const eclLon = ((Math.atan2(-sceneHelio.z, sceneHelio.x) * 180) / Math.PI + 360) % 360;
  const eclLat =
    auFromSun > 0 ? (Math.asin(Math.max(-1, Math.min(1, sceneHelio.y / auFromSun))) * 180) / Math.PI : 0;

  return {
    bodyId,
    auFromEarth,
    kmFromEarth,
    auFromSun,
    oneWayLightTimeLabel: formatLightTime(kmFromEarth),
    raFormatted: formatRa(eq.ra),
    decFormatted: formatDec(eq.dec),
    elongationDeg: elongDeg,
    phasePercent: Math.round((illum.phase_fraction ?? 1) * 1000) / 10,
    magnitude: Math.round((illum.mag ?? 0) * 100) / 100,
    eclipticLonDeg: Math.round(eclLon * 10) / 10,
    eclipticLatDeg: Math.round(eclLat * 100) / 100,
    helioSceneAu: { x: sceneHelio.x, y: sceneHelio.y, z: sceneHelio.z },
  };
}

/**
 * Moon position vector relative to Earth in Three.js equatorial/ecliptic scene coordinates.
 */
export function getMoonRelativeScenePos(date: Date, sceneOrbitRadius: number): THREE.Vector3 {
  const geoMoon = Astronomy.GeoVector(Astronomy.Body.Moon, date, true);
  const ecl = eqVectorToEclipticScene(geoMoon);
  if (ecl.lengthSq() < 1e-12) return new THREE.Vector3(sceneOrbitRadius, 0, 0);
  return ecl.normalize().multiplyScalar(sceneOrbitRadius);
}
