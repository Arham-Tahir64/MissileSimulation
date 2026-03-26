import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useSimulationStore } from '../../store/simulationStore';
import { geoToCartesian } from '../../utils/cesiumHelpers';

interface Props {
  viewer: Cesium.Viewer | null;
}

const MOVING_TYPES = new Set(['ballistic_threat', 'cruise_threat', 'interceptor']);

let exhaustCanvas: HTMLCanvasElement | null = null;

function getExhaustCanvas(): HTMLCanvasElement {
  if (exhaustCanvas) return exhaustCanvas;

  exhaustCanvas = document.createElement('canvas');
  exhaustCanvas.width  = 48;
  exhaustCanvas.height = 96;
  const ctx = exhaustCanvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(24, 0, 24, 96);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.15, 'rgba(255,230,160,0.85)');
  grad.addColorStop(0.45, 'rgba(255,140,30,0.55)');
  grad.addColorStop(0.75, 'rgba(255,90,0,0.22)');
  grad.addColorStop(1,   'rgba(200,60,0,0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.bezierCurveTo(38, 20, 44, 50, 46, 96);
  ctx.lineTo(2, 96);
  ctx.bezierCurveTo(4, 50, 10, 20, 24, 0);
  ctx.closePath();
  ctx.fill();

  return exhaustCanvas;
}

function setPosition(
  property: Cesium.PositionProperty | undefined,
  value: Cesium.Cartesian3,
): Cesium.ConstantPositionProperty {
  if (property && 'setValue' in property && typeof property.setValue === 'function') {
    property.setValue(value);
    return property as Cesium.ConstantPositionProperty;
  }
  return new Cesium.ConstantPositionProperty(value);
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

interface ExhaustHandle {
  entity: Cesium.Entity;
}

/**
 * Renders small exhaust plume billboards behind every active missile in
 * tactical view. Unlike CinematicMissileLayer (which renders one high-fidelity
 * billboard for the followed entity), this layer shows lightweight sprites for
 * all active threats and interceptors simultaneously.
 */
export function MissileExhaustLayer({ viewer }: Props) {
  const entities   = useSimulationStore((s) => s.entities);
  const scenarioId = useSimulationStore((s) => s.scenarioId);
  const simTimeS   = useSimulationStore((s) => s.simTimeS);

  const exhaustsRef  = useRef<Map<string, ExhaustHandle>>(new Map());
  const prevScenario = useRef<string | null>(null);
  const prevTimeRef  = useRef<number>(0);

  // ── Reset on rewind or scenario change ───────────────────────────────────
  useEffect(() => {
    const rewound  = simTimeS + 0.001 < prevTimeRef.current;
    const newScene = scenarioId !== prevScenario.current;
    prevTimeRef.current  = simTimeS;
    prevScenario.current = scenarioId;

    if (!viewer || (!rewound && !newScene)) return;

    for (const { entity } of exhaustsRef.current.values()) {
      viewer.entities.remove(entity);
    }
    exhaustsRef.current.clear();
  }, [viewer, simTimeS, scenarioId]);

  // ── Create/update/remove exhaust billboards ───────────────────────────────
  useEffect(() => {
    if (!viewer) return;

    const liveIds = new Set(
      entities
        .filter((e) => MOVING_TYPES.has(e.type) && e.status === 'active')
        .map((e) => e.id),
    );

    // Remove stale exhausts
    for (const [id, handle] of exhaustsRef.current) {
      if (!liveIds.has(id)) {
        viewer.entities.remove(handle.entity);
        exhaustsRef.current.delete(id);
      }
    }

    for (const entity of entities) {
      if (!MOVING_TYPES.has(entity.type)) continue;
      if (entity.status !== 'active') continue;

      const pos     = geoToCartesian(entity.position);
      const rotation = -Cesium.Math.toRadians(entity.heading_deg ?? 0);
      // Scale plume size by velocity: faster = longer plume
      const scale    = Cesium.Math.clamp(0.6 + entity.velocity_ms / 3_000, 0.6, 2.2);
      const color    = entity.type === 'interceptor'
        ? Cesium.Color.fromCssColorString('#d0f4ff').withAlpha(0.88)
        : Cesium.Color.fromCssColorString('#ffcc80').withAlpha(0.78);

      let handle = exhaustsRef.current.get(entity.id);

      if (!handle) {
        const cesiumEntity = viewer.entities.add({
          id:       `exhaust_${entity.id}`,
          position: new Cesium.ConstantPositionProperty(pos),
          billboard: {
            image:    getExhaustCanvas(),
            width:    28,
            height:   56,
            color,
            alignedAxis:                Cesium.Cartesian3.UNIT_Z,
            rotation,
            scale,
            disableDepthTestDistance:   Number.POSITIVE_INFINITY,
            scaleByDistance:            new Cesium.NearFarScalar(1e5, 1.8, 3e6, 0.25),
            translucencyByDistance:     new Cesium.NearFarScalar(5e4, 1.0, 4e6, 0.0),
            pixelOffset:                new Cesium.Cartesian2(0, 18),
          },
        });
        handle = { entity: cesiumEntity };
        exhaustsRef.current.set(entity.id, handle);
      } else {
        handle.entity.position = setPosition(handle.entity.position, pos);
        handle.entity.billboard!.rotation = setConstantValue(
          handle.entity.billboard!.rotation, rotation,
        );
        handle.entity.billboard!.scale = setConstantValue(
          handle.entity.billboard!.scale, scale,
        );
        handle.entity.billboard!.color = setConstantValue(
          handle.entity.billboard!.color, color,
        );
      }
    }
  }, [viewer, entities]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (!viewer) return;
      for (const { entity } of exhaustsRef.current.values()) {
        viewer.entities.remove(entity);
      }
      exhaustsRef.current.clear();
    };
  }, [viewer]);

  return null;
}
