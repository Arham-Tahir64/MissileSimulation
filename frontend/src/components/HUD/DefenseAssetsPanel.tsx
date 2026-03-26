import { useDeferredValue, useMemo, useState } from 'react';
import { DefenseAssetRow } from './hudSelectors';
import { getDefenseAssetConfigByDesignator } from '../../config/defenseAssets';
import { buttonReset, glassPanel, hudTheme, monoText, sectionTitle } from './hudTheme';

type AssetRoleFilter = 'all' | 'radar' | 'battery';
type AssetStateFilter = 'all' | 'active' | 'ready';

const ASSET_ROLE_FILTERS: Array<{ value: AssetRoleFilter; label: string }> = [
  { value: 'all', label: 'ALL' },
  { value: 'radar', label: 'RADARS' },
  { value: 'battery', label: 'BATTERIES' },
];

const ASSET_STATE_FILTERS: Array<{ value: AssetStateFilter; label: string }> = [
  { value: 'all', label: 'ALL_STATES' },
  { value: 'active', label: 'TRACKING / ENGAGING' },
  { value: 'ready', label: 'READY / IDLE' },
];

export function DefenseAssetsPanel({
  assets,
  selectedAssetId,
  onSelect,
}: {
  assets: DefenseAssetRow[];
  selectedAssetId: string | null;
  onSelect: (assetId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<AssetRoleFilter>('all');
  const [stateFilter, setStateFilter] = useState<AssetStateFilter>('all');
  const deferredQuery = useDeferredValue(query);

  const summary = useMemo(() => ({
    radars: assets.filter((asset) => asset.role === 'radar').length,
    batteries: assets.filter((asset) => asset.role === 'battery').length,
    tracking: assets.filter((asset) => asset.status === 'TRACKING').length,
    engaging: assets.filter((asset) => asset.status === 'ENGAGING').length,
  }), [assets]);

  const filteredAssets = useMemo(() => {
    const value = deferredQuery.trim().toLowerCase();

    return assets.filter((asset) => {
      const matchesQuery = value
        ? `${asset.name} ${asset.label} ${asset.id} ${asset.latestEventLabel ?? ''}`.toLowerCase().includes(value)
        : true;

      const matchesRole = roleFilter === 'all' ? true : asset.role === roleFilter;

      const matchesState =
        stateFilter === 'all'
          ? true
          : stateFilter === 'active'
            ? asset.status === 'TRACKING' || asset.status === 'ENGAGING' || asset.status === 'COOLDOWN'
            : asset.status === 'READY' || asset.status === 'IDLE';

      return matchesQuery && matchesRole && matchesState;
    });
  }, [assets, deferredQuery, roleFilter, stateFilter]);

  const groups = useMemo(() => {
    const radars = filteredAssets.filter((asset) => asset.role === 'radar');
    const batteries = filteredAssets.filter((asset) => asset.role === 'battery');
    return [
      { title: 'Radars', assets: radars, accent: hudTheme.amberSoft },
      { title: 'Batteries', assets: batteries, accent: hudTheme.cyanSoft },
    ].filter((group) => group.assets.length > 0);
  }, [filteredAssets]);

  return (
    <section style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <div style={sectionTitle}>Defense Assets</div>
          <div style={styles.headline}>Inspect fixed sensors and interceptor sites without shifting out of tactical view.</div>
        </div>
        <div style={styles.headerMeta}>
          <span style={styles.headerMetaLabel}>VISIBLE</span>
          <span style={styles.headerMetaValue}>{filteredAssets.length}</span>
        </div>
      </div>

      <div style={styles.summaryRow}>
        <MetricTile label="RADARS" value={summary.radars} tone="amber" />
        <MetricTile label="BATTERIES" value={summary.batteries} tone="cyan" />
        <MetricTile label="TRACKING" value={summary.tracking} tone="amber" />
        <MetricTile label="ENGAGING" value={summary.engaging} tone="cyan" />
      </div>

      <div style={styles.toolbar}>
        <label style={styles.searchWrap}>
          <span style={styles.searchLabel}>SEARCH</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ASSET / DESIGNATOR / EVENT"
            style={styles.input}
          />
        </label>

        <FilterRail
          title="ROLE"
          value={roleFilter}
          onChange={(value) => setRoleFilter(value as AssetRoleFilter)}
          options={ASSET_ROLE_FILTERS}
        />
        <FilterRail
          title="STATE"
          value={stateFilter}
          onChange={(value) => setStateFilter(value as AssetStateFilter)}
          options={ASSET_STATE_FILTERS}
        />
      </div>

      <div style={styles.groupStack}>
        {groups.map((group) => (
          <AssetGroup
            key={group.title}
            title={group.title}
            accent={group.accent}
            assets={group.assets}
            selectedAssetId={selectedAssetId}
            onSelect={onSelect}
          />
        ))}

        {filteredAssets.length === 0 && (
          <div style={styles.empty}>
            <div style={styles.emptyTitle}>No assets match the current filter window.</div>
            <div style={styles.emptyCopy}>Clear the query or broaden the role/state filters to restore the full network.</div>
          </div>
        )}
      </div>
    </section>
  );
}

function AssetGroup({
  title,
  accent,
  assets,
  selectedAssetId,
  onSelect,
}: {
  title: string;
  accent: string;
  assets: DefenseAssetRow[];
  selectedAssetId: string | null;
  onSelect: (assetId: string) => void;
}) {
  return (
    <div style={styles.group}>
      <div style={styles.groupHeader}>
        <div style={{ ...styles.groupTitle, color: accent }}>{title}</div>
        <div style={styles.groupCount}>{assets.length}</div>
      </div>

      <div style={styles.groupList}>
        {assets.map((asset) => {
          const selected = selectedAssetId === asset.id;
          const isRadar = asset.role === 'radar';
          const accentColor = isRadar ? hudTheme.amber : hudTheme.cyan;

          return (
            <button
              key={asset.id}
              onClick={() => onSelect(asset.id)}
              style={{
                ...styles.row,
                background: selected ? 'rgba(255,215,153,0.08)' : 'rgba(255,255,255,0.03)',
                boxShadow: selected ? `inset 2px 0 0 ${accentColor}` : 'none',
              }}
            >
              <div style={styles.rowTop}>
                <div style={styles.rowIdentity}>
                  <span style={styles.rowName}>{asset.name}</span>
                  <span style={{ ...styles.roleChip, color: isRadar ? hudTheme.amberSoft : hudTheme.cyanSoft }}>
                    {isRadar ? 'RADAR' : 'BATTERY'}
                  </span>
                </div>
                <span style={{ ...styles.rowStatus, color: getAssetStatusColor(asset.status) }}>{asset.status}</span>
              </div>

              <div style={styles.rowLabel}>{asset.label}</div>

              <div style={styles.rowMetrics}>
                <MetricPill label="COVERAGE" value={`${asset.rangeKm.toFixed(0)} KM`} tone="text" />
                <MetricPill label={isRadar ? 'TRACKS' : 'TARGET'} value={isRadar ? String(asset.trackCount) : asset.currentTargetId ?? 'READY'} tone={isRadar ? 'amber' : asset.currentTargetId ? 'cyan' : 'muted'} />
                <MetricPill label="STATE" value={asset.readiness} tone={asset.status === 'COOLDOWN' ? 'amber' : 'text'} />
              </div>

              {asset.role === 'battery' && asset.status === 'COOLDOWN' && (() => {
                const cfg     = getDefenseAssetConfigByDesignator(asset.assetState.designator);
                const totalCd = cfg?.cooldownS ?? 20;
                const remaining = asset.assetState.cooldown_remaining_s ?? 0;
                const elapsed   = Math.max(0, totalCd - remaining);
                const pct       = Math.min(100, (elapsed / totalCd) * 100);
                const readySoon = remaining <= 4;
                return (
                  <div style={styles.cooldownBar}>
                    <div style={styles.cooldownTrack}>
                      <div style={{
                        ...styles.cooldownFill,
                        width: `${pct}%`,
                        background: readySoon ? '#00e5ff' : '#b06a00',
                      }} />
                    </div>
                    <span style={{
                      ...styles.cooldownLabel,
                      color: readySoon ? hudTheme.cyanSoft : '#b06a00',
                    }}>
                      {readySoon ? '2ND SHOT READY' : `CD ${remaining.toFixed(1)}S`}
                    </span>
                  </div>
                );
              })()}

              {asset.latestEventLabel && (
                <div style={styles.rowNote}>{asset.latestEventLabel}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'cyan' | 'amber';
}) {
  return (
    <div style={styles.metricTile}>
      <div style={styles.metricLabel}>{label}</div>
      <div
        style={{
          ...styles.metricValue,
          color: tone === 'amber' ? hudTheme.amberSoft : hudTheme.cyanSoft,
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
  tone,
}: {
  label: string;
  value: string;
  tone: 'amber' | 'cyan' | 'muted' | 'text';
}) {
  return (
    <span style={styles.metricPill}>
      <span style={styles.metricPillLabel}>{label}</span>
      <span
        style={{
          ...styles.metricPillValue,
          color:
            tone === 'amber'
              ? hudTheme.amberSoft
              : tone === 'cyan'
                ? hudTheme.cyanSoft
                : tone === 'muted'
                  ? hudTheme.muted
                  : hudTheme.text,
        }}
      >
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
              background: value === option.value ? 'rgba(255,215,153,0.12)' : 'rgba(255,255,255,0.03)',
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function getAssetStatusColor(status: string) {
  if (status === 'ENGAGING') return hudTheme.cyanSoft;
  if (status === 'TRACKING' || status === 'COOLDOWN') return hudTheme.amberSoft;
  return hudTheme.muted;
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
    color: hudTheme.amberSoft,
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
    color: hudTheme.amberSoft,
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
  groupStack: {
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
    padding: '12px 12px 10px',
    cursor: 'pointer',
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
    flexWrap: 'wrap',
    alignItems: 'baseline',
    minWidth: 0,
  },
  rowName: {
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 15,
  },
  roleChip: {
    ...monoText,
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
  cooldownBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  cooldownTrack: {
    flex: 1,
    height: 4,
    background: 'rgba(255,255,255,0.07)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  cooldownFill: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    height: '100%',
    transition: 'width 0.5s linear',
  },
  cooldownLabel: {
    ...monoText,
    fontSize: 9,
    letterSpacing: '0.14em',
    whiteSpace: 'nowrap' as const,
    minWidth: 90,
    textAlign: 'right' as const,
  } as React.CSSProperties,
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
