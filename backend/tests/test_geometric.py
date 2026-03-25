"""Tests for the geometric intercept checker."""
import pytest
from app.models.schema.scenario import GeoPosition
from app.simulation.physics.ballistic import BallisticTrajectory
from app.simulation.physics.cruise import CruiseTrajectory
from app.simulation.interception.geometric import find_intercept_time


def _make_ballistic(origin: GeoPosition, target: GeoPosition) -> BallisticTrajectory:
    return BallisticTrajectory(origin, target)


def test_certain_intercept_returns_time():
    """
    Threat flies from A to B. Interceptor launches from near the midpoint
    of the threat trajectory, aimed directly at the threat's midpoint.
    With a large fictional intercept radius, this should produce a hit.
    """
    threat_origin = GeoPosition(lat=35.5, lon=52.0, alt=100)
    threat_target = GeoPosition(lat=32.0, lon=44.5, alt=0)
    threat = _make_ballistic(threat_origin, threat_target)

    # Interceptor launches from the target region, aimed roughly at threat midpoint
    int_origin = GeoPosition(lat=33.0, lon=48.0, alt=50)
    int_target = GeoPosition(lat=34.0, lon=48.5, alt=150_000)
    interceptor = _make_ballistic(int_origin, int_target)

    result = find_intercept_time(
        threat=threat,
        interceptor=interceptor,
        interceptor_launch_time_s=20.0,
        intercept_radius_m=50_000,  # generous radius for test certainty
    )
    assert result is not None
    assert result > 20.0  # must be after interceptor launches


def test_impossible_intercept_returns_none():
    """
    Interceptor launches at the very end of the scenario, far from the
    threat trajectory. Should find no intercept.
    """
    threat_origin = GeoPosition(lat=35.5, lon=52.0, alt=100)
    threat_target = GeoPosition(lat=32.0, lon=44.5, alt=0)
    threat = _make_ballistic(threat_origin, threat_target)

    # Interceptor going the wrong direction entirely
    int_origin = GeoPosition(lat=70.0, lon=10.0, alt=50)   # far north
    int_target = GeoPosition(lat=71.0, lon=11.0, alt=0)    # stays in the north
    interceptor = _make_ballistic(int_origin, int_target)

    result = find_intercept_time(
        threat=threat,
        interceptor=interceptor,
        interceptor_launch_time_s=0.0,
        intercept_radius_m=25_000,
    )
    assert result is None


def test_intercept_time_is_after_launch():
    """Intercept time must always be >= interceptor_launch_time_s."""
    threat = _make_ballistic(
        GeoPosition(lat=35.5, lon=52.0, alt=100),
        GeoPosition(lat=32.0, lon=44.5, alt=0),
    )
    interceptor = _make_ballistic(
        GeoPosition(lat=33.0, lon=48.0, alt=50),
        GeoPosition(lat=34.0, lon=48.5, alt=150_000),
    )
    launch_t = 15.0
    result = find_intercept_time(
        threat=threat,
        interceptor=interceptor,
        interceptor_launch_time_s=launch_t,
        intercept_radius_m=50_000,
    )
    if result is not None:
        assert result >= launch_t


def test_zero_launch_time_works():
    """Interceptor that launches at t=0 should still be evaluated."""
    threat = _make_ballistic(
        GeoPosition(lat=35.5, lon=52.0, alt=100),
        GeoPosition(lat=35.5, lon=52.0, alt=0),  # threat goes straight down
    )
    interceptor = _make_ballistic(
        GeoPosition(lat=35.5, lon=52.0, alt=0),
        GeoPosition(lat=35.5, lon=52.0, alt=50_000),
    )
    # Both at same lat/lon — large radius should catch it
    result = find_intercept_time(
        threat=threat,
        interceptor=interceptor,
        interceptor_launch_time_s=0.0,
        intercept_radius_m=100_000,
    )
    assert result is not None


def test_cruise_threat_intercept():
    """Geometric checker should work with CruiseTrajectory threats too."""
    threat = CruiseTrajectory(
        [
            GeoPosition(lat=36.0, lon=50.0, alt=500),
            GeoPosition(lat=34.0, lon=46.0, alt=500),
        ],
        speed_ms=220,
    )
    interceptor = CruiseTrajectory(
        [
            GeoPosition(lat=34.5, lon=47.0, alt=500),
            GeoPosition(lat=35.0, lon=48.0, alt=500),
        ],
        speed_ms=450,
    )
    result = find_intercept_time(
        threat=threat,
        interceptor=interceptor,
        interceptor_launch_time_s=0.0,
        intercept_radius_m=80_000,
    )
    # With a generous radius these trajectories pass close enough
    assert result is not None
