import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { getDefenseAssetConfigByDesignator } from '../../config/defenseAssets';
import { useCameraStore } from '../../store/cameraStore';
import { useSimulationStore } from '../../store/simulationStore';
import { geoToCartesian } from '../../utils/cesiumHelpers';
import { getEntityDisplayName, isDefenseAssetEntity, isSensorRuntimeEntity } from '../../utils/entityRuntime';

interface Props {
  viewer: Cesium.Viewer | null;
}

export function AssetOverlayLayer({ viewer }: Props) {
  const trackedEntityId = useCameraStore((s) => s.trackedEntityId);
  const entities = useSimulationStore((s) => s.entities);

  const overlayIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!viewer) return;

    const clear = () => {
      for (const id of overlayIdsRef.current) {
        const entity = viewer.entities.getById(id);
        if (entity) viewer.entities.remove(entity);
      }
      overlayIdsRef.current = [];
    };

    clear();

    const selectedEntity = entities.find((entity) => entity.id === trackedEntityId) ?? null;
    if (!selectedEntity || !isDefenseAssetEntity(selectedEntity)) return clear;

    const config = getDefenseAssetConfigByDesignator(selectedEntity.designator);
    if (!config) return clear;

    const center = geoToCartesian({ ...selectedEntity.position, alt: 0 });
    const selectedName = getEntityDisplayName(selectedEntity);
    const overlayIds: string[] = [];

    const addOverlay = (entity: Cesium.Entity) => {
      overlayIds.push(entity.id as string);
    };

    if (config.detectionRadiusM) {
      addOverlay(viewer.entities.add({
        id: `asset_overlay_detection_${selectedEntity.id}`,
        position: center,
        ellipse: {
          semiMajorAxis: config.detectionRadiusM,
          semiMinorAxis: config.detectionRadiusM,
          material: Cesium.Color.fromCssColorString(config.cssColor).withAlpha(0.05),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString(config.cssColor).withAlpha(0.48),
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      }));
    }

    if (config.engagementRadiusM) {
      addOverlay(viewer.entities.add({
        id: `asset_overlay_engagement_${selectedEntity.id}`,
        position: center,
        ellipse: {
          semiMajorAxis: config.engagementRadiusM,
          semiMinorAxis: config.engagementRadiusM,
          material: Cesium.Color.CYAN.withAlpha(0.04),
          outline: true,
          outlineColor: Cesium.Color.CYAN.withAlpha(0.52),
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      }));
    }

    const linkedTargets = isSensorRuntimeEntity(selectedEntity)
      ? selectedEntity.detected_threat_ids ?? []
      : selectedEntity.current_target_id
        ? [selectedEntity.current_target_id]
        : [];

    for (const targetId of linkedTargets) {
      const target = entities.find((entity) => entity.id === targetId);
      if (!target) continue;

      addOverlay(viewer.entities.add({
        id: `asset_overlay_link_${selectedEntity.id}_${target.id}`,
        polyline: {
          positions: [
            geoToCartesian(selectedEntity.position),
            geoToCartesian(target.position),
          ],
          width: 2,
          material: new Cesium.PolylineDashMaterialProperty({
            color: isSensorRuntimeEntity(selectedEntity)
              ? Cesium.Color.fromCssColorString(config.cssColor).withAlpha(0.82)
              : Cesium.Color.CYAN.withAlpha(0.82),
            dashLength: 12,
          }),
        },
      }));
    }

    addOverlay(viewer.entities.add({
      id: `asset_overlay_label_${selectedEntity.id}`,
      position: geoToCartesian(selectedEntity.position),
      label: {
        text: isSensorRuntimeEntity(selectedEntity)
          ? `${selectedName} // TRACK_VOLUME`
          : `${selectedName} // ENGAGEMENT_ZONE`,
        font: '600 12px monospace',
        fillColor: Cesium.Color.fromCssColorString(config.cssColor),
        outlineColor: Cesium.Color.BLACK.withAlpha(0.8),
        outlineWidth: 3,
        pixelOffset: new Cesium.Cartesian2(0, -24),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    }));

    overlayIdsRef.current = overlayIds;

    return clear;
  }, [entities, trackedEntityId, viewer]);

  return null;
}
