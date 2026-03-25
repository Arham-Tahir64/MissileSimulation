import { getEntityDisplayLabel, getEntityDisplayName, isDefenseAssetEntity, isSensorRuntimeEntity } from '../utils/entityRuntime';
import { EntityDefinition, EntityState } from '../types/entity';
import {
  ArchivedAssetActivity,
  ArchivedEventBreakdownRow,
  ArchivedInvestigationCue,
  ArchivedRunDetail,
  ArchivedRunSummary,
  ArchivedTrackOutcome,
} from '../types/runArchive';
import { RuntimeEvent, formatRuntimeEventLabel, isEngagementOrderEvent, isSensorTrackEvent } from '../types/simulation';
import { ScenarioDefinition } from '../types/scenario';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

interface RawRunSummary {
  run_id: string;
  session_id: string;
  scenario_id: string;
  scenario_name: string;
  scenario_description: string;
  status: 'completed';
  started_at_ms: number;
  completed_at_ms: number;
  duration_s: number;
  final_sim_time_s: number;
  event_count: number;
  entity_count: number;
  intercept_successes: number;
  intercept_misses: number;
}

interface RawRunDetail {
  summary: RawRunSummary;
  scenario: ScenarioDefinition;
  final_state: {
    entities: EntityState[];
    events: RuntimeEvent[];
  };
  events: RuntimeEvent[];
}

async function readJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Request failed for ${path}: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchArchivedRuns(): Promise<ArchivedRunSummary[]> {
  const runs = await readJson<RawRunSummary[]>('/api/runs');
  return runs.map(mapRunSummary);
}

export async function fetchArchivedRun(runId: string): Promise<ArchivedRunDetail> {
  const run = await readJson<RawRunDetail>(`/api/runs/${runId}`);
  return mapRunDetail(run);
}

