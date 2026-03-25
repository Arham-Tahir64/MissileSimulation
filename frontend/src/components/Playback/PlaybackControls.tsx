import { usePlayback } from './usePlayback';
import { usePlaybackStore } from '../../store/playbackStore';
import { formatSimTime, timeToFraction } from '../../utils/timeUtils';

const SPEED_OPTIONS = [0.5, 1, 2, 4, 8];

export function PlaybackControls() {
  const { isPlaying, speed, simTimeS, status, toggle, seek, changeSpeed } = usePlayback();
  const durationS = usePlaybackStore((s) => s.durationS);
  const fraction = timeToFraction(simTimeS, durationS);

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value) * durationS;
    seek(t);
  };

  return (
    <div style={styles.container}>
      <button onClick={toggle} disabled={status === 'idle'} style={styles.btn}>
        {isPlaying ? '⏸' : '▶'}
      </button>

      <span style={styles.time}>{formatSimTime(simTimeS)}</span>

      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={fraction}
        onChange={handleScrub}
        disabled={status === 'idle'}
        style={styles.scrubber}
      />

      <span style={styles.time}>{formatSimTime(durationS)}</span>

      <select
        value={speed}
        onChange={(e) => changeSpeed(parseFloat(e.target.value))}
        style={styles.speedSelect}
      >
        {SPEED_OPTIONS.map((s) => (
          <option key={s} value={s}>{s}x</option>
        ))}
      </select>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 14px',
    background: 'rgba(10,10,20,0.85)',
    backdropFilter: 'blur(6px)',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  btn: {
    background: 'none',
    border: '1px solid rgba(255,255,255,0.3)',
    color: '#fff',
    padding: '4px 10px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 16,
  },
  time: {
    color: '#a0aec0',
    fontFamily: 'monospace',
    fontSize: 13,
    minWidth: 45,
  },
  scrubber: {
    flex: 1,
    accentColor: '#63b3ed',
  },
  speedSelect: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: 4,
    padding: '2px 6px',
  },
};
