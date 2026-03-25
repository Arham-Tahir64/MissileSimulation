/**
 * Tests for the run archive API mapping layer.
 * Verifies that raw backend shapes are correctly mapped to frontend types.
 * Uses fetch mocking — no real network calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchArchivedRuns, fetchArchivedRun } from '../services/runArchiveApi';

const mockSummary = {
  run_id: 'run-abc',
  session_id: 'sess-1',
  scenario_id: 'scen-001',
  scenario_name: 'Test Scenario',
  scenario_description: 'A fictional test',
  status: 'completed' as const,
  started_at_ms: 1_700_000_000_000,
  completed_at_ms: 1_700_000_300_000,
  duration_s: 300,
  final_sim_time_s: 298.5,
  event_count: 12,
  entity_count: 5,
  intercept_successes: 3,
  intercept_misses: 1,
};

const mockDetail = {
  summary: mockSummary,
  scenario: {
    metadata: {
      id: 'scen-001',
      name: 'Test Scenario',
      description: 'A fictional test',
      duration_s: 300,
      tick_rate_hz: 10,
      tags: ['test'],
    },
    entities: [],
  },
  final_state: {
    entities: [],
    events: [],
  },
  events: [],
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('fetchArchivedRuns', () => {
  it('maps run_id → id', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [mockSummary],
    } as Response);

    const runs = await fetchArchivedRuns();
    expect(runs[0].id).toBe('run-abc');
  });

  it('converts ms timestamps to ISO strings', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [mockSummary],
    } as Response);

    const runs = await fetchArchivedRuns();
    expect(runs[0].started_at).toBe(new Date(1_700_000_000_000).toISOString());
    expect(runs[0].completed_at).toBe(new Date(1_700_000_300_000).toISOString());
  });

  it('preserves intercept counts', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [mockSummary],
    } as Response);

    const runs = await fetchArchivedRuns();
    expect(runs[0].intercept_successes).toBe(3);
    expect(runs[0].intercept_misses).toBe(1);
  });

  it('throws on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    await expect(fetchArchivedRuns()).rejects.toThrow('503');
  });
});

describe('fetchArchivedRun', () => {
  it('maps scenario → scenario_definition', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockDetail,
    } as Response);

    const run = await fetchArchivedRun('run-abc');
    expect(run.scenario_definition).toBeDefined();
    expect(run.scenario_definition.metadata.id).toBe('scen-001');
  });

  it('generates non-empty summary_lines', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockDetail,
    } as Response);

    const run = await fetchArchivedRun('run-abc');
    expect(run.summary_lines.length).toBeGreaterThan(0);
  });

  it('track_outcomes is an array (empty when no moving entities)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockDetail,
    } as Response);

    const run = await fetchArchivedRun('run-abc');
    expect(Array.isArray(run.track_outcomes)).toBe(true);
  });
});
