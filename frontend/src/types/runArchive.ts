import { ScenarioDefinition } from './scenario';

export type ArchivedRunStatus = 'completed' | 'failed' | 'interrupted' | 'running';

export type ArchivedEventType = 'sensor_track' | 'engagement_order' | 'event_intercept' | 'annotation';

export interface ArchivedRunSummary {
  id: string;
  session_id: string;
  scenario_id: string | null;
  scenario_name: string;
  started_at: string;
  completed_at: string | null;
  status: ArchivedRunStatus;
  duration_s: number;
  event_count: number;
  track_count: number;
  asset_count: number;
  intercept_successes: number;
  intercept_misses: number;
  tags: string[];
}

export interface ArchivedEventBreakdownRow {
  type: ArchivedEventType;
  label: string;
  count: number;
  tone: 'cyan' | 'amber' | 'red';
}

export interface ArchivedInvestigationCue {
  id: string;
  sim_time_s: number;
  title: string;
  subtitle: string;
  tone: 'cyan' | 'amber' | 'red';
}

export interface ArchivedTrackOutcome {
  id: string;
  name: string;
  label: string;
  outcome_label: string;
  tone: 'cyan' | 'amber' | 'red';
  latest_event_label: string | null;
}

export interface ArchivedAssetActivity {
  id: string;
  name: string;
  role_label: string;
  status_label: string;
  activity_label: string;
  tone: 'cyan' | 'amber' | 'red';
}

export interface ArchivedRunDetail extends ArchivedRunSummary {
  summary_lines: string[];
  event_breakdown: ArchivedEventBreakdownRow[];
  investigation_cues: ArchivedInvestigationCue[];
  track_outcomes: ArchivedTrackOutcome[];
  asset_activity: ArchivedAssetActivity[];
  scenario_definition: ScenarioDefinition;
}
