import { create } from 'zustand';
import { EntityState } from '../types/entity';
import { RuntimeEvent, SimulationStatus, isEngagementOrderEvent, isSensorTrackEvent } from '../types/simulation';

export type ConnectionStatus = 'disconnected' | 'connected' | 'reconnecting' | 'error';

interface SimulationStore {
  sessionId: string | null;
  scenarioId: string | null;
  simTimeS: number;
  status: SimulationStatus;
  connectionStatus: ConnectionStatus;
  hasStateFrame: boolean;
  entities: EntityState[];
  events: RuntimeEvent[];

  setSimState: (patch: Partial<Omit<SimulationStore, 'setSimState' | 'addEvent' | 'reset' | 'setConnectionStatus'>>) => void;
  addEvent: (event: RuntimeEvent) => void;
  setConnectionStatus: (s: ConnectionStatus) => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  sessionId: null,
  scenarioId: null,
  simTimeS: 0,
  status: 'idle',
  connectionStatus: 'disconnected',
  hasStateFrame: false,
  entities: [],
  events: [],

  setSimState: (patch) => set((s) => {
    const rewound = typeof patch.simTimeS === 'number' && patch.simTimeS + 0.001 < s.simTimeS;
    const scenarioChanged = typeof patch.scenarioId === 'string' && patch.scenarioId !== s.scenarioId;

      return {
        ...s,
        ...patch,
        hasStateFrame: typeof patch.hasStateFrame === 'boolean' ? patch.hasStateFrame : s.hasStateFrame,
        events: rewound || scenarioChanged ? [] : s.events,
      };
    }),

  addEvent: (event) =>
    set((s) => (
      s.events.some((existing) => existing.event_id === event.event_id)
        ? s
        : { events: [...s.events, event].sort((a, b) => a.sim_time_s - b.sim_time_s) }
    )),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  reset: () =>
    set({
      sessionId: null,
      scenarioId: null,
      simTimeS: 0,
      status: 'idle',
      connectionStatus: 'disconnected',
      hasStateFrame: false,
      entities: [],
      events: [],
    }),
}));

export function getDetectedThreatIdsForSensor(entities: EntityState[], sensorId: string): string[] {
  const sensor = entities.find((entity) => entity.id === sensorId);
  return sensor?.detected_threat_ids ?? [];
}

export function getActiveEngagementTargetForBattery(
  entities: EntityState[],
  batteryId: string,
): string | null {
  const battery = entities.find((entity) => entity.id === batteryId);
  return battery?.current_target_id ?? null;
}

export function getTrackedThreatIdsFromEvents(events: RuntimeEvent[]): string[] {
  return Array.from(new Set(
    events
      .filter((event) => isSensorTrackEvent(event))
      .map((event) => event.threat_id),
  ));
}

export function getEngagedThreatIdsFromEvents(events: RuntimeEvent[]): string[] {
  return Array.from(new Set(
    events
      .filter((event) => isEngagementOrderEvent(event))
      .map((event) => event.threat_id),
  ));
}
