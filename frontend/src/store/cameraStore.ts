import { create } from 'zustand';

export type CameraMode = 'tactical' | 'follow' | 'free';
export type FollowPreset = 'chase' | 'wide';

interface CameraStore {
  mode: CameraMode;
  trackedEntityId: string | null;
  followPreset: FollowPreset;
  isHudExpanded: boolean;
  isAutoFollowEnabled: boolean;

  setMode: (mode: CameraMode) => void;
  setTrackedEntityId: (entityId: string | null) => void;
  setFollowPreset: (preset: FollowPreset) => void;
  setHudExpanded: (expanded: boolean) => void;
  setAutoFollowEnabled: (enabled: boolean) => void;
  primeFollow: (entityId: string | null) => void;
  reset: () => void;
}

const DEFAULT_STATE = {
  mode: 'tactical' as CameraMode,
  trackedEntityId: null,
  followPreset: 'chase' as FollowPreset,
  isHudExpanded: true,
  isAutoFollowEnabled: true,
};

export const useCameraStore = create<CameraStore>((set) => ({
  ...DEFAULT_STATE,

  setMode: (mode) => set({ mode }),
  setTrackedEntityId: (trackedEntityId) => set({ trackedEntityId }),
  setFollowPreset: (followPreset) => set({ followPreset }),
  setHudExpanded: (isHudExpanded) => set({ isHudExpanded }),
  setAutoFollowEnabled: (isAutoFollowEnabled) => set({ isAutoFollowEnabled }),

  primeFollow: (trackedEntityId) =>
    set({
      mode: 'follow',
      trackedEntityId,
      followPreset: 'chase',
      isAutoFollowEnabled: true,
    }),

  reset: () => set(DEFAULT_STATE),
}));
