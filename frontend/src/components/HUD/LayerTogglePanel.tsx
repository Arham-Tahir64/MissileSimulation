import { LayerVisibilityState } from '../../store/dashboardStore';
import { glassPanel, hudTheme, monoText, sectionTitle } from './hudTheme';

const LAYER_ORDER: Array<{ key: keyof LayerVisibilityState; label: string }> = [
  { key: 'trajectories', label: 'Trajectories' },
  { key: 'impactEffects', label: 'Impact Effects' },
  { key: 'assetOverlays', label: 'Asset Overlays' },
  { key: 'labels', label: 'Labels' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'rangeRings', label: 'Range Rings' },
];

export function LayerTogglePanel({
  layers,
  onToggle,
}: {
  layers: LayerVisibilityState;
  onToggle: (layer: keyof LayerVisibilityState, value: boolean) => void;
}) {
  return (
    <section style={styles.wrap}>
      <div>
        <div style={sectionTitle}>Scene Layers</div>
        <div style={styles.headline}>Runtime rendering controls</div>
      </div>
      <div style={styles.grid}>
        {LAYER_ORDER.map((layer) => (
          <button
            key={layer.key}
            onClick={() => onToggle(layer.key, !layers[layer.key])}
            style={{
              ...styles.toggle,
              background: layers[layer.key] ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.03)',
              color: layers[layer.key] ? hudTheme.cyanSoft : hudTheme.muted,
            }}
          >
            <span>{layer.label}</span>
            <span style={styles.state}>{layers[layer.key] ? 'ON' : 'OFF'}</span>
          </button>
        ))}
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
  },
  headline: {
    color: hudTheme.text,
    fontSize: 18,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    marginTop: 4,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 8,
  },
  toggle: {
    border: 'none',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    cursor: 'pointer',
    fontSize: 12,
    textAlign: 'left',
  },
  state: {
    ...monoText,
    fontSize: 10,
    letterSpacing: '0.16em',
  },
};
