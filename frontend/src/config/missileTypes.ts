/**
 * Missile type configuration — single source of truth for all missile
 * parameters used across the UI, reach-radius calculation, and scenario
 * generation.  Add new missile types here; all consumers pick them up
 * automatically.
 *
 * All physics values are FICTIONAL and NON-CALIBRATED (educational only).
 */

import { EntityType, TrajectoryType } from '../types/entity';

export interface MissileTypeConfig {
  // ── Identity ────────────────────────────────────────────────────────
  type: EntityType;
  trajectoryType: TrajectoryType;

  // ── Display ─────────────────────────────────────────────────────────
  label: string;         // full name shown in picker cards
  shortLabel: string;    // abbreviation used in tight spaces
  description: string;
  cssColor: string;      // hex/rgb — for DOM elements (non-Cesium)

  // ── Fictional physics ────────────────────────────────────────────────
  speedMs: number;       // average travel speed (m/s)
  maxRangeM: number;     // reach-radius for origin circle (m)
  apogeeAltM: number;    // ballistic apogee / cruise cruise altitude (m)
}

export const MISSILE_TYPE_CONFIGS: MissileTypeConfig[] = [
  {
    type: 'ballistic_threat',
    trajectoryType: 'ballistic',
    label: 'Ballistic Missile',
    shortLabel: 'ICBM',
    description: 'High-arc intercontinental trajectory',
    cssColor: '#fc8181',
    speedMs: 2_500,
    maxRangeM: 6_000_000,  // 6 000 km
    apogeeAltM: 300_000,   // 300 km
  },
  {
    type: 'cruise_threat',
    trajectoryType: 'cruise',
    label: 'Cruise Missile',
    shortLabel: 'CM',
    description: 'Low-altitude sustained waypoint flight',
    cssColor: '#f6ad55',
    speedMs: 250,
    maxRangeM: 500_000,    // 500 km
    apogeeAltM: 10_000,    // 10 km cruise altitude
  },
  {
    type: 'interceptor',
    trajectoryType: 'ballistic',
    label: 'Interceptor',
    shortLabel: 'INT',
    description: 'High-speed defensive ballistic missile',
    cssColor: '#63b3ed',
    speedMs: 2_500,
    maxRangeM: 3_000_000,  // 3 000 km
    apogeeAltM: 200_000,   // 200 km
  },
];

/** Look up a config by EntityType — always returns a value. */
export function getMissileTypeConfig(type: EntityType): MissileTypeConfig {
  const cfg = MISSILE_TYPE_CONFIGS.find((c) => c.type === type);
  if (!cfg) throw new Error(`No MissileTypeConfig for type "${type}"`);
  return cfg;
}

/**
 * Estimate flight time (seconds) between two points for a given config.
 * Uses haversine distance ÷ average speed — matches the backend model.
 */
export function estimateFlightTimeS(
  config: MissileTypeConfig,
  distanceM: number,
): number {
  return distanceM / config.speedMs;
}
