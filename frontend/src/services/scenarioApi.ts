import { ScenarioDefinition, ScenarioMetadata } from '../types/scenario';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export async function fetchScenarios(): Promise<ScenarioMetadata[]> {
  const res = await fetch(`${API_BASE}/api/scenarios`);
  if (!res.ok) throw new Error(`Failed to fetch scenarios: ${res.status}`);
  return res.json() as Promise<ScenarioMetadata[]>;
}

export async function fetchScenario(id: string): Promise<ScenarioDefinition> {
  const res = await fetch(`${API_BASE}/api/scenarios/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch scenario ${id}: ${res.status}`);
  return res.json() as Promise<ScenarioDefinition>;
}
