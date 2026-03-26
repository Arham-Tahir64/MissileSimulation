import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useSimulationStore } from '../../store/simulationStore';
import { isInterceptionEvent } from '../../types/simulation';
import { geoToCartesian } from '../../utils/cesiumHelpers';

interface Props {
  viewer: Cesium.Viewer | null;
}

interface BdaMarker {
  eventId: string;
  entity: Cesium.Entity;
}

const SUCCESS_COLOR = Cesium.Color.fromCssColorString('#00e5ff');
const MISS_COLOR    = Cesium.Color.fromCssColorString('#ff4b4b');

function buildMarkerCanvas(outcome: 'success' | 'miss'): HTMLCanvasElement {
  const SIZE = 28;
  const canvas = document.createElement('canvas');
  canvas.width  = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const color = outcome === 'success' ? '#00e5ff' : '#ff4b4b';
  const cx = SIZE / 2;

  ctx.strokeStyle = color;
  ctx.lineWidth   = 2.5;

  if (outcome === 'success') {
    // Crosshair / X mark — intercept confirmed
    ctx.beginPath();
    ctx.moveTo(4, 4); ctx.lineTo(SIZE - 4, SIZE - 4);
    ctx.moveTo(SIZE - 4, 4); ctx.lineTo(4, SIZE - 4);
    ctx.stroke();
    // Small circle in the center
    ctx.beginPath();
    ctx.arc(cx, cx, 5, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Simple X — miss
    ctx.beginPath();
    ctx.moveTo(5, 5); ctx.lineTo(SIZE - 5, SIZE - 5);
    ctx.moveTo(SIZE - 5, 5); ctx.lineTo(5, SIZE - 5);
    ctx.stroke();
  }

  return canvas;
}

const _canvasCache = new Map<string, HTMLCanvasElement>();
function getMarkerCanvas(outcome: 'success' | 'miss'): HTMLCanvasElement {
  if (!_canvasCache.has(outcome)) _canvasCache.set(outcome, buildMarkerCanvas(outcome));
  return _canvasCache.get(outcome)!;
}

/**
 * Leaves a persistent BDA (Battle Damage Assessment) marker at every intercept point.
 * Cyan crosshair = successful kill. Red X = miss.
 * Markers accumulate over the run, giving a globe-level scoreboard of where engagements occurred.
 */
export function BdaMarkerLayer({ viewer }: Props) {
  const events     = useSimulationStore((s) => s.events);
  const simTimeS   = useSimulationStore((s) => s.simTimeS);
  const scenarioId = useSimulationStore((s) => s.scenarioId);

  const markersRef    = useRef<Map<string, BdaMarker>>(new Map());
  const prevTimeRef   = useRef<number>(0);
  const prevScenario  = useRef<string | null>(null);

  // ── Reset on rewind or scenario change ───────────────────────────────────
  useEffect(() => {
    const rewound  = simTimeS + 0.001 < prevTimeRef.current;
    const newScene = scenarioId !== prevScenario.current;
    prevTimeRef.current  = simTimeS;
    prevScenario.current = scenarioId;

    if (!viewer || (!rewound && !newScene)) return;

    for (const { entity } of markersRef.current.values()) {
      viewer.entities.remove(entity);
    }
    markersRef.current.clear();
  }, [viewer, simTimeS, scenarioId]);

  // ── Place markers for new intercept events ────────────────────────────────
  useEffect(() => {
    if (!viewer) return;

    for (const event of events) {
      if (!isInterceptionEvent(event)) continue;
      if (markersRef.current.has(event.event_id)) continue;
      if (!event.position) continue;

      const outcome  = event.outcome;
      const color    = outcome === 'success' ? SUCCESS_COLOR : MISS_COLOR;
      const position = geoToCartesian(event.position);

      const entity = viewer.entities.add({
        id:       `bda_${event.event_id}`,
        position: new Cesium.ConstantPositionProperty(position),
        billboard: {
          image:  getMarkerCanvas(outcome),
          width:  28,
          height: 28,
          color:  color.withAlpha(0.88),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(8e5, 1.2, 6e6, 0.6),
        },
        label: {
          text:          outcome === 'success' ? 'KILL' : 'MISS',
          font:          '600 10px monospace',
          fillColor:     color,
          outlineColor:  Cesium.Color.BLACK,
          outlineWidth:  3,
          pixelOffset:   new Cesium.Cartesian2(0, -24),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(8e5, 1.0, 4e6, 0),
        },
      });

      markersRef.current.set(event.event_id, { eventId: event.event_id, entity });
    }
  }, [viewer, events]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (!viewer) return;
      for (const { entity } of markersRef.current.values()) {
        viewer.entities.remove(entity);
      }
      markersRef.current.clear();
    };
  }, [viewer]);

  return null;
}
