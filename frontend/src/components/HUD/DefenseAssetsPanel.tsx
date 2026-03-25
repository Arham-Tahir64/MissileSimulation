import { DefenseAssetRow } from './hudSelectors';
import { glassPanel, hudTheme, monoText, sectionTitle } from './hudTheme';

export function DefenseAssetsPanel({
  assets,
  selectedAssetId,
  onSelect,
}: {
  assets: DefenseAssetRow[];
  selectedAssetId: string | null;
  onSelect: (assetId: string) => void;
}) {
  const radars = assets.filter((asset) => asset.role === 'radar');
  const batteries = assets.filter((asset) => asset.role === 'battery');

  return (
    <section style={styles.wrap}>
      <div>
        <div style={sectionTitle}>Defense Assets</div>
        <div style={styles.headline}>{assets.length} static systems</div>
      </div>

      <AssetGroup title="Radars" assets={radars} selectedAssetId={selectedAssetId} onSelect={onSelect} />
      <AssetGroup title="Batteries" assets={batteries} selectedAssetId={selectedAssetId} onSelect={onSelect} />
    </section>
  );
}

function AssetGroup({
  title,
  assets,
  selectedAssetId,
  onSelect,
}: {
  title: string;
  assets: DefenseAssetRow[];
  selectedAssetId: string | null;
  onSelect: (assetId: string) => void;
}) {
  if (assets.length === 0) return null;

  return (
    <div style={styles.group}>
      <div style={styles.groupTitle}>{title}</div>
      <div style={styles.groupList}>
        {assets.map((asset) => {
          const selected = selectedAssetId === asset.id;
          return (
            <button
              key={asset.id}
              onClick={() => onSelect(asset.id)}
              style={{
                ...styles.row,
                background: selected ? 'rgba(255,215,153,0.08)' : 'rgba(255,255,255,0.03)',
                boxShadow: selected
                  ? `inset 2px 0 0 ${asset.role === 'radar' ? hudTheme.amber : hudTheme.cyan}`
                  : 'none',
              }}
            >
              <div style={styles.rowTop}>
                <span style={styles.rowName}>{asset.name}</span>
                <span style={styles.rowStatus}>{asset.status}</span>
              </div>
              <div style={styles.rowMeta}>
                <span>{asset.label}</span>
                <span>{asset.rangeKm.toFixed(0)} KM</span>
                <span>{asset.readiness}</span>
              </div>
              {asset.latestEventLabel && (
                <div style={styles.rowNote}>{asset.latestEventLabel}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    ...glassPanel,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  headline: {
    color: hudTheme.text,
    fontSize: 18,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    marginTop: 4,
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  groupTitle: {
    ...sectionTitle,
    color: hudTheme.amber,
  },
  groupList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  row: {
    border: 'none',
    textAlign: 'left',
    color: hudTheme.text,
    padding: '12px 12px 10px',
    cursor: 'pointer',
  },
  rowTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowName: {
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: 15,
  },
  rowStatus: {
    ...monoText,
    fontSize: 10,
    letterSpacing: '0.14em',
    color: hudTheme.amberSoft,
  },
  rowMeta: {
    ...monoText,
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    color: hudTheme.muted,
    fontSize: 10,
    marginTop: 5,
    letterSpacing: '0.08em',
  },
  rowNote: {
    color: hudTheme.faint,
    fontSize: 11,
    marginTop: 7,
  },
};
