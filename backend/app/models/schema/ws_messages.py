from __future__ import annotations
from typing import Union, Annotated
from pydantic import BaseModel, Field


# ──────────────────────────────────────────────
# Client → Server commands
# ──────────────────────────────────────────────

class CmdLoad(BaseModel):
    type: str = "cmd_load"
    scenario_id: str


class CmdPlay(BaseModel):
    type: str = "cmd_play"
    playback_speed: float = 1.0


class CmdPause(BaseModel):
    type: str = "cmd_pause"


class CmdSeek(BaseModel):
    type: str = "cmd_seek"
    target_time_s: float


class CmdSetSpeed(BaseModel):
    type: str = "cmd_set_speed"
    speed: float


ClientMessage = Union[CmdLoad, CmdPlay, CmdPause, CmdSeek, CmdSetSpeed]
