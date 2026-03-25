import { hudTheme, glassPanel, monoText } from '../HUD/hudTheme';
import { AlertRow, HudSnapshot } from '../HUD/hudSelectors';
import { formatSimTime } from '../../utils/timeUtils';

export function OverviewPage({
  snapshot,
  onGoToMonitor,
  onGoToReplay,
  onSelectAlert,
}: {
  snapshot: HudSnapshot;
  onGoToMonitor: () => void;
  onGoToReplay: () => void;
  onSelectAlert: (alert: AlertRow) => void;
}) {
  const topAlerts = snapshot.alerts.slice(0, 4);

  return (
    <div style={styles.layout}>
      <section style={styles.hero}>
        <div style={styles.eyebrow}>System Overview</div>
        <h1 style={styles.title}>Start from the scenario, not the noise.</h1>
        <p style={styles.copy}>
          Overview reduces the live surface to the few signals that matter first: scenario state,
          current load, and the alerts that deserve attention now.
        </p>
        <div style={styles.heroActions}>
          <button onClick={onGoToMonitor} style={styles.primaryButton}>OPEN_MONITOR</button>
          <button onClick={onGoToReplay} style={styles.secondaryButton}>OPEN_REPLAY</button>
        </div>
      </section>

      <section style={styles.summaryGrid}>
        <SummaryStat label="Active Tracks" value={`${snapshot.metrics.activeTracks}/${snapshot.metrics.totalTracks}`} tone={hudTheme.cyanSoft} />
        <SummaryStat label="Defense Assets" value={String(snapshot.metrics.totalAssets)} tone={hudTheme.amberSoft} />
        <SummaryStat label="Live Alerts" value={String(snapshot.metrics.activeAlerts)} tone={hudTheme.redSoft} />
        <SummaryStat label="Intercept Balance" value={`${snapshot.metrics.interceptSuccesses}:${snapshot.metrics.interceptMisses}`} tone={hudTheme.text} />
      </section>

      <section style={styles.lowerGrid}>
        <div style={styles.viewportCard}>
          <div style={styles.panelTitle}>Live Viewport</div>
          <div style={styles.viewportFrame}>
            <div style={styles.viewportScan} />
            <div style={styles.viewportLabel}>
              {snapshot.selection.entity
                ? `${snapshot.selection.title} // ${snapshot.selection.entity.status.toUpperCase()}`
                : 'No active selection'}
            </div>
          </div>
        </div>

        <div style={styles.alertCard}>
          <div style={styles.panelTitle}>Focused Alerts</div>
          <div style={styles.alertList}>
            {topAlerts.map((alert) => (
              <button key={alert.id} onClick={() => onSelectAlert(alert)} style={styles.alertRow}>
                <div style={styles.alertTop}>
                  <span style={{
                    ...styles.alertTitle,
                    color: alert.tone === 'cyan' ? hudTheme.cyanSoft : alert.tone === 'amber' ? hudTheme.amberSoft : hudTheme.redSoft,
                  }}
                  >
                    {alert.title}
                  </span>
                  <span style={styles.alertTime}>{formatSimTime(alert.simTimeS)}</span>
                </div>
                <div style={styles.alertSubtitle}>{alert.subtitle}</div>
              </button>
            ))}
            {topAlerts.length === 0 && <div style={styles.empty}>No runtime alerts available.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color: tone }}>{value}</div>
    </div>
  );
}

const panelBase: React.CSSProperties = {
  ...glassPanel,
  padding: 18,
  pointerEvents: 'auto',
};

const styles: Record<string, React.CSSProperties> = {
  layout: {
    position: 'absolute',
    inset: '96px 20px 24px 20px',
    display: 'grid',
    gridTemplateRows: 'auto auto minmax(0, 1fr)',
    gap: 18,
    pointerEvents: 'auto',
  },
  hero: {
    maxWidth: 620,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: '20px 4px',
    pointerEvents: 'auto',
  },
  eyebrow: {
    ...monoText,
    color: hudTheme.cyan,
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    fontSize: 11,
  },
  title: {
    margin: 0,
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 44,
    lineHeight: 1.02,
    maxWidth: 620,
  },
  copy: {
    color: hudTheme.muted,
    fontSize: 15,
    lineHeight: 1.7,
    maxWidth: 560,
    margin: 0,
  },
  heroActions: {
    display: 'flex',
    gap: 12,
    marginTop: 4,
  },
  primaryButton: {
    border: 'none',
    background: hudTheme.cyan,
    color: '#081016',
    padding: '12px 18px',
    letterSpacing: '0.16em',
    fontSize: 11,
    cursor: 'pointer',
  },
  secondaryButton: {
    border: `1px solid ${hudTheme.line}`,
    background: 'rgba(10,16,22,0.72)',
    color: hudTheme.text,
    padding: '12px 18px',
    letterSpacing: '0.16em',
    fontSize: 11,
    cursor: 'pointer',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 14,
    pointerEvents: 'auto',
  },
  statCard: {
    ...panelBase,
    minHeight: 102,
  },
  statLabel: {
    ...monoText,
    color: hudTheme.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    fontSize: 10,
  },
  statValue: {
    ...monoText,
    fontSize: 34,
    marginTop: 22,
  },
  lowerGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.9fr',
    gap: 18,
    minHeight: 0,
  },
  viewportCard: panelBase,
  panelTitle: {
    ...monoText,
    color: hudTheme.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    fontSize: 10,
  },
  viewportFrame: {
    position: 'relative',
    marginTop: 14,
    minHeight: 260,
    background: 'rgba(6,10,14,0.34)',
    overflow: 'hidden',
  },
  viewportScan: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(0,229,255,0.04), transparent 24%, transparent 74%, rgba(255,215,153,0.04))',
  },
  viewportLabel: {
    ...monoText,
    position: 'absolute',
    left: 16,
    bottom: 16,
    color: hudTheme.cyanSoft,
    letterSpacing: '0.1em',
    fontSize: 12,
  },
  alertCard: panelBase,
  alertList: {
    marginTop: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  alertRow: {
    border: 'none',
    background: 'rgba(255,255,255,0.03)',
    color: hudTheme.text,
    textAlign: 'left',
    padding: '12px 14px',
    cursor: 'pointer',
  },
  alertTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
  },
  alertTitle: {
    ...monoText,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    fontSize: 11,
  },
  alertTime: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 11,
  },
  alertSubtitle: {
    color: hudTheme.text,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 1.5,
  },
  empty: {
    color: hudTheme.muted,
    fontSize: 13,
  },
};
