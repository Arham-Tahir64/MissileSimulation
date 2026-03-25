import { useMemo, useState } from 'react';
import { AlertRow } from './hudSelectors';
import { buttonReset, glassPanel, hudTheme, sectionTitle } from './hudTheme';
import { formatSimTime } from '../../utils/timeUtils';
import {
  AlertFilter,
  buildAlertFilters,
  buildAlertSections,
  getAlertContextLabel,
  getAlertSignalLabel,
} from './alerts/triage';

export function AlertFeedPanel({
  alerts,
  onSelectAlert,
}: {
  alerts: AlertRow[];
  onSelectAlert: (alert: AlertRow) => void;
}) {
  const [activeFilter, setActiveFilter] = useState<AlertFilter>('all');

  const filters = useMemo(() => buildAlertFilters(alerts), [alerts]);
  const sections = useMemo(() => buildAlertSections(alerts, activeFilter), [alerts, activeFilter]);
  const selectedFilter = filters.find((filter) => filter.id === activeFilter) ?? filters[0];

  return (
    <section style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <div style={sectionTitle}>Alert Feed</div>
          <div style={styles.headline}>
            {alerts.length > 0 ? `${alerts.length} runtime events` : 'No active alerts'}
          </div>
          <div style={styles.subhead}>
            {alerts.length > 0
              ? `${selectedFilter.label.toUpperCase()} triage view with grouped event context.`
              : 'The current simulation window is quiet. Alerts will appear here as tracks, engagements, and outcomes arrive.'}
          </div>
        </div>
        <div style={styles.summary}>
          <div style={styles.summaryValue}>{filters.find((filter) => filter.id === 'priority')?.count ?? 0}</div>
          <div style={styles.summaryLabel}>priority</div>
        </div>
      </div>

      <div style={styles.filterRow}>
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            style={{
              ...styles.filterChip,
              color: activeFilter === filter.id ? hudTheme.cyanSoft : hudTheme.muted,
              background: activeFilter === filter.id ? 'rgba(0,229,255,0.14)' : 'rgba(255,255,255,0.03)',
              boxShadow: activeFilter === filter.id ? 'inset 0 0 0 1px rgba(0,229,255,0.22)' : 'inset 0 0 0 1px rgba(255,255,255,0.04)',
            }}
          >
            <span>{filter.label}</span>
            <span style={styles.filterCount}>{filter.count}</span>
          </button>
        ))}
      </div>

      <div style={styles.list}>
        {sections.map((section) => (
          <div key={section.id} style={styles.section}>
            <div style={styles.sectionHeader}>
              <div>
                <div
                  style={{
                    ...styles.sectionTitle,
                    color:
                      section.tone === 'cyan'
                        ? hudTheme.cyanSoft
                        : section.tone === 'amber'
                          ? hudTheme.amberSoft
                          : hudTheme.redSoft,
                  }}
                >
                  {section.title}
                </div>
                <div style={styles.sectionDescription}>{section.description}</div>
              </div>
              <div style={styles.sectionCount}>{section.alerts.length}</div>
            </div>

            <div style={styles.sectionRows}>
              {section.alerts.map((alert) => (
                <button
                  key={alert.id}
                  onClick={() => onSelectAlert(alert)}
                  style={styles.row}
                >
                  <div style={styles.rowTop}>
                    <span style={styles.signal}>{getAlertSignalLabel(alert)}</span>
                    <span style={styles.time}>{formatSimTime(alert.simTimeS)}</span>
                  </div>
                  <div style={styles.rowHeadline}>
                    <span
                      style={{
                        ...styles.tone,
                        color:
                          alert.tone === 'cyan'
                            ? hudTheme.cyanSoft
                            : alert.tone === 'amber'
                              ? hudTheme.amberSoft
                              : hudTheme.redSoft,
                      }}
                    >
                      {alert.title}
                    </span>
                    <span style={styles.context}>{getAlertContextLabel(alert)}</span>
                  </div>
                  <div style={styles.subtitle}>{alert.subtitle}</div>
                  <div style={styles.jumpHint}>OPEN_CONTEXT</div>
                </button>
              ))}
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <div style={styles.empty}>
            <div style={styles.emptyTitle}>No alert pressure</div>
            <div style={styles.emptyCopy}>
              Nothing is requesting attention at the current simulation point. Try switching to replay or wait for the next runtime event.
            </div>
          </div>
        )}
        {alerts.length > 0 && sections.length === 0 && (
          <div style={styles.empty}>
            <div style={styles.emptyTitle}>No matches for this filter</div>
            <div style={styles.emptyCopy}>
              The current triage filter has no results. Switch back to `All` to restore the full feed.
            </div>
          </div>
        )}
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
    minHeight: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  headline: {
    color: hudTheme.text,
    fontSize: 18,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    marginTop: 4,
  },
  subhead: {
    color: hudTheme.muted,
    fontSize: 12,
    lineHeight: 1.5,
    marginTop: 6,
    maxWidth: 320,
  },
  summary: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  summaryValue: {
    color: hudTheme.redSoft,
    fontSize: 28,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    lineHeight: 1,
  },
  summaryLabel: {
    color: hudTheme.muted,
    fontSize: 10,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
  },
  filterRow: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 2,
  },
  filterChip: {
    ...buttonReset,
    flex: '0 0 auto',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontSize: 10,
    cursor: 'pointer',
  },
  filterCount: {
    minWidth: 18,
    color: hudTheme.text,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    overflowY: 'auto',
    minHeight: 0,
    paddingRight: 2,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'start',
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    fontWeight: 700,
  },
  sectionDescription: {
    color: hudTheme.muted,
    fontSize: 12,
    lineHeight: 1.45,
    marginTop: 4,
    maxWidth: 280,
  },
  sectionCount: {
    color: hudTheme.text,
    fontSize: 18,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    lineHeight: 1,
    paddingTop: 2,
  },
  sectionRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  row: {
    textAlign: 'left',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
    color: hudTheme.text,
    padding: '12px 12px 11px 12px',
    cursor: 'pointer',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
  },
  rowTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'baseline',
  },
  signal: {
    color: hudTheme.muted,
    fontSize: 10,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  },
  rowHeadline: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'baseline',
    marginTop: 6,
  },
  tone: {
    fontSize: 11,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    fontWeight: 700,
  },
  context: {
    color: hudTheme.muted,
    fontSize: 11,
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
  },
  time: {
    color: hudTheme.muted,
    fontSize: 11,
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
  },
  subtitle: {
    color: hudTheme.text,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 1.45,
  },
  jumpHint: {
    color: hudTheme.faint,
    fontSize: 10,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    marginTop: 8,
  },
  empty: {
    padding: '18px 0 8px 0',
  },
  emptyTitle: {
    color: hudTheme.text,
    fontSize: 16,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
  },
  emptyCopy: {
    color: hudTheme.muted,
    fontSize: 12,
    lineHeight: 1.6,
    marginTop: 6,
    maxWidth: 310,
  },
};
