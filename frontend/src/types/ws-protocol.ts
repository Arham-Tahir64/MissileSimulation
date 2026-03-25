import { EntityState, GeoPosition } from './entity';
import { SimulationStatus } from './simulation';

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
  events: WsEventIntercept[];
}

export interface WsEventIntercept {
  type: 'event_intercept';
  event_id: string;
  sim_time_s: number;
  threat_id: string;
  interceptor_id: string;
  position: GeoPosition;
  outcome: 'success' | 'miss';
}

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

export type ServerMessage = WsSimState | WsEventIntercept | WsSimStatus | WsError;

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

export type ClientCommand = CmdLoad | CmdPlay | CmdPause | CmdSeek | CmdSetSpeed;
