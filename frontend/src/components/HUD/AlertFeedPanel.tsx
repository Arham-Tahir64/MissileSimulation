import { formatSimTime } from '../../utils/timeUtils';
import { AlertRow } from './hudSelectors';
import { glassPanel, hudTheme, sectionTitle } from './hudTheme';

export function AlertFeedPanel({
  alerts,
  onSelectAlert,
}: {
  alerts: AlertRow[];
  onSelectAlert: (alert: AlertRow) => void;
}) {
  return (
    <section style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <div style={sectionTitle}>Alert Feed</div>
          <div style={styles.headline}>{alerts.length} runtime events</div>
        </div>
      </div>

      <div style={styles.list}>
        {alerts.map((alert) => (
          <button
            key={alert.id}
            onClick={() => onSelectAlert(alert)}
            style={styles.row}
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
          </button>
        ))}
        {alerts.length === 0 && <div style={styles.empty}>No alerts at the current replay position.</div>}
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
  },
  headline: {
    color: hudTheme.text,
    fontSize: 18,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    marginTop: 4,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    overflowY: 'auto',
    minHeight: 0,
  },
  row: {
    border: 'none',
    textAlign: 'left',
    background: 'rgba(255,255,255,0.03)',
    color: hudTheme.text,
    padding: '11px 12px',
    cursor: 'pointer',
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
    color: hudTheme.muted,
    fontSize: 11,
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
  },
  subtitle: {
    color: hudTheme.text,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 1.45,
  },
  empty: {
    color: hudTheme.muted,
    fontSize: 12,
    padding: '12px 0',
  },
};
