import { create } from 'zustand';

export interface LayerVisibilityState {
  trajectories: boolean;
  impactEffects: boolean;
  assetOverlays: boolean;
  labels: boolean;
  alerts: boolean;
  rangeRings: boolean;
}

export type DashboardPage = 'overview' | 'monitor' | 'replay' | 'analysis' | 'archive' | 'settings';
export type MonitorSection = 'tracks' | 'assets' | 'alerts';
export type DisplayDensity = 'comfortable' | 'compact';

interface DashboardStore {
  currentPage: DashboardPage;
  monitorSection: MonitorSection;
  layers: LayerVisibilityState;
  reduceMotion: boolean;
  density: DisplayDensity;
  setCurrentPage: (page: DashboardPage) => void;
  setMonitorSection: (section: MonitorSection) => void;
  setLayerVisibility: (layer: keyof LayerVisibilityState, value: boolean) => void;
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

export const useDashboardStore = create<DashboardStore>((set) => ({
  currentPage: 'overview',
  monitorSection: 'tracks',
  layers: DEFAULT_LAYERS,
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

  setReduceMotion: (reduceMotion) => set({ reduceMotion }),
  setDensity: (density) => set({ density }),

  reset: () => set({
    currentPage: 'overview',
    monitorSection: 'tracks',
    layers: DEFAULT_LAYERS,
    reduceMotion: false,
    density: 'comfortable',
  }),
}));
