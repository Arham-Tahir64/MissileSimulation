"""
Manages per-session SimulationEngine lifecycle.
One engine per active WebSocket session.
"""
from __future__ import annotations
import asyncio
from typing import Awaitable, Callable, Optional
from app.simulation.engine import SimulationEngine, PushCallback
from app.simulation.scenario_loader import ScenarioLoader

_loader = ScenarioLoader()


class SimulationRunner:
    def __init__(self) -> None:
        self._engines: dict[str, SimulationEngine] = {}
        self._push_callbacks: dict[str, PushCallback] = {}

    def register_push(self, session_id: str, callback: PushCallback) -> None:
        self._push_callbacks[session_id] = callback

    def unregister(self, session_id: str) -> None:
        engine = self._engines.pop(session_id, None)
        if engine:
            engine.stop()
        self._push_callbacks.pop(session_id, None)

    async def load_definition(self, session_id: str, scenario: 'ScenarioDefinition') -> None:
        """Create an engine directly from an inline ScenarioDefinition (no file I/O)."""
        existing = self._engines.pop(session_id, None)
        if existing:
            existing.stop()
        callback = self._push_callbacks.get(session_id)
        if callback is None:
            raise RuntimeError(f"No push callback registered for session '{session_id}'")
        self._engines[session_id] = SimulationEngine(session_id, scenario, callback)

    async def load(self, session_id: str, scenario_id: str) -> None:
        # Stop any running engine for this session
        existing = self._engines.pop(session_id, None)
        if existing:
            existing.stop()

        scenario = _loader.get(scenario_id)
        if scenario is None:
            raise ValueError(f"Scenario '{scenario_id}' not found")

        callback = self._push_callbacks.get(session_id)
        if callback is None:
            raise RuntimeError(f"No push callback registered for session '{session_id}'")

        self._engines[session_id] = SimulationEngine(session_id, scenario, callback)

    async def play(self, session_id: str, speed: float = 1.0) -> None:
        engine = self._engines.get(session_id)
        if engine is None:
            raise RuntimeError(f"No engine loaded for session '{session_id}'")
        await engine.play(speed)

    async def pause(self, session_id: str) -> None:
        engine = self._engines.get(session_id)
        if engine:
            engine.pause()

    async def seek(self, session_id: str, target_time_s: float) -> None:
        engine = self._engines.get(session_id)
        if engine:
            state_json = engine.seek(target_time_s)
            callback = self._push_callbacks.get(session_id)
            if callback is not None:
                await callback(state_json)

    async def set_speed(self, session_id: str, speed: float) -> None:
        engine = self._engines.get(session_id)
        if engine:
            engine.set_speed(speed)
