"""Loads scenario JSON files from the scenarios/ directory."""
from __future__ import annotations
import json
import os
from pathlib import Path
from typing import Optional
from app.models.schema.scenario import ScenarioDefinition, ScenarioMetadata

_SCENARIOS_DIR = Path(__file__).parent.parent.parent / "scenarios"


class ScenarioLoader:
    def __init__(self, scenarios_dir: Path = _SCENARIOS_DIR) -> None:
        self._dir = scenarios_dir
        self._cache: dict[str, ScenarioDefinition] = {}
        self._load_all()

    def _load_all(self) -> None:
        if not self._dir.exists():
            return
        for path in self._dir.glob("*.json"):
            try:
                data = json.loads(path.read_text())
                scenario = ScenarioDefinition.model_validate(data)
                self._cache[scenario.metadata.id] = scenario
            except Exception as e:
                print(f"[ScenarioLoader] Failed to load {path.name}: {e}")

    def list_metadata(self) -> list[ScenarioMetadata]:
        return [s.metadata for s in self._cache.values()]

    def get(self, scenario_id: str) -> Optional[ScenarioDefinition]:
        return self._cache.get(scenario_id)

    def save(self, scenario: ScenarioDefinition) -> None:
        """Persist a scenario to disk and update the in-memory cache."""
        self._dir.mkdir(parents=True, exist_ok=True)
        path = self._dir / f"{scenario.metadata.id}.json"
        tmp = path.with_suffix(".json.tmp")
        tmp.write_text(scenario.model_dump_json(indent=2))
        tmp.replace(path)
        self._cache[scenario.metadata.id] = scenario
