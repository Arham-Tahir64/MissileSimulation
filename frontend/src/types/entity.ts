export interface GeoPosition {
  lat: number; // degrees WGS84
  lon: number; // degrees WGS84
  alt: number; // meters above ellipsoid
}

export type EntityType = 'ballistic_threat' | 'cruise_threat' | 'interceptor' | 'sensor';
export type EntityStatus = 'inactive' | 'active' | 'intercepted' | 'missed' | 'destroyed';
export type TrajectoryType = 'ballistic' | 'cruise' | 'stationary';
export type AssetStatus = 'idle' | 'tracking' | 'engaging' | 'cooldown';

/** Static entity configuration as defined in a scenario JSON file. */
export interface EntityDefinition {
  id: string;
  type: EntityType;
  label: string;
  designator: string; // Short tag, e.g. "T-1", "INT-A"
  trajectory_type: TrajectoryType;
  origin: GeoPosition;
  waypoints?: GeoPosition[]; // Cruise threats only
  target?: GeoPosition;      // Ballistic threats and interceptors
  launch_time_s: number;
  speed_ms?: number;         // Cruise threats; null means physics-derived
}

/** Live state of an entity at a given simulation tick. */
export interface EntityState {
  id: string;
  type: EntityType;
  status: EntityStatus;
  position: GeoPosition;
  velocity_ms: number;
  heading_deg: number;
  pitch_deg: number;
  sim_time_s: number;
  trajectory_type?: TrajectoryType | null;
  label?: string | null;
  designator?: string | null;
  asset_status?: AssetStatus | null;
  current_target_id?: string | null;
  detected_threat_ids?: string[];
  cooldown_remaining_s?: number | null;
}
