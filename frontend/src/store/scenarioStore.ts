import { create } from 'zustand';
import { ScenarioDefinition, ScenarioMetadata } from '../types/scenario';

interface ScenarioStore {
  availableScenarios: ScenarioMetadata[];
  activeScenario: ScenarioDefinition | null;

  setAvailableScenarios: (scenarios: ScenarioMetadata[]) => void;
  setActiveScenario: (scenario: ScenarioDefinition | null) => void;
}

export const useScenarioStore = create<ScenarioStore>((set) => ({
  availableScenarios: [],
  activeScenario: null,

  setAvailableScenarios: (availableScenarios) => set({ availableScenarios }),
  setActiveScenario: (activeScenario) => set({ activeScenario }),
}));
