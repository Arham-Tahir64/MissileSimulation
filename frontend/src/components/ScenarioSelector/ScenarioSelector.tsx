import { useEffect, useState } from 'react';
import { useScenarioStore } from '../../store/scenarioStore';
import { usePlaybackStore } from '../../store/playbackStore';
import { fetchScenarios, fetchScenario } from '../../services/scenarioApi';
import { wsClient } from '../../services/wsClient';
import { getViewer } from '../../services/viewerRegistry';
import { flyToScenario } from '../../utils/cesiumHelpers';
import { ScenarioCard } from './ScenarioCard';

export function ScenarioSelector() {
  const { availableScenarios, setAvailableScenarios, setActiveScenario } = useScenarioStore();
  const setDuration = usePlaybackStore((s) => s.setDuration);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    fetchScenarios()
      .then((scenarios) => {
        setAvailableScenarios(scenarios);
        setListError(null);
      })
      .catch(() => setListError('Could not reach backend. Is it running?'))
      .finally(() => setLoadingList(false));
  }, [setAvailableScenarios]);

  const handleSelect = async (id: string) => {
    if (loadingId) return; // prevent double-tap
    setLoadingId(id);
    try {
      const definition = await fetchScenario(id);
      setActiveScenario(definition);
      setDuration(definition.metadata.duration_s);

      const viewer = getViewer();
      if (viewer) flyToScenario(viewer, definition);

      const sessionId = `session_${Date.now()}`;
      wsClient.connect(sessionId);
      wsClient.send({ type: 'cmd_load', scenario_id: id });
    } catch (err) {
      console.error('Failed to load scenario', err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div style={styles.panel}>
      <div style={styles.title}>Scenarios</div>
      <div style={styles.list}>
        {loadingList && <div style={styles.empty}>Loading…</div>}
        {listError && <div style={{ ...styles.empty, color: '#fc8181' }}>{listError}</div>}
        {!loadingList && !listError && availableScenarios.length === 0 && (
          <div style={styles.empty}>No scenarios found.</div>
        )}
        {availableScenarios.map((s) => (
          <div key={s.id} style={{ opacity: loadingId === s.id ? 0.5 : 1, transition: 'opacity 0.15s' }}>
            <ScenarioCard scenario={s} onSelect={handleSelect} />
          </div>
        ))}
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
