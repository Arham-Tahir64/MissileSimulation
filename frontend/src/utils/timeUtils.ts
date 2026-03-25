/** Format simulation seconds as MM:SS */
export function formatSimTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Map simulation time to a [0, 1] fraction of total duration */
export function timeToFraction(simTimeS: number, durationS: number): number {
  if (durationS <= 0) return 0;
  return clamp(simTimeS / durationS, 0, 1);
}
