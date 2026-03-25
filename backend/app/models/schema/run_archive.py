from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

from app.models.schema.scenario import ScenarioDefinition
from app.models.schema.simulation import RuntimeEvent, SimulationState


class RunSummary(BaseModel):
    run_id: str
    session_id: str
    scenario_id: str
    scenario_name: str
    scenario_description: str
    status: Literal["completed"]
    started_at_ms: int
    completed_at_ms: int
    duration_s: float
    final_sim_time_s: float
    event_count: int
    entity_count: int
    intercept_successes: int
    intercept_misses: int


class RunDetail(BaseModel):
    summary: RunSummary
    scenario: ScenarioDefinition
    final_state: SimulationState
    events: list[RuntimeEvent]
