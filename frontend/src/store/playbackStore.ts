import { create } from 'zustand';

export interface ReplayBookmark {
  id: string;
  label: string;
  simTimeS: number;
  eventId?: string | null;
}

interface PlaybackStore {
  isPlaying: boolean;
  speed: number;
  durationS: number;
  bookmarks: ReplayBookmark[];

  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  setDuration: (durationS: number) => void;
  addBookmark: (bookmark: ReplayBookmark) => void;
  removeBookmark: (bookmarkId: string) => void;
  clearBookmarks: () => void;
}

export const usePlaybackStore = create<PlaybackStore>((set) => ({
  isPlaying: false,
  speed: 1.0,
  durationS: 0,
  bookmarks: [],

  setPlaying: (isPlaying) => set({ isPlaying }),
  setSpeed: (speed) => set({ speed }),
  setDuration: (durationS) => set({ durationS }),
  addBookmark: (bookmark) =>
    set((state) => {
      const existing = state.bookmarks.find((entry) => entry.id === bookmark.id);
      if (existing) {
        return state;
      }
      return { bookmarks: [...state.bookmarks, bookmark].sort((a, b) => a.simTimeS - b.simTimeS) };
    }),
  removeBookmark: (bookmarkId) =>
    set((state) => ({
      bookmarks: state.bookmarks.filter((bookmark) => bookmark.id !== bookmarkId),
    })),
  clearBookmarks: () => set({ bookmarks: [] }),
}));
