import * as Cesium from 'cesium';
import { GeoPosition } from '../types/entity';
import { ImpactEvent, ImpactLodTier } from '../types/impact';

const canvasCache = new Map<string, HTMLCanvasElement>();

export function impactGeoToCartesian(position: GeoPosition): Cesium.Cartesian3 {
  return Cesium.Cartesian3.fromDegrees(position.lon, position.lat, position.alt);
}

export function pickImpactLod(distanceM: number, near: number, mid: number, far: number): ImpactLodTier {
  if (distanceM <= near) return 'near';
  if (distanceM <= mid) return 'mid';
  if (distanceM <= far) return 'far';
  return 'minimal';
}

export function makeFlashSprite(color: string): HTMLCanvasElement {
  const key = `flash:${color}`;
  const cached = canvasCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, color);
  gradient.addColorStop(0.55, `${color}66`);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  canvasCache.set(key, canvas);
  return canvas;
}

export function makeSmokeSprite(color: string): HTMLCanvasElement {
  const key = `smoke:${color}`;
  const cached = canvasCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 12, 64, 64, 56);
  gradient.addColorStop(0, `${color}cc`);
  gradient.addColorStop(0.45, `${color}66`);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI * 2);
  ctx.fill();
  canvasCache.set(key, canvas);
  return canvas;
}

export function makeStreakSprite(color: string): HTMLCanvasElement {
  const key = `streak:${color}`;
  const cached = canvasCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(24, 0, 24, 192);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.18, `${color}00`);
  gradient.addColorStop(0.45, `${color}cc`);
  gradient.addColorStop(0.8, `${color}44`);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.lineTo(42, 140);
  ctx.lineTo(24, 192);
  ctx.lineTo(6, 140);
  ctx.closePath();
  ctx.fill();
  canvasCache.set(key, canvas);
  return canvas;
}

export function makeAftermathSprite(color: string): HTMLCanvasElement {
  const key = `aftermath:${color}`;
  const cached = canvasCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 180;
  canvas.height = 180;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(90, 90, 14, 90, 90, 90);
  gradient.addColorStop(0, `${color}aa`);
  gradient.addColorStop(0.5, `${color}22`);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 180, 180);
  canvasCache.set(key, canvas);
  return canvas;
}

export function fadeOut(progress: number): number {
  return Math.max(0, 1 - progress);
}

export function smoothPulse(progress: number): number {
  return Math.sin(Math.min(1, progress) * Math.PI);
}

export function hashEventSeed(event: ImpactEvent): number {
  let hash = 2166136261;
  for (const char of event.dedupeKey) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededUnit(seed: number, index: number): number {
  const value = Math.sin(seed * 0.0001 + index * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

export function makeEnuFrame(position: GeoPosition): {
  east: Cesium.Cartesian3;
  north: Cesium.Cartesian3;
  up: Cesium.Cartesian3;
} {
  const origin = impactGeoToCartesian(position);
  const transform = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
  const east4 = Cesium.Matrix4.getColumn(transform, 0, new Cesium.Cartesian4());
  const north4 = Cesium.Matrix4.getColumn(transform, 1, new Cesium.Cartesian4());
  const up4 = Cesium.Matrix4.getColumn(transform, 2, new Cesium.Cartesian4());
  return {
    east: new Cesium.Cartesian3(east4.x, east4.y, east4.z),
    north: new Cesium.Cartesian3(north4.x, north4.y, north4.z),
    up: new Cesium.Cartesian3(up4.x, up4.y, up4.z),
  };
}

export function offsetFromOrigin(
  origin: Cesium.Cartesian3,
  east: Cesium.Cartesian3,
  north: Cesium.Cartesian3,
  up: Cesium.Cartesian3,
  eastM: number,
  northM: number,
  upM: number,
): Cesium.Cartesian3 {
  const result = Cesium.Cartesian3.clone(origin, new Cesium.Cartesian3());
  Cesium.Cartesian3.multiplyByScalar(east, eastM, scratchEast);
  Cesium.Cartesian3.add(result, scratchEast, result);
  Cesium.Cartesian3.multiplyByScalar(north, northM, scratchNorth);
  Cesium.Cartesian3.add(result, scratchNorth, result);
  Cesium.Cartesian3.multiplyByScalar(up, upM, scratchUp);
  Cesium.Cartesian3.add(result, scratchUp, result);
  return result;
}

const scratchEast = new Cesium.Cartesian3();
const scratchNorth = new Cesium.Cartesian3();
const scratchUp = new Cesium.Cartesian3();
