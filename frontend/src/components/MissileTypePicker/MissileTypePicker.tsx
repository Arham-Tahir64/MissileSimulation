import { MISSILE_TYPE_CONFIGS, MissileTypeConfig } from '../../config/missileTypes';
import { DEFENSE_ASSET_CONFIGS, DefenseAssetConfig } from '../../config/defenseAssets';
import {
  usePlacementStore,
  PlacementPhase,
  BarrageLaunchTimingMode,
  countPlacementAssets,
  countPlacementLaunches,
} from '../../store/placementStore';
import { EntityType } from '../../types/entity';

/** Floating panel — lets the user build missile launches and defense asset placements. */
export function MissileTypePicker() {
  const {
    phase,
    missileType,
    assetId,
    barrageMissileType,
    barrageLaunchRadiusKm,
    barrageTargetRadiusKm,
    barrageCount,
    barrageSeed,
    barrageLaunchTimingMode,
    barrageLaunchWindowS,
    barrageLaunchTimeS,
    addCurrentBarragePlacement,
    placements,
    selectType,
    selectBarrageType,
    selectAsset,
    setBarrageLaunchRadiusKm,
    setBarrageTargetRadiusKm,
    setBarrageCount,
    setBarrageSeed,
    regenerateBarrageSeed,
    setBarrageLaunchTimingMode,
    setBarrageLaunchWindowS,
    setBarrageLaunchTimeS,
    clearCurrent,
    reset,
  } = usePlacementStore();

  const isDisabled = phase === 'simulating';
  const missileCount = countPlacementLaunches(placements);
  const assetCount = countPlacementAssets(placements);
  const barrageModes = phase === 'placing_barrage_origin' || phase === 'barrage_origin_set' || phase === 'barrage_target_set';
  const barrageReady = phase === 'barrage_target_set';

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
        <div style={styles.sectionLabel}>Randomized Barrages</div>
        <div style={styles.list}>
          {MISSILE_TYPE_CONFIGS.filter((cfg) => cfg.type !== 'interceptor').map((cfg) => (
            <BarrageCard
              key={`barrage-${cfg.type}`}
              config={cfg}
              selected={barrageMissileType === cfg.type && barrageModes}
              disabled={isDisabled}
              onSelect={selectBarrageType}
            />
          ))}
        </div>
      </div>

      {barrageModes && barrageMissileType && (
        <div style={styles.controls}>
          <div style={styles.controlHeader}>
            <span style={styles.controlTitle}>Barrage Controls</span>
            <button onClick={regenerateBarrageSeed} style={styles.seedButton} disabled={isDisabled}>
              New Seed
            </button>
          </div>

          <div style={styles.controlGrid}>
            <ControlField
              label="Launch Radius"
              value={barrageLaunchRadiusKm}
              min={5}
              max={500}
              suffix="km"
              disabled={isDisabled}
              onChange={setBarrageLaunchRadiusKm}
            />
            <ControlField
              label="Target Radius"
              value={barrageTargetRadiusKm}
              min={5}
              max={500}
              suffix="km"
              disabled={isDisabled}
              onChange={setBarrageTargetRadiusKm}
            />
            <ControlField
              label="Missiles"
              value={barrageCount}
              min={1}
              max={48}
              disabled={isDisabled}
              onChange={setBarrageCount}
            />
            <ControlField
              label="Start Delay"
              value={barrageLaunchTimeS}
              min={0}
              max={600}
              suffix="s"
              disabled={isDisabled}
              onChange={setBarrageLaunchTimeS}
            />
            <label style={styles.controlField}>
              <span style={styles.controlLabel}>Timing Mode</span>
              <select
                value={barrageLaunchTimingMode}
                onChange={(e) => setBarrageLaunchTimingMode(e.target.value as BarrageLaunchTimingMode)}
                disabled={isDisabled}
                style={styles.select}
              >
                <option value="simultaneous">Simultaneous</option>
                <option value="staggered">Staggered</option>
                <option value="random_window">Random Window</option>
              </select>
            </label>
            <ControlField
              label="Launch Window"
              value={barrageLaunchWindowS}
              min={0}
              max={300}
              suffix="s"
              disabled={isDisabled}
              onChange={setBarrageLaunchWindowS}
            />
          </div>

          <label style={styles.controlField}>
            <span style={styles.controlLabel}>Seed</span>
            <input
              type="text"
              value={barrageSeed}
              onChange={(e) => setBarrageSeed(e.target.value)}
              maxLength={32}
              disabled={isDisabled}
              style={styles.input}
            />
          </label>

          <div style={styles.barrageActions}>
            <div style={styles.barrageHint}>
              {barrageReady
                ? 'Queue the barrage here, then launch the full scenario from the queue panel.'
                : 'Select launch-area and target-area centers on the globe to unlock barrage queueing.'}
            </div>
            <button
              onClick={addCurrentBarragePlacement}
              disabled={!barrageReady || isDisabled}
              style={{
                ...styles.queueBarrageBtn,
                opacity: !barrageReady || isDisabled ? 0.45 : 1,
                cursor: !barrageReady || isDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              QUEUE_BARRAGE
            </button>
          </div>
        </div>
      )}

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

interface BarrageCardProps {
  config: MissileTypeConfig;
  selected: boolean;
  disabled: boolean;
  onSelect: (type: Exclude<EntityType, 'sensor' | 'interceptor'>) => void;
}

function BarrageCard({ config, selected, disabled, onSelect }: BarrageCardProps) {
  const handleClick = () => {
    if (!disabled && config.type !== 'interceptor' && config.type !== 'sensor') {
      onSelect(config.type);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      style={{
        ...styles.card,
        borderColor: selected ? config.cssColor : 'rgba(255,255,255,0.1)',
        background: selected ? `${config.cssColor}14` : 'rgba(255,255,255,0.025)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={styles.cardTop}>
        <span style={{ ...styles.cardLabel, color: config.cssColor }}>{config.label} Barrage</span>
        <span style={styles.badge}>AREA</span>
      </div>
      <div style={styles.cardDesc}>Randomized launch and impact areas compiled into deterministic tracks.</div>
      <div style={styles.cardMeta}>
        <span>seeded</span>
        <span>group authoring</span>
      </div>
    </button>
  );
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
    placing_barrage_origin: '1 Click globe to set barrage launch-area center',
    barrage_origin_set: '2 Click globe to set barrage target-area center',
    barrage_target_set: 'Queue this barrage or refine its controls',
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

function ControlField({
  label,
  value,
  min,
  max,
  suffix,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label style={styles.controlField}>
      <span style={styles.controlLabel}>{label}</span>
      <div style={styles.controlInputRow}>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          style={styles.range}
        />
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          style={styles.numericInput}
        />
        {suffix && <span style={styles.suffix}>{suffix}</span>}
      </div>
    </label>
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
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '10px 12px',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.03)',
  },
  controlHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  controlTitle: {
    color: '#d6e3f0',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  seedButton: {
    background: 'none',
    border: '1px solid rgba(99,179,237,0.35)',
    color: '#63b3ed',
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: 10,
    fontFamily: 'monospace',
    cursor: 'pointer',
  },
  controlGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  controlField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  controlLabel: {
    color: '#7f94a3',
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  controlInputRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 58px auto',
    alignItems: 'center',
    gap: 6,
  },
  range: {
    accentColor: '#63b3ed',
  },
  numericInput: {
    width: '100%',
    background: 'rgba(10,14,20,0.92)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#e2e8f0',
    borderRadius: 4,
    padding: '6px 7px',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  input: {
    width: '100%',
    background: 'rgba(10,14,20,0.92)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#e2e8f0',
    borderRadius: 4,
    padding: '7px 8px',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  select: {
    width: '100%',
    background: 'rgba(10,14,20,0.92)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#e2e8f0',
    borderRadius: 4,
    padding: '7px 8px',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  suffix: {
    color: '#7f94a3',
    fontSize: 10,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
  },
  barrageActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 2,
  },
  barrageHint: {
    color: '#7f94a3',
    fontSize: 10,
    lineHeight: 1.5,
  },
  queueBarrageBtn: {
    width: '100%',
    background: '#00d2eb',
    border: 'none',
    color: '#081014',
    borderRadius: 6,
    padding: '10px 12px',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.12em',
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
