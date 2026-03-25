import { useEffect, useMemo, useState } from 'react';
import { ReplayEventMarker, HudSnapshot, AlertRow } from '../HUD/hudSelectors';
import { SelectionDetailPanel } from '../HUD/SelectionDetailPanel';
import { ReplayTimelineBar } from '../HUD/ReplayTimelineBar';
import { glassPanel, hudTheme } from '../HUD/hudTheme';
import { usePlayback } from '../Playback/usePlayback';
import { usePlaybackStore } from '../../store/playbackStore';
import { ReplayBookmarkPanel } from './replay/ReplayBookmarkPanel';
import { ReplayEventInspector } from './replay/ReplayEventInspector';
import { ReplayMomentPanel } from './replay/ReplayMomentPanel';
import {
  buildBookmarkId,
  countReplayEvents,
  filterAlerts,
  filterMarkers,
  getActiveMomentAlert,
  getNearestAlerts,
  ReplayEventFilter,
} from './replay/replayUtils';

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
  const { bookmarks, addBookmark, removeBookmark, clearBookmarks } = usePlaybackStore();
  const [activeFilter, setActiveFilter] = useState<ReplayEventFilter>('all');

  useEffect(() => {
    if (durationS <= 0 && bookmarks.length > 0) {
      clearBookmarks();
    }
  }, [bookmarks.length, clearBookmarks, durationS]);

  const visibleAlerts = useMemo(
    () => filterAlerts(snapshot.alerts, activeFilter),
    [activeFilter, snapshot.alerts],
  );
  const visibleMarkers = useMemo(
    () => filterMarkers(markers, activeFilter),
    [activeFilter, markers],
  );
  const nearestAlerts = useMemo(
    () => getNearestAlerts(visibleAlerts, simTimeS, 5),
    [simTimeS, visibleAlerts],
  );
  const activeMoment = useMemo(
    () => getActiveMomentAlert(visibleAlerts, simTimeS),
    [simTimeS, visibleAlerts],
  );
  const counts = useMemo(
    () => countReplayEvents(snapshot.alerts),
    [snapshot.alerts],
  );

  const handleAddBookmark = () => {
    const sourceEvent = activeMoment ?? nearestAlerts[0] ?? null;
    addBookmark({
      id: buildBookmarkId(simTimeS, sourceEvent?.event.event_id),
      simTimeS,
      eventId: sourceEvent?.event.event_id ?? null,
      label: sourceEvent ? sourceEvent.title : snapshot.selection.kind === 'none' ? 'Replay Bookmark' : snapshot.selection.title,
    });
  };

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
        <div style={styles.railStack}>
          <ReplayMomentPanel
            simTimeS={simTimeS}
            activeEvent={activeMoment}
            nearestEvents={nearestAlerts}
            selection={snapshot.selection}
            metrics={snapshot.metrics}
            counts={counts}
          />
          <ReplayEventInspector
            alerts={visibleAlerts}
            activeFilter={activeFilter}
            currentTimeS={simTimeS}
            onChangeFilter={setActiveFilter}
            onSelectAlert={onSelectAlert}
          />
        </div>
      </aside>

      <aside style={styles.rightRail}>
        <div style={styles.railStack}>
          {snapshot.selection.kind !== 'none' && (
          <SelectionDetailPanel selection={snapshot.selection} />
          )}
          <ReplayBookmarkPanel
            bookmarks={bookmarks}
            activeTimeS={simTimeS}
            onAddBookmark={handleAddBookmark}
            onSelectBookmark={(bookmark) => seek(bookmark.simTimeS)}
            onRemoveBookmark={removeBookmark}
            onClearBookmarks={clearBookmarks}
          />
        </div>
      </aside>

      <div style={styles.bottomDock}>
        <ReplayTimelineBar
          isPlaying={isPlaying}
          status={status}
          speed={speed}
          durationS={durationS}
          fraction={fraction}
          markers={visibleMarkers}
          bookmarks={bookmarks}
          showAlerts={showAlerts}
          activeFilterLabel={activeFilter}
          onTogglePlay={toggle}
          onSeekFraction={(nextFraction) => seek(nextFraction * durationS)}
          onSpeedChange={changeSpeed}
          onSelectMarker={onSelectMarker}
          onSelectBookmark={(bookmark) => seek(bookmark.simTimeS)}
        />
        <div style={styles.contextStrip}>
          <span>{snapshot.selection.kind === 'none' ? 'NO_SELECTION' : snapshot.selection.title}</span>
          <span>{activeMoment?.subtitle ?? snapshot.selection.latestEventLabel ?? 'SELECT_A_TRACK_OR_ASSET'}</span>
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
    width: 380,
    pointerEvents: 'auto',
  },
  rightRail: {
    position: 'absolute',
    top: 82,
    right: 0,
    bottom: 146,
    width: 380,
    pointerEvents: 'auto',
  },
  railStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    height: '100%',
    minHeight: 0,
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
