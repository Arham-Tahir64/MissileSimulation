import asyncio

import pytest
from fastapi import HTTPException

from app.api.routes.runs import get_run, list_runs
from app.models.schema.scenario import (
    EntityDefinition,
    EntityType,
    GeoPosition,
    ScenarioDefinition,
    ScenarioMetadata,
    TrajectoryType,
)
from app.persistence.run_archive import FileRunArchiveStore
from app.simulation.runner import SimulationRunner


def _make_api_scenario() -> ScenarioDefinition:
    return ScenarioDefinition(
        metadata=ScenarioMetadata(
            id="api_archive_scenario",
            name="API Archive Scenario",
            description="Completed run persistence route test",
            duration_s=0.5,
            tick_rate_hz=10.0,
            threat_count=1,
            interceptor_count=1,
            tags=["archive"],
        ),
        entities=[
            EntityDefinition(
                id="T-1",
                type=EntityType.BALLISTIC_THREAT,
                label="Threat 1",
                designator="T-1",
                trajectory_type=TrajectoryType.BALLISTIC,
                origin=GeoPosition(lat=35.5, lon=52.0, alt=100),
                target=GeoPosition(lat=32.0, lon=44.5, alt=0),
                launch_time_s=0.0,
            ),
            EntityDefinition(
                id="INT-A",
                type=EntityType.INTERCEPTOR,
                label="Interceptor A",
                designator="INT-A",
                trajectory_type=TrajectoryType.BALLISTIC,
                origin=GeoPosition(lat=33.0, lon=48.0, alt=50),
                target=GeoPosition(lat=34.0, lon=48.5, alt=150_000),
                launch_time_s=0.0,
            ),
        ],
    )


@pytest.mark.asyncio
async def test_runs_routes_list_and_get_saved_run(tmp_path):
    runner = SimulationRunner(archive_store=FileRunArchiveStore(tmp_path))

    async def push(_: str):
        return None

    runner.register_push("sess-api-1", push)
    await runner.load_definition("sess-api-1", _make_api_scenario())
    await runner.play("sess-api-1", speed=100.0)

    summaries = await list_runs(runner)
    assert len(summaries) == 1

    run_id = summaries[0].run_id
    detail = await get_run(run_id, runner)
    assert detail.summary.run_id == run_id
    assert detail.scenario.metadata.id == "api_archive_scenario"

    with pytest.raises(HTTPException) as exc_info:
        await get_run("does-not-exist", runner)
    assert exc_info.value.status_code == 404
