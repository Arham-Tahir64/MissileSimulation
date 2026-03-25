import { useEffect } from 'react';
import * as Cesium from 'cesium';
import { usePlacementStore } from '../../store/placementStore';
import { getMissileTypeConfig } from '../../config/missileTypes';
import { haversineDistanceM } from '../../utils/cesiumHelpers';
import { GeoPosition } from '../../types/entity';

interface Props {
  viewer: Cesium.Viewer | null;
}

/** Converts a Cesium screen-space position to a GeoPosition on the globe surface. */
function pickGlobePosition(
  viewer: Cesium.Viewer,
  screenPos: Cesium.Cartesian2,
): GeoPosition | null {
  const ray = viewer.camera.getPickRay(screenPos);
  if (!ray) return null;
  const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
  if (!Cesium.defined(cartesian) || !cartesian) return null;
  const carto = Cesium.Cartographic.fromCartesian(cartesian);
  return {
    lat: Cesium.Math.toDegrees(carto.latitude),
    lon: Cesium.Math.toDegrees(carto.longitude),
    alt: 0,
  };
}

/**
 * Headless component — attaches a Cesium ScreenSpaceEventHandler to the viewer
 * canvas and drives the placement state machine on each globe click.
 *
 * Extending for new interaction modes: add cases to the phase switch below.
 */
export function GlobeClickHandler({ viewer }: Props) {
  const { phase, missileType, origin, setOrigin, setTarget, addAssetPlacement } = usePlacementStore();

  useEffect(() => {
    if (!viewer) return;
    if (phase !== 'placing_origin' && phase !== 'origin_set' && phase !== 'placing_asset') return;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

    handler.setInputAction(
      (event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const pos = pickGlobePosition(viewer, event.position);
        if (!pos) return;

        if (phase === 'placing_asset') {
          addAssetPlacement(pos);
          return;
        }

        if (phase === 'placing_origin') {
          setOrigin(pos);
          return;
        }

        if (phase === 'origin_set' && origin && missileType) {
          // Validate: click must be within reach radius
          const cfg = getMissileTypeConfig(missileType);
          const distM = haversineDistanceM(origin, pos);
          if (distM > cfg.maxRangeM) return; // outside radius — ignore silently
          if (distM < 50_000) return;        // too close — ignore (< 50 km)
          setTarget(pos);
        }
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK,
    );

    return () => handler.destroy();
  }, [viewer, phase, missileType, origin, setOrigin, setTarget, addAssetPlacement]);

  return null;
}
