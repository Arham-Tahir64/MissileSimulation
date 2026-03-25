import { EntityDefinition } from './entity';

export interface ScenarioMetadata {
  id: string;
  name: string;
  description: string;
  duration_s: number;
  tick_rate_hz: number;
  threat_count: number;
  interceptor_count: number;
  tags: string[];
}

export interface ScriptedEvent {
  time_s: number;
  type: 'intercept_attempt' | 'sensor_track' | 'annotation';
  entity_ids: string[];
  label?: string;
}

export interface ScenarioDefinition {
  metadata: ScenarioMetadata;
  entities: EntityDefinition[];
  events?: ScriptedEvent[];
}
