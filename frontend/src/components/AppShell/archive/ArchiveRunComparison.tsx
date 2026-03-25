import { glassPanel, hudTheme, monoText, sectionTitle } from '../../HUD/hudTheme';
import { ArchivedRunDetail } from '../../../types/runArchive';

/** Palette of 4 distinct accent colors for up to 4 compared runs. */
const RUN_ACCENTS = [hudTheme.cyanSoft, hudTheme.amberSoft, '#a78bfa', '#86efac'] as const;

export function ArchiveRunComparison({
  runs,
  loading,
}: {
  runs: ArchivedRunDetail[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <section style={styles.wrap}>
        <div style={styles.message}>Loading comparison data…</div>
      </section>
    );
  }

  if (runs.length < 2) {
    return (
      <section style={styles.wrap}>
        <div style={styles.message}>Select at least 2 runs from the archive list to compare them here.</div>
      </section>
    );
  }

  const maxEvents = Math.max(...runs.map((r) => r.event_count), 1);
  const maxDuration = Math.max(...runs.map((r) => r.duration_s), 1);
  const maxSuccess = Math.max(...runs.map((r) => r.intercept_successes), 1);
  const maxMisses = Math.max(...runs.map((r) => r.intercept_misses), 1);

  return (
    <section style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <div style={sectionTitle}>Run Comparison</div>
          <div style={styles.title}>Side-by-Side Analysis</div>
        </div>
        <div style={styles.legend}>
          {runs.map((run, i) => (
            <div key={run.id} style={styles.legendItem}>
              <span style={{ ...styles.legendDot, background: RUN_ACCENTS[i % RUN_ACCENTS.length] }} />
              <span style={styles.legendLabel}>{run.scenario_name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Top-level headline metrics ── */}
      <div
        style={{
          ...styles.metricGrid,
          gridTemplateColumns: `repeat(${runs.length}, minmax(0, 1fr))`,
        }}
      >
        {runs.map((run, i) => (
          <div key={run.id} style={{ ...styles.metricCard, borderTop: `2px solid ${RUN_ACCENTS[i % RUN_ACCENTS.length]}` }}>
            <div style={{ ...styles.metricRunName, color: RUN_ACCENTS[i % RUN_ACCENTS.length] }}>
              RUN {i + 1}
            </div>
            <div style={styles.metricRunScenario}>{run.scenario_name}</div>
            <div style={styles.metricRunSession}>{run.session_id}</div>
            <div style={styles.metricRowGrid}>
              <MetricCell label="Duration" value={`${Math.round(run.duration_s)}S`} />
              <MetricCell label="Events" value={String(run.event_count)} />
              <MetricCell label="Successes" value={String(run.intercept_successes)} tone="cyan" />
              <MetricCell label="Misses" value={String(run.intercept_misses)} tone="red" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Bar chart comparisons ── */}
      <div style={styles.barsSection}>
        <div style={sectionTitle}>Metric Comparison</div>
        <div style={styles.barGroup}>
          <CompareBar label="Duration (S)" runs={runs} getValue={(r) => r.duration_s} max={maxDuration} format={(v) => `${Math.round(v)}S`} />
          <CompareBar label="Event Count" runs={runs} getValue={(r) => r.event_count} max={maxEvents} format={(v) => String(v)} />
          <CompareBar label="Intercept Successes" runs={runs} getValue={(r) => r.intercept_successes} max={maxSuccess} format={(v) => String(v)} tone="cyan" />
          <CompareBar label="Intercept Misses" runs={runs} getValue={(r) => r.intercept_misses} max={maxMisses} format={(v) => String(v)} tone="red" />
        </div>
      </div>

      {/* ── Intercept rate comparison ── */}
      <div style={styles.rateSection}>
        <div style={sectionTitle}>Intercept Rate</div>
        <div style={styles.rateGrid}>
          {runs.map((run, i) => {
            const total = run.intercept_successes + run.intercept_misses;
            const rate = total === 0 ? 0 : run.intercept_successes / total;
            return (
              <div key={run.id} style={styles.rateCard}>
                <div style={{ ...styles.rateName, color: RUN_ACCENTS[i % RUN_ACCENTS.length] }}>RUN {i + 1}</div>
                <div style={styles.rateBarTrack}>
                  <div
                    style={{
                      ...styles.rateBarFill,
                      width: `${Math.round(rate * 100)}%`,
                      background: RUN_ACCENTS[i % RUN_ACCENTS.length],
                    }}
                  />
                </div>
                <div style={styles.rateLabel}>{total === 0 ? 'NO_INTERCEPTS' : `${Math.round(rate * 100)}%`}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Event breakdown comparison ── */}
      <div style={styles.breakdownSection}>
        <div style={sectionTitle}>Event Type Distribution</div>
        <div style={styles.breakdownGrid}>
          {runs.map((run, i) => (
            <div key={run.id} style={styles.breakdownCard}>
              <div style={{ ...styles.breakdownRunLabel, color: RUN_ACCENTS[i % RUN_ACCENTS.length] }}>RUN {i + 1}</div>
              {run.event_breakdown.map((row) => (
                <div key={row.label} style={styles.breakdownRow}>
                  <div style={styles.breakdownRowTop}>
                    <span style={styles.breakdownLabel}>{row.label}</span>
                    <span style={styles.breakdownCount}>{row.count}</span>
                  </div>
                  <div style={styles.barTrack}>
                    <div
                      style={{
                        ...styles.barFill,
                        width: `${Math.round((row.count / Math.max(run.event_count, 1)) * 100)}%`,
                        background:
                          row.tone === 'cyan' ? hudTheme.cyan
                          : row.tone === 'amber' ? hudTheme.amber
                          : hudTheme.red,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CompareBar({
  label,
  runs,
  getValue,
  max,
  format,
  tone,
}: {
  label: string;
  runs: ArchivedRunDetail[];
  getValue: (run: ArchivedRunDetail) => number;
  max: number;
  format: (v: number) => string;
  tone?: 'cyan' | 'red';
}) {
  return (
    <div style={styles.compareBarRow}>
      <div style={styles.compareBarLabel}>{label}</div>
      <div style={styles.compareBarList}>
        {runs.map((run, i) => {
          const value = getValue(run);
          const pct = max === 0 ? 0 : Math.max(4, Math.round((value / max) * 100));
          const accent = tone === 'cyan' ? hudTheme.cyanSoft : tone === 'red' ? hudTheme.redSoft : RUN_ACCENTS[i % RUN_ACCENTS.length];
          return (
            <div key={run.id} style={styles.compareBarEntry}>
              <div style={{ ...styles.runDot, background: accent }} />
              <div style={styles.compareBarTrack}>
                <div style={{ ...styles.compareBarFill, width: `${pct}%`, background: accent }} />
              </div>
              <div style={{ ...styles.compareBarValue, color: accent }}>{format(value)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'cyan' | 'red';
}) {
  const color = tone === 'cyan' ? hudTheme.cyanSoft : tone === 'red' ? hudTheme.redSoft : hudTheme.text;
  return (
    <div style={styles.metricCell}>
      <div style={styles.metricCellLabel}>{label}</div>
      <div style={{ ...styles.metricCellValue, color }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    ...glassPanel,
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minHeight: 0,
    overflow: 'auto',
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
  legend: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    paddingTop: 4,
  },
  legendItem: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  legendLabel: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 11,
    letterSpacing: '0.1em',
  },
  message: {
    padding: '24px 16px',
    background: 'rgba(255,255,255,0.03)',
    color: hudTheme.muted,
    lineHeight: 1.6,
  },
  metricGrid: {
    display: 'grid',
    gap: 12,
  },
  metricCard: {
    background: 'rgba(255,255,255,0.03)',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  metricRunName: {
    ...monoText,
    fontSize: 10,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
  },
  metricRunScenario: {
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 16,
    lineHeight: 1.2,
    marginTop: 2,
  },
  metricRunSession: {
    ...monoText,
    color: hudTheme.faint,
    fontSize: 10,
    letterSpacing: '0.1em',
  },
  metricRowGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 6,
    marginTop: 8,
  },
  metricCell: {
    background: 'rgba(255,255,255,0.03)',
    padding: '8px 8px',
  },
  metricCellLabel: {
    ...monoText,
    color: hudTheme.faint,
    fontSize: 9,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  metricCellValue: {
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 18,
    marginTop: 4,
    lineHeight: 1,
  },
  barsSection: {
    background: 'rgba(255,255,255,0.02)',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  barGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  compareBarRow: {
    display: 'grid',
    gridTemplateColumns: '160px minmax(0, 1fr)',
    gap: 12,
    alignItems: 'start',
  },
  compareBarLabel: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    paddingTop: 8,
  },
  compareBarList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  compareBarEntry: {
    display: 'grid',
    gridTemplateColumns: '8px minmax(0, 1fr) 52px',
    gap: 8,
    alignItems: 'center',
  },
  runDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    marginTop: 1,
  },
  compareBarTrack: {
    height: 8,
    background: 'rgba(255,255,255,0.06)',
  },
  compareBarFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  compareBarValue: {
    ...monoText,
    fontSize: 10,
    letterSpacing: '0.1em',
    textAlign: 'right',
  },
  rateSection: {
    background: 'rgba(255,255,255,0.02)',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  rateGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  rateCard: {
    display: 'grid',
    gridTemplateColumns: '52px minmax(0, 1fr) 64px',
    gap: 10,
    alignItems: 'center',
  },
  rateName: {
    ...monoText,
    fontSize: 10,
    letterSpacing: '0.14em',
  },
  rateBarTrack: {
    height: 10,
    background: 'rgba(255,255,255,0.06)',
  },
  rateBarFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  rateLabel: {
    ...monoText,
    color: hudTheme.text,
    fontSize: 12,
    textAlign: 'right',
    letterSpacing: '0.1em',
  },
  breakdownSection: {
    background: 'rgba(255,255,255,0.02)',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  breakdownGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 10,
  },
  breakdownCard: {
    background: 'rgba(255,255,255,0.03)',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  breakdownRunLabel: {
    ...monoText,
    fontSize: 10,
    letterSpacing: '0.16em',
  },
  breakdownRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  breakdownRowTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
  },
  breakdownLabel: {
    color: hudTheme.muted,
    fontSize: 11,
  },
  breakdownCount: {
    ...monoText,
    color: hudTheme.text,
    fontSize: 11,
  },
  barTrack: {
    height: 5,
    background: 'rgba(255,255,255,0.05)',
  },
  barFill: {
    height: '100%',
  },
};
