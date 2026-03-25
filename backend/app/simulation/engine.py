"""
Simulation engine: orchestrates entity lifecycle, fictional defense asset
logic, physics integration, and runtime event emission for a single scenario run.
"""
from __future__ import annotations

import asyncio
import math
import time
import uuid
from dataclasses import dataclass, field
from typing import Callable, Awaitable, Optional

from app.models.schema.scenario import ScenarioDefinition, EntityDefinition, GeoPosition, TrajectoryType
from app.models.schema.simulation import (
    EntityState,
    EntityStatus,
    EngagementOrderEvent,
    InterceptionEvent,
    RuntimeEvent,
    SensorTrackEvent,
    SimulationState,
)
from app.simulation.defense_config import DefenseAssetProfile, get_defense_asset_profile
from app.simulation.interception.geometric import find_intercept_time
from app.simulation.physics.ballistic import BallisticTrajectory
from app.simulation.physics.cruise import CruiseTrajectory

PushCallback = Callable[[str], Awaitable[None]]
_EARTH_RADIUS_M = 6_371_000.0
_INTERCEPT_SOLVE_STEP_S = 1.0
_INTERCEPT_SOLVE_TOLERANCE_S = 3.5


def _distance_m(a: GeoPosition, b: GeoPosition) -> float:
    lat1, lon1 = math.radians(a.lat), math.radians(a.lon)
    lat2, lon2 = math.radians(b.lat), math.radians(b.lon)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * _EARTH_RADIUS_M * math.asin(math.sqrt(h))


def _final_position(definition: EntityDefinition) -> GeoPosition:
    if definition.target is not None:
        return definition.target
    if definition.waypoints:
        return definition.waypoints[-1]
    return definition.origin


@dataclass
class _SensorRuntime:
    entity_id: str
    profile: DefenseAssetProfile
    tracked_threats: set[str] = field(default_factory=set)
    pending_contacts: dict[str, float] = field(default_factory=dict)


@dataclass
class _BatteryRuntime:
    entity_id: str
    profile: DefenseAssetProfile
    cooldown_until_s: float = 0.0
    engaged_threats: set[str] = field(default_factory=set)
    active_target_ids: set[str] = field(default_factory=set)


@dataclass
class _PendingIntercept:
    interceptor_id: str
    battery_id: str
    threat_id: str
    intercept_time_s: float


class _EntityRuntime:
    """Holds the trajectory object and mutable runtime state for one entity."""

    def __init__(self, definition: EntityDefinition) -> None:
        self.definition = definition
        self.status = EntityStatus.INACTIVE
        self.trajectory: Optional[BallisticTrajectory | CruiseTrajectory] = None
        self.asset_profile = get_defense_asset_profile(definition)
        self._build_trajectory()

    def _build_trajectory(self) -> None:
        d = self.definition
        if d.trajectory_type == TrajectoryType.BALLISTIC and d.target:
            self.trajectory = BallisticTrajectory(d.origin, d.target)
        elif d.trajectory_type == TrajectoryType.CRUISE:
            waypoints = [d.origin] + (d.waypoints or [])
            if d.target:
                waypoints.append(d.target)
            self.trajectory = CruiseTrajectory(waypoints, speed_ms=d.speed_ms or 250.0)

    @property
    def flight_time_s(self) -> float:
        if self.trajectory is None:
            return 0.0
        return self.trajectory.flight_time_s

    def position_at(self, local_t: float) -> GeoPosition:
        if self.trajectory is None:
            return self.definition.origin
        return self.trajectory.position_at(local_t)

    def to_state(
        self,
        sim_time_s: float,
        sensors: dict[str, _SensorRuntime],
        batteries: dict[str, _BatteryRuntime],
    ) -> EntityState:
        local_t = sim_time_s - self.definition.launch_time_s
        pos = self.position_at(max(local_t, 0))
        vel = self.trajectory.velocity_ms_at(local_t) if self.trajectory else 0.0
        heading = self.trajectory.heading_deg_at(local_t) if self.trajectory else 0.0
        pitch = self.trajectory.pitch_deg_at(local_t) if self.trajectory else 0.0

        asset_status = None
        current_target_id = None
        detected_threat_ids: list[str] = []
        cooldown_remaining_s = None

        sensor_state = sensors.get(self.definition.id)
        if sensor_state is not None:
            detected_threat_ids = sorted(sensor_state.tracked_threats)
            asset_status = "tracking" if detected_threat_ids else "idle"

        battery_state = batteries.get(self.definition.id)
        if battery_state is not None:
            current_target_id = sorted(battery_state.active_target_ids)[0] if battery_state.active_target_ids else None
            cooldown_remaining_s = max(0.0, battery_state.cooldown_until_s - sim_time_s)
            if battery_state.active_target_ids:
                asset_status = "engaging"
            elif cooldown_remaining_s > 0:
                asset_status = "cooldown"
            else:
                asset_status = "idle"

        return EntityState(
            id=self.definition.id,
            type=self.definition.type.value,
            status=self.status,
            position=pos,
            velocity_ms=vel,
            heading_deg=heading,
            pitch_deg=pitch,
            sim_time_s=sim_time_s,
            trajectory_type=self.definition.trajectory_type,
            label=self.definition.label,
            designator=self.definition.designator,
            asset_status=asset_status,
            current_target_id=current_target_id,
            detected_threat_ids=detected_threat_ids,
            cooldown_remaining_s=cooldown_remaining_s,
        )


