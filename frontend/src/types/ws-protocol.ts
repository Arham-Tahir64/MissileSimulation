import { EntityState } from './entity';
import {
  EngagementOrderEvent,
  InterceptionEvent,
  RuntimeEvent,
  SensorTrackEvent,
  SimulationStatus,
} from './simulation';

// ──────────────────────────────────────────────
// Server → Client messages
// ──────────────────────────────────────────────

export interface WsSimState {
  type: 'sim_state';
  session_id: string;
  scenario_id: string;
  sim_time_s: number;
  wall_time_ms: number;
  status: SimulationStatus;
  entities: EntityState[];
  events: RuntimeEvent[];
}

export type WsEventIntercept = InterceptionEvent;
export type WsEventSensorTrack = SensorTrackEvent;
export type WsEventEngagementOrder = EngagementOrderEvent;

export interface WsSimStatus {
  type: 'sim_status';
  session_id: string;
  status: SimulationStatus;
  sim_time_s: number;
  message?: string;
}

export interface WsError {
  type: 'error';
  code: string;
  message: string;
  fatal: boolean;
}

export type ServerMessage =
  | WsSimState
  | WsEventIntercept
  | WsEventSensorTrack
  | WsEventEngagementOrder
  | WsSimStatus
  | WsError;

// ──────────────────────────────────────────────
// Client → Server commands
// ──────────────────────────────────────────────

export interface CmdLoad {
  type: 'cmd_load';
  scenario_id: string;
}

export interface CmdPlay {
  type: 'cmd_play';
  playback_speed: number;
}

export interface CmdPause {
  type: 'cmd_pause';
}

export interface CmdSeek {
  type: 'cmd_seek';
  target_time_s: number;
}

export interface CmdSetSpeed {
  type: 'cmd_set_speed';
  speed: number;
}

export interface CmdLoadDefinition {
  type: 'cmd_load_definition';
  /** Inline ScenarioDefinition — backend creates engine without touching the filesystem. */
  definition: import('./scenario').ScenarioDefinition;
}

export type ClientCommand = CmdLoad | CmdLoadDefinition | CmdPlay | CmdPause | CmdSeek | CmdSetSpeed;
