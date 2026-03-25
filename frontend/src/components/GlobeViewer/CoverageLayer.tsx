/**
 * CoverageLayer — renders theater-wide coverage rings for ALL defense assets
 * simultaneously, plus tracking-uncertainty ellipses around detected threats.
 *
 * This complements AssetOverlayLayer (which shows detailed rings for the
 * currently-selected entity only) with a persistent ambient coverage view.
 *
 * Ring types:
 *  - Amber dashed ring: radar detection radius (how far a sensor can see)
 *  - Cyan dashed ring: battery engagement radius (how far interceptors can reach)
 *  - Red uncertainty ring: small radius around a threat currently being tracked,
 *    representing sensor imprecision / track confidence limit
 */
import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useSimulationStore } from '../../store/simulationStore';
import { getDefenseAssetConfigByDesignator } from '../../config/defenseAssets';
import { geoToCartesian } from '../../utils/cesiumHelpers';
import { isDefenseAssetEntity, isSensorRuntimeEntity } from '../../utils/entityRuntime';

interface Props {
  viewer: Cesium.Viewer | null;
}

// Approximate track-uncertainty radius in meters — a fixed fictional value
// representing the positional uncertainty band of a radar sensor track.
const TRACK_UNCERTAINTY_RADIUS_M = 28_000;

export function CoverageLayer({ viewer }: Props) {
  const entities = useSimulationStore((s) => s.entities);
  const entityIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!viewer) return;

    // Remove all previously added coverage entities.
    const clear = () => {
      for (const id of entityIdsRef.current) {
        const e = viewer.entities.getById(id);
        if (e) viewer.entities.remove(e);
      }
      entityIdsRef.current = [];
    };

    clear();

    const added: string[] = [];

    const addEntity = (entity: Cesium.Entity) => {
      added.push(entity.id as string);
    };

    // Collect detected threat IDs so we can render uncertainty rings.
    const detectedThreatIds = new Set<string>();

    for (const entity of entities) {
      if (!isDefenseAssetEntity(entity)) continue;

      const config = getDefenseAssetConfigByDesignator(entity.designator);
      if (!config) continue;

      const center = geoToCartesian({ ...entity.position, alt: 0 });

      if (isSensorRuntimeEntity(entity)) {
        // Radar detection radius — amber dashed ring.
        if (config.detectionRadiusM) {
          addEntity(viewer.entities.add({
            id: `cov_radar_${entity.id}`,
            position: center,
            ellipse: {
              semiMajorAxis: config.detectionRadiusM,
              semiMinorAxis: config.detectionRadiusM,
              material: Cesium.Color.fromCssColorString(config.cssColor).withAlpha(0.025),
              outline: true,
              outlineColor: Cesium.Color.fromCssColorString(config.cssColor).withAlpha(0.28),
              outlineWidth: 1,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
          }));
        }

        // Collect threats this sensor is currently tracking.
        for (const threatId of entity.detected_threat_ids ?? []) {
          detectedThreatIds.add(threatId);
        }
      } else {
        // Battery engagement radius — cyan dashed ring.
        if (config.engagementRadiusM) {
          addEntity(viewer.entities.add({
            id: `cov_battery_${entity.id}`,
            position: center,
            ellipse: {
              semiMajorAxis: config.engagementRadiusM,
              semiMinorAxis: config.engagementRadiusM,
              material: Cesium.Color.CYAN.withAlpha(0.02),
              outline: true,
              outlineColor: Cesium.Color.CYAN.withAlpha(0.22),
              outlineWidth: 1,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
          }));
        }
      }
    }

    // Tracking uncertainty rings around actively-detected threats.
    for (const entity of entities) {
      if (!detectedThreatIds.has(entity.id)) continue;
      if (entity.status !== 'active') continue;

      const center = geoToCartesian({ ...entity.position, alt: entity.position.alt });

      addEntity(viewer.entities.add({
        id: `cov_uncertainty_${entity.id}`,
        position: center,
        ellipse: {
          semiMajorAxis: TRACK_UNCERTAINTY_RADIUS_M,
          semiMinorAxis: TRACK_UNCERTAINTY_RADIUS_M,
          material: Cesium.Color.RED.withAlpha(0.04),
          outline: true,
          outlineColor: Cesium.Color.RED.withAlpha(0.36),
          outlineWidth: 1,
          heightReference: Cesium.HeightReference.NONE,
        },
      }));
    }

    entityIdsRef.current = added;

    return clear;
  }, [entities, viewer]);

  return null;
}
