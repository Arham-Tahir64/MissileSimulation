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
import { getDefenseAssetConfig } from '../config/defenseAssets';
import { PlannedPlacement } from '../store/placementStore';
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
export function buildScenario(placements: PlannedPlacement[]): ScenarioDefinition {
  const entities = placements.map((p, i) => {
    if (p.kind === 'asset') {
      const cfg = getDefenseAssetConfig(p.assetId);
      const id = `${cfg.designatorPrefix}-${i + 1}`;

      return {
        id,
        type: cfg.entityType,
        label: cfg.label,
        designator: id,
        trajectory_type: cfg.trajectoryType,
        origin: p.position,
        launch_time_s: 0,
      };
    }

    const cfg = getMissileTypeConfig(p.missileType);
    const launchTime = p.launchTimeS ?? 0;
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
      ...(cfg.trajectoryType === 'ballistic'
        ? { target: p.target }
        : { waypoints: [p.target] }),
      launch_time_s: launchTime,
      speed_ms: cfg.speedMs,
    };
  });

  // Compute longest flight time to determine scenario duration
  const missilePlacements = placements.filter((placement) => placement.kind === 'missile');
  const maxFlightTime = missilePlacements.reduce((max, p) => {
    const cfg = getMissileTypeConfig(p.missileType);
    const dist = haversineDistanceM(p.origin, p.target);
    const ft = estimateFlightTimeS(cfg, dist) + (p.launchTimeS ?? 0);
    return Math.max(max, ft);
  }, 0);

  const duration = Math.max(30, Math.ceil(maxFlightTime) + POST_FLIGHT_BUFFER_S);

  const threatCount = placements.filter(
    (p) => p.kind === 'missile' && p.missileType !== 'interceptor',
  ).length;
  const interceptorCount = placements.filter(
    (p) =>
      (p.kind === 'missile' && p.missileType === 'interceptor')
      || (p.kind === 'asset' && p.entityType === 'interceptor'),
  ).length;

  const scenarioId = `custom_${Date.now()}`;
  const scenarioName = placements.length === 1
    ? placements[0].kind === 'missile'
      ? `${getMissileTypeConfig(placements[0].missileType).label} Launch`
      : `${getDefenseAssetConfig(placements[0].assetId).label} Placement`
    : `Custom Scenario (${placements.length} entities)`;

  return {
    metadata: {
      id: scenarioId,
      name: scenarioName,
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
