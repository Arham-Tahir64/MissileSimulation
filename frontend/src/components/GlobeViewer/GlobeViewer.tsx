import { useId } from 'react';
import { useViewer } from './useViewer';
import { EntityLayer } from './EntityLayer';
import { TrajectoryLayer } from './TrajectoryLayer';
import { useSimulationStore } from '../../store/simulationStore';
import { useScenarioStore } from '../../store/scenarioStore';

export function GlobeViewer() {
  const containerId = useId().replace(/:/g, '');
  const viewerRef = useViewer(containerId);

  const entities = useSimulationStore((s) => s.entities);
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        id={containerId}
        style={{ width: '100%', height: '100%' }}
      />
      <EntityLayer
        viewer={viewerRef.current}
        entities={entities}
      />
      {activeScenario && (
        <TrajectoryLayer
          viewer={viewerRef.current}
          entityDefinitions={activeScenario.entities}
        />
      )}
    </div>
  );
}
