import { useEffect, useMemo, useState } from 'react';
import { ArchiveRunDetail } from './ArchiveRunDetail';
import { ArchiveRunList } from './ArchiveRunList';
import { fetchArchivedRun, fetchArchivedRuns } from '../../../services/runArchiveApi';
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
          <p style={styles.copy}>
            The archive page is designed as a calmer report-entry surface. It is meant to sit beside Overview and Analysis, not compete with live monitoring.
          </p>
        </div>

        <div style={styles.heroMetrics}>
          <HeroMetric label="Saved Runs" value={runs.length} />
          <HeroMetric label="Completed" value={totals.completed} />
          <HeroMetric label="Scenarios" value={totals.scenarios} />
          <HeroMetric label="Events Logged" value={totals.events} />
        </div>
      </header>

      <section style={styles.archiveNotice}>
        <div>
          <div style={styles.archiveNoticeTitle}>AUTO_SAVE_ACTIVE</div>
          <div style={styles.archiveNoticeCopy}>
            Completed runs are archived automatically when playback finishes. Use this page as the explicit save surface for reopening those reports.
          </div>
        </div>
        <button type="button" onClick={() => void loadRuns()} style={styles.refreshButton}>
          REFRESH_ARCHIVE
        </button>
      </section>

      <div style={styles.content}>
        <div style={styles.leftColumn}>
          <ArchiveRunList
            runs={runs}
            selectedRunId={selectedRunId}
            loading={loadingRuns}
            error={listError}
            onSelect={setSelectedRunId}
          />
        </div>
        <div style={styles.rightColumn}>
          <ArchiveRunDetail
            run={selectedRun}
            loading={loadingDetail}
            error={detailError}
            onOpenReplay={onOpenReplay}
          />
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
    gridTemplateRows: 'auto minmax(0, 1fr)',
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
    fontSize: 34,
    lineHeight: 1.04,
    maxWidth: 700,
  },
  copy: {
    color: hudTheme.muted,
    fontSize: 14,
    lineHeight: 1.7,
    maxWidth: 620,
    marginTop: 10,
    marginBottom: 0,
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
  archiveNoticeCopy: {
    color: hudTheme.muted,
    fontSize: 13,
    lineHeight: 1.6,
    marginTop: 6,
    maxWidth: 720,
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
