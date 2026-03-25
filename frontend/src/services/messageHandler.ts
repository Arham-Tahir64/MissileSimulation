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
      // Any new interception events bundled in the state frame
      msg.events.forEach((ev) =>
        addEvent({
          event_id: ev.event_id,
          sim_time_s: ev.sim_time_s,
          threat_id: ev.threat_id,
          interceptor_id: ev.interceptor_id,
          position: ev.position,
          outcome: ev.outcome,
        })
      );
      break;

    case 'event_intercept':
      addEvent({
        event_id: msg.event_id,
        sim_time_s: msg.sim_time_s,
        threat_id: msg.threat_id,
        interceptor_id: msg.interceptor_id,
        position: msg.position,
        outcome: msg.outcome,
      });
      break;

    case 'sim_status':
      setSimState({ status: msg.status, simTimeS: msg.sim_time_s });
      if (msg.status === 'completed' || msg.status === 'paused') {
        setPlaying(false);
      }
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
