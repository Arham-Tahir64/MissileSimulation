/**
 * Placement state machine.
 *
 * Phase transitions:
 *   idle → placing_origin   (user selects a missile type)
 *   placing_origin → origin_set  (user clicks globe)
 *   origin_set → target_set      (user clicks within reach radius)
 *   target_set → simulating      (user confirms launch)
 *   simulating → idle            (simulation completes or user resets)
 *
 * Designed to be extendable: future multi-missile placement can add a
 * "placements" array and a currentPlacementIndex to reuse this machine.
 */

import { create } from 'zustand';
import { EntityType, GeoPosition } from '../types/entity';

export type PlacementPhase =
  | 'idle'             // Nothing selected
  | 'placing_origin'   // Type chosen — waiting for first globe click
  | 'origin_set'       // Origin placed — reach radius shown, waiting for target
  | 'target_set'       // Both points set — ready to launch
  | 'simulating';      // Simulation running

interface PlacementStore {
  phase: PlacementPhase;
  missileType: EntityType | null;
  origin: GeoPosition | null;
  target: GeoPosition | null;

  // ── Actions ────────────────────────────────────────────────────────
  /** Select missile type and advance to placing_origin. */
  selectType: (type: EntityType) => void;
  /** Record origin click and advance to origin_set. */
  setOrigin: (pos: GeoPosition) => void;
  /** Record target click and advance to target_set. */
  setTarget: (pos: GeoPosition) => void;
  /** Advance to simulating (called just before sending cmd_play). */
  beginSimulation: () => void;
  /** Return to idle and clear all placement data. */
  reset: () => void;
}

export const usePlacementStore = create<PlacementStore>((set) => ({
  phase: 'idle',
  missileType: null,
  origin: null,
  target: null,

  selectType: (type) =>
    set({ phase: 'placing_origin', missileType: type, origin: null, target: null }),

  setOrigin: (pos) =>
    set({ phase: 'origin_set', origin: pos, target: null }),

  setTarget: (pos) =>
    set({ phase: 'target_set', target: pos }),

  beginSimulation: () =>
    set({ phase: 'simulating' }),

  reset: () =>
    set({ phase: 'idle', missileType: null, origin: null, target: null }),
}));
