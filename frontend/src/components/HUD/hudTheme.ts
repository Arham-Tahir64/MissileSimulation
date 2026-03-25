export const hudTheme = {
  bg: '#10141a',
  panel: 'rgba(15, 21, 28, 0.78)',
  panelAlt: 'rgba(10, 16, 22, 0.62)',
  panelStrong: 'rgba(18, 25, 34, 0.88)',
  text: '#dfe2eb',
  muted: '#7b8b97',
  faint: '#50606c',
  cyan: '#00e5ff',
  cyanSoft: '#c3f5ff',
  amber: '#ffd799',
  amberSoft: '#ffe8bb',
  red: '#ffb4ab',
  redSoft: '#ffe7e2',
  line: 'rgba(0, 218, 243, 0.16)',
  lineSoft: 'rgba(255, 255, 255, 0.08)',
};

export const glassPanel: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(195,245,255,0.1) 0, rgba(15,21,28,0.82) 12px, rgba(15,21,28,0.76) 100%)',
  border: '1px solid rgba(0, 218, 243, 0.14)',
  boxShadow: '0 0 0 1px rgba(0, 218, 243, 0.04), 0 40px 120px rgba(0, 218, 243, 0.05)',
  backdropFilter: 'blur(18px)',
};

export const sectionTitle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: hudTheme.muted,
  fontWeight: 700,
};

export const monoText: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', 'SFMono-Regular', ui-monospace, monospace",
};

export const buttonReset: React.CSSProperties = {
  border: 'none',
  padding: 0,
  margin: 0,
  background: 'none',
  color: 'inherit',
  font: 'inherit',
};
