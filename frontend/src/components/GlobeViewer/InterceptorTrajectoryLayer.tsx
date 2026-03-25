import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { GeoPosition } from '../../types/entity';
import { useSimulationStore } from '../../store/simulationStore';
import { isEngagementOrderEvent } from '../../types/simulation';
import {
  computeBallisticArc,
  geoArrayToCartesian3Array,
  geoToCartesian,
  haversineDistanceM,
} from '../../utils/cesiumHelpers';

interface Props {
  viewer: Cesium.Viewer | null;
}

const ARC_SAMPLES = 60;
const INTERCEPTOR_COLOR = Cesium.Color.fromCssColorString('#00e5ff');

interface InterceptorArc {
  interceptorId: string;
  positions: Cesium.Cartesian3[];
  completed: Cesium.Entity;
  remaining: Cesium.Entity;
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

function buildArcPositions(launch: GeoPosition, intercept: GeoPosition): Cesium.Cartesian3[] {
  const dist = haversineDistanceM(launch, intercept);
  // Modest parabolic apex — proportional to distance, capped at 150 km
  const apogee = Math.min(150_000, dist * 0.15);
  const geo = computeBallisticArc(launch, intercept, apogee, ARC_SAMPLES);
  return geoArrayToCartesian3Array(geo);
}

/**
 * Draws trajectory arcs for interceptors spawned dynamically by the backend.
 * These entities don't appear in the scenario's EntityDefinition list, so
 * TrajectoryLayer cannot handle them. Instead we watch engagement_order events
 * which carry the battery ID (launch point) and intercept position (target).
 */
export function InterceptorTrajectoryLayer({ viewer }: Props) {
  const events   = useSimulationStore((s) => s.events);
  const entities = useSimulationStore((s) => s.entities);
  const arcsRef  = useRef<Map<string, InterceptorArc>>(new Map());

  // ── Effect 1: create/cleanup arcs as events change ───────────────────────
  useEffect(() => {
    if (!viewer) return;

    // Remove arcs for interceptors whose engagement_order no longer exists
    // (happens on rewind or scenario reset when the store clears events)
    const activeIds = new Set(
      events.filter(isEngagementOrderEvent).map((e) => e.interceptor_id),
    );
    for (const [id, arc] of arcsRef.current) {
      if (!activeIds.has(id)) {
        viewer.entities.remove(arc.completed);
        viewer.entities.remove(arc.remaining);
        arcsRef.current.delete(id);
      }
    }

    // Add arcs for new engagement_order events
    for (const event of events) {
      if (!isEngagementOrderEvent(event)) continue;
      if (arcsRef.current.has(event.interceptor_id)) continue;
      if (!event.position) continue; // no intercept point available

      const batteryEntity = entities.find((e) => e.id === event.battery_id);
      if (!batteryEntity) continue;

      const positions = buildArcPositions(batteryEntity.position, event.position);

      const completed = viewer.entities.add({
        id: `int_traj_done_${event.interceptor_id}`,
        polyline: {
          positions: positions.slice(0, 2),
          width: 1.5,
          material: INTERCEPTOR_COLOR.withAlpha(0.65),
          clampToGround: false,
          show: false,
        },
      });

      const remaining = viewer.entities.add({
        id: `int_traj_rem_${event.interceptor_id}`,
        polyline: {
          positions,
          width: 1,
          material: new Cesium.PolylineDashMaterialProperty({
            color: INTERCEPTOR_COLOR.withAlpha(0.28),
            dashLength: 10,
          }),
          clampToGround: false,
        },
      });

      arcsRef.current.set(event.interceptor_id, {
        interceptorId: event.interceptor_id,
        positions,
        completed,
        remaining,
      });
    }
  }, [viewer, events, entities]);

  // ── Effect 2: update split point every tick as interceptor moves ──────────
  useEffect(() => {
    if (!viewer) return;

    for (const [interceptorId, arc] of arcsRef.current) {
      const live = entities.find((e) => e.id === interceptorId);
      if (!live || live.status === 'inactive') continue;

      const terminated =
        live.status === 'intercepted' ||
        live.status === 'destroyed'   ||
        live.status === 'missed';

      const total = arc.positions.length;
      let splitIdx = total - 1;

      if (!terminated) {
        // Find the arc position nearest to the interceptor's current position
        const currentCart = geoToCartesian(live.position);
        let minDist = Infinity;
        for (let i = 0; i < arc.positions.length; i++) {
          const d = Cesium.Cartesian3.distance(arc.positions[i], currentCart);
          if (d < minDist) {
            minDist = d;
            splitIdx = i;
          }
        }
      }

      const completedPositions = arc.positions.slice(0, splitIdx + 1);
      const remainingPositions = arc.positions.slice(splitIdx);

      arc.completed.polyline!.show = setConstantValue(
        arc.completed.polyline!.show,
        completedPositions.length >= 2,
      );
      arc.completed.polyline!.positions = setConstantValue(
        arc.completed.polyline!.positions,
        completedPositions,
      );

      const showRemaining = !terminated && remainingPositions.length >= 2;
      arc.remaining.polyline!.show = setConstantValue(
        arc.remaining.polyline!.show,
        showRemaining,
      );
      if (showRemaining) {
        arc.remaining.polyline!.positions = setConstantValue(
          arc.remaining.polyline!.positions,
          remainingPositions,
        );
      }
    }
  }, [viewer, entities]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (!viewer) return;
      for (const arc of arcsRef.current.values()) {
        viewer.entities.remove(arc.completed);
        viewer.entities.remove(arc.remaining);
      }
      arcsRef.current.clear();
    };
  }, [viewer]);

  return null;
}
