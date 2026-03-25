"""
Geometric intercept checker.

Determines the time of closest approach between a threat trajectory
and an interceptor trajectory, and whether it falls within a
fictional intercept radius.

This is a simplified, educational model. No guidance law, seeker,
or autopilot is modeled.
"""
from __future__ import annotations
import math
from typing import Protocol, Optional
from app.models.schema.scenario import GeoPosition

# Fictional intercept radius — not calibrated to any real system
_INTERCEPT_RADIUS_M = 25_000.0
_EARTH_RADIUS_M = 6_371_000.0


class Trajectory(Protocol):
    flight_time_s: float

    def position_at(self, t: float) -> GeoPosition: ...


def _distance_m(a: GeoPosition, b: GeoPosition) -> float:
    lat1, lon1 = math.radians(a.lat), math.radians(a.lon)
    lat2, lon2 = math.radians(b.lat), math.radians(b.lon)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * _EARTH_RADIUS_M * math.asin(math.sqrt(h))


def find_intercept_time(
    threat: Trajectory,
    interceptor: Trajectory,
    interceptor_launch_time_s: float,
    time_step_s: float = 1.0,
    intercept_radius_m: float = _INTERCEPT_RADIUS_M,
) -> Optional[float]:
    """
    Search for the first simulation time at which the interceptor comes
    within intercept_radius_m of the threat.

    Returns the simulation time (from t=0) of intercept, or None if no
    intercept occurs.
    """
    max_time = max(threat.flight_time_s, interceptor.flight_time_s + interceptor_launch_time_s)

    t = interceptor_launch_time_s
    while t <= max_time:
        threat_pos = threat.position_at(t)
        interceptor_pos = interceptor.position_at(t - interceptor_launch_time_s)

        dist = _distance_m(threat_pos, interceptor_pos)
        if dist <= intercept_radius_m:
            return t

        t += time_step_s

    return None
