import { useRef } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { hudTheme, monoText, sectionTitle } from './hudTheme';
import { AssetStatus } from '../../types/entity';
import { getDefenseAssetConfigByDesignator } from '../../config/defenseAssets';

/** Rolling window width in seconds shown in the chart. */
const WINDOW_S = 60;

interface StatusSample {
  timeS:  number;
  status: AssetStatus;
}

interface BatteryHistory {
  id:      string;
  name:    string;
  samples: StatusSample[];
}

function statusColor(status: AssetStatus): string {
  switch (status) {
    case 'engaging':  return hudTheme.cyan;
    case 'tracking':  return hudTheme.amber;
    case 'cooldown':  return '#b06a00';
    default:          return 'rgba(255,255,255,0.06)';
  }
}

function statusLabel(status: AssetStatus): string {
  switch (status) {
    case 'engaging':  return 'ENG';
    case 'tracking':  return 'TRK';
    case 'cooldown':  return 'CD';
    default:          return '—';
  }
}

/**
 * Horizontal Gantt-style timeline showing each battery's state over the last 60 seconds.
 * idle = dark, tracking = amber, engaging = cyan, cooldown = burnt amber.
 * Makes saturation attacks immediately visible: when all batteries are in cooldown
 * simultaneously the gap shows clearly as an undefended window.
 */
export function BatteryGanttChart() {
  const entities  = useSimulationStore((s) => s.entities);
  const simTimeS  = useSimulationStore((s) => s.simTimeS);
  const scenarioId = useSimulationStore((s) => s.scenarioId);

  const historyRef    = useRef<Map<string, BatteryHistory>>(new Map());
  const prevScenario  = useRef<string | null>(null);
  const prevTimeRef   = useRef<number>(0);

  // Reset on scenario change or rewind
  if (scenarioId !== prevScenario.current || simTimeS + 0.001 < prevTimeRef.current) {
    historyRef.current.clear();
    prevScenario.current = scenarioId;
  }
  prevTimeRef.current = simTimeS;

  // Sample current battery states into history
  for (const entity of entities) {
    if (entity.type !== 'interceptor' || entity.trajectory_type !== 'stationary') continue;
    const status = entity.asset_status ?? 'idle';
    let history = historyRef.current.get(entity.id);
    if (!history) {
      const cfg  = getDefenseAssetConfigByDesignator(entity.designator);
      const name = cfg?.shortLabel ?? entity.designator ?? entity.id;
      history = { id: entity.id, name, samples: [] };
      historyRef.current.set(entity.id, history);
    }
    const last = history.samples[history.samples.length - 1];
    if (!last || last.status !== status || simTimeS - last.timeS >= 0.5) {
      history.samples.push({ timeS: simTimeS, status });
      // Trim samples older than window
      const cutoff = simTimeS - WINDOW_S;
      while (history.samples.length > 1 && history.samples[1].timeS < cutoff) {
        history.samples.shift();
      }
    }
  }

  const batteries = [...historyRef.current.values()];
  const windowStart = Math.max(0, simTimeS - WINDOW_S);

  if (batteries.length === 0) return null;

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div style={sectionTitle}>Battery Timeline</div>
        <div style={styles.hint}>{WINDOW_S}s window</div>
      </div>

      <div style={styles.lanes}>
        {batteries.map((bat) => {
          // Build segments from samples
          const segments: Array<{ startS: number; endS: number; status: AssetStatus }> = [];
          const samples = bat.samples;
          for (let i = 0; i < samples.length; i++) {
            const start = Math.max(samples[i].timeS, windowStart);
            const end   = i + 1 < samples.length ? samples[i + 1].timeS : simTimeS;
            if (end > windowStart) {
              segments.push({ startS: start, endS: Math.max(start, end), status: samples[i].status });
            }
          }

          return (
            <div key={bat.id} style={styles.lane}>
              <div style={styles.laneLabel}>{bat.name}</div>
              <div style={styles.laneTrack}>
                {segments.map((seg, idx) => {
                  const span    = Math.max(simTimeS, windowStart + 0.1) - windowStart;
                  const leftPct = Math.max(0, ((seg.startS - windowStart) / span) * 100);
                  const widPct  = Math.max(0.5, ((seg.endS - seg.startS) / span) * 100);
                  return (
                    <div
                      key={idx}
                      title={`${bat.name}: ${statusLabel(seg.status)}`}
                      style={{
                        ...styles.segment,
                        left:       `${leftPct}%`,
                        width:      `${widPct}%`,
                        background: statusColor(seg.status),
                        border:     seg.status === 'cooldown'
                          ? '1px dashed rgba(255,180,0,0.4)'
                          : 'none',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.axisRow}>
        <span style={styles.axisLabel}>T−{WINDOW_S}s</span>
        <span style={styles.axisLabel}>NOW</span>
      </div>

      <div style={styles.legendRow}>
        {(['engaging', 'tracking', 'cooldown', 'idle'] as AssetStatus[]).map((s) => (
          <span key={s} style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: statusColor(s) }} />
            {statusLabel(s)}
          </span>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    background: 'rgba(8,16,22,0.72)',
    border:     '1px solid rgba(255,255,255,0.07)',
    padding:    '12px 14px 10px',
    display:    'flex',
    flexDirection: 'column',
    gap:        8,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hint: {
    ...monoText,
    color:          hudTheme.muted,
    fontSize:       10,
    letterSpacing:  '0.12em',
    textTransform:  'uppercase',
  },
  lanes: {
    display:       'flex',
    flexDirection: 'column',
    gap:           6,
  },
  lane: {
    display:        'grid',
    gridTemplateColumns: '36px minmax(0, 1fr)',
    alignItems:     'center',
    gap:            8,
  },
  laneLabel: {
    ...monoText,
    color:         hudTheme.muted,
    fontSize:      9,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    textAlign:     'right' as const,
  },
  laneTrack: {
    position:   'relative',
    height:     16,
    background: 'rgba(255,255,255,0.04)',
  },
  segment: {
    position:  'absolute',
    top:       0,
    height:    '100%',
    minWidth:  2,
  },
  axisRow: {
    display:        'flex',
    justifyContent: 'space-between',
  },
  axisLabel: {
    ...monoText,
    color:         hudTheme.faint,
    fontSize:      9,
    letterSpacing: '0.08em',
  },
  legendRow: {
    display:   'flex',
    gap:       12,
    flexWrap:  'wrap' as const,
  },
  legendItem: {
    ...monoText,
    display:       'flex',
    alignItems:    'center',
    gap:           5,
    color:         hudTheme.faint,
    fontSize:      9,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
  },
  legendDot: {
    width:        8,
    height:       8,
    borderRadius: '50%',
    flexShrink:   0,
  },
};
