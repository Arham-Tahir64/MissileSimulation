import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { usePlacementStore } from '../../store/placementStore';
import { getMissileTypeConfig } from '../../config/missileTypes';
import { getDefenseAssetConfig } from '../../config/defenseAssets';
import {
  geoToCartesian,
  entityColor,
  computeBallisticArc,
  geoArrayToCartesian3Array,
  getMissileIcon,
} from '../../utils/cesiumHelpers';

interface Props {
  viewer: Cesium.Viewer | null;
}

const APOGEE_ALT = 300_000; // fictional, matches backend default
const ARC_SAMPLES = 80;

/**
 * Renders:
 *  - Origin pin (missile icon + "LAUNCH" label)
 *  - Target pin (crosshair point + "TARGET" label)
 *  - Live trajectory preview arc (ballistic arc or cruise line)
 *
 * All entities are cleared on phase reset or simulation start.
 */
export function PlacementMarkerLayer({ viewer }: Props) {
  const originRef = useRef<Cesium.Entity | null>(null);
  const targetRef = useRef<Cesium.Entity | null>(null);
  const arcRef    = useRef<Cesium.Entity | null>(null);
  const assetMapRef = useRef<Map<string, Cesium.Entity>>(new Map());

  const { origin, target, missileType, phase, placements } = usePlacementStore();

  const isVisible = phase !== 'idle' && phase !== 'simulating';

  // ── Origin marker ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!viewer) return;
    if (originRef.current) { viewer.entities.remove(originRef.current); originRef.current = null; }
    if (!origin || !missileType || !isVisible) return;

    const color = entityColor(missileType);
    originRef.current = viewer.entities.add({
      id: 'placement_origin',
      position: geoToCartesian({ ...origin, alt: 0 }),
      billboard: {
        image:       getMissileIcon(missileType),
        width:       16,
        height:      36,
        color,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text:         'LAUNCH',
        font:         'bold 11px monospace',
        fillColor:    color,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style:        Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset:  new Cesium.Cartesian2(0, -48),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    return () => {
      if (!viewer.isDestroyed() && originRef.current) {
        viewer.entities.remove(originRef.current); originRef.current = null;
      }
    };
  }, [viewer, origin, missileType, isVisible]);

  // ── Target marker ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!viewer) return;
    if (targetRef.current) { viewer.entities.remove(targetRef.current); targetRef.current = null; }
    if (!target || !missileType || !isVisible) return;

    const color = entityColor(missileType);
    targetRef.current = viewer.entities.add({
      id: 'placement_target',
      position: geoToCartesian({ ...target, alt: 0 }),
      point: {
        pixelSize:    14,
        color:        Cesium.Color.WHITE.withAlpha(0.9),
        outlineColor: color,
        outlineWidth: 3,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text:         'TARGET',
        font:         'bold 11px monospace',
        fillColor:    Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style:        Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset:  new Cesium.Cartesian2(0, -24),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    return () => {
      if (!viewer.isDestroyed() && targetRef.current) {
        viewer.entities.remove(targetRef.current); targetRef.current = null;
      }
    };
  }, [viewer, target, missileType, isVisible]);

  // ── Trajectory preview arc ─────────────────────────────────────────────
  useEffect(() => {
    if (!viewer) return;
    if (arcRef.current) { viewer.entities.remove(arcRef.current); arcRef.current = null; }
    if (!origin || !target || !missileType || !isVisible) return;

    const cfg   = getMissileTypeConfig(missileType);
    const color = entityColor(missileType);

    let positions: Cesium.Cartesian3[];
    if (cfg.trajectoryType === 'ballistic') {
      positions = geoArrayToCartesian3Array(
        computeBallisticArc(origin, target, APOGEE_ALT, ARC_SAMPLES),
      );
    } else {
      // Cruise: line at cruise altitude
      positions = [
        geoToCartesian({ ...origin, alt: cfg.apogeeAltM }),
        geoToCartesian({ ...target, alt: cfg.apogeeAltM }),
      ];
    }

    arcRef.current = viewer.entities.add({
      id: 'placement_arc',
      polyline: {
        positions,
        width: 2,
        material: new Cesium.PolylineDashMaterialProperty({
          color:      color.withAlpha(0.75),
          dashLength: 12,
        }),
        clampToGround: false,
      },
    });
    return () => {
      if (!viewer.isDestroyed() && arcRef.current) {
        viewer.entities.remove(arcRef.current); arcRef.current = null;
      }
    };
  }, [viewer, origin, target, missileType, isVisible]);

  // ── Queued defense asset markers ────────────────────────────────────────
  useEffect(() => {
    if (!viewer) return;

    const assetPlacements = placements.filter((placement) => placement.kind === 'asset');
    const seenIds = new Set<string>();

    for (const placement of assetPlacements) {
      seenIds.add(placement.id);
      const existing = assetMapRef.current.get(placement.id);
      const cfg = getDefenseAssetConfig(placement.assetId);
      const color = Cesium.Color.fromCssColorString(cfg.cssColor);
      const position = geoToCartesian(placement.position);

      if (existing) {
        existing.position = new Cesium.ConstantPositionProperty(position);
        continue;
      }

      const marker = viewer.entities.add({
        id: `placement_asset_${placement.id}`,
        position,
        point: {
          pixelSize: cfg.entityType === 'sensor' ? 12 : 14,
          color,
          outlineColor: Cesium.Color.WHITE.withAlpha(0.48),
          outlineWidth: cfg.entityType === 'sensor' ? 2 : 3,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: cfg.shortLabel,
          font: 'bold 11px monospace',
          fillColor: color,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -24),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });

      assetMapRef.current.set(placement.id, marker);
    }

    for (const [id, entity] of assetMapRef.current) {
      if (!seenIds.has(id)) {
        viewer.entities.remove(entity);
        assetMapRef.current.delete(id);
      }
    }

    return () => {
      if (!viewer.isDestroyed() && (phase === 'simulating' || phase === 'idle')) {
        for (const entity of assetMapRef.current.values()) viewer.entities.remove(entity);
        assetMapRef.current.clear();
      }
    };
  }, [viewer, placements, phase]);

  useEffect(() => {
    return () => {
      if (!viewer) return;
      for (const entity of assetMapRef.current.values()) viewer.entities.remove(entity);
      assetMapRef.current.clear();
    };
  }, [viewer]);

  return null;
}
