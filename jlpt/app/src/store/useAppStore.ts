import { create } from "zustand";

import type { JlptValue } from "../types/study";

type AppState = {
  currentLevel: JlptValue | null;
  currentSessionId: string | null;
  openLevel: (level: JlptValue) => void;
  openStudy: (sessionId: string) => void;
  goHome: () => void;
  goPresets: () => void;
};

export const useAppStore = create<AppState>((set, get) => ({
  currentLevel: null,
  currentSessionId: null,
  openLevel: (level) =>
    set({
      currentLevel: level,
      currentSessionId: null,
    }),
  openStudy: (sessionId) =>
    set({
      currentSessionId: sessionId,
    }),
  goHome: () =>
    set({
      currentLevel: null,
      currentSessionId: null,
    }),
  goPresets: () =>
    set({
      currentLevel: get().currentLevel,
      currentSessionId: null,
    }),
}));
