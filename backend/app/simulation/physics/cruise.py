"""
Simplified cruise trajectory model.

Models a cruise threat as a point-mass flying at constant altitude
along a sequence of waypoints at a fixed speed.
All parameters are fictional and non-calibrated.
"""
from __future__ import annotations
import math
from app.models.schema.scenario import GeoPosition

_EARTH_RADIUS_M = 6_371_000.0
_DEFAULT_CRUISE_SPEED_MS = 250.0  # Fictional, non-calibrated


def _distance_m(a: GeoPosition, b: GeoPosition) -> float:
    lat1, lon1 = math.radians(a.lat), math.radians(a.lon)
    lat2, lon2 = math.radians(b.lat), math.radians(b.lon)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * _EARTH_RADIUS_M * math.asin(math.sqrt(h))


def _bearing_deg(a: GeoPosition, b: GeoPosition) -> float:
    lat1 = math.radians(a.lat)
    lat2 = math.radians(b.lat)
    dlon = math.radians(b.lon - a.lon)
    x = math.sin(dlon) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def _lerp_geo(a: GeoPosition, b: GeoPosition, t: float) -> GeoPosition:
    return GeoPosition(
        lat=a.lat + (b.lat - a.lat) * t,
        lon=a.lon + (b.lon - a.lon) * t,
        alt=a.alt + (b.alt - a.alt) * t,
    )


class CruiseTrajectory:
    """Waypoint-following cruise trajectory at constant speed."""

    def __init__(
        self,
        waypoints: list[GeoPosition],
        speed_ms: float = _DEFAULT_CRUISE_SPEED_MS,
    ) -> None:
        if len(waypoints) < 2:
            raise ValueError("CruiseTrajectory requires at least 2 waypoints (origin + target)")
        self.waypoints = waypoints
        self.speed_ms = speed_ms

        # Pre-compute cumulative distances and times for each segment
        self._segment_times: list[float] = []
        cumulative = 0.0
        for i in range(len(waypoints) - 1):
            d = _distance_m(waypoints[i], waypoints[i + 1])
            cumulative += d / speed_ms
            self._segment_times.append(cumulative)

        self.flight_time_s = self._segment_times[-1] if self._segment_times else 0.0

    def position_at(self, t: float) -> GeoPosition:
        if t <= 0:
            return self.waypoints[0]
        if t >= self.flight_time_s:
            return self.waypoints[-1]

        # Find which segment we're in
        prev_time = 0.0
        for i, seg_end_time in enumerate(self._segment_times):
            if t <= seg_end_time:
                seg_frac = (t - prev_time) / (seg_end_time - prev_time)
                return _lerp_geo(self.waypoints[i], self.waypoints[i + 1], seg_frac)
            prev_time = seg_end_time

        return self.waypoints[-1]

    def velocity_ms_at(self, _t: float) -> float:
        return self.speed_ms

    def heading_deg_at(self, t: float) -> float:
        pos = self.position_at(t)
        pos_next = self.position_at(min(t + 1.0, self.flight_time_s))
        return _bearing_deg(pos, pos_next)

    def pitch_deg_at(self, _t: float) -> float:
        return 0.0  # Cruise flies level
