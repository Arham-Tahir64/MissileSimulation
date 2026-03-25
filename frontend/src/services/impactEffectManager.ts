import * as Cesium from 'cesium';
import { getImpactPreset } from '../config/impactPresets';
import { AftermathMarker, ImpactEvent, ImpactLodTier, ImpactPreset, ImpactRuntimeState } from '../types/impact';
import {
  fadeOut,
  hashEventSeed,
  impactGeoToCartesian,
  makeAftermathSprite,
  makeEnuFrame,
  makeFlashSprite,
  makeSmokeSprite,
  makeStreakSprite,
  offsetFromOrigin,
  pickImpactLod,
  seededUnit,
  smoothPulse,
} from '../utils/impactEffects';

interface EffectHandle {
  runtime: ImpactRuntimeState;
  origin: Cesium.Cartesian3;
  flash: Cesium.Entity | null;
  glow: Cesium.Entity | null;
  ring: Cesium.Entity | null;
  pulse: Cesium.Entity | null;
  smoke: Cesium.Entity[];
  streaks: Cesium.Entity[];
}

interface AftermathHandle {
  marker: AftermathMarker;
  entity: Cesium.Entity;
}

const MAX_ACTIVE_EFFECTS = 10;
const MAX_AFTERMATH_MARKERS = 8;

function setConstantValue<T>(
  property: Cesium.Property | undefined,
  value: T,
): Cesium.ConstantProperty {
  if (property && 'setValue' in property && typeof property.setValue === 'function') {
    property.setValue(value);
    return property as Cesium.ConstantProperty;
  }
  return new Cesium.ConstantProperty(value);
}

function setPositionValue(
  property: Cesium.PositionProperty | undefined,
  value: Cesium.Cartesian3,
): Cesium.ConstantPositionProperty {
  if (property && 'setValue' in property && typeof property.setValue === 'function') {
    property.setValue(value);
    return property as Cesium.ConstantPositionProperty;
  }
  return new Cesium.ConstantPositionProperty(value);
}

function setColorMaterial(
  property: Cesium.MaterialProperty | undefined,
  color: Cesium.Color,
): Cesium.ColorMaterialProperty {
  if (property instanceof Cesium.ColorMaterialProperty) {
    property.color = setConstantValue(property.color, color);
    return property;
  }
  return new Cesium.ColorMaterialProperty(color);
}

export class ImpactEffectManager {
  private viewer: Cesium.Viewer;
  private activeEffects = new Map<string, EffectHandle>();
  private aftermath = new Map<string, AftermathHandle>();
  private dedupeKeys = new Set<string>();

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  emit(event: ImpactEvent, nowMs: number): void {
    if (this.dedupeKeys.has(event.dedupeKey)) return;
    this.dedupeKeys.add(event.dedupeKey);

    if (this.activeEffects.size >= MAX_ACTIVE_EFFECTS) {
      const oldest = [...this.activeEffects.values()]
        .sort((a, b) => a.runtime.startedAtMs - b.runtime.startedAtMs)[0];
      if (oldest) this.removeEffect(oldest.runtime.event.id);
    }

    const preset = getImpactPreset(event.presetId);
    const origin = impactGeoToCartesian(event.position);
    const cameraDistance = Cesium.Cartesian3.distance(this.viewer.camera.positionWC, origin);
    const lodTier = pickImpactLod(
      cameraDistance,
      preset.lod.nearDistanceM,
      preset.lod.midDistanceM,
      preset.lod.farDistanceM,
    );

    const runtime: ImpactRuntimeState = {
      event,
      preset,
      startedAtMs: nowMs,
      lodTier,
      lastCameraDistanceM: cameraDistance,
      aftermath: null,
    };

    const handle: EffectHandle = {
      runtime,
      origin,
      flash: this.createFlashEntity(origin, preset),
      glow: this.createGlowEntity(origin, preset),
      ring: this.createRingEntity(event.position, preset),
      pulse: this.createPulseEntity(origin, preset),
      smoke: this.createSmokeEntities(origin, event, preset),
      streaks: this.createStreakEntities(origin, event, preset),
    };

    this.activeEffects.set(event.id, handle);
  }

