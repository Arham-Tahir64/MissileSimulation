/**
 * Placement state machine.
 *
 * Phase transitions:
 *   idle → placing_origin   (user selects a missile type)
 *   placing_origin → origin_set  (user clicks globe)
 *   origin_set → target_set      (user clicks within reach radius)
 *   target_set → idle            (user queues current draft for later)
 *   target_set → simulating      (user launches queued scenario)
 *   simulating → idle            (simulation completes or user resets)
 */

import { create } from 'zustand';
import { EntityType, GeoPosition } from '../types/entity';
import { DefenseAssetId, getDefenseAssetConfig } from '../config/defenseAssets';

export type PlacementPhase =
  | 'idle'             // Nothing selected
  | 'placing_origin'   // Type chosen — waiting for first globe click
  | 'origin_set'       // Origin placed — reach radius shown, waiting for target
  | 'placing_barrage_origin'
  | 'barrage_origin_set'
  | 'barrage_target_set'
  | 'placing_asset'    // Defense asset selected — waiting for one globe click
  | 'target_set'       // Both points set — ready to launch
  | 'simulating';      // Simulation running

export type BarrageLaunchTimingMode =
  | 'simultaneous'
  | 'staggered'
  | 'random_window';

export interface BarrageArea {
  center: GeoPosition;
  radiusKm: number;
}

export interface PlannedLaunchPlacement {
  id: string;
  kind: 'missile';
  missileType: EntityType;
  origin: GeoPosition;
  target: GeoPosition;
  launchTimeS: number;
}

export interface PlannedAssetPlacement {
  id: string;
  kind: 'asset';
  assetId: DefenseAssetId;
  entityType: EntityType;
  position: GeoPosition;
}

export interface PlannedBarragePlacement {
  id: string;
  kind: 'barrage';
  missileType: Exclude<EntityType, 'sensor' | 'interceptor'>;
  launchArea: BarrageArea;
  targetArea: BarrageArea;
  count: number;
  seed: string;
  launchTimeS: number;
  launchTimingMode: BarrageLaunchTimingMode;
  launchWindowS: number;
  label?: string;
}

export type PlannedPlacement =
  | PlannedLaunchPlacement
  | PlannedAssetPlacement
  | PlannedBarragePlacement;

const DEFAULT_BARRAGE_RADIUS_KM = 80;
const DEFAULT_BARRAGE_COUNT = 6;
const DEFAULT_BARRAGE_WINDOW_S = 45;
const MAX_BARRAGE_COUNT = 48;

function createSeed(): string {
  return Math.floor(Date.now() % 1_000_000_000).toString(36);
}

interface PlacementStore {
  phase: PlacementPhase;
  missileType: EntityType | null;
  assetId: DefenseAssetId | null;
  origin: GeoPosition | null;
  target: GeoPosition | null;
  launchTimeS: number;
  barrageMissileType: Exclude<EntityType, 'sensor' | 'interceptor'> | null;
  barrageLaunchCenter: GeoPosition | null;
  barrageLaunchRadiusKm: number;
  barrageTargetCenter: GeoPosition | null;
  barrageTargetRadiusKm: number;
  barrageCount: number;
  barrageSeed: string;
  barrageLaunchTimingMode: BarrageLaunchTimingMode;
  barrageLaunchWindowS: number;
  barrageLaunchTimeS: number;
  placements: PlannedPlacement[];

  // ── Actions ────────────────────────────────────────────────────────
  /** Select missile type and advance to placing_origin. */
  selectType: (type: EntityType) => void;
  /** Select barrage missile type and wait for launch-area center click. */
  selectBarrageType: (type: Exclude<EntityType, 'sensor' | 'interceptor'>) => void;
  /** Select a defense asset and wait for a single placement click. */
  selectAsset: (assetId: DefenseAssetId) => void;
  /** Record origin click and advance to origin_set. */
  setOrigin: (pos: GeoPosition) => void;
  /** Record target click and advance to target_set. */
  setTarget: (pos: GeoPosition) => void;
  /** Record barrage launch-area center. */
  setBarrageLaunchCenter: (pos: GeoPosition) => void;
  /** Record barrage target-area center. */
  setBarrageTargetCenter: (pos: GeoPosition) => void;
  /** Update barrage launch radius. */
  setBarrageLaunchRadiusKm: (radiusKm: number) => void;
  /** Update barrage target radius. */
  setBarrageTargetRadiusKm: (radiusKm: number) => void;
  /** Update barrage missile count. */
  setBarrageCount: (count: number) => void;
  /** Update barrage seed. */
  setBarrageSeed: (seed: string) => void;
  /** Regenerate the barrage seed. */
  regenerateBarrageSeed: () => void;
  /** Update barrage timing mode. */
  setBarrageLaunchTimingMode: (mode: BarrageLaunchTimingMode) => void;
  /** Update barrage timing window. */
  setBarrageLaunchWindowS: (launchWindowS: number) => void;
  /** Update barrage start offset. */
  setBarrageLaunchTimeS: (launchTimeS: number) => void;
  /** Queue a single-click defense asset placement and return to idle. */
  addAssetPlacement: (pos: GeoPosition) => void;
  /** Update the pending missile's launch offset. */
  setDraftLaunchTime: (launchTimeS: number) => void;
  /** Queue the current draft and return to idle for the next missile. */
  addCurrentPlacement: () => void;
  /** Queue the current barrage draft. */
  addCurrentBarragePlacement: () => void;
  /** Remove one queued placement. */
  removePlacement: (id: string) => void;
  /** Update a queued placement's launch offset. */
  updatePlacementLaunchTime: (id: string, launchTimeS: number) => void;
  /** Update a queued barrage placement. */
  updateBarragePlacement: (
    id: string,
    patch: Partial<Omit<PlannedBarragePlacement, 'id' | 'kind'>>,
  ) => void;
  /** Cancel the in-progress draft without clearing queued missiles. */
  clearCurrent: () => void;
  /** Advance to simulating (called just before sending cmd_play). */
  beginSimulation: () => void;
  /** Return to idle and clear all placement data. */
  reset: () => void;
}

