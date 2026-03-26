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
  /** Salvo group identifier — set when this threat was launched within 15 s of another threat. */
  salvoId: string | null;
  /** Number of threats in the same salvo (including this one). Only set when salvoId is non-null. */
  salvoSize: number;
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
  /** Estimated single-shot kill probability (0–1). Null for non-engagement events. */
  pkScore: number | null;
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
  /** Total engagement slots across non-cooldown batteries. */
  batteryCapacity: number;
  /** True when active threats exceed available battery capacity. */
  saturated: boolean;
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

/** Base single-shot kill probability per battery designator prefix. */
const PK_BASE: Record<string, number> = {
  ID:  0.90,  // Iron Dome
  DS:  0.82,  // David's Sling
  ARW: 0.75,  // Arrow
};

/**
 * Deterministic pseudo-random ±0.05 variation seeded on the event ID string
 * so the same event always gets the same Pk value across renders.
 */
function pkJitter(eventId: string): number {
  let h = 0;
  for (let i = 0; i < eventId.length; i++) {
    h = (Math.imul(31, h) + eventId.charCodeAt(i)) | 0;
  }
  return ((h >>> 0) % 100) / 1000 - 0.05; // -0.05 .. +0.049
}

function computePk(batteryId: string | null, eventId: string): number | null {
  if (!batteryId) return null;
  const prefix = batteryId.split('-', 1)[0].toUpperCase();
  const base = PK_BASE[prefix] ?? null;
  if (base === null) return null;
  return Math.min(0.99, Math.max(0.1, base + pkJitter(eventId)));
}

function buildDefinitionMap(activeScenario: ScenarioDefinition | null): Map<string, EntityDefinition> {
  return new Map((activeScenario?.entities ?? []).map((entity) => [entity.id, entity]));
}

/** Group threat entities whose launch times fall within SALVO_WINDOW_S of each other. */
const SALVO_WINDOW_S = 15;

function buildSalvoMap(definitions: EntityDefinition[]): Map<string, { salvoId: string; salvoSize: number }> {
  const threatDefs = definitions.filter((d) =>
    d.type === 'ballistic_threat' || d.type === 'cruise_threat',
  );
  // Sort by launch time
  const sorted = [...threatDefs].sort((a, b) => (a.launch_time_s ?? 0) - (b.launch_time_s ?? 0));

  const result = new Map<string, { salvoId: string; salvoSize: number }>();
  let groupStart = 0;

  while (groupStart < sorted.length) {
    let groupEnd = groupStart + 1;
    const anchorTime = sorted[groupStart].launch_time_s ?? 0;
    while (
      groupEnd < sorted.length &&
      (sorted[groupEnd].launch_time_s ?? 0) - anchorTime <= SALVO_WINDOW_S
    ) {
      groupEnd++;
    }
    const group = sorted.slice(groupStart, groupEnd);
    if (group.length >= 2) {
      const salvoId = `salvo_${anchorTime.toFixed(0)}_${group.length}`;
      for (const def of group) {
        result.set(def.id, { salvoId, salvoSize: group.length });
      }
    }
    groupStart = groupEnd;
  }

  return result;
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
  salvoMap: Map<string, { salvoId: string; salvoSize: number }>,
): TrackRow {
  const salvo = salvoMap.get(entity.id) ?? null;
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
    salvoId: salvo?.salvoId ?? null,
    salvoSize: salvo?.salvoSize ?? 0,
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
      pkScore: null,
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
      pkScore: computePk(event.battery_id, event.event_id),
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
    pkScore: null,
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

  const latestEvent = latestEventMap.get(selectedEntity.id) ?? null;
  const linkedTargetId =
    selectedEntity.current_target_id
    ?? (latestEvent && (latestEvent.type === 'engagement_order' || latestEvent.type === 'event_intercept')
      ? latestEvent.threat_id
      : null);
  const linkedTarget = linkedTargetId
    ? entities.find((entity) => entity.id === linkedTargetId) ?? null
    : null;
  const terminalTarget = definition?.target
    ?? definition?.waypoints?.[definition.waypoints.length - 1]
    ?? null;
  const trackTargetPosition = linkedTarget?.position ?? terminalTarget ?? null;
  const distanceToTargetKm = trackTargetPosition
    ? haversineDistanceM(selectedEntity.position, trackTargetPosition) / 1000
    : null;

  let etaLabel = 'PENDING';
  if (selectedEntity.type === 'interceptor' && linkedTarget && selectedEntity.velocity_ms > 0) {
    const etaS = (distanceToTargetKm ?? 0) * 1000 / selectedEntity.velocity_ms;
    etaLabel = `${Math.max(0, etaS).toFixed(1)} SEC`;
  } else if (definition) {
    const etaS = Math.max(0, definition.launch_time_s + computeFlightTimeS(definition) - simTimeS);
    etaLabel = `${etaS.toFixed(1)} SEC`;
  }

  const targetLabel = linkedTarget
    ? getEntityDisplayName(linkedTarget)
    : terminalTarget
      ? `${terminalTarget.lat.toFixed(2)}, ${terminalTarget.lon.toFixed(2)}`
      : 'LINK_PENDING';

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
      { label: 'ETA', value: etaLabel, tone: etaLabel === 'PENDING' ? undefined : 'amber' },
      { label: 'Distance', value: distanceToTargetKm != null ? `${distanceToTargetKm.toFixed(1)} KM` : 'N/A' },
      { label: 'Target', value: targetLabel, tone: linkedTarget ? 'cyan' : undefined },
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

  const activeTracks = tracks.filter((track) => track.status === 'active').length;

  // Available battery capacity = max tracks across all batteries NOT in cooldown
  const batteryCapacity = assets
    .filter((asset) => asset.role === 'battery')
    .reduce((sum, asset) => {
      const cfg = getDefenseAssetConfigByDesignator(asset.assetState.designator);
      const inCooldown = asset.assetState.asset_status === 'cooldown';
      return sum + (inCooldown ? 0 : (cfg?.maxTracks ?? 0));
    }, 0);

  return {
    totalTracks: tracks.length,
    activeTracks,
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
    batteryCapacity,
    saturated: activeTracks > 0 && batteryCapacity > 0 && activeTracks > batteryCapacity,
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
  const salvoMap = buildSalvoMap(activeScenario?.entities ?? []);
  const tracks = entities
    .filter((entity) => isMovingRuntimeEntity(entity, definitionMap.get(entity.id)))
    .map((entity) => toTrackRow(entity, definitionMap.get(entity.id) ?? null, latestEventMap, salvoMap))
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