  update(nowMs: number): void {
    const cameraPosition = this.viewer.camera.positionWC;

    for (const [id, handle] of this.activeEffects) {
      const { runtime, origin } = handle;
      const ageMs = nowMs - runtime.startedAtMs;
      const cameraDistance = Cesium.Cartesian3.distance(cameraPosition, origin);
      runtime.lastCameraDistanceM = cameraDistance;
      runtime.lodTier = pickImpactLod(
        cameraDistance,
        runtime.preset.lod.nearDistanceM,
        runtime.preset.lod.midDistanceM,
        runtime.preset.lod.farDistanceM,
      );

      if (ageMs >= runtime.preset.durationMs) {
        if (runtime.preset.aftermath.enabled && !runtime.aftermath) {
          runtime.aftermath = this.spawnAftermath(runtime, nowMs);
        }
        this.removeEffect(id);
        continue;
      }

      this.updateFlash(handle, ageMs);
      this.updateGlow(handle, ageMs);
      this.updateRing(handle, ageMs);
      this.updatePulse(handle, ageMs);
      this.updateSmoke(handle, ageMs);
      this.updateStreaks(handle, ageMs);
    }

    for (const [id, aftermath] of this.aftermath) {
      const ageMs = nowMs - aftermath.marker.createdAtMs;
      if (ageMs >= aftermath.marker.lifetimeMs) {
        this.removeAftermath(id);
        continue;
      }
      const lifeProgress = ageMs / aftermath.marker.lifetimeMs;
      const alpha = aftermath.marker.maxOpacity * fadeOut(lifeProgress) * (0.75 + 0.25 * smoothPulse(lifeProgress * 2));
      aftermath.entity.billboard!.color = setConstantValue(
        aftermath.entity.billboard!.color,
        Cesium.Color.fromCssColorString(aftermath.marker.color).withAlpha(alpha),
      );
      aftermath.entity.billboard!.scale = setConstantValue(
        aftermath.entity.billboard!.scale,
        0.9 + lifeProgress * 0.65,
      );
    }
  }

  reset(): void {
    for (const id of [...this.activeEffects.keys()]) this.removeEffect(id);
    for (const id of [...this.aftermath.keys()]) this.removeAftermath(id);
    this.dedupeKeys.clear();
  }

  clearDedupe(): void {
    this.dedupeKeys.clear();
  }

  destroy(): void {
    this.reset();
  }

