import { HudSnapshot, AlertRow, DefenseAssetRow, TrackRow } from '../../HUD/hudSelectors';

export interface OutcomeMetric {
  label: string;
  value: string;
  tone: 'cyan' | 'amber' | 'red';
  detail: string;
}

export interface EventBreakdownRow {
  label: string;
  count: number;
  fraction: number;
  tone: 'cyan' | 'amber' | 'red';
}

export interface InvestigationCue {
  id: string;
  title: string;
  subtitle: string;
  timeLabel: string;
  simTimeS: number;
  tone: 'cyan' | 'amber' | 'red';
}

export interface AssetActivityRow {
  id: string;
  name: string;
  roleLabel: string;
  activityLabel: string;
  statusLabel: string;
  emphasis: 'tracking' | 'engaging' | 'ready';
}

export interface TrackOutcomeRow {
  id: string;
  name: string;
  label: string;
  statusLabel: string;
  statusTone: 'cyan' | 'amber' | 'red';
  latestEventLabel: string;
}

export interface AnalysisModel {
  headline: string;
  narrative: string;
  outcomeMetrics: OutcomeMetric[];
  eventBreakdown: EventBreakdownRow[];
  investigationCues: InvestigationCue[];
  assetActivity: AssetActivityRow[];
  trackOutcomes: TrackOutcomeRow[];
  summaryLines: string[];
}

