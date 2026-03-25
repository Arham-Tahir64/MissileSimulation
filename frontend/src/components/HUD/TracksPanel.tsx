import { useDeferredValue, useMemo, useState } from 'react';
import { TrackRow } from './hudSelectors';
import { glassPanel, hudTheme, monoText, sectionTitle } from './hudTheme';

export function TracksPanel({
  tracks,
  selectedTrackId,
  onSelect,
}: {
  tracks: TrackRow[];
  selectedTrackId: string | null;
  onSelect: (trackId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const filteredTracks = useMemo(() => {
    const value = deferredQuery.trim().toLowerCase();
    if (!value) return tracks;
    return tracks.filter((track) =>
      `${track.name} ${track.label} ${track.id}`.toLowerCase().includes(value),
    );
  }, [deferredQuery, tracks]);

  return (
    <section style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <div style={sectionTitle}>Tracks</div>
          <div style={styles.headline}>{tracks.length} live routes</div>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SEARCH_TRACK"
          style={styles.input}
        />
      </div>

      <div style={styles.list}>
        {filteredTracks.map((track) => {
          const selected = selectedTrackId === track.id;
          return (
            <button
              key={track.id}
              onClick={() => onSelect(track.id)}
              style={{
                ...styles.row,
                background: selected ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.03)',
                boxShadow: selected ? 'inset 2px 0 0 #00e5ff' : 'none',
              }}
            >
              <div style={styles.rowTop}>
                <span style={styles.rowName}>{track.name}</span>
                <span style={{
                  ...styles.rowStatus,
                  color:
                    track.status === 'active'
                      ? hudTheme.cyanSoft
                      : track.status === 'inactive'
                        ? hudTheme.muted
                        : hudTheme.amberSoft,
                }}
                >
                  {track.status.toUpperCase()}
                </span>
              </div>
              <div style={styles.rowMeta}>
                <span>{track.label}</span>
                <span>{(track.altitudeFt).toLocaleString(undefined, { maximumFractionDigits: 0 })} FT</span>
                <span>{(track.velocityMs / 343).toFixed(1)} MACH</span>
              </div>
              {track.latestEventLabel && (
                <div style={styles.rowNote}>{track.latestEventLabel}</div>
              )}
            </button>
          );
        })}

        {filteredTracks.length === 0 && (
          <div style={styles.empty}>No tracks match the current filter.</div>
        )}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    ...glassPanel,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minHeight: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'end',
    justifyContent: 'space-between',
    gap: 12,
  },
  headline: {
    color: hudTheme.text,
    fontSize: 18,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    marginTop: 4,
  },
  input: {
    ...monoText,
    width: 132,
    border: 'none',
    borderBottom: `1px solid ${hudTheme.line}`,
    background: 'transparent',
    color: hudTheme.cyanSoft,
    padding: '6px 0',
    outline: 'none',
    fontSize: 11,
    letterSpacing: '0.12em',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    overflowY: 'auto',
    minHeight: 0,
    paddingRight: 4,
  },
  row: {
    border: 'none',
    textAlign: 'left',
    color: hudTheme.text,
    padding: '12px 12px 10px',
    cursor: 'pointer',
  },
  rowTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'baseline',
  },
  rowName: {
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 15,
  },
  rowStatus: {
    ...monoText,
    fontSize: 10,
    letterSpacing: '0.14em',
  },
  rowMeta: {
    ...monoText,
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    color: hudTheme.muted,
    fontSize: 10,
    marginTop: 5,
    letterSpacing: '0.08em',
  },
  rowNote: {
    color: hudTheme.faint,
    fontSize: 11,
    marginTop: 7,
  },
  empty: {
    color: hudTheme.muted,
    fontSize: 12,
    padding: '12px 0',
  },
};
