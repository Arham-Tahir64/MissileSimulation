import { buttonReset, glassPanel, hudTheme, monoText, sectionTitle } from '../../HUD/hudTheme';
import { ArchivedRunSummary } from '../../../types/runArchive';

export function ArchiveRunList({
  runs,
  selectedRunId,
  loading,
  error,
  onSelect,
}: {
  runs: ArchivedRunSummary[];
  selectedRunId: string | null;
  loading: boolean;
  error: string | null;
  onSelect: (runId: string) => void;
}) {
  return (
    <section style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <div style={sectionTitle}>Run Archive</div>
          <div style={styles.title}>Saved Sessions</div>
        </div>
        <div style={styles.count}>{runs.length}</div>
      </div>

      <div style={styles.copy}>
        Archived runs let you reopen a completed fictional scenario without rebuilding it from scratch.
      </div>

      {loading && <div style={styles.message}>Loading run history…</div>}
      {error && !loading && <div style={styles.error}>{error}</div>}
      {!loading && !error && runs.length === 0 && (
        <div style={styles.message}>
          No saved runs yet. Completed sessions will appear here once the archive API is available.
        </div>
      )}

      {!loading && !error && runs.length > 0 && (
        <div style={styles.list}>
          {runs.map((run) => {
            const selected = run.id === selectedRunId;
            return (
              <button
                key={run.id}
                type="button"
                onClick={() => onSelect(run.id)}
                style={{
                  ...buttonReset,
                  ...styles.row,
                  background: selected ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.02)',
                  boxShadow: selected ? 'inset 2px 0 0 #00e5ff' : 'none',
                }}
              >
                <div style={styles.rowTop}>
                  <div style={styles.rowTitle}>{run.scenario_name}</div>
                  <StatusPill status={run.status} />
                </div>
                <div style={styles.rowMeta}>{run.session_id}</div>
                <div style={styles.rowGrid}>
                  <Metric label="Duration" value={`${Math.round(run.duration_s)}S`} />
                  <Metric label="Events" value={String(run.event_count)} />
                  <Metric label="Intercepts" value={`${run.intercept_successes}/${run.intercept_misses}`} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metric}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: ArchivedRunSummary['status'] }) {
  const color =
    status === 'completed'
      ? hudTheme.cyanSoft
      : status === 'running'
        ? hudTheme.amberSoft
        : hudTheme.redSoft;

  return <span style={{ ...styles.statusPill, color }}>{status.toUpperCase()}</span>;
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    ...glassPanel,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minHeight: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 24,
    marginTop: 4,
  },
  count: {
    color: hudTheme.cyanSoft,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 28,
    lineHeight: 1,
  },
  copy: {
    color: hudTheme.muted,
    fontSize: 13,
    lineHeight: 1.6,
  },
  message: {
    padding: '16px 14px',
    background: 'rgba(255,255,255,0.03)',
    color: hudTheme.muted,
    fontSize: 13,
    lineHeight: 1.5,
  },
  error: {
    padding: '16px 14px',
    background: 'rgba(255,180,171,0.08)',
    color: hudTheme.redSoft,
    fontSize: 13,
    lineHeight: 1.5,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minHeight: 0,
    overflowY: 'auto',
  },
  row: {
    textAlign: 'left',
    padding: '14px 14px 13px',
    border: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    cursor: 'pointer',
  },
  rowTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  rowTitle: {
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 18,
    lineHeight: 1.05,
  },
  rowMeta: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 11,
    letterSpacing: '0.12em',
  },
  rowGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 8,
  },
  metric: {
    background: 'rgba(255,255,255,0.03)',
    padding: '8px 10px',
  },
  metricLabel: {
    ...monoText,
    color: hudTheme.faint,
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: hudTheme.text,
    marginTop: 6,
    fontSize: 14,
  },
  statusPill: {
    ...monoText,
    border: `1px solid ${hudTheme.line}`,
    padding: '7px 10px',
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
};
