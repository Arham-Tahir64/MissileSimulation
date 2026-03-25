import { usePlaybackStore } from '../../store/playbackStore';
import { useSimulationStore } from '../../store/simulationStore';
import { wsClient } from '../../services/wsClient';

export function usePlayback() {
  const { isPlaying, speed, setPlaying, setSpeed } = usePlaybackStore();
  const { simTimeS, status } = useSimulationStore();

  const play = () => {
    wsClient.send({ type: 'cmd_play', playback_speed: speed });
    setPlaying(true);
  };

  const pause = () => {
    wsClient.send({ type: 'cmd_pause' });
    setPlaying(false);
  };

  const seek = (targetTimeS: number) => {
    wsClient.send({ type: 'cmd_seek', target_time_s: targetTimeS });
  };

  const changeSpeed = (newSpeed: number) => {
    setSpeed(newSpeed);
    wsClient.send({ type: 'cmd_set_speed', speed: newSpeed });
  };

  const toggle = () => (isPlaying ? pause() : play());

  return { isPlaying, speed, simTimeS, status, play, pause, seek, changeSpeed, toggle };
}
