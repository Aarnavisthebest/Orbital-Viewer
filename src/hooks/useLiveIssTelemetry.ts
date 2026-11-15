import { useEffect, useState } from 'react';

export interface IssTelemetry {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  visibility: string;
  footprint: number;
  timestamp: number;
  source: 'live-api' | 'orbital-ephemeris';
}

function computeFallbackIss(): IssTelemetry {
  const nowSec = Date.now() / 1000;
  // Approximate 92.9 min period (5574s), 51.6 deg inclination
  const phase = (nowSec % 5574) / 5574;
  const angle = phase * Math.PI * 2;
  const latitude = Math.sin(angle) * 51.64;
  const lonOffset = ((nowSec / 86400) * 360) % 360;
  let longitude = ((phase * 360 - lonOffset + 540) % 360) - 180;
  const sunAngle = ((nowSec % 86400) / 86400) * 360 - 180;
  const dayDiff = Math.abs(((longitude - sunAngle + 540) % 360) - 180);
  return {
    latitude,
    longitude,
    altitude: 418.4 + Math.sin(angle * 2) * 3.2,
    velocity: 27584 + Math.cos(angle) * 18,
    visibility: dayDiff < 95 ? 'daylight' : 'eclipsed',
    footprint: 4480,
    timestamp: Math.floor(nowSec),
    source: 'orbital-ephemeris',
  };
}

export function useLiveIssTelemetry() {
  const [telemetry, setTelemetry] = useState<IssTelemetry>(() => computeFallbackIss());

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function fetchIss() {
      try {
        const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544', {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('ISS API status error');
        const data = await res.json();
        if (!active) return;
        setTelemetry({
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          altitude: Number(data.altitude),
          velocity: Number(data.velocity),
          visibility: String(data.visibility || 'daylight'),
          footprint: Number(data.footprint || 4500),
          timestamp: Number(data.timestamp || Math.floor(Date.now() / 1000)),
          source: 'live-api',
        });
      } catch {
        if (!active) return;
        setTelemetry(computeFallbackIss());
      }
    }

    fetchIss();
    const timer = window.setInterval(fetchIss, 8000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  return telemetry;
}
