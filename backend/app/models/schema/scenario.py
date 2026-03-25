from __future__ import annotations
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class GeoPosition(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    alt: float = Field(..., ge=0, description="Meters above WGS84 ellipsoid")


class EntityType(str, Enum):
    BALLISTIC_THREAT = "ballistic_threat"
    CRUISE_THREAT = "cruise_threat"
    INTERCEPTOR = "interceptor"
    SENSOR = "sensor"


class TrajectoryType(str, Enum):
    BALLISTIC = "ballistic"
    CRUISE = "cruise"
    STATIONARY = "stationary"


class EntityDefinition(BaseModel):
    id: str
    type: EntityType
    label: str
    designator: str
    trajectory_type: TrajectoryType
    origin: GeoPosition
    waypoints: Optional[list[GeoPosition]] = None
    target: Optional[GeoPosition] = None
    launch_time_s: float = 0.0
    speed_ms: Optional[float] = None


class ScriptedEvent(BaseModel):
    time_s: float
    type: str  # 'intercept_attempt' | 'sensor_track' | 'annotation'
    entity_ids: list[str]
    label: Optional[str] = None


class ScenarioMetadata(BaseModel):
    id: str
    name: str
    description: str
    duration_s: float
    tick_rate_hz: float = 10.0
    threat_count: int
    interceptor_count: int
    tags: list[str] = []


class ScenarioDefinition(BaseModel):
    metadata: ScenarioMetadata
    entities: list[EntityDefinition]
    events: Optional[list[ScriptedEvent]] = []
