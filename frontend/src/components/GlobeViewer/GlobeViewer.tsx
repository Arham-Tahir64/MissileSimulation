import { useId } from 'react';
import { useViewer } from './useViewer';
import { EntityLayer } from './EntityLayer';
import { TrajectoryLayer } from './TrajectoryLayer';
import { useSimulationStore } from '../../store/simulationStore';
import { useScenarioStore } from '../../store/scenarioStore';

export function GlobeViewer() {
  // Stable, unique DOM ID for the Cesium container.
  // Prefixed so it's always a valid CSS identifier regardless of what useId returns.
  const rawId = useId();
  const containerId = `cesium-globe-${rawId.replace(/:/g, '')}`;

  // viewer is null until Cesium initialises (after first paint), then triggers
  // a re-render so EntityLayer / TrajectoryLayer receive the real instance.
  const viewer = useViewer(containerId);

  const entities = useSimulationStore((s) => s.entities);
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Container div must be in the DOM before useViewer's useEffect fires */}
      <div id={containerId} style={{ width: '100%', height: '100%' }} />

      <EntityLayer viewer={viewer} entities={entities} />

      {activeScenario && (
        <TrajectoryLayer viewer={viewer} entityDefinitions={activeScenario.entities} />
      )}
    </div>
  );
}
