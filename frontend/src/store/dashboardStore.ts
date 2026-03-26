import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface LayerVisibilityState {
  trajectories: boolean;
  impactEffects: boolean;
  assetOverlays: boolean;
  labels: boolean;
  alerts: boolean;
  rangeRings: boolean;
}

export interface ExperimentalGlobeLayerState {
  trackHistory: boolean;
  bdaMarkers: boolean;
  radarSweeps: boolean;
  saturationHighlights: boolean;
  reentryFootprints: boolean;
  jammingZones: boolean;
  taskingLines: boolean;
  missileExhaust: boolean;
  advancedLighting: boolean;
}

export type DashboardPage = 'overview' | 'monitor' | 'replay' | 'analysis' | 'archive' | 'settings';
export type MonitorSection = 'tracks' | 'assets' | 'alerts';
export type DisplayDensity = 'comfortable' | 'compact';

interface DashboardStore {
  currentPage: DashboardPage;
  monitorSection: MonitorSection;
  layers: LayerVisibilityState;
  experimentalGlobeLayers: ExperimentalGlobeLayerState;
  reduceMotion: boolean;
  density: DisplayDensity;
  setCurrentPage: (page: DashboardPage) => void;
  setMonitorSection: (section: MonitorSection) => void;
  setLayerVisibility: (layer: keyof LayerVisibilityState, value: boolean) => void;
  setExperimentalGlobeLayer: (layer: keyof ExperimentalGlobeLayerState, value: boolean) => void;
  setReduceMotion: (value: boolean) => void;
  setDensity: (value: DisplayDensity) => void;
  reset: () => void;
}

const DEFAULT_LAYERS: LayerVisibilityState = {
  trajectories: true,
  impactEffects: true,
  assetOverlays: true,
  labels: true,
  alerts: true,
  rangeRings: true,
};

const DEFAULT_EXPERIMENTAL_GLOBE_LAYERS: ExperimentalGlobeLayerState = {
  trackHistory: true,
  bdaMarkers: true,
  radarSweeps: true,
  saturationHighlights: true,
  reentryFootprints: true,
  jammingZones: true,
  taskingLines: true,
  missileExhaust: true,
  advancedLighting: true,
};

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      currentPage: 'overview',
      monitorSection: 'tracks',
      layers: DEFAULT_LAYERS,
      experimentalGlobeLayers: DEFAULT_EXPERIMENTAL_GLOBE_LAYERS,
      reduceMotion: false,
      density: 'comfortable',

      setCurrentPage: (currentPage) => set({ currentPage }),
      setMonitorSection: (monitorSection) => set({ monitorSection }),

      setLayerVisibility: (layer, value) =>
        set((state) => ({
          layers: {
            ...state.layers,
            [layer]: value,
          },
        })),

      setExperimentalGlobeLayer: (layer, value) =>
        set((state) => ({
          experimentalGlobeLayers: {
            ...state.experimentalGlobeLayers,
            [layer]: value,
          },
        })),

      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setDensity: (density) => set({ density }),

      reset: () => set({
        currentPage: 'overview',
        monitorSection: 'tracks',
        layers: DEFAULT_LAYERS,
        experimentalGlobeLayers: DEFAULT_EXPERIMENTAL_GLOBE_LAYERS,
        reduceMotion: false,
        density: 'comfortable',
      }),
    }),
    {
      name: 'dashboard-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        layers: state.layers,
        experimentalGlobeLayers: state.experimentalGlobeLayers,
        reduceMotion: state.reduceMotion,
        density: state.density,
      }),
    },
  ),
);
