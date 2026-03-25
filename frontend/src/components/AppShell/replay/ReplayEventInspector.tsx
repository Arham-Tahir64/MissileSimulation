import { AlertRow } from '../../HUD/hudSelectors';
import { glassPanel, hudTheme, monoText, sectionTitle } from '../../HUD/hudTheme';
import { formatSimTime } from '../../../utils/timeUtils';
import { ReplayEventFilter } from './replayUtils';

const FILTERS: Array<{ value: ReplayEventFilter; label: string }> = [
  { value: 'all', label: 'ALL_EVENTS' },
  { value: 'sensor_track', label: 'TRACKS' },
  { value: 'engagement_order', label: 'ENGAGEMENTS' },
  { value: 'event_intercept', label: 'INTERCEPTS' },
];

export function ReplayEventInspector({
  alerts,
  activeFilter,
  currentTimeS,
  onChangeFilter,
  onSelectAlert,
}: {
  alerts: AlertRow[];
  activeFilter: ReplayEventFilter;
  currentTimeS: number;
  onChangeFilter: (filter: ReplayEventFilter) => void;
  onSelectAlert: (alert: AlertRow) => void;
}) {
  return (
    <section style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <div style={sectionTitle}>Replay Events</div>
          <div style={styles.headline}>{alerts.length} visible markers</div>
        </div>
        <div style={styles.nowChip}>T+ {formatSimTime(currentTimeS)}</div>
      </div>

      <div style={styles.filters}>
        {FILTERS.map((filter) => {
          const active = filter.value === activeFilter;
          return (
            <button
              key={filter.value}
              onClick={() => onChangeFilter(filter.value)}
              style={{
                ...styles.filterChip,
                borderColor: active ? hudTheme.cyan : hudTheme.lineSoft,
                color: active ? hudTheme.cyanSoft : hudTheme.muted,
                background: active ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.03)',
              }}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div style={styles.list}>
        {alerts.map((alert) => {
          const isFuture = alert.simTimeS > currentTimeS + 0.25;
          const isNearNow = Math.abs(alert.simTimeS - currentTimeS) <= 2;
          return (
            <button
              key={alert.id}
              onClick={() => onSelectAlert(alert)}
              style={{
                ...styles.row,
                borderColor: isNearNow ? hudTheme.cyan : 'rgba(255,255,255,0.03)',
                background: isNearNow ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.03)',
              }}
            >
              <div style={styles.rowTop}>
                <span style={{
                  ...styles.tone,
                  color:
                    alert.tone === 'cyan'
                      ? hudTheme.cyanSoft
                      : alert.tone === 'amber'
                        ? hudTheme.amberSoft
                        : hudTheme.redSoft,
                }}
                >
                  {alert.title}
                </span>
                <span style={styles.time}>{formatSimTime(alert.simTimeS)}</span>
              </div>
              <div style={styles.subtitle}>{alert.subtitle}</div>
              <div style={styles.meta}>{isFuture ? 'UPCOMING' : isNearNow ? 'AT_CURRENT_TIME' : 'PASSED_EVENT'}</div>
            </button>
          );
        })}
        {alerts.length === 0 && <div style={styles.empty}>No events match the current replay filter.</div>}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    ...glassPanel,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minHeight: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'start',
  },
  headline: {
    color: hudTheme.text,
    fontSize: 18,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    marginTop: 4,
  },
  nowChip: {
    ...monoText,
    border: `1px solid ${hudTheme.line}`,
    color: hudTheme.cyanSoft,
    padding: '8px 10px',
    fontSize: 11,
    letterSpacing: '0.14em',
  },
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    border: '1px solid',
    padding: '8px 10px',
    fontSize: 10,
    letterSpacing: '0.14em',
    background: 'none',
    cursor: 'pointer',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    overflowY: 'auto',
    minHeight: 0,
    paddingRight: 4,
  },
  row: {
    border: '1px solid',
    textAlign: 'left',
    color: hudTheme.text,
    padding: '11px 12px',
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.03)',
  },
  rowTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'baseline',
  },
  tone: {
    fontSize: 11,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    fontWeight: 700,
  },
  time: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 11,
  },
  subtitle: {
    color: hudTheme.text,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 1.45,
  },
  meta: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 10,
    marginTop: 8,
    letterSpacing: '0.12em',
  },
  empty: {
    color: hudTheme.muted,
    fontSize: 12,
    padding: '12px 0',
  },
};
