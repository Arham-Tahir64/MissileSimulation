"""
Manages per-session SimulationEngine lifecycle.
One engine per active WebSocket session.
"""
from __future__ import annotations
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Awaitable
from app.simulation.engine import SimulationEngine, PushCallback
from app.simulation.scenario_loader import ScenarioLoader
from app.persistence.run_archive import FileRunArchiveStore
from app.models.schema.run_archive import RunDetail, RunSummary
from app.models.schema.scenario import ScenarioDefinition
from app.models.schema.simulation import InterceptionEvent, RuntimeEvent, SimulationState

_loader = ScenarioLoader()


@dataclass
class _SessionRuntime:
    engine: SimulationEngine
    scenario: ScenarioDefinition
    started_at_ms: int
    latest_state: Optional[SimulationState] = None
    events: list[RuntimeEvent] = field(default_factory=list)
    event_ids: set[str] = field(default_factory=set)
    persisted_run_id: str | None = None


class SimulationRunner:
    def __init__(self, archive_store: FileRunArchiveStore | None = None) -> None:
        self._sessions: dict[str, _SessionRuntime] = {}
        self._push_callbacks: dict[str, PushCallback] = {}
        default_root = Path(__file__).resolve().parents[2] / "data" / "runs"
        self._archive = archive_store or FileRunArchiveStore(default_root)

    def register_push(self, session_id: str, callback: PushCallback) -> None:
        self._push_callbacks[session_id] = callback

    def unregister(self, session_id: str) -> None:
        session = self._sessions.pop(session_id, None)
        if session:
            session.engine.stop()
            self._persist_session_if_completed(session_id, session)
        self._push_callbacks.pop(session_id, None)

    async def load_definition(self, session_id: str, scenario: 'ScenarioDefinition') -> None:
        """Create an engine directly from an inline ScenarioDefinition (no file I/O)."""
        existing = self._sessions.pop(session_id, None)
        if existing:
            existing.engine.stop()
            self._persist_session_if_completed(session_id, existing)
        callback = self._push_callbacks.get(session_id)
        if callback is None:
            raise RuntimeError(f"No push callback registered for session '{session_id}'")

        async def wrapped_push(state_json: str) -> None:
            self._capture_state(session_id, state_json)
            await callback(state_json)

        engine = SimulationEngine(session_id, scenario, wrapped_push)
        self._sessions[session_id] = _SessionRuntime(
            engine=engine,
            scenario=scenario,
            started_at_ms=int(time.time() * 1000),
        )

    async def load(self, session_id: str, scenario_id: str) -> None:
        # Stop any running engine for this session
        existing = self._sessions.pop(session_id, None)
        if existing:
            existing.engine.stop()
            self._persist_session_if_completed(session_id, existing)

        scenario = _loader.get(scenario_id)
        if scenario is None:
            raise ValueError(f"Scenario '{scenario_id}' not found")

        callback = self._push_callbacks.get(session_id)
        if callback is None:
            raise RuntimeError(f"No push callback registered for session '{session_id}'")

        async def wrapped_push(state_json: str) -> None:
            self._capture_state(session_id, state_json)
            await callback(state_json)

        engine = SimulationEngine(session_id, scenario, wrapped_push)
        self._sessions[session_id] = _SessionRuntime(
            engine=engine,
            scenario=scenario,
            started_at_ms=int(time.time() * 1000),
        )

    async def play(self, session_id: str, speed: float = 1.0) -> None:
        session = self._sessions.get(session_id)
        if session is None:
            raise RuntimeError(f"No engine loaded for session '{session_id}'")
        await session.engine.play(speed)
        self._persist_session_if_completed(session_id, session)

    async def pause(self, session_id: str) -> None:
        session = self._sessions.get(session_id)
        if session:
            session.engine.pause()

    async def seek(self, session_id: str, target_time_s: float) -> None:
        session = self._sessions.get(session_id)
        if session:
            state_json = session.engine.seek(target_time_s)
            self._capture_state(session_id, state_json)
            callback = self._push_callbacks.get(session_id)
            if callback is not None:
                await callback(state_json)

    async def set_speed(self, session_id: str, speed: float) -> None:
        session = self._sessions.get(session_id)
        if session:
            session.engine.set_speed(speed)

    def list_saved_runs(self) -> list[RunSummary]:
        return self._archive.list_summaries()

    def get_saved_run(self, run_id: str) -> RunDetail | None:
        return self._archive.get(run_id)

    def delete_saved_run(self, run_id: str) -> bool:
        return self._archive.delete(run_id)

    def _capture_state(self, session_id: str, state_json: str) -> None:
        session = self._sessions.get(session_id)
        if session is None:
            return
        try:
            state = SimulationState.model_validate_json(state_json)
        except Exception:
            return
        session.latest_state = state
        for event in state.events:
            event_id = getattr(event, "event_id", None)
            if event_id is None or event_id in session.event_ids:
                continue
            session.event_ids.add(event_id)
            session.events.append(event)

    def _persist_session_if_completed(self, session_id: str, session: _SessionRuntime) -> None:
        if session.persisted_run_id is not None:
            return
        if session.latest_state is None or session.latest_state.status != "completed":
            return

        completed_at_ms = session.latest_state.wall_time_ms
        run_id = f"run_{completed_at_ms}_{uuid.uuid4().hex[:8]}"
        intercept_successes = sum(
            1 for event in session.events
            if isinstance(event, InterceptionEvent) and event.outcome == "success"
        )
        intercept_misses = sum(
            1 for event in session.events
            if isinstance(event, InterceptionEvent) and event.outcome == "miss"
        )

        summary = RunSummary(
            run_id=run_id,
            session_id=session_id,
            scenario_id=session.scenario.metadata.id,
            scenario_name=session.scenario.metadata.name,
            scenario_description=session.scenario.metadata.description,
            status="completed",
            started_at_ms=session.started_at_ms,
            completed_at_ms=completed_at_ms,
            duration_s=session.scenario.metadata.duration_s,
            final_sim_time_s=session.latest_state.sim_time_s,
            event_count=len(session.events),
            entity_count=len(session.latest_state.entities),
            intercept_successes=intercept_successes,
            intercept_misses=intercept_misses,
        )
        detail = RunDetail(
            summary=summary,
            scenario=session.scenario,
            final_state=session.latest_state,
            events=session.events,
        )
        self._archive.save(detail)
        session.persisted_run_id = run_id


simulation_runner = SimulationRunner()
