import { useEffect, useMemo, useRef, useState } from 'react';
import {
  degreesLat,
  degreesLong,
  eciToGeodetic,
  gstime,
  json2satrec,
  propagate,
  type OMMJsonObject,
  type SatRec,
} from 'satellite.js';
import { getLiveBodyEphemeris, getSubsolarLatLon } from '../utils/ephemeris';

export interface LiveOrbitalTrackItem {
  id: string;
  noradId: number;
  callsign: string;
  name: string;
  agency: string;
  regime: 'LEO' | 'SSO' | 'MEO' | 'GEO' | 'HEO';
  spaceObjectId?: string;
  color: string;
  latitude: number;
  longitude: number;
  altitudeKm: number;
  velocityKmS: number;
  headingDeg: number;
  inclinationDeg: number;
  periodMin: number;
  footprintKm: number;
  visibility: 'Daylight' | 'Eclipse';
  source: 'celestrak-sgp4' | 'wheretheiss-live' | 'ephemeris';
}

export interface DeepSpaceRadarItem {
  id: string;
  callsign: string;
  name: string;
  regime: string;
  spaceObjectId?: string;
  celestialBodyId?: string;
  color: string;
  distanceLabel: string;
  auFromEarth: number;
  auFromSun: number;
  velocityKmS: number;
  lightTimeOneWay: string;
  raFormatted: string;
  decFormatted: string;
  phaseOrElong: string;
}

export interface GroundTrackPoint {
  lat: number;
  lon: number;
  altKm: number;
}

interface CatalogMeta {
  callsign: string;
  name: string;
  agency: string;
  regime: 'LEO' | 'SSO' | 'MEO' | 'GEO' | 'HEO';
  spaceObjectId?: string;
  color: string;
}

const NORAD_META: Record<number, CatalogMeta> = {
  25544: {
    callsign: 'ISS-ZARYA',
    name: 'International Space Station',
    agency: 'NASA · ESA · JAXA · CSA · Roscosmos',
    regime: 'LEO',
    spaceObjectId: 'iss',
    color: '#22D3EE',
  },
  48274: {
    callsign: 'CSS-TIANHE',
    name: 'Tiangong Space Station',
    agency: 'CMSA',
    regime: 'LEO',
    spaceObjectId: 'tiangong',
    color: '#F59E0B',
  },
  20580: {
    callsign: 'HST-HUBBLE',
    name: 'Hubble Space Telescope',
    agency: 'NASA · ESA',
    regime: 'LEO',
    spaceObjectId: 'hubble',
    color: '#38BDF8',
  },
  49260: {
    callsign: 'LANDSAT-9',
    name: 'Landsat 9 Earth Imager',
    agency: 'NASA · USGS',
    regime: 'SSO',
    spaceObjectId: 'landsat-9',
    color: '#34D399',
  },
  41866: {
    callsign: 'GOES-16-EAST',
    name: 'GOES-East Weather Sentinel',
    agency: 'NOAA · NASA',
    regime: 'GEO',
    spaceObjectId: 'goes-east',
    color: '#A78BFA',
  },
  48859: {
    callsign: 'GPS-III-SV05',
    name: 'GPS Block III Space Vehicle 05',
    agency: 'USSF',
    regime: 'MEO',
    spaceObjectId: 'gps',
    color: '#FBBF24',
  },
  43013: {
    callsign: 'NOAA-20',
    name: 'NOAA-20 Polar Weather (JPSS-1)',
    agency: 'NOAA · NASA',
    regime: 'SSO',
    color: '#2DD4BF',
  },
  44713: {
    callsign: 'STARLINK-1007',
    name: 'Starlink Broadband Shell-1',
    agency: 'SpaceX',
    regime: 'LEO',
    spaceObjectId: 'starlink',
    color: '#94A3B8',
  },
  43435: {
    callsign: 'TESS-HEO',
    name: 'Transiting Exoplanet Survey Sat',
    agency: 'NASA',
    regime: 'HEO',
    spaceObjectId: 'tess',
    color: '#60A5FA',
  },
  25867: {
    callsign: 'CXO-CHANDRA',
    name: 'Chandra X-ray Observatory',
    agency: 'NASA',
    regime: 'HEO',
    spaceObjectId: 'chandra',
    color: '#C084FC',
  },
};

