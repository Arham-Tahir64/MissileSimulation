import { GeoPosition } from './entity';
import { InterceptionEvent } from './simulation';

export type ImpactKind = 'intercept' | 'terminal_impact' | 'aftermath';
export type ImpactIntensity = 'low' | 'medium' | 'high';
export type ImpactLodTier = 'near' | 'mid' | 'far' | 'minimal';

export interface ImpactPalette {
  flash: string;
  glow: string;
  ring: string;
  smoke: string;
  streak: string;
  aftermath: string;
}

export interface ImpactVisualLayer {
  enabled: boolean;
  durationMs: number;
  maxScale: number;
  maxOpacity: number;
}

export interface ImpactLodConfig {
  nearDistanceM: number;
  midDistanceM: number;
  farDistanceM: number;
  nearParticleFactor: number;
  midParticleFactor: number;
  farParticleFactor: number;
}

export interface AftermathMarker {
  id: string;
  position: GeoPosition;
  createdAtMs: number;
  lifetimeMs: number;
  maxOpacity: number;
  pulseRadiusM: number;
  color: string;
  relatedEntityId?: string | null;
}

export interface ImpactPreset {
  id: string;
  intensity: ImpactIntensity;
  durationMs: number;
  radiusM: number;
  ringSpeedMps: number;
  smokeLifetimeMs: number;
  smokeRiseM: number;
  particleCount: number;
  aftermathLifetimeMs: number;
  streakCount: number;
  palette: ImpactPalette;
  flash: ImpactVisualLayer;
  glow: ImpactVisualLayer;
  ring: ImpactVisualLayer;
  smoke: ImpactVisualLayer;
  streaks: ImpactVisualLayer;
  aftermath: ImpactVisualLayer;
  lod: ImpactLodConfig;
  cameraShakeHint?: number;
}

export interface ImpactEvent {
  id: string;
  dedupeKey: string;
  kind: ImpactKind;
  simTimeS: number;
  position: GeoPosition;
  relatedEntityIds: string[];
  presetId: string;
  intensity: ImpactIntensity;
  palette: ImpactPalette;
  sourceEvent?: InterceptionEvent;
  durationMs?: number;
  radiusM?: number;
  ringSpeedMps?: number;
  smokeLifetimeMs?: number;
  particleCount?: number;
  aftermathLifetimeMs?: number;
  localCameraShakeHint?: number;
}

export interface ImpactRuntimeState {
  event: ImpactEvent;
  preset: ImpactPreset;
  startedAtMs: number;
  lodTier: ImpactLodTier;
  lastCameraDistanceM: number;
  aftermath?: AftermathMarker | null;
}
