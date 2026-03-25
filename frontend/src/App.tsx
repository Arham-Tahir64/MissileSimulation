import { GlobeViewer } from './components/GlobeViewer/GlobeViewer';
import { MissileTypePicker } from './components/MissileTypePicker/MissileTypePicker';
import { LaunchPanel } from './components/Launch/LaunchPanel';
import { TacticalShell } from './components/HUD/TacticalShell';
import { RouterSync } from './router/RouterSync';
import { useEffect, useRef } from 'react';
import { usePlacementStore } from './store/placementStore';
import { useSimulationStore } from './store/simulationStore';
import { useCameraStore } from './store/cameraStore';
import { useDashboardStore } from './store/dashboardStore';

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
  const placements = usePlacementStore((s) => s.placements);
  const status = useSimulationStore((s) => s.status);
  const currentPage = useDashboardStore((s) => s.currentPage);
  const setCurrentPage = useDashboardStore((s) => s.setCurrentPage);
  const resetCamera = useCameraStore((s) => s.reset);
  const resetDashboard = useDashboardStore((s) => s.reset);
  const previousShowShellRef = useRef(false);

  const showSimulationHud = phase === 'simulating' || status !== 'idle' || currentPage !== 'overview';

  useEffect(() => {
    const wasShowingShell = previousShowShellRef.current;
    previousShowShellRef.current = showSimulationHud;

    if (wasShowingShell && phase === 'idle' && status === 'idle' && currentPage === 'overview') {
      resetCamera();
      resetDashboard();
    }
  }, [currentPage, phase, resetCamera, resetDashboard, showSimulationHud, status]);

  return (
    <div style={styles.root}>
      <RouterSync />
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

      {!showSimulationHud && (
        <div style={styles.topRight}>
          <button
            type="button"
            onClick={() => setCurrentPage('archive')}
            style={styles.archiveButton}
          >
            OPEN_ARCHIVE
          </button>
        </div>
      )}

      {!showSimulationHud && (phase === 'target_set' || placements.length > 0) && (
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
  topRight: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  archiveButton: {
    border: '1px solid rgba(0, 229, 255, 0.24)',
    background: 'linear-gradient(180deg, rgba(0,229,255,0.12), rgba(8,10,14,0.84))',
    color: '#dfe2eb',
    padding: '12px 14px',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    fontSize: 11,
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
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
