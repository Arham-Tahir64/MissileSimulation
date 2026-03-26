import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useSimulationStore } from '../../store/simulationStore';
import { geoToCartesian, entityColor } from '../../utils/cesiumHelpers';

interface Props {
  viewer: Cesium.Viewer | null;
}

/** Number of past positions to retain per entity. */
const MAX_TRAIL_POINTS = 24;
/** Only track moving entities (threats + interceptors). */
const MOVING_TYPES = new Set(['ballistic_threat', 'cruise_threat', 'interceptor']);

interface TrailHandle {
  entity: Cesium.Entity;
  positions: Cesium.Cartesian3[];
}

function setConstantValue<T>(
  property: Cesium.Property | undefined,
  value: T,
): Cesium.ConstantProperty {
  if (property && 'setValue' in property && typeof property.setValue === 'function') {
    (property as Cesium.ConstantProperty).setValue(value);
    return property as Cesium.ConstantProperty;
  }
  return new Cesium.ConstantProperty(value);
}

/**
 * Renders fading dotted position trails behind every active threat and interceptor.
 * Each entity gets up to MAX_TRAIL_POINTS history positions forming a dashed polyline
 * whose alpha decreases toward the tail.
 */
export function TrackHistoryLayer({ viewer }: Props) {
  const entities = useSimulationStore((s) => s.entities);
  const simTimeS  = useSimulationStore((s) => s.simTimeS);
  const scenarioId = useSimulationStore((s) => s.scenarioId);

  const trailsRef     = useRef<Map<string, TrailHandle>>(new Map());
  const prevTimeRef   = useRef<number>(0);
  const prevScenario  = useRef<string | null>(null);

  // ── Reset on rewind or scenario change ───────────────────────────────────
  useEffect(() => {
    const rewound  = simTimeS + 0.001 < prevTimeRef.current;
    const newScene = scenarioId !== prevScenario.current;
    prevTimeRef.current  = simTimeS;
    prevScenario.current = scenarioId;

    if (!viewer || (!rewound && !newScene)) return;

    for (const { entity } of trailsRef.current.values()) {
      viewer.entities.remove(entity);
    }
    trailsRef.current.clear();
  }, [viewer, simTimeS, scenarioId]);

  // ── Build/update trails on every tick ────────────────────────────────────
  useEffect(() => {
    if (!viewer) return;

    // Remove trails for entities that no longer exist
    const liveIds = new Set(entities.map((e) => e.id));
    for (const [id, handle] of trailsRef.current) {
      if (!liveIds.has(id)) {
        viewer.entities.remove(handle.entity);
        trailsRef.current.delete(id);
      }
    }

    for (const entity of entities) {
      if (!MOVING_TYPES.has(entity.type)) continue;
      if (entity.status === 'inactive') continue;

      const terminated =
        entity.status === 'intercepted' ||
        entity.status === 'destroyed'   ||
        entity.status === 'missed';

      const currentPos = geoToCartesian(entity.position);
      let handle = trailsRef.current.get(entity.id);

      if (!handle) {
        // Create the trail entity with an initial single-point stub
        const color = entityColor(entity.type);
        const cesiumEntity = viewer.entities.add({
          id: `trail_${entity.id}`,
          polyline: {
            positions: [currentPos, currentPos],
            width: 1.5,
            material: new Cesium.PolylineDashMaterialProperty({
              color: color.withAlpha(0.55),
              dashLength: 10,
              gapColor: Cesium.Color.TRANSPARENT,
            }),
            clampToGround: false,
          },
        });
        handle = { entity: cesiumEntity, positions: [currentPos] };
        trailsRef.current.set(entity.id, handle);
      }

      if (!terminated) {
        // Append current position; trim to max length
        const last = handle.positions[handle.positions.length - 1];
        if (Cesium.Cartesian3.distance(last, currentPos) > 500) {
          handle.positions.push(currentPos);
          if (handle.positions.length > MAX_TRAIL_POINTS) {
            handle.positions.shift();
          }
        }
      }

      const pts = handle.positions;
      handle.entity.polyline!.positions = setConstantValue(
        handle.entity.polyline!.positions,
        pts.length >= 2 ? pts : [pts[0], pts[0]],
      );
      handle.entity.polyline!.show = setConstantValue(
        handle.entity.polyline!.show,
        pts.length >= 2,
      );
    }
  }, [viewer, entities]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (!viewer) return;
      for (const { entity } of trailsRef.current.values()) {
        viewer.entities.remove(entity);
      }
      trailsRef.current.clear();
    };
  }, [viewer]);

  return null;
}
