from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.models.schema.scenario import EntityDefinition


@dataclass(frozen=True)
class DefenseAssetProfile:
    kind: Literal["radar", "battery"]
    subtype: str
    detection_radius_m: float = 0.0
    tracking_latency_s: float = 0.0
    engagement_radius_m: float = 0.0
    cooldown_s: float = 0.0
    max_tracks: int = 0
    priority: int = 0
    allowed_threat_types: tuple[str, ...] = ("ballistic_threat", "cruise_threat")


_PROFILES: dict[str, DefenseAssetProfile] = {
    "EWR": DefenseAssetProfile(
        kind="radar",
        subtype="early_warning_radar",
        detection_radius_m=2_200_000.0,
        tracking_latency_s=2.0,
        max_tracks=12,
    ),
    "TRK": DefenseAssetProfile(
        kind="radar",
        subtype="tracking_radar",
        detection_radius_m=1_050_000.0,
        tracking_latency_s=0.8,
        max_tracks=8,
    ),
    "ARW": DefenseAssetProfile(
        kind="battery",
        subtype="arrow_battery",
        engagement_radius_m=1_850_000.0,
        cooldown_s=20.0,
        max_tracks=2,
        priority=0,
        allowed_threat_types=("ballistic_threat",),
    ),
    "DS": DefenseAssetProfile(
        kind="battery",
        subtype="davids_sling",
        engagement_radius_m=850_000.0,
        cooldown_s=16.0,
        max_tracks=2,
        priority=1,
        allowed_threat_types=("ballistic_threat", "cruise_threat"),
    ),
    "ID": DefenseAssetProfile(
        kind="battery",
        subtype="iron_dome",
        engagement_radius_m=280_000.0,
        cooldown_s=10.0,
        max_tracks=2,
        priority=2,
        allowed_threat_types=("cruise_threat", "ballistic_threat"),
    ),
}


def get_defense_asset_profile(definition: EntityDefinition) -> DefenseAssetProfile | None:
    prefix = definition.designator.split("-", 1)[0].upper()
    return _PROFILES.get(prefix)
