import { useMemo } from 'react';
import { usePlacementStore } from '../../store/placementStore';
import { useScenarioStore } from '../../store/scenarioStore';
import { useSimulationStore } from '../../store/simulationStore';
import { formatSimTime } from '../../utils/timeUtils';
import { ScenarioSelector } from '../ScenarioSelector/ScenarioSelector';
import { AlertRow, HudSnapshot } from '../HUD/hudSelectors';
import { glassPanel, hudTheme, monoText, sectionTitle } from '../HUD/hudTheme';

export function OverviewPage({
  snapshot,
  onGoToMonitor,
  onGoToReplay,
  onSelectAlert,
}: {
  snapshot: HudSnapshot;
  onGoToMonitor: () => void;
  onGoToReplay: () => void;
  onSelectAlert: (alert: AlertRow) => void;
}) {
  const activeScenario = useScenarioStore((state) => state.activeScenario);
  const placements = usePlacementStore((state) => state.placements);
  const phase = usePlacementStore((state) => state.phase);
  const { status, connectionStatus } = useSimulationStore((state) => ({
    status: state.status,
    connectionStatus: state.connectionStatus,
  }));

  const topAlerts = snapshot.alerts.slice(0, 4);
  const queuedLaunches = placements.filter((placement) => placement.kind === 'missile').length;
  const queuedAssets = placements.filter((placement) => placement.kind === 'asset').length;

  const currentRunSummary = useMemo(() => {
    if (!activeScenario) {
      return {
        title: 'No Scenario Loaded',
        subtitle: 'Choose a library scenario below or return to the builder to stage a custom run.',
      };
    }

    return {
      title: activeScenario.metadata.name,
      subtitle: activeScenario.metadata.description,
    };
  }, [activeScenario]);

  return (
    <div style={styles.layout}>
      <section style={styles.hero}>
        <div style={styles.heroLeft}>
          <div style={styles.eyebrow}>Mission Entry Surface</div>
          <h1 style={styles.title}>Choose the next scenario before diving back into the noise.</h1>
          <p style={styles.copy}>
            Overview is now the command-center foyer. It keeps the current run legible, surfaces the scenario library,
            and makes the custom builder path obvious without forcing every control onto the live monitor.
          </p>
          <div style={styles.heroActions}>
            <button onClick={onGoToMonitor} style={styles.primaryButton}>OPEN_MONITOR</button>
            <button onClick={onGoToReplay} style={styles.secondaryButton}>OPEN_REPLAY</button>
          </div>
        </div>

        <div style={styles.heroStatus}>
          <div style={styles.heroStatusHeader}>
            <div>
              <div style={sectionTitle}>Current Run</div>
              <div style={styles.heroStatusTitle}>{currentRunSummary.title}</div>
            </div>
            <div style={styles.statusChips}>
              <StatusChip label={status.toUpperCase()} tone="cyan" />
              <StatusChip label={connectionStatus.toUpperCase()} tone={connectionStatus === 'connected' ? 'cyan' : 'amber'} />
            </div>
          </div>
          <div style={styles.heroStatusCopy}>{currentRunSummary.subtitle}</div>
          <div style={styles.heroMetaGrid}>
            <MetaValue label="Session" value={snapshot.sessionLabel} />
            <MetaValue label="Threats" value={String(snapshot.metrics.totalTracks)} />
            <MetaValue label="Assets" value={String(snapshot.metrics.totalAssets)} />
            <MetaValue label="Duration" value={formatSimTime(activeScenario?.metadata.duration_s ?? 0)} />
          </div>
        </div>
      </section>

      <section style={styles.summaryGrid}>
        <SummaryStat label="Active Tracks" value={`${snapshot.metrics.activeTracks}/${snapshot.metrics.totalTracks}`} tone={hudTheme.cyanSoft} />
        <SummaryStat label="Defense Assets" value={String(snapshot.metrics.totalAssets)} tone={hudTheme.amberSoft} />
        <SummaryStat label="Tracked Threats" value={String(snapshot.metrics.trackedThreats)} tone={hudTheme.cyanSoft} />
        <SummaryStat label="Intercept Balance" value={`${snapshot.metrics.interceptSuccesses}:${snapshot.metrics.interceptMisses}`} tone={hudTheme.text} />
      </section>

      <section style={styles.workflowGrid}>
        <div style={styles.workflowCard}>
          <div style={styles.workflowHeader}>
            <div>
              <div style={sectionTitle}>Live Status</div>
              <div style={styles.workflowTitle}>Current Scenario Health</div>
            </div>
            <div style={styles.workflowRail}>{snapshot.scenarioLabel}</div>
          </div>

          <div style={styles.workflowRows}>
            <WorkflowRow
              label="Selection"
              value={snapshot.selection.kind === 'none' ? 'NO_SELECTION' : snapshot.selection.title.toUpperCase()}
            />
            <WorkflowRow
              label="Recent Event"
              value={(snapshot.selection.latestEventLabel ?? topAlerts[0]?.title ?? 'NO_RUNTIME_ACTIVITY').toUpperCase()}
              tone={topAlerts[0]?.tone}
            />
            <WorkflowRow
              label="Batteries Engaging"
              value={String(snapshot.metrics.batteriesEngaging)}
              tone="cyan"
            />
          </div>
        </div>

        <div style={styles.workflowCard}>
          <div style={styles.workflowHeader}>
            <div>
              <div style={sectionTitle}>Create Your Own</div>
              <div style={styles.workflowTitle}>Custom Builder Path</div>
            </div>
            <div style={styles.workflowRail}>GLOBE_PLACEMENT</div>
          </div>

          <div style={styles.builderNote}>
            Build a fictional run from the globe by placing launches, sensors, and defensive batteries. Queue delayed launches
            and let the simulation resolve the scenario as a single session.
          </div>

          <div style={styles.builderList}>
            <BuilderStep index="01" text="Place launch origins and targets directly on the globe." />
            <BuilderStep index="02" text="Drop radars and interceptor batteries anywhere in the theater." />
            <BuilderStep index="03" text="Stagger launch times to create more readable interception stories." />
          </div>

          <div style={styles.builderFooter}>
            <MetaValue label="Queued Launches" value={String(queuedLaunches)} />
            <MetaValue label="Queued Assets" value={String(queuedAssets)} />
            <MetaValue label="Builder State" value={phase.toUpperCase()} />
          </div>
        </div>
      </section>

      <section style={styles.lowerGrid}>
        <div style={styles.libraryCard}>
          <div style={styles.libraryHeader}>
            <div>
              <div style={sectionTitle}>Scenario Library</div>
              <div style={styles.libraryTitle}>Prebuilt Fictional Runs</div>
            </div>
            <div style={styles.libraryHint}>LOAD_DEFINITION</div>
          </div>
          <ScenarioSelector variant="overview" />
        </div>

        <div style={styles.alertCard}>
          <div style={styles.panelHeader}>
            <div>
              <div style={sectionTitle}>Focused Alerts</div>
              <div style={styles.panelTitle}>What Deserves Attention Now</div>
            </div>
            <div style={styles.panelHint}>{topAlerts.length} visible</div>
          </div>

          <div style={styles.alertList}>
            {topAlerts.map((alert) => (
              <button key={alert.id} onClick={() => onSelectAlert(alert)} style={styles.alertRow}>
                <div style={styles.alertTop}>
                  <span
                    style={{
                      ...styles.alertTitle,
                      color:
                        alert.tone === 'cyan'
                          ? hudTheme.cyanSoft
                          : alert.tone === 'amber'
                            ? hudTheme.amberSoft
                            : hudTheme.redSoft,
                    }}
                  >
                    {alert.title}
                  </span>
                  <span style={styles.alertTime}>{formatSimTime(alert.simTimeS)}</span>
                </div>
                <div style={styles.alertSubtitle}>{alert.subtitle}</div>
              </button>
            ))}

            {topAlerts.length === 0 && (
              <div style={styles.emptyState}>
                <div style={styles.emptyTitle}>No Immediate Alerts</div>
                <div style={styles.emptyCopy}>
                  The current run is quiet at this moment. Use the scenario library to preload another run or switch to replay for detailed event review.
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color: tone }}>{value}</div>
    </div>
  );
}

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: 'cyan' | 'amber';
}) {
  return (
    <span
      style={{
        ...styles.statusChip,
        color: tone === 'cyan' ? hudTheme.cyanSoft : hudTheme.amberSoft,
        borderColor: tone === 'cyan' ? hudTheme.line : 'rgba(255, 215, 153, 0.16)',
      }}
    >
      {label}
    </span>
  );
}

