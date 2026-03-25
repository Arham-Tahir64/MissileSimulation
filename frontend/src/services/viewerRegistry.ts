/**
 * Module-level registry for the active Cesium Viewer instance.
 * Cesium viewers are imperative objects — they don't belong in React state
 * or Zustand. Any module that needs to call viewer APIs (camera fly-to,
 * entity queries, etc.) imports from here.
 */
import type * as CesiumType from 'cesium';

let _viewer: CesiumType.Viewer | null = null;
let _resetToDefaultView: (() => void) | null = null;

export function registerViewer(viewer: CesiumType.Viewer): void {
  _viewer = viewer;
}

export function unregisterViewer(): void {
  _viewer = null;
  _resetToDefaultView = null;
}

export function getViewer(): CesiumType.Viewer | null {
  return _viewer;
}

export function registerViewerReset(resetFn: () => void): void {
  _resetToDefaultView = resetFn;
}

export function resetViewerToDefaultView(): void {
  _resetToDefaultView?.();
}
