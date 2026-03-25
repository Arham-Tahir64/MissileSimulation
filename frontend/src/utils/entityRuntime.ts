import { EntityDefinition, EntityState } from '../types/entity';

export function getRuntimeTrajectoryType(
  entity: EntityState,
  definition?: EntityDefinition | null,
) {
  return entity.trajectory_type ?? definition?.trajectory_type ?? null;
}

export function isMovingRuntimeEntity(
  entity: EntityState,
  definition?: EntityDefinition | null,
): boolean {
  return getRuntimeTrajectoryType(entity, definition) !== 'stationary';
}

export function isThreatRuntimeEntity(entity: EntityState): boolean {
  return entity.type === 'ballistic_threat' || entity.type === 'cruise_threat';
}

export function isSensorRuntimeEntity(entity: EntityState): boolean {
  return entity.type === 'sensor';
}

export function isDefenseAssetEntity(
  entity: EntityState,
  definition?: EntityDefinition | null,
): boolean {
  return !isMovingRuntimeEntity(entity, definition);
}

export function getEntityDisplayName(entity: EntityState, definition?: EntityDefinition | null): string {
  return entity.designator ?? definition?.designator ?? entity.id;
}

export function getEntityDisplayLabel(entity: EntityState, definition?: EntityDefinition | null): string {
  return entity.label ?? definition?.label ?? entity.type;
}
