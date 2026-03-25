import { getDefenseAssetConfigByDesignator } from '../../config/defenseAssets';
import { ScenarioDefinition } from '../../types/scenario';
import {
  RuntimeEvent,
  formatRuntimeEventLabel,
  isEngagementOrderEvent,
  isSensorTrackEvent,
} from '../../types/simulation';
import { EntityDefinition, EntityState } from '../../types/entity';
import {
  getEntityDisplayLabel,
  getEntityDisplayName,
  isDefenseAssetEntity,
  isMovingRuntimeEntity,
  isSensorRuntimeEntity,
  isThreatRuntimeEntity,
} from '../../utils/entityRuntime';
import { computeFlightTimeS, haversineDistanceM } from '../../utils/cesiumHelpers';

export type SelectionKind = 'track' | 'asset' | 'none';

export interface TrackRow {
  id: string;
  name: string;
  label: string;
  type: EntityState['type'];
  status: EntityState['status'];
  altitudeFt: number;
  velocityMs: number;
  latestEventLabel: string | null;
  targetId: string | null;
  trackState: EntityState;
}

export interface DefenseAssetRow {
  id: string;
  name: string;
  label: string;
  role: 'radar' | 'battery';
  status: string;
  trackCount: number;
  readiness: string;
  rangeKm: number;
  latestEventLabel: string | null;
  currentTargetId: string | null;
  assetState: EntityState;
}

export interface AlertRow {
  id: string;
  simTimeS: number;
  title: string;
  subtitle: string;
  tone: 'cyan' | 'amber' | 'red';
  relatedEntityId: string | null;
  relatedAssetId: string | null;
  event: RuntimeEvent;
}

export interface ScenarioMetrics {
  totalTracks: number;
  activeTracks: number;
  completedTracks: number;
  totalAssets: number;
  radarsTracking: number;
  batteriesEngaging: number;
  activeAlerts: number;
  interceptSuccesses: number;
  interceptMisses: number;
  trackedThreats: number;
}

export interface ReplayEventMarker {
  id: string;
  fraction: number;
  tone: 'cyan' | 'amber' | 'red';
  label: string;
  event: RuntimeEvent;
}

export interface SelectionDetail {
  kind: SelectionKind;
  entity: EntityState | null;
  definition: EntityDefinition | null;
  title: string;
  subtitle: string;
  accent: string;
  rows: Array<{ label: string; value: string; tone?: 'cyan' | 'amber' | 'red' }>;
  latestEventLabel: string | null;
}

export interface HudSnapshot {
  scenarioLabel: string;
  sessionLabel: string;
  tracks: TrackRow[];
  defenseAssets: DefenseAssetRow[];
  alerts: AlertRow[];
  selection: SelectionDetail;
  metrics: ScenarioMetrics;
  markers: ReplayEventMarker[];
}

function buildDefinitionMap(activeScenario: ScenarioDefinition | null): Map<string, EntityDefinition> {
  return new Map((activeScenario?.entities ?? []).map((entity) => [entity.id, entity]));
}

function getLatestEventMap(events: RuntimeEvent[]): Map<string, RuntimeEvent> {
  const latest = new Map<string, RuntimeEvent>();
  for (const event of events) {
    if (isSensorTrackEvent(event)) {
      latest.set(event.sensor_id, event);
      latest.set(event.threat_id, event);
    } else if (isEngagementOrderEvent(event)) {
      latest.set(event.battery_id, event);
      latest.set(event.threat_id, event);
      latest.set(event.interceptor_id, event);
    } else {
      latest.set(event.interceptor_id, event);
      latest.set(event.threat_id, event);
    }
  }
  return latest;
}

function toTrackRow(
  entity: EntityState,
  definition: EntityDefinition | null,
  latestEventMap: Map<string, RuntimeEvent>,
): TrackRow {
  return {
    id: entity.id,
    name: getEntityDisplayName(entity, definition),
    label: getEntityDisplayLabel(entity, definition),
    type: entity.type,
    status: entity.status,
    altitudeFt: entity.position.alt * 3.28084,
    velocityMs: entity.velocity_ms,
    latestEventLabel: latestEventMap.get(entity.id)
      ? formatRuntimeEventLabel(latestEventMap.get(entity.id)!)
      : null,
    targetId: entity.current_target_id ?? null,
    trackState: entity,
  };
}

