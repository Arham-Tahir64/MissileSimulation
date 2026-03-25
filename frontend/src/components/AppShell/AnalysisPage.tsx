import { HudSnapshot } from '../HUD/hudSelectors';
import { glassPanel, hudTheme, monoText } from '../HUD/hudTheme';

export function AnalysisPage({ snapshot }: { snapshot: HudSnapshot }) {
  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div style={styles.title}>Analysis</div>
        <div style={styles.copy}>
          Analysis is calmer and report-like. Live motion fades into the background so outcome patterns and system activity are easier to read.
        </div>
      </div>

      <div style={styles.grid}>
        <section style={styles.card}>
          <div style={styles.cardTitle}>Outcome Summary</div>
          <div style={styles.kpiGrid}>
            <Kpi label="Completed Tracks" value={String(snapshot.metrics.completedTracks)} tone={hudTheme.cyanSoft} />
            <Kpi label="Intercept Success" value={String(snapshot.metrics.interceptSuccesses)} tone={hudTheme.cyanSoft} />
            <Kpi label="Intercept Miss" value={String(snapshot.metrics.interceptMisses)} tone={hudTheme.redSoft} />
            <Kpi label="Live Alerts Logged" value={String(snapshot.metrics.activeAlerts)} tone={hudTheme.amberSoft} />
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.cardTitle}>Track Outcomes</div>
          <div style={styles.table}>
            {snapshot.tracks.map((track) => (
              <div key={track.id} style={styles.tableRow}>
                <span style={styles.name}>{track.name}</span>
                <span style={styles.meta}>{track.label}</span>
                <span style={styles.meta}>{track.status.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.cardTitle}>Asset Activity</div>
          <div style={styles.table}>
            {snapshot.defenseAssets.map((asset) => (
              <div key={asset.id} style={styles.tableRow}>
                <span style={styles.name}>{asset.name}</span>
                <span style={styles.meta}>{asset.role.toUpperCase()}</span>
                <span style={styles.meta}>{asset.readiness}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.cardTitle}>Event Distribution</div>
          <div style={styles.chart}>
            {snapshot.alerts.slice(0, 10).reverse().map((alert, index) => (
              <div key={alert.id} style={styles.barRow}>
                <span style={styles.barLabel}>{alert.title}</span>
                <div style={styles.barTrack}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${Math.max(18, 24 + index * 7)}%`,
                      background: alert.tone === 'cyan' ? hudTheme.cyan : alert.tone === 'amber' ? hudTheme.amber : hudTheme.red,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={styles.kpi}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={{ ...styles.kpiValue, color: tone }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'absolute',
    inset: '96px 20px 24px 20px',
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr)',
    gap: 18,
    pointerEvents: 'auto',
  },
  header: {
    maxWidth: 720,
    pointerEvents: 'auto',
  },
  title: {
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 34,
  },
  copy: {
    color: hudTheme.muted,
    fontSize: 15,
    marginTop: 8,
    lineHeight: 1.7,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1.05fr 0.95fr',
    gap: 16,
    minHeight: 0,
  },
  card: {
    ...glassPanel,
    padding: 18,
    pointerEvents: 'auto',
    minHeight: 0,
  },
  cardTitle: {
    ...monoText,
    color: hudTheme.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    fontSize: 10,
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
    marginTop: 14,
  },
  kpi: {
    background: 'rgba(255,255,255,0.03)',
    padding: 12,
  },
  kpiLabel: {
    ...monoText,
    color: hudTheme.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    fontSize: 10,
  },
  kpiValue: {
    ...monoText,
    fontSize: 30,
    marginTop: 12,
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 14,
    maxHeight: '100%',
    overflowY: 'auto',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.2fr) auto auto',
    gap: 10,
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
  },
  name: {
    color: hudTheme.text,
    fontSize: 14,
  },
  meta: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 11,
    letterSpacing: '0.08em',
  },
  chart: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 16,
  },
  barRow: {
    display: 'grid',
    gridTemplateColumns: '120px minmax(0, 1fr)',
    gap: 12,
    alignItems: 'center',
  },
  barLabel: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  barTrack: {
    background: 'rgba(255,255,255,0.04)',
    height: 12,
  },
  barFill: {
    height: '100%',
  },
};
