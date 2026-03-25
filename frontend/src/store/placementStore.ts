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
  | 'placing_asset'    // Defense asset selected — waiting for one globe click
  | 'target_set'       // Both points set — ready to launch
  | 'simulating';      // Simulation running

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

export type PlannedPlacement = PlannedLaunchPlacement | PlannedAssetPlacement;

interface PlacementStore {
  phase: PlacementPhase;
  missileType: EntityType | null;
  assetId: DefenseAssetId | null;
  origin: GeoPosition | null;
  target: GeoPosition | null;
  launchTimeS: number;
  placements: PlannedPlacement[];

  // ── Actions ────────────────────────────────────────────────────────
  /** Select missile type and advance to placing_origin. */
  selectType: (type: EntityType) => void;
  /** Select a defense asset and wait for a single placement click. */
  selectAsset: (assetId: DefenseAssetId) => void;
  /** Record origin click and advance to origin_set. */
  setOrigin: (pos: GeoPosition) => void;
  /** Record target click and advance to target_set. */
  setTarget: (pos: GeoPosition) => void;
  /** Queue a single-click defense asset placement and return to idle. */
  addAssetPlacement: (pos: GeoPosition) => void;
  /** Update the pending missile's launch offset. */
  setDraftLaunchTime: (launchTimeS: number) => void;
  /** Queue the current draft and return to idle for the next missile. */
  addCurrentPlacement: () => void;
  /** Remove one queued placement. */
  removePlacement: (id: string) => void;
  /** Update a queued placement's launch offset. */
  updatePlacementLaunchTime: (id: string, launchTimeS: number) => void;
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

export const usePlacementStore = create<PlacementStore>((set) => ({
  phase: 'idle',
  missileType: null,
  assetId: null,
  origin: null,
  target: null,
  launchTimeS: 0,
  placements: [],

  selectType: (type) =>
    set((state) => ({
      phase: 'placing_origin',
      missileType: type,
      assetId: null,
      origin: null,
      target: null,
      launchTimeS: state.launchTimeS,
    })),

  selectAsset: (assetId) =>
    set({
      phase: 'placing_asset',
      missileType: null,
      assetId,
      origin: null,
      target: null,
      launchTimeS: 0,
    }),

  setOrigin: (pos) =>
    set({ phase: 'origin_set', origin: pos, target: null }),

  setTarget: (pos) =>
    set({ phase: 'target_set', target: pos }),

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
        phase: 'idle',
        missileType: null,
        assetId: null,
        origin: null,
        target: null,
        launchTimeS: 0,
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
        phase: 'idle',
        missileType: null,
        assetId: null,
        origin: null,
        target: null,
        launchTimeS: 0,
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

  clearCurrent: () =>
    set({
      phase: 'idle',
      missileType: null,
      assetId: null,
      origin: null,
      target: null,
      launchTimeS: 0,
    }),

  beginSimulation: () =>
    set({ phase: 'simulating' }),

  reset: () =>
    set({
      phase: 'idle',
      missileType: null,
      assetId: null,
      origin: null,
      target: null,
      launchTimeS: 0,
      placements: [],
    }),
}));
