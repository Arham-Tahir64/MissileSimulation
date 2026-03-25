import * as Cesium from 'cesium';
import { GeoPosition, EntityDefinition } from '../types/entity';
import type { ScenarioDefinition } from '../types/scenario';

export function geoToCartesian(pos: GeoPosition): Cesium.Cartesian3 {
  return Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.alt);
}

export function cartesianToGeo(cartesian: Cesium.Cartesian3): GeoPosition {
  const carto = Cesium.Cartographic.fromCartesian(cartesian);
  return {
    lat: Cesium.Math.toDegrees(carto.latitude),
    lon: Cesium.Math.toDegrees(carto.longitude),
    alt: carto.height,
  };
}

/** Compute the great-circle midpoint at a given fraction [0,1] between two positions */
export function interpolateGeoPosition(a: GeoPosition, b: GeoPosition, t: number): GeoPosition {
  const ca = geoToCartesian(a);
  const cb = geoToCartesian(b);
  const interp = Cesium.Cartesian3.lerp(ca, cb, t, new Cesium.Cartesian3());
  return cartesianToGeo(interp);
}

/** Entity type → Cesium color mapping */
export function entityColor(type: string): Cesium.Color {
  switch (type) {
    case 'ballistic_threat': return Cesium.Color.RED.withAlpha(0.9);
    case 'cruise_threat': return Cesium.Color.ORANGE.withAlpha(0.9);
    case 'interceptor': return Cesium.Color.CYAN.withAlpha(0.9);
    case 'sensor': return Cesium.Color.YELLOW.withAlpha(0.7);
    default: return Cesium.Color.WHITE.withAlpha(0.8);
  }
}

/**
 * Compute a simplified ballistic arc as an array of GeoPositions.
 * Uses a parametric great-circle arc with a sinusoidal altitude profile.
 * This is a client-side approximation that matches the backend physics well
 * enough for trajectory preview rendering.
 */
export function computeBallisticArc(
  origin: GeoPosition,
  target: GeoPosition,
  apogeeAlt: number,
  samples = 100
): GeoPosition[] {
  const points: GeoPosition[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const pos = interpolateGeoPosition(origin, target, t);
    // Sinusoidal altitude: zero at both ends, peak at midpoint
    const altOffset = apogeeAlt * Math.sin(Math.PI * t);
    points.push({ ...pos, alt: origin.alt + altOffset });
  }
  return points;
}

/** Convert an array of GeoPositions to a flat Cesium Cartesian3 array. */
export function geoArrayToCartesian3Array(positions: GeoPosition[]): Cesium.Cartesian3[] {
  return positions.map(geoToCartesian);
}

// ─── Missile billboard icons (Canvas-based for reliable Cesium loading) ─────
// Drawn in white so Cesium's billboard.color property tints them correctly.
// The shapes point "up" (north); heading rotation is applied at render time.

const _canvasCache = new Map<string, HTMLCanvasElement>();

function _buildMissileCanvas(variant: 'threat' | 'interceptor'): HTMLCanvasElement {
  const W = 14, H = 28;
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'white';
  ctx.beginPath();
  if (variant === 'interceptor') {
    // Wider delta fins → distinct interceptor silhouette
    ctx.moveTo(7,  0);   ctx.lineTo(9.5, 7);   ctx.lineTo(8.5,  7);
    ctx.lineTo(8.5, 18); ctx.lineTo(14,  28);  ctx.lineTo(7,   22);
    ctx.lineTo(0,  28);  ctx.lineTo(5.5, 18);  ctx.lineTo(5.5,  7);
    ctx.lineTo(4.5,  7);
  } else {
    // Narrow body + small fins → threat missile silhouette
    ctx.moveTo(7,  0);   ctx.lineTo(10,  8);   ctx.lineTo(8.5,  8);
    ctx.lineTo(8.5, 20); ctx.lineTo(12,  28);  ctx.lineTo(7,   24);
    ctx.lineTo(2,  28);  ctx.lineTo(5.5, 20);  ctx.lineTo(5.5,  8);
    ctx.lineTo(4,   8);
  }
  ctx.closePath();
  ctx.fill();
  return canvas;
}

