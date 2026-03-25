import { HudSnapshot } from '../HUD/hudSelectors';
import { buttonReset, glassPanel, hudTheme, monoText, sectionTitle } from '../HUD/hudTheme';
import { buildAnalysisModel } from './analysis/analysisModel';
import { useDashboardStore } from '../../store/dashboardStore';
import { usePlayback } from '../Playback/usePlayback';

export function AnalysisPage({ snapshot }: { snapshot: HudSnapshot }) {
  const model = buildAnalysisModel(snapshot);
  const setCurrentPage = useDashboardStore((state) => state.setCurrentPage);
  const { seek } = usePlayback();

  const openReplayAt = (simTimeS: number) => {
    setCurrentPage('replay');
    seek(simTimeS);
  };

  return (
    <div style={styles.wrap}>
      <header style={styles.header}>
        <div>
          <div style={styles.eyebrow}>Scenario Report</div>
          <h1 style={styles.title}>{model.headline}</h1>
        </div>

        <div style={styles.headerMeta}>
          <div style={styles.metaBlock}>
            <div style={styles.metaLabel}>Scenario</div>
            <div style={styles.metaValue}>{snapshot.scenarioLabel}</div>
          </div>
          <div style={styles.metaBlock}>
            <div style={styles.metaLabel}>Session</div>
            <div style={styles.metaValue}>{snapshot.sessionLabel}</div>
          </div>
        </div>
      </header>

      <section style={styles.heroGrid}>
        <div style={styles.heroPanel}>
          <p style={styles.copy}>{model.narrative}</p>
          <div style={styles.summaryStrip}>
            {model.summaryLines.map((line) => (
              <div key={line} style={styles.summaryLine}>
                {line}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.kpiGrid}>
          {model.outcomeMetrics.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              detail={metric.detail}
              tone={metric.tone}
            />
          ))}
        </div>
      </section>

      <section style={styles.mainGrid}>
        <section style={styles.sectionTall}>
          <SectionHeader title="Outcome Ledger" />
          <div style={styles.ledger}>
            {model.trackOutcomes.length > 0 ? (
              model.trackOutcomes.map((track) => (
                <div key={track.id} style={styles.ledgerRow}>
                  <div>
                    <div style={styles.rowTitle}>{track.name}</div>
                    <div style={styles.rowSubtle}>{track.label}</div>
                  </div>
                  <div style={styles.rowRight}>
                    <TonePill tone={track.statusTone} text={track.statusLabel} />
                    <div style={styles.rowDetail}>{track.latestEventLabel}</div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No track outcomes yet" />
            )}
          </div>
        </section>

        <section style={styles.sectionCard}>
          <SectionHeader title="Event Distribution" />
          <div style={styles.distributionList}>
            {model.eventBreakdown.map((row) => (
              <div key={row.label} style={styles.distributionRow}>
                <div style={styles.distributionHeader}>
                  <span style={styles.rowTitle}>{row.label}</span>
                  <span style={styles.rowSubtle}>{row.count}</span>
                </div>
                <div style={styles.barTrack}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${Math.max(10, Math.round(row.fraction * 100))}%`,
                      background: toneColor(row.tone),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.sectionCard}>
          <SectionHeader title="Asset Activity" />
          <div style={styles.assetList}>
            {model.assetActivity.length > 0 ? (
              model.assetActivity.map((asset) => (
                <div key={asset.id} style={styles.assetRow}>
                  <div>
                    <div style={styles.rowTitle}>{asset.name}</div>
                    <div style={styles.rowSubtle}>{asset.roleLabel}</div>
                  </div>
                  <div style={styles.rowRight}>
                    <TonePill
                      tone={asset.emphasis === 'engaging' ? 'cyan' : asset.emphasis === 'tracking' ? 'amber' : 'red'}
                      text={asset.statusLabel}
                    />
                    <div style={styles.rowDetail}>{asset.activityLabel}</div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No asset activity" />
            )}
          </div>
        </section>

        <section style={styles.sectionTall}>
          <SectionHeader title="Investigation Queue" />
          <div style={styles.cueList}>
            {model.investigationCues.length > 0 ? (
              model.investigationCues.map((cue) => (
                <button
                  key={cue.id}
                  type="button"
                  style={styles.cueButton}
                  onClick={() => openReplayAt(cue.simTimeS)}
                >
                  <div style={styles.cueTime}>{cue.timeLabel}</div>
                  <div style={styles.cueBody}>
                    <div style={styles.rowTitle}>{cue.title}</div>
                    <div style={styles.rowSubtle}>{cue.subtitle}</div>
                  </div>
                  <TonePill tone={cue.tone} text="OPEN IN REPLAY" />
                </button>
              ))
            ) : (
              <EmptyState title="No replay hooks yet" />
            )}
          </div>
        </section>
      </section>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={styles.sectionHeader}>
      <div style={sectionTitle}>{title}</div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: 'cyan' | 'amber' | 'red';
}) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={{ ...styles.metricValue, color: toneColor(tone) }}>{value}</div>
      <div style={styles.metricDetail}>{detail}</div>
    </div>
  );
}

function TonePill({ tone, text }: { tone: 'cyan' | 'amber' | 'red'; text: string }) {
  return (
    <span
      style={{
        ...styles.tonePill,
        color: toneColor(tone),
        borderColor: `${toneColor(tone)}3a`,
        background: `${toneColor(tone)}12`,
      }}
    >
      {text}
    </span>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.rowTitle}>{title}</div>
    </div>
  );
}

function toneColor(tone: 'cyan' | 'amber' | 'red') {
  if (tone === 'amber') {
    return hudTheme.amber;
  }
  if (tone === 'red') {
    return hudTheme.red;
  }
  return hudTheme.cyan;
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'absolute',
    inset: '96px 20px 24px 20px',
    display: 'grid',
    gridTemplateRows: 'auto auto minmax(0, 1fr)',
    gap: 18,
    pointerEvents: 'auto',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'end',
    gap: 24,
  },
  eyebrow: {
    ...monoText,
    color: hudTheme.cyan,
    fontSize: 12,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    fontWeight: 700,
  },
  title: {
    margin: '10px 0 0 0',
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 34,
    lineHeight: 1.05,
    maxWidth: 780,
  },
  headerMeta: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(160px, 1fr))',
    gap: 12,
    minWidth: 320,
  },
  metaBlock: {
    ...glassPanel,
    padding: '12px 14px',
  },
  metaLabel: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 10,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  },
  metaValue: {
    color: hudTheme.text,
    fontSize: 16,
    marginTop: 8,
  },
  heroGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: 16,
    minHeight: 0,
  },
  heroPanel: {
    ...glassPanel,
    padding: 20,
    display: 'grid',
    alignContent: 'space-between',
    gap: 16,
  },
  copy: {
    color: hudTheme.text,
    lineHeight: 1.7,
    fontSize: 15,
    margin: 0,
    maxWidth: 760,
  },
  summaryStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 10,
  },
  summaryLine: {
    ...monoText,
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.03)',
    color: hudTheme.amberSoft,
    fontSize: 11,
    letterSpacing: '0.12em',
    lineHeight: 1.6,
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
  },
  metricCard: {
    ...glassPanel,
    padding: 16,
    display: 'grid',
    gap: 10,
  },
  metricLabel: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },
  metricValue: {
    ...monoText,
    fontSize: 34,
    lineHeight: 1,
  },
  metricDetail: {
    ...monoText,
    color: hudTheme.faint,
    fontSize: 11,
    letterSpacing: '0.08em',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1.08fr 0.92fr',
    gap: 16,
    minHeight: 0,
  },
  sectionTall: {
    ...glassPanel,
    padding: 18,
    minHeight: 0,
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr)',
    gap: 14,
  },
  sectionCard: {
    ...glassPanel,
    padding: 18,
    minHeight: 0,
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr)',
    gap: 14,
  },
  sectionHeader: {
    display: 'grid',
    gap: 6,
  },
  ledger: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    overflowY: 'auto',
    minHeight: 0,
    paddingRight: 4,
  },
  ledgerRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: 12,
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
  },
  rowTitle: {
    color: hudTheme.text,
    fontSize: 14,
    lineHeight: 1.35,
  },
  rowSubtle: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 11,
    letterSpacing: '0.08em',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  rowRight: {
    display: 'grid',
    justifyItems: 'end',
    gap: 8,
    maxWidth: 320,
  },
  rowDetail: {
    ...monoText,
    color: hudTheme.faint,
    fontSize: 11,
    letterSpacing: '0.08em',
    textAlign: 'right',
  },
  tonePill: {
    ...monoText,
    padding: '6px 10px',
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    border: '1px solid',
    whiteSpace: 'nowrap',
  },
  distributionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  distributionRow: {
    display: 'grid',
    gap: 10,
  },
  distributionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  barTrack: {
    height: 14,
    background: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
  },
  assetList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    overflowY: 'auto',
    minHeight: 0,
    paddingRight: 4,
  },
  assetRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: 12,
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
  },
  cueList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    overflowY: 'auto',
    minHeight: 0,
    paddingRight: 4,
  },
  cueButton: {
    ...buttonReset,
    display: 'grid',
    gridTemplateColumns: '72px minmax(0, 1fr) auto',
    gap: 14,
    alignItems: 'center',
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.03)',
    textAlign: 'left',
    cursor: 'pointer',
  },
  cueTime: {
    ...monoText,
    color: hudTheme.cyanSoft,
    fontSize: 16,
    letterSpacing: '0.08em',
  },
  cueBody: {
    minWidth: 0,
  },
  emptyState: {
    display: 'grid',
    gap: 8,
    padding: '18px 0',
  },
};
