import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.simulation.runner import simulation_runner
from app.models.schema.ws_messages import CmdLoad, CmdPlay, CmdPause, CmdSeek, CmdSetSpeed
from app.models.schema.scenario import ScenarioDefinition

router = APIRouter()


@router.websocket("/ws/simulation/{session_id}")
async def simulation_ws(websocket: WebSocket, session_id: str):
    await websocket.accept()

    # Send initial idle status
    await websocket.send_text(json.dumps({
        "type": "sim_status",
        "session_id": session_id,
        "status": "idle",
        "sim_time_s": 0.0,
        "message": "Connected. Send cmd_load to begin.",
    }))

    # Register a callback that pushes state updates to this WebSocket
    async def push_state(state_json: str):
        try:
            await websocket.send_text(state_json)
        except Exception:
            pass

    simulation_runner.register_push(session_id, push_state)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                msg_type = data.get("type", "")

                if msg_type == "cmd_load":
                    msg = CmdLoad(**data)
                    await simulation_runner.load(session_id, msg.scenario_id)
                    await websocket.send_text(json.dumps({
                        "type": "sim_status",
                        "session_id": session_id,
                        "status": "paused",
                        "sim_time_s": 0.0,
                        "message": f"Scenario '{msg.scenario_id}' loaded.",
                    }))

                elif msg_type == "cmd_load_definition":
                    scenario = ScenarioDefinition(**data["definition"])
                    await simulation_runner.load_definition(session_id, scenario)
                    await websocket.send_text(json.dumps({
                        "type": "sim_status",
                        "session_id": session_id,
                        "status": "paused",
                        "sim_time_s": 0.0,
                        "message": f"Custom scenario '{scenario.metadata.name}' loaded.",
                    }))

                elif msg_type == "cmd_play":
                    msg = CmdPlay(**data)
                    asyncio.create_task(simulation_runner.play(session_id, msg.playback_speed))

                elif msg_type == "cmd_pause":
                    await simulation_runner.pause(session_id)

                elif msg_type == "cmd_seek":
                    msg = CmdSeek(**data)
                    await simulation_runner.seek(session_id, msg.target_time_s)

                elif msg_type == "cmd_set_speed":
                    msg = CmdSetSpeed(**data)
                    await simulation_runner.set_speed(session_id, msg.speed)

            except Exception as e:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "code": "COMMAND_ERROR",
                    "message": str(e),
                    "fatal": False,
                }))

    except WebSocketDisconnect:
        pass
    finally:
        simulation_runner.unregister(session_id)
