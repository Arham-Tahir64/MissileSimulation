/**
 * Tests for the dashboard store — page navigation, layer toggles, density, and reset.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useDashboardStore } from '../store/dashboardStore';

beforeEach(() => {
  useDashboardStore.getState().reset();
});

describe('dashboardStore — page navigation', () => {
  it('starts on overview', () => {
    expect(useDashboardStore.getState().currentPage).toBe('overview');
  });

  it('setCurrentPage updates the current page', () => {
    useDashboardStore.getState().setCurrentPage('monitor');
    expect(useDashboardStore.getState().currentPage).toBe('monitor');
  });

  it('setCurrentPage to every valid page works', () => {
    const pages = ['overview', 'monitor', 'replay', 'analysis', 'archive', 'settings'] as const;
    for (const page of pages) {
      useDashboardStore.getState().setCurrentPage(page);
      expect(useDashboardStore.getState().currentPage).toBe(page);
    }
  });

  it('reset returns to overview', () => {
    useDashboardStore.getState().setCurrentPage('archive');
    useDashboardStore.getState().reset();
    expect(useDashboardStore.getState().currentPage).toBe('overview');
  });
});

describe('dashboardStore — monitor section', () => {
  it('starts on tracks section', () => {
    expect(useDashboardStore.getState().monitorSection).toBe('tracks');
  });

  it('setMonitorSection updates the section', () => {
    useDashboardStore.getState().setMonitorSection('alerts');
    expect(useDashboardStore.getState().monitorSection).toBe('alerts');
  });
});

describe('dashboardStore — layers', () => {
  it('all layers default to true', () => {
    const { layers } = useDashboardStore.getState();
    expect(layers.trajectories).toBe(true);
    expect(layers.impactEffects).toBe(true);
    expect(layers.assetOverlays).toBe(true);
    expect(layers.labels).toBe(true);
    expect(layers.alerts).toBe(true);
    expect(layers.rangeRings).toBe(true);
  });

  it('setLayerVisibility toggles a single layer without affecting others', () => {
    useDashboardStore.getState().setLayerVisibility('trajectories', false);
    const { layers } = useDashboardStore.getState();
    expect(layers.trajectories).toBe(false);
    expect(layers.impactEffects).toBe(true); // unchanged
  });

  it('reset restores all layers to true', () => {
    useDashboardStore.getState().setLayerVisibility('trajectories', false);
    useDashboardStore.getState().setLayerVisibility('labels', false);
    useDashboardStore.getState().reset();
    const { layers } = useDashboardStore.getState();
    expect(layers.trajectories).toBe(true);
    expect(layers.labels).toBe(true);
  });
});

describe('dashboardStore — density and motion', () => {
  it('defaults to comfortable density', () => {
    expect(useDashboardStore.getState().density).toBe('comfortable');
  });

  it('setDensity updates density', () => {
    useDashboardStore.getState().setDensity('compact');
    expect(useDashboardStore.getState().density).toBe('compact');
  });

  it('defaults reduceMotion to false', () => {
    expect(useDashboardStore.getState().reduceMotion).toBe(false);
  });

  it('setReduceMotion updates the flag', () => {
    useDashboardStore.getState().setReduceMotion(true);
    expect(useDashboardStore.getState().reduceMotion).toBe(true);
  });
});
