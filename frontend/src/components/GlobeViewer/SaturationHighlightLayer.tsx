import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useSimulationStore } from '../../store/simulationStore';
import { getDefenseAssetConfigByDesignator } from '../../config/defenseAssets';
import { geoToCartesian } from '../../utils/cesiumHelpers';

interface Props {
  viewer: Cesium.Viewer | null;
}

const PULSE_PERIOD_MS = 1400;
const RING_RADIUS_M   = 55_000;

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

interface RingHandle {
  entity: Cesium.Entity;
}

/**
 * When the defense network is saturated (more active threats than available battery
 * engagement slots), draws pulsing red rings around active threats that have no
 * interceptor currently assigned — making the coverage gap visually obvious.
 */
export function SaturationHighlightLayer({ viewer }: Props) {
  const entities   = useSimulationStore((s) => s.entities);
  const scenarioId = useSimulationStore((s) => s.scenarioId);
  const simTimeS   = useSimulationStore((s) => s.simTimeS);

  const ringsRef     = useRef<Map<string, RingHandle>>(new Map());
  const prevScenario = useRef<string | null>(null);
  const prevTimeRef  = useRef<number>(0);

  // ── Derive saturation inline ──────────────────────────────────────────────
  const threatTypes = new Set(['ballistic_threat', 'cruise_threat']);
  const activeThreatCount = entities.filter(
    (e) => threatTypes.has(e.type) && e.status === 'active',
  ).length;

  const batteryCapacity = entities
    .filter((e) => e.type === 'interceptor' && e.trajectory_type === 'stationary')
    .reduce((sum, e) => {
      if (e.asset_status === 'cooldown') return sum;
      const cfg = getDefenseAssetConfigByDesignator(e.designator);
      return sum + (cfg?.maxTracks ?? 0);
    }, 0);

  const saturated =
    activeThreatCount > 0 && batteryCapacity > 0 && activeThreatCount > batteryCapacity;

  // ── Reset on rewind or scenario change ───────────────────────────────────
  useEffect(() => {
    const rewound  = simTimeS + 0.001 < prevTimeRef.current;
    const newScene = scenarioId !== prevScenario.current;
    prevTimeRef.current  = simTimeS;
    prevScenario.current = scenarioId;

    if (!viewer || (!rewound && !newScene)) return;

    for (const { entity } of ringsRef.current.values()) {
      viewer.entities.remove(entity);
    }
    ringsRef.current.clear();
  }, [viewer, simTimeS, scenarioId]);

  // ── Create/update/remove rings based on saturation ────────────────────────
  useEffect(() => {
    if (!viewer) return;

    if (!saturated) {
      for (const { entity } of ringsRef.current.values()) {
        viewer.entities.remove(entity);
      }
      ringsRef.current.clear();
      return;
    }

    // Unengaged active threats (no interceptor currently assigned to them)
    const unengaged = entities.filter(
      (e) =>
        threatTypes.has(e.type) &&
        e.status === 'active' &&
        !e.current_target_id,
    );

    const liveIds = new Set(unengaged.map((e) => e.id));

    // Prune stale rings
    for (const [id, handle] of ringsRef.current) {
      if (!liveIds.has(id)) {
        viewer.entities.remove(handle.entity);
        ringsRef.current.delete(id);
      }
    }

    // Add/update rings
    for (const threat of unengaged) {
      const pos = geoToCartesian(threat.position);
      let handle = ringsRef.current.get(threat.id);

      if (!handle) {
        const cesiumEntity = viewer.entities.add({
          id: `satring_${threat.id}`,
          position: new Cesium.ConstantPositionProperty(pos),
          ellipse: {
            semiMajorAxis: RING_RADIUS_M,
            semiMinorAxis: RING_RADIUS_M,
            height: threat.position.alt,
            material: new Cesium.ColorMaterialProperty(
              new Cesium.ConstantProperty(Cesium.Color.TRANSPARENT),
            ),
            outline: true,
            outlineColor: new Cesium.ConstantProperty(
              Cesium.Color.fromCssColorString('#ff4b4b').withAlpha(0.8),
            ),
            outlineWidth: 2,
            fill: false,
          },
        });
        handle = { entity: cesiumEntity };
        ringsRef.current.set(threat.id, handle);
      } else {
        handle.entity.position = new Cesium.ConstantPositionProperty(pos);
        if (handle.entity.ellipse?.height) {
          handle.entity.ellipse.height = setConstantValue(
            handle.entity.ellipse.height,
            threat.position.alt,
          );
        }
      }
    }
  }, [viewer, saturated, entities]);

  // ── Pulse animation via preRender ─────────────────────────────────────────
  useEffect(() => {
    if (!viewer) return;

    const listener = viewer.scene.preRender.addEventListener(() => {
      const phase = (Date.now() % PULSE_PERIOD_MS) / PULSE_PERIOD_MS; // 0..1
      const alpha = 0.2 + 0.65 * (0.5 + 0.5 * Math.cos(phase * 2 * Math.PI));
      const color = Cesium.Color.fromCssColorString('#ff4b4b').withAlpha(alpha);

      for (const { entity } of ringsRef.current.values()) {
        if (entity.ellipse?.outlineColor) {
          setConstantValue(entity.ellipse.outlineColor, color);
        }
      }
    });

    return () => listener();
  }, [viewer]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (!viewer) return;
      for (const { entity } of ringsRef.current.values()) {
        viewer.entities.remove(entity);
      }
      ringsRef.current.clear();
    };
  }, [viewer]);

  return null;
}
