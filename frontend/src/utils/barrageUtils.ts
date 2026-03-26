import { EntityType, GeoPosition } from '../types/entity';
import {
  BarrageLaunchTimingMode,
  PlannedBarragePlacement,
  PlannedLaunchPlacement,
} from '../store/placementStore';

const EARTH_RADIUS_M = 6_371_000;
const PREVIEW_LIMIT = 6;

interface BarrageMember {
  id: string;
  missileType: EntityType;
  origin: GeoPosition;
  target: GeoPosition;
  launchTimeS: number;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

function createPrng(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function destinationPoint(
  center: GeoPosition,
  distanceM: number,
  bearingRad: number,
): GeoPosition {
  const lat1 = (center.lat * Math.PI) / 180;
  const lon1 = (center.lon * Math.PI) / 180;
  const angularDistance = distanceM / EARTH_RADIUS_M;

  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinAngularDistance = Math.sin(angularDistance);
  const cosAngularDistance = Math.cos(angularDistance);

  const lat2 = Math.asin(
    sinLat1 * cosAngularDistance
    + cosLat1 * sinAngularDistance * Math.cos(bearingRad),
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(bearingRad) * sinAngularDistance * cosLat1,
    cosAngularDistance - sinLat1 * Math.sin(lat2),
  );

  return {
    lat: (lat2 * 180) / Math.PI,
    lon: ((((lon2 * 180) / Math.PI) + 540) % 360) - 180,
    alt: 0,
  };
}

function samplePointInCircle(center: GeoPosition, radiusKm: number, next: () => number): GeoPosition {
  const distanceM = Math.sqrt(next()) * radiusKm * 1000;
  const bearingRad = next() * Math.PI * 2;
  return destinationPoint(center, distanceM, bearingRad);
}

function launchTimeForIndex(
  placement: PlannedBarragePlacement,
  index: number,
  next: () => number,
): number {
  const base = placement.launchTimeS ?? 0;
  const window = Math.max(0, placement.launchWindowS ?? 0);
  const mode: BarrageLaunchTimingMode = placement.launchTimingMode;

  if (mode === 'simultaneous' || placement.count <= 1 || window === 0) return base;
  if (mode === 'staggered') {
    return base + (index / Math.max(1, placement.count - 1)) * window;
  }
  return base + next() * window;
}

export function expandBarragePlacement(placement: PlannedBarragePlacement): PlannedLaunchPlacement[] {
  const next = createPrng(`${placement.seed}:${placement.id}:${placement.count}`);
  const members: PlannedLaunchPlacement[] = [];

  for (let index = 0; index < placement.count; index += 1) {
    const origin = samplePointInCircle(placement.launchArea.center, placement.launchArea.radiusKm, next);
    const target = samplePointInCircle(placement.targetArea.center, placement.targetArea.radiusKm, next);
    members.push({
      id: `${placement.id}-member-${index + 1}`,
      kind: 'missile',
      missileType: placement.missileType,
      origin,
      target,
      launchTimeS: Number(launchTimeForIndex(placement, index, next).toFixed(1)),
    });
  }

  return members;
}

export function getBarragePreviewMembers(
  placement: PlannedBarragePlacement,
  limit = PREVIEW_LIMIT,
): BarrageMember[] {
  return expandBarragePlacement(placement).slice(0, Math.max(1, limit));
}
