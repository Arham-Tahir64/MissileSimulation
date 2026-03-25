import { useEffect, useState } from 'react';
import { useCameraStore } from '../../store/cameraStore';
import { usePlayback } from '../Playback/usePlayback';
import { usePlaybackStore } from '../../store/playbackStore';
import { usePlacementStore } from '../../store/placementStore';
import { useScenarioStore } from '../../store/scenarioStore';
import { useSimulationStore } from '../../store/simulationStore';
import { getViewer, resetViewerToDefaultView } from '../../services/viewerRegistry';
import { wsClient } from '../../services/wsClient';
import { computeFlightTimeS, flyToScenario, haversineDistanceM } from '../../utils/cesiumHelpers';
import { formatSimTime, timeToFraction } from '../../utils/timeUtils';

const SPEED_OPTIONS = [0.5, 1, 2, 4, 8];

export function TacticalShell() {
  const [isFleetHudOpen, setFleetHudOpen] = useState(true);
  const {
    mode,
    trackedEntityId,
    followPreset,
    setMode,
    setTrackedEntityId,
    setFollowPreset,
    isHudExpanded,
    setHudExpanded,
    reset: resetCamera,
  } = useCameraStore();
  const { simTimeS, status, connectionStatus, entities, events, reset: resetSimulation } =
    useSimulationStore();
  const { activeScenario, setActiveScenario } = useScenarioStore();
  const { durationS, isPlaying, speed, setDuration, setPlaying, setSpeed } = usePlaybackStore();
  const { toggle, seek, changeSpeed } = usePlayback();
  const placementReset = usePlacementStore((s) => s.reset);

  const trackableDefinitions = (activeScenario?.entities ?? []).filter(
    (definition) => definition.type !== 'sensor' && definition.trajectory_type !== 'stationary',
  );
  const activeEntities = entities.filter((entity) =>
    entity.status === 'active' && trackableDefinitions.some((definition) => definition.id === entity.id),
  );
  const fleetEntries = trackableDefinitions.map((definition) => ({
    definition,
    state: entities.find((entity) => entity.id === definition.id) ?? null,
  }));
  const trackedEntity =
    entities.find((entity) => entity.id === trackedEntityId)
    ?? activeEntities[0]
    ?? fleetEntries[0]?.state
    ?? entities[0]
    ?? null;
  const trackedDefinition = activeScenario?.entities.find(
    (entity) => entity.id === (trackedEntityId ?? trackedEntity?.id),
  )
    ?? activeScenario?.entities[0]
    ?? null;
  const terminalTarget = trackedDefinition?.target
    ?? trackedDefinition?.waypoints?.[trackedDefinition.waypoints.length - 1]
    ?? null;
  const trackFraction = timeToFraction(simTimeS, durationS);
  const altitudeFt = trackedEntity ? trackedEntity.position.alt * 3.28084 : 0;
  const mach = trackedEntity ? trackedEntity.velocity_ms / 343 : 0;
  const etaS = trackedEntity && trackedDefinition
    ? Math.max(0, trackedDefinition.launch_time_s + computeFlightTimeS(trackedDefinition) - simTimeS)
    : 0;
  const distanceToTargetKm = trackedEntity && terminalTarget
    ? haversineDistanceM(trackedEntity.position, terminalTarget) / 1_000
    : 0;
  const totalMissiles = fleetEntries.length;
  const scheduledMissiles = fleetEntries.filter((entry) => entry.state?.status === 'inactive').length;
  const completedMissiles = fleetEntries.filter((entry) => {
    const statusValue = entry.state?.status;
    return statusValue === 'missed' || statusValue === 'destroyed' || statusValue === 'intercepted';
  }).length;
  const selectedFleetId = trackedEntityId ?? trackedDefinition?.id ?? trackedEntity?.id ?? null;
  const selectedFleetIndex = selectedFleetId
    ? fleetEntries.findIndex((entry) => entry.definition.id === selectedFleetId)
    : -1;
  const showResetToGlobe = status === 'completed';
  const alertText = trackedEntity
    ? trackedEntity.status === 'active'
      ? 'FOLLOW_CAMERA_LOCKED. TRAJECTORY_STABLE. TERMINAL_TRACK_IN_VIEW.'
      : trackedEntity.status === 'intercepted'
        ? 'TRACK_TERMINATED. INTERCEPT_CONFIRMED. DEBRIS_FIELD_PENDING.'
        : trackedEntity.status === 'missed'
          ? 'TRACK_COMPLETE. IMPACT_WINDOW_REACHED. REVIEW PATHING.'
          : 'TRACK_PENDING. WAITING_FOR_ACTIVE_FLIGHT_SEGMENT.'
    : 'NO_ACTIVE_TRACK. SELECT OR LAUNCH A MISSILE TO ENTER FOLLOW MODE.';

  useEffect(() => {
    if (!trackedEntityId && trackedEntity) {
      setTrackedEntityId(trackedEntity.id);
    }
  }, [trackedEntity, trackedEntityId, setTrackedEntityId]);

  const handleGlobeView = () => {
    setMode('tactical');
    setHudExpanded(false);
    const viewer = getViewer();
    if (viewer && activeScenario) {
      flyToScenario(viewer, activeScenario);
    }
  };

  const selectTrackedMissile = (missileId: string) => {
    setFollowPreset('wide');
    setMode('follow');
    setTrackedEntityId(missileId);
    setHudExpanded(true);
  };

  const cycleTrackedMissile = (direction: -1 | 1) => {
    if (fleetEntries.length === 0) return;
    const currentIndex = selectedFleetIndex >= 0 ? selectedFleetIndex : 0;
    const nextIndex = (currentIndex + direction + fleetEntries.length) % fleetEntries.length;
    selectTrackedMissile(fleetEntries[nextIndex].definition.id);
  };

  const handleAbort = () => {
    wsClient.disconnect();
    setPlaying(false);
    setSpeed(1);
    setDuration(0);
    setActiveScenario(null);
    resetSimulation();
    resetCamera();
    placementReset();
    resetViewerToDefaultView();
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(parseFloat(e.target.value) * durationS);
  };

  return (
    <div style={styles.shell}>
      <div style={styles.vignette} />
      <div style={styles.grid} />

      <div style={styles.topBar}>
        <div style={styles.brand}>KINETIC_SENTINEL_v1.0</div>
        <div style={styles.topMeta}>
          <span style={styles.modeChip}>SYSTEM_LOCKED</span>
          <span style={styles.topLabel}>
            {trackedEntity?.id ?? 'NO_TRACK'} // {status.toUpperCase()} // {connectionStatus}
          </span>
        </div>
      </div>

      <div style={styles.leftRail}>
        <div style={styles.railHeader}>
          <div style={styles.railTitle}>TACTICAL_CMD</div>
          <div style={styles.railSubtitle}>
            {activeScenario?.metadata.name ?? 'CUSTOM_TRACK'} // {trackedDefinition?.label ?? trackedEntity?.type ?? 'standby'}
          </div>
        </div>

        <div style={styles.modeList}>
          <ModeButton label="FOLLOW" active={mode === 'follow'} onClick={() => setMode('follow')} />
          <ModeButton label="TACTICAL" active={mode === 'tactical'} onClick={() => setMode('tactical')} />
          <ModeButton label="FREE" active={mode === 'free'} onClick={() => setMode('free')} />
        </div>

        <div style={styles.railBlock}>
          <div style={styles.blockLabel}>TRACK</div>
          <button
            onClick={handleGlobeView}
            style={styles.ghostButton}
          >
            GLOBE_VIEW
          </button>
          <button
            onClick={() => setFleetHudOpen((value) => !value)}
            style={styles.ghostButton}
          >
            {isFleetHudOpen ? 'HIDE_FLEET_HUD' : 'OPEN_FLEET_HUD'}
          </button>
          <button
            onClick={() => setHudExpanded(!isHudExpanded)}
            style={styles.ghostButton}
          >
            {isHudExpanded ? 'COLLAPSE_HUD' : 'EXPAND_HUD'}
          </button>
          <button
            onClick={() => setFollowPreset(followPreset === 'chase' ? 'wide' : 'chase')}
            style={styles.ghostButton}
          >
            {followPreset === 'chase' ? 'WIDE_CHASE' : 'TIGHT_CHASE'}
          </button>
        </div>

        {isFleetHudOpen && (
          <div style={styles.fleetPanel}>
            <div style={styles.panelTitle}>GENERAL_HUD</div>
            <div style={styles.fleetSummary}>
              <FleetStat label="TOTAL" value={String(totalMissiles)} />
              <FleetStat label="ACTIVE" value={String(activeEntities.length)} />
              <FleetStat label="SCHEDULED" value={String(scheduledMissiles)} />
              <FleetStat label="DONE" value={String(completedMissiles)} />
            </div>
            <div style={styles.fleetToolbar}>
              <span style={styles.fleetToolbarLabel}>MISSILE_TRACKS</span>
              <div style={styles.fleetToolbarControls}>
                <button
                  onClick={() => cycleTrackedMissile(-1)}
                  disabled={fleetEntries.length <= 1}
                  style={styles.cycleButton}
                >
                  PREV
                </button>
                <span style={styles.cycleIndex}>
                  {fleetEntries.length === 0
                    ? '0 / 0'
                    : `${Math.max(selectedFleetIndex, 0) + 1} / ${fleetEntries.length}`}
                </span>
                <button
                  onClick={() => cycleTrackedMissile(1)}
                  disabled={fleetEntries.length <= 1}
                  style={styles.cycleButton}
                >
                  NEXT
                </button>
              </div>
            </div>
            <div style={styles.fleetList}>
              {fleetEntries.map(({ definition, state }) => {
                const selected = selectedFleetId === definition.id;
                const liveStatus = state?.status ?? 'inactive';
                return (
                  <button
                    key={definition.id}
                    onClick={() => selectTrackedMissile(definition.id)}
                    style={{
                      ...styles.fleetRow,
                      borderColor: selected ? 'rgba(0,229,255,0.4)' : 'rgba(255,255,255,0.08)',
                      background: selected ? 'rgba(0,229,255,0.08)' : 'rgba(10,16,22,0.54)',
                    }}
                  >
                    <div style={styles.fleetRowTop}>
                      <span style={styles.fleetName}>{definition.id}</span>
                      <span style={styles.fleetStatus}>{liveStatus}</span>
                    </div>
                    <div style={styles.fleetMeta}>
                      {definition.label} // T+{Math.round(definition.launch_time_s)}s
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button onClick={handleAbort} style={styles.engageButton}>
          {showResetToGlobe ? 'RESET_TO_GLOBE' : 'EXIT_TRACK'}
        </button>
      </div>

      {(isHudExpanded || mode === 'follow') && (
        <div style={styles.centerHud}>
          <div style={styles.reticle}>
            <span style={styles.reticleDot} />
          </div>
          <div style={styles.trackLabel}>
            <span style={styles.trackEyebrow}>ACTIVE_TRACK</span>
            <span style={styles.trackValue}>{trackedEntity?.id ?? 'NO_TARGET'}</span>
          </div>
        </div>
      )}

      {showResetToGlobe && (
        <div style={styles.completionPrompt}>
          <div style={styles.completionEyebrow}>SIMULATION_COMPLETE</div>
          <div style={styles.completionTitle}>Reset To Original Globe</div>
          <button onClick={handleAbort} style={styles.completionButton}>
            RESET_TO_GLOBE
          </button>
        </div>
      )}

      {isHudExpanded && (
        <div style={styles.rightStack}>
          <MetricPanel
            title="ALTITUDE"
            value={`${altitudeFt.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            unit="FT"
            tone="cyan"
            progress={trackFraction}
          />
          <MetricPanel
            title="VELOCITY"
            value={`${mach.toFixed(1)}`}
            unit="MACH"
            tone="amber"
            progress={Math.min(1, mach / 8)}
          />
          <MetricPanel
            title="TIME_TO_IMPACT"
            value={formatSimTime(etaS)}
            unit=""
            tone="amber"
            progress={durationS > 0 ? 1 - etaS / durationS : 0}
          />
          <div style={{ ...styles.panel, ...styles.alertPanel }}>
            <div style={styles.panelTitle}>CRITICAL_ALERT</div>
            <div style={styles.alertBody}>{alertText}</div>
          </div>
          <RadarInset
            trackedLat={trackedEntity?.position.lat ?? 0}
            trackedLon={trackedEntity?.position.lon ?? 0}
            targetLat={terminalTarget?.lat ?? null}
            targetLon={terminalTarget?.lon ?? null}
          />
        </div>
      )}

      <div style={styles.bottomDock}>
        <div style={styles.bottomMetric}>
          <span style={styles.bottomLabel}>LAT/LONG</span>
          <span style={styles.bottomValue}>
            {trackedEntity
              ? `${Math.abs(trackedEntity.position.lat).toFixed(4)}${trackedEntity.position.lat >= 0 ? 'N' : 'S'} / ${Math.abs(trackedEntity.position.lon).toFixed(4)}${trackedEntity.position.lon >= 0 ? 'E' : 'W'}`
              : 'NO_DATA'}
          </span>
        </div>
        <div style={styles.bottomMetric}>
          <span style={styles.bottomLabel}>DISTANCE</span>
          <span style={styles.bottomValue}>{distanceToTargetKm.toFixed(1)} KM</span>
        </div>
        <div style={styles.bottomMetric}>
          <span style={styles.bottomLabel}>ATTITUDE</span>
          <span style={styles.bottomValue}>
            HDG {trackedEntity?.heading_deg.toFixed(0) ?? '0'} / PIT {trackedEntity?.pitch_deg.toFixed(0) ?? '0'}
          </span>
        </div>
        <div style={styles.bottomMetricWide}>
          <div style={styles.playbackRow}>
            <button onClick={toggle} disabled={status === 'idle'} style={styles.playButton}>
              {isPlaying ? 'PAUSE' : 'PLAY'}
            </button>
            <span style={styles.playbackTime}>{formatSimTime(simTimeS)}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={trackFraction}
              onChange={handleScrub}
              disabled={status === 'idle'}
              style={styles.scrubber}
            />
            <span style={styles.playbackTime}>{formatSimTime(durationS)}</span>
            <select
              value={speed}
              onChange={(e) => changeSpeed(parseFloat(e.target.value))}
              style={styles.speedSelect}
            >
              {SPEED_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}x</option>
              ))}
            </select>
          </div>
          <div style={styles.eventsRow}>
            {[...events].slice(-3).reverse().map((event) => (
              <span key={event.event_id} style={styles.eventChip}>
                {formatSimTime(event.sim_time_s)} // {event.interceptor_id} → {event.threat_id}
              </span>
            ))}
            {events.length === 0 && (
              <span style={{ ...styles.eventChip, opacity: 0.6 }}>
                TRACK_STABLE // NO_INTERCEPT_EVENTS
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FleetStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.fleetStat}>
      <span style={styles.fleetStatLabel}>{label}</span>
      <span style={styles.fleetStatValue}>{value}</span>
    </div>
  );
}

function ModeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.modeButton,
        background: active ? 'rgba(0, 229, 255, 0.16)' : 'rgba(12, 18, 24, 0.56)',
        color: active ? '#dff8ff' : '#7d929d',
        boxShadow: active ? 'inset 3px 0 0 #00e5ff' : 'none',
      }}
    >
      {label}
    </button>
  );
}

function MetricPanel({
  title,
  value,
  unit,
  tone,
  progress,
}: {
  title: string;
  value: string;
  unit: string;
  tone: 'cyan' | 'amber';
  progress: number;
}) {
  const accent = tone === 'cyan' ? '#00e5ff' : '#ffd799';

  return (
    <div style={styles.panel}>
      <div style={styles.panelTitle}>{title}</div>
      <div style={styles.metricRow}>
        <span style={{ ...styles.metricValue, color: tone === 'cyan' ? '#dff8ff' : '#ffe1ae' }}>
          {value}
        </span>
        {unit && <span style={{ ...styles.metricUnit, color: accent }}>{unit}</span>}
      </div>
      <div style={styles.progressTrack}>
        <div
          style={{
            ...styles.progressFill,
            width: `${Math.max(0, Math.min(100, progress * 100))}%`,
            background: accent,
          }}
        />
      </div>
    </div>
  );
}

function RadarInset({
  trackedLat,
  trackedLon,
  targetLat,
  targetLon,
}: {
  trackedLat: number;
  trackedLon: number;
  targetLat: number | null;
  targetLon: number | null;
}) {
  const dx = targetLon == null ? 0 : Math.max(-42, Math.min(42, (targetLon - trackedLon) * 8));
  const dy = targetLat == null ? 0 : Math.max(-42, Math.min(42, (trackedLat - targetLat) * 8));

  return (
    <div style={{ ...styles.panel, ...styles.radarPanel }}>
      <div style={styles.panelTitle}>SENSOR_INSET</div>
      <div style={styles.radarGrid}>
        <div style={styles.radarRing} />
        <div style={styles.radarCrossX} />
        <div style={styles.radarCrossY} />
        <span style={{ ...styles.radarBlip, left: '50%', top: '50%', background: '#00e5ff' }} />
        {targetLat != null && targetLon != null && (
          <span
            style={{
              ...styles.radarBlip,
              left: `calc(50% + ${dx}px)`,
              top: `calc(50% + ${dy}px)`,
              background: '#ffd799',
            }}
          />
        )}
      </div>
    </div>
  );
}

const glassPanel: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(195,245,255,0.08) 0, rgba(14,20,26,0.82) 14px, rgba(14,20,26,0.82) 100%)',
  border: '1px solid rgba(0, 218, 243, 0.14)',
  boxShadow: '0 0 0 1px rgba(0, 218, 243, 0.04), 0 40px 120px rgba(0, 218, 243, 0.04)',
  backdropFilter: 'blur(18px)',
};

const styles: Record<string, React.CSSProperties> = {
  shell: {
    position: 'absolute',
    inset: 0,
    zIndex: 20,
    color: '#dfe2eb',
    pointerEvents: 'none',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  },
  vignette: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at center, rgba(0,0,0,0) 22%, rgba(5,9,12,0.24) 70%, rgba(5,9,12,0.78) 100%)',
  },
  grid: {
    position: 'absolute',
    inset: '68px 220px 92px 280px',
    backgroundImage: 'linear-gradient(rgba(0,218,243,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,218,243,0.05) 1px, transparent 1px)',
    backgroundSize: '96px 96px',
    opacity: 0.45,
  },
  topBar: {
    position: 'absolute',
    top: 16,
    left: 28,
    right: 28,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    color: '#00e5ff',
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: '0.08em',
    fontStyle: 'italic',
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
  },
  topMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  modeChip: {
    padding: '8px 12px',
    background: 'rgba(12, 20, 26, 0.82)',
    color: '#dff8ff',
    fontSize: 11,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    border: '1px solid rgba(0, 218, 243, 0.16)',
  },
  topLabel: {
    color: '#8ea4af',
    fontSize: 11,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },
  leftRail: {
    ...glassPanel,
    position: 'absolute',
    top: 68,
    left: 8,
    bottom: 8,
    width: 244,
    padding: '24px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    pointerEvents: 'auto',
  },
  railHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  railTitle: {
    color: '#dff8ff',
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: '0.04em',
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
  },
  railSubtitle: {
    color: '#7d929d',
    fontSize: 11,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    lineHeight: 1.6,
  },
  modeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  modeButton: {
    border: 'none',
    padding: '14px 12px',
    textAlign: 'left',
    fontSize: 12,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },
  railBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    paddingTop: 8,
  },
  fleetPanel: {
    ...glassPanel,
    padding: '12px 12px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  fleetSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 8,
  },
  fleetStat: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    background: 'rgba(10,16,22,0.48)',
    padding: '8px 10px',
  },
  fleetStatLabel: {
    color: '#718896',
    fontSize: 9,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  },
  fleetStatValue: {
    color: '#dff8ff',
    fontSize: 20,
    fontWeight: 700,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
  },
  fleetList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    paddingRight: 4,
  },
  fleetToolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
  },
  fleetToolbarLabel: {
    color: '#8ba0aa',
    fontSize: 10,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
  },
  fleetToolbarControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  cycleButton: {
    border: '1px solid rgba(0, 218, 243, 0.14)',
    background: 'rgba(12, 20, 26, 0.48)',
    color: '#a8bac3',
    padding: '6px 8px',
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },
  cycleIndex: {
    color: '#dff8ff',
    fontSize: 10,
    letterSpacing: '0.16em',
    fontFamily: 'monospace',
    minWidth: 42,
    textAlign: 'center',
  },
  fleetRow: {
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '10px 10px 9px',
    textAlign: 'left',
    cursor: 'pointer',
  },
  fleetRowTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
  },
  fleetName: {
    color: '#dff8ff',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
  fleetStatus: {
    color: '#8ea4af',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
  },
  fleetMeta: {
    color: '#70838d',
    fontSize: 10,
    marginTop: 6,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
  },
  blockLabel: {
    color: '#6d8089',
    fontSize: 10,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
  },
  ghostButton: {
    border: '1px solid rgba(0, 218, 243, 0.14)',
    background: 'rgba(12, 20, 26, 0.48)',
    color: '#a8bac3',
    padding: '12px 10px',
    textAlign: 'left',
    fontSize: 11,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },
  engageButton: {
    marginTop: 'auto',
    border: 'none',
    background: '#00d2eb',
    color: '#081014',
    padding: '14px 16px',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },
  centerHud: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticle: {
    width: 122,
    height: 122,
    border: '1px solid rgba(195, 245, 255, 0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 60px rgba(0, 218, 243, 0.08)',
  },
  reticleDot: {
    width: 8,
    height: 8,
    background: '#00e5ff',
    boxShadow: '0 0 18px rgba(0, 229, 255, 0.85)',
  },
  trackLabel: {
    position: 'absolute',
    top: 118,
    left: 290,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  trackEyebrow: {
    color: '#8ba0aa',
    fontSize: 10,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
  },
  trackValue: {
    color: '#dff8ff',
    fontSize: 14,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  completionPrompt: {
    ...glassPanel,
    position: 'absolute',
    left: '50%',
    bottom: 168,
    transform: 'translateX(-50%)',
    minWidth: 360,
    padding: '18px 22px',
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    pointerEvents: 'auto',
  },
  completionEyebrow: {
    color: '#7f939d',
    fontSize: 10,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    minWidth: 148,
  },
  completionTitle: {
    color: '#dff8ff',
    fontSize: 22,
    fontWeight: 700,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    flex: 1,
  },
  completionButton: {
    border: 'none',
    background: '#00d2eb',
    color: '#081014',
    padding: '14px 18px',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },
  rightStack: {
    position: 'absolute',
    top: 86,
    right: 22,
    width: 328,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  panel: {
    ...glassPanel,
    padding: '16px 18px',
  },
  panelTitle: {
    color: '#8296a1',
    fontSize: 10,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  metricRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 52,
    lineHeight: 1,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontWeight: 700,
  },
  metricUnit: {
    fontSize: 14,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },
  progressTrack: {
    height: 5,
    background: 'rgba(255,255,255,0.08)',
  },
  progressFill: {
    height: '100%',
  },
  alertPanel: {
    minHeight: 132,
  },
  alertBody: {
    color: '#f2dad6',
    fontSize: 14,
    lineHeight: 1.6,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  radarPanel: {
    paddingBottom: 18,
  },
  radarGrid: {
    position: 'relative',
    width: '100%',
    aspectRatio: '1 / 1',
    background: 'linear-gradient(180deg, rgba(16,20,26,0.24), rgba(16,20,26,0.72))',
    overflow: 'hidden',
  },
  radarRing: {
    position: 'absolute',
    inset: '21%',
    border: '1px solid rgba(195,245,255,0.14)',
  },
  radarCrossX: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    background: 'rgba(195,245,255,0.08)',
  },
  radarCrossY: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    background: 'rgba(195,245,255,0.08)',
  },
  radarBlip: {
    position: 'absolute',
    width: 8,
    height: 8,
    marginLeft: -4,
    marginTop: -4,
    boxShadow: '0 0 18px currentColor',
  },
  bottomDock: {
    ...glassPanel,
    position: 'absolute',
    left: 272,
    right: 22,
    bottom: 18,
    minHeight: 118,
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.9fr 1fr 2.6fr',
    gap: 14,
    padding: '16px 18px',
    pointerEvents: 'auto',
  },
  bottomMetric: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  bottomMetricWide: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  bottomLabel: {
    color: '#8296a1',
    fontSize: 10,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
  },
  bottomValue: {
    color: '#dff8ff',
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1.2,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
  },
  playbackRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  playButton: {
    border: 'none',
    background: '#00d2eb',
    color: '#071015',
    padding: '12px 14px',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },
  playbackTime: {
    color: '#a1b4bd',
    fontSize: 12,
    fontFamily: 'monospace',
    minWidth: 48,
  },
  scrubber: {
    flex: 1,
    accentColor: '#00e5ff',
  },
  speedSelect: {
    border: '1px solid rgba(0, 218, 243, 0.14)',
    background: 'rgba(12, 20, 26, 0.68)',
    color: '#dff8ff',
    padding: '10px 12px',
    fontSize: 11,
  },
  eventsRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  eventChip: {
    padding: '8px 10px',
    background: 'rgba(12, 20, 26, 0.56)',
    color: '#8fa4ae',
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },
};
