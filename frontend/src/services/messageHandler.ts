import { ServerMessage } from '../types/ws-protocol';
import { useSimulationStore } from '../store/simulationStore';
import { usePlaybackStore } from '../store/playbackStore';

export function handleServerMessage(msg: ServerMessage): void {
  const { setSimState, addEvent } = useSimulationStore.getState();
  const { setPlaying } = usePlaybackStore.getState();

  switch (msg.type) {
    case 'sim_state':
      setSimState({
        sessionId: msg.session_id,
        scenarioId: msg.scenario_id,
        simTimeS: msg.sim_time_s,
        status: msg.status,
        entities: msg.entities,
      });
      if (msg.status === 'running') {
        setPlaying(true);
      }
      // Any new interception events bundled in the state frame
      msg.events.forEach((ev) => addEvent(ev));
      break;

    case 'sensor_track':
    case 'engagement_order':
    case 'event_intercept':
      addEvent(msg);
      break;

    case 'sim_status':
      setSimState({ status: msg.status, simTimeS: msg.sim_time_s });
      setPlaying(msg.status === 'running');
      break;

    case 'error':
      console.error(`[Sim Error] ${msg.code}: ${msg.message}`);
      if (msg.fatal) {
        setSimState({ status: 'idle' });
        setPlaying(false);
      }
      break;
  }
}
