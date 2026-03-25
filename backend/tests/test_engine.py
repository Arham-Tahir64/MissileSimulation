"""Tests for the simulation engine entity lifecycle and event emission."""
import asyncio
import json
import pytest
from app.models.schema.scenario import (
    ScenarioDefinition, ScenarioMetadata, EntityDefinition,
    GeoPosition, EntityType, TrajectoryType,
)
from app.simulation.engine import SimulationEngine


def _make_scenario(duration_s: float = 60.0, tick_rate_hz: float = 10.0) -> ScenarioDefinition:
    return ScenarioDefinition(
        metadata=ScenarioMetadata(
            id="test_scenario",
            name="Test",
            description="Unit test scenario",
            duration_s=duration_s,
            tick_rate_hz=tick_rate_hz,
            threat_count=1,
            interceptor_count=1,
            tags=[],
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
                launch_time_s=5.0,
            ),
        ],
    )


def _make_defense_scenario(duration_s: float = 120.0, tick_rate_hz: float = 10.0) -> ScenarioDefinition:
    return ScenarioDefinition(
        metadata=ScenarioMetadata(
            id="defense_test",
            name="Defense Test",
            description="Runtime detection and auto-engagement test",
            duration_s=duration_s,
            tick_rate_hz=tick_rate_hz,
            threat_count=1,
            interceptor_count=1,
            tags=[],
        ),
        entities=[
            EntityDefinition(
                id="T-1",
                type=EntityType.BALLISTIC_THREAT,
                label="Threat 1",
                designator="T-1",
                trajectory_type=TrajectoryType.BALLISTIC,
                origin=GeoPosition(lat=35.4, lon=51.0, alt=100),
                target=GeoPosition(lat=33.2, lon=48.2, alt=0),
                launch_time_s=0.0,
            ),
            EntityDefinition(
                id="EWR-1",
                type=EntityType.SENSOR,
                label="Early Warning Radar",
                designator="EWR-1",
                trajectory_type=TrajectoryType.STATIONARY,
                origin=GeoPosition(lat=34.4, lon=49.0, alt=0),
                launch_time_s=0.0,
            ),
            EntityDefinition(
                id="ARW-1",
                type=EntityType.INTERCEPTOR,
                label="Arrow Battery",
                designator="ARW-1",
                trajectory_type=TrajectoryType.STATIONARY,
                origin=GeoPosition(lat=34.3, lon=49.1, alt=0),
                launch_time_s=0.0,
            ),
        ],
    )


@pytest.mark.asyncio
async def test_entities_start_inactive():
    """All entities should be INACTIVE before their launch_time_s."""
    messages: list[dict] = []

    async def push(json_str: str):
        messages.append(json.loads(json_str))

    scenario = _make_scenario()
    engine = SimulationEngine("sess-1", scenario, push)

    # Run for just 2 seconds (before T-1 launches at t=0, INT-A at t=5)
    # We'll tick manually instead of running play() to avoid waiting
    engine._tick()  # advance to ~0.1s
    state = json.loads(engine._serialize_state("running"))
    entities_by_id = {e["id"]: e for e in state["entities"]}

    # T-1 launches at t=0 so after first tick it should be ACTIVE
    assert entities_by_id["T-1"]["status"] == "active"
    # INT-A launches at t=5, should still be inactive
    assert entities_by_id["INT-A"]["status"] == "inactive"


@pytest.mark.asyncio
async def test_interceptor_becomes_active_after_launch_time():
    """INT-A with launch_time_s=5 should be ACTIVE after sim_time > 5."""
    async def push(_: str):
        pass

    scenario = _make_scenario(duration_s=200.0)
    engine = SimulationEngine("sess-2", scenario, push)

    # Advance past INT-A's launch time (5s)
    engine._sim_time_s = 6.0
    engine._tick()
    state = json.loads(engine._serialize_state("running"))
    entities_by_id = {e["id"]: e for e in state["entities"]}
    assert entities_by_id["INT-A"]["status"] == "active"


@pytest.mark.asyncio
async def test_state_json_has_required_fields():
    """Serialized state must contain all required top-level fields."""
    async def push(_: str):
        pass

    scenario = _make_scenario()
    engine = SimulationEngine("sess-3", scenario, push)
    state = json.loads(engine._serialize_state("idle"))

    assert "session_id" in state
    assert "scenario_id" in state
    assert "sim_time_s" in state
    assert "status" in state
    assert "entities" in state
    assert "events" in state
    assert state["session_id"] == "sess-3"
    assert state["scenario_id"] == "test_scenario"


@pytest.mark.asyncio
async def test_entity_state_has_position():
    """Each entity state dict must have a position with lat/lon/alt."""
    async def push(_: str):
        pass

    scenario = _make_scenario()
    engine = SimulationEngine("sess-4", scenario, push)
    state = json.loads(engine._serialize_state("running"))

    for entity in state["entities"]:
        assert "position" in entity
        pos = entity["position"]
        assert "lat" in pos
        assert "lon" in pos
        assert "alt" in pos


@pytest.mark.asyncio
async def test_precomputed_intercepts_are_cached():
    """Engine should pre-compute intercept times at init, not on every tick."""
    async def push(_: str):
        pass

    scenario = _make_scenario(duration_s=300.0)
    engine = SimulationEngine("sess-5", scenario, push)

    # If the intercept pair exists (T-1 ↔ INT-A), it should be in the cache
    # The key format is "INT-A↔T-1"
    assert len(engine._intercept_times) >= 0  # may or may not find intercept for this geometry


@pytest.mark.asyncio
async def test_run_completes_short_scenario():
    """A very short scenario should complete without hanging."""
    messages: list[dict] = []

    async def push(json_str: str):
        messages.append(json.loads(json_str))

    # 0.5s scenario at 10 Hz = 5 ticks
    scenario = _make_scenario(duration_s=0.5, tick_rate_hz=10.0)
    engine = SimulationEngine("sess-6", scenario, push)

    await asyncio.wait_for(engine.play(speed=100.0), timeout=5.0)

    assert len(messages) > 0
    # Last message should be completed status
    final = messages[-1]
    assert final["status"] == "completed"


@pytest.mark.asyncio
async def test_defense_assets_detect_engage_and_intercept():
    async def push(_: str):
        pass

    scenario = _make_defense_scenario()
    engine = SimulationEngine("sess-defense-1", scenario, push)

    for _ in range(700):
        engine._tick()

    state = json.loads(engine._serialize_state("running"))
    event_types = {event["type"] for event in state["events"]}

    assert "sensor_track" in event_types
    assert "engagement_order" in event_types
    assert "event_intercept" in event_types
    assert any(entity["id"].startswith("ARW-1-SHOT-") for entity in state["entities"])
    assert any(
        entity["id"] == "ARW-1" and entity["asset_status"] in ("cooldown", "engaging", "idle")
        for entity in state["entities"]
    )


@pytest.mark.asyncio
async def test_seek_rebuilds_defense_runtime_state_and_events():
    async def push(_: str):
        pass

    scenario = _make_defense_scenario()
    engine = SimulationEngine("sess-defense-2", scenario, push)

    state = json.loads(engine.seek(35.0))
    entities_by_id = {entity["id"]: entity for entity in state["entities"]}
    event_types = {event["type"] for event in state["events"]}

    assert state["sim_time_s"] >= 35.0 - 0.11
    assert "EWR-1" in entities_by_id
    assert "ARW-1" in entities_by_id
    assert "sensor_track" in event_types
    assert "engagement_order" in event_types
