import { useSimulationStore } from '../../store/simulationStore';
import { formatSimTime } from '../../utils/timeUtils';

export function EventLog() {
  const events = useSimulationStore((s) => s.events);

  return (
    <div style={styles.container}>
      <div style={styles.title}>Event Log</div>
      <div style={styles.list}>
        {events.length === 0 && (
          <div style={styles.empty}>No events yet.</div>
        )}
        {[...events].reverse().map((ev) => (
          <div key={ev.event_id} style={styles.row}>
            <span style={styles.time}>{formatSimTime(ev.sim_time_s)}</span>
            <span style={{
              ...styles.outcome,
              color: ev.outcome === 'success' ? '#68d391' : '#fc8181',
            }}>
              {ev.outcome === 'success' ? '✓' : '✗'}
            </span>
            <span style={styles.label}>
              {ev.interceptor_id} → {ev.threat_id}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderTop: '1px solid rgba(255,255,255,0.07)',
  },
  title: {
    padding: '10px 16px 8px',
    color: '#e2e8f0',
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  list: {
    maxHeight: 160,
    overflowY: 'auto',
    padding: '0 12px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  empty: { color: '#4a5568', fontSize: 11 },
  row: { display: 'flex', alignItems: 'center', gap: 6 },
  time: { color: '#718096', fontFamily: 'monospace', fontSize: 11, minWidth: 40 },
  outcome: { fontSize: 12, minWidth: 14 },
  label: { color: '#a0aec0', fontSize: 11 },
};