  private createFlashEntity(origin: Cesium.Cartesian3, preset: ImpactPreset): Cesium.Entity | null {
    if (!preset.flash.enabled) return null;
    return this.viewer.entities.add({
      position: origin,
      billboard: {
        image: makeFlashSprite(preset.palette.flash),
        scale: 0.1,
        color: Cesium.Color.WHITE.withAlpha(0),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
  }

  private createGlowEntity(origin: Cesium.Cartesian3, preset: ImpactPreset): Cesium.Entity | null {
    if (!preset.glow.enabled) return null;
    return this.viewer.entities.add({
      position: origin,
      billboard: {
        image: makeFlashSprite(preset.palette.glow),
        scale: 0.4,
        color: Cesium.Color.WHITE.withAlpha(0),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
  }

  private createPulseEntity(origin: Cesium.Cartesian3, preset: ImpactPreset): Cesium.Entity | null {
    return this.viewer.entities.add({
      position: origin,
      billboard: {
        image: makeAftermathSprite(preset.palette.ring),
        scale: 0.28,
        color: Cesium.Color.fromCssColorString(preset.palette.ring).withAlpha(0),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: 'HIT',
        font: '600 12px monospace',
        fillColor: Cesium.Color.fromCssColorString(preset.palette.ring),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        pixelOffset: new Cesium.Cartesian2(0, -28),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        show: false,
      },
    });
  }

  private createRingEntity(position: { lat: number; lon: number; alt: number }, preset: ImpactPreset): Cesium.Entity | null {
    if (!preset.ring.enabled) return null;
    return this.viewer.entities.add({
      position: impactGeoToCartesian({ lat: position.lat, lon: position.lon, alt: 0 }),
      ellipse: {
        semiMajorAxis: 1,
        semiMinorAxis: 1,
        height: Math.max(0, Math.min(position.alt * 0.2, 20_000)),
        material: Cesium.Color.fromCssColorString(preset.palette.ring).withAlpha(0),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString(preset.palette.ring).withAlpha(0),
        outlineWidth: 2,
      },
    });
  }

  private createSmokeEntities(origin: Cesium.Cartesian3, event: ImpactEvent, preset: ImpactPreset): Cesium.Entity[] {
    if (!preset.smoke.enabled) return [];

    const seed = hashEventSeed(event);
    const particles: Cesium.Entity[] = [];
    for (let index = 0; index < preset.particleCount; index++) {
      const entity = this.viewer.entities.add({
        position: origin,
        billboard: {
          image: makeSmokeSprite(preset.palette.smoke),
          scale: 0.22 + seededUnit(seed, index) * 0.18,
          color: Cesium.Color.fromCssColorString(preset.palette.smoke).withAlpha(0),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      particles.push(entity);
    }
    return particles;
  }

  private createStreakEntities(origin: Cesium.Cartesian3, event: ImpactEvent, preset: ImpactPreset): Cesium.Entity[] {
    if (!preset.streaks.enabled) return [];

    const seed = hashEventSeed(event) + 907;
    const streaks: Cesium.Entity[] = [];
    for (let index = 0; index < preset.streakCount; index++) {
      const entity = this.viewer.entities.add({
        position: origin,
        billboard: {
          image: makeStreakSprite(preset.palette.streak),
          scale: 0.3 + seededUnit(seed, index) * 0.2,
          color: Cesium.Color.fromCssColorString(preset.palette.streak).withAlpha(0),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      streaks.push(entity);
    }
    return streaks;
  }

  private updateFlash(handle: EffectHandle, ageMs: number): void {
    if (!handle.flash?.billboard) return;
    const progress = Math.min(1, ageMs / handle.runtime.preset.flash.durationMs);
    const scale = 0.1 + handle.runtime.preset.flash.maxScale * progress;
    const alpha = handle.runtime.preset.flash.maxOpacity * fadeOut(progress);
    handle.flash.billboard.scale = setConstantValue(handle.flash.billboard.scale, scale);
    handle.flash.billboard.color = setConstantValue(
      handle.flash.billboard.color,
      Cesium.Color.WHITE.withAlpha(alpha),
    );
  }

  private updateGlow(handle: EffectHandle, ageMs: number): void {
    if (!handle.glow?.billboard) return;
    const progress = Math.min(1, ageMs / handle.runtime.preset.glow.durationMs);
    const lodScale = handle.runtime.lodTier === 'near' ? 1 : handle.runtime.lodTier === 'mid' ? 0.8 : 0.55;
    handle.glow.billboard.scale = setConstantValue(
      handle.glow.billboard.scale,
      (0.4 + handle.runtime.preset.glow.maxScale * progress) * lodScale,
    );
    handle.glow.billboard.color = setConstantValue(
      handle.glow.billboard.color,
      Cesium.Color.fromCssColorString(handle.runtime.preset.palette.glow).withAlpha(
        handle.runtime.preset.glow.maxOpacity * fadeOut(progress),
      ),
    );
  }

  private updateRing(handle: EffectHandle, ageMs: number): void {
    if (!handle.ring?.ellipse) return;
    const progress = Math.min(1, ageMs / handle.runtime.preset.ring.durationMs);
    const radius = Math.max(1, handle.runtime.preset.radiusM * progress);
    const alpha = handle.runtime.preset.ring.maxOpacity * fadeOut(progress);
    const minimal = handle.runtime.lodTier === 'minimal';
    handle.ring.show = !minimal;
    handle.ring.ellipse.semiMajorAxis = setConstantValue(handle.ring.ellipse.semiMajorAxis, radius);
    handle.ring.ellipse.semiMinorAxis = setConstantValue(handle.ring.ellipse.semiMinorAxis, radius);
    handle.ring.ellipse.material = setColorMaterial(
      handle.ring.ellipse.material,
      Cesium.Color.fromCssColorString(handle.runtime.preset.palette.ring).withAlpha(alpha * 0.12),
    );
    handle.ring.ellipse.outlineColor = setConstantValue(
      handle.ring.ellipse.outlineColor,
      Cesium.Color.fromCssColorString(handle.runtime.preset.palette.ring).withAlpha(alpha),
    );
  }

  private updatePulse(handle: EffectHandle, ageMs: number): void {
    if (!handle.pulse?.billboard || !handle.pulse.label) return;
    const progress = Math.min(1, ageMs / handle.runtime.preset.durationMs);
    const alphaBase =
      handle.runtime.lodTier === 'minimal' ? 0.75
      : handle.runtime.lodTier === 'far' ? 0.52
      : 0.22;
    handle.pulse.billboard.scale = setConstantValue(
      handle.pulse.billboard.scale,
      0.28 + smoothPulse(progress) * (handle.runtime.lodTier === 'minimal' ? 0.5 : 0.24),
    );
    handle.pulse.billboard.color = setConstantValue(
      handle.pulse.billboard.color,
      Cesium.Color.fromCssColorString(handle.runtime.preset.palette.ring).withAlpha(alphaBase * fadeOut(progress * 0.8)),
    );
    handle.pulse.label.show = setConstantValue(
      handle.pulse.label.show,
      handle.runtime.lodTier === 'far' || handle.runtime.lodTier === 'minimal',
    );
  }

  private updateSmoke(handle: EffectHandle, ageMs: number): void {
    if (handle.smoke.length === 0) return;

    const progress = Math.min(1, ageMs / handle.runtime.preset.smokeLifetimeMs);
    const visibleCount = this.visibleParticleCount(handle.runtime.lodTier, handle.runtime.preset);
    const { east, north, up } = makeEnuFrame(handle.runtime.event.position);
    const seed = hashEventSeed(handle.runtime.event);

    handle.smoke.forEach((entity, index) => {
      if (!entity.billboard) return;

      const isVisible = index < visibleCount && handle.runtime.lodTier !== 'minimal';
      entity.show = isVisible;
      if (!isVisible) return;

      const swirl = seededUnit(seed, index) * Math.PI * 2;
      const spread = handle.runtime.preset.radiusM * 0.25 * (0.2 + progress);
      const eastM = Math.cos(swirl) * spread * (0.35 + seededUnit(seed + 13, index));
      const northM = Math.sin(swirl) * spread * (0.35 + seededUnit(seed + 31, index));
      const upM = seededUnit(seed + 67, index) * handle.runtime.preset.smokeRiseM * progress;
      entity.position = setPositionValue(
        entity.position,
        offsetFromOrigin(handle.origin, east, north, up, eastM, northM, upM),
      );
      entity.billboard.scale = setConstantValue(
        entity.billboard.scale,
        0.26 + progress * handle.runtime.preset.smoke.maxScale * 0.7,
      );
      entity.billboard.color = setConstantValue(
        entity.billboard.color,
        Cesium.Color.fromCssColorString(handle.runtime.preset.palette.smoke).withAlpha(
          handle.runtime.preset.smoke.maxOpacity * fadeOut(progress),
        ),
      );
    });
  }

  private updateStreaks(handle: EffectHandle, ageMs: number): void {
    if (handle.streaks.length === 0) return;

    const progress = Math.min(1, ageMs / handle.runtime.preset.streaks.durationMs);
    const visibleCount = Math.max(
      0,
      Math.round(
        handle.runtime.preset.streakCount
        * (handle.runtime.lodTier === 'near' ? 1 : handle.runtime.lodTier === 'mid' ? 0.6 : 0.25),
      ),
    );
    const { east, north, up } = makeEnuFrame(handle.runtime.event.position);
    const seed = hashEventSeed(handle.runtime.event) + 201;

    handle.streaks.forEach((entity, index) => {
      if (!entity.billboard) return;
      const isVisible = index < visibleCount && handle.runtime.lodTier !== 'minimal';
      entity.show = isVisible;
      if (!isVisible) return;

      const direction = seededUnit(seed, index) * Math.PI * 2;
      const distance = handle.runtime.preset.radiusM * 0.35 * progress;
      const eastM = Math.cos(direction) * distance;
      const northM = Math.sin(direction) * distance;
      const upM = handle.runtime.preset.radiusM * 0.08 * progress;
      entity.position = setPositionValue(
        entity.position,
        offsetFromOrigin(handle.origin, east, north, up, eastM, northM, upM),
      );
      entity.billboard.rotation = setConstantValue(entity.billboard.rotation, direction);
      entity.billboard.color = setConstantValue(
        entity.billboard.color,
        Cesium.Color.fromCssColorString(handle.runtime.preset.palette.streak).withAlpha(
          handle.runtime.preset.streaks.maxOpacity * fadeOut(progress),
        ),
      );
    });
  }

  private spawnAftermath(runtime: ImpactRuntimeState, nowMs: number): AftermathMarker | null {
    if (this.aftermath.size >= MAX_AFTERMATH_MARKERS) {
      const oldest = [...this.aftermath.values()]
        .sort((a, b) => a.marker.createdAtMs - b.marker.createdAtMs)[0];
      if (oldest) this.removeAftermath(oldest.marker.id);
    }

    const marker: AftermathMarker = {
      id: `${runtime.event.id}:aftermath`,
      position: { ...runtime.event.position, alt: Math.min(runtime.event.position.alt, 1200) },
      createdAtMs: nowMs,
      lifetimeMs: runtime.event.aftermathLifetimeMs ?? runtime.preset.aftermathLifetimeMs,
      maxOpacity: runtime.preset.aftermath.maxOpacity,
      pulseRadiusM: runtime.preset.radiusM * 0.6,
      color: runtime.preset.palette.aftermath,
      relatedEntityId: runtime.event.relatedEntityIds[0] ?? null,
    };

    const entity = this.viewer.entities.add({
      position: impactGeoToCartesian(marker.position),
      billboard: {
        image: makeAftermathSprite(marker.color),
        scale: 0.9,
        color: Cesium.Color.fromCssColorString(marker.color).withAlpha(marker.maxOpacity),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    this.aftermath.set(marker.id, { marker, entity });
    return marker;
  }

  private visibleParticleCount(lodTier: ImpactLodTier, preset: ImpactPreset): number {
    const factor =
      lodTier === 'near' ? preset.lod.nearParticleFactor
      : lodTier === 'mid' ? preset.lod.midParticleFactor
      : lodTier === 'far' ? preset.lod.farParticleFactor
      : 0;
    return Math.max(0, Math.round(preset.particleCount * factor));
  }

  private removeEffect(id: string): void {
    const handle = this.activeEffects.get(id);
    if (!handle) return;

    this.removeEntity(handle.flash);
    this.removeEntity(handle.glow);
    this.removeEntity(handle.ring);
    this.removeEntity(handle.pulse);
    handle.smoke.forEach((entity) => this.removeEntity(entity));
    handle.streaks.forEach((entity) => this.removeEntity(entity));
    this.activeEffects.delete(id);
  }

  private removeAftermath(id: string): void {
    const handle = this.aftermath.get(id);
    if (!handle) return;
    this.removeEntity(handle.entity);
    this.aftermath.delete(id);
  }

  private removeEntity(entity: Cesium.Entity | null): void {
    if (!entity || this.viewer.isDestroyed()) return;
    this.viewer.entities.remove(entity);
  }
}
