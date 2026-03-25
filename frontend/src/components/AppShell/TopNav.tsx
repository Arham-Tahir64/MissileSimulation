import { DashboardPage } from '../../store/dashboardStore';
import { hudTheme, monoText } from '../HUD/hudTheme';

const NAV_ITEMS: Array<{ page: DashboardPage; label: string }> = [
  { page: 'overview', label: 'Overview' },
  { page: 'monitor', label: 'Monitor' },
  { page: 'replay', label: 'Replay' },
  { page: 'analysis', label: 'Analysis' },
  { page: 'archive', label: 'Archive' },
  { page: 'settings', label: 'Settings' },
];

export function TopNav({
  currentPage,
  onNavigate,
  onGlobeView,
  scenarioLabel,
  sessionLabel,
  status,
  connectionStatus,
  showGlobeView,
}: {
  currentPage: DashboardPage;
  onNavigate: (page: DashboardPage) => void;
  onGlobeView: () => void;
  scenarioLabel: string;
  sessionLabel: string;
  status: string;
  connectionStatus: string;
  showGlobeView: boolean;
}) {
  return (
    <div style={styles.wrap}>
      <div style={styles.brandBlock}>
        <div style={styles.brand}>KINETIC_SENTINEL_v1.0</div>
        <div style={styles.metaRow}>
          <span>{scenarioLabel}</span>
          <span>{sessionLabel}</span>
          <span>{status.toUpperCase()}</span>
          <span>{connectionStatus}</span>
        </div>
      </div>

      <div style={styles.actions}>
        <button
          onClick={() => onNavigate('archive')}
          style={{
            ...styles.archiveButton,
            boxShadow: currentPage === 'archive' ? 'inset 2px 0 0 #00e5ff' : 'none',
          }}
        >
          <span style={styles.archiveButtonTitle}>
            {status === 'completed'
              ? 'VIEW_AUTO_SAVE'
              : status === 'running' || status === 'paused'
                ? 'ARCHIVE_QUEUE'
                : 'OPEN_ARCHIVE'}
          </span>
          <span style={styles.archiveButtonHint}>
            {status === 'completed'
              ? 'RUN ARCHIVED'
              : status === 'running' || status === 'paused'
                ? 'AUTO-SAVES ON COMPLETE'
                : 'BROWSE SAVED RUNS'}
          </span>
        </button>
        {showGlobeView && (
          <button onClick={onGlobeView} style={styles.globeButton}>
            GLOBE_VIEW
          </button>
        )}
        <nav style={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.page}
            onClick={() => onNavigate(item.page)}
            style={{
              ...styles.navItem,
              color: currentPage === item.page ? hudTheme.cyanSoft : hudTheme.muted,
              borderBottomColor: currentPage === item.page ? hudTheme.cyan : 'transparent',
            }}
          >
            {item.label}
          </button>
        ))}
        </nav>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    padding: '18px 20px 10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'end',
    gap: 24,
    background: 'linear-gradient(180deg, rgba(8,10,14,0.92) 0%, rgba(8,10,14,0.72) 68%, rgba(8,10,14,0) 100%)',
    pointerEvents: 'auto',
  },
  brandBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  brand: {
    color: hudTheme.cyan,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontWeight: 700,
    fontSize: 23,
    letterSpacing: '0.08em',
    fontStyle: 'italic',
  },
  metaRow: {
    ...monoText,
    display: 'flex',
    gap: 14,
    flexWrap: 'wrap',
    color: hudTheme.muted,
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 18,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 18,
  },
  archiveButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    border: `1px solid ${hudTheme.line}`,
    background: 'linear-gradient(180deg, rgba(0,229,255,0.12), rgba(10,16,22,0.84))',
    color: hudTheme.text,
    padding: '9px 12px 8px',
    cursor: 'pointer',
    minWidth: 174,
  },
  archiveButtonTitle: {
    fontSize: 11,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: hudTheme.cyanSoft,
  },
  archiveButtonHint: {
    ...monoText,
    fontSize: 9,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: hudTheme.muted,
  },
  globeButton: {
    border: `1px solid ${hudTheme.line}`,
    background: 'rgba(10,16,22,0.78)',
    color: hudTheme.text,
    padding: '10px 14px',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    fontSize: 11,
  },
  navItem: {
    border: 'none',
    borderBottom: '2px solid transparent',
    background: 'transparent',
    color: hudTheme.muted,
    padding: '8px 0 12px',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    fontSize: 12,
  },
};
