import { useEffect, useMemo, useState } from 'react';
import { useScenarioStore } from '../../store/scenarioStore';
import { usePlaybackStore } from '../../store/playbackStore';
import { fetchScenarios, fetchScenario } from '../../services/scenarioApi';
import { wsClient } from '../../services/wsClient';
import { getViewer } from '../../services/viewerRegistry';
import { flyToScenario } from '../../utils/cesiumHelpers';
import { glassPanel, hudTheme, monoText, sectionTitle } from '../HUD/hudTheme';
import { ScenarioCard } from './ScenarioCard';

export function ScenarioSelector({
  variant = 'panel',
}: {
  variant?: 'panel' | 'overview';
}) {
  const { availableScenarios, activeScenario, setAvailableScenarios, setActiveScenario } = useScenarioStore();
  const setDuration = usePlaybackStore((state) => state.setDuration);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchScenarios()
      .then((scenarios) => {
        if (!active) return;
        setAvailableScenarios(scenarios);
        setListError(null);
      })
      .catch(() => {
        if (!active) return;
        setListError('Could not reach the scenario service. Library loading is offline, but the custom builder remains available from idle mode.');
      })
      .finally(() => {
        if (active) setLoadingList(false);
      });

    return () => {
      active = false;
    };
  }, [setAvailableScenarios]);

  const totalThreats = useMemo(
    () => availableScenarios.reduce((sum, scenario) => sum + scenario.threat_count, 0),
    [availableScenarios],
  );
  const totalInterceptors = useMemo(
    () => availableScenarios.reduce((sum, scenario) => sum + scenario.interceptor_count, 0),
    [availableScenarios],
  );

  const handleSelect = async (id: string) => {
    if (loadingId) return;
    setLoadingId(id);

    try {
      const definition = await fetchScenario(id);
      setActiveScenario(definition);
      setDuration(definition.metadata.duration_s);

      const viewer = getViewer();
      if (viewer) {
        flyToScenario(viewer, definition);
      }

      const sessionId = `session_${Date.now()}`;
      wsClient.connect(sessionId);
      wsClient.send({ type: 'cmd_load', scenario_id: id });
    } catch (error) {
      console.error('Failed to load scenario', error);
      setListError('Scenario load failed. Check backend availability and try again.');
    } finally {
      setLoadingId(null);
    }
  };

  const overview = variant === 'overview';

  return (
    <section
      style={{
        ...styles.panel,
        ...(overview ? styles.panelOverview : styles.panelSidebar),
      }}
    >
      <div style={styles.header}>
        <div>
          <div style={sectionTitle}>Scenario Library</div>
          <div style={styles.title}>{overview ? 'Load A Ready-Made Run' : 'Scenarios'}</div>
        </div>
        <div style={styles.headerMeta}>
          <span>{availableScenarios.length} RUNS</span>
          <span>{totalThreats} THREATS</span>
          <span>{totalInterceptors} INTERCEPTORS</span>
        </div>
      </div>

      <div style={styles.copy}>
        Library runs are precomposed fictional scenarios. Loading one will stage the scene on the globe and replace the current active definition.
      </div>

      {loadingList && <div style={styles.loading}>Loading scenario library…</div>}
      {!loadingList && listError && <div style={styles.error}>{listError}</div>}

      {!loadingList && !listError && availableScenarios.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyTitle}>No Predefined Runs</div>
          <div style={styles.emptyCopy}>
            The backend is online but no scenario definitions were returned. You can still create a custom fictional run from the globe builder once the session returns to idle mode.
          </div>
        </div>
      )}

      {!loadingList && !listError && availableScenarios.length > 0 && (
        <div
          style={{
            ...styles.list,
            ...(overview ? styles.listOverview : styles.listSidebar),
          }}
        >
          {availableScenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              selected={activeScenario?.metadata.id === scenario.id}
              loading={loadingId === scenario.id}
              onSelect={handleSelect}
              variant={variant}
            />
          ))}
        </div>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minHeight: 0,
  },
  panelSidebar: {
    width: 280,
    background: 'rgba(10,10,20,0.9)',
    backdropFilter: 'blur(8px)',
    borderRight: '1px solid rgba(255,255,255,0.07)',
    overflow: 'hidden',
    padding: '14px 16px',
  },
  panelOverview: {
    minHeight: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  title: {
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 22,
    lineHeight: 1.05,
    marginTop: 4,
  },
  headerMeta: {
    ...monoText,
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    color: hudTheme.muted,
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },
  copy: {
    color: hudTheme.muted,
    fontSize: 13,
    lineHeight: 1.65,
    maxWidth: 760,
  },
  loading: {
    ...glassPanel,
    padding: '16px 18px',
    color: hudTheme.muted,
    fontSize: 13,
  },
  error: {
    ...glassPanel,
    padding: '16px 18px',
    color: hudTheme.redSoft,
    fontSize: 13,
    lineHeight: 1.6,
  },
  emptyState: {
    ...glassPanel,
    padding: '16px 18px',
  },
  emptyTitle: {
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 20,
  },
  emptyCopy: {
    color: hudTheme.muted,
    fontSize: 13,
    lineHeight: 1.6,
    marginTop: 8,
    maxWidth: 560,
  },
  list: {
    minHeight: 0,
    overflowY: 'auto',
  },
  listSidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  listOverview: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
    alignContent: 'start',
    paddingRight: 4,
  },
};
