import { EntityType, TrajectoryType } from '../types/entity';

export type DefenseAssetId =
  | 'iron_dome'
  | 'davids_sling'
  | 'arrow_battery'
  | 'search_radar'
  | 'tracking_radar'
  | 'ecm_jammer';

export interface DefenseAssetConfig {
  id: DefenseAssetId;
  entityType: Extract<EntityType, 'interceptor' | 'sensor'>;
  trajectoryType: Extract<TrajectoryType, 'stationary'>;
  label: string;
  shortLabel: string;
  description: string;
  cssColor: string;
  designatorPrefix: string;
  detectionRadiusM?: number;
  engagementRadiusM?: number;
  trackingLatencyS?: number;
  cooldownS?: number;
  maxTracks?: number;
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
    engagementRadiusM: 280_000,
    cooldownS: 10,
    maxTracks: 2,
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
    engagementRadiusM: 850_000,
    cooldownS: 16,
    maxTracks: 2,
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
    engagementRadiusM: 1_850_000,
    cooldownS: 20,
    maxTracks: 2,
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
    detectionRadiusM: 2_200_000,
    trackingLatencyS: 2,
    maxTracks: 12,
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
    detectionRadiusM: 1_050_000,
    trackingLatencyS: 0.8,
    maxTracks: 8,
  },
  {
    id: 'ecm_jammer',
    entityType: 'sensor',
    trajectoryType: 'stationary',
    label: 'ECM Jammer',
    shortLabel: 'ECM',
    description: 'Electronic countermeasure station — degrades enemy radar and guidance systems.',
    cssColor: '#ce93d8',
    designatorPrefix: 'ECM',
    detectionRadiusM: 600_000,
    trackingLatencyS: 0,
    maxTracks: 0,
  },
];

export function getDefenseAssetConfig(id: DefenseAssetId): DefenseAssetConfig {
  const config = DEFENSE_ASSET_CONFIGS.find((candidate) => candidate.id === id);
  if (!config) throw new Error(`No DefenseAssetConfig for "${id}"`);
  return config;
}

export function getDefenseAssetConfigByDesignator(
  designator: string | null | undefined,
): DefenseAssetConfig | null {
  if (!designator) return null;

  const prefix = designator.split('-', 1)[0].toUpperCase();
  return DEFENSE_ASSET_CONFIGS.find((candidate) => candidate.designatorPrefix === prefix) ?? null;
}