class SimulationEngine:
    """
    Runs a single scenario in a discrete tick loop.
    Calls push_callback with serialized SimulationState JSON each tick.
    """

    def __init__(
        self,
        session_id: str,
        scenario: ScenarioDefinition,
        push_callback: PushCallback,
    ) -> None:
        self._session_id = session_id
        self._scenario = scenario
        self._push = push_callback
        self._speed = 1.0
        self._sim_time_s = 0.0
        self._running = False
        self._paused = False
        self._entities: dict[str, _EntityRuntime] = {}
        self._events: list[RuntimeEvent] = []
        self._new_events: list[RuntimeEvent] = []
        self._intercept_times: dict[str, float] = {}
        self._sensor_states: dict[str, _SensorRuntime] = {}
        self._battery_states: dict[str, _BatteryRuntime] = {}
        self._pending_intercepts: dict[str, _PendingIntercept] = {}
        self._dynamic_interceptor_counter = 0
        self._reset_runtime_state()

    def _reset_runtime_state(self) -> None:
        self._sim_time_s = 0.0
        self._entities = {e.id: _EntityRuntime(e) for e in self._scenario.entities}
        self._events = []
        self._new_events = []
        self._sensor_states = {}
        self._battery_states = {}
        self._pending_intercepts = {}
        self._dynamic_interceptor_counter = 0
        self._init_defense_assets()
        self._intercept_times = self._precompute_intercepts()

    def _init_defense_assets(self) -> None:
        for entity_id, entity in self._entities.items():
            profile = entity.asset_profile
            if profile is None:
                continue
            if profile.kind == "radar":
                self._sensor_states[entity_id] = _SensorRuntime(entity_id=entity_id, profile=profile)
            elif profile.kind == "battery":
                self._battery_states[entity_id] = _BatteryRuntime(entity_id=entity_id, profile=profile)

    def _emit_event(self, event: RuntimeEvent) -> None:
        self._events.append(event)
        self._new_events.append(event)

    def _threat_entities(self) -> list[_EntityRuntime]:
        return [
            entity for entity in self._entities.values()
            if entity.definition.type.value in ("ballistic_threat", "cruise_threat")
        ]

    def _active_threat_entities(self) -> list[_EntityRuntime]:
        return [entity for entity in self._threat_entities() if entity.status == EntityStatus.ACTIVE]

    def _precompute_intercepts(self) -> dict[str, float]:
        """Pre-compute intercept times for scenario-defined mobile interceptor↔threat pairs."""
        times: dict[str, float] = {}
        threats = [e for e in self._threat_entities() if e.trajectory is not None]
        interceptors = [
            e for e in self._entities.values()
            if e.definition.type.value == "interceptor"
            and e.trajectory is not None
            and e.definition.trajectory_type != TrajectoryType.STATIONARY
        ]

        for interceptor in interceptors:
            for threat in threats:
                key = f"{interceptor.definition.id}↔{threat.definition.id}"
                t = find_intercept_time(
                    threat=threat.trajectory,  # type: ignore[arg-type]
                    interceptor=interceptor.trajectory,  # type: ignore[arg-type]
                    interceptor_launch_time_s=interceptor.definition.launch_time_s,
                )
                if t is not None:
                    times[key] = t
        return times

    async def play(self, speed: float = 1.0) -> None:
        self._speed = speed
        self._running = True
        self._paused = False
        tick_interval = 1.0 / self._scenario.metadata.tick_rate_hz
        duration = self._scenario.metadata.duration_s

        while self._running and self._sim_time_s <= duration:
            if self._paused:
                await asyncio.sleep(0.05)
                continue

            self._tick()
            state_json = self._serialize_state("running")
            await self._push(state_json)

            await asyncio.sleep(tick_interval / self._speed)

        if self._sim_time_s >= duration:
            final = self._serialize_state("completed")
            await self._push(final)

    def pause(self) -> None:
        self._paused = True

    def resume(self) -> None:
        self._paused = False

    def seek(self, target_time_s: float) -> str:
        target = max(0.0, min(target_time_s, self._scenario.metadata.duration_s))
        tick_dt = 1.0 / self._scenario.metadata.tick_rate_hz
        target_aligned = round(target / tick_dt) * tick_dt
        status = "running" if self._running and not self._paused else "paused"
        saved_speed = self._speed

        self._reset_runtime_state()
        self._speed = 1.0

        while self._sim_time_s + 1e-9 < target_aligned:
            self._tick()

        self._speed = saved_speed
        return self._serialize_state(status)

    def set_speed(self, speed: float) -> None:
        self._speed = max(0.1, speed)

    def stop(self) -> None:
        self._running = False

    def _solve_battery_intercept(
        self,
        threat: _EntityRuntime,
        battery: _EntityRuntime,
        launch_time_s: float,
        profile: DefenseAssetProfile,
    ) -> tuple[GeoPosition, float] | None:
        threat_end_time_s = threat.definition.launch_time_s + threat.flight_time_s
        if threat_end_time_s <= launch_time_s:
            return None

        candidate_time_s = max(launch_time_s + _INTERCEPT_SOLVE_STEP_S, threat.definition.launch_time_s)
        while candidate_time_s <= threat_end_time_s:
            threat_local_t = candidate_time_s - threat.definition.launch_time_s
            threat_pos = threat.position_at(threat_local_t)
            if _distance_m(battery.definition.origin, threat_pos) > profile.engagement_radius_m:
                candidate_time_s += _INTERCEPT_SOLVE_STEP_S
                continue

            interceptor = BallisticTrajectory(battery.definition.origin, threat_pos)
            required_flight_time = candidate_time_s - launch_time_s
            if abs(interceptor.flight_time_s - required_flight_time) <= _INTERCEPT_SOLVE_TOLERANCE_S:
                return threat_pos, candidate_time_s

            candidate_time_s += _INTERCEPT_SOLVE_STEP_S

        return None

    def _spawn_dynamic_interceptor(
        self,
        battery: _EntityRuntime,
        threat: _EntityRuntime,
        intercept_position: GeoPosition,
        intercept_time_s: float,
    ) -> str:
        self._dynamic_interceptor_counter += 1
        interceptor_id = f"{battery.definition.designator}-SHOT-{self._dynamic_interceptor_counter}"
        definition = EntityDefinition(
            id=interceptor_id,
            type=battery.definition.type,
            label=f"{battery.definition.label} Shot",
            designator=interceptor_id,
            trajectory_type=TrajectoryType.BALLISTIC,
            origin=battery.definition.origin,
            target=intercept_position,
            launch_time_s=self._sim_time_s,
        )
        runtime = _EntityRuntime(definition)
        runtime.status = EntityStatus.ACTIVE
        self._entities[interceptor_id] = runtime
        self._pending_intercepts[interceptor_id] = _PendingIntercept(
            interceptor_id=interceptor_id,
            battery_id=battery.definition.id,
            threat_id=threat.definition.id,
            intercept_time_s=intercept_time_s,
        )
        return interceptor_id

    def _evaluate_sensor_detection(self) -> None:
        active_threats = self._active_threat_entities()

        for sensor_id, sensor_state in self._sensor_states.items():
            sensor_entity = self._entities[sensor_id]
            in_range_now: set[str] = set()

            for threat in active_threats:
                threat_pos = threat.position_at(self._sim_time_s - threat.definition.launch_time_s)
                if _distance_m(sensor_entity.definition.origin, threat_pos) > sensor_state.profile.detection_radius_m:
                    sensor_state.pending_contacts.pop(threat.definition.id, None)
                    continue

                in_range_now.add(threat.definition.id)
                if threat.definition.id in sensor_state.tracked_threats:
                    continue

                first_seen = sensor_state.pending_contacts.setdefault(threat.definition.id, self._sim_time_s)
                if self._sim_time_s - first_seen < sensor_state.profile.tracking_latency_s:
                    continue

                sensor_state.tracked_threats.add(threat.definition.id)
                sensor_state.pending_contacts.pop(threat.definition.id, None)
                self._emit_event(SensorTrackEvent(
                    event_id=str(uuid.uuid4()),
                    sim_time_s=self._sim_time_s,
                    sensor_id=sensor_id,
                    threat_id=threat.definition.id,
                    position=threat_pos,
                ))

            sensor_state.tracked_threats.intersection_update(in_range_now)
            for threat_id in list(sensor_state.pending_contacts):
                if threat_id not in in_range_now:
                    sensor_state.pending_contacts.pop(threat_id, None)

    def _evaluate_battery_engagements(self) -> None:
        tracked_threat_ids = {threat_id for sensor in self._sensor_states.values() for threat_id in sensor.tracked_threats}
        active_threats = [
            threat for threat in self._active_threat_entities()
            if threat.definition.id in tracked_threat_ids
        ]

        for threat in active_threats:
            if any(
                pending.threat_id == threat.definition.id
                for pending in self._pending_intercepts.values()
            ):
                continue

            candidate_batteries: list[tuple[int, float, _EntityRuntime, _BatteryRuntime]] = []
            threat_pos = threat.position_at(self._sim_time_s - threat.definition.launch_time_s)

            for battery_id, battery_state in self._battery_states.items():
                battery_entity = self._entities[battery_id]
                profile = battery_state.profile
                if threat.definition.type.value not in profile.allowed_threat_types:
                    continue
                if battery_state.cooldown_until_s > self._sim_time_s:
                    continue
                if threat.definition.id in battery_state.engaged_threats:
                    continue
                if len(battery_state.active_target_ids) >= profile.max_tracks:
                    continue
                if _distance_m(battery_entity.definition.origin, threat_pos) > profile.engagement_radius_m:
                    continue

                candidate_batteries.append((
                    profile.priority,
                    _distance_m(battery_entity.definition.origin, threat_pos),
                    battery_entity,
                    battery_state,
                ))

            if not candidate_batteries:
                continue

            _, _, battery_entity, battery_state = sorted(candidate_batteries, key=lambda item: (item[0], item[1]))[0]
            solution = self._solve_battery_intercept(threat, battery_entity, self._sim_time_s, battery_state.profile)
            if solution is None:
                continue

            intercept_position, intercept_time_s = solution
            interceptor_id = self._spawn_dynamic_interceptor(
                battery_entity,
                threat,
                intercept_position,
                intercept_time_s,
            )
            battery_state.cooldown_until_s = self._sim_time_s + battery_state.profile.cooldown_s
            battery_state.engaged_threats.add(threat.definition.id)
            battery_state.active_target_ids.add(threat.definition.id)

            self._emit_event(EngagementOrderEvent(
                event_id=str(uuid.uuid4()),
                sim_time_s=self._sim_time_s,
                battery_id=battery_entity.definition.id,
                threat_id=threat.definition.id,
                interceptor_id=interceptor_id,
                position=battery_entity.definition.origin,
            ))

    def _resolve_precomputed_intercepts(self) -> None:
        for key, intercept_t in list(self._intercept_times.items()):
            if self._sim_time_s < intercept_t:
                continue

            interceptor_id, threat_id = key.split("↔")
            threat = self._entities.get(threat_id)
            interceptor = self._entities.get(interceptor_id)
            if threat and interceptor and threat.status == EntityStatus.ACTIVE:
                threat.status = EntityStatus.INTERCEPTED
                interceptor.status = EntityStatus.DESTROYED
                pos = threat.position_at(intercept_t - threat.definition.launch_time_s)
                self._emit_event(InterceptionEvent(
                    event_id=str(uuid.uuid4()),
                    sim_time_s=self._sim_time_s,
                    threat_id=threat_id,
                    interceptor_id=interceptor_id,
                    position=pos,
                    outcome="success",
                ))

            del self._intercept_times[key]

    def _resolve_pending_intercepts(self) -> None:
        for interceptor_id, pending in list(self._pending_intercepts.items()):
            if self._sim_time_s < pending.intercept_time_s:
                continue

            threat = self._entities.get(pending.threat_id)
            interceptor = self._entities.get(interceptor_id)
            battery_state = self._battery_states.get(pending.battery_id)

            if battery_state is not None:
                battery_state.active_target_ids.discard(pending.threat_id)

            if threat and interceptor and threat.status == EntityStatus.ACTIVE:
                threat.status = EntityStatus.INTERCEPTED
                interceptor.status = EntityStatus.DESTROYED
                pos = threat.position_at(max(0.0, pending.intercept_time_s - threat.definition.launch_time_s))
                self._emit_event(InterceptionEvent(
                    event_id=str(uuid.uuid4()),
                    sim_time_s=self._sim_time_s,
                    threat_id=pending.threat_id,
                    interceptor_id=interceptor_id,
                    position=pos,
                    outcome="success",
                ))
            elif interceptor and interceptor.status == EntityStatus.ACTIVE:
                interceptor.status = EntityStatus.DESTROYED

            self._pending_intercepts.pop(interceptor_id, None)

    def _update_terminal_statuses(self) -> None:
        for entity in self._entities.values():
            if entity.status != EntityStatus.ACTIVE or entity.trajectory is None:
                continue
            if self._sim_time_s < entity.definition.launch_time_s + entity.flight_time_s:
                continue

            if entity.definition.type.value in ("ballistic_threat", "cruise_threat"):
                entity.status = EntityStatus.MISSED
            else:
                entity.status = EntityStatus.DESTROYED

        active_threat_ids = {entity.definition.id for entity in self._active_threat_entities()}
        for battery_state in self._battery_states.values():
            battery_state.active_target_ids.intersection_update(active_threat_ids)
        for sensor_state in self._sensor_states.values():
            sensor_state.tracked_threats.intersection_update(active_threat_ids)

    def _tick(self) -> None:
        """Advance simulation by one time step."""
        tick_dt = 1.0 / self._scenario.metadata.tick_rate_hz
        self._sim_time_s += tick_dt * self._speed

        for entity in self._entities.values():
            launch = entity.definition.launch_time_s
            if self._sim_time_s >= launch and entity.status == EntityStatus.INACTIVE:
                entity.status = EntityStatus.ACTIVE

        self._evaluate_sensor_detection()
        self._evaluate_battery_engagements()
        self._resolve_precomputed_intercepts()
        self._resolve_pending_intercepts()
        self._update_terminal_statuses()

    def _serialize_state(self, status: str) -> str:
        states = [
            entity.to_state(self._sim_time_s, self._sensor_states, self._battery_states)
            for entity in self._entities.values()
        ]
        sim_state = SimulationState(
            session_id=self._session_id,
            scenario_id=self._scenario.metadata.id,
            sim_time_s=self._sim_time_s,
            wall_time_ms=int(time.time() * 1000),
            status=status,  # type: ignore[arg-type]
            entities=states,
            events=list(self._new_events),
        )
        self._new_events.clear()
        return sim_state.model_dump_json()
