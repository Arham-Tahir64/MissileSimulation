"""
Simulation engine: orchestrates entity lifecycle, physics integration,
and interception event detection for a single scenario run.
"""
from __future__ import annotations
import asyncio
import json
import time
import uuid
from typing import Callable, Awaitable, Optional

from app.models.schema.scenario import ScenarioDefinition, EntityDefinition, TrajectoryType
from app.models.schema.simulation import EntityState, EntityStatus, InterceptionEvent, SimulationState
from app.models.schema.scenario import GeoPosition
from app.simulation.physics.ballistic import BallisticTrajectory
from app.simulation.physics.cruise import CruiseTrajectory
from app.simulation.interception.geometric import find_intercept_time

PushCallback = Callable[[str], Awaitable[None]]


class _EntityRuntime:
    """Holds the trajectory object and mutable runtime state for one entity."""

    def __init__(self, definition: EntityDefinition) -> None:
        self.definition = definition
        self.status = EntityStatus.INACTIVE
        self.trajectory: Optional[BallisticTrajectory | CruiseTrajectory] = None
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

    def to_state(self, sim_time_s: float) -> EntityState:
        local_t = sim_time_s - self.definition.launch_time_s
        pos = self.position_at(max(local_t, 0))
        vel = self.trajectory.velocity_ms_at(local_t) if self.trajectory else 0.0
        heading = self.trajectory.heading_deg_at(local_t) if self.trajectory else 0.0
        pitch = self.trajectory.pitch_deg_at(local_t) if self.trajectory else 0.0
        return EntityState(
            id=self.definition.id,
            type=self.definition.type.value,
            status=self.status,
            position=pos,
            velocity_ms=vel,
            heading_deg=heading,
            pitch_deg=pitch,
            sim_time_s=sim_time_s,
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
        self._entities = {e.id: _EntityRuntime(e) for e in scenario.entities}
        self._events: list[InterceptionEvent] = []
        self._new_events: list[InterceptionEvent] = []
        self._intercept_times = self._precompute_intercepts()

    def _precompute_intercepts(self) -> dict[str, float]:
        """Pre-compute intercept times for all interceptor↔threat pairs."""
        times: dict[str, float] = {}
        threats = [e for e in self._entities.values()
                   if e.definition.type.value in ("ballistic_threat", "cruise_threat")
                   and e.trajectory is not None]
        interceptors = [e for e in self._entities.values()
                        if e.definition.type.value == "interceptor"
                        and e.trajectory is not None]

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

    def seek(self, target_time_s: float) -> None:
        self._sim_time_s = max(0.0, min(target_time_s, self._scenario.metadata.duration_s))

    def set_speed(self, speed: float) -> None:
        self._speed = max(0.1, speed)

    def stop(self) -> None:
        self._running = False

    def _tick(self) -> None:
        """Advance simulation by one time step."""
        tick_dt = 1.0 / self._scenario.metadata.tick_rate_hz
        self._sim_time_s += tick_dt * self._speed

        # Update entity statuses
        for entity in self._entities.values():
            launch = entity.definition.launch_time_s
            if self._sim_time_s >= launch and entity.status == EntityStatus.INACTIVE:
                entity.status = EntityStatus.ACTIVE

        # Check pre-computed intercept times
        for key, intercept_t in list(self._intercept_times.items()):
            if self._sim_time_s >= intercept_t:
                int_id, threat_id = key.split("↔")
                threat = self._entities.get(threat_id)
                interceptor = self._entities.get(int_id)
                if threat and interceptor and threat.status == EntityStatus.ACTIVE:
                    threat.status = EntityStatus.INTERCEPTED
                    interceptor.status = EntityStatus.DESTROYED
                    pos = threat.position_at(intercept_t - threat.definition.launch_time_s)
                    ev = InterceptionEvent(
                        event_id=str(uuid.uuid4()),
                        sim_time_s=self._sim_time_s,
                        threat_id=threat_id,
                        interceptor_id=int_id,
                        position=pos,
                        outcome="success",
                    )
                    self._events.append(ev)
                    self._new_events.append(ev)
                del self._intercept_times[key]

        # Mark threats that reached their target with no interception
        for entity in self._entities.values():
            if (entity.status == EntityStatus.ACTIVE
                    and entity.trajectory is not None
                    and self._sim_time_s >= entity.definition.launch_time_s + entity.flight_time_s):
                entity.status = EntityStatus.MISSED

    def _serialize_state(self, status: str) -> str:
        states = [e.to_state(self._sim_time_s) for e in self._entities.values()]
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