const DEFAULT_OMM_LIST: OMMJsonObject[] = [
  {
    OBJECT_NAME: 'ISS (ZARYA)',
    OBJECT_ID: '1998-067A',
    EPOCH: '2026-11-15T12:00:00.000000',
    MEAN_MOTION: 15.49560532,
    ECCENTRICITY: 0.0006703,
    INCLINATION: 51.6416,
    RA_OF_ASC_NODE: 247.4627,
    ARG_OF_PERICENTER: 130.536,
    MEAN_ANOMALY: 325.0288,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: 25544,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 48200,
    BSTAR: 0.00036771,
    MEAN_MOTION_DOT: 0.00016717,
    MEAN_MOTION_DDOT: 0,
  },
  {
    OBJECT_NAME: 'CSS (TIANHE)',
    OBJECT_ID: '2021-035A',
    EPOCH: '2026-11-15T12:00:00.000000',
    MEAN_MOTION: 15.59124,
    ECCENTRICITY: 0.00048,
    INCLINATION: 41.4742,
    RA_OF_ASC_NODE: 112.82,
    ARG_OF_PERICENTER: 84.15,
    MEAN_ANOMALY: 214.4,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: 48274,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 31400,
    BSTAR: 0.00028,
    MEAN_MOTION_DOT: 0.00019,
    MEAN_MOTION_DDOT: 0,
  },
  {
    OBJECT_NAME: 'HST',
    OBJECT_ID: '1990-037B',
    EPOCH: '2026-11-15T12:00:00.000000',
    MEAN_MOTION: 15.1621,
    ECCENTRICITY: 0.00028,
    INCLINATION: 28.469,
    RA_OF_ASC_NODE: 68.42,
    ARG_OF_PERICENTER: 290.1,
    MEAN_ANOMALY: 70.2,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: 20580,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 91200,
    BSTAR: 0.00014,
    MEAN_MOTION_DOT: 0.00004,
    MEAN_MOTION_DDOT: 0,
  },
  {
    OBJECT_NAME: 'LANDSAT 9',
    OBJECT_ID: '2021-088A',
    EPOCH: '2026-11-15T12:00:00.000000',
    MEAN_MOTION: 14.57107,
    ECCENTRICITY: 0.00012,
    INCLINATION: 98.215,
    RA_OF_ASC_NODE: 38.6,
    ARG_OF_PERICENTER: 91.4,
    MEAN_ANOMALY: 268.5,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: 49260,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 27100,
    BSTAR: 0.00006,
    MEAN_MOTION_DOT: 0.000002,
    MEAN_MOTION_DDOT: 0,
  },
  {
    OBJECT_NAME: 'GOES 16',
    OBJECT_ID: '2016-071A',
    EPOCH: '2026-11-15T12:00:00.000000',
    MEAN_MOTION: 1.002705,
    ECCENTRICITY: 0.00014,
    INCLINATION: 0.042,
    RA_OF_ASC_NODE: 294.1,
    ARG_OF_PERICENTER: 145.2,
    MEAN_ANOMALY: 210.4,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: 41866,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 3650,
    BSTAR: 0,
    MEAN_MOTION_DOT: 0,
    MEAN_MOTION_DDOT: 0,
  },
  {
    OBJECT_NAME: 'GPS BIII-05 (PRN 11)',
    OBJECT_ID: '2021-054A',
    EPOCH: '2026-11-15T12:00:00.000000',
    MEAN_MOTION: 2.00563,
    ECCENTRICITY: 0.0021,
    INCLINATION: 55.12,
    RA_OF_ASC_NODE: 152.4,
    ARG_OF_PERICENTER: 42.3,
    MEAN_ANOMALY: 132.8,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: 48859,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 3940,
    BSTAR: 0,
    MEAN_MOTION_DOT: 0,
    MEAN_MOTION_DDOT: 0,
  },
];

function computeFootprintDiameterKm(altKm: number): number {
  const earthR = 6371;
  const rho = Math.acos(earthR / (earthR + Math.max(120, altKm)));
  return Math.round(2 * earthR * rho);
}

function isPointSunlit(
  satLatDeg: number,
  satLonDeg: number,
  altKm: number,
  subsolarLatDeg: number,
  subsolarLonDeg: number,
): boolean {
  const d2r = Math.PI / 180;
  const lat1 = satLatDeg * d2r;
  const lon1 = satLonDeg * d2r;
  const lat2 = subsolarLatDeg * d2r;
  const lon2 = subsolarLonDeg * d2r;
  const cosAng =
    Math.sin(lat1) * Math.sin(lat2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2);
  const centralAngle = Math.acos(Math.max(-1, Math.min(1, cosAng)));
  const earthR = 6371;
  const horizonExt = Math.acos(earthR / (earthR + Math.max(100, altKm)));
  return centralAngle < Math.PI / 2 + horizonExt;
}

