import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useSimulationStore } from '../../store/simulationStore';
import { isEngagementOrderEvent, isSensorTrackEvent } from '../../types/simulation';
import { geoToCartesian } from '../../utils/cesiumHelpers';

interface Props {
  viewer: Cesium.Viewer | null;
}

/** How long (ms) the tasking line remains visible before fading. */
const LINE_LIFE_MS   = 3_500;
/** How long (ms) the fade-out takes. */
const FADE_MS        = 800;

const TASKING_COLOR  = Cesium.Color.fromCssColorString('#00e5ff');
const RADAR_COLOR    = Cesium.Color.fromCssColorString('#ffd36b');

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

interface LineHandle {
  entity: Cesium.Entity;
  createdAt: number;  // performance.now() ms
  type: 'tasking' | 'radar';
}

/**
 * Draws temporary flash lines on the globe representing data-link connections:
 * - CYAN line: battery → interceptor launch point, fired on engagement_order events
 * - AMBER line: sensor → threat position, fired on sensor_track events
 * Both lines fade out over LINE_LIFE_MS milliseconds.
 */
export function TaskingLineLayer({ viewer }: Props) {
  const events     = useSimulationStore((s) => s.events);
  const entities   = useSimulationStore((s) => s.entities);
  const scenarioId = useSimulationStore((s) => s.scenarioId);
  const simTimeS   = useSimulationStore((s) => s.simTimeS);

  const linesRef     = useRef<Map<string, LineHandle>>(new Map());
  const prevEventLen = useRef<number>(0);
  const prevScenario = useRef<string | null>(null);
  const prevTimeRef  = useRef<number>(0);

  // ── Reset on rewind or scenario change ───────────────────────────────────
  useEffect(() => {
    const rewound  = simTimeS + 0.001 < prevTimeRef.current;
    const newScene = scenarioId !== prevScenario.current;
    prevTimeRef.current  = simTimeS;
    prevScenario.current = scenarioId;

    if (!viewer || (!rewound && !newScene)) return;

    for (const { entity } of linesRef.current.values()) {
      viewer.entities.remove(entity);
    }
    linesRef.current.clear();
    prevEventLen.current = 0;
  }, [viewer, simTimeS, scenarioId]);

  // ── Create lines for new events ───────────────────────────────────────────
  useEffect(() => {
    if (!viewer) return;
    if (events.length <= prevEventLen.current) return;

    const newEvents = events.slice(prevEventLen.current);
    prevEventLen.current = events.length;

    const entityMap = new Map(entities.map((e) => [e.id, e]));

    for (const event of newEvents) {
      if (isEngagementOrderEvent(event)) {
        // Cyan tasking line: battery → threat
        const battery = entityMap.get(event.battery_id);
        const threat  = event.position
          ? { position: event.position }
          : entityMap.get(event.threat_id);

        if (battery && threat) {
          const fromPos = geoToCartesian(battery.position);
          const toPos   = geoToCartesian(threat.position);
          const lineEntity = viewer.entities.add({
            id: `taskline_${event.event_id}`,
            polyline: {
              positions: new Cesium.ConstantProperty([fromPos, toPos]),
              width: 1.5,
              material: new Cesium.ColorMaterialProperty(
                new Cesium.ConstantProperty(TASKING_COLOR.withAlpha(0.9)),
              ),
              clampToGround: false,
            },
          });
          linesRef.current.set(event.event_id, {
            entity: lineEntity,
            createdAt: performance.now(),
            type: 'tasking',
          });
        }
      }

      if (isSensorTrackEvent(event)) {
        // Amber radar link: sensor → threat
        const sensor = entityMap.get(event.sensor_id);
        const threat = event.position
          ? { position: event.position }
          : entityMap.get(event.threat_id);

        if (sensor && threat) {
          const fromPos = geoToCartesian(sensor.position);
          const toPos   = geoToCartesian(threat.position);
          const lineEntity = viewer.entities.add({
            id: `radarline_${event.event_id}`,
            polyline: {
              positions: new Cesium.ConstantProperty([fromPos, toPos]),
              width: 1,
              material: new Cesium.ColorMaterialProperty(
                new Cesium.ConstantProperty(RADAR_COLOR.withAlpha(0.75)),
              ),
              clampToGround: false,
            },
          });
          linesRef.current.set(event.event_id, {
            entity: lineEntity,
            createdAt: performance.now(),
            type: 'radar',
          });
        }
      }
    }
  }, [viewer, events, entities]);

  // ── Fade/remove expired lines via preRender ───────────────────────────────
  useEffect(() => {
    if (!viewer) return;

    const listener = viewer.scene.preRender.addEventListener(() => {
      const now = performance.now();
      for (const [id, handle] of linesRef.current) {
        const age = now - handle.createdAt;

        if (age >= LINE_LIFE_MS) {
          viewer.entities.remove(handle.entity);
          linesRef.current.delete(id);
          continue;
        }

        // Fade out during the last FADE_MS
        const fadeStart = LINE_LIFE_MS - FADE_MS;
        if (age > fadeStart) {
          const fadeProgress = (age - fadeStart) / FADE_MS;
          const alpha        = 1 - fadeProgress;
          const color = handle.type === 'tasking'
            ? TASKING_COLOR.withAlpha(Math.max(0, alpha * 0.9))
            : RADAR_COLOR.withAlpha(Math.max(0, alpha * 0.75));

          if (handle.entity.polyline?.material) {
            (handle.entity.polyline.material as Cesium.ColorMaterialProperty).color =
              setConstantValue(
                (handle.entity.polyline.material as Cesium.ColorMaterialProperty).color,
                color,
              );
          }
        }
      }
    });

    return () => listener();
  }, [viewer]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (!viewer) return;
      for (const { entity } of linesRef.current.values()) {
        viewer.entities.remove(entity);
      }
      linesRef.current.clear();
    };
  }, [viewer]);

  return null;
}
