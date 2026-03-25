from __future__ import annotations
from enum import Enum
from typing import Literal, Optional
from pydantic import BaseModel
from app.models.schema.scenario import GeoPosition, TrajectoryType


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
    trajectory_type: Optional[TrajectoryType] = None
    label: Optional[str] = None
    designator: Optional[str] = None
    asset_status: Optional[Literal["idle", "tracking", "engaging", "cooldown"]] = None
    current_target_id: Optional[str] = None
    detected_threat_ids: list[str] = []
    cooldown_remaining_s: Optional[float] = None


class SensorTrackEvent(BaseModel):
    type: Literal["sensor_track"] = "sensor_track"
    event_id: str
    sim_time_s: float
    sensor_id: str
    threat_id: str
    position: Optional[GeoPosition] = None


class EngagementOrderEvent(BaseModel):
    type: Literal["engagement_order"] = "engagement_order"
    event_id: str
    sim_time_s: float
    battery_id: str
    threat_id: str
    interceptor_id: str
    position: Optional[GeoPosition] = None


class InterceptionEvent(BaseModel):
    type: Literal["event_intercept"] = "event_intercept"
    event_id: str
    sim_time_s: float
    threat_id: str
    interceptor_id: str
    position: GeoPosition
    outcome: Literal["success", "miss"]


RuntimeEvent = SensorTrackEvent | EngagementOrderEvent | InterceptionEvent


class SimulationState(BaseModel):
    type: Literal["sim_state"] = "sim_state"
    session_id: str
    scenario_id: str
    sim_time_s: float
    wall_time_ms: int
    status: Literal["idle", "running", "paused", "completed"]
    entities: list[EntityState]
    events: list[RuntimeEvent] = []
