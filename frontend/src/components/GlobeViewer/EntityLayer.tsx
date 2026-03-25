import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { EntityState } from '../../types/entity';
import { geoToCartesian, entityColor } from '../../utils/cesiumHelpers';

interface Props {
  viewer: Cesium.Viewer | null;
  entities: EntityState[];
}

// How many past positions to keep per entity for the trail polyline
const TRAIL_MAX_POINTS = 80;

export function EntityLayer({ viewer, entities }: Props) {
  const entityMapRef = useRef<Map<string, Cesium.Entity>>(new Map());
  const trailMapRef = useRef<Map<string, Cesium.Entity>>(new Map());
  // Accumulate position history per entity: id → circular buffer of Cartesian3
  const historyRef = useRef<Map<string, Cesium.Cartesian3[]>>(new Map());

  useEffect(() => {
    if (!viewer) return;

    const seenIds = new Set<string>();

    for (const state of entities) {
      seenIds.add(state.id);
      const position = geoToCartesian(state.position);
      const color = entityColor(state.type);
      const isTerminated = state.status === 'intercepted' || state.status === 'destroyed' || state.status === 'missed';

      // ── Point entity ────────────────────────────────────────────────
      const existing = entityMapRef.current.get(state.id);
      if (existing) {
        (existing.position as Cesium.ConstantPositionProperty).setValue(position);
        if (existing.point) {
          (existing.point.color as Cesium.ConstantProperty).setValue(
            isTerminated ? Cesium.Color.GRAY.withAlpha(0.5) : color
          );
          (existing.point.pixelSize as Cesium.ConstantProperty).setValue(
            isTerminated ? 6 : (state.type === 'sensor' ? 8 : 12)
          );
        }
      } else {
        const entity = viewer.entities.add({
          id: state.id,
          name: state.id,
          position,
          point: {
            pixelSize: state.type === 'sensor' ? 8 : 12,
            color,
            outlineColor: Cesium.Color.WHITE.withAlpha(0.3),
            outlineWidth: 1,
          },
          label: {
            text: state.id,
            font: '11px monospace',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(14, -6),
            show: true,
          },
        });
        entityMapRef.current.set(state.id, entity);
      }

      // ── Trail polyline ───────────────────────────────────────────────
      // Only trail active moving entities (skip sensors and terminated ones)
      if (state.type !== 'sensor' && state.status === 'active') {
        const history = historyRef.current.get(state.id) ?? [];
        history.push(position);
        if (history.length > TRAIL_MAX_POINTS) history.shift();
        historyRef.current.set(state.id, history);

        if (history.length >= 2) {
          const trailId = `trail_${state.id}`;
          const existingTrail = trailMapRef.current.get(state.id);
          if (existingTrail) {
            (existingTrail.polyline!.positions as Cesium.ConstantProperty).setValue(history);
          } else {
            const trailEntity = viewer.entities.add({
              id: trailId,
              polyline: {
                positions: history,
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

    // Remove stale entities and their trails
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
      }
    }
  }, [viewer, entities]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!viewer) return;
      for (const entity of entityMapRef.current.values()) viewer.entities.remove(entity);
      for (const trail of trailMapRef.current.values()) viewer.entities.remove(trail);
      entityMapRef.current.clear();
      trailMapRef.current.clear();
      historyRef.current.clear();
    };
  }, [viewer]);

  return null;
}