function computeBearingDeg(lat1Deg: number, lon1Deg: number, lat2Deg: number, lon2Deg: number): number {
  const d2r = Math.PI / 180;
  const lat1 = lat1Deg * d2r;
  const lat2 = lat2Deg * d2r;
  const dLon = (lon2Deg - lon1Deg) * d2r;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brg = (Math.atan2(y, x) * 180) / Math.PI;
  return (brg + 360) % 360;
}

interface CompiledSat {
  noradId: number;
  meta: CatalogMeta;
  omm: OMMJsonObject;
  satrec: SatRec;
}

function compileOmmRecords(records: OMMJsonObject[]): CompiledSat[] {
  const list: CompiledSat[] = [];
  for (const omm of records) {
    try {
      const noradId = Number(omm.NORAD_CAT_ID);
      if (!Number.isFinite(noradId) || noradId <= 0) continue;
      const satrec = json2satrec(omm);
      const fallbackMeta: CatalogMeta = NORAD_META[noradId] ?? {
        callsign: omm.OBJECT_NAME.replace(/\s+/g, '-').slice(0, 14),
        name: omm.OBJECT_NAME,
        agency: 'Active Orbital Catalog',
        regime: Number(omm.MEAN_MOTION) < 1.5 ? 'GEO' : Number(omm.MEAN_MOTION) < 4 ? 'MEO' : 'LEO',
        color: '#38BDF8',
      };
      list.push({ noradId, meta: fallbackMeta, omm, satrec });
    } catch {
      // Skip malformed GP entry cleanly
    }
  }
  return list;
}

function propagateSingleSat(
  sat: CompiledSat,
  date: Date,
  subsolar: { latDeg: number; lonDeg: number },
  issOverride?: {
    latitude: number;
    longitude: number;
    altitude: number;
    velocity: number;
    visibility: string;
    fetchedAt: number;
  } | null,
): LiveOrbitalTrackItem | null {
  try {
    const pv = propagate(sat.satrec, date);
    if (!pv || !pv.position || typeof pv.position === 'boolean') return null;
    const gmst = gstime(date);
    const geodetic = eciToGeodetic(pv.position, gmst);

    let lat = degreesLat(geodetic.latitude);
    let lon = degreesLong(geodetic.longitude);
    let altKm = geodetic.height;
    let speedKmS =
      pv.velocity && typeof pv.velocity !== 'boolean'
        ? Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z)
        : 7.66;

    // Look 5 seconds ahead for exact instantaneous ground track heading
    const futureDate = new Date(date.getTime() + 5000);
    const pvNext = propagate(sat.satrec, futureDate);
    let headingDeg = 90;
    if (pvNext && pvNext.position && typeof pvNext.position !== 'boolean') {
      const geoNext = eciToGeodetic(pvNext.position, gstime(futureDate));
      headingDeg = computeBearingDeg(
        lat,
        lon,
        degreesLat(geoNext.latitude),
        degreesLong(geoNext.longitude),
      );
    }

    let source: LiveOrbitalTrackItem['source'] = 'celestrak-sgp4';
    let visibility: 'Daylight' | 'Eclipse' = isPointSunlit(
      lat,
      lon,
      altKm,
      subsolar.latDeg,
      subsolar.lonDeg,
    )
      ? 'Daylight'
      : 'Eclipse';

    // Blend recent wheretheiss.at precision reading for ISS if fresh (<12s old)
    if (sat.noradId === 25544 && issOverride && Date.now() - issOverride.fetchedAt < 12000) {
      lat = issOverride.latitude;
      lon = issOverride.longitude;
      altKm = issOverride.altitude;
      speedKmS = issOverride.velocity / 3600;
      visibility = issOverride.visibility === 'eclipsed' ? 'Eclipse' : 'Daylight';
      source = 'wheretheiss-live';
    }

    const mm = Number(sat.omm.MEAN_MOTION) || 15;
    return {
      id: `norad-${sat.noradId}`,
      noradId: sat.noradId,
      callsign: sat.meta.callsign,
      name: sat.meta.name,
      agency: sat.meta.agency,
      regime: sat.meta.regime,
      spaceObjectId: sat.meta.spaceObjectId,
      color: sat.meta.color,
      latitude: lat,
      longitude: lon,
      altitudeKm: Math.max(120, altKm),
      velocityKmS: speedKmS,
      headingDeg,
      inclinationDeg: Number(sat.omm.INCLINATION) || 0,
      periodMin: 1440 / mm,
      footprintKm: computeFootprintDiameterKm(altKm),
      visibility,
      source,
    };
  } catch {
    return null;
  }
}

