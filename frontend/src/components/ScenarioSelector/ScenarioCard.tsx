import { ScenarioMetadata } from '../../types/scenario';

interface Props {
  scenario: ScenarioMetadata;
  onSelect: (id: string) => void;
}

export function ScenarioCard({ scenario, onSelect }: Props) {
  return (
    <div style={styles.card} onClick={() => onSelect(scenario.id)}>
      <div style={styles.name}>{scenario.name}</div>
      <div style={styles.desc}>{scenario.description}</div>
      <div style={styles.meta}>
        {scenario.threat_count} threats · {scenario.interceptor_count} interceptors ·{' '}
        {Math.round(scenario.duration_s)}s
      </div>
      <div style={styles.tags}>
        {scenario.tags.map((tag) => (
          <span key={tag} style={styles.tag}>{tag}</span>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '12px 14px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  name: { color: '#e2e8f0', fontWeight: 600, fontSize: 14, marginBottom: 4 },
  desc: { color: '#718096', fontSize: 12, marginBottom: 8, lineHeight: 1.4 },
  meta: { color: '#4a5568', fontSize: 11, marginBottom: 6 },
  tags: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  tag: {
    background: 'rgba(99,179,237,0.15)',
    color: '#63b3ed',
    fontSize: 10,
    padding: '1px 6px',
    borderRadius: 10,
    border: '1px solid rgba(99,179,237,0.25)',
  },
};
