import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { usePlacementStore } from '../../store/placementStore';
import { getMissileTypeConfig } from '../../config/missileTypes';
import { geoToCartesian, entityColor } from '../../utils/cesiumHelpers';

interface Props {
  viewer: Cesium.Viewer | null;
}

/**
 * Renders a translucent reach-radius ellipse on the globe surface centred on
 * the user's chosen origin point.  Clears itself when the origin is removed
 * or the placement is reset.
 *
 * To add visual variants (e.g. pulsing, sector arcs for directional weapons),
 * extend the entity options block below.
 */
export function ReachRadiusLayer({ viewer }: Props) {
  const ellipseRef    = useRef<Cesium.Entity | null>(null);
  const minCircleRef  = useRef<Cesium.Entity | null>(null);

  const { origin, missileType, phase } = usePlacementStore();

  useEffect(() => {
    // Clean up previous entities
    const cleanup = () => {
      if (viewer && !viewer.isDestroyed()) {
        if (ellipseRef.current)   viewer.entities.remove(ellipseRef.current);
        if (minCircleRef.current) viewer.entities.remove(minCircleRef.current);
      }
      ellipseRef.current   = null;
      minCircleRef.current = null;
    };

    if (!viewer || !origin || !missileType || phase === 'idle' || phase === 'simulating') {
      cleanup();
      return cleanup;
    }

    const cfg   = getMissileTypeConfig(missileType);
    const color = entityColor(missileType);
    const pos   = geoToCartesian({ ...origin, alt: 0 });

    // Outer reach radius
    ellipseRef.current = viewer.entities.add({
      id: 'reach_radius_outer',
      position: pos,
      ellipse: {
        semiMajorAxis: cfg.maxRangeM,
        semiMinorAxis: cfg.maxRangeM,
        material:     color.withAlpha(0.06),
        outline:      true,
        outlineColor: color.withAlpha(0.55),
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });

    // Inner exclusion ring (< 50 km not allowed)
    minCircleRef.current = viewer.entities.add({
      id: 'reach_radius_inner',
      position: pos,
      ellipse: {
        semiMajorAxis: 50_000,
        semiMinorAxis: 50_000,
        material:     Cesium.Color.WHITE.withAlpha(0.04),
        outline:      true,
        outlineColor: Cesium.Color.WHITE.withAlpha(0.25),
        outlineWidth: 1,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });

    return cleanup;
  }, [viewer, origin, missileType, phase]);

  return null;
}