function toTimeLabel(simTimeS: number): string {
  const total = Math.max(0, Math.round(simTimeS));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatTrackOutcome(track: TrackRow): TrackOutcomeRow {
  const statusTone =
    track.status === 'intercepted' || track.status === 'destroyed'
      ? 'cyan'
      : track.status === 'missed'
        ? 'red'
        : 'amber';

  return {
    id: track.id,
    name: track.name,
    label: track.label,
    statusLabel: track.status.toUpperCase(),
    statusTone,
    latestEventLabel: track.latestEventLabel ?? 'NO_EVENT_LOGGED',
  };
}

function formatAssetActivity(asset: DefenseAssetRow): AssetActivityRow {
  const emphasis =
    asset.status === 'TRACKING'
      ? 'tracking'
      : asset.status === 'ENGAGING' || asset.readiness.startsWith('ENGAGED')
        ? 'engaging'
        : 'ready';

  return {
    id: asset.id,
    name: asset.name,
    roleLabel: asset.role === 'radar' ? 'SENSOR GRID' : 'BATTERY NODE',
    activityLabel:
      asset.role === 'radar'
        ? `${asset.trackCount} TRACKS // ${asset.rangeKm.toFixed(0)} KM COVERAGE`
        : asset.currentTargetId
          ? `TARGET ${asset.currentTargetId} // ${asset.readiness}`
          : asset.readiness,
    statusLabel: asset.status,
    emphasis,
  };
}

function formatCue(alert: AlertRow): InvestigationCue {
  return {
    id: alert.id,
    title: alert.title,
    subtitle: alert.subtitle,
    timeLabel: toTimeLabel(alert.simTimeS),
    simTimeS: alert.simTimeS,
    tone: alert.tone,
  };
}

export function buildAnalysisModel(snapshot: HudSnapshot): AnalysisModel {
  const totalEvents = Math.max(snapshot.alerts.length, 1);
  const sensorEvents = snapshot.alerts.filter((alert) => alert.event.type === 'sensor_track').length;
  const engagementEvents = snapshot.alerts.filter((alert) => alert.event.type === 'engagement_order').length;
  const interceptEvents = snapshot.alerts.filter((alert) => alert.event.type === 'event_intercept').length;

  const activeAssets = snapshot.defenseAssets.filter((asset) => asset.status === 'TRACKING' || asset.status === 'ENGAGING').length;
  const completedTracks = snapshot.metrics.completedTracks;
  const unresolvedTracks = Math.max(snapshot.metrics.totalTracks - completedTracks, 0);

  const outcomeMetrics: OutcomeMetric[] = [
    {
      label: 'Completed Tracks',
      value: String(completedTracks),
      tone: 'cyan',
      detail: `${snapshot.metrics.totalTracks} TOTAL TRACKS OBSERVED`,
    },
    {
      label: 'Intercept Success',
      value: String(snapshot.metrics.interceptSuccesses),
      tone: 'cyan',
      detail: `${snapshot.metrics.interceptMisses} MISSED OR UNRESOLVED`,
    },
    {
      label: 'Active Assets',
      value: String(activeAssets),
      tone: activeAssets > 0 ? 'amber' : 'cyan',
      detail: `${snapshot.metrics.totalAssets} DEFENSE NODES ONLINE`,
    },
    {
      label: 'Live Alert Load',
      value: String(snapshot.metrics.activeAlerts),
      tone: snapshot.metrics.activeAlerts > 0 ? 'amber' : 'cyan',
      detail: `${interceptEvents} RESOLUTION EVENTS LOGGED`,
    },
  ];

  const eventBreakdown: EventBreakdownRow[] = [
    { label: 'Sensor Tracks', count: sensorEvents, fraction: sensorEvents / totalEvents, tone: 'amber' },
    { label: 'Engagement Orders', count: engagementEvents, fraction: engagementEvents / totalEvents, tone: 'cyan' },
    { label: 'Intercept Events', count: interceptEvents, fraction: interceptEvents / totalEvents, tone: 'red' },
  ];

  const cues = snapshot.alerts
    .slice()
    .sort((left, right) => right.simTimeS - left.simTimeS)
    .slice(0, 5)
    .map(formatCue);

  const assetActivity = snapshot.defenseAssets
    .slice()
    .sort((left, right) => {
      const leftScore = left.status === 'ENGAGING' ? 3 : left.status === 'TRACKING' ? 2 : 1;
      const rightScore = right.status === 'ENGAGING' ? 3 : right.status === 'TRACKING' ? 2 : 1;
      return rightScore - leftScore || right.trackCount - left.trackCount;
    })
    .slice(0, 6)
    .map(formatAssetActivity);

  const trackOutcomes = snapshot.tracks
    .slice()
    .sort((left, right) => {
      const leftDone = left.status === 'intercepted' || left.status === 'destroyed' || left.status === 'missed' ? 1 : 0;
      const rightDone = right.status === 'intercepted' || right.status === 'destroyed' || right.status === 'missed' ? 1 : 0;
      return rightDone - leftDone || right.altitudeFt - left.altitudeFt;
    })
    .slice(0, 8)
    .map(formatTrackOutcome);

  const headline =
    snapshot.metrics.interceptSuccesses > 0
      ? 'Interception chain produced resolved outcomes.'
      : snapshot.metrics.activeAlerts > 0
        ? 'Scenario still favors investigation over closure.'
        : 'Scenario remains stable with low event pressure.';

  const narrative =
    snapshot.metrics.totalAssets === 0
      ? 'This run was executed without a fictional defense network, so the report centers on track motion and terminal outcomes.'
      : activeAssets > 0
        ? 'Defense assets stayed active through the run, with sensor acquisition and battery tasking contributing to the final event picture.'
        : 'Defense assets were present but the current snapshot is calmer, so this report emphasizes totals, final states, and replay hooks.';

  const summaryLines = [
    `${snapshot.metrics.trackedThreats} TRACKS WERE ACTIVELY OBSERVED BY SENSORS`,
    `${snapshot.metrics.batteriesEngaging} BATTERIES SHOW ACTIVE TASKING IN THIS SNAPSHOT`,
    `${unresolvedTracks} TRACKS REMAIN OPEN OR IN FLIGHT`,
  ];

  return {
    headline,
    narrative,
    outcomeMetrics,
    eventBreakdown,
    investigationCues: cues,
    assetActivity,
    trackOutcomes,
    summaryLines,
  };
}
