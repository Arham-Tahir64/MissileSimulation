import { useSimulationStore } from '../../store/simulationStore';
import { formatRuntimeEventLabel, isInterceptionEvent } from '../../types/simulation';
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
              color:
                ev.type === 'sensor_track'
                  ? '#f6e27a'
                  : ev.type === 'engagement_order'
                    ? '#67d4ff'
                    : ev.outcome === 'success'
                      ? '#68d391'
                      : '#fc8181',
            }}>
              {ev.type === 'sensor_track'
                ? '◉'
                : ev.type === 'engagement_order'
                  ? '↗'
                  : ev.outcome === 'success'
                    ? '✓'
                    : '✗'}
            </span>
            <span style={styles.label}>{formatRuntimeEventLabel(ev)}</span>
            {isInterceptionEvent(ev) && (
              <span style={styles.positionHint}>
                {ev.position.lat.toFixed(2)}, {ev.position.lon.toFixed(2)}
              </span>
            )}
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
  positionHint: { color: '#5e7380', fontSize: 10, fontFamily: 'monospace' },
};
