/**
 * Module-level registry for the active Cesium Viewer instance.
 * Cesium viewers are imperative objects — they don't belong in React state
 * or Zustand. Any module that needs to call viewer APIs (camera fly-to,
 * entity queries, etc.) imports from here.
 */
import type * as CesiumType from 'cesium';

let _viewer: CesiumType.Viewer | null = null;

export function registerViewer(viewer: CesiumType.Viewer): void {
  _viewer = viewer;
}

export function unregisterViewer(): void {
  _viewer = null;
}

export function getViewer(): CesiumType.Viewer | null {
  return _viewer;
}
