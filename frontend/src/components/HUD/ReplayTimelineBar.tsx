import { useEffect, useState } from 'react';
import { formatSimTime } from '../../utils/timeUtils';
import { ReplayEventMarker } from './hudSelectors';
import { glassPanel, hudTheme, monoText, sectionTitle } from './hudTheme';

const SPEED_OPTIONS = [0.5, 1, 2, 4, 8];

export function ReplayTimelineBar({
  isPlaying,
  status,
  speed,
  durationS,
  fraction,
  markers,
  showAlerts,
  onTogglePlay,
  onSeekFraction,
  onSpeedChange,
  onSelectMarker,
}: {
  isPlaying: boolean;
  status: string;
  speed: number;
  durationS: number;
  fraction: number;
  markers: ReplayEventMarker[];
  showAlerts: boolean;
  onTogglePlay: () => void;
  onSeekFraction: (fraction: number) => void;
  onSpeedChange: (speed: number) => void;
  onSelectMarker: (marker: ReplayEventMarker) => void;
}) {
  const [isScrubbing, setScrubbing] = useState(false);
  const [draftFraction, setDraftFraction] = useState(fraction);

  useEffect(() => {
    if (!isScrubbing) {
      setDraftFraction(fraction);
    }
  }, [fraction, isScrubbing]);

  const previewFraction = isScrubbing ? draftFraction : fraction;
  const previewTimeS = previewFraction * durationS;

  const commitSeek = () => {
    setScrubbing(false);
    onSeekFraction(draftFraction);
  };

  return (
    <section style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <div style={sectionTitle}>Replay Timeline</div>
          <div style={styles.headline}>Playback, scrub, and event markers</div>
        </div>
        <div style={styles.controls}>
          <button onClick={onTogglePlay} disabled={status === 'idle'} style={styles.playButton}>
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </button>
          <span style={styles.time}>{formatSimTime(previewTimeS)}</span>
          <span style={styles.time}>{formatSimTime(durationS)}</span>
          <select
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            style={styles.select}
          >
            {SPEED_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}x</option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.timelineWrap}>
        {showAlerts && markers.map((marker) => (
          <button
            key={marker.id}
            onClick={() => onSelectMarker(marker)}
            style={{
              ...styles.marker,
              left: `${marker.fraction * 100}%`,
              background:
                marker.tone === 'cyan'
                  ? hudTheme.cyan
                  : marker.tone === 'amber'
                    ? hudTheme.amber
                    : hudTheme.red,
            }}
            title={marker.label}
          />
        ))}
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={previewFraction}
          onMouseDown={() => setScrubbing(true)}
          onTouchStart={() => setScrubbing(true)}
          onChange={(e) => {
            if (!isScrubbing) setScrubbing(true);
            setDraftFraction(parseFloat(e.target.value));
          }}
          onMouseUp={commitSeek}
          onTouchEnd={commitSeek}
          onKeyUp={commitSeek}
          onBlur={() => {
            if (isScrubbing) commitSeek();
          }}
          disabled={status === 'idle'}
          style={styles.scrubber}
        />
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    ...glassPanel,
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    pointerEvents: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 18,
    alignItems: 'end',
  },
  headline: {
    color: hudTheme.text,
    fontSize: 18,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    marginTop: 4,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  playButton: {
    border: `1px solid ${hudTheme.line}`,
    background: 'rgba(9,14,19,0.72)',
    color: hudTheme.text,
    padding: '10px 16px',
    fontSize: 11,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },
  time: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 12,
    minWidth: 52,
    textAlign: 'center',
  },
  select: {
    ...monoText,
    border: `1px solid ${hudTheme.line}`,
    background: 'rgba(9,14,19,0.72)',
    color: hudTheme.text,
    padding: '8px 10px',
  },
  timelineWrap: {
    position: 'relative',
    padding: '14px 0 2px',
  },
  marker: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 12,
    border: 'none',
    transform: 'translateX(-50%)',
    cursor: 'pointer',
    padding: 0,
  },
  scrubber: {
    width: '100%',
    accentColor: hudTheme.cyan,
  },
};
