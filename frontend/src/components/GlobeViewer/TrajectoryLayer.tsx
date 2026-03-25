import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { EntityDefinition, EntityState } from '../../types/entity';
import {
  computeBallisticArc,
  sampleCruisePath,
  geoArrayToCartesian3Array,
  entityColor,
  computeFlightTimeS,
} from '../../utils/cesiumHelpers';

interface Props {
  viewer: Cesium.Viewer | null;
  entityDefinitions: EntityDefinition[];
  entities: EntityState[];  // live state — drives the progressive arc split
}

const APOGEE_ALT  = 300_000; // meters — fictional, non-calibrated
const ARC_SAMPLES = 100;

interface ArcData {
  positions:  Cesium.Cartesian3[];
  flightTime: number; // seconds of travel from launch
  launchTime: number; // scenario launch_time_s offset
}

interface ArcHandle {
  completed: Cesium.Entity; // solid past arc
  remaining: Cesium.Entity; // dashed future arc
}

export function TrajectoryLayer({ viewer, entityDefinitions, entities }: Props) {
  const arcDataRef    = useRef<Map<string, ArcData>>(new Map());
  const arcHandlesRef = useRef<Map<string, ArcHandle>>(new Map());

  // ── Effect 1: recreate Cesium entities when definitions change ───────────
  useEffect(() => {
    if (!viewer) return;

    // Remove previous entities
    for (const { completed, remaining } of arcHandlesRef.current.values()) {
      viewer.entities.remove(completed);
      viewer.entities.remove(remaining);
    }
    arcHandlesRef.current.clear();
    arcDataRef.current.clear();

    for (const def of entityDefinitions) {
      if (def.trajectory_type === 'stationary') continue;

      let positions: Cesium.Cartesian3[];

      if (def.trajectory_type === 'ballistic' && def.target) {
        const arc = computeBallisticArc(def.origin, def.target, APOGEE_ALT, ARC_SAMPLES);
        positions = geoArrayToCartesian3Array(arc);
      } else if (def.trajectory_type === 'cruise') {
        positions = sampleCruisePath(def, ARC_SAMPLES);
      } else {
        continue;
      }

      arcDataRef.current.set(def.id, {
        positions,
        flightTime: computeFlightTimeS(def),
        launchTime: def.launch_time_s,
      });

      const color = entityColor(def.type);

      // Completed arc — solid line, hidden initially
      const completed = viewer.entities.add({
        id: `traj_done_${def.id}`,
        polyline: {
          positions: positions.slice(0, 2), // minimal stub
          width: 2,
          material: color.withAlpha(0.75),
          clampToGround: false,
          show: false,
        },
      });

      // Remaining arc — full dashed line, shown from load
      const remaining = viewer.entities.add({
        id: `traj_rem_${def.id}`,
        polyline: {
          positions,
          width: 1.5,
          material: new Cesium.PolylineDashMaterialProperty({
            color: color.withAlpha(0.35),
            dashLength: 16,
          }),
          clampToGround: false,
        },
      });

      arcHandlesRef.current.set(def.id, { completed, remaining });
    }
  }, [viewer, entityDefinitions]);

  // ── Effect 2: update progressive split on every sim tick ────────────────
  useEffect(() => {
    if (!viewer) return;

    for (const [id, arcData] of arcDataRef.current) {
      const handle     = arcHandlesRef.current.get(id);
      if (!handle) continue;

      const liveEntity = entities.find((e) => e.id === id);
      if (!liveEntity || liveEntity.status === 'inactive') continue;

      const isTerminated =
        liveEntity.status === 'intercepted' ||
        liveEntity.status === 'destroyed'   ||
        liveEntity.status === 'missed';

      // Compute how far through the trajectory we are [0, 1]
      const elapsed  = liveEntity.sim_time_s - arcData.launchTime;
      const fraction = isTerminated
        ? 1
        : Math.max(0, Math.min(1, arcData.flightTime > 0 ? elapsed / arcData.flightTime : 0));

      const total    = arcData.positions.length;
      const splitIdx = Math.max(1, Math.min(total - 1, Math.floor(fraction * (total - 1))));

      const completedPositions = arcData.positions.slice(0, splitIdx + 1);
      const remainingPositions = arcData.positions.slice(splitIdx);

      // Update completed (solid) arc
      (handle.completed.polyline!.show      as Cesium.ConstantProperty).setValue(completedPositions.length >= 2);
      (handle.completed.polyline!.positions as Cesium.ConstantProperty).setValue(completedPositions);

      // Update remaining (dashed) arc — hide once terminated or fully travelled
      const showRemaining = !isTerminated && remainingPositions.length >= 2;
      (handle.remaining.polyline!.show      as Cesium.ConstantProperty).setValue(showRemaining);
      if (showRemaining) {
        (handle.remaining.polyline!.positions as Cesium.ConstantProperty).setValue(remainingPositions);
      }
    }
  }, [viewer, entities]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!viewer) return;
      for (const { completed, remaining } of arcHandlesRef.current.values()) {
        viewer.entities.remove(completed);
        viewer.entities.remove(remaining);
      }
      arcHandlesRef.current.clear();
      arcDataRef.current.clear();
    };
  }, [viewer]);

  return null;
}
