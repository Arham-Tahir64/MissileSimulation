import * as Cesium from 'cesium';
import { GeoPosition } from '../types/entity';

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
