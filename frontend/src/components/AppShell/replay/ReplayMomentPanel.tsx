import { AlertRow, ScenarioMetrics, SelectionDetail } from '../../HUD/hudSelectors';
import { glassPanel, hudTheme, monoText, sectionTitle } from '../../HUD/hudTheme';
import { formatSimTime } from '../../../utils/timeUtils';
import { ReplayEventCounts } from './replayUtils';

export function ReplayMomentPanel({
  simTimeS,
  activeEvent,
  nearestEvents,
  selection,
  metrics,
  counts,
}: {
  simTimeS: number;
  activeEvent: AlertRow | null;
  nearestEvents: AlertRow[];
  selection: SelectionDetail;
  metrics: ScenarioMetrics;
  counts: ReplayEventCounts;
}) {
  return (
    <section style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <div style={sectionTitle}>Moment Summary</div>
          <div style={styles.headline}>Replay state at T+ {formatSimTime(simTimeS)}</div>
        </div>
        <div style={styles.selectionChip}>
          {selection.kind === 'none' ? 'IDLE_SELECTION' : `${selection.kind.toUpperCase()} // ${selection.title}`}
        </div>
      </div>

      <div style={styles.metricsGrid}>
        <MetricTile label="TRACKS" value={String(metrics.activeTracks)} tone="cyan" />
        <MetricTile label="TRACKS_LOCKED" value={String(counts.sensorTrack)} tone="amber" />
        <MetricTile label="ENGAGEMENTS" value={String(counts.engagementOrder)} tone="cyan" />
        <MetricTile label="INTERCEPTS" value={String(counts.intercept)} tone="red" />
      </div>

      <div style={styles.focusCard}>
        <div style={styles.focusLabel}>ACTIVE_MOMENT</div>
        <div style={styles.focusValue}>{activeEvent ? activeEvent.title : 'NO_IMMEDIATE_EVENT'}</div>
        <div style={styles.focusSub}>
          {activeEvent ? activeEvent.subtitle : 'Scrub or select a bookmark to inspect a denser event window.'}
        </div>
      </div>

      <div style={styles.nearbyList}>
        <div style={styles.nearbyTitle}>Nearest Events</div>
        {nearestEvents.map((event) => (
          <div key={event.id} style={styles.nearbyRow}>
            <span style={styles.nearbyName}>{event.title}</span>
            <span style={styles.nearbyTime}>{formatSimTime(event.simTimeS)}</span>
          </div>
        ))}
        {nearestEvents.length === 0 && <div style={styles.empty}>No nearby events in the current filter window.</div>}
      </div>
    </section>
  );
}

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'cyan' | 'amber' | 'red';
}) {
  return (
    <div style={styles.metricTile}>
      <div style={styles.metricLabel}>{label}</div>
      <div
        style={{
          ...styles.metricValue,
          color: tone === 'cyan' ? hudTheme.cyanSoft : tone === 'amber' ? hudTheme.amberSoft : hudTheme.redSoft,
        }}
      >
        {value}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    ...glassPanel,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
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
  selectionChip: {
    ...monoText,
    maxWidth: 220,
    color: hudTheme.muted,
    border: `1px solid ${hudTheme.lineSoft}`,
    padding: '8px 10px',
    fontSize: 10,
    letterSpacing: '0.14em',
    textAlign: 'right',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 8,
  },
  metricTile: {
    background: 'rgba(255,255,255,0.03)',
    padding: '10px 12px',
  },
  metricLabel: {
    ...sectionTitle,
  },
  metricValue: {
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 28,
    marginTop: 8,
  },
  focusCard: {
    background: 'rgba(255,255,255,0.03)',
    padding: '12px 14px',
  },
  focusLabel: {
    ...sectionTitle,
  },
  focusValue: {
    color: hudTheme.text,
    fontSize: 18,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    marginTop: 6,
  },
  focusSub: {
    color: hudTheme.muted,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 1.5,
  },
  nearbyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  nearbyTitle: {
    ...sectionTitle,
  },
  nearbyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    padding: '8px 0',
    borderBottom: `1px solid ${hudTheme.lineSoft}`,
  },
  nearbyName: {
    color: hudTheme.text,
    fontSize: 12,
  },
  nearbyTime: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 11,
  },
  empty: {
    color: hudTheme.muted,
    fontSize: 12,
    lineHeight: 1.5,
  },
};
