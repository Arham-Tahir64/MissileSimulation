import { useMemo } from 'react';
import { HudSnapshot } from '../HUD/hudSelectors';
import { buttonReset, glassPanel, hudTheme, monoText, sectionTitle } from '../HUD/hudTheme';
import { buildAnalysisModel } from './analysis/analysisModel';
import { useDashboardStore } from '../../store/dashboardStore';
import { usePlayback } from '../Playback/usePlayback';
import { getDefenseAssetConfigByDesignator } from '../../config/defenseAssets';

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

      {/* ── Threat Density Heat Map ────────────────────────────────── */}
      <ThreatDensityMap snapshot={snapshot} />

      {/* ── Coverage Gap Analysis ─────────────────────────────────── */}
      <CoverageGapTable snapshot={snapshot} />
    </div>
  );
}

const HEAT_BUCKETS = 20;

function ThreatDensityMap({ snapshot }: { snapshot: HudSnapshot }) {
  const buckets = useMemo(() => {
    const counts = Array<number>(HEAT_BUCKETS).fill(0);
    for (const marker of snapshot.markers) {
      const idx = Math.min(HEAT_BUCKETS - 1, Math.floor(marker.fraction * HEAT_BUCKETS));
      counts[idx]++;
    }
    const maxCount = Math.max(1, ...counts);
    return counts.map((count, i) => ({
      count,
      fraction: i / HEAT_BUCKETS,
      intensity: count / maxCount,
    }));
  }, [snapshot.markers]);

  const totalEvents = snapshot.markers.length;

  return (
    <section style={heatStyles.wrap}>
      <div style={heatStyles.header}>
        <div style={sectionTitle}>Threat Activity Heat Map</div>
        <span style={heatStyles.meta}>{totalEvents} EVENTS / {HEAT_BUCKETS} TIME BUCKETS</span>
      </div>
      <div style={heatStyles.grid}>
        {buckets.map((bucket, i) => {
          const r = Math.round(0 + bucket.intensity * 255);
          const g = Math.round(229 - bucket.intensity * 180);
          const b = Math.round(255 - bucket.intensity * 200);
          const color = `rgba(${r},${g},${b},${0.15 + bucket.intensity * 0.75})`;
          return (
            <div
              key={i}
              title={`T${(bucket.fraction * 100).toFixed(0)}%: ${bucket.count} events`}
              style={{ ...heatStyles.cell, background: color, height: `${20 + bucket.intensity * 44}px` }}
            />
          );
        })}
      </div>
      <div style={heatStyles.axis}>
        <span style={heatStyles.axisLabel}>T+0</span>
        <span style={heatStyles.axisLabel}>50%</span>
        <span style={heatStyles.axisLabel}>END</span>
      </div>
      <div style={heatStyles.legend}>
        <div style={heatStyles.legendGrad} />
        <div style={heatStyles.legendLabels}>
          <span>LOW</span>
          <span>HIGH</span>
        </div>
      </div>
    </section>
  );
}

const heatStyles: Record<string, React.CSSProperties> = {
  wrap: {
    ...glassPanel,
    padding: '14px 18px 12px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  meta: {
    ...monoText,
    color: hudTheme.faint,
    fontSize: 10,
    letterSpacing: '0.14em',
  } as React.CSSProperties,
  grid: {
    display: 'flex',
    gap: 3,
    alignItems: 'flex-end',
    height: 68,
  },
  cell: {
    flex: 1,
    minWidth: 0,
    borderRadius: 1,
    transition: 'height 0.4s ease',
  },
  axis: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  axisLabel: {
    ...monoText,
    color: hudTheme.faint,
    fontSize: 9,
    letterSpacing: '0.1em',
  } as React.CSSProperties,
  legend: {
    marginTop: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    alignItems: 'flex-end',
  },
  legendGrad: {
    width: 120,
    height: 6,
    background: 'linear-gradient(to right, rgba(0,229,255,0.5), rgba(255,80,80,0.9))',
    borderRadius: 2,
  },
  legendLabels: {
    ...monoText,
    color: hudTheme.faint,
    fontSize: 9,
    letterSpacing: '0.12em',
    display: 'flex',
    justifyContent: 'space-between',
    width: 120,
  } as React.CSSProperties,
};

