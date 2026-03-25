import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { EntityDefinition } from '../../types/entity';
import {
  computeBallisticArc,
  geoArrayToCartesian3Array,
  entityColor,
  geoToCartesian,
} from '../../utils/cesiumHelpers';

interface Props {
  viewer: Cesium.Viewer | null;
  entityDefinitions: EntityDefinition[];
}

const APOGEE_ALT = 300_000; // meters — fictional, non-calibrated

export function TrajectoryLayer({ viewer, entityDefinitions }: Props) {
  const polylineMapRef = useRef<Map<string, Cesium.Entity>>(new Map());

  useEffect(() => {
    if (!viewer) return;

    // Clear previous trajectories
    for (const entity of polylineMapRef.current.values()) {
      viewer.entities.remove(entity);
    }
    polylineMapRef.current.clear();

    for (const def of entityDefinitions) {
      if (def.trajectory_type === 'stationary') continue;

      let positions: Cesium.Cartesian3[];

      if (def.trajectory_type === 'ballistic' && def.target) {
        const arc = computeBallisticArc(def.origin, def.target, APOGEE_ALT);
        positions = geoArrayToCartesian3Array(arc);
      } else if (def.trajectory_type === 'cruise' && def.waypoints && def.waypoints.length > 0) {
        const allPoints = [def.origin, ...def.waypoints];
        positions = allPoints.map(geoToCartesian);
      } else {
        continue;
      }

      const color = entityColor(def.type).withAlpha(0.4);

      const entity = viewer.entities.add({
        id: `trajectory_${def.id}`,
        polyline: {
          positions,
          width: 1.5,
          material: new Cesium.PolylineDashMaterialProperty({
            color,
            dashLength: 16,
          }),
          clampToGround: false,
        },
      });
      polylineMapRef.current.set(def.id, entity);
    }
  }, [viewer, entityDefinitions]);

  useEffect(() => {
    return () => {
      if (!viewer) return;
      for (const entity of polylineMapRef.current.values()) {
        viewer.entities.remove(entity);
      }
      polylineMapRef.current.clear();
    };
  }, [viewer]);

  return null;
}