function MetaValue({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metaCell}>
      <div style={styles.metaLabel}>{label}</div>
      <div style={styles.metaValue}>{value}</div>
    </div>
  );
}

function WorkflowRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'cyan' | 'amber' | 'red';
}) {
  return (
    <div style={styles.workflowRow}>
      <span style={styles.workflowLabel}>{label}</span>
      <span
        style={{
          ...styles.workflowValue,
          color:
            tone === 'cyan'
              ? hudTheme.cyanSoft
              : tone === 'amber'
                ? hudTheme.amberSoft
                : tone === 'red'
                  ? hudTheme.redSoft
                  : hudTheme.text,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function BuilderStep({ index, text }: { index: string; text: string }) {
  return (
    <div style={styles.builderStep}>
      <span style={styles.builderIndex}>{index}</span>
      <span style={styles.builderText}>{text}</span>
    </div>
  );
}

const panelBase: React.CSSProperties = {
  ...glassPanel,
  padding: 18,
  pointerEvents: 'auto',
};

const styles: Record<string, React.CSSProperties> = {
  layout: {
    position: 'absolute',
    inset: '96px 20px 24px 20px',
    display: 'grid',
    gridTemplateRows: 'auto auto auto minmax(0, 1fr)',
    gap: 18,
    pointerEvents: 'auto',
  },
  hero: {
    display: 'grid',
    gridTemplateColumns: '1.25fr 0.95fr',
    gap: 18,
    alignItems: 'stretch',
  },
  heroLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: '20px 4px 14px',
  },
  eyebrow: {
    ...monoText,
    color: hudTheme.cyan,
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    fontSize: 11,
  },
  title: {
    margin: 0,
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 46,
    lineHeight: 1.02,
    maxWidth: 700,
  },
  copy: {
    color: hudTheme.muted,
    fontSize: 15,
    lineHeight: 1.7,
    maxWidth: 620,
    margin: 0,
  },
  heroActions: {
    display: 'flex',
    gap: 12,
    marginTop: 4,
  },
  primaryButton: {
    border: 'none',
    background: hudTheme.cyan,
    color: '#081016',
    padding: '12px 18px',
    letterSpacing: '0.16em',
    fontSize: 11,
    cursor: 'pointer',
  },
  secondaryButton: {
    border: `1px solid ${hudTheme.line}`,
    background: 'rgba(10,16,22,0.72)',
    color: hudTheme.text,
    padding: '12px 18px',
    letterSpacing: '0.16em',
    fontSize: 11,
    cursor: 'pointer',
  },
  heroStatus: {
    ...panelBase,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    minHeight: 0,
  },
  heroStatusHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  heroStatusTitle: {
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 28,
    lineHeight: 1.05,
    marginTop: 4,
  },
  heroStatusCopy: {
    color: hudTheme.muted,
    fontSize: 13,
    lineHeight: 1.65,
  },
  statusChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  statusChip: {
    ...monoText,
    border: '1px solid',
    padding: '8px 10px',
    fontSize: 10,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    background: 'rgba(255,255,255,0.03)',
  },
  heroMetaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
  },
  metaCell: {
    background: 'rgba(255,255,255,0.03)',
    padding: '12px 12px 10px',
  },
  metaLabel: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
  },
  metaValue: {
    ...monoText,
    color: hudTheme.text,
    fontSize: 16,
    marginTop: 8,
    lineHeight: 1.4,
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 14,
  },
  statCard: {
    ...panelBase,
    minHeight: 102,
  },
  statLabel: {
    ...monoText,
    color: hudTheme.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    fontSize: 10,
  },
  statValue: {
    ...monoText,
    fontSize: 34,
    marginTop: 22,
  },
  workflowGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 18,
  },
  workflowCard: {
    ...panelBase,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  workflowHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  workflowTitle: {
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 22,
    lineHeight: 1.05,
    marginTop: 4,
  },
  workflowRail: {
    ...monoText,
    color: hudTheme.cyanSoft,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    paddingTop: 2,
  },
  workflowRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  workflowRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    padding: '11px 12px',
    background: 'rgba(255,255,255,0.03)',
  },
  workflowLabel: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
  },
  workflowValue: {
    ...monoText,
    color: hudTheme.text,
    fontSize: 12,
    textAlign: 'right',
    maxWidth: '68%',
  },
  builderNote: {
    color: hudTheme.muted,
    fontSize: 13,
    lineHeight: 1.65,
  },
  builderList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  builderStep: {
    display: 'grid',
    gridTemplateColumns: '32px minmax(0, 1fr)',
    gap: 12,
    alignItems: 'start',
    background: 'rgba(255,255,255,0.03)',
    padding: '11px 12px',
  },
  builderIndex: {
    ...monoText,
    color: hudTheme.amberSoft,
    fontSize: 11,
    letterSpacing: '0.14em',
  },
  builderText: {
    color: hudTheme.text,
    fontSize: 13,
    lineHeight: 1.55,
  },
  builderFooter: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 10,
  },
  lowerGrid: {
    display: 'grid',
    gridTemplateColumns: '1.35fr 0.85fr',
    gap: 18,
    minHeight: 0,
  },
  libraryCard: {
    ...panelBase,
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr)',
    gap: 14,
    minHeight: 0,
  },
  libraryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'flex-start',
  },
  libraryTitle: {
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 24,
    lineHeight: 1.05,
    marginTop: 4,
  },
  libraryHint: {
    ...monoText,
    color: hudTheme.cyanSoft,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    paddingTop: 3,
  },
  alertCard: {
    ...panelBase,
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr)',
    gap: 14,
    minHeight: 0,
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
  },
  panelTitle: {
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 22,
    lineHeight: 1.05,
    marginTop: 4,
  },
  panelHint: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    paddingTop: 2,
  },
  alertList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minHeight: 0,
    overflowY: 'auto',
  },
  alertRow: {
    border: 'none',
    background: 'rgba(255,255,255,0.03)',
    color: hudTheme.text,
    textAlign: 'left',
    padding: '12px 14px',
    cursor: 'pointer',
  },
  alertTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
  },
  alertTitle: {
    ...monoText,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    fontSize: 11,
  },
  alertTime: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 11,
  },
  alertSubtitle: {
    color: hudTheme.text,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 1.5,
  },
  emptyState: {
    background: 'rgba(255,255,255,0.03)',
    padding: '16px 14px',
  },
  emptyTitle: {
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 18,
  },
  emptyCopy: {
    color: hudTheme.muted,
    fontSize: 13,
    lineHeight: 1.6,
    marginTop: 8,
  },
};