function normalizeLaunchTime(launchTimeS: number): number {
  return Math.max(0, Number.isFinite(launchTimeS) ? launchTimeS : 0);
}

function normalizeRadiusKm(radiusKm: number): number {
  return Math.min(500, Math.max(5, Number.isFinite(radiusKm) ? radiusKm : DEFAULT_BARRAGE_RADIUS_KM));
}

function normalizeBarrageCount(count: number): number {
  return Math.min(MAX_BARRAGE_COUNT, Math.max(1, Math.round(Number.isFinite(count) ? count : DEFAULT_BARRAGE_COUNT)));
}

function normalizeLaunchWindowS(launchWindowS: number): number {
  return Math.max(0, Math.round(Number.isFinite(launchWindowS) ? launchWindowS : DEFAULT_BARRAGE_WINDOW_S));
}

function resetDraftState() {
  return {
    phase: 'idle' as PlacementPhase,
    missileType: null,
    assetId: null,
    origin: null,
    target: null,
    launchTimeS: 0,
    barrageMissileType: null,
    barrageLaunchCenter: null,
    barrageLaunchRadiusKm: DEFAULT_BARRAGE_RADIUS_KM,
    barrageTargetCenter: null,
    barrageTargetRadiusKm: DEFAULT_BARRAGE_RADIUS_KM,
    barrageCount: DEFAULT_BARRAGE_COUNT,
    barrageSeed: createSeed(),
    barrageLaunchTimingMode: 'staggered' as BarrageLaunchTimingMode,
    barrageLaunchWindowS: DEFAULT_BARRAGE_WINDOW_S,
    barrageLaunchTimeS: 0,
  };
}

export function countPlacementLaunches(placements: PlannedPlacement[]): number {
  return placements.reduce((sum, placement) => {
    if (placement.kind === 'missile') return sum + 1;
    if (placement.kind === 'barrage') return sum + placement.count;
    return sum;
  }, 0);
}

export function countPlacementAssets(placements: PlannedPlacement[]): number {
  return placements.reduce((sum, placement) => (
    placement.kind === 'asset' ? sum + 1 : sum
  ), 0);
}

