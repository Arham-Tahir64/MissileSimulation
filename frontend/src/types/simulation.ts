import { EntityState, GeoPosition } from './entity';

export interface InterceptionEvent {
  type: 'event_intercept';
  event_id: string;
  sim_time_s: number;
  threat_id: string;
  interceptor_id: string;
  position: GeoPosition;
  outcome: 'success' | 'miss';
}

export interface SensorTrackEvent {
  type: 'sensor_track';
  event_id: string;
  sim_time_s: number;
  sensor_id: string;
  threat_id: string;
  position?: GeoPosition | null;
}

export interface EngagementOrderEvent {
  type: 'engagement_order';
  event_id: string;
  sim_time_s: number;
  battery_id: string;
  threat_id: string;
  interceptor_id: string;
  position?: GeoPosition | null;
}

export type RuntimeEvent = SensorTrackEvent | EngagementOrderEvent | InterceptionEvent;

export type SimulationStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface SimulationState {
  session_id: string;
  scenario_id: string;
  sim_time_s: number;
  wall_time_ms: number;
  status: SimulationStatus;
  entities: EntityState[];
  events: RuntimeEvent[];
}

export function isInterceptionEvent(event: RuntimeEvent): event is InterceptionEvent {
  return event.type === 'event_intercept';
}

export function isSensorTrackEvent(event: RuntimeEvent): event is SensorTrackEvent {
  return event.type === 'sensor_track';
}

export function isEngagementOrderEvent(event: RuntimeEvent): event is EngagementOrderEvent {
  return event.type === 'engagement_order';
}

export function formatRuntimeEventLabel(event: RuntimeEvent): string {
  switch (event.type) {
    case 'sensor_track':
      return `RADAR_LOCK // ${event.sensor_id} -> ${event.threat_id}`;
    case 'engagement_order':
      return `BATTERY_ENGAGE // ${event.battery_id} -> ${event.threat_id}`;
    case 'event_intercept':
      return `INTERCEPT_CONFIRMED // ${event.interceptor_id} -> ${event.threat_id}`;
  }
}
