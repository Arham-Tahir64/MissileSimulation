import { MonitorSection } from '../../store/dashboardStore';
import { AlertFeedPanel } from '../HUD/AlertFeedPanel';
import { DefenseAssetsPanel } from '../HUD/DefenseAssetsPanel';
import { SelectionDetailPanel } from '../HUD/SelectionDetailPanel';
import { TracksPanel } from '../HUD/TracksPanel';
import { AlertRow, HudSnapshot } from '../HUD/hudSelectors';
import { glassPanel, hudTheme, monoText } from '../HUD/hudTheme';

export function MonitorPage({
  snapshot,
  monitorSection,
  setMonitorSection,
  selectedTrackId,
  selectedAssetId,
  detailOpen,
  onSelectTrack,
  onSelectAsset,
  onSelectAlert,
  onOpenReplay,
  onOpenSettings,
  onToggleDetail,
}: {
  snapshot: HudSnapshot;
  monitorSection: MonitorSection;
  setMonitorSection: (section: MonitorSection) => void;
  selectedTrackId: string | null;
  selectedAssetId: string | null;
  detailOpen: boolean;
  onSelectTrack: (trackId: string) => void;
  onSelectAsset: (assetId: string) => void;
  onSelectAlert: (alert: AlertRow) => void;
  onOpenReplay: () => void;
  onOpenSettings: () => void;
  onToggleDetail: () => void;
}) {
  const latestAlerts = snapshot.alerts.slice(0, 5);

  return (
    <div style={styles.wrap}>
      <div style={styles.pageHeader}>
        <div style={styles.headerTitle}>Monitor</div>
        <div style={styles.headerActions}>
          <button onClick={onOpenReplay} style={styles.ghostButton}>GO_TO_REPLAY</button>
          <button onClick={onOpenSettings} style={styles.ghostButton}>VIEW_OPTIONS</button>
          <button onClick={onToggleDetail} style={styles.ghostButton}>
            {detailOpen ? 'HIDE_DETAIL' : 'SHOW_DETAIL'}
          </button>
        </div>
      </div>

      <aside style={styles.leftPanel}>
        <div style={styles.sectionTabs}>
          {([
            ['tracks', 'Tracks'],
            ['assets', 'Assets'],
            ['alerts', 'Alerts'],
          ] as Array<[MonitorSection, string]>).map(([section, label]) => (
            <button
              key={section}
              onClick={() => setMonitorSection(section)}
              style={{
                ...styles.sectionTab,
                color: monitorSection === section ? hudTheme.cyanSoft : hudTheme.muted,
                boxShadow: monitorSection === section ? 'inset 2px 0 0 #00e5ff' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={styles.sidebarBody}>
          {monitorSection === 'tracks' && (
            <TracksPanel
              tracks={snapshot.tracks}
              selectedTrackId={selectedTrackId}
              onSelect={onSelectTrack}
            />
          )}
          {monitorSection === 'assets' && (
            <DefenseAssetsPanel
              assets={snapshot.defenseAssets}
              selectedAssetId={selectedAssetId}
              onSelect={onSelectAsset}
            />
          )}
          {monitorSection === 'alerts' && (
            <AlertFeedPanel
              alerts={latestAlerts}
              onSelectAlert={onSelectAlert}
            />
          )}
        </div>
      </aside>

      {detailOpen && snapshot.selection.kind !== 'none' && (
        <aside style={styles.detailDrawer}>
          <SelectionDetailPanel selection={snapshot.selection} />
        </aside>
      )}

      <div style={styles.bottomStrip}>
        <div style={styles.statusPill}>
          <span style={styles.statusLabel}>ACTIVE_TRACKS</span>
          <span style={styles.statusValue}>{snapshot.metrics.activeTracks}</span>
        </div>
        <div style={styles.statusPill}>
          <span style={styles.statusLabel}>TRACKED_THREATS</span>
          <span style={styles.statusValue}>{snapshot.metrics.trackedThreats}</span>
        </div>
        <div style={styles.statusPill}>
          <span style={styles.statusLabel}>BATTERIES_ENGAGING</span>
          <span style={styles.statusValue}>{snapshot.metrics.batteriesEngaging}</span>
        </div>
        <div style={styles.statusPillWide}>
          <span style={styles.statusLabel}>FOCUSED_ALERTS</span>
          <span style={styles.statusValueSmall}>
            {latestAlerts.length > 0 ? latestAlerts.map((alert) => alert.title).join(' // ') : 'NO_ALERTS'}
          </span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'absolute',
    inset: '88px 18px 18px 18px',
    pointerEvents: 'none',
  },
  pageHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 24,
    alignItems: 'start',
    pointerEvents: 'auto',
  },
  headerTitle: {
    color: hudTheme.text,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 30,
    lineHeight: 1,
  },
  headerActions: {
    display: 'flex',
    gap: 10,
  },
  ghostButton: {
    border: `1px solid ${hudTheme.line}`,
    background: 'rgba(10,16,22,0.72)',
    color: hudTheme.text,
    padding: '10px 14px',
    letterSpacing: '0.14em',
    fontSize: 11,
    cursor: 'pointer',
  },
  leftPanel: {
    position: 'absolute',
    top: 54,
    left: 0,
    bottom: 98,
    width: 338,
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr)',
    gap: 10,
    pointerEvents: 'auto',
  },
  sectionTabs: {
    ...glassPanel,
    padding: 8,
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 6,
  },
  sectionTab: {
    border: 'none',
    background: 'rgba(255,255,255,0.03)',
    color: hudTheme.muted,
    padding: '12px 10px',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    fontSize: 11,
  },
  sidebarBody: {
    minHeight: 0,
  },
  detailDrawer: {
    position: 'absolute',
    top: 82,
    right: 0,
    width: 360,
    pointerEvents: 'auto',
  },
  bottomStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 180px) minmax(0, 1fr)',
    gap: 12,
    pointerEvents: 'auto',
  },
  statusPill: {
    ...glassPanel,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  statusPillWide: {
    ...glassPanel,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  statusLabel: {
    ...monoText,
    color: hudTheme.muted,
    fontSize: 10,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  },
  statusValue: {
    ...monoText,
    color: hudTheme.cyanSoft,
    fontSize: 28,
  },
  statusValueSmall: {
    ...monoText,
    color: hudTheme.text,
    fontSize: 12,
    lineHeight: 1.5,
  },
};
