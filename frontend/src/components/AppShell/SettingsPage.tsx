import { DisplayDensity, ExperimentalGlobeLayerState, LayerVisibilityState } from '../../store/dashboardStore';
import { LayerTogglePanel } from '../HUD/LayerTogglePanel';
import { glassPanel, hudTheme, monoText } from '../HUD/hudTheme';

export function SettingsPage({
  layers,
  experimentalGlobeLayers,
  density,
  reduceMotion,
  onToggleLayer,
  onToggleExperimentalGlobeLayer,
  onDensityChange,
  onReduceMotionChange,
}: {
  layers: LayerVisibilityState;
  experimentalGlobeLayers: ExperimentalGlobeLayerState;
  density: DisplayDensity;
  reduceMotion: boolean;
  onToggleLayer: (layer: keyof LayerVisibilityState, value: boolean) => void;
  onToggleExperimentalGlobeLayer: (layer: keyof ExperimentalGlobeLayerState, value: boolean) => void;
  onDensityChange: (density: DisplayDensity) => void;
  onReduceMotionChange: (value: boolean) => void;
}) {
  const experimentalRows: Array<{
    key: keyof ExperimentalGlobeLayerState;
    label: string;
    note: string;
  }> = [
    { key: 'trackHistory', label: 'Track History Trails', note: 'Fading motion trails behind active tracks.' },
    { key: 'bdaMarkers', label: 'BDA Markers', note: 'Persistent intercept and miss markers on the globe.' },
    { key: 'radarSweeps', label: 'Radar Sweeps', note: 'Animated sensor sweep wedges around radar sites.' },
    { key: 'saturationHighlights', label: 'Saturation Highlights', note: 'Pulsing rings for uncovered active threats.' },
    { key: 'reentryFootprints', label: 'Re-entry Footprints', note: 'Projected ballistic impact ellipses on the surface.' },
    { key: 'jammingZones', label: 'ECM Jamming Zones', note: 'Pulsing interference domes for jammer assets.' },
    { key: 'taskingLines', label: 'Tasking Lines', note: 'Temporary radar-to-threat and battery-to-shot links.' },
    { key: 'missileExhaust', label: 'Missile Exhaust', note: 'Lightweight plume sprites behind active missiles.' },
    { key: 'advancedLighting', label: 'Advanced Lighting', note: 'Experimental sun/day-night lighting in the viewer.' },
  ];

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

        <section style={styles.panel}>
          <div style={styles.panelTitle}>Experimental Globe Rollout</div>
          <div style={styles.note}>
            These toggles keep high-risk globe features isolated so they can be reintroduced one by one without destabilizing Monitor, Replay, or Globe View.
          </div>
          <div style={styles.experimentalList}>
            {experimentalRows.map((row) => {
              const enabled = experimentalGlobeLayers[row.key];
              return (
                <button
                  key={row.key}
                  onClick={() => onToggleExperimentalGlobeLayer(row.key, !enabled)}
                  style={{
                    ...styles.experimentalRow,
                    borderColor: enabled ? 'rgba(0,229,255,0.42)' : hudTheme.line,
                    background: enabled ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div>
                    <div style={{ ...styles.experimentalTitle, color: enabled ? hudTheme.cyanSoft : hudTheme.text }}>
                      {row.label}
                    </div>
                    <div style={styles.experimentalNote}>{row.note}</div>
                  </div>
                  <div style={{ ...styles.experimentalState, color: enabled ? hudTheme.cyanSoft : hudTheme.muted }}>
                    {enabled ? 'ON' : 'OFF'}
                  </div>
                </button>
              );
            })}
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
  experimentalList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  experimentalRow: {
    border: `1px solid ${hudTheme.line}`,
    background: 'rgba(255,255,255,0.02)',
    color: hudTheme.text,
    padding: '12px 14px',
    cursor: 'pointer',
    display: 'grid',
    gridTemplateColumns: 'minmax(0,1fr) auto',
    alignItems: 'center',
    gap: 14,
    textAlign: 'left',
  },
  experimentalTitle: {
    fontSize: 13,
    letterSpacing: '0.04em',
    marginBottom: 4,
  },
  experimentalNote: {
    color: hudTheme.muted,
    fontSize: 12,
    lineHeight: 1.5,
  },
  experimentalState: {
    ...monoText,
    fontSize: 11,
    letterSpacing: '0.16em',
  },
  note: {
    color: hudTheme.muted,
    fontSize: 13,
    lineHeight: 1.6,
  },
};
