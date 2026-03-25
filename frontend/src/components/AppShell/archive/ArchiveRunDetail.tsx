import { buttonReset, glassPanel, hudTheme, monoText, sectionTitle } from '../../HUD/hudTheme';
import { ArchivedRunDetail } from '../../../types/runArchive';

export function ArchiveRunDetail({
  run,
  loading,
  error,
  onOpenReplay,
}: {
  run: ArchivedRunDetail | null;
  loading: boolean;
  error: string | null;
  onOpenReplay?: (run: ArchivedRunDetail) => void;
}) {
  if (loading) {
    return <section style={styles.wrap}><div style={styles.message}>Loading run detail…</div></section>;
  }

  if (error) {
    return <section style={styles.wrap}><div style={styles.error}>{error}</div></section>;
  }

  if (!run) {
    return (
      <section style={styles.wrap}>
        <div style={styles.message}>
          Select a run from the archive to inspect its saved report summary, event breakdown, and activity recap.
        </div>
      </section>
    );
  }

  return (
    <section style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <div style={sectionTitle}>Archived Report</div>
          <div style={styles.title}>{run.scenario_name}</div>
          <div style={styles.subtitle}>{run.session_id}</div>
        </div>
        {onOpenReplay && (
          <button type="button" onClick={() => onOpenReplay(run)} style={styles.actionButton}>
            OPEN_REPLAY
          </button>
        )}
      </div>

      <div style={styles.metricGrid}>
        <Metric label="Status" value={run.status.toUpperCase()} tone={run.status === 'completed' ? 'cyan' : run.status === 'running' ? 'amber' : 'red'} />
        <Metric label="Duration" value={`${Math.round(run.duration_s)}S`} />
        <Metric label="Events" value={String(run.event_count)} />
        <Metric label="Success / Miss" value={`${run.intercept_successes}/${run.intercept_misses}`} />
      </div>

      {run.summary_lines.length > 0 && (
        <div style={styles.summaryBlock}>
          <div style={sectionTitle}>Narrative Summary</div>
          <div style={styles.summaryLines}>
            {run.summary_lines.map((line) => (
              <div key={line} style={styles.summaryLine}>{line}</div>
            ))}
          </div>
        </div>
      )}

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={sectionTitle}>Event Distribution</div>
          <div style={styles.list}>
            {run.event_breakdown.map((row) => (
              <div key={row.label} style={styles.breakdownRow}>
                <div style={styles.breakdownHeader}>
                  <span style={styles.rowTitle}>{row.label}</span>
                  <span style={styles.rowMeta}>{row.count}</span>
                </div>
                <div style={styles.barTrack}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${Math.max(10, Math.round((row.count / Math.max(run.event_count, 1)) * 100))}%`,
                      background: row.tone === 'cyan' ? hudTheme.cyan : row.tone === 'amber' ? hudTheme.amber : hudTheme.red,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.card}>
          <div style={sectionTitle}>Investigation Queue</div>
          <div style={styles.list}>
            {run.investigation_cues.map((cue) => (
              <button type="button" key={cue.id} style={styles.cueButton}>
                <div style={styles.cueTop}>
                  <span style={styles.rowTitle}>{cue.title}</span>
                  <span style={styles.rowMeta}>{cue.sim_time_s.toFixed(1)}S</span>
                </div>
                <div style={styles.rowCopy}>{cue.subtitle}</div>
              </button>
            ))}
            {run.investigation_cues.length === 0 && (
              <div style={styles.emptyCopy}>No saved investigation cues were attached to this run.</div>
            )}
          </div>
        </div>

        <div style={styles.card}>
          <div style={sectionTitle}>Track Outcomes</div>
          <div style={styles.list}>
            {run.track_outcomes.map((track) => (
              <div key={track.id} style={styles.simpleRow}>
                <div>
                  <div style={styles.rowTitle}>{track.name}</div>
                  <div style={styles.rowCopy}>{track.label}</div>
                </div>
                <div style={styles.rightMeta}>
                  <span style={{ ...styles.tonePill, color: track.tone === 'cyan' ? hudTheme.cyanSoft : track.tone === 'amber' ? hudTheme.amberSoft : hudTheme.redSoft }}>
                    {track.outcome_label}
                  </span>
                  {track.latest_event_label && <span style={styles.rowMeta}>{track.latest_event_label}</span>}
                </div>
              </div>
            ))}
            {run.track_outcomes.length === 0 && (
              <div style={styles.emptyCopy}>No archived track outcomes were attached to this run.</div>
            )}
          </div>
        </div>

        <div style={styles.card}>
          <div style={sectionTitle}>Asset Activity</div>
          <div style={styles.list}>
            {run.asset_activity.map((asset) => (
              <div key={asset.id} style={styles.simpleRow}>
                <div>
                  <div style={styles.rowTitle}>{asset.name}</div>
                  <div style={styles.rowCopy}>{asset.role_label}</div>
                </div>
                <div style={styles.rightMeta}>
                  <span style={{ ...styles.tonePill, color: asset.tone === 'cyan' ? hudTheme.cyanSoft : asset.tone === 'amber' ? hudTheme.amberSoft : hudTheme.redSoft }}>
                    {asset.status_label}
                  </span>
                  <span style={styles.rowMeta}>{asset.activity_label}</span>
                </div>
              </div>
            ))}
            {run.asset_activity.length === 0 && (
              <div style={styles.emptyCopy}>No archived asset activity was attached to this run.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  tone = 'text',
}: {
  label: string;
  value: string;
  tone?: 'cyan' | 'amber' | 'red' | 'text';
}) {
  const color =
    tone === 'cyan'
      ? hudTheme.cyanSoft
      : tone === 'amber'
        ? hudTheme.amberSoft
        : tone === 'red'
          ? hudTheme.redSoft
          : hudTheme.text;

  return (
    <div style={styles.metric}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={{ ...styles.metricValue, color }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    ...glassPanel,
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    minHeight: 0,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
  },
  title: {
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 30,
    lineHeight: 1,
    marginTop: 6,
  },
  subtitle: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 11,
    letterSpacing: '0.12em',
    marginTop: 8,
  },
  actionButton: {
    ...buttonReset,
    border: `1px solid ${hudTheme.line}`,
    padding: '10px 12px',
    color: hudTheme.cyanSoft,
    letterSpacing: '0.16em',
    fontSize: 11,
    cursor: 'pointer',
  },
  message: {
    padding: '24px 16px',
    background: 'rgba(255,255,255,0.03)',
    color: hudTheme.muted,
    lineHeight: 1.6,
  },
  error: {
    padding: '24px 16px',
    background: 'rgba(255,180,171,0.08)',
    color: hudTheme.redSoft,
    lineHeight: 1.6,
  },
  metricGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 10,
  },
  metric: {
    background: 'rgba(255,255,255,0.03)',
    padding: '12px 12px 10px',
  },
  metricLabel: {
    ...monoText,
    color: hudTheme.faint,
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },
  metricValue: {
    marginTop: 8,
    fontSize: 22,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
  },
  summaryBlock: {
    background: 'rgba(255,255,255,0.03)',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  summaryLines: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  summaryLine: {
    color: hudTheme.text,
    lineHeight: 1.5,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
    minHeight: 0,
    overflow: 'auto',
    paddingRight: 4,
  },
  card: {
    background: 'rgba(255,255,255,0.02)',
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minHeight: 200,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  breakdownRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  breakdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
  },
  barTrack: {
    height: 6,
    background: 'rgba(255,255,255,0.05)',
  },
  barFill: {
    height: '100%',
  },
  cueButton: {
    ...buttonReset,
    textAlign: 'left',
    padding: '10px 10px 9px',
    background: 'rgba(255,255,255,0.03)',
    cursor: 'pointer',
  },
  cueTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
  },
  simpleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 10px 9px',
    background: 'rgba(255,255,255,0.03)',
  },
  rowTitle: {
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 16,
    lineHeight: 1.1,
  },
  rowCopy: {
    color: hudTheme.muted,
    fontSize: 12,
    lineHeight: 1.5,
    marginTop: 4,
  },
  rowMeta: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 11,
    letterSpacing: '0.08em',
  },
  rightMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
    maxWidth: '44%',
    textAlign: 'right',
  },
  tonePill: {
    ...monoText,
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },
  emptyCopy: {
    color: hudTheme.muted,
    fontSize: 12,
    lineHeight: 1.5,
    paddingTop: 8,
  },
};