function toDefenseAssetRow(
  entity: EntityState,
  definition: EntityDefinition | null,
  latestEventMap: Map<string, RuntimeEvent>,
): DefenseAssetRow {
  const config = getDefenseAssetConfigByDesignator(entity.designator);
  const isRadar = isSensorRuntimeEntity(entity);

  return {
    id: entity.id,
    name: getEntityDisplayName(entity, definition),
    label: getEntityDisplayLabel(entity, definition),
    role: isRadar ? 'radar' : 'battery',
    status: (entity.asset_status ?? 'idle').toUpperCase(),
    trackCount: isRadar ? entity.detected_threat_ids?.length ?? 0 : entity.current_target_id ? 1 : 0,
    readiness: isRadar
      ? `${entity.detected_threat_ids?.length ?? 0}/${config?.maxTracks ?? 0} TRACKS`
      : entity.cooldown_remaining_s != null && entity.cooldown_remaining_s > 0
        ? `COOLDOWN ${entity.cooldown_remaining_s.toFixed(1)}S`
        : entity.current_target_id
          ? 'ENGAGED'
          : 'READY',
    rangeKm: ((config?.detectionRadiusM ?? config?.engagementRadiusM ?? 0) / 1000),
    latestEventLabel: latestEventMap.get(entity.id)
      ? formatRuntimeEventLabel(latestEventMap.get(entity.id)!)
      : null,
    currentTargetId: entity.current_target_id ?? null,
    assetState: entity,
  };
}

function toAlertRow(event: RuntimeEvent): AlertRow {
  if (isSensorTrackEvent(event)) {
    return {
      id: event.event_id,
      simTimeS: event.sim_time_s,
      title: 'Sensor Track',
      subtitle: `${event.sensor_id} acquired ${event.threat_id}`,
      tone: 'amber',
      relatedEntityId: event.threat_id,
      relatedAssetId: event.sensor_id,
      event,
    };
  }

  if (isEngagementOrderEvent(event)) {
    return {
      id: event.event_id,
      simTimeS: event.sim_time_s,
      title: 'Engagement Order',
      subtitle: `${event.battery_id} assigned ${event.interceptor_id}`,
      tone: 'cyan',
      relatedEntityId: event.interceptor_id,
      relatedAssetId: event.battery_id,
      event,
    };
  }

  return {
    id: event.event_id,
    simTimeS: event.sim_time_s,
    title: event.outcome === 'success' ? 'Intercept Event' : 'Intercept Miss',
    subtitle: `${event.interceptor_id} resolved ${event.threat_id}`,
    tone: event.outcome === 'success' ? 'cyan' : 'red',
    relatedEntityId: event.interceptor_id,
    relatedAssetId: null,
    event,
  };
}

function buildSelectionDetail(
  selectedEntity: EntityState | null,
  definition: EntityDefinition | null,
  latestEventMap: Map<string, RuntimeEvent>,
  entities: EntityState[],
  simTimeS: number,
): SelectionDetail {
  if (!selectedEntity) {
    return {
      kind: 'none',
      entity: null,
      definition: null,
      title: 'No Selection',
      subtitle: 'Choose a track or defense asset from the globe or dashboard.',
      accent: '#00e5ff',
      rows: [],
      latestEventLabel: null,
    };
  }

  const latestEventLabel = latestEventMap.get(selectedEntity.id)
    ? formatRuntimeEventLabel(latestEventMap.get(selectedEntity.id)!)
    : null;

  if (isDefenseAssetEntity(selectedEntity, definition)) {
    const config = getDefenseAssetConfigByDesignator(selectedEntity.designator);
    const linkedThreat = selectedEntity.current_target_id
      ? entities.find((entity) => entity.id === selectedEntity.current_target_id) ?? null
      : null;

    return {
      kind: 'asset',
      entity: selectedEntity,
      definition,
      title: getEntityDisplayName(selectedEntity, definition),
      subtitle: getEntityDisplayLabel(selectedEntity, definition),
      accent: isSensorRuntimeEntity(selectedEntity) ? '#ffd799' : '#67d4ff',
      rows: [
        { label: 'Status', value: (selectedEntity.asset_status ?? 'idle').toUpperCase() },
        {
          label: isSensorRuntimeEntity(selectedEntity) ? 'Tracked Threats' : 'Assigned Target',
          value: isSensorRuntimeEntity(selectedEntity)
            ? String(selectedEntity.detected_threat_ids?.length ?? 0)
            : selectedEntity.current_target_id ?? 'READY',
          tone: 'amber',
        },
        {
          label: 'Coverage',
          value: `${(((config?.detectionRadiusM ?? config?.engagementRadiusM) ?? 0) / 1000).toFixed(0)} KM`,
        },
        {
          label: isSensorRuntimeEntity(selectedEntity) ? 'Latency' : 'Cooldown',
          value: isSensorRuntimeEntity(selectedEntity)
            ? `${(config?.trackingLatencyS ?? 0).toFixed(1)} SEC`
            : `${Math.max(0, selectedEntity.cooldown_remaining_s ?? 0).toFixed(1)} SEC`,
        },
        {
          label: 'Linked Threat',
          value: linkedThreat ? getEntityDisplayName(linkedThreat) : 'None',
          tone: linkedThreat ? 'cyan' : undefined,
        },
      ],
      latestEventLabel,
    };
  }

  const terminalTarget = definition?.target
    ?? definition?.waypoints?.[definition.waypoints.length - 1]
    ?? null;
  const etaS = definition
    ? Math.max(0, definition.launch_time_s + computeFlightTimeS(definition) - simTimeS)
    : 0;
  const distanceToTarget = terminalTarget
    ? haversineDistanceM(selectedEntity.position, terminalTarget) / 1000
    : 0;

  return {
    kind: 'track',
    entity: selectedEntity,
    definition,
    title: getEntityDisplayName(selectedEntity, definition),
    subtitle: getEntityDisplayLabel(selectedEntity, definition),
    accent: isThreatRuntimeEntity(selectedEntity) ? '#ffb4ab' : '#00e5ff',
    rows: [
      { label: 'Status', value: selectedEntity.status.toUpperCase() },
      { label: 'Altitude', value: `${(selectedEntity.position.alt * 3.28084).toLocaleString(undefined, { maximumFractionDigits: 0 })} FT`, tone: 'cyan' },
      { label: 'Velocity', value: `${(selectedEntity.velocity_ms / 343).toFixed(1)} MACH` },
      { label: 'ETA', value: `${etaS.toFixed(1)} SEC`, tone: 'amber' },
      { label: 'Distance', value: `${distanceToTarget.toFixed(1)} KM` },
      { label: 'Target', value: terminalTarget ? `${terminalTarget.lat.toFixed(2)}, ${terminalTarget.lon.toFixed(2)}` : 'N/A' },
    ],
    latestEventLabel,
  };
}

