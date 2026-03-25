import { ReplayBookmark } from '../../../store/playbackStore';
import { formatSimTime } from '../../../utils/timeUtils';
import { buttonReset, glassPanel, hudTheme, monoText, sectionTitle } from '../../HUD/hudTheme';

export function ReplayBookmarkPanel({
  bookmarks,
  activeTimeS,
  onAddBookmark,
  onSelectBookmark,
  onRemoveBookmark,
  onClearBookmarks,
}: {
  bookmarks: ReplayBookmark[];
  activeTimeS: number;
  onAddBookmark: () => void;
  onSelectBookmark: (bookmark: ReplayBookmark) => void;
  onRemoveBookmark: (bookmarkId: string) => void;
  onClearBookmarks: () => void;
}) {
  return (
    <section style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <div style={sectionTitle}>Replay Bookmarks</div>
          <div style={styles.headline}>{bookmarks.length} saved moments</div>
        </div>
        <div style={styles.actions}>
          <button onClick={onAddBookmark} style={styles.primaryButton}>SAVE_MOMENT</button>
          {bookmarks.length > 0 && (
            <button onClick={onClearBookmarks} style={styles.secondaryButton}>CLEAR</button>
          )}
        </div>
      </div>

      <div style={styles.activeStrip}>CURRENT_POSITION // {formatSimTime(activeTimeS)}</div>

      <div style={styles.list}>
        {bookmarks.map((bookmark) => (
          <div key={bookmark.id} style={styles.row}>
            <button onClick={() => onSelectBookmark(bookmark)} style={styles.rowMain}>
              <span style={styles.rowLabel}>{bookmark.label}</span>
              <span style={styles.rowTime}>{formatSimTime(bookmark.simTimeS)}</span>
            </button>
            <button onClick={() => onRemoveBookmark(bookmark.id)} style={styles.removeButton}>REMOVE</button>
          </div>
        ))}
        {bookmarks.length === 0 && <div style={styles.empty}>Capture useful replay moments to jump back here during review.</div>}
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'start',
  },
  headline: {
    color: hudTheme.text,
    fontSize: 18,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    marginTop: 4,
  },
  actions: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  primaryButton: {
    border: `1px solid ${hudTheme.line}`,
    background: 'rgba(0,229,255,0.08)',
    color: hudTheme.cyanSoft,
    padding: '8px 10px',
    fontSize: 10,
    letterSpacing: '0.14em',
    cursor: 'pointer',
  },
  secondaryButton: {
    border: `1px solid ${hudTheme.lineSoft}`,
    background: 'rgba(255,255,255,0.03)',
    color: hudTheme.muted,
    padding: '8px 10px',
    fontSize: 10,
    letterSpacing: '0.14em',
    cursor: 'pointer',
  },
  activeStrip: {
    ...monoText,
    color: hudTheme.muted,
    border: `1px solid ${hudTheme.lineSoft}`,
    background: 'rgba(255,255,255,0.03)',
    padding: '10px 12px',
    fontSize: 11,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minHeight: 0,
  },
  row: {
    display: 'flex',
    gap: 8,
    alignItems: 'stretch',
  },
  rowMain: {
    ...buttonReset,
    flex: 1,
    border: `1px solid ${hudTheme.lineSoft}`,
    background: 'rgba(255,255,255,0.03)',
    padding: '10px 12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
  },
  rowLabel: {
    color: hudTheme.text,
    fontSize: 12,
  },
  rowTime: {
    ...monoText,
    color: hudTheme.cyanSoft,
    fontSize: 11,
  },
  removeButton: {
    border: `1px solid ${hudTheme.lineSoft}`,
    background: 'rgba(255,255,255,0.03)',
    color: hudTheme.muted,
    padding: '10px 12px',
    fontSize: 10,
    letterSpacing: '0.14em',
    cursor: 'pointer',
  },
  empty: {
    color: hudTheme.muted,
    fontSize: 12,
    lineHeight: 1.5,
    padding: '6px 0',
  },
};
