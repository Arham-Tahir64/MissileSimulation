"""
Simplified ballistic trajectory model.

Uses a great-circle arc with a sinusoidal altitude profile.
All parameters are fictional and non-calibrated — this model is
for educational visualization only.
"""
from __future__ import annotations
import math
from app.models.schema.scenario import GeoPosition


# Fictional, non-calibrated apogee altitude (meters)
_DEFAULT_APOGEE_ALT = 300_000.0
_EARTH_RADIUS_M = 6_371_000.0


def _lerp_geo(a: GeoPosition, b: GeoPosition, t: float) -> GeoPosition:
    """Linear interpolation in lat/lon — good enough for arcs < ~5000 km."""
    return GeoPosition(
        lat=a.lat + (b.lat - a.lat) * t,
        lon=a.lon + (b.lon - a.lon) * t,
        alt=a.alt + (b.alt - a.alt) * t,
    )


def _great_circle_distance_m(a: GeoPosition, b: GeoPosition) -> float:
    lat1, lon1 = math.radians(a.lat), math.radians(a.lon)
    lat2, lon2 = math.radians(b.lat), math.radians(b.lon)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * _EARTH_RADIUS_M * math.asin(math.sqrt(h))


class BallisticTrajectory:
    """
    Parametric ballistic arc from origin to target.

    The flight time is derived from the range using a fictional
    average speed. Apogee altitude is fixed at a non-calibrated value.
    """

    # Fictional average speed in m/s — not representative of any real system
    _FICTIONAL_AVG_SPEED_MS = 2_500.0

    def __init__(
        self,
        origin: GeoPosition,
        target: GeoPosition,
        apogee_alt: float = _DEFAULT_APOGEE_ALT,
    ) -> None:
        self.origin = origin
        self.target = target
        self.apogee_alt = apogee_alt
        self._range_m = _great_circle_distance_m(origin, target)
        self.flight_time_s = self._range_m / self._FICTIONAL_AVG_SPEED_MS

    def position_at(self, t: float) -> GeoPosition:
        """Return position at time t seconds after launch."""
        if t <= 0:
            return self.origin
        if t >= self.flight_time_s:
            return self.target

        frac = t / self.flight_time_s
        base = _lerp_geo(self.origin, self.target, frac)
        alt_offset = self.apogee_alt * math.sin(math.pi * frac)
        # Preserve the target altitude through the whole arc instead of snapping
        # back to it only at the final sample. This keeps elevated intercepts
        # visually continuous.
        return GeoPosition(lat=base.lat, lon=base.lon, alt=base.alt + alt_offset)

    def velocity_ms_at(self, t: float) -> float:
        """Approximate scalar speed (constant for simplicity)."""
        return self._FICTIONAL_AVG_SPEED_MS

    def heading_deg_at(self, t: float) -> float:
        """Bearing from origin to target (constant heading approximation)."""
        lat1 = math.radians(self.origin.lat)
        lat2 = math.radians(self.target.lat)
        dlon = math.radians(self.target.lon - self.origin.lon)
        x = math.sin(dlon) * math.cos(lat2)
        y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
        return (math.degrees(math.atan2(x, y)) + 360) % 360

    def pitch_deg_at(self, t: float) -> float:
        """Approximate pitch based on altitude change direction."""
        frac = t / self.flight_time_s if self.flight_time_s > 0 else 0
        return 45.0 * math.cos(math.pi * frac)  # ascending → positive, descending → negative
