import { useId, useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useViewer } from './useViewer';
import { EntityLayer } from './EntityLayer';
import { TrajectoryLayer } from './TrajectoryLayer';
import { GlobeClickHandler } from './GlobeClickHandler';
import { ReachRadiusLayer } from './ReachRadiusLayer';
import { PlacementMarkerLayer } from './PlacementMarkerLayer';
import { useSimulationStore } from '../../store/simulationStore';
import { useScenarioStore } from '../../store/scenarioStore';
import { geoToCartesian } from '../../utils/cesiumHelpers';

export function GlobeViewer() {
  const rawId = useId();
  const containerId = `cesium-globe-${rawId.replace(/:/g, '')}`;

  const viewer = useViewer(containerId);

  const entities       = useSimulationStore((s) => s.entities);
  const events         = useSimulationStore((s) => s.events);
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  const processedEventsRef = useRef<Set<string>>(new Set());

  // ── Intercept burst effect ───────────────────────────────────────────────
  useEffect(() => {
    if (!viewer) return;
    for (const evt of events) {
      if (processedEventsRef.current.has(evt.event_id)) continue;
      processedEventsRef.current.add(evt.event_id);

      const pos = geoToCartesian(evt.position);
      const ring = viewer.entities.add({
        position: pos,
        point: {
          pixelSize:    44,
          color:        Cesium.Color.ORANGE.withAlpha(0.35),
          outlineColor: Cesium.Color.YELLOW.withAlpha(0.9),
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      const core = viewer.entities.add({
        position: pos,
        point: {
          pixelSize:    18,
          color:        Cesium.Color.WHITE.withAlpha(0.95),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      setTimeout(() => {
        if (!viewer.isDestroyed()) {
          viewer.entities.remove(ring);
          viewer.entities.remove(core);
        }
      }, 1500);
    }
  }, [viewer, events]);

  return (
    // Fill whatever container GlobeViewer is placed in
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div id={containerId} style={{ width: '100%', height: '100%' }} />

      {/* ── Simulation layers ──────────────────────────────────────── */}
      <EntityLayer viewer={viewer} entities={entities} />
      {activeScenario && (
        <TrajectoryLayer
          viewer={viewer}
          entityDefinitions={activeScenario.entities}
          entities={entities}
        />
      )}

      {/* ── Interactive placement layers ───────────────────────────── */}
      <GlobeClickHandler viewer={viewer} />
      <ReachRadiusLayer viewer={viewer} />
      <PlacementMarkerLayer viewer={viewer} />
    </div>
  );
}
