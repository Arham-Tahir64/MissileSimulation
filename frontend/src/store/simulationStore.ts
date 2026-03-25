import { create } from 'zustand';
import { EntityState } from '../types/entity';
import { InterceptionEvent, SimulationStatus } from '../types/simulation';

interface SimulationStore {
  sessionId: string | null;
  scenarioId: string | null;
  simTimeS: number;
  status: SimulationStatus;
  entities: EntityState[];
  events: InterceptionEvent[];

  setSimState: (patch: Partial<Omit<SimulationStore, 'setSimState' | 'addEvent' | 'reset'>>) => void;
  addEvent: (event: InterceptionEvent) => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  sessionId: null,
  scenarioId: null,
  simTimeS: 0,
  status: 'idle',
  entities: [],
  events: [],

  setSimState: (patch) => set((s) => ({ ...s, ...patch })),

  addEvent: (event) =>
    set((s) => ({ events: [...s.events, event] })),

  reset: () =>
    set({ sessionId: null, scenarioId: null, simTimeS: 0, status: 'idle', entities: [], events: [] }),
}));
