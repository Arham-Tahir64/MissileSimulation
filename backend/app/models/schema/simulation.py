from __future__ import annotations
from enum import Enum
from typing import Literal, Optional
from pydantic import BaseModel
from app.models.schema.scenario import GeoPosition


class EntityStatus(str, Enum):
    INACTIVE = "inactive"
    ACTIVE = "active"
    INTERCEPTED = "intercepted"
    MISSED = "missed"
    DESTROYED = "destroyed"


class EntityState(BaseModel):
    id: str
    type: str
    status: EntityStatus
    position: GeoPosition
    velocity_ms: float
    heading_deg: float
    pitch_deg: float
    sim_time_s: float


class InterceptionEvent(BaseModel):
    event_id: str
    sim_time_s: float
    threat_id: str
    interceptor_id: str
    position: GeoPosition
    outcome: Literal["success", "miss"]


class SimulationState(BaseModel):
    session_id: str
    scenario_id: str
    sim_time_s: float
    wall_time_ms: int
    status: Literal["idle", "running", "paused", "completed"]
    entities: list[EntityState]
    events: list[InterceptionEvent] = []
