import { MISSILE_TYPE_CONFIGS, MissileTypeConfig } from '../../config/missileTypes';
import { usePlacementStore, PlacementPhase } from '../../store/placementStore';
import { EntityType } from '../../types/entity';

/** Floating panel — lets the user pick a missile type to begin placement. */
export function MissileTypePicker() {
  const { phase, missileType, selectType, reset } = usePlacementStore();

  const isDisabled = phase === 'simulating';

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Missile Type</span>
        {phase !== 'idle' && !isDisabled && (
          <button onClick={reset} style={styles.cancelBtn}>✕ Cancel</button>
        )}
      </div>

      <div style={styles.list}>
        {MISSILE_TYPE_CONFIGS.map((cfg) => (
          <TypeCard
            key={cfg.type}
            config={cfg}
            selected={missileType === cfg.type}
            disabled={isDisabled}
            onSelect={selectType}
          />
        ))}
      </div>

      <InstructionHint phase={phase} />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

interface TypeCardProps {
  config: MissileTypeConfig;
  selected: boolean;
  disabled: boolean;
  onSelect: (type: EntityType) => void;
}

function TypeCard({ config, selected, disabled, onSelect }: TypeCardProps) {
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
        background: selected
          ? `${config.cssColor}18`
          : 'rgba(255,255,255,0.03)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ ...styles.cardLabel, color: config.cssColor }}>
          {config.label}
        </span>
        <span style={styles.badge}>{config.shortLabel}</span>
      </div>
      <div style={styles.cardDesc}>{config.description}</div>
      <div style={styles.cardMeta}>
        <span>⌀ {(config.maxRangeM / 1_000_000).toFixed(0)} 000 km range</span>
        <span>{config.speedMs} m/s</span>
      </div>
    </button>
  );
}

function InstructionHint({ phase }: { phase: PlacementPhase }) {
  const text: Record<PlacementPhase, string> = {
    idle:            'Select a type to begin',
    placing_origin:  '① Click globe — set launch origin',
    origin_set:      '② Click within radius — set target',
    target_set:      '③ Click LAUNCH to begin simulation',
    simulating:      'Simulation running…',
  };

  return (
    <div style={styles.hint}>
      <span style={styles.hintDot} />
      {text[phase]}
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 260,
    background: 'rgba(8,8,18,0.88)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    userSelect: 'none',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
