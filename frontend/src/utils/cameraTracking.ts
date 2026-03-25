import * as Cesium from 'cesium';
import { EntityState } from '../types/entity';
import { clamp } from './timeUtils';

export interface CameraRigState {
  target: Cesium.Cartesian3;
  heading: number;
  pitch: number;
  range: number;
}

export function createInitialCameraRig(target: Cesium.Cartesian3): CameraRigState {
  return {
    target,
    heading: 0,
    pitch: Cesium.Math.toRadians(-18),
    range: 2_400,
  };
}

export function createChaseRig(entity: EntityState, preset: 'chase' | 'wide'): CameraRigState {
  const heading = Cesium.Math.toRadians(entity.heading_deg + 180);
  const pitchBias = preset === 'wide' ? -28 : -16;
  const pitch = Cesium.Math.toRadians(
    clamp(pitchBias - entity.pitch_deg * 0.45, -68, -8),
  );
  const target = Cesium.Cartesian3.fromDegrees(
    entity.position.lon,
    entity.position.lat,
    Math.max(0, entity.position.alt),
  );
  const range = clamp(
    (preset === 'wide' ? 3_400 : 1_800)
      + entity.velocity_ms * 0.9
      + entity.position.alt * 0.015,
    preset === 'wide' ? 2_200 : 1_100,
    preset === 'wide' ? 12_000 : 6_800,
  );

  return { target, heading, pitch, range };
}

export function createTacticalRig(entity: EntityState): CameraRigState {
  const target = Cesium.Cartesian3.fromDegrees(
    entity.position.lon,
    entity.position.lat,
    Math.max(0, entity.position.alt),
  );

  return {
    target,
    heading: Cesium.Math.toRadians(entity.heading_deg + 180),
    pitch: Cesium.Math.toRadians(-52),
    range: clamp(48_000 + entity.position.alt * 0.2, 32_000, 180_000),
  };
}

export function smoothCameraRig(
  current: CameraRigState,
  next: CameraRigState,
  alpha: number,
): CameraRigState {
  return {
    target: Cesium.Cartesian3.lerp(
      current.target,
      next.target,
      alpha,
      new Cesium.Cartesian3(),
    ),
    heading: lerpAngle(current.heading, next.heading, alpha),
    pitch: Cesium.Math.lerp(current.pitch, next.pitch, alpha),
    range: Cesium.Math.lerp(current.range, next.range, alpha),
  };
}

function lerpAngle(current: number, next: number, alpha: number): number {
  const delta = Cesium.Math.negativePiToPi(next - current);
  return current + delta * alpha;
}
