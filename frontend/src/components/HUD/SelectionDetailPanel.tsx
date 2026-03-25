import { SelectionDetail } from './hudSelectors';
import { glassPanel, hudTheme, monoText, sectionTitle } from './hudTheme';

export function SelectionDetailPanel({
  selection,
}: {
  selection: SelectionDetail;
}) {
  return (
    <section style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <div style={sectionTitle}>Selection Detail</div>
          <div style={{ ...styles.title, color: selection.accent }}>{selection.title}</div>
        </div>
        <div style={styles.kindChip}>{selection.kind === 'none' ? 'IDLE' : selection.kind.toUpperCase()}</div>
      </div>

      <div style={styles.subtitle}>{selection.subtitle}</div>

      {selection.latestEventLabel && (
        <div style={styles.callout}>
          <div style={styles.calloutLabel}>LATEST_EVENT</div>
          <div style={styles.calloutValue}>{selection.latestEventLabel}</div>
        </div>
      )}

      <div style={styles.rows}>
        {selection.rows.map((row) => (
          <div key={row.label} style={styles.row}>
            <span style={styles.rowLabel}>{row.label}</span>
            <span style={{
              ...styles.rowValue,
              color:
                row.tone === 'cyan'
                  ? hudTheme.cyanSoft
                  : row.tone === 'amber'
                    ? hudTheme.amberSoft
                    : row.tone === 'red'
                      ? hudTheme.redSoft
                      : hudTheme.text,
            }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
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
    gap: 12,
    alignItems: 'start',
  },
  title: {
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 26,
    lineHeight: 1,
    marginTop: 4,
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
  subtitle: {
    color: hudTheme.muted,
    fontSize: 13,
    lineHeight: 1.5,
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
  rows: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    padding: '8px 0',
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
};