/** Returns a Canvas element for use as a Cesium billboard image. */
export function getMissileIcon(type: string): HTMLCanvasElement {
  const variant: 'threat' | 'interceptor' =
    type === 'interceptor' ? 'interceptor' : 'threat';
  if (!_canvasCache.has(variant)) {
    _canvasCache.set(variant, _buildMissileCanvas(variant));
  }
  return _canvasCache.get(variant)!;
}

// ─── Trajectory flight-time helpers ─────────────────────────────────────────
const _BALLISTIC_SPEED_MS = 2_500;   // fictional, non-calibrated
const _CRUISE_DEFAULT_MS  = 250;     // fictional, non-calibrated
const _EARTH_RADIUS_M     = 6_371_000;

/** Great-circle distance between two GeoPositions in metres. */
export function haversineDistanceM(a: GeoPosition, b: GeoPosition): number {
  return _haversineM(a, b);
}

function _haversineM(a: GeoPosition, b: GeoPosition): number {
  const toRad = Cesium.Math.toRadians;
  const lat1  = toRad(a.lat), lat2 = toRad(b.lat);
  const dLat  = lat2 - lat1;
  const dLon  = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * _EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Computes the total flight time in seconds for a given entity definition.
 * Uses the same fictional speeds as the backend physics models.
 */
export function computeFlightTimeS(def: EntityDefinition): number {
  if (def.trajectory_type === 'ballistic' && def.target) {
    return _haversineM(def.origin, def.target) / _BALLISTIC_SPEED_MS;
  }
  if (def.trajectory_type === 'cruise') {
    const pts = [def.origin, ...(def.waypoints ?? [])];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) total += _haversineM(pts[i], pts[i + 1]);
    return total / (def.speed_ms ?? _CRUISE_DEFAULT_MS);
  }
  return 0;
}

/**
 * Samples a cruise trajectory into a uniform Cartesian3 array.
 * Used by TrajectoryLayer to enable fraction-based arc splitting.
 */
export function sampleCruisePath(def: EntityDefinition, samples = 60): Cesium.Cartesian3[] {
  const pts = [def.origin, ...(def.waypoints ?? [])];
  if (pts.length < 2) return pts.map(geoToCartesian);

  const segDists: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = _haversineM(pts[i], pts[i + 1]);
    segDists.push(d);
    total += d;
  }

  const result: Cesium.Cartesian3[] = [];
  for (let s = 0; s <= samples; s++) {
    const target = (s / samples) * total;
    let cum = 0;
    for (let seg = 0; seg < segDists.length; seg++) {
      if (target <= cum + segDists[seg] + 1e-9) {
        const t = segDists[seg] > 0 ? (target - cum) / segDists[seg] : 0;
        result.push(geoToCartesian(interpolateGeoPosition(pts[seg], pts[seg + 1], Math.min(t, 1))));
        break;
      }
      cum += segDists[seg];
    }
  }
  return result;
}

/**
 * Fly the camera to frame all entities in a scenario.
 * Computes a bounding rectangle from all entity origins and
 * animates the camera to it with a 2-second duration.
 */
export function flyToScenario(viewer: Cesium.Viewer, scenario: ScenarioDefinition): void {
  const positions = scenario.entities.map((e) => e.origin);
  if (positions.length === 0) return;

  const lats = positions.map((p) => p.lat);
  const lons = positions.map((p) => p.lon);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  // Add padding so entities aren't right at the edge
  const padDeg = 3.0;
  const rect = Cesium.Rectangle.fromDegrees(
    minLon - padDeg,
    minLat - padDeg,
    maxLon + padDeg,
    maxLat + padDeg,
  );

  viewer.camera.flyTo({
    destination: rect,
    duration: 2.0,
    easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
  });
}
