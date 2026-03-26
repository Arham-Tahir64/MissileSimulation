import { usePlacementStore, PlannedPlacement, PlannedLaunchPlacement } from '../../store/placementStore';
import { useScenarioStore } from '../../store/scenarioStore';
import { usePlaybackStore } from '../../store/playbackStore';
import { useCameraStore } from '../../store/cameraStore';
import { useSimulationStore } from '../../store/simulationStore';
import { wsClient } from '../../services/wsClient';
import { buildScenario } from '../../utils/scenarioBuilder';
import { getMissileTypeConfig, estimateFlightTimeS } from '../../config/missileTypes';
import { getDefenseAssetConfig } from '../../config/defenseAssets';
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
  const resetSimulation = useSimulationStore((s) => s.reset);
  const primeFollow = useCameraStore((s) => s.primeFollow);
  const setMode = useCameraStore((s) => s.setMode);
  const setTrackedEntityId = useCameraStore((s) => s.setTrackedEntityId);
  const setHudExpanded = useCameraStore((s) => s.setHudExpanded);

  const draftReady = phase === 'target_set' && Boolean(missileType && origin && target);
  const draftPlacement: PlannedLaunchPlacement | null = draftReady && missileType && origin && target
    ? {
      id: 'draft',
      kind: 'missile',
      missileType,
      origin,
      target,
      launchTimeS,
    }
    : null;
  const scenarioPlacements = [
    ...placements,
    ...(draftPlacement ? [draftPlacement] : []),
  ];

  if (phase === 'simulating' || (placements.length === 0 && !draftPlacement)) return null;

  const handleLaunch = () => {
    if (scenarioPlacements.length === 0) return;

    const orderedPlacements = [...scenarioPlacements].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'asset' ? -1 : 1;
      if (a.kind === 'missile' && b.kind === 'missile') {
        return (a.launchTimeS ?? 0) - (b.launchTimeS ?? 0);
      }
      return 0;
    });
    const scenario = buildScenario(orderedPlacements);
    const firstTrackableEntity =
      scenario.entities.find((entity) => entity.trajectory_type !== 'stationary')?.id
      ?? null;

    setActiveScenario(scenario);
    setDuration(scenario.metadata.duration_s);
    setPlaying(true);
    resetSimulation();
    if (firstTrackableEntity) {
      primeFollow(firstTrackableEntity);
    } else {
      setMode('tactical');
      setTrackedEntityId(null);
      setHudExpanded(false);
    }

    wsClient.connect(`session_${Date.now()}`);
    wsClient.send({ type: 'cmd_load_definition', definition: scenario });
    wsClient.send({ type: 'cmd_play', playback_speed: 1.0 });

    beginSimulation();
  };

  const missileCount = scenarioPlacements.filter((placement) => placement.kind === 'missile').length;
  const assetCount = scenarioPlacements.filter((placement) => placement.kind === 'asset').length;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Scenario Queue</div>
          <div style={styles.subtitle}>
            {scenarioPlacements.length} entities // {missileCount} launch tracks // {assetCount} defense assets
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
  placement: PlannedPlacement;
  index: number;
  onDelayChange: (value: number) => void;
  onRemove: () => void;
  showQueueActions: boolean;
  footerAction?: React.ReactNode;
}) {
  if (placement.kind === 'asset') {
    const config = getDefenseAssetConfig(placement.assetId);

    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <div style={{ ...styles.cardTitle, color: config.cssColor }}>
              {config.label}
            </div>
            <div style={styles.cardMeta}>
              Asset {index + 1} // {placement.entityType.toUpperCase()} // STATIC SITE
            </div>
          </div>
          <button onClick={onRemove} style={styles.removeBtn}>
            {showQueueActions ? 'Remove' : 'Discard'}
          </button>
        </div>

        <div style={styles.stats}>
          <Stat label="Role" value={placement.entityType === 'sensor' ? 'Radar' : 'Battery'} />
          <Stat label="Lat" value={placement.position.lat.toFixed(2)} />
          <Stat label="Lon" value={placement.position.lon.toFixed(2)} />
        </div>

        {footerAction && <div style={styles.cardFooter}>{footerAction}</div>}
      </div>
    );
  }

  const config = getMissileTypeConfig(placement.missileType);
  const distanceM = haversineDistanceM(placement.origin, placement.target);
  const flightTimeS = estimateFlightTimeS(config, distanceM);

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <div style={{ ...styles.cardTitle, color: config.cssColor }}>
            {config.label}
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

      {footerAction && <div style={styles.cardFooter}>{footerAction}</div>}
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
    color: '#64748b',
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
    color: '#64748b',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  delayInput: {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 4,
    color: '#e2e8f0',
    padding: '6px 8px',
    fontSize: 12,
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  queueBtn: {
    background: '#00d2eb',
    border: 'none',
    color: '#081014',
    padding: '8px 12px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  secondaryBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#a0aec0',
    borderRadius: 4,
    padding: '8px 10px',
    fontSize: 12,
    cursor: 'pointer',
  },
  launchBtn: {
    background: '#00d2eb',
    border: 'none',
    color: '#081014',
    borderRadius: 4,
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  removeBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#a0aec0',
    borderRadius: 4,
    padding: '6px 8px',
    fontSize: 11,
    cursor: 'pointer',
  },
};
