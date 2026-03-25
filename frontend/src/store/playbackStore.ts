import { create } from 'zustand';

interface PlaybackStore {
  isPlaying: boolean;
  speed: number;
  durationS: number;

  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  setDuration: (durationS: number) => void;
}

export const usePlaybackStore = create<PlaybackStore>((set) => ({
  isPlaying: false,
  speed: 1.0,
  durationS: 0,

  setPlaying: (isPlaying) => set({ isPlaying }),
  setSpeed: (speed) => set({ speed }),
  setDuration: (durationS) => set({ durationS }),
}));
