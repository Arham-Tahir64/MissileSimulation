import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useSimulationStore } from '../../store/simulationStore';
import { useScenarioStore } from '../../store/scenarioStore';

interface Props {
  viewer: Cesium.Viewer | null;
}

/** Semi-axes of the re-entry footprint ellipse (meters). */
const SEMI_MAJOR_M = 35_000; // along approach direction
const SEMI_MINOR_M = 18_000; // cross-track

const FILL_COLOR    = Cesium.Color.fromCssColorString('#ff4b4b').withAlpha(0.12);
const OUTLINE_COLOR = Cesium.Color.fromCssColorString('#ff4b4b').withAlpha(0.55);

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

interface FootprintHandle {
  entity: Cesium.Entity;
}

/**
 * Draws a projected impact footprint ellipse on the surface for each active
 * ballistic threat. The ellipse is oriented along the great-circle bearing from
 * the threat's current position toward its target, and is elongated in the
 * direction of flight to represent the dispersion pattern of a re-entry vehicle.
 *
 * Fades to semi-transparent when the threat is intercepted or destroyed.
 */
export function ReentryFootprintLayer({ viewer }: Props) {
  const entities      = useSimulationStore((s) => s.entities);
  const scenarioId    = useSimulationStore((s) => s.scenarioId);
  const simTimeS      = useSimulationStore((s) => s.simTimeS);
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  const footprintsRef = useRef<Map<string, FootprintHandle>>(new Map());
  const prevScenario  = useRef<string | null>(null);
  const prevTimeRef   = useRef<number>(0);

  // ── Reset on rewind or scenario change ───────────────────────────────────
  useEffect(() => {
    const rewound  = simTimeS + 0.001 < prevTimeRef.current;
    const newScene = scenarioId !== prevScenario.current;
    prevTimeRef.current  = simTimeS;
    prevScenario.current = scenarioId;

    if (!viewer || (!rewound && !newScene)) return;

    for (const { entity } of footprintsRef.current.values()) {
      viewer.entities.remove(entity);
    }
    footprintsRef.current.clear();
  }, [viewer, simTimeS, scenarioId]);

  // ── Build/update footprints ───────────────────────────────────────────────
  useEffect(() => {
    if (!viewer) return;

    const definitionMap = new Map(
      (activeScenario?.entities ?? []).map((e) => [e.id, e]),
    );

    const ballistics = entities.filter(
      (e) => e.type === 'ballistic_threat' && e.status !== 'inactive',
    );

    const liveIds = new Set(ballistics.map((e) => e.id));

    // Remove stale footprints
    for (const [id, handle] of footprintsRef.current) {
      if (!liveIds.has(id)) {
        viewer.entities.remove(handle.entity);
        footprintsRef.current.delete(id);
      }
    }

    for (const threat of ballistics) {
      const def = definitionMap.get(threat.id);
      const targetPos = def?.target ?? def?.waypoints?.[def.waypoints.length - 1] ?? null;
      if (!targetPos) continue;

      // Bearing from threat current pos → target (degrees clockwise from North)
      const dLon = targetPos.lon - threat.position.lon;
      const dLat = targetPos.lat - threat.position.lat;
      const bearingRad = Math.atan2(
        dLon * Math.cos((threat.position.lat * Math.PI) / 180),
        dLat,
      );

      const terminated =
        threat.status === 'intercepted' ||
        threat.status === 'destroyed'   ||
        threat.status === 'missed';

      const fillAlpha    = terminated ? 0.04 : 0.12;
      const outlineAlpha = terminated ? 0.18 : 0.55;

      let handle = footprintsRef.current.get(threat.id);

      if (!handle) {
        const surfacePos = Cesium.Cartesian3.fromDegrees(targetPos.lon, targetPos.lat, 0);
        const cesiumEntity = viewer.entities.add({
          id: `footprint_${threat.id}`,
          position: new Cesium.ConstantPositionProperty(surfacePos),
          ellipse: {
            semiMajorAxis: SEMI_MAJOR_M,
            semiMinorAxis: SEMI_MINOR_M,
            rotation: bearingRad,
            stRotation: bearingRad,
            material: new Cesium.ColorMaterialProperty(
              new Cesium.ConstantProperty(FILL_COLOR),
            ),
            outline: true,
            outlineColor: new Cesium.ConstantProperty(OUTLINE_COLOR),
            outlineWidth: 1.5,
            fill: true,
            height: 0,
          },
        });
        handle = { entity: cesiumEntity };
        footprintsRef.current.set(threat.id, handle);
      } else {
        // Update rotation and opacity as threat moves closer
        if (handle.entity.ellipse?.rotation) {
          handle.entity.ellipse.rotation = setConstantValue(
            handle.entity.ellipse.rotation,
            bearingRad,
          );
          handle.entity.ellipse.stRotation = setConstantValue(
            handle.entity.ellipse.stRotation,
            bearingRad,
          );
        }
        if (handle.entity.ellipse?.material) {
          (handle.entity.ellipse.material as Cesium.ColorMaterialProperty).color =
            setConstantValue(
              (handle.entity.ellipse.material as Cesium.ColorMaterialProperty).color,
              Cesium.Color.fromCssColorString('#ff4b4b').withAlpha(fillAlpha),
            );
        }
        if (handle.entity.ellipse?.outlineColor) {
          handle.entity.ellipse.outlineColor = setConstantValue(
            handle.entity.ellipse.outlineColor,
            Cesium.Color.fromCssColorString('#ff4b4b').withAlpha(outlineAlpha),
          );
        }
      }
    }
  }, [viewer, entities, activeScenario]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (!viewer) return;
      for (const { entity } of footprintsRef.current.values()) {
        viewer.entities.remove(entity);
      }
      footprintsRef.current.clear();
    };
  }, [viewer]);

  return null;
}
