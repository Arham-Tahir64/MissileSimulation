import { usePlacementStore } from '../../store/placementStore';
import { useScenarioStore } from '../../store/scenarioStore';
import { usePlaybackStore } from '../../store/playbackStore';
import { useCameraStore } from '../../store/cameraStore';
import { wsClient } from '../../services/wsClient';
import { buildScenario } from '../../utils/scenarioBuilder';
import { getMissileTypeConfig, estimateFlightTimeS } from '../../config/missileTypes';
import { haversineDistanceM } from '../../utils/cesiumHelpers';

export function LaunchPanel() {
  const {
    phase,
    missileType,
    origin,
    target,
    launchTimeS,
    placements,
    setDraftLaunchTime,
    addCurrentPlacement,
    removePlacement,
    updatePlacementLaunchTime,
    beginSimulation,
    clearCurrent,
    reset,
  } = usePlacementStore();
  const { setActiveScenario } = useScenarioStore();
  const { setDuration, setPlaying } = usePlaybackStore();
  const primeFollow = useCameraStore((s) => s.primeFollow);

  const draftReady = phase === 'target_set' && Boolean(missileType && origin && target);
  const draftPlacement = draftReady && missileType && origin && target
    ? { id: 'draft', missileType, origin, target, launchTimeS }
    : null;
  const scenarioPlacements = [
    ...placements.map(({ id: _id, ...placement }) => placement),
    ...(draftPlacement ? [{ ...draftPlacement, id: undefined }].map(({ id: _id, ...placement }) => placement) : []),
  ];

  if (phase === 'simulating' || (placements.length === 0 && !draftPlacement)) return null;

  const handleLaunch = () => {
    if (scenarioPlacements.length === 0) return;

    const orderedPlacements = [...scenarioPlacements].sort(
      (a, b) => (a.launchTimeS ?? 0) - (b.launchTimeS ?? 0),
    );
    const scenario = buildScenario(orderedPlacements);

    setActiveScenario(scenario);
    setDuration(scenario.metadata.duration_s);
    setPlaying(true);
    primeFollow(scenario.entities[0]?.id ?? null);

    wsClient.connect(`session_${Date.now()}`);
    wsClient.send({ type: 'cmd_load_definition', definition: scenario });
    wsClient.send({ type: 'cmd_play', playback_speed: 1.0 });

    beginSimulation();
  };

  const totalCount = scenarioPlacements.length;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Launch Queue</div>
          <div style={styles.subtitle}>
            {totalCount} missile{totalCount === 1 ? '' : 's'} configured
          </div>
        </div>
        <div style={styles.headerActions}>
          {draftPlacement && (
            <button onClick={clearCurrent} style={styles.secondaryBtn}>Cancel Current</button>
          )}
          <button onClick={reset} style={styles.secondaryBtn}>Reset All</button>
          <button onClick={handleLaunch} style={styles.launchBtn}>Launch Scenario</button>
        </div>
      </div>

      <div style={styles.queue}>
        {placements.map((placement, index) => (
          <PlacementCard
            key={placement.id}
            placement={placement}
            index={index}
            onDelayChange={(value) => updatePlacementLaunchTime(placement.id, value)}
            onRemove={() => removePlacement(placement.id)}
            showQueueActions
          />
        ))}

        {draftPlacement && (
          <PlacementCard
            placement={draftPlacement}
            index={placements.length}
            onDelayChange={setDraftLaunchTime}
            onRemove={clearCurrent}
            showQueueActions={false}
            footerAction={(
              <button onClick={addCurrentPlacement} style={styles.queueBtn}>
                Queue Missile
              </button>
            )}
          />
        )}
      </div>
    </div>
  );
}

function PlacementCard({
  placement,
  index,
  onDelayChange,
  onRemove,
  showQueueActions,
  footerAction,
}: {
  placement: {
    id: string;
    missileType: ReturnType<typeof usePlacementStore.getState>['placements'][number]['missileType'];
    origin: ReturnType<typeof usePlacementStore.getState>['placements'][number]['origin'];
    target: ReturnType<typeof usePlacementStore.getState>['placements'][number]['target'];
    launchTimeS: number;
  };
  index: number;
  onDelayChange: (value: number) => void;
  onRemove: () => void;
  showQueueActions: boolean;
  footerAction?: React.ReactNode;
}) {
  const cfg = getMissileTypeConfig(placement.missileType);
  const distanceM = haversineDistanceM(placement.origin, placement.target);
  const flightTimeS = estimateFlightTimeS(cfg, distanceM);

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <div style={{ ...styles.cardTitle, color: cfg.cssColor }}>
            {cfg.label}
          </div>
          <div style={styles.cardMeta}>
            Track {index + 1} // {(distanceM / 1_000).toFixed(0)} km // {Math.ceil(flightTimeS)} s flight
          </div>
        </div>
        <button onClick={onRemove} style={styles.removeBtn}>
          {showQueueActions ? 'Remove' : 'Discard'}
        </button>
      </div>

      <div style={styles.stats}>
        <Stat label="Origin" value={`${placement.origin.lat.toFixed(1)}, ${placement.origin.lon.toFixed(1)}`} />
        <Stat label="Target" value={`${placement.target.lat.toFixed(1)}, ${placement.target.lon.toFixed(1)}`} />
        <label style={styles.delayField}>
          <span style={styles.delayLabel}>Launch Delay (s)</span>
          <input
            type="number"
            min={0}
            step={1}
            value={placement.launchTimeS}
            onChange={(e) => onDelayChange(parseFloat(e.target.value) || 0)}
            style={styles.delayInput}
          />
        </label>
      </div>

      {footerAction && (
        <div style={styles.cardFooter}>
          {footerAction}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.stat}>
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    padding: '14px 18px',
    background: 'rgba(8,8,18,0.94)',
    backdropFilter: 'blur(12px)',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 18,
  },
  title: {
    color: '#e2e8f0',
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  subtitle: {
    color: '#7f94a3',
    fontSize: 11,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  headerActions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  queue: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 12,
  },
  card: {
    background: 'rgba(14,20,28,0.82)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 700,
  },
  cardMeta: {
    color: '#70818e',
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 10,
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  statLabel: {
    color: '#718096',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  statValue: {
    color: '#e2e8f0',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  delayField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  delayLabel: {
    color: '#718096',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  delayInput: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#e2e8f0',
    borderRadius: 4,
    padding: '7px 8px',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  secondaryBtn: {
    background: 'none',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#a0aec0',
    borderRadius: 6,
    padding: '8px 14px',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'monospace',
  },
  queueBtn: {
    background: 'rgba(99,179,237,0.12)',
    border: '1px solid rgba(99,179,237,0.4)',
    color: '#8fd3ff',
    borderRadius: 6,
    padding: '8px 14px',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'monospace',
    letterSpacing: '0.06em',
  },
  launchBtn: {
    background: 'rgba(0,229,255,0.12)',
    border: '1px solid rgba(0,229,255,0.45)',
    borderRadius: 6,
    padding: '8px 18px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'monospace',
    color: '#dff8ff',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  removeBtn: {
    background: 'none',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 4,
    color: '#8ca0ae',
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: 11,
  },
};
