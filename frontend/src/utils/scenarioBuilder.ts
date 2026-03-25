/**
 * Builds a complete ScenarioDefinition from user placement data.
 *
 * Designed to be extended: `buildScenario` accepts an array of placements
 * so future multi-missile scenarios can add more entries without changing
 * the interface.
 */

import { GeoPosition, EntityType } from '../types/entity';
import { ScenarioDefinition } from '../types/scenario';
import { getMissileTypeConfig, estimateFlightTimeS } from '../config/missileTypes';
import { haversineDistanceM } from './cesiumHelpers';

export interface SinglePlacement {
  missileType: EntityType;
  origin: GeoPosition;
  target: GeoPosition;
  launchTimeS?: number; // default 0
}

const TICK_RATE_HZ = 10;
const POST_FLIGHT_BUFFER_S = 20; // seconds after last entity lands before scenario ends

/**
 * Generates a ScenarioDefinition from one or more placement descriptors.
 * The scenario id and metadata are auto-generated.
 */
export function buildScenario(placements: SinglePlacement[]): ScenarioDefinition {
  const entities = placements.map((p, i) => {
    const cfg = getMissileTypeConfig(p.missileType);
    const launchTime = p.launchTimeS ?? 0;

    // Derive a short entity id from type prefix + index
    const prefix =
      p.missileType === 'interceptor' ? 'INT'
      : p.missileType === 'cruise_threat' ? 'CM'
      : 'T';
    const id = `${prefix}-${i + 1}`;

    return {
      id,
      type: p.missileType,
      label: cfg.label,
      designator: id,
      trajectory_type: cfg.trajectoryType,
      origin: p.origin,
      // Ballistic uses target; cruise uses waypoints
      ...(cfg.trajectoryType === 'ballistic'
        ? { target: p.target }
        : { waypoints: [p.target] }),
      launch_time_s: launchTime,
      speed_ms: cfg.speedMs,
    };
  });

  // Compute longest flight time to determine scenario duration
  const maxFlightTime = placements.reduce((max, p) => {
    const cfg = getMissileTypeConfig(p.missileType);
    const dist = haversineDistanceM(p.origin, p.target);
    const ft = estimateFlightTimeS(cfg, dist) + (p.launchTimeS ?? 0);
    return Math.max(max, ft);
  }, 0);

  const duration = Math.ceil(maxFlightTime) + POST_FLIGHT_BUFFER_S;

  const threatCount = placements.filter(
    (p) => p.missileType !== 'interceptor',
  ).length;
  const interceptorCount = placements.filter(
    (p) => p.missileType === 'interceptor',
  ).length;

  const scenarioId = `custom_${Date.now()}`;

  return {
    metadata: {
      id: scenarioId,
      name: placements.length === 1
        ? `${getMissileTypeConfig(placements[0].missileType).label} Launch`
        : `Custom Scenario (${placements.length} missiles)`,
      description: 'User-generated scenario',
      duration_s: duration,
      tick_rate_hz: TICK_RATE_HZ,
      threat_count: threatCount,
      interceptor_count: interceptorCount,
      tags: ['custom', 'user-placed'],
    },
    entities,
    events: [],
  };
}
