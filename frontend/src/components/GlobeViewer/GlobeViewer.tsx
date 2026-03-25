import { useId } from 'react';
import { useViewer } from './useViewer';
import { EntityLayer } from './EntityLayer';
import { TrajectoryLayer } from './TrajectoryLayer';
import { GlobeClickHandler } from './GlobeClickHandler';
import { ReachRadiusLayer } from './ReachRadiusLayer';
import { PlacementMarkerLayer } from './PlacementMarkerLayer';
import { CinematicCameraController } from './CinematicCameraController';
import { CinematicMissileLayer } from './CinematicMissileLayer';
import { ImpactEffectsLayer } from './ImpactEffectsLayer';
import { useSimulationStore } from '../../store/simulationStore';
import { useScenarioStore } from '../../store/scenarioStore';

export function GlobeViewer() {
  const rawId = useId();
  const containerId = `cesium-globe-${rawId.replace(/:/g, '')}`;

  const viewer = useViewer(containerId);

  const entities       = useSimulationStore((s) => s.entities);
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  return (
    // Fill whatever container GlobeViewer is placed in
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div id={containerId} style={{ width: '100%', height: '100%' }} />

      {/* ── Simulation layers ──────────────────────────────────────── */}
      <CinematicCameraController viewer={viewer} />
      <EntityLayer viewer={viewer} entities={entities} entityDefinitions={activeScenario?.entities ?? []} />
      <CinematicMissileLayer viewer={viewer} />
      <ImpactEffectsLayer viewer={viewer} />
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
