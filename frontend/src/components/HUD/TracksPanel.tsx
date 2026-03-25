import { useDeferredValue, useMemo, useState } from 'react';
import { TrackRow } from './hudSelectors';
import { buttonReset, glassPanel, hudTheme, monoText, sectionTitle } from './hudTheme';

type TrackKindFilter = 'all' | 'threats' | 'interceptors';
type TrackStateFilter = 'all' | 'active' | 'resolved';

const TRACK_KIND_FILTERS: Array<{ value: TrackKindFilter; label: string }> = [
  { value: 'all', label: 'ALL' },
  { value: 'threats', label: 'THREATS' },
  { value: 'interceptors', label: 'INTERCEPTORS' },
];

const TRACK_STATE_FILTERS: Array<{ value: TrackStateFilter; label: string }> = [
  { value: 'all', label: 'ALL_STATES' },
  { value: 'active', label: 'ACTIVE' },
  { value: 'resolved', label: 'RESOLVED' },
];

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
  const [kindFilter, setKindFilter] = useState<TrackKindFilter>('all');
  const [stateFilter, setStateFilter] = useState<TrackStateFilter>('all');
  const deferredQuery = useDeferredValue(query);

  const summary = useMemo(() => ({
    active: tracks.filter((track) => track.status === 'active').length,
    resolved: tracks.filter((track) => track.status !== 'active').length,
    threats: tracks.filter((track) => track.type !== 'interceptor').length,
    interceptors: tracks.filter((track) => track.type === 'interceptor').length,
  }), [tracks]);

  const filteredTracks = useMemo(() => {
    const value = deferredQuery.trim().toLowerCase();

    return tracks.filter((track) => {
      const matchesQuery = value
        ? `${track.name} ${track.label} ${track.id} ${track.latestEventLabel ?? ''}`.toLowerCase().includes(value)
        : true;

      const matchesKind =
        kindFilter === 'all'
          ? true
          : kindFilter === 'threats'
            ? track.type !== 'interceptor'
            : track.type === 'interceptor';

      const matchesState =
        stateFilter === 'all'
          ? true
          : stateFilter === 'active'
            ? track.status === 'active'
            : track.status !== 'active';

      return matchesQuery && matchesKind && matchesState;
    });
  }, [deferredQuery, kindFilter, stateFilter, tracks]);

  const groupedTracks = useMemo(() => {
    const active = filteredTracks.filter((track) => track.status === 'active');
    const standby = filteredTracks.filter((track) => track.status === 'inactive');
    const resolved = filteredTracks.filter((track) => track.status !== 'active' && track.status !== 'inactive');

    return [
      { title: 'Active Tracks', tone: 'cyan' as const, tracks: active },
      { title: 'Standby / Prelaunch', tone: 'amber' as const, tracks: standby },
      { title: 'Resolved', tone: 'muted' as const, tracks: resolved },
    ].filter((group) => group.tracks.length > 0);
  }, [filteredTracks]);

  return (
    <section style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <div style={sectionTitle}>Flight Tracks</div>
          <div style={styles.headline}>Scan threats and interceptors without losing the active scene.</div>
        </div>
        <div style={styles.headerMeta}>
          <span style={styles.headerMetaLabel}>VISIBLE</span>
          <span style={styles.headerMetaValue}>{filteredTracks.length}</span>
        </div>
      </div>

      <div style={styles.summaryRow}>
        <MetricTile label="ACTIVE" value={summary.active} tone="cyan" />
        <MetricTile label="RESOLVED" value={summary.resolved} tone="amber" />
        <MetricTile label="THREATS" value={summary.threats} tone="red" />
        <MetricTile label="INTERCEPTORS" value={summary.interceptors} tone="cyan" />
      </div>

      <div style={styles.toolbar}>
        <label style={styles.searchWrap}>
          <span style={styles.searchLabel}>SEARCH</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="TRACK_ID / EVENT / LABEL"
            style={styles.input}
          />
        </label>

        <FilterRail
          title="TYPE"
          value={kindFilter}
          onChange={(value) => setKindFilter(value as TrackKindFilter)}
          options={TRACK_KIND_FILTERS}
        />
        <FilterRail
          title="STATE"
          value={stateFilter}
          onChange={(value) => setStateFilter(value as TrackStateFilter)}
          options={TRACK_STATE_FILTERS}
        />
      </div>

      <div style={styles.list}>
        {groupedTracks.map((group) => (
          <div key={group.title} style={styles.group}>
            <div style={styles.groupHeader}>
              <span
                style={{
                  ...styles.groupTitle,
                  color:
                    group.tone === 'cyan'
                      ? hudTheme.cyanSoft
                      : group.tone === 'amber'
                        ? hudTheme.amberSoft
                        : hudTheme.muted,
                }}
              >
                {group.title}
              </span>
              <span style={styles.groupCount}>{group.tracks.length}</span>
            </div>

            <div style={styles.groupList}>
              {group.tracks.map((track) => {
                const selected = selectedTrackId === track.id;
                const tone = getTrackTone(track);
                const mach = track.velocityMs / 343;
                const statusText = formatTrackStatus(track.status);

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
                    <div style={styles.rowSignalColumn}>
                      <span
                        style={{
                          ...styles.signal,
                          background:
                            tone === 'red'
                              ? hudTheme.red
                              : tone === 'amber'
                                ? hudTheme.amber
                                : hudTheme.cyan,
                        }}
                      />
                    </div>

                    <div style={styles.rowBody}>
                      <div style={styles.rowTop}>
                        <div style={styles.rowIdentity}>
                          <span style={styles.rowName}>{track.name}</span>
                          <span style={styles.rowType}>
                            {track.type === 'interceptor' ? 'INTERCEPTOR' : 'THREAT'}
                          </span>
                        </div>

                        <span
                          style={{
                            ...styles.rowStatus,
                            color:
                              track.status === 'active'
                                ? hudTheme.cyanSoft
                                : track.status === 'inactive'
                                  ? hudTheme.amberSoft
                                  : hudTheme.muted,
                          }}
                        >
                          {statusText}
                        </span>
                      </div>

                      <div style={styles.rowLabel}>{track.label}</div>

                      <div style={styles.rowMetrics}>
                        <MetricPill label="ALT" value={`${track.altitudeFt.toLocaleString(undefined, { maximumFractionDigits: 0 })} FT`} />
                        <MetricPill label="VEL" value={`${mach.toFixed(1)} MACH`} />
                        <MetricPill label="TARGET" value={track.targetId ?? 'UNASSIGNED'} tone={track.targetId ? 'cyan' : 'muted'} />
                      </div>

                      {track.latestEventLabel && (
                        <div style={styles.rowNote}>{track.latestEventLabel}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {filteredTracks.length === 0 && (
          <div style={styles.empty}>
            <div style={styles.emptyTitle}>No tracks in the current filter window.</div>
            <div style={styles.emptyCopy}>Try clearing the search term or widening the type/state filters.</div>
          </div>
        )}
      </div>
    </section>
  );
}

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'cyan' | 'amber' | 'red';
}) {
  return (
    <div style={styles.metricTile}>
      <div style={styles.metricLabel}>{label}</div>
      <div
        style={{
          ...styles.metricValue,
          color:
            tone === 'amber'
              ? hudTheme.amberSoft
              : tone === 'red'
                ? hudTheme.redSoft
                : hudTheme.cyanSoft,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MetricPill({
  label,
  value,
  tone = 'muted',
}: {
  label: string;
  value: string;
  tone?: 'cyan' | 'muted';
}) {
  return (
    <span style={styles.metricPill}>
      <span style={styles.metricPillLabel}>{label}</span>
      <span style={{ ...styles.metricPillValue, color: tone === 'cyan' ? hudTheme.cyanSoft : hudTheme.text }}>
        {value}
      </span>
    </span>
  );
}

function FilterRail({
  title,
  value,
  onChange,
  options,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div style={styles.filterRail}>
      <div style={styles.filterTitle}>{title}</div>
      <div style={styles.filterList}>
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            style={{
              ...buttonReset,
              ...styles.filterChip,
              color: value === option.value ? hudTheme.text : hudTheme.muted,
              background: value === option.value ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.03)',
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function getTrackTone(track: TrackRow): 'cyan' | 'amber' | 'red' {
  if (track.type !== 'interceptor') return 'red';
  if (track.status === 'inactive') return 'amber';
  return 'cyan';
}

function formatTrackStatus(status: TrackRow['status']) {
  switch (status) {
    case 'intercepted':
      return 'INTERCEPTED';
    case 'destroyed':
      return 'DESTROYED';
    case 'missed':
      return 'MISSED';
    default:
      return status.toUpperCase();
  }
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
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  headline: {
    color: hudTheme.text,
    fontSize: 16,
    lineHeight: 1.35,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    marginTop: 4,
    maxWidth: 212,
  },
  headerMeta: {
    minWidth: 70,
    textAlign: 'right',
  },
  headerMetaLabel: {
    ...sectionTitle,
  },
  headerMetaValue: {
    ...monoText,
    color: hudTheme.cyanSoft,
    fontSize: 28,
    lineHeight: 1,
    marginTop: 6,
  },
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 8,
  },
  metricTile: {
    background: 'rgba(255,255,255,0.03)',
    padding: '10px 10px 9px',
    minWidth: 0,
  },
  metricLabel: {
    ...sectionTitle,
    color: hudTheme.faint,
  },
  metricValue: {
    ...monoText,
    fontSize: 24,
    lineHeight: 1,
    marginTop: 6,
  },
  toolbar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingTop: 2,
  },
  searchWrap: {
    display: 'block',
  },
  searchLabel: {
    ...sectionTitle,
    display: 'block',
    marginBottom: 6,
  },
  input: {
    ...monoText,
    width: '100%',
    border: 'none',
    borderBottom: `1px solid ${hudTheme.line}`,
    background: 'transparent',
    color: hudTheme.cyanSoft,
    padding: '8px 0',
    outline: 'none',
    fontSize: 11,
    letterSpacing: '0.12em',
  },
  filterRail: {
    display: 'grid',
    gridTemplateColumns: '58px minmax(0, 1fr)',
    gap: 8,
    alignItems: 'start',
  },
  filterTitle: {
    ...sectionTitle,
    paddingTop: 8,
  },
  filterList: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterChip: {
    ...monoText,
    border: `1px solid ${hudTheme.lineSoft}`,
    padding: '7px 8px',
    fontSize: 10,
    letterSpacing: '0.12em',
    cursor: 'pointer',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflowY: 'auto',
    minHeight: 0,
    paddingRight: 4,
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  groupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
  },
  groupTitle: {
    ...sectionTitle,
    fontSize: 11,
  },
  groupCount: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 11,
  },
  groupList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  row: {
    border: 'none',
    textAlign: 'left',
    color: hudTheme.text,
    padding: '12px 12px 10px 10px',
    cursor: 'pointer',
    display: 'grid',
    gridTemplateColumns: '10px minmax(0, 1fr)',
    gap: 10,
    alignItems: 'stretch',
  },
  rowSignalColumn: {
    display: 'flex',
    justifyContent: 'center',
  },
  signal: {
    width: 4,
    minHeight: '100%',
  },
  rowBody: {
    minWidth: 0,
  },
  rowTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'baseline',
  },
  rowIdentity: {
    display: 'flex',
    gap: 8,
    alignItems: 'baseline',
    minWidth: 0,
    flexWrap: 'wrap',
  },
  rowName: {
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 15,
  },
  rowType: {
    ...monoText,
    color: hudTheme.faint,
    fontSize: 10,
    letterSpacing: '0.14em',
  },
  rowStatus: {
    ...monoText,
    fontSize: 10,
    letterSpacing: '0.14em',
    textAlign: 'right',
  },
  rowLabel: {
    color: hudTheme.muted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 1.45,
  },
  rowMetrics: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  metricPill: {
    display: 'inline-flex',
    gap: 6,
    alignItems: 'baseline',
    background: 'rgba(255,255,255,0.03)',
    padding: '5px 7px',
  },
  metricPillLabel: {
    ...sectionTitle,
    color: hudTheme.faint,
    fontSize: 9,
  },
  metricPillValue: {
    ...monoText,
    fontSize: 10,
  },
  rowNote: {
    color: hudTheme.faint,
    fontSize: 11,
    marginTop: 8,
    lineHeight: 1.45,
  },
  empty: {
    background: 'rgba(255,255,255,0.03)',
    padding: '14px 12px',
  },
  emptyTitle: {
    color: hudTheme.text,
    fontSize: 13,
  },
  emptyCopy: {
    color: hudTheme.muted,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 1.5,
  },
};
