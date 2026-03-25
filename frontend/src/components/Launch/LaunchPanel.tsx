import { usePlacementStore } from '../../store/placementStore';
import { useScenarioStore } from '../../store/scenarioStore';
import { usePlaybackStore } from '../../store/playbackStore';
import { useCameraStore } from '../../store/cameraStore';
import { wsClient } from '../../services/wsClient';
import { buildScenario } from '../../utils/scenarioBuilder';
import { getMissileTypeConfig, estimateFlightTimeS } from '../../config/missileTypes';
import { haversineDistanceM } from '../../utils/cesiumHelpers';

/**
 * Shown when placement phase === 'target_set'.
 * Builds an inline scenario, sends cmd_load_definition + cmd_play, then
 * advances the placement machine to 'simulating'.
 *
 * Extensible: swap buildScenario([...]) for multi-missile support by adding
 * more entries from the store.
 */
export function LaunchPanel() {
  const { phase, missileType, origin, target, beginSimulation, reset } =
    usePlacementStore();
  const { setActiveScenario } = useScenarioStore();
  const { setDuration, setPlaying } = usePlaybackStore();
  const primeFollow = useCameraStore((s) => s.primeFollow);

  if (phase !== 'target_set') return null;
  if (!missileType || !origin || !target) return null;

  const cfg     = getMissileTypeConfig(missileType);
  const distM   = haversineDistanceM(origin, target);
  const flightS = estimateFlightTimeS(cfg, distM);

  const handleLaunch = () => {
    const scenario = buildScenario([{ missileType, origin, target }]);

    // Register scenario so TrajectoryLayer / InfoPanel have context
    setActiveScenario(scenario);
    setDuration(scenario.metadata.duration_s);
    setPlaying(true);
    primeFollow(scenario.entities[0]?.id ?? null);

    // Open a fresh session, load definition, then play
    wsClient.connect(`session_${Date.now()}`);
    wsClient.send({ type: 'cmd_load_definition', definition: scenario });
    wsClient.send({ type: 'cmd_play', playback_speed: 1.0 });

    beginSimulation();
  };

  return (
    <div style={styles.panel}>
      <div style={styles.info}>
        <Stat label="Type"      value={cfg.label} />
        <Stat label="Range"     value={`${(distM / 1_000).toFixed(0)} km`} />
        <Stat label="Est. time" value={`${Math.ceil(flightS)} s`} />
      </div>
      <div style={styles.actions}>
        <button onClick={reset} style={styles.cancelBtn}>Cancel</button>
        <button
          onClick={handleLaunch}
          style={{ ...styles.launchBtn, borderColor: cfg.cssColor, color: cfg.cssColor }}
        >
          ▶ LAUNCH
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ fontSize: 10, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: '#e2e8f0', fontFamily: 'monospace', fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    padding: '10px 20px',
    background: 'rgba(8,8,18,0.92)',
    backdropFilter: 'blur(10px)',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  info: {
    display: 'flex',
    gap: 24,
    flex: 1,
  },
  actions: {
    display: 'flex',
    gap: 10,
  },
  cancelBtn: {
    background: 'none',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#a0aec0',
    borderRadius: 6,
    padding: '6px 16px',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'monospace',
  },
  launchBtn: {
    background: 'none',
    border: '1px solid',
    borderRadius: 6,
    padding: '6px 22px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'monospace',
    letterSpacing: '0.06em',
  },
};
