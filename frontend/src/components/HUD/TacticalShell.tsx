import { useEffect, useState } from 'react';
import { getDefenseAssetConfigByDesignator } from '../../config/defenseAssets';
import { useCameraStore } from '../../store/cameraStore';
import { usePlayback } from '../Playback/usePlayback';
import { usePlaybackStore } from '../../store/playbackStore';
import { usePlacementStore } from '../../store/placementStore';
import { useScenarioStore } from '../../store/scenarioStore';
import { useSimulationStore } from '../../store/simulationStore';
import { getViewer, resetViewerToDefaultView } from '../../services/viewerRegistry';
import { wsClient } from '../../services/wsClient';
import { computeFlightTimeS, flyToScenario, haversineDistanceM } from '../../utils/cesiumHelpers';
import { getEntityDisplayLabel, getEntityDisplayName, isDefenseAssetEntity, isMovingRuntimeEntity, isSensorRuntimeEntity } from '../../utils/entityRuntime';
import { formatRuntimeEventLabel, isEngagementOrderEvent, isSensorTrackEvent } from '../../types/simulation';
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

  const activeScenarioDefinitionMap = new Map(
    (activeScenario?.entities ?? []).map((entity) => [entity.id, entity]),
  );
  const flightEntities = entities.filter((entity) => isMovingRuntimeEntity(entity, activeScenarioDefinitionMap.get(entity.id)));
  const defenseAssets = entities.filter((entity) => isDefenseAssetEntity(entity, activeScenarioDefinitionMap.get(entity.id)));
  const activeFlightEntities = flightEntities.filter((entity) => entity.status === 'active');
  const activeEntities = activeFlightEntities;
  const fleetEntries = flightEntities.map((state) => ({
    definition: activeScenarioDefinitionMap.get(state.id) ?? null,
    state,
  }));
  const radarAssets = defenseAssets.filter((entity) => isSensorRuntimeEntity(entity));
  const batteryAssets = defenseAssets.filter((entity) => !isSensorRuntimeEntity(entity));
  const selectedEntity =
    entities.find((entity) => entity.id === trackedEntityId)
    ?? activeFlightEntities[0]
    ?? fleetEntries[0]?.state
    ?? null;
  const selectedDefinition = selectedEntity
    ? activeScenarioDefinitionMap.get(selectedEntity.id) ?? null
    : null;
  const isSelectedMovingEntity = selectedEntity
    ? isMovingRuntimeEntity(selectedEntity, selectedDefinition)
    : false;
  const selectedAssetConfig = selectedEntity && !isSelectedMovingEntity
    ? getDefenseAssetConfigByDesignator(selectedEntity.designator)
    : null;
  const selectedEntityName = selectedEntity ? getEntityDisplayName(selectedEntity, selectedDefinition) : 'NO_TRACK';
  const selectedEntityLabel = selectedEntity ? getEntityDisplayLabel(selectedEntity, selectedDefinition) : 'standby';
  const terminalTarget = selectedDefinition?.target
    ?? selectedDefinition?.waypoints?.[selectedDefinition.waypoints.length - 1]
    ?? null;
  const trackFraction = timeToFraction(simTimeS, durationS);
  const altitudeFt = selectedEntity ? selectedEntity.position.alt * 3.28084 : 0;
  const mach = selectedEntity ? selectedEntity.velocity_ms / 343 : 0;
  const etaS = selectedEntity && selectedDefinition && isSelectedMovingEntity
    ? Math.max(0, selectedDefinition.launch_time_s + computeFlightTimeS(selectedDefinition) - simTimeS)
    : 0;
  const primaryLinkedThreatId = selectedEntity
    ? selectedEntity.current_target_id ?? selectedEntity.detected_threat_ids?.[0] ?? null
    : null;
  const primaryLinkedThreat = primaryLinkedThreatId
    ? entities.find((entity) => entity.id === primaryLinkedThreatId) ?? null
    : null;
  const distanceToTargetKm = selectedEntity && terminalTarget && isSelectedMovingEntity
    ? haversineDistanceM(selectedEntity.position, terminalTarget) / 1_000
    : selectedEntity && primaryLinkedThreat
      ? haversineDistanceM(selectedEntity.position, primaryLinkedThreat.position) / 1_000
      : selectedAssetConfig
        ? ((selectedAssetConfig.detectionRadiusM ?? selectedAssetConfig.engagementRadiusM ?? 0) / 1_000)
    : 0;
  const totalMissiles = fleetEntries.length;
  const scheduledMissiles = fleetEntries.filter((entry) => entry.state?.status === 'inactive').length;
  const completedMissiles = fleetEntries.filter((entry) => {
    const statusValue = entry.state?.status;
    return statusValue === 'missed' || statusValue === 'destroyed' || statusValue === 'intercepted';
  }).length;
  const selectedFleetId = isSelectedMovingEntity ? selectedEntity?.id ?? null : null;
  const selectedFleetIndex = selectedFleetId
    ? fleetEntries.findIndex((entry) => entry.state.id === selectedFleetId)
    : -1;
  const showResetToGlobe = status === 'completed';
  const latestEntityEvent = selectedEntity
    ? [...events]
      .reverse()
      .find((event) => {
        if (isSelectedMovingEntity) {
          if (isSensorTrackEvent(event)) return event.threat_id === selectedEntity.id;
          if (isEngagementOrderEvent(event)) return event.interceptor_id === selectedEntity.id || event.threat_id === selectedEntity.id;
          return event.interceptor_id === selectedEntity.id || event.threat_id === selectedEntity.id;
        }
        if (isSensorRuntimeEntity(selectedEntity)) {
          return isSensorTrackEvent(event) && event.sensor_id === selectedEntity.id;
        }
        return isEngagementOrderEvent(event) && event.battery_id === selectedEntity.id;
      })
    : null;
  const alertText = selectedEntity
    ? isSelectedMovingEntity
      ? selectedEntity.status === 'active'
      ? 'FOLLOW_CAMERA_LOCKED. TRAJECTORY_STABLE. TERMINAL_TRACK_IN_VIEW.'
      : selectedEntity.status === 'intercepted'
        ? 'TRACK_TERMINATED. INTERCEPT_CONFIRMED. DEBRIS_FIELD_PENDING.'
        : selectedEntity.status === 'missed'
          ? 'TRACK_COMPLETE. IMPACT_WINDOW_REACHED. REVIEW PATHING.'
          : 'TRACK_PENDING. WAITING_FOR_ACTIVE_FLIGHT_SEGMENT.'
      : isSensorRuntimeEntity(selectedEntity)
        ? `RADAR_LOCK_VOLUME_${(selectedEntity.asset_status ?? 'idle').toUpperCase()}. TRACKED_THREATS_${selectedEntity.detected_threat_ids?.length ?? 0}.`
        : `BATTERY_${(selectedEntity.asset_status ?? 'idle').toUpperCase()}. TARGET_${selectedEntity.current_target_id ?? 'NONE'}.`
    : 'NO_ACTIVE_TRACK. SELECT OR LAUNCH A MISSILE TO ENTER FOLLOW MODE.';

  useEffect(() => {
    if (!trackedEntityId && activeFlightEntities[0]) {
      setTrackedEntityId(activeFlightEntities[0].id);
    }
  }, [activeFlightEntities, trackedEntityId, setTrackedEntityId]);

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

  const selectAsset = (assetId: string) => {
    setMode('tactical');
    setTrackedEntityId(assetId);
    setHudExpanded(true);
  };

  const cycleTrackedMissile = (direction: -1 | 1) => {
    if (fleetEntries.length === 0) return;
    const currentIndex = selectedFleetIndex >= 0 ? selectedFleetIndex : 0;
    const nextIndex = (currentIndex + direction + fleetEntries.length) % fleetEntries.length;
    selectTrackedMissile(fleetEntries[nextIndex].state.id);
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
            {selectedEntityName} // {status.toUpperCase()} // {connectionStatus}
          </span>
        </div>
      </div>

      <div style={styles.leftRail}>
        <div style={styles.railHeader}>
          <div style={styles.railTitle}>TACTICAL_CMD</div>
          <div style={styles.railSubtitle}>
            {activeScenario?.metadata.name ?? 'CUSTOM_TRACK'} // {selectedEntityLabel}
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
                const selected = selectedFleetId === state.id;
                const liveStatus = state.status;
                return (
                  <button
                    key={state.id}
                    onClick={() => selectTrackedMissile(state.id)}
                    style={{
                      ...styles.fleetRow,
                      borderColor: selected ? 'rgba(0,229,255,0.4)' : 'rgba(255,255,255,0.08)',
                      background: selected ? 'rgba(0,229,255,0.08)' : 'rgba(10,16,22,0.54)',
                    }}
                  >
                    <div style={styles.fleetRowTop}>
                      <span style={styles.fleetName}>{state ? getEntityDisplayName(state, definition) : definition?.designator ?? 'TRACK'}</span>
                      <span style={styles.fleetStatus}>{liveStatus}</span>
                    </div>
                    <div style={styles.fleetMeta}>
                      {(state ? getEntityDisplayLabel(state, definition) : definition?.label) ?? 'Unknown Track'} // T+{Math.round(definition?.launch_time_s ?? 0)}s
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {defenseAssets.length > 0 && (
          <div style={styles.assetPanel}>
            <div style={styles.panelTitle}>DEFENSE_ASSETS</div>
            {radarAssets.length > 0 && (
              <div style={styles.assetGroup}>
                <div style={styles.assetGroupLabel}>RADARS</div>
                {radarAssets.map((asset) => {
                  const selected = selectedEntity?.id === asset.id;
                  return (
                    <button
                      key={asset.id}
                      onClick={() => selectAsset(asset.id)}
                      style={{
                        ...styles.assetRow,
                        borderColor: selected ? 'rgba(255,215,153,0.38)' : 'rgba(255,255,255,0.08)',
                        background: selected ? 'rgba(255,215,153,0.08)' : 'rgba(10,16,22,0.54)',
                      }}
                    >
                      <div style={styles.assetRowTop}>
                        <span style={styles.assetName}>{getEntityDisplayName(asset)}</span>
                        <span style={styles.assetStatus}>{asset.asset_status ?? 'idle'}</span>
                      </div>
                      <div style={styles.assetMeta}>
                        {getEntityDisplayLabel(asset)} // {(asset.detected_threat_ids?.length ?? 0)} TRACKS
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {batteryAssets.length > 0 && (
              <div style={styles.assetGroup}>
                <div style={styles.assetGroupLabel}>BATTERIES</div>
                {batteryAssets.map((asset) => {
                  const selected = selectedEntity?.id === asset.id;
                  return (
                    <button
                      key={asset.id}
                      onClick={() => selectAsset(asset.id)}
                      style={{
                        ...styles.assetRow,
                        borderColor: selected ? 'rgba(103,212,255,0.4)' : 'rgba(255,255,255,0.08)',
                        background: selected ? 'rgba(103,212,255,0.08)' : 'rgba(10,16,22,0.54)',
                      }}
                    >
                      <div style={styles.assetRowTop}>
                        <span style={styles.assetName}>{getEntityDisplayName(asset)}</span>
                        <span style={styles.assetStatus}>{asset.asset_status ?? 'idle'}</span>
                      </div>
                      <div style={styles.assetMeta}>
                        {getEntityDisplayLabel(asset)} // {asset.current_target_id ?? 'READY'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <button onClick={handleAbort} style={styles.engageButton}>
          {showResetToGlobe ? 'RESET_TO_GLOBE' : 'EXIT_TRACK'}
        </button>
      </div>

      {selectedEntity && isSelectedMovingEntity && (isHudExpanded || mode === 'follow') && (
        <div style={styles.centerHud}>
          <div style={styles.reticle}>
            <span style={styles.reticleDot} />
          </div>
          <div style={styles.trackLabel}>
            <span style={styles.trackEyebrow}>ACTIVE_TRACK</span>
            <span style={styles.trackValue}>{selectedEntityName}</span>
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

      {isHudExpanded && selectedEntity && (
        <div style={styles.rightStack}>
          {isSelectedMovingEntity ? (
            <>
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
            </>
          ) : (
            <>
              <MetricPanel
                title={isSensorRuntimeEntity(selectedEntity) ? 'DETECTION_RANGE' : 'COVERAGE_RANGE'}
                value={`${(((selectedAssetConfig?.detectionRadiusM ?? selectedAssetConfig?.engagementRadiusM) ?? 0) / 1_000).toFixed(0)}`}
                unit="KM"
                tone="cyan"
                progress={1}
              />
              <MetricPanel
                title={isSensorRuntimeEntity(selectedEntity) ? 'TRACKED_THREATS' : 'CURRENT_TARGET'}
                value={isSensorRuntimeEntity(selectedEntity)
                  ? `${selectedEntity.detected_threat_ids?.length ?? 0}`
                  : selectedEntity.current_target_id ?? 'READY'}
                unit={isSensorRuntimeEntity(selectedEntity) ? 'LOCKS' : ''}
                tone="amber"
                progress={isSensorRuntimeEntity(selectedEntity)
                  ? Math.min(1, (selectedEntity.detected_threat_ids?.length ?? 0) / Math.max(1, selectedAssetConfig?.maxTracks ?? 1))
                  : selectedEntity.asset_status === 'engaging' ? 1 : 0.35}
              />
              <MetricPanel
                title={isSensorRuntimeEntity(selectedEntity) ? 'TRACK_LATENCY' : 'COOLDOWN'}
                value={isSensorRuntimeEntity(selectedEntity)
                  ? `${(selectedAssetConfig?.trackingLatencyS ?? 0).toFixed(1)}`
                  : `${Math.max(0, selectedEntity.cooldown_remaining_s ?? 0).toFixed(1)}`}
                unit="SEC"
                tone="amber"
                progress={isSensorRuntimeEntity(selectedEntity)
                  ? Math.min(1, (selectedAssetConfig?.trackingLatencyS ?? 0) / 6)
                  : Math.min(1, Math.max(0, selectedEntity.cooldown_remaining_s ?? 0) / Math.max(1, selectedAssetConfig?.cooldownS ?? 1))}
              />
            </>
          )}
          <div style={{ ...styles.panel, ...styles.alertPanel }}>
            <div style={styles.panelTitle}>CRITICAL_ALERT</div>
            <div style={styles.alertBody}>{alertText}</div>
          </div>
          {latestEntityEvent && (
            <div style={styles.panel}>
              <div style={styles.panelTitle}>LATEST_EVENT</div>
              <div style={styles.alertBody}>{formatRuntimeEventLabel(latestEntityEvent)}</div>
            </div>
          )}
          <RadarInset
            trackedLat={selectedEntity.position.lat}
            trackedLon={selectedEntity.position.lon}
            targetLat={(isSelectedMovingEntity ? terminalTarget : primaryLinkedThreat?.position)?.lat ?? null}
            targetLon={(isSelectedMovingEntity ? terminalTarget : primaryLinkedThreat?.position)?.lon ?? null}
          />
        </div>
      )}

      <div style={styles.bottomDock}>
        <div style={styles.bottomMetric}>
          <span style={styles.bottomLabel}>LAT/LONG</span>
          <span style={styles.bottomValue}>
            {selectedEntity
              ? `${Math.abs(selectedEntity.position.lat).toFixed(4)}${selectedEntity.position.lat >= 0 ? 'N' : 'S'} / ${Math.abs(selectedEntity.position.lon).toFixed(4)}${selectedEntity.position.lon >= 0 ? 'E' : 'W'}`
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
            {isSelectedMovingEntity
              ? `HDG ${selectedEntity?.heading_deg.toFixed(0) ?? '0'} / PIT ${selectedEntity?.pitch_deg.toFixed(0) ?? '0'}`
              : `STATE ${(selectedEntity?.asset_status ?? 'idle').toUpperCase()}`}
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
                {formatSimTime(event.sim_time_s)} // {formatRuntimeEventLabel(event)}
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
  assetPanel: {
    ...glassPanel,
    padding: '12px 12px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxHeight: 250,
    overflowY: 'auto',
  },
  assetGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  assetGroupLabel: {
    color: '#8ba0aa',
    fontSize: 10,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
  },
  assetRow: {
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '10px 10px 9px',
    textAlign: 'left',
    cursor: 'pointer',
  },
  assetRowTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
  },
  assetName: {
    color: '#dff8ff',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
  assetStatus: {
    color: '#ffd799',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
  },
  assetMeta: {
    color: '#70838d',
    fontSize: 10,
    marginTop: 6,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
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
