import { buttonReset, glassPanel, hudTheme, monoText, sectionTitle } from '../../HUD/hudTheme';
import { ArchivedRunSummary } from '../../../types/runArchive';

export function ArchiveRunList({
  runs,
  selectedRunId,
  compareMode,
  compareRunIds,
  loading,
  error,
  onSelect,
  onDelete,
  onToggleCompareMode,
  onToggleCompareRun,
}: {
  runs: ArchivedRunSummary[];
  selectedRunId: string | null;
  compareMode: boolean;
  compareRunIds: Set<string>;
  loading: boolean;
  error: string | null;
  onSelect: (runId: string) => void;
  onDelete: (runId: string) => void;
  onToggleCompareMode: () => void;
  onToggleCompareRun: (runId: string) => void;
}) {
  return (
    <section style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <div style={sectionTitle}>Run Archive</div>
          <div style={styles.title}>Saved Sessions</div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.count}>{runs.length}</div>
          {runs.length >= 2 && (
            <button
              type="button"
              onClick={onToggleCompareMode}
              style={{
                ...buttonReset,
                ...styles.compareToggle,
                color: compareMode ? hudTheme.cyanSoft : hudTheme.muted,
                borderColor: compareMode ? hudTheme.cyanSoft : hudTheme.line,
                background: compareMode ? 'rgba(0,229,255,0.08)' : 'transparent',
              }}
            >
              {compareMode ? `COMPARE (${compareRunIds.size})` : 'COMPARE'}
            </button>
          )}
        </div>
      </div>

      {compareMode && (
        <div style={styles.compareHint}>
          Select 2–4 runs to compare side-by-side. Click a run to toggle it.
        </div>
      )}


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
            if (compareMode) {
              const checked = compareRunIds.has(run.id);
              const maxReached = compareRunIds.size >= 4 && !checked;
              return (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => !maxReached && onToggleCompareRun(run.id)}
                  style={{
                    ...buttonReset,
                    ...styles.row,
                    background: checked ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.02)',
                    boxShadow: checked ? 'inset 2px 0 0 #00e5ff' : 'none',
                    opacity: maxReached ? 0.4 : 1,
                    cursor: maxReached ? 'not-allowed' : 'pointer',
                  }}
                >
                  <div style={styles.rowTop}>
                    <div style={styles.compareCheck}>
                      <span style={{ ...styles.checkBox, borderColor: checked ? hudTheme.cyan : hudTheme.line, background: checked ? hudTheme.cyan : 'transparent' }}>
                        {checked && <span style={styles.checkMark}>✓</span>}
                      </span>
                      <div style={styles.rowTitle}>{run.scenario_name}</div>
                    </div>
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
            }

            const selected = run.id === selectedRunId;
            return (
              <div
                key={run.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(run.id)}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(run.id)}
                style={{
                  ...styles.row,
                  background: selected ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.02)',
                  boxShadow: selected ? 'inset 2px 0 0 #00e5ff' : 'none',
                }}
              >
                <div style={styles.rowTop}>
                  <div style={styles.rowTitle}>{run.scenario_name}</div>
                  <div style={styles.rowTopRight}>
                    <StatusPill status={run.status} />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDelete(run.id); }}
                      style={styles.deleteButton}
                      title="Delete run"
                    >
                      DEL
                    </button>
                  </div>
                </div>
                <div style={styles.rowMeta}>{run.session_id}</div>
                <div style={styles.rowGrid}>
                  <Metric label="Duration" value={`${Math.round(run.duration_s)}S`} />
                  <Metric label="Events" value={String(run.event_count)} />
                  <Metric label="Intercepts" value={`${run.intercept_successes}/${run.intercept_misses}`} />
                </div>
              </div>
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
  headerRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
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
  compareToggle: {
    border: '1px solid',
    padding: '7px 10px',
    fontSize: 10,
    letterSpacing: '0.14em',
    cursor: 'pointer',
  },
  compareHint: {
    color: hudTheme.cyanSoft,
    fontSize: 12,
    lineHeight: 1.5,
    padding: '8px 10px',
    background: 'rgba(0,229,255,0.06)',
    border: `1px solid rgba(0,229,255,0.14)`,
  },
  compareCheck: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    minWidth: 0,
  },
  checkBox: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 16,
    height: 16,
    border: '1px solid',
    flexShrink: 0,
  },
  checkMark: {
    color: '#081016',
    fontSize: 10,
    lineHeight: 1,
    fontWeight: 700,
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
  rowTopRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  deleteButton: {
    border: `1px solid ${hudTheme.line}`,
    background: 'transparent',
    color: hudTheme.muted,
    padding: '5px 8px',
    fontSize: 10,
    letterSpacing: '0.12em',
    cursor: 'pointer',
    fontFamily: 'inherit',
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
