import { MISSILE_TYPE_CONFIGS, MissileTypeConfig } from '../../config/missileTypes';
import { DEFENSE_ASSET_CONFIGS, DefenseAssetConfig } from '../../config/defenseAssets';
import { usePlacementStore, PlacementPhase } from '../../store/placementStore';
import { EntityType } from '../../types/entity';

/** Floating panel — lets the user build missile launches and defense asset placements. */
export function MissileTypePicker() {
  const {
    phase,
    missileType,
    assetId,
    placements,
    selectType,
    selectAsset,
    clearCurrent,
    reset,
  } = usePlacementStore();

  const isDisabled = phase === 'simulating';
  const missileCount = placements.filter((placement) => placement.kind === 'missile').length;
  const assetCount = placements.filter((placement) => placement.kind === 'asset').length;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={styles.title}>Scenario Builder</span>
          {placements.length > 0 && (
            <span style={styles.queueCount}>
              Queue: {placements.length} // {missileCount} launches // {assetCount} assets
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {phase !== 'idle' && !isDisabled && (
            <button onClick={clearCurrent} style={styles.cancelBtn}>Cancel Current</button>
          )}
          {placements.length > 0 && !isDisabled && (
            <button onClick={reset} style={styles.cancelBtn}>Reset All</button>
          )}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>Missile Launches</div>
        <div style={styles.list}>
          {MISSILE_TYPE_CONFIGS.map((cfg) => (
            <MissileCard
              key={cfg.type}
              config={cfg}
              selected={missileType === cfg.type && phase !== 'placing_asset'}
              disabled={isDisabled}
              onSelect={selectType}
            />
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>Defense Assets</div>
        <div style={styles.list}>
          {DEFENSE_ASSET_CONFIGS.map((cfg) => (
            <AssetCard
              key={cfg.id}
              config={cfg}
              selected={assetId === cfg.id && phase === 'placing_asset'}
              disabled={isDisabled}
              onSelect={selectAsset}
            />
          ))}
        </div>
      </div>

      <InstructionHint phase={phase} />
    </div>
  );
}

interface MissileCardProps {
  config: MissileTypeConfig;
  selected: boolean;
  disabled: boolean;
  onSelect: (type: EntityType) => void;
}

function MissileCard({ config, selected, disabled, onSelect }: MissileCardProps) {
  const handleClick = () => {
    if (!disabled) onSelect(config.type);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      style={{
        ...styles.card,
        borderColor: selected ? config.cssColor : 'rgba(255,255,255,0.1)',
        background: selected ? `${config.cssColor}18` : 'rgba(255,255,255,0.03)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={styles.cardTop}>
        <span style={{ ...styles.cardLabel, color: config.cssColor }}>{config.label}</span>
        <span style={styles.badge}>{config.shortLabel}</span>
      </div>
      <div style={styles.cardDesc}>{config.description}</div>
      <div style={styles.cardMeta}>
        <span>{(config.maxRangeM / 1_000_000).toFixed(1)} Mm</span>
        <span>{config.speedMs} m/s</span>
      </div>
    </button>
  );
}

interface AssetCardProps {
  config: DefenseAssetConfig;
  selected: boolean;
  disabled: boolean;
  onSelect: (assetId: DefenseAssetConfig['id']) => void;
}

function AssetCard({ config, selected, disabled, onSelect }: AssetCardProps) {
  const handleClick = () => {
    if (!disabled) onSelect(config.id);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      style={{
        ...styles.card,
        borderColor: selected ? config.cssColor : 'rgba(255,255,255,0.1)',
        background: selected ? `${config.cssColor}16` : 'rgba(255,255,255,0.03)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={styles.cardTop}>
        <span style={{ ...styles.cardLabel, color: config.cssColor }}>{config.label}</span>
        <span style={styles.badge}>{config.shortLabel}</span>
      </div>
      <div style={styles.cardDesc}>{config.description}</div>
      <div style={styles.cardMeta}>
        <span>{config.entityType === 'sensor' ? 'Radar' : 'Interceptor'}</span>
        <span>1-click place</span>
      </div>
    </button>
  );
}

function InstructionHint({ phase }: { phase: PlacementPhase }) {
  const text: Record<PlacementPhase, string> = {
    idle: 'Select a launch track or defense asset',
    placing_origin: '1 Click globe to set launch origin',
    origin_set: '2 Click within radius to set target',
    placing_asset: '1 Click globe to place the selected asset',
    target_set: 'Queue this missile or launch the scenario',
    simulating: 'Simulation running',
  };

  return (
    <div style={styles.hint}>
      <span style={styles.hintDot} />
      {text[phase]}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 300,
    background: 'rgba(8,8,18,0.88)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    userSelect: 'none',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  title: {
    color: '#e2e8f0',
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  cancelBtn: {
    background: 'none',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#a0aec0',
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 11,
    cursor: 'pointer',
  },
  queueCount: {
    color: '#63b3ed',
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  sectionLabel: {
    color: '#7f94a3',
    fontSize: 10,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  card: {
    textAlign: 'left',
    border: '1px solid',
    borderRadius: 7,
    padding: '9px 11px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    transition: 'border-color 0.15s, background 0.15s',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontWeight: 600,
    fontSize: 13,
  },
  badge: {
    fontSize: 10,
    color: '#718096',
    fontFamily: 'monospace',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 3,
    padding: '1px 5px',
  },
  cardDesc: {
    fontSize: 11,
    color: '#718096',
  },
  cardMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10,
    color: '#4a5568',
    fontFamily: 'monospace',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  hint: {
    marginTop: 2,
    fontSize: 11,
    color: '#63b3ed',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'monospace',
  },
  hintDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#63b3ed',
    flexShrink: 0,
  },
};
