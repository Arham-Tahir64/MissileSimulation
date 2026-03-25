import { ReplayEventMarker, HudSnapshot, AlertRow } from '../HUD/hudSelectors';
import { SelectionDetailPanel } from '../HUD/SelectionDetailPanel';
import { AlertFeedPanel } from '../HUD/AlertFeedPanel';
import { ReplayTimelineBar } from '../HUD/ReplayTimelineBar';
import { glassPanel, hudTheme } from '../HUD/hudTheme';
import { usePlayback } from '../Playback/usePlayback';

export function ReplayPage({
  snapshot,
  isPlaying,
  status,
  speed,
  simTimeS,
  durationS,
  fraction,
  markers,
  showAlerts,
  onSelectAlert,
  onSelectMarker,
  onGoToMonitor,
}: {
  snapshot: HudSnapshot;
  isPlaying: boolean;
  status: string;
  speed: number;
  simTimeS: number;
  durationS: number;
  fraction: number;
  markers: ReplayEventMarker[];
  showAlerts: boolean;
  onSelectAlert: (alert: AlertRow) => void;
  onSelectMarker: (marker: ReplayEventMarker) => void;
  onGoToMonitor: () => void;
}) {
  const { toggle, seek, changeSpeed } = usePlayback();

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Replay</div>
          <div style={styles.copy}>
            Replay gets its own workflow. Time, events, and selected state stay synchronized without competing with live monitoring controls.
          </div>
        </div>
        <button onClick={onGoToMonitor} style={styles.button}>RETURN_TO_MONITOR</button>
      </div>

      <aside style={styles.leftRail}>
        <AlertFeedPanel alerts={snapshot.alerts} onSelectAlert={onSelectAlert} />
      </aside>

      {snapshot.selection.kind !== 'none' && (
        <aside style={styles.rightRail}>
          <SelectionDetailPanel selection={snapshot.selection} />
        </aside>
      )}

      <div style={styles.bottomDock}>
        <ReplayTimelineBar
          isPlaying={isPlaying}
          status={status}
          speed={speed}
          durationS={durationS}
          fraction={fraction}
          markers={markers}
          showAlerts={showAlerts}
          onTogglePlay={toggle}
          onSeekFraction={(nextFraction) => seek(nextFraction * durationS)}
          onSpeedChange={changeSpeed}
          onSelectMarker={onSelectMarker}
        />
        <div style={styles.contextStrip}>
          <span>{snapshot.selection.kind === 'none' ? 'NO_SELECTION' : snapshot.selection.title}</span>
          <span>{snapshot.selection.latestEventLabel ?? 'SELECT_A_TRACK_OR_ASSET'}</span>
          <span>T+ {simTimeS.toFixed(1)}s</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'absolute',
    inset: '88px 18px 18px 18px',
    pointerEvents: 'none',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 24,
    alignItems: 'start',
    pointerEvents: 'auto',
  },
  title: {
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 30,
  },
  copy: {
    color: hudTheme.muted,
    fontSize: 14,
    marginTop: 6,
    maxWidth: 560,
    lineHeight: 1.6,
  },
  button: {
    border: `1px solid ${hudTheme.line}`,
    background: 'rgba(10,16,22,0.72)',
    color: hudTheme.text,
    padding: '10px 14px',
    letterSpacing: '0.14em',
    fontSize: 11,
    cursor: 'pointer',
  },
  leftRail: {
    position: 'absolute',
    top: 82,
    left: 0,
    bottom: 146,
    width: 340,
    pointerEvents: 'auto',
  },
  rightRail: {
    position: 'absolute',
    top: 82,
    right: 0,
    bottom: 146,
    width: 360,
    pointerEvents: 'auto',
  },
  bottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  contextStrip: {
    ...glassPanel,
    padding: '12px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    color: hudTheme.muted,
    fontSize: 12,
    pointerEvents: 'auto',
  },
};
