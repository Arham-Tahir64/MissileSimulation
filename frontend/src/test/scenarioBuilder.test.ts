import { describe, expect, it } from 'vitest';
import { buildScenario } from '../utils/scenarioBuilder';
import { PlannedBarragePlacement } from '../store/placementStore';

const launchCenter = { lat: 31.5, lon: 35.0, alt: 0 };
const targetCenter = { lat: 33.2, lon: 38.3, alt: 0 };

function createBarrage(seed = 'fixed-seed'): PlannedBarragePlacement {
  return {
    id: 'barrage-alpha',
    kind: 'barrage',
    missileType: 'ballistic_threat',
    launchArea: { center: launchCenter, radiusKm: 75 },
    targetArea: { center: targetCenter, radiusKm: 45 },
    count: 5,
    seed,
    launchTimeS: 15,
    launchTimingMode: 'random_window',
    launchWindowS: 30,
  };
}

describe('scenarioBuilder barrage expansion', () => {
  it('expands a barrage into ordinary missile entities', () => {
    const scenario = buildScenario([createBarrage()]);
    expect(scenario.entities).toHaveLength(5);
    expect(scenario.metadata.threat_count).toBe(5);
    expect(scenario.metadata.name).toContain('Barrage');
    expect(scenario.entities.every((entity) => entity.type === 'ballistic_threat')).toBe(true);
  });

  it('uses the seed deterministically', () => {
    const a = buildScenario([createBarrage('same-seed')]);
    const b = buildScenario([createBarrage('same-seed')]);

    expect(a.entities.map((entity) => entity.origin)).toEqual(b.entities.map((entity) => entity.origin));
    expect(a.entities.map((entity) => entity.target)).toEqual(b.entities.map((entity) => entity.target));
    expect(a.entities.map((entity) => entity.launch_time_s)).toEqual(b.entities.map((entity) => entity.launch_time_s));
  });

  it('changes generated launches when the seed changes', () => {
    const a = buildScenario([createBarrage('seed-a')]);
    const b = buildScenario([createBarrage('seed-b')]);

    expect(a.entities.map((entity) => entity.origin)).not.toEqual(b.entities.map((entity) => entity.origin));
  });
});
