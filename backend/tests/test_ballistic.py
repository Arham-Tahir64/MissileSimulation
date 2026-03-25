"""Tests for the ballistic trajectory physics model."""
import math
import pytest
from app.models.schema.scenario import GeoPosition
from app.simulation.physics.ballistic import BallisticTrajectory


ORIGIN = GeoPosition(lat=35.5, lon=52.0, alt=100)
TARGET = GeoPosition(lat=32.0, lon=44.5, alt=0)


@pytest.fixture
def traj() -> BallisticTrajectory:
    return BallisticTrajectory(ORIGIN, TARGET)


def test_position_at_zero_is_origin(traj: BallisticTrajectory):
    pos = traj.position_at(0)
    assert abs(pos.lat - ORIGIN.lat) < 0.01
    assert abs(pos.lon - ORIGIN.lon) < 0.01


def test_position_at_flight_time_is_target(traj: BallisticTrajectory):
    pos = traj.position_at(traj.flight_time_s)
    assert abs(pos.lat - TARGET.lat) < 0.1
    assert abs(pos.lon - TARGET.lon) < 0.1


def test_position_beyond_flight_time_returns_target(traj: BallisticTrajectory):
    pos = traj.position_at(traj.flight_time_s + 999)
    assert abs(pos.lat - TARGET.lat) < 0.1
    assert abs(pos.lon - TARGET.lon) < 0.1


def test_negative_time_returns_origin(traj: BallisticTrajectory):
    pos = traj.position_at(-10)
    assert abs(pos.lat - ORIGIN.lat) < 0.01
    assert abs(pos.lon - ORIGIN.lon) < 0.01


def test_apogee_altitude_at_midpoint(traj: BallisticTrajectory):
    """Altitude should peak near the midpoint of flight."""
    mid_t = traj.flight_time_s / 2
    pos_mid = traj.position_at(mid_t)
    pos_start = traj.position_at(0)
    pos_end = traj.position_at(traj.flight_time_s)
    assert pos_mid.alt > pos_start.alt
    assert pos_mid.alt > pos_end.alt


def test_altitude_at_midpoint_close_to_apogee(traj: BallisticTrajectory):
    """Midpoint altitude should be at or near the full apogee altitude."""
    mid_t = traj.flight_time_s / 2
    pos_mid = traj.position_at(mid_t)
    # sin(π * 0.5) == 1.0, so midpoint is exactly at apogee
    expected_alt = ORIGIN.alt + traj.apogee_alt
    assert abs(pos_mid.alt - expected_alt) < 1.0


def test_flight_time_is_positive(traj: BallisticTrajectory):
    assert traj.flight_time_s > 0


def test_velocity_is_constant(traj: BallisticTrajectory):
    v0 = traj.velocity_ms_at(0)
    v1 = traj.velocity_ms_at(traj.flight_time_s / 2)
    assert v0 == v1
    assert v0 > 0


def test_heading_is_in_valid_range(traj: BallisticTrajectory):
    heading = traj.heading_deg_at(10)
    assert 0 <= heading < 360


def test_pitch_ascending_is_positive(traj: BallisticTrajectory):
    """Pitch at t=0 should be positive (ascending)."""
    pitch = traj.pitch_deg_at(0)
    assert pitch > 0


def test_pitch_descending_is_negative(traj: BallisticTrajectory):
    """Pitch near end of flight should be negative (descending)."""
    pitch = traj.pitch_deg_at(traj.flight_time_s * 0.9)
    assert pitch < 0


def test_different_origin_target_gives_different_flight_time():
    short = BallisticTrajectory(
        GeoPosition(lat=35.0, lon=50.0, alt=0),
        GeoPosition(lat=35.5, lon=50.5, alt=0),
    )
    long_ = BallisticTrajectory(
        GeoPosition(lat=35.0, lon=50.0, alt=0),
        GeoPosition(lat=0.0, lon=0.0, alt=0),
    )
    assert long_.flight_time_s > short.flight_time_s
