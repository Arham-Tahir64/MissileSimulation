import { EntityState, GeoPosition } from './entity';

export interface InterceptionEvent {
  event_id: string;
  sim_time_s: number;
  threat_id: string;
  interceptor_id: string;
  position: GeoPosition;
  outcome: 'success' | 'miss';
}

export type SimulationStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface SimulationState {
  session_id: string;
  scenario_id: string;
  sim_time_s: number;
  wall_time_ms: number;
  status: SimulationStatus;
  entities: EntityState[];
  events: InterceptionEvent[];
}
