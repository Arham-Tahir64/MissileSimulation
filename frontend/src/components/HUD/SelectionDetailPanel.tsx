import { SelectionDetail } from './hudSelectors';
import { glassPanel, hudTheme, monoText, sectionTitle } from './hudTheme';

export function SelectionDetailPanel({
  selection,
}: {
  selection: SelectionDetail;
}) {
  const primaryRows = selection.rows.slice(0, selection.kind === 'asset' ? 3 : 4);
  const detailRows = selection.rows.slice(primaryRows.length);

  if (selection.kind === 'none') {
    return (
      <section style={styles.wrap}>
        <div style={styles.header}>
          <div>
            <div style={sectionTitle}>Selection Detail</div>
            <div style={{ ...styles.title, color: selection.accent }}>{selection.title}</div>
          </div>
          <div style={styles.kindChip}>IDLE</div>
        </div>

        <div style={styles.emptyPanel}>
          <div style={styles.emptyTitle}>Awaiting focus target.</div>
          <div style={styles.emptyCopy}>
            Select a track from the globe or left rail to inspect motion data, or select a defense asset to review coverage and state.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <div style={sectionTitle}>Selection Detail</div>
          <div style={{ ...styles.title, color: selection.accent }}>{selection.title}</div>
          <div style={styles.subtitle}>{selection.subtitle}</div>
        </div>
        <div style={styles.kindColumn}>
          <div style={styles.kindChip}>{selection.kind === 'track' ? 'TRACK' : 'ASSET'}</div>
          <div style={styles.modeLine}>
            {selection.kind === 'track' ? 'FOLLOW / INVESTIGATE' : 'TACTICAL / INSPECT'}
          </div>
        </div>
      </div>

      {selection.latestEventLabel && (
        <div style={styles.callout}>
          <div style={styles.calloutLabel}>LATEST_EVENT</div>
          <div style={styles.calloutValue}>{selection.latestEventLabel}</div>
        </div>
      )}

      <div style={styles.metricGrid}>
        {primaryRows.map((row) => (
          <div key={row.label} style={styles.metricCard}>
            <div style={styles.metricCardLabel}>{row.label}</div>
            <div
              style={{
                ...styles.metricCardValue,
                color: getToneColor(row.tone),
              }}
            >
              {row.value}
            </div>
          </div>
        ))}
      </div>

      {detailRows.length > 0 && (
        <div style={styles.detailBlock}>
          <div style={styles.detailTitle}>DETAILED_READOUT</div>
          <div style={styles.rows}>
            {detailRows.map((row) => (
              <div key={row.label} style={styles.row}>
                <span style={styles.rowLabel}>{row.label}</span>
                <span
                  style={{
                    ...styles.rowValue,
                    color: getToneColor(row.tone),
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function getToneColor(tone?: 'cyan' | 'amber' | 'red') {
  if (tone === 'cyan') return hudTheme.cyanSoft;
  if (tone === 'amber') return hudTheme.amberSoft;
  if (tone === 'red') return hudTheme.redSoft;
  return hudTheme.text;
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    ...glassPanel,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 26,
    lineHeight: 1,
    marginTop: 4,
  },
  subtitle: {
    color: hudTheme.muted,
    fontSize: 13,
    lineHeight: 1.5,
    marginTop: 8,
    maxWidth: 230,
  },
  kindColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
  },
  kindChip: {
    ...monoText,
    fontSize: 10,
    letterSpacing: '0.16em',
    color: hudTheme.muted,
    border: `1px solid ${hudTheme.line}`,
    padding: '8px 10px',
    alignSelf: 'center',
  },
  modeLine: {
    ...monoText,
    color: hudTheme.faint,
    fontSize: 10,
    letterSpacing: '0.12em',
    textAlign: 'right',
  },
  callout: {
    background: 'rgba(255,255,255,0.03)',
    padding: '10px 12px',
  },
  calloutLabel: {
    ...sectionTitle,
  },
  calloutValue: {
    color: hudTheme.text,
    fontSize: 13,
    lineHeight: 1.45,
    marginTop: 6,
  },
  metricGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 8,
  },
  metricCard: {
    background: 'rgba(255,255,255,0.03)',
    padding: '12px 12px 11px',
    minHeight: 70,
  },
  metricCardLabel: {
    ...sectionTitle,
    color: hudTheme.faint,
  },
  metricCardValue: {
    ...monoText,
    fontSize: 18,
    lineHeight: 1.2,
    marginTop: 10,
    wordBreak: 'break-word',
  },
  detailBlock: {
    background: 'rgba(255,255,255,0.02)',
    padding: '12px 12px 6px',
  },
  detailTitle: {
    ...sectionTitle,
    color: hudTheme.muted,
  },
  rows: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginTop: 8,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    padding: '7px 0',
  },
  rowLabel: {
    ...sectionTitle,
    color: hudTheme.faint,
  },
  rowValue: {
    ...monoText,
    color: hudTheme.text,
    textAlign: 'right',
    fontSize: 12,
    maxWidth: '65%',
  },
  emptyPanel: {
    background: 'rgba(255,255,255,0.03)',
    padding: '14px 12px',
  },
  emptyTitle: {
    color: hudTheme.text,
    fontSize: 14,
  },
  emptyCopy: {
    color: hudTheme.muted,
    fontSize: 12,
    lineHeight: 1.55,
    marginTop: 6,
  },
};