function buildMetrics(
  tracks: TrackRow[],
  assets: DefenseAssetRow[],
  alerts: AlertRow[],
): ScenarioMetrics {
  const completedTracks = tracks.filter((track) => (
    track.status === 'intercepted' || track.status === 'destroyed' || track.status === 'missed'
  )).length;

  return {
    totalTracks: tracks.length,
    activeTracks: tracks.filter((track) => track.status === 'active').length,
    completedTracks,
    totalAssets: assets.length,
    radarsTracking: assets.filter((asset) => asset.role === 'radar' && asset.trackCount > 0).length,
    batteriesEngaging: assets.filter((asset) => asset.role === 'battery' && asset.currentTargetId).length,
    activeAlerts: alerts.length,
    interceptSuccesses: alerts.filter((alert) => alert.event.type === 'event_intercept' && alert.event.outcome === 'success').length,
    interceptMisses: alerts.filter((alert) => alert.event.type === 'event_intercept' && alert.event.outcome === 'miss').length,
    trackedThreats: assets
      .filter((asset) => asset.role === 'radar')
      .reduce((sum, asset) => sum + asset.trackCount, 0),
  };
}

function buildMarkers(events: RuntimeEvent[], durationS: number): ReplayEventMarker[] {
  if (durationS <= 0) return [];

  return events.map((event) => ({
    id: event.event_id,
    fraction: Math.max(0, Math.min(1, event.sim_time_s / durationS)),
    tone:
      event.type === 'sensor_track'
        ? 'amber'
        : event.type === 'engagement_order'
          ? 'cyan'
          : event.outcome === 'success'
            ? 'cyan'
            : 'red',
    label: formatRuntimeEventLabel(event),
    event,
  }));
}

export function deriveHudSnapshot({
  scenarioId,
  activeScenario,
  entities,
  events,
  trackedEntityId,
  simTimeS,
  durationS,
}: {
  scenarioId: string | null;
  activeScenario: ScenarioDefinition | null;
  entities: EntityState[];
  events: RuntimeEvent[];
  trackedEntityId: string | null;
  simTimeS: number;
  durationS: number;
}): HudSnapshot {
  const definitionMap = buildDefinitionMap(activeScenario);
  const latestEventMap = getLatestEventMap(events);
  const tracks = entities
    .filter((entity) => isMovingRuntimeEntity(entity, definitionMap.get(entity.id)))
    .map((entity) => toTrackRow(entity, definitionMap.get(entity.id) ?? null, latestEventMap))
    .sort((a, b) => {
      const statusRank = (status: EntityState['status']) => (
        status === 'active' ? 0 : status === 'inactive' ? 1 : 2
      );
      return statusRank(a.status) - statusRank(b.status);
    });

  const defenseAssets = entities
    .filter((entity) => isDefenseAssetEntity(entity, definitionMap.get(entity.id)))
    .map((entity) => toDefenseAssetRow(entity, definitionMap.get(entity.id) ?? null, latestEventMap))
    .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));

  const alerts = [...events]
    .slice(-16)
    .reverse()
    .map(toAlertRow);

  const selectedEntity = trackedEntityId
    ? entities.find((entity) => entity.id === trackedEntityId) ?? null
    : null;
  const selectedDefinition = selectedEntity
    ? definitionMap.get(selectedEntity.id) ?? null
    : null;

  return {
    scenarioLabel: activeScenario?.metadata.name ?? 'CUSTOM_SCENARIO',
    sessionLabel: scenarioId ?? 'SESSION_STANDBY',
    tracks,
    defenseAssets,
    alerts,
    selection: buildSelectionDetail(selectedEntity, selectedDefinition, latestEventMap, entities, simTimeS),
    metrics: buildMetrics(tracks, defenseAssets, alerts),
    markers: buildMarkers(events, durationS),
  };
}
