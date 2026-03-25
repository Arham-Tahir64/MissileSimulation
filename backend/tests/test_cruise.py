"""Tests for the cruise trajectory physics model."""
import pytest
from app.models.schema.scenario import GeoPosition
from app.simulation.physics.cruise import CruiseTrajectory

WAYPOINTS = [
    GeoPosition(lat=36.0, lon=50.0, alt=500),
    GeoPosition(lat=35.0, lon=47.0, alt=500),
    GeoPosition(lat=33.5, lon=45.5, alt=500),
    GeoPosition(lat=32.0, lon=44.0, alt=0),
]
SPEED = 250.0  # m/s


@pytest.fixture
def traj() -> CruiseTrajectory:
    return CruiseTrajectory(WAYPOINTS, speed_ms=SPEED)


def test_requires_at_least_two_waypoints():
    with pytest.raises(ValueError):
        CruiseTrajectory([WAYPOINTS[0]], speed_ms=SPEED)


def test_position_at_zero_is_first_waypoint(traj: CruiseTrajectory):
    pos = traj.position_at(0)
    assert abs(pos.lat - WAYPOINTS[0].lat) < 0.01
    assert abs(pos.lon - WAYPOINTS[0].lon) < 0.01


def test_position_at_flight_time_is_last_waypoint(traj: CruiseTrajectory):
    pos = traj.position_at(traj.flight_time_s)
    assert abs(pos.lat - WAYPOINTS[-1].lat) < 0.1
    assert abs(pos.lon - WAYPOINTS[-1].lon) < 0.1


def test_position_beyond_flight_time_returns_last_waypoint(traj: CruiseTrajectory):
    pos = traj.position_at(traj.flight_time_s + 9999)
    assert abs(pos.lat - WAYPOINTS[-1].lat) < 0.1
    assert abs(pos.lon - WAYPOINTS[-1].lon) < 0.1


def test_negative_time_returns_first_waypoint(traj: CruiseTrajectory):
    pos = traj.position_at(-10)
    assert abs(pos.lat - WAYPOINTS[0].lat) < 0.01
    assert abs(pos.lon - WAYPOINTS[0].lon) < 0.01


def test_flight_time_is_positive(traj: CruiseTrajectory):
    assert traj.flight_time_s > 0


def test_velocity_equals_configured_speed(traj: CruiseTrajectory):
    assert traj.velocity_ms_at(0) == SPEED
    assert traj.velocity_ms_at(traj.flight_time_s / 2) == SPEED


def test_pitch_is_zero(traj: CruiseTrajectory):
    """Cruise flies level — pitch should be 0."""
    assert traj.pitch_deg_at(0) == 0.0
    assert traj.pitch_deg_at(traj.flight_time_s / 2) == 0.0


def test_heading_is_in_valid_range(traj: CruiseTrajectory):
    heading = traj.heading_deg_at(10)
    assert 0 <= heading < 360


def test_midpoint_position_is_between_endpoints(traj: CruiseTrajectory):
    mid = traj.position_at(traj.flight_time_s / 2)
    # Must be geographically between first and last waypoint
    min_lat = min(w.lat for w in WAYPOINTS)
    max_lat = max(w.lat for w in WAYPOINTS)
    assert min_lat <= mid.lat <= max_lat


def test_higher_speed_gives_shorter_flight_time():
    slow = CruiseTrajectory(WAYPOINTS, speed_ms=100)
    fast = CruiseTrajectory(WAYPOINTS, speed_ms=500)
    assert fast.flight_time_s < slow.flight_time_s


def test_two_waypoint_trajectory():
    """Minimal valid trajectory."""
    t = CruiseTrajectory(
        [GeoPosition(lat=0, lon=0, alt=0), GeoPosition(lat=1, lon=1, alt=0)],
        speed_ms=300,
    )
    assert t.flight_time_s > 0
    pos = t.position_at(0)
    assert abs(pos.lat) < 0.01
