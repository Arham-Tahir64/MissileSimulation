import { EntityType, TrajectoryType } from '../types/entity';

export type DefenseAssetId =
  | 'iron_dome'
  | 'davids_sling'
  | 'arrow_battery'
  | 'search_radar'
  | 'tracking_radar';

export interface DefenseAssetConfig {
  id: DefenseAssetId;
  entityType: Extract<EntityType, 'interceptor' | 'sensor'>;
  trajectoryType: Extract<TrajectoryType, 'stationary'>;
  label: string;
  shortLabel: string;
  description: string;
  cssColor: string;
  designatorPrefix: string;
}

export const DEFENSE_ASSET_CONFIGS: DefenseAssetConfig[] = [
  {
    id: 'iron_dome',
    entityType: 'interceptor',
    trajectoryType: 'stationary',
    label: 'Iron Dome Battery',
    shortLabel: 'ID',
    description: 'Short-range interceptor site for terminal defense coverage.',
    cssColor: '#67d4ff',
    designatorPrefix: 'ID',
  },
  {
    id: 'davids_sling',
    entityType: 'interceptor',
    trajectoryType: 'stationary',
    label: "David's Sling Battery",
    shortLabel: 'DS',
    description: 'Medium-range interceptor battery for layered defense sectors.',
    cssColor: '#8be9ff',
    designatorPrefix: 'DS',
  },
  {
    id: 'arrow_battery',
    entityType: 'interceptor',
    trajectoryType: 'stationary',
    label: 'Arrow Battery',
    shortLabel: 'ARW',
    description: 'High-altitude interceptor site positioned for wide-area coverage.',
    cssColor: '#9cdfff',
    designatorPrefix: 'ARW',
  },
  {
    id: 'search_radar',
    entityType: 'sensor',
    trajectoryType: 'stationary',
    label: 'Early Warning Radar',
    shortLabel: 'EWR',
    description: 'Long-range search radar for initial track acquisition.',
    cssColor: '#ffe082',
    designatorPrefix: 'EWR',
  },
  {
    id: 'tracking_radar',
    entityType: 'sensor',
    trajectoryType: 'stationary',
    label: 'Tracking Radar',
    shortLabel: 'TRK',
    description: 'Fire-control radar for precision tracking and handoff.',
    cssColor: '#ffd36b',
    designatorPrefix: 'TRK',
  },
];

export function getDefenseAssetConfig(id: DefenseAssetId): DefenseAssetConfig {
  const config = DEFENSE_ASSET_CONFIGS.find((candidate) => candidate.id === id);
  if (!config) throw new Error(`No DefenseAssetConfig for "${id}"`);
  return config;
}
