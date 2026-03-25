import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { EntityDefinition, EntityState, EntityStatus } from '../../types/entity';
import { geoToCartesian, entityColor, getMissileIcon } from '../../utils/cesiumHelpers';
import { useCameraStore } from '../../store/cameraStore';
import {
  getEntityDisplayName,
  isDefenseAssetEntity,
  isMovingRuntimeEntity,
  isSensorRuntimeEntity,
} from '../../utils/entityRuntime';

interface Props {
  viewer: Cesium.Viewer | null;
  entities: EntityState[];
  entityDefinitions: EntityDefinition[];
}

const TRAIL_MAX_POINTS = 80;

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

export function EntityLayer({ viewer, entities, entityDefinitions }: Props) {
  const mode = useCameraStore((s) => s.mode);
  const trackedEntityId = useCameraStore((s) => s.trackedEntityId);
  const setMode = useCameraStore((s) => s.setMode);
  const setTrackedEntityId = useCameraStore((s) => s.setTrackedEntityId);
  const followPreset = useCameraStore((s) => s.followPreset);
  const setFollowPreset = useCameraStore((s) => s.setFollowPreset);
  const setHudExpanded = useCameraStore((s) => s.setHudExpanded);
  const entityMapRef  = useRef<Map<string, Cesium.Entity>>(new Map());
  const trailMapRef   = useRef<Map<string, Cesium.Entity>>(new Map());
  const historyRef    = useRef<Map<string, Cesium.Cartesian3[]>>(new Map());
  const prevStatusRef = useRef<Map<string, EntityStatus>>(new Map());

  useEffect(() => {
    if (!viewer) return;

    const seenIds = new Set<string>();
    const definitionMap = new Map(entityDefinitions.map((definition) => [definition.id, definition]));

    for (const state of entities) {
      seenIds.add(state.id);

      const position    = geoToCartesian(state.position);
      const color       = entityColor(state.type);
      const isInactive  = state.status === 'inactive';
      const isActive    = state.status === 'active';
      const isTerminated =
        state.status === 'intercepted' ||
        state.status === 'destroyed'   ||
        state.status === 'missed';
      const definition = definitionMap.get(state.id) ?? null;
      const isStationary = !isMovingRuntimeEntity(state, definition);
      const isSensor = isSensorRuntimeEntity(state);
      const displayName = getEntityDisplayName(state, definition);
      const prevStatus = prevStatusRef.current.get(state.id);
      const hideBaseVisual =
        mode === 'follow'
        && followPreset === 'chase'
        && trackedEntityId === state.id
        && isMovingRuntimeEntity(state, definition);

      const existing = entityMapRef.current.get(state.id);

      if (existing) {
        // ── Update position ────────────────────────────────────────────
        existing.position = setPositionValue(existing.position, position);

        // ── Phase 2: update billboard orientation / visibility ─────────
        if (existing.billboard) {
          const displayColor = isTerminated
            ? Cesium.Color.GRAY.withAlpha(0.4)
            : color;
          const billboardScale = hideBaseVisual ? 0.001 : 1;
          existing.billboard.color = setConstantValue(existing.billboard.color, displayColor);
          existing.billboard.show = setConstantValue(
            existing.billboard.show,
            !isInactive && !hideBaseVisual,
          );
          existing.billboard.rotation = setConstantValue(
            existing.billboard.rotation,
            -Cesium.Math.toRadians(state.heading_deg),
          );
          existing.billboard.scale = setConstantValue(existing.billboard.scale, billboardScale);
        }
        if (existing.label) {
          existing.label.show = setConstantValue(existing.label.show, !hideBaseVisual);
        }
        if (existing.point) {
          const displayColor = isTerminated
            ? Cesium.Color.GRAY.withAlpha(0.4)
            : color;
          existing.point.color = setConstantValue(existing.point.color, displayColor);
        }
      } else {
        // ── Phase 2: create entity with billboard icon ─────────────────
        const entityOpts: Cesium.Entity.ConstructorOptions = {
          id:       state.id,
          name:     state.id,
          position: new Cesium.ConstantPositionProperty(position),
          label: {
            text:         displayName,
            font:         '11px monospace',
            fillColor:    Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style:        Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset:  new Cesium.Cartesian2(14, -6),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        };

        if (isSensor || isStationary) {
          entityOpts.point = {
            pixelSize:    isSensor ? 8 : 11,
            color,
            outlineColor: Cesium.Color.WHITE.withAlpha(0.3),
            outlineWidth: isSensor ? 1 : 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          };
        } else {
          entityOpts.billboard = {
            image:     getMissileIcon(state.type),
            width:     12,
            height:    28,
            color,
            rotation:  -Cesium.Math.toRadians(state.heading_deg),
            alignedAxis: Cesium.Cartesian3.UNIT_Z,
            show:      !isInactive && !hideBaseVisual,
            scale:     hideBaseVisual ? 0.001 : 1,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          };
        }

        entityMapRef.current.set(state.id, viewer.entities.add(entityOpts));
      }

      // ── Phase 3: launch flash ────────────────────────────────────────
      if (prevStatus === 'inactive' && isActive) {
        const flash = viewer.entities.add({
          position,
          point: {
            pixelSize:    30,
            color:        color.withAlpha(0.85),
            outlineColor: Cesium.Color.WHITE.withAlpha(0.6),
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        setTimeout(() => {
          if (!viewer.isDestroyed()) viewer.entities.remove(flash);
        }, 700);
      }

      prevStatusRef.current.set(state.id, state.status);

      // ── Trail polyline (active non-sensor entities only) ─────────────
      if (!isSensor && isActive) {
        if (isStationary) continue;
        const history = historyRef.current.get(state.id) ?? [];
        history.push(position);
        if (history.length > TRAIL_MAX_POINTS) history.shift();
        historyRef.current.set(state.id, history);

        if (history.length >= 2) {
          const existingTrail = trailMapRef.current.get(state.id);
          if (existingTrail) {
            existingTrail.polyline!.positions = setConstantValue(
              existingTrail.polyline!.positions,
              [...history],
            );
          } else {
            const trailEntity = viewer.entities.add({
              id: `trail_${state.id}`,
              polyline: {
                positions: [...history],
                width: 1.5,
                material: new Cesium.PolylineGlowMaterialProperty({
                  glowPower: 0.1,
                  color: color.withAlpha(0.6),
                }),
                clampToGround: false,
              },
            });
            trailMapRef.current.set(state.id, trailEntity);
          }
        }
      }
    }

    // Remove stale entities
    for (const [id, entity] of entityMapRef.current) {
      if (!seenIds.has(id)) {
        viewer.entities.remove(entity);
        entityMapRef.current.delete(id);
        const trail = trailMapRef.current.get(id);
        if (trail) {
          viewer.entities.remove(trail);
          trailMapRef.current.delete(id);
        }
        historyRef.current.delete(id);
        prevStatusRef.current.delete(id);
      }
    }
  }, [viewer, entities, entityDefinitions, mode, trackedEntityId, followPreset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!viewer) return;
      for (const entity of entityMapRef.current.values()) viewer.entities.remove(entity);
      for (const trail of trailMapRef.current.values()) viewer.entities.remove(trail);
      entityMapRef.current.clear();
      trailMapRef.current.clear();
      historyRef.current.clear();
      prevStatusRef.current.clear();
    };
  }, [viewer]);

  useEffect(() => {
    if (!viewer || entities.length === 0) return;

    const entityById = new Map(entities.map((entity) => [entity.id, entity]));

    const handleSelectedEntityChanged = (selectedEntity: Cesium.Entity | undefined) => {
      const rawId = selectedEntity?.id;
      if (typeof rawId !== 'string') return;

      const normalizedId = rawId.startsWith('trail_') ? rawId.slice(6) : rawId;
      const selectedRuntime = entityById.get(normalizedId);
      if (!selectedRuntime) return;

      if (isDefenseAssetEntity(selectedRuntime)) {
        setMode('tactical');
      } else {
        setFollowPreset('wide');
        setMode('follow');
      }
      setTrackedEntityId(normalizedId);
      setHudExpanded(true);
    };

    viewer.selectedEntityChanged.addEventListener(handleSelectedEntityChanged);

    return () => {
      viewer.selectedEntityChanged.removeEventListener(handleSelectedEntityChanged);
    };
  }, [entities, setFollowPreset, setHudExpanded, setMode, setTrackedEntityId, viewer]);

  return null;
}