export async function deleteArchivedRun(runId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/runs/${runId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to delete run ${runId}: ${res.status}`);
  }
}

function mapRunSummary(summary: RawRunSummary): ArchivedRunSummary {
  return {
    id: summary.run_id,
    session_id: summary.session_id,
    scenario_id: summary.scenario_id,
    scenario_name: summary.scenario_name,
    started_at: new Date(summary.started_at_ms).toISOString(),
    completed_at: new Date(summary.completed_at_ms).toISOString(),
    status: summary.status,
    duration_s: summary.duration_s,
    event_count: summary.event_count,
    track_count: summary.entity_count,
    asset_count: 0,
    intercept_successes: summary.intercept_successes,
    intercept_misses: summary.intercept_misses,
    tags: [],
  };
}

function mapRunDetail(run: RawRunDetail): ArchivedRunDetail {
  const definitionMap = new Map<string, EntityDefinition>(
    run.scenario.entities.map((entity) => [entity.id, entity]),
  );
  const finalEntities = run.final_state.entities;
  const movingTracks = finalEntities.filter((entity) => !isDefenseAssetEntity(entity, definitionMap.get(entity.id)));
  const defenseAssets = finalEntities.filter((entity) => isDefenseAssetEntity(entity, definitionMap.get(entity.id)));
  const latestEventMap = buildLatestEventMap(run.events);
  const eventBreakdown = buildEventBreakdown(run.events);

  return {
    ...mapRunSummary(run.summary),
    track_count: movingTracks.length,
    asset_count: defenseAssets.length,
    tags: run.scenario.metadata.tags,
    summary_lines: [
      `${movingTracks.length} TRACKS WERE PRESENT IN THE FINAL ARCHIVED STATE`,
      `${defenseAssets.length} DEFENSE ASSETS REMAINED IN THE THEATER SNAPSHOT`,
      `${run.summary.intercept_successes} SUCCESSFUL INTERCEPTS AND ${run.summary.intercept_misses} MISSED OUTCOMES WERE LOGGED`,
    ],
    event_breakdown: eventBreakdown,
    investigation_cues: buildInvestigationCues(run.events),
    track_outcomes: movingTracks.map((entity) => buildTrackOutcome(entity, definitionMap.get(entity.id), latestEventMap)),
    asset_activity: defenseAssets.map((entity) => buildAssetActivity(entity, definitionMap.get(entity.id), latestEventMap)),
    scenario_definition: run.scenario,
  };
}

function buildLatestEventMap(events: RuntimeEvent[]): Map<string, RuntimeEvent> {
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
      latest.set(event.threat_id, event);
      latest.set(event.interceptor_id, event);
    }
  }
  return latest;
}

function buildEventBreakdown(events: RuntimeEvent[]): ArchivedEventBreakdownRow[] {
  const sensorCount = events.filter(isSensorTrackEvent).length;
  const engagementCount = events.filter(isEngagementOrderEvent).length;
  const interceptCount = events.filter((event) => event.type === 'event_intercept').length;

  const rows: ArchivedEventBreakdownRow[] = [
    { type: 'sensor_track', label: 'Sensor Tracks', count: sensorCount, tone: 'amber' },
    { type: 'engagement_order', label: 'Engagement Orders', count: engagementCount, tone: 'cyan' },
    { type: 'event_intercept', label: 'Intercept Events', count: interceptCount, tone: 'red' },
  ];

  return rows.filter((row) => row.count > 0);
}

function buildInvestigationCues(events: RuntimeEvent[]): ArchivedInvestigationCue[] {
  return events
    .slice()
    .sort((left, right) => right.sim_time_s - left.sim_time_s)
    .slice(0, 6)
    .map((event) => ({
      id: event.event_id,
      sim_time_s: event.sim_time_s,
      title:
        event.type === 'sensor_track'
          ? 'Sensor Track'
          : event.type === 'engagement_order'
            ? 'Engagement Order'
            : event.outcome === 'success'
              ? 'Intercept Event'
              : 'Intercept Miss',
      subtitle: formatRuntimeEventLabel(event),
      tone:
        event.type === 'sensor_track'
          ? 'amber'
          : event.type === 'engagement_order'
            ? 'cyan'
            : event.outcome === 'success'
              ? 'cyan'
              : 'red',
    }));
}

function buildTrackOutcome(
  entity: EntityState,
  definition: EntityDefinition | undefined,
  latestEventMap: Map<string, RuntimeEvent>,
): ArchivedTrackOutcome {
  return {
    id: entity.id,
    name: getEntityDisplayName(entity, definition),
    label: getEntityDisplayLabel(entity, definition),
    outcome_label: entity.status.toUpperCase(),
    tone:
      entity.status === 'intercepted' || entity.status === 'destroyed'
        ? 'cyan'
        : entity.status === 'missed'
          ? 'red'
          : 'amber',
    latest_event_label: latestEventMap.get(entity.id)
      ? formatRuntimeEventLabel(latestEventMap.get(entity.id)!)
      : null,
  };
}

function buildAssetActivity(
  entity: EntityState,
  definition: EntityDefinition | undefined,
  latestEventMap: Map<string, RuntimeEvent>,
): ArchivedAssetActivity {
  const isRadar = isSensorRuntimeEntity(entity);
  const tone =
    entity.asset_status === 'engaging'
      ? 'cyan'
      : entity.asset_status === 'tracking' || entity.asset_status === 'cooldown'
        ? 'amber'
        : 'red';

  return {
    id: entity.id,
    name: getEntityDisplayName(entity, definition),
    role_label: isRadar ? 'SENSOR GRID' : 'BATTERY NODE',
    status_label: (entity.asset_status ?? 'idle').toUpperCase(),
    activity_label: isRadar
      ? `${entity.detected_threat_ids?.length ?? 0} TRACKS`
      : entity.current_target_id
        ? `TARGET ${entity.current_target_id}`
        : latestEventMap.get(entity.id)
          ? formatRuntimeEventLabel(latestEventMap.get(entity.id)!)
          : 'READY',
    tone,
  };
}
