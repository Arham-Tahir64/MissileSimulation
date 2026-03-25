import { useEffect, useMemo, useState } from 'react';
import { ArchiveRunDetail } from './ArchiveRunDetail';
import { ArchiveRunComparison } from './ArchiveRunComparison';
import { ArchiveRunList } from './ArchiveRunList';
import { deleteArchivedRun, fetchArchivedRun, fetchArchivedRuns } from '../../../services/runArchiveApi';
import { ArchivedRunDetail, ArchivedRunSummary } from '../../../types/runArchive';
import { glassPanel, hudTheme, monoText } from '../../HUD/hudTheme';

export function RunArchivePage({
  onOpenReplay,
}: {
  onOpenReplay?: (run: ArchivedRunDetail) => void;
}) {
  const [runs, setRuns] = useState<ArchivedRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<ArchivedRunDetail | null>(null);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Comparison state
  const [compareMode, setCompareMode] = useState(false);
  const [compareRunIds, setCompareRunIds] = useState<Set<string>>(new Set());
  const [compareRuns, setCompareRuns] = useState<ArchivedRunDetail[]>([]);
  const [loadingCompare, setLoadingCompare] = useState(false);

  const loadRuns = () => {
    setLoadingRuns(true);
    setListError(null);

    return fetchArchivedRuns()
      .then((items) => {
        setRuns(items);
        setSelectedRunId((current) => current ?? items[0]?.id ?? null);
      })
      .catch(() => {
        setListError('The run archive is not reachable yet. Connect the backend archive API to populate this surface.');
      })
      .finally(() => {
        setLoadingRuns(false);
      });
  };

  useEffect(() => {
    let active = true;

    fetchArchivedRuns()
      .then((items) => {
        if (!active) return;
        setRuns(items);
        setSelectedRunId((current) => current ?? items[0]?.id ?? null);
        setListError(null);
      })
      .catch(() => {
        if (!active) return;
        setListError('The run archive is not reachable yet. Connect the backend archive API to populate this surface.');
      })
      .finally(() => {
        if (active) setLoadingRuns(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedRunId) {
      setSelectedRun(null);
      return;
    }

    let active = true;
    setLoadingDetail(true);

    fetchArchivedRun(selectedRunId)
      .then((run) => {
        if (!active) return;
        setSelectedRun(run);
        setDetailError(null);
      })
      .catch(() => {
        if (!active) return;
        setDetailError('The selected run could not be loaded. Verify the archive detail endpoint and try again.');
      })
      .finally(() => {
        if (active) setLoadingDetail(false);
      });

    return () => {
      active = false;
    };
  }, [selectedRunId]);

  // Fetch detail for each run selected for comparison
  useEffect(() => {
    if (!compareMode || compareRunIds.size < 2) {
      setCompareRuns([]);
      return;
    }

    let active = true;
    setLoadingCompare(true);

    Promise.all([...compareRunIds].map((id) => fetchArchivedRun(id)))
      .then((results) => {
        if (!active) return;
        setCompareRuns(results);
      })
      .catch(() => {
        if (!active) return;
        setCompareRuns([]);
      })
      .finally(() => {
        if (active) setLoadingCompare(false);
      });

    return () => { active = false; };
  }, [compareMode, compareRunIds]);

  const handleDeleteRun = (runId: string) => {
    deleteArchivedRun(runId).then(() => {
      setRuns((prev) => prev.filter((r) => r.id !== runId));
      if (selectedRunId === runId) {
        setSelectedRunId(null);
        setSelectedRun(null);
      }
      setCompareRunIds((prev) => {
        const next = new Set(prev);
        next.delete(runId);
        return next;
      });
    }).catch(() => {
      // silently ignore — the run list will be stale until next refresh
    });
  };

  const handleToggleCompareMode = () => {
    setCompareMode((prev) => !prev);
    setCompareRunIds(new Set());
    setCompareRuns([]);
  };

  const handleToggleCompareRun = (runId: string) => {
    setCompareRunIds((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else if (next.size < 4) {
        next.add(runId);
      }
      return next;
    });
  };

  const totals = useMemo(() => ({
    completed: runs.filter((run) => run.status === 'completed').length,
    scenarios: new Set(runs.map((run) => run.scenario_name)).size,
    events: runs.reduce((sum, run) => sum + run.event_count, 0),
  }), [runs]);

  return (
    <div style={styles.wrap}>
      <header style={styles.hero}>
        <div>
          <div style={styles.eyebrow}>Archive Surface</div>
          <h1 style={styles.title}>Reopen completed runs without rebuilding the whole theater.</h1>
        </div>

        <div style={styles.heroMetrics}>
          <HeroMetric label="Saved Runs" value={runs.length} />
          <HeroMetric label="Completed" value={totals.completed} />
          <HeroMetric label="Scenarios" value={totals.scenarios} />
          <HeroMetric label="Events Logged" value={totals.events} />
        </div>
      </header>

      <section style={styles.archiveNotice}>
        <div style={styles.archiveNoticeTitle}>AUTO_SAVE_ACTIVE</div>
        <button type="button" onClick={() => void loadRuns()} style={styles.refreshButton}>
          REFRESH_ARCHIVE
        </button>
      </section>

      <div style={styles.content}>
        <div style={styles.leftColumn}>
          <ArchiveRunList
            runs={runs}
            selectedRunId={selectedRunId}
            compareMode={compareMode}
            compareRunIds={compareRunIds}
            loading={loadingRuns}
            error={listError}
            onSelect={setSelectedRunId}
            onDelete={handleDeleteRun}
            onToggleCompareMode={handleToggleCompareMode}
            onToggleCompareRun={handleToggleCompareRun}
          />
        </div>
        <div style={styles.rightColumn}>
          {compareMode ? (
            <ArchiveRunComparison
              runs={compareRuns}
              loading={loadingCompare}
            />
          ) : (
            <ArchiveRunDetail
              run={selectedRun}
              loading={loadingDetail}
              error={detailError}
              onOpenReplay={onOpenReplay}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.heroMetric}>
      <div style={styles.heroMetricLabel}>{label}</div>
      <div style={styles.heroMetricValue}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'absolute',
    inset: '96px 20px 24px 20px',
    display: 'grid',
    gridTemplateRows: 'auto auto minmax(0, 1fr)',
    gap: 18,
    pointerEvents: 'auto',
  },
  hero: {
    ...glassPanel,
    padding: 20,
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.9fr',
    gap: 18,
    alignItems: 'end',
  },
  eyebrow: {
    ...monoText,
    color: hudTheme.cyan,
    fontSize: 11,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    fontWeight: 700,
  },
  title: {
    margin: '10px 0 0 0',
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 24,
    lineHeight: 1.15,
    maxWidth: 700,
  },
  heroMetrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 10,
  },
  heroMetric: {
    background: 'rgba(255,255,255,0.03)',
    padding: '12px 12px 10px',
  },
  heroMetricLabel: {
    ...monoText,
    color: hudTheme.faint,
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },
  heroMetricValue: {
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 28,
    marginTop: 8,
    lineHeight: 1,
  },
  archiveNotice: {
    ...glassPanel,
    padding: '14px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 18,
    alignItems: 'center',
  },
  archiveNoticeTitle: {
    ...monoText,
    color: hudTheme.cyanSoft,
    fontSize: 10,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
  },
  refreshButton: {
    border: `1px solid ${hudTheme.line}`,
    background: 'rgba(10,16,22,0.82)',
    color: hudTheme.text,
    padding: '10px 12px',
    cursor: 'pointer',
    letterSpacing: '0.16em',
    fontSize: 11,
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '380px minmax(0, 1fr)',
    gap: 16,
    minHeight: 0,
  },
  leftColumn: {
    minHeight: 0,
  },
  rightColumn: {
    minHeight: 0,
  },
};
