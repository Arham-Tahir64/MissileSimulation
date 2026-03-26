import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useSimulationStore } from '../../store/simulationStore';
import { geoToCartesian } from '../../utils/cesiumHelpers';
import { getDefenseAssetConfigByDesignator } from '../../config/defenseAssets';

interface Props {
  viewer: Cesium.Viewer | null;
}

/** Sweep speed in radians per second — EWR sweeps slower, tracking radar faster. */
const EWR_SPEED_RPS  = (2 * Math.PI) / 6;   // 1 revolution per 6 s
const TRK_SPEED_RPS  = (2 * Math.PI) / 3;   // 1 revolution per 3 s
const SWEEP_ARC_RAD  = Cesium.Math.toRadians(18); // angular width of the sweep wedge
const SWEEP_SAMPLES  = 32;                         // polygon fan resolution
const EWR_COLOR      = Cesium.Color.fromCssColorString('#ffe082').withAlpha(0.28);
const TRK_COLOR      = Cesium.Color.fromCssColorString('#ffd36b').withAlpha(0.22);

interface SweepHandle {
  entity:    Cesium.Entity;
  center:    Cesium.Cartesian3;
  radiusM:   number;
  angleRad:  number;  // current heading in radians (globe surface)
  speedRps:  number;
  color:     Cesium.Color;
}

function buildSweepPositions(
  center: Cesium.Cartesian3,
  radiusM: number,
  headingRad: number,
  arcRad: number,
  samples: number,
): Cesium.Cartesian3[] {
  const enuToEcef = Cesium.Transforms.eastNorthUpToFixedFrame(center);
  const positions: Cesium.Cartesian3[] = [center];

  for (let i = 0; i <= samples; i++) {
    const angle = headingRad - arcRad / 2 + (arcRad * i) / samples;
    // ENU direction: east=cos(angle), north=sin(angle)
    const enu = new Cesium.Cartesian3(
      Math.cos(angle) * radiusM,
      Math.sin(angle) * radiusM,
      0,
    );
    const ecef = Cesium.Matrix4.multiplyByPoint(enuToEcef, enu, new Cesium.Cartesian3());
    positions.push(ecef);
  }
  positions.push(center);
  return positions;
}

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

/**
 * Animates a rotating radar sweep wedge for every sensor entity (EWR / Tracking Radar).
 * The wedge is a filled polygon fan that rotates continuously when the simulation is running.
 * EWR: amber, slow rotation (6 s/rev). Tracking radar: yellow, fast rotation (3 s/rev).
 */
export function RadarSweepLayer({ viewer }: Props) {
  const entities   = useSimulationStore((s) => s.entities);
  const status     = useSimulationStore((s) => s.status);
  const scenarioId = useSimulationStore((s) => s.scenarioId);

  const sweepsRef    = useRef<Map<string, SweepHandle>>(new Map());
  const lastTickRef  = useRef<number>(performance.now());
  const prevScenario = useRef<string | null>(null);

  // ── Setup: register preRender tick to animate sweeps ─────────────────────
  useEffect(() => {
    if (!viewer) return;

    const onTick = () => {
      const now     = performance.now();
      const deltaS  = Math.min((now - lastTickRef.current) / 1000, 0.1);
      lastTickRef.current = now;

      const simRunning = status === 'running';

      for (const sweep of sweepsRef.current.values()) {
        if (simRunning) {
          sweep.angleRad = (sweep.angleRad + sweep.speedRps * deltaS) % (2 * Math.PI);
        }
        const positions = buildSweepPositions(
          sweep.center,
          sweep.radiusM,
          sweep.angleRad,
          SWEEP_ARC_RAD,
          SWEEP_SAMPLES,
        );
        sweep.entity.polygon!.hierarchy = setConstantValue(
          sweep.entity.polygon!.hierarchy,
          new Cesium.PolygonHierarchy(positions),
        );
      }
    };

    viewer.scene.preRender.addEventListener(onTick);
    return () => { viewer.scene.preRender.removeEventListener(onTick); };
  }, [viewer, status]);

  // ── Create/remove sweep entities as sensor entities appear/disappear ──────
  useEffect(() => {
    if (!viewer) return;

    // Clean up scenario change
    if (scenarioId !== prevScenario.current) {
      for (const { entity } of sweepsRef.current.values()) {
        viewer.entities.remove(entity);
      }
      sweepsRef.current.clear();
      prevScenario.current = scenarioId;
    }

    const liveIds = new Set(entities.map((e) => e.id));

    // Remove sweeps for gone entities
    for (const [id, sweep] of sweepsRef.current) {
      if (!liveIds.has(id)) {
        viewer.entities.remove(sweep.entity);
        sweepsRef.current.delete(id);
      }
    }

    // Create sweeps for new sensors
    for (const entity of entities) {
      if (entity.type !== 'sensor') continue;
      if (sweepsRef.current.has(entity.id)) continue;

      const cfg = getDefenseAssetConfigByDesignator(entity.designator);
      const radiusM = cfg?.detectionRadiusM;
      if (!radiusM) continue;

      const isEwr   = entity.designator?.startsWith('EWR') ?? false;
      const color   = isEwr ? EWR_COLOR : TRK_COLOR;
      const speedRps = isEwr ? EWR_SPEED_RPS : TRK_SPEED_RPS;
      const center  = geoToCartesian(entity.position);

      const startAngle = Math.random() * 2 * Math.PI;
      const initPositions = buildSweepPositions(center, radiusM, startAngle, SWEEP_ARC_RAD, SWEEP_SAMPLES);

      const cesiumEntity = viewer.entities.add({
        id: `sweep_${entity.id}`,
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(initPositions),
          material:  new Cesium.ColorMaterialProperty(new Cesium.ConstantProperty(color)),
          perPositionHeight: true,
          outline:   false,
        },
      });

      sweepsRef.current.set(entity.id, {
        entity:    cesiumEntity,
        center,
        radiusM,
        angleRad:  startAngle,
        speedRps,
        color,
      });
    }
  }, [viewer, entities, scenarioId]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (!viewer) return;
      for (const { entity } of sweepsRef.current.values()) {
        viewer.entities.remove(entity);
      }
      sweepsRef.current.clear();
    };
  }, [viewer]);

  return null;
}