export const usePlacementStore = create<PlacementStore>((set) => ({
  ...resetDraftState(),
  placements: [],

  selectType: (type) =>
    set((state) => ({
      phase: 'placing_origin',
      missileType: type,
      assetId: null,
      origin: null,
      target: null,
      launchTimeS: state.launchTimeS,
      barrageMissileType: null,
      barrageLaunchCenter: null,
      barrageTargetCenter: null,
      barrageSeed: createSeed(),
    })),

  selectBarrageType: (type) =>
    set({
      phase: 'placing_barrage_origin',
      missileType: null,
      assetId: null,
      origin: null,
      target: null,
      launchTimeS: 0,
      barrageMissileType: type,
      barrageLaunchCenter: null,
      barrageLaunchRadiusKm: DEFAULT_BARRAGE_RADIUS_KM,
      barrageTargetCenter: null,
      barrageTargetRadiusKm: DEFAULT_BARRAGE_RADIUS_KM,
      barrageCount: DEFAULT_BARRAGE_COUNT,
      barrageSeed: createSeed(),
      barrageLaunchTimingMode: 'staggered',
      barrageLaunchWindowS: DEFAULT_BARRAGE_WINDOW_S,
      barrageLaunchTimeS: 0,
    }),

  selectAsset: (assetId) =>
    set({
      phase: 'placing_asset',
      missileType: null,
      assetId,
      origin: null,
      target: null,
      launchTimeS: 0,
      barrageMissileType: null,
      barrageLaunchCenter: null,
      barrageTargetCenter: null,
    }),

  setOrigin: (pos) =>
    set({ phase: 'origin_set', origin: pos, target: null }),

  setTarget: (pos) =>
    set({ phase: 'target_set', target: pos }),

  setBarrageLaunchCenter: (pos) =>
    set({ phase: 'barrage_origin_set', barrageLaunchCenter: pos, barrageTargetCenter: null }),

  setBarrageTargetCenter: (pos) =>
    set({ phase: 'barrage_target_set', barrageTargetCenter: pos }),

  setBarrageLaunchRadiusKm: (radiusKm) =>
    set({ barrageLaunchRadiusKm: normalizeRadiusKm(radiusKm) }),

  setBarrageTargetRadiusKm: (radiusKm) =>
    set({ barrageTargetRadiusKm: normalizeRadiusKm(radiusKm) }),

  setBarrageCount: (count) =>
    set({ barrageCount: normalizeBarrageCount(count) }),

  setBarrageSeed: (seed) =>
    set({ barrageSeed: seed.slice(0, 32) }),

  regenerateBarrageSeed: () =>
    set({ barrageSeed: createSeed() }),

  setBarrageLaunchTimingMode: (mode) =>
    set({ barrageLaunchTimingMode: mode }),

  setBarrageLaunchWindowS: (launchWindowS) =>
    set({ barrageLaunchWindowS: normalizeLaunchWindowS(launchWindowS) }),

  setBarrageLaunchTimeS: (launchTimeS) =>
    set({ barrageLaunchTimeS: normalizeLaunchTime(launchTimeS) }),

  addAssetPlacement: (pos) =>
    set((state) => {
      if (!state.assetId) return state;

      const config = getDefenseAssetConfig(state.assetId);
      const placement: PlannedAssetPlacement = {
        id: `placement_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        kind: 'asset',
        assetId: state.assetId,
        entityType: config.entityType,
        position: { ...pos, alt: 0 },
      };

      return {
        placements: [...state.placements, placement],
        ...resetDraftState(),
      };
    }),

  setDraftLaunchTime: (launchTimeS) =>
    set({ launchTimeS: normalizeLaunchTime(launchTimeS) }),

  addCurrentPlacement: () =>
    set((state) => {
      if (!state.missileType || !state.origin || !state.target) return state;

      const placement: PlannedLaunchPlacement = {
        id: `placement_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        kind: 'missile',
        missileType: state.missileType,
        origin: state.origin,
        target: state.target,
        launchTimeS: normalizeLaunchTime(state.launchTimeS),
      };

      return {
        placements: [...state.placements, placement],
        ...resetDraftState(),
      };
    }),

  addCurrentBarragePlacement: () =>
    set((state) => {
      if (!state.barrageMissileType || !state.barrageLaunchCenter || !state.barrageTargetCenter) {
        return state;
      }

      const placement: PlannedBarragePlacement = {
        id: `barrage_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        kind: 'barrage',
        missileType: state.barrageMissileType,
        launchArea: {
          center: state.barrageLaunchCenter,
          radiusKm: normalizeRadiusKm(state.barrageLaunchRadiusKm),
        },
        targetArea: {
          center: state.barrageTargetCenter,
          radiusKm: normalizeRadiusKm(state.barrageTargetRadiusKm),
        },
        count: normalizeBarrageCount(state.barrageCount),
        seed: state.barrageSeed || createSeed(),
        launchTimeS: normalizeLaunchTime(state.barrageLaunchTimeS),
        launchTimingMode: state.barrageLaunchTimingMode,
        launchWindowS: normalizeLaunchWindowS(state.barrageLaunchWindowS),
      };

      return {
        placements: [...state.placements, placement],
        ...resetDraftState(),
      };
    }),

  removePlacement: (id) =>
    set((state) => ({
      placements: state.placements.filter((placement) => placement.id !== id),
    })),

  updatePlacementLaunchTime: (id, launchTimeS) =>
    set((state) => ({
      placements: state.placements.map((placement) =>
        placement.id === id && placement.kind === 'missile'
          ? { ...placement, launchTimeS: normalizeLaunchTime(launchTimeS) }
          : placement,
      ),
    })),

  updateBarragePlacement: (id, patch) =>
    set((state) => ({
      placements: state.placements.map((placement) => {
        if (placement.id !== id || placement.kind !== 'barrage') return placement;

        return {
          ...placement,
          ...patch,
          launchArea: patch.launchArea
            ? {
              center: patch.launchArea.center,
              radiusKm: normalizeRadiusKm(patch.launchArea.radiusKm),
            }
            : placement.launchArea,
          targetArea: patch.targetArea
            ? {
              center: patch.targetArea.center,
              radiusKm: normalizeRadiusKm(patch.targetArea.radiusKm),
            }
            : placement.targetArea,
          count: patch.count !== undefined ? normalizeBarrageCount(patch.count) : placement.count,
          launchTimeS:
            patch.launchTimeS !== undefined
              ? normalizeLaunchTime(patch.launchTimeS)
              : placement.launchTimeS,
          launchWindowS:
            patch.launchWindowS !== undefined
              ? normalizeLaunchWindowS(patch.launchWindowS)
              : placement.launchWindowS,
          seed: patch.seed !== undefined ? patch.seed.slice(0, 32) : placement.seed,
        };
      }),
    })),

  clearCurrent: () =>
    set(resetDraftState()),

  beginSimulation: () =>
    set({ phase: 'simulating' }),

  reset: () =>
    set({
      ...resetDraftState(),
      placements: [],
    }),
}));
