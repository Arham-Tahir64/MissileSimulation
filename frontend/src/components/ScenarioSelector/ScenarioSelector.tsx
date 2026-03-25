import { useEffect } from 'react';
import { useScenarioStore } from '../../store/scenarioStore';
import { usePlaybackStore } from '../../store/playbackStore';
import { fetchScenarios, fetchScenario } from '../../services/scenarioApi';
import { wsClient } from '../../services/wsClient';
import { ScenarioCard } from './ScenarioCard';

export function ScenarioSelector() {
  const { availableScenarios, setAvailableScenarios, setActiveScenario } = useScenarioStore();
  const setDuration = usePlaybackStore((s) => s.setDuration);

  useEffect(() => {
    fetchScenarios()
      .then(setAvailableScenarios)
      .catch((err) => console.error('Failed to load scenarios', err));
  }, [setAvailableScenarios]);

  const handleSelect = async (id: string) => {
    try {
      const definition = await fetchScenario(id);
      setActiveScenario(definition);
      setDuration(definition.metadata.duration_s);

      // Generate a simple session ID and connect
      const sessionId = `session_${Date.now()}`;
      wsClient.connect(sessionId);
      wsClient.send({ type: 'cmd_load', scenario_id: id });
    } catch (err) {
      console.error('Failed to load scenario', err);
    }
  };

  return (
    <div style={styles.panel}>
      <div style={styles.title}>Scenarios</div>
      <div style={styles.list}>
        {availableScenarios.map((s) => (
          <ScenarioCard key={s.id} scenario={s} onSelect={handleSelect} />
        ))}
        {availableScenarios.length === 0 && (
          <div style={styles.empty}>No scenarios available.</div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 280,
    background: 'rgba(10,10,20,0.9)',
    backdropFilter: 'blur(8px)',
    borderRight: '1px solid rgba(255,255,255,0.07)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  title: {
    padding: '14px 16px 10px',
    color: '#e2e8f0',
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  empty: { color: '#4a5568', fontSize: 12, padding: '8px 0' },
};
