/**
 * Tests for the placement store state machine.
 * Covers: missile type selection, asset selection, origin/target setting,
 * queuing placements, removing placements, and reset.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { usePlacementStore } from '../store/placementStore';

const origin = { lat: 31.0, lon: 35.0, alt: 0 };
const target = { lat: 33.0, lon: 37.0, alt: 0 };

describe('placementStore — missile flow', () => {
  beforeEach(() => { usePlacementStore.getState().reset(); });

  it('starts in idle phase', () => {
    expect(usePlacementStore.getState().phase).toBe('idle');
  });

  it('selectType advances phase to placing_origin', () => {
    usePlacementStore.getState().selectType('ballistic_threat');
    expect(usePlacementStore.getState().phase).toBe('placing_origin');
    expect(usePlacementStore.getState().missileType).toBe('ballistic_threat');
  });

  it('setOrigin advances phase to origin_set', () => {
    usePlacementStore.getState().selectType('ballistic_threat');
    usePlacementStore.getState().setOrigin(origin);
    expect(usePlacementStore.getState().phase).toBe('origin_set');
    expect(usePlacementStore.getState().origin).toEqual(origin);
  });

  it('setTarget advances phase to target_set', () => {
    usePlacementStore.getState().selectType('ballistic_threat');
    usePlacementStore.getState().setOrigin(origin);
    usePlacementStore.getState().setTarget(target);
    expect(usePlacementStore.getState().phase).toBe('target_set');
    expect(usePlacementStore.getState().target).toEqual(target);
  });

  it('addCurrentPlacement queues the missile and returns to idle', () => {
    usePlacementStore.getState().selectType('ballistic_threat');
    usePlacementStore.getState().setOrigin(origin);
    usePlacementStore.getState().setTarget(target);
    usePlacementStore.getState().addCurrentPlacement();

    const state = usePlacementStore.getState();
    expect(state.phase).toBe('idle');
    expect(state.placements).toHaveLength(1);
    expect(state.placements[0].kind).toBe('missile');
  });

  it('addCurrentPlacement is a no-op without origin/target', () => {
    usePlacementStore.getState().selectType('ballistic_threat');
    usePlacementStore.getState().addCurrentPlacement();
    expect(usePlacementStore.getState().placements).toHaveLength(0);
  });

  it('removePlacement removes the correct item', () => {
    usePlacementStore.getState().selectType('ballistic_threat');
    usePlacementStore.getState().setOrigin(origin);
    usePlacementStore.getState().setTarget(target);
    usePlacementStore.getState().addCurrentPlacement();
    const id = usePlacementStore.getState().placements[0].id;

    usePlacementStore.getState().removePlacement(id);
    expect(usePlacementStore.getState().placements).toHaveLength(0);
  });

  it('clearCurrent returns to idle without clearing the queue', () => {
    usePlacementStore.getState().selectType('ballistic_threat');
    usePlacementStore.getState().setOrigin(origin);
    usePlacementStore.getState().setTarget(target);
    usePlacementStore.getState().addCurrentPlacement();

    usePlacementStore.getState().selectType('cruise_threat');
    usePlacementStore.getState().clearCurrent();

    const state = usePlacementStore.getState();
    expect(state.phase).toBe('idle');
    expect(state.placements).toHaveLength(1); // previously queued missile intact
  });

  it('reset clears everything', () => {
    usePlacementStore.getState().selectType('ballistic_threat');
    usePlacementStore.getState().setOrigin(origin);
    usePlacementStore.getState().setTarget(target);
    usePlacementStore.getState().addCurrentPlacement();
    usePlacementStore.getState().reset();

    const state = usePlacementStore.getState();
    expect(state.phase).toBe('idle');
    expect(state.placements).toHaveLength(0);
    expect(state.missileType).toBeNull();
  });

  it('updatePlacementLaunchTime updates only missile placements', () => {
    usePlacementStore.getState().selectType('ballistic_threat');
    usePlacementStore.getState().setOrigin(origin);
    usePlacementStore.getState().setTarget(target);
    usePlacementStore.getState().addCurrentPlacement();
    const id = usePlacementStore.getState().placements[0].id;

    usePlacementStore.getState().updatePlacementLaunchTime(id, 30);
    const placement = usePlacementStore.getState().placements[0];
    expect(placement.kind === 'missile' && placement.launchTimeS).toBe(30);
  });
});

describe('placementStore — defense asset flow', () => {
  beforeEach(() => { usePlacementStore.getState().reset(); });

  it('selectAsset advances phase to placing_asset', () => {
    usePlacementStore.getState().selectAsset('iron_dome');
    expect(usePlacementStore.getState().phase).toBe('placing_asset');
    expect(usePlacementStore.getState().assetId).toBe('iron_dome');
  });

  it('addAssetPlacement queues the asset and returns to idle', () => {
    usePlacementStore.getState().selectAsset('search_radar');
    usePlacementStore.getState().addAssetPlacement({ lat: 32.0, lon: 35.5, alt: 0 });

    const state = usePlacementStore.getState();
    expect(state.phase).toBe('idle');
    expect(state.placements).toHaveLength(1);
    expect(state.placements[0].kind).toBe('asset');
  });

  it('queues multiple mixed placements correctly', () => {
    // Missile
    usePlacementStore.getState().selectType('ballistic_threat');
    usePlacementStore.getState().setOrigin(origin);
    usePlacementStore.getState().setTarget(target);
    usePlacementStore.getState().addCurrentPlacement();

    // Asset
    usePlacementStore.getState().selectAsset('iron_dome');
    usePlacementStore.getState().addAssetPlacement({ lat: 32.0, lon: 35.5, alt: 0 });

    const state = usePlacementStore.getState();
    expect(state.placements).toHaveLength(2);
    expect(state.placements.filter((p) => p.kind === 'missile')).toHaveLength(1);
    expect(state.placements.filter((p) => p.kind === 'asset')).toHaveLength(1);
  });
});

describe('placementStore — barrage flow', () => {
  beforeEach(() => { usePlacementStore.getState().reset(); });

  it('selectBarrageType enters barrage launch-area placement', () => {
    usePlacementStore.getState().selectBarrageType('ballistic_threat');
    const state = usePlacementStore.getState();
    expect(state.phase).toBe('placing_barrage_origin');
    expect(state.barrageMissileType).toBe('ballistic_threat');
  });

  it('queues a barrage and returns to idle', () => {
    const store = usePlacementStore.getState();
    store.selectBarrageType('cruise_threat');
    store.setBarrageLaunchCenter(origin);
    store.setBarrageTargetCenter(target);
    store.setBarrageCount(9);
    store.setBarrageLaunchRadiusKm(60);
    store.setBarrageTargetRadiusKm(35);
    store.addCurrentBarragePlacement();

    const state = usePlacementStore.getState();
    expect(state.phase).toBe('idle');
    expect(state.placements).toHaveLength(1);
    expect(state.placements[0].kind).toBe('barrage');
    if (state.placements[0].kind === 'barrage') {
      expect(state.placements[0].count).toBe(9);
      expect(state.placements[0].launchArea.radiusKm).toBe(60);
      expect(state.placements[0].targetArea.radiusKm).toBe(35);
    }
  });

  it('updateBarragePlacement updates queued barrage values', () => {
    const store = usePlacementStore.getState();
    store.selectBarrageType('ballistic_threat');
    store.setBarrageLaunchCenter(origin);
    store.setBarrageTargetCenter(target);
    store.addCurrentBarragePlacement();
    const barrage = usePlacementStore.getState().placements[0];

    store.updateBarragePlacement(barrage.id, {
      count: 12,
      launchWindowS: 120,
      seed: 'fixed-seed',
    });

    const updated = usePlacementStore.getState().placements[0];
    expect(updated.kind).toBe('barrage');
    if (updated.kind === 'barrage') {
      expect(updated.count).toBe(12);
      expect(updated.launchWindowS).toBe(120);
      expect(updated.seed).toBe('fixed-seed');
    }
  });
});
