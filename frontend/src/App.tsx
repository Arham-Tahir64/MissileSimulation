import { GlobeViewer } from './components/GlobeViewer/GlobeViewer';
import { ScenarioSelector } from './components/ScenarioSelector/ScenarioSelector';
import { InfoPanel } from './components/InfoPanel/InfoPanel';
import { PlaybackControls } from './components/Playback/PlaybackControls';

export function App() {
  return (
    <div style={styles.root}>
      {/* Sidebar: scenario list */}
      <ScenarioSelector />

      {/* Main: globe + playback controls */}
      <div style={styles.main}>
        <div style={styles.globe}>
          <GlobeViewer />
        </div>
        <PlaybackControls />
      </div>

      {/* Right panel: live info + event log */}
      <InfoPanel />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'row',
    background: '#0a0a0f',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    color: '#e2e8f0',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  globe: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
};
