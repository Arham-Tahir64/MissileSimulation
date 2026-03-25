import { GlobeViewer } from './components/GlobeViewer/GlobeViewer';
import { MissileTypePicker } from './components/MissileTypePicker/MissileTypePicker';
import { LaunchPanel } from './components/Launch/LaunchPanel';
import { InfoPanel } from './components/InfoPanel/InfoPanel';
import { PlaybackControls } from './components/Playback/PlaybackControls';
import { usePlacementStore } from './store/placementStore';
import { useSimulationStore } from './store/simulationStore';

/**
 * Full-screen globe layout with floating overlay panels.
 *
 * Layer z-order (bottom → top):
 *  1. Globe canvas (fills 100vw × 100vh)
 *  2. Placement / simulation overlay panels
 *  3. Playback bar + launch panel (bottom strip)
 */
export function App() {
  const phase  = usePlacementStore((s) => s.phase);
  const status = useSimulationStore((s) => s.status);

  const showPlayback = phase === 'simulating' || status !== 'idle';

  return (
    <div style={styles.root}>
      {/* ── Globe — fills entire viewport ──────────────────────────── */}
      <div style={styles.globe}>
        <GlobeViewer />
      </div>

      {/* ── Top-left: missile type picker ──────────────────────────── */}
      <div style={styles.topLeft}>
        <MissileTypePicker />
      </div>

      {/* ── Top-right: live simulation info ────────────────────────── */}
      {(phase === 'simulating' || status !== 'idle') && (
        <div style={styles.topRight}>
          <InfoPanel />
        </div>
      )}

      {/* ── Bottom strip: launch confirmation OR playback controls ──── */}
      <div style={styles.bottom}>
        {phase === 'target_set' && <LaunchPanel />}
        {showPlayback && <PlaybackControls />}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'relative',
    width:  '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: '#000',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    color: '#e2e8f0',
  },
  globe: {
    position: 'absolute',
    inset: 0,
  },
  topLeft: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },
  topRight: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
  },
};