function CoverageGapTable({ snapshot }: { snapshot: HudSnapshot }) {
  const rows = useMemo(() => {
    return snapshot.defenseAssets.map((asset) => {
      const cfg      = getDefenseAssetConfigByDesignator(asset.assetState.designator);
      const maxTrk   = cfg?.maxTracks ?? 0;
      const current  = asset.trackCount;
      const utilized = maxTrk > 0 ? current / maxTrk : 0;

      return {
        id:         asset.id,
        name:       asset.name,
        role:       asset.role,
        status:     asset.status,
        trackCount: current,
        maxTracks:  maxTrk,
        utilized,
        coverageKm: asset.rangeKm,
        gap:        maxTrk > 0 && current === 0 && asset.status !== 'COOLDOWN',
      };
    });
  }, [snapshot.defenseAssets]);

  const gapCount = rows.filter((r) => r.gap).length;

  return (
    <section style={covStyles.wrap}>
      <div style={covStyles.header}>
        <div style={sectionTitle}>Coverage Gap Analysis</div>
        <span style={{ ...covStyles.badge, color: gapCount > 0 ? '#ffb400' : hudTheme.cyanSoft }}>
          {gapCount > 0 ? `${gapCount} IDLE ASSET${gapCount > 1 ? 'S' : ''}` : 'ALL ASSETS ACTIVE'}
        </span>
      </div>

      <div style={covStyles.tableWrap}>
        <div style={covStyles.tableHead}>
          <span>ASSET</span>
          <span>ROLE</span>
          <span>STATUS</span>
          <span>TRACKS</span>
          <span>COVERAGE</span>
          <span>UTILIZATION</span>
        </div>
        {rows.length > 0 ? rows.map((row) => (
          <div key={row.id} style={{
            ...covStyles.tableRow,
            background: row.gap ? 'rgba(255,180,0,0.05)' : 'rgba(255,255,255,0.025)',
            boxShadow: row.gap ? 'inset 3px 0 0 rgba(255,180,0,0.4)' : 'none',
          }}>
            <span style={covStyles.nameCell}>{row.name}</span>
            <span style={{ ...covStyles.cell, color: row.role === 'radar' ? hudTheme.amberSoft : hudTheme.cyanSoft }}>
              {row.role.toUpperCase()}
            </span>
            <span style={covStyles.cell}>{row.status}</span>
            <span style={covStyles.cell}>
              {row.maxTracks > 0 ? `${row.trackCount}/${row.maxTracks}` : '—'}
            </span>
            <span style={covStyles.cell}>{row.coverageKm.toFixed(0)} KM</span>
            <span style={covStyles.utilCell}>
              <div style={covStyles.utilTrack}>
                <div style={{
                  ...covStyles.utilFill,
                  width: `${(row.utilized * 100).toFixed(0)}%`,
                  background: row.gap ? 'rgba(255,180,0,0.5)' : row.role === 'radar' ? '#b8860b' : '#00bcd4',
                }} />
              </div>
              <span style={{ ...covStyles.cell, minWidth: 36 }}>
                {row.maxTracks > 0 ? `${(row.utilized * 100).toFixed(0)}%` : 'N/A'}
              </span>
            </span>
          </div>
        )) : (
          <div style={covStyles.empty}>No defense assets deployed.</div>
        )}
      </div>
    </section>
  );
}

const covStyles: Record<string, React.CSSProperties> = {
  wrap: {
    ...glassPanel,
    padding: '14px 18px 12px',
    marginBottom: 8,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    ...monoText,
    fontSize: 10,
    letterSpacing: '0.16em',
  } as React.CSSProperties,
  tableWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  tableHead: {
    display: 'grid',
    gridTemplateColumns: '1fr 80px 100px 80px 100px 1fr',
    gap: 8,
    padding: '6px 10px',
    ...monoText,
    fontSize: 9,
    letterSpacing: '0.16em',
    color: hudTheme.faint,
    textTransform: 'uppercase',
  } as React.CSSProperties,
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 80px 100px 80px 100px 1fr',
    gap: 8,
    padding: '8px 10px',
    alignItems: 'center',
  },
  nameCell: {
    color: hudTheme.text,
    fontSize: 13,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
  },
  cell: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 11,
    letterSpacing: '0.1em',
  } as React.CSSProperties,
  utilCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  utilTrack: {
    flex: 1,
    height: 6,
    background: 'rgba(255,255,255,0.07)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  utilFill: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    height: '100%',
    transition: 'width 0.5s ease',
  },
  empty: {
    ...monoText,
    color: hudTheme.faint,
    fontSize: 11,
    padding: '10px',
  } as React.CSSProperties,
};

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
    gridTemplateRows: 'auto auto minmax(0, 1fr) auto auto',
    gap: 18,
    pointerEvents: 'auto',
    overflowY: 'auto',
    overflowX: 'hidden',
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
