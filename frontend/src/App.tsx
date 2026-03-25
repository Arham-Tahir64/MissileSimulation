import { GlobeViewer } from './components/GlobeViewer/GlobeViewer';
import { MissileTypePicker } from './components/MissileTypePicker/MissileTypePicker';
import { LaunchPanel } from './components/Launch/LaunchPanel';
import { TacticalShell } from './components/HUD/TacticalShell';
import { useEffect } from 'react';
import { usePlacementStore } from './store/placementStore';
import { useSimulationStore } from './store/simulationStore';
import { useCameraStore } from './store/cameraStore';

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
  const resetCamera = useCameraStore((s) => s.reset);

  const showSimulationHud = phase === 'simulating' || status !== 'idle';

  useEffect(() => {
    if (phase === 'idle' && status === 'idle') {
      resetCamera();
    }
  }, [phase, resetCamera, status]);

  return (
    <div style={styles.root}>
      {/* ── Globe — fills entire viewport ──────────────────────────── */}
      <div style={styles.globe}>
        <GlobeViewer />
      </div>

      {/* ── Top-left: missile type picker ──────────────────────────── */}
      {!showSimulationHud && (
        <div style={styles.topLeft}>
          <MissileTypePicker />
        </div>
      )}

      {phase === 'target_set' && (
        <div style={styles.bottom}>
          <LaunchPanel />
        </div>
      )}

      {showSimulationHud && <TacticalShell />}
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
