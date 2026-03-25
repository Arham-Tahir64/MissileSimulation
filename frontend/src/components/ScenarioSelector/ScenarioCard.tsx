import { ScenarioMetadata } from '../../types/scenario';
import { hudTheme, monoText } from '../HUD/hudTheme';

interface Props {
  scenario: ScenarioMetadata;
  onSelect: (id: string) => void;
  selected?: boolean;
  loading?: boolean;
  variant?: 'panel' | 'overview';
}

export function ScenarioCard({
  scenario,
  onSelect,
  selected = false,
  loading = false,
  variant = 'panel',
}: Props) {
  const isOverview = variant === 'overview';

  return (
    <button
      onClick={() => onSelect(scenario.id)}
      disabled={loading}
      style={{
        ...styles.card,
        ...(isOverview ? styles.cardOverview : styles.cardPanel),
        background: selected ? 'rgba(0,229,255,0.09)' : 'rgba(255,255,255,0.03)',
        borderColor: selected ? 'rgba(0,229,255,0.36)' : 'rgba(255,255,255,0.08)',
        boxShadow: selected ? 'inset 2px 0 0 #00e5ff' : 'none',
        opacity: loading ? 0.65 : 1,
      }}
    >
      <div style={styles.top}>
        <div>
          <div style={styles.name}>{scenario.name}</div>
          <div style={styles.idRail}>{scenario.id.toUpperCase()}</div>
        </div>
        <div style={styles.loadChip}>{loading ? 'LOADING' : selected ? 'ACTIVE' : 'LOAD'}</div>
      </div>

      <div style={styles.desc}>{scenario.description}</div>

      <div style={styles.metricGrid}>
        <Metric label="Threats" value={String(scenario.threat_count)} />
        <Metric label="Interceptors" value={String(scenario.interceptor_count)} />
        <Metric label="Duration" value={`${Math.round(scenario.duration_s)}S`} />
      </div>

      {scenario.tags.length > 0 && (
        <div style={styles.tags}>
          {scenario.tags.map((tag) => (
            <span key={tag} style={styles.tag}>
              {tag.split('_').join(' ').toUpperCase()}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metric}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    border: '1px solid',
    color: hudTheme.text,
    padding: '16px 16px 14px',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    transition: 'background 160ms ease, border-color 160ms ease, opacity 160ms ease',
  },
  cardPanel: {
    minHeight: 0,
  },
  cardOverview: {
    minHeight: 216,
  },
  top: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  name: {
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 20,
    lineHeight: 1.02,
  },
  idRail: {
    ...monoText,
    color: hudTheme.cyanSoft,
    fontSize: 10,
    letterSpacing: '0.14em',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  loadChip: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 10,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    border: `1px solid ${hudTheme.line}`,
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.02)',
    flexShrink: 0,
  },
  desc: {
    color: hudTheme.muted,
    fontSize: 13,
    lineHeight: 1.6,
    minHeight: 42,
  },
  metricGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 10,
  },
  metric: {
    background: 'rgba(255,255,255,0.03)',
    padding: '10px 10px 8px',
  },
  metricLabel: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },
  metricValue: {
    ...monoText,
    color: hudTheme.text,
    fontSize: 18,
    marginTop: 8,
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    ...monoText,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: hudTheme.amberSoft,
    fontSize: 10,
    padding: '5px 8px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
};
