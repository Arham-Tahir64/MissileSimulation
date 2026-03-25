import { create } from 'zustand';
import { EntityState } from '../types/entity';
import { InterceptionEvent, SimulationStatus } from '../types/simulation';

export type ConnectionStatus = 'disconnected' | 'connected' | 'reconnecting' | 'error';

interface SimulationStore {
  sessionId: string | null;
  scenarioId: string | null;
  simTimeS: number;
  status: SimulationStatus;
  connectionStatus: ConnectionStatus;
  entities: EntityState[];
  events: InterceptionEvent[];

  setSimState: (patch: Partial<Omit<SimulationStore, 'setSimState' | 'addEvent' | 'reset' | 'setConnectionStatus'>>) => void;
  addEvent: (event: InterceptionEvent) => void;
  setConnectionStatus: (s: ConnectionStatus) => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  sessionId: null,
  scenarioId: null,
  simTimeS: 0,
  status: 'idle',
  connectionStatus: 'disconnected',
  entities: [],
  events: [],

  setSimState: (patch) => set((s) => ({ ...s, ...patch })),

  addEvent: (event) =>
    set((s) => ({ events: [...s.events, event] })),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  reset: () =>
    set({
      sessionId: null,
      scenarioId: null,
      simTimeS: 0,
      status: 'idle',
      connectionStatus: 'disconnected',
      entities: [],
      events: [],
    }),
}));
