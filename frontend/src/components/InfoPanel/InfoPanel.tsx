import { useSimulationStore, ConnectionStatus } from '../../store/simulationStore';
import { EventLog } from './EventLog';
import { formatSimTime } from '../../utils/timeUtils';

const CONNECTION_COLORS: Record<ConnectionStatus, string> = {
  connected: '#68d391',
  disconnected: '#718096',
  reconnecting: '#f6ad55',
  error: '#fc8181',
};

export function InfoPanel() {
  const { entities, simTimeS, status, scenarioId, connectionStatus } = useSimulationStore();

  const activeEntities = entities.filter((e) => e.status === 'active');
  const interceptedCount = entities.filter((e) => e.status === 'intercepted').length;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <div style={styles.title}>Simulation</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <div style={styles.status}>{status.toUpperCase()}</div>
          <div style={{ ...styles.status, color: CONNECTION_COLORS[connectionStatus] }}>
            {connectionStatus === 'reconnecting' ? '↻ reconnecting' : connectionStatus}
          </div>
        </div>
      </div>

      {scenarioId && (
        <div style={styles.section}>
          <div style={styles.row}>
            <span style={styles.label}>Scenario</span>
            <span style={styles.value}>{scenarioId}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Time</span>
            <span style={styles.value}>{formatSimTime(simTimeS)}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Active entities</span>
            <span style={styles.value}>{activeEntities.length}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Intercepted</span>
            <span style={{ ...styles.value, color: '#68d391' }}>{interceptedCount}</span>
          </div>
        </div>
      )}

      <EventLog />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 240,
    background: 'rgba(10,10,20,0.9)',
    backdropFilter: 'blur(8px)',
    borderLeft: '1px solid rgba(255,255,255,0.07)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '14px 16px 10px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#e2e8f0',
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  status: {
    fontSize: 10,
    color: '#63b3ed',
    fontFamily: 'monospace',
    letterSpacing: '0.05em',
  },
  section: {
    padding: '10px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { color: '#718096', fontSize: 12 },
  value: { color: '#e2e8f0', fontSize: 12, fontFamily: 'monospace' },
};