export function useLiveSpaceTracker(selectedNoradId: number = 25544) {
  const compiledRef = useRef<CompiledSat[]>(compileOmmRecords(DEFAULT_OMM_LIST));
  const issOverrideRef = useRef<{
    latitude: number;
    longitude: number;
    altitude: number;
    velocity: number;
    visibility: string;
    fetchedAt: number;
  } | null>(null);

  const [nowDate, setNowDate] = useState<Date>(() => new Date());
  const [feedSource, setFeedSource] = useState<'celestrak-live' | 'hybrid-fallback'>('hybrid-fallback');
  const [tracks, setTracks] = useState<LiveOrbitalTrackItem[]>(() => {
    const d = new Date();
    const sub = getSubsolarLatLon(d);
    return compiledRef.current
      .map((sat) => propagateSingleSat(sat, d, sub, null))
      .filter((x): x is LiveOrbitalTrackItem => Boolean(x));
  });

  // Fetch CelesTrak GP + live ISS telemetry from our Express proxy every 60s
  useEffect(() => {
    let active = true;
    async function syncLiveCatalog() {
      try {
        const res = await fetch('/api/live-track');
        if (!res.ok) return;
        const data = (await res.json()) as {
          source?: 'celestrak-live' | 'hybrid-fallback';
          records?: OMMJsonObject[];
          issLive?: Record<string, unknown> | null;
        };
        if (!active) return;
        if (Array.isArray(data.records) && data.records.length > 0) {
          const nextCompiled = compileOmmRecords(data.records);
          if (nextCompiled.length > 0) {
            compiledRef.current = nextCompiled;
          }
        }
        if (data.source) setFeedSource(data.source);
        if (data.issLive && typeof data.issLive.latitude === 'number') {
          issOverrideRef.current = {
            latitude: Number(data.issLive.latitude),
            longitude: Number(data.issLive.longitude),
            altitude: Number(data.issLive.altitude),
            velocity: Number(data.issLive.velocity),
            visibility: String(data.issLive.visibility || 'daylight'),
            fetchedAt: Date.now(),
          };
        }
      } catch {
        // Silent retain of compiled SGP4 elements
      }
    }

    syncLiveCatalog();
    const poll = window.setInterval(syncLiveCatalog, 60_000);
    return () => {
      active = false;
      window.clearInterval(poll);
    };
  }, []);

  // Re-propagate live satellite & astronomical positions every 1 second!
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNowDate(d);
      const sub = getSubsolarLatLon(d);
      const next = compiledRef.current
        .map((sat) => propagateSingleSat(sat, d, sub, issOverrideRef.current))
        .filter((x): x is LiveOrbitalTrackItem => Boolean(x));
      setTracks(next);
    };

    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Compute full 1-orbit past+future ground track curve for the selected NORAD object
  const selectedGroundTrack = useMemo(() => {
    const sat = compiledRef.current.find((c) => c.noradId === selectedNoradId) ?? compiledRef.current[0];
    if (!sat) return { past: [] as GroundTrackPoint[], future: [] as GroundTrackPoint[] };

    const periodMin = Math.min(180, Math.max(85, 1440 / (Number(sat.omm.MEAN_MOTION) || 15)));
    const pastWindowMin = Math.min(35, periodMin * 0.35);
    const futureWindowMin = Math.min(95, periodMin * 1.0);

    const sampleRange = (startMin: number, endMin: number, steps: number): GroundTrackPoint[] => {
      const pts: GroundTrackPoint[] = [];
      for (let i = 0; i <= steps; i++) {
        const offsetMs = (startMin + ((endMin - startMin) * i) / steps) * 60_000;
        const t = new Date(nowDate.getTime() + offsetMs);
        const pv = propagate(sat.satrec, t);
        if (pv && pv.position && typeof pv.position !== 'boolean') {
          const geo = eciToGeodetic(pv.position, gstime(t));
          pts.push({
            lat: degreesLat(geo.latitude),
            lon: degreesLong(geo.longitude),
            altKm: geo.height,
          });
        }
      }
      return pts;
    };

    return {
      past: sampleRange(-pastWindowMin, 0, 28),
      future: sampleRange(0, futureWindowMin, 72),
    };
  }, [selectedNoradId, nowDate]);

  // Real-time astronomical Deep Space & Solar System radar contacts via astronomy-engine
  const deepSpaceContacts = useMemo<DeepSpaceRadarItem[]>(() => {
    const sunEph = getLiveBodyEphemeris('sun', nowDate);
    const moonEph = getLiveBodyEphemeris('moon', nowDate);
    const marsEph = getLiveBodyEphemeris('mars', nowDate);
    const jupEph = getLiveBodyEphemeris('jupiter', nowDate);
    const satEph = getLiveBodyEphemeris('saturn', nowDate);
    const venEph = getLiveBodyEphemeris('venus', nowDate);

    // Exact secular distance of Voyager 1 (17.0 km/s radial heliocentric escape since Sep 5, 1977)
    const yearsSinceVoyagerLaunch =
      (nowDate.getTime() - Date.UTC(1977, 8, 5)) / (365.25 * 86400_000);
    const v1Au = 152.2 + (yearsSinceVoyagerLaunch - 43.3) * 3.57;
    const v1Km = v1Au * 149597870.7;
    const v1LightHrs = v1Km / 299792.458 / 3600;

    const list: DeepSpaceRadarItem[] = [
      {
        id: 'ds-roman',
        callsign: 'ROMAN-L2',
        name: 'Nancy Grace Roman Telescope',
        regime: 'Sun-Earth L2 Halo',
        spaceObjectId: 'roman',
        color: '#06B6D4',
        distanceLabel: '1,502,400 km',
        auFromEarth: 0.01004,
        auFromSun: (sunEph?.auFromEarth ?? 1.0) + 0.01004,
        velocityKmS: 1.02,
        lightTimeOneWay: '5.01 sec',
        raFormatted: sunEph ? sunEph.raFormatted : '03h 22m',
        decFormatted: sunEph ? sunEph.decFormatted : '+18° 12′',
        phaseOrElong: 'Anti-Sunward L2 Halo',
      },
      {
        id: 'ds-jwst',
        callsign: 'JWST-L2',
        name: 'James Webb Space Telescope',
        regime: 'Sun-Earth L2 Halo',
        spaceObjectId: 'jwst',
        color: '#F59E0B',
        distanceLabel: '1,488,900 km',
        auFromEarth: 0.00995,
        auFromSun: (sunEph?.auFromEarth ?? 1.0) + 0.00995,
        velocityKmS: 1.01,
        lightTimeOneWay: '4.97 sec',
        raFormatted: sunEph ? sunEph.raFormatted : '03h 22m',
        decFormatted: sunEph ? sunEph.decFormatted : '+18° 12′',
        phaseOrElong: 'L2 Cryo Sunshield',
      },
      {
        id: 'ds-soho',
        callsign: 'SOHO-L1',
        name: 'SOHO Solar Observatory',
        regime: 'Sun-Earth L1 Halo',
        spaceObjectId: 'soho',
        color: '#FBBF24',
        distanceLabel: '1,491,000 km',
        auFromEarth: 0.00997,
        auFromSun: Math.max(0.95, (sunEph?.auFromEarth ?? 1.0) - 0.00997),
        velocityKmS: 0.99,
        lightTimeOneWay: '4.97 sec',
        raFormatted: sunEph?.raFormatted ?? '--',
        decFormatted: sunEph?.decFormatted ?? '--',
        phaseOrElong: '0.0° Sunward L1',
      },
    ];

    if (moonEph) {
      list.push({
        id: 'ds-moon',
        callsign: 'LUNA-ORBIT',
        name: 'The Moon & LRO / Artemis Gateway',
        regime: 'Lunar Geocentric',
        spaceObjectId: 'lro',
        celestialBodyId: 'moon',
        color: '#CBD5E1',
        distanceLabel: `${Math.round(moonEph.kmFromEarth).toLocaleString()} km`,
        auFromEarth: moonEph.auFromEarth,
        auFromSun: moonEph.auFromSun,
        velocityKmS: 1.02,
        lightTimeOneWay: moonEph.oneWayLightTimeLabel,
        raFormatted: moonEph.raFormatted,
        decFormatted: moonEph.decFormatted,
        phaseOrElong: `${moonEph.phasePercent.toFixed(0)}% illum · ${moonEph.elongationDeg.toFixed(1)}°`,
      });
    }

    if (marsEph) {
      list.push({
        id: 'ds-mars',
        callsign: 'MARS-PERCY',
        name: 'Mars · Perseverance / MRO',
        regime: 'Heliocentric Inner',
        spaceObjectId: 'perseverance',
        celestialBodyId: 'mars',
        color: '#F97316',
        distanceLabel: `${marsEph.auFromEarth.toFixed(3)} AU (${Math.round(marsEph.kmFromEarth / 1e6).toLocaleString()}M km)`,
        auFromEarth: marsEph.auFromEarth,
        auFromSun: marsEph.auFromSun,
        velocityKmS: 24.07,
        lightTimeOneWay: marsEph.oneWayLightTimeLabel,
        raFormatted: marsEph.raFormatted,
        decFormatted: marsEph.decFormatted,
        phaseOrElong: `${marsEph.elongationDeg.toFixed(1)}° elong · mag ${marsEph.magnitude}`,
      });
    }

    if (venEph) {
      list.push({
        id: 'ds-venus',
        callsign: 'VENUS-SOL',
        name: 'Venus (Planetary Ephemeris)',
        regime: 'Heliocentric Inner',
        celestialBodyId: 'venus',
        color: '#FDE68A',
        distanceLabel: `${venEph.auFromEarth.toFixed(3)} AU`,
        auFromEarth: venEph.auFromEarth,
        auFromSun: venEph.auFromSun,
        velocityKmS: 35.02,
        lightTimeOneWay: venEph.oneWayLightTimeLabel,
        raFormatted: venEph.raFormatted,
        decFormatted: venEph.decFormatted,
        phaseOrElong: `${venEph.phasePercent.toFixed(0)}% phase · mag ${venEph.magnitude}`,
      });
    }

    if (jupEph) {
      list.push({
        id: 'ds-jupiter',
        callsign: 'JUPITER-JUNO',
        name: 'Jupiter · Juno Polar Orbiter',
        regime: 'Outer Solar System',
        spaceObjectId: 'juno',
        celestialBodyId: 'jupiter',
        color: '#FB923C',
        distanceLabel: `${jupEph.auFromEarth.toFixed(3)} AU`,
        auFromEarth: jupEph.auFromEarth,
        auFromSun: jupEph.auFromSun,
        velocityKmS: 13.07,
        lightTimeOneWay: jupEph.oneWayLightTimeLabel,
        raFormatted: jupEph.raFormatted,
        decFormatted: jupEph.decFormatted,
        phaseOrElong: `${jupEph.elongationDeg.toFixed(1)}° elong · mag ${jupEph.magnitude}`,
      });
    }

    if (satEph) {
      list.push({
        id: 'ds-saturn',
        callsign: 'SATURN-EPHEM',
        name: 'Saturn System (Ephemeris)',
        regime: 'Outer Solar System',
        celestialBodyId: 'saturn',
        color: '#FCD34D',
        distanceLabel: `${satEph.auFromEarth.toFixed(3)} AU`,
        auFromEarth: satEph.auFromEarth,
        auFromSun: satEph.auFromSun,
        velocityKmS: 9.68,
        lightTimeOneWay: satEph.oneWayLightTimeLabel,
        raFormatted: satEph.raFormatted,
        decFormatted: satEph.decFormatted,
        phaseOrElong: `${satEph.elongationDeg.toFixed(1)}° elong · mag ${satEph.magnitude}`,
      });
    }

    list.push({
      id: 'ds-voyager1',
      callsign: 'VGR-1-ISM',
      name: 'Voyager 1 Interstellar Probe',
      regime: 'Interstellar Medium',
      spaceObjectId: 'voyager-1',
      color: '#38BDF8',
      distanceLabel: `${v1Au.toFixed(2)} AU`,
      auFromEarth: v1Au,
      auFromSun: v1Au,
      velocityKmS: 16.99,
      lightTimeOneWay: `${v1LightHrs.toFixed(2)} hr`,
      raFormatted: '17h 12m 16s',
      decFormatted: '+12° 05′',
      phaseOrElong: 'Ophiuchus · DSN 70m X-band',
    });

    return list;
  }, [nowDate]);

  const subsolar = useMemo(() => getSubsolarLatLon(nowDate), [nowDate]);

  return {
    nowDate,
    feedSource,
    tracks,
    selectedGroundTrack,
    deepSpaceContacts,
    subsolar,
  };
}
