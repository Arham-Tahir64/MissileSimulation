import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useSimulationStore } from '../../store/simulationStore';
import { getDefenseAssetConfigByDesignator } from '../../config/defenseAssets';

interface Props {
  viewer: Cesium.Viewer | null;
}

const PULSE_PERIOD_MS = 2200;
const INNER_COLOR     = Cesium.Color.fromCssColorString('#ce93d8').withAlpha(0.06);
const OUTER_COLOR     = Cesium.Color.fromCssColorString('#9c27b0').withAlpha(0.22);

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

interface ZoneHandle {
  fill: Cesium.Entity;
  ring: Cesium.Entity;
}

/**
 * Draws a pulsing translucent interference dome for every ECM_JAMMER asset.
 * Two overlaid ellipses create a filled zone + animated outer ring effect.
 */
export function JammingZoneLayer({ viewer }: Props) {
  const entities   = useSimulationStore((s) => s.entities);
  const scenarioId = useSimulationStore((s) => s.scenarioId);
  const simTimeS   = useSimulationStore((s) => s.simTimeS);

  const zonesRef     = useRef<Map<string, ZoneHandle>>(new Map());
  const prevScenario = useRef<string | null>(null);
  const prevTimeRef  = useRef<number>(0);

  // ── Reset on rewind or scenario change ───────────────────────────────────
  useEffect(() => {
    const rewound  = simTimeS + 0.001 < prevTimeRef.current;
    const newScene = scenarioId !== prevScenario.current;
    prevTimeRef.current  = simTimeS;
    prevScenario.current = scenarioId;

    if (!viewer || (!rewound && !newScene)) return;

    for (const { fill, ring } of zonesRef.current.values()) {
      viewer.entities.remove(fill);
      viewer.entities.remove(ring);
    }
    zonesRef.current.clear();
  }, [viewer, simTimeS, scenarioId]);

  // ── Create/update jamming zones ───────────────────────────────────────────
  useEffect(() => {
    if (!viewer) return;

    const jammers = entities.filter((e) => {
      const cfg = getDefenseAssetConfigByDesignator(e.designator);
      return cfg?.id === 'ecm_jammer';
    });

    const liveIds = new Set(jammers.map((e) => e.id));

    for (const [id, { fill, ring }] of zonesRef.current) {
      if (!liveIds.has(id)) {
        viewer.entities.remove(fill);
        viewer.entities.remove(ring);
        zonesRef.current.delete(id);
      }
    }

    for (const jammer of jammers) {
      const cfg     = getDefenseAssetConfigByDesignator(jammer.designator);
      const radiusM = cfg?.detectionRadiusM ?? 600_000;
      const pos     = Cesium.Cartesian3.fromDegrees(jammer.position.lon, jammer.position.lat, 0);

      if (!zonesRef.current.has(jammer.id)) {
        const fill = viewer.entities.add({
          id: `ecm_fill_${jammer.id}`,
          position: new Cesium.ConstantPositionProperty(pos),
          ellipse: {
            semiMajorAxis: radiusM,
            semiMinorAxis: radiusM,
            material: new Cesium.ColorMaterialProperty(
              new Cesium.ConstantProperty(INNER_COLOR),
            ),
            outline: false,
            fill: true,
            height: 0,
          },
        });

        const ring = viewer.entities.add({
          id: `ecm_ring_${jammer.id}`,
          position: new Cesium.ConstantPositionProperty(pos),
          ellipse: {
            semiMajorAxis: radiusM,
            semiMinorAxis: radiusM,
            material: new Cesium.ColorMaterialProperty(
              new Cesium.ConstantProperty(OUTER_COLOR),
            ),
            outline: true,
            outlineColor: new Cesium.ConstantProperty(
              Cesium.Color.fromCssColorString('#ce93d8').withAlpha(0.55),
            ),
            outlineWidth: 1.5,
            fill: false,
            height: 0,
          },
        });

        zonesRef.current.set(jammer.id, { fill, ring });
      }
    }
  }, [viewer, entities]);

  // ── Pulse animation via preRender ─────────────────────────────────────────
  useEffect(() => {
    if (!viewer) return;

    const listener = viewer.scene.preRender.addEventListener(() => {
      const phase   = (Date.now() % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
      const pulse   = 0.5 + 0.5 * Math.sin(phase * 2 * Math.PI);
      const outlineA = 0.28 + 0.38 * pulse;
      const fillA    = 0.04 + 0.06 * pulse;

      for (const { fill, ring } of zonesRef.current.values()) {
        if (fill.ellipse?.material) {
          (fill.ellipse.material as Cesium.ColorMaterialProperty).color = setConstantValue(
            (fill.ellipse.material as Cesium.ColorMaterialProperty).color,
            Cesium.Color.fromCssColorString('#ce93d8').withAlpha(fillA),
          );
        }
        if (ring.ellipse?.outlineColor) {
          ring.ellipse.outlineColor = setConstantValue(
            ring.ellipse.outlineColor,
            Cesium.Color.fromCssColorString('#ce93d8').withAlpha(outlineA),
          );
        }
      }
    });

    return () => listener();
  }, [viewer]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (!viewer) return;
      for (const { fill, ring } of zonesRef.current.values()) {
        viewer.entities.remove(fill);
        viewer.entities.remove(ring);
      }
      zonesRef.current.clear();
    };
  }, [viewer]);

  return null;
}
