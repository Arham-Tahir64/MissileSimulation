import { DisplayDensity, LayerVisibilityState } from '../../store/dashboardStore';
import { LayerTogglePanel } from '../HUD/LayerTogglePanel';
import { glassPanel, hudTheme, monoText } from '../HUD/hudTheme';

export function SettingsPage({
  layers,
  density,
  reduceMotion,
  onToggleLayer,
  onDensityChange,
  onReduceMotionChange,
}: {
  layers: LayerVisibilityState;
  density: DisplayDensity;
  reduceMotion: boolean;
  onToggleLayer: (layer: keyof LayerVisibilityState, value: boolean) => void;
  onDensityChange: (density: DisplayDensity) => void;
  onReduceMotionChange: (value: boolean) => void;
}) {
  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div style={styles.title}>Settings</div>
        <div style={styles.copy}>
          Low-frequency controls live here so the live monitor can stay clear. Changes persist while you move between pages.
        </div>
      </div>

      <div style={styles.grid}>
        <LayerTogglePanel layers={layers} onToggle={onToggleLayer} />
        <section style={styles.panel}>
          <div style={styles.panelTitle}>Display Density</div>
          <div style={styles.optionList}>
            {(['comfortable', 'compact'] as DisplayDensity[]).map((value) => (
              <button
                key={value}
                onClick={() => onDensityChange(value)}
                style={{
                  ...styles.optionButton,
                  background: density === value ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.03)',
                  color: density === value ? hudTheme.cyanSoft : hudTheme.text,
                }}
              >
                {value.toUpperCase()}
              </button>
            ))}
          </div>
        </section>

        <section style={styles.panel}>
          <div style={styles.panelTitle}>Motion</div>
          <button
            onClick={() => onReduceMotionChange(!reduceMotion)}
            style={{
              ...styles.optionButton,
              background: reduceMotion ? 'rgba(255,215,153,0.12)' : 'rgba(255,255,255,0.03)',
              color: reduceMotion ? hudTheme.amberSoft : hudTheme.text,
            }}
          >
            {reduceMotion ? 'REDUCED_MOTION_ON' : 'REDUCED_MOTION_OFF'}
          </button>
          <div style={styles.note}>
            This currently reduces UI motion emphasis and acts as the product-level preference surface for future scene-motion tuning.
          </div>
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'absolute',
    inset: '96px 20px 24px 20px',
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr)',
    gap: 18,
    pointerEvents: 'auto',
  },
  header: {
    maxWidth: 720,
    pointerEvents: 'auto',
  },
  title: {
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 34,
  },
  copy: {
    color: hudTheme.muted,
    fontSize: 15,
    marginTop: 8,
    lineHeight: 1.7,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.9fr',
    gap: 16,
    pointerEvents: 'auto',
  },
  panel: {
    ...glassPanel,
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  panelTitle: {
    ...monoText,
    color: hudTheme.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    fontSize: 10,
  },
  optionList: {
    display: 'flex',
    gap: 10,
  },
  optionButton: {
    border: 'none',
    background: 'rgba(255,255,255,0.03)',
    color: hudTheme.text,
    padding: '12px 16px',
    cursor: 'pointer',
    letterSpacing: '0.14em',
    fontSize: 11,
  },
  note: {
    color: hudTheme.muted,
    fontSize: 13,
    lineHeight: 1.6,
  },
};
