import type { SQLiteDatabase } from "expo-sqlite";
import { create } from "zustand";
import type { StoreApi } from "zustand";

import {
  applyQueueAction,
  createSessionForPreset,
  getLatestActiveSessionId,
  getSessionSnapshot,
  invalidateSession,
  normalizeSessionQueue,
  pauseSessionTimer,
  resumeSessionTimer,
} from "../features/study/engine";
import type {
  HomeActiveSessionSummary,
  JlptValue,
  SessionSnapshot,
} from "../types/study";

type QueueAction = "study" | "know";

type AppState = {
  currentLevel: JlptValue | null;
  currentSessionId: string | null;
  currentSessionSnapshot: SessionSnapshot | null;
  isSessionLoading: boolean;
  homeActiveSessionSummary: HomeActiveSessionSummary | null;
  openLevel: (level: JlptValue) => void;
  goHome: () => void;
  goPresets: () => void;
  syncHomeActiveSessionSummary: (db: SQLiteDatabase) => Promise<void>;
  startPreset: (db: SQLiteDatabase, presetId: number) => Promise<void>;
  openSession: (db: SQLiteDatabase, sessionId: string) => Promise<void>;
  resumeActiveSession: (db: SQLiteDatabase) => Promise<void>;
  refreshCurrentSession: (db: SQLiteDatabase) => Promise<SessionSnapshot | null>;
  leaveStudy: (db: SQLiteDatabase) => Promise<void>;
  pauseCurrentSessionTimer: (db: SQLiteDatabase) => Promise<void>;
  resumeCurrentSessionTimer: (db: SQLiteDatabase) => Promise<void>;
  handleQueueAction: (
    db: SQLiteDatabase,
    action: QueueAction,
  ) => Promise<{ completed: boolean; reshuffled: boolean }>;
};

type AppStoreSetter = StoreApi<AppState>["setState"];

let sessionActionQueue = Promise.resolve();

function serializeSessionAction<T>(task: () => Promise<T>) {
  const nextTask = sessionActionQueue.then(task, task);
  sessionActionQueue = nextTask.then(
    () => undefined,
    () => undefined,
  );
  return nextTask;
}

function toHomeActiveSessionSummary(
  snapshot: SessionSnapshot,
): HomeActiveSessionSummary {
  return {
    sessionId: snapshot.session.id,
    jlptLevel: snapshot.preset.jlptLevel,
    presetLabel: snapshot.preset.label,
    pendingCount: snapshot.pendingCount,
    nextRoundNo: snapshot.preset.completedStudyCount + 1,
  };
}

function applyIncrementalQueueActionResult(
  snapshot: SessionSnapshot,
  result: Awaited<ReturnType<typeof applyQueueAction>>,
): SessionSnapshot | null {
  if (
    result.completed ||
    result.reshuffled ||
    !result.nextCard ||
    !result.nextSession
  ) {
    return null;
  }

  return {
    ...snapshot,
    session: {
      ...snapshot.session,
      currentPassNo: result.nextSession.currentPassNo,
      knownWords: result.nextSession.knownWords,
      studyWords: result.nextSession.studyWords,
      elapsedSeconds: result.nextSession.elapsedSeconds,
      elapsedMilliseconds: result.nextSession.elapsedMilliseconds,
      timerStartedAt: result.nextSession.timerStartedAt,
    },
    currentCard: result.nextCard,
    pendingCount: result.nextPendingCount,
    unseenCount: result.nextUnseenCount,
  };
}

async function readSessionSnapshot(
  db: SQLiteDatabase,
  sessionId: string,
): Promise<SessionSnapshot> {
  await normalizeSessionQueue(db, sessionId);
  return getSessionSnapshot(db, sessionId);
}

async function readResumableHomeSummary(
  db: SQLiteDatabase,
): Promise<HomeActiveSessionSummary | null> {
  const sessionId = await getLatestActiveSessionId(db);

  if (!sessionId) {
    return null;
  }

  try {
    return toHomeActiveSessionSummary(await readSessionSnapshot(db, sessionId));
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_COMPLETED") {
      return null;
    }

    await invalidateSession(db, sessionId);
    return null;
  }
}

async function publishOpenSession(
  db: SQLiteDatabase,
  sessionId: string,
  set: AppStoreSetter,
) {
  const snapshot = await readSessionSnapshot(db, sessionId);

  await resumeSessionTimer(db, sessionId);

  const liveSnapshot = await getSessionSnapshot(db, sessionId);

  set({
    currentLevel: snapshot.preset.jlptLevel,
    currentSessionId: sessionId,
    currentSessionSnapshot: liveSnapshot,
    homeActiveSessionSummary: toHomeActiveSessionSummary(liveSnapshot),
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  currentLevel: null,
  currentSessionId: null,
  currentSessionSnapshot: null,
  isSessionLoading: false,
  homeActiveSessionSummary: null,
  openLevel: (level) =>
    set({
      currentLevel: level,
      currentSessionId: null,
      currentSessionSnapshot: null,
    }),
  goHome: () =>
    set({
      currentLevel: null,
      currentSessionId: null,
      currentSessionSnapshot: null,
    }),
  goPresets: () =>
    set((state) => ({
      currentLevel:
        state.currentSessionSnapshot?.preset.jlptLevel ?? state.currentLevel,
      currentSessionId: null,
      currentSessionSnapshot: null,
    })),
  syncHomeActiveSessionSummary: (db) =>
    serializeSessionAction(async () => {
      const summary = await readResumableHomeSummary(db);
      set({ homeActiveSessionSummary: summary });
    }),
  startPreset: (db, presetId) =>
    serializeSessionAction(async () => {
      set({ isSessionLoading: true });
      let sessionId: string | null = null;

      try {
        sessionId = await createSessionForPreset(db, presetId);
        await publishOpenSession(db, sessionId, set);
      } catch (error) {
        if (
          sessionId &&
          !(error instanceof Error && error.message === "SESSION_COMPLETED")
        ) {
          await invalidateSession(db, sessionId);
        }

        throw error;
      } finally {
        set({ isSessionLoading: false });
      }
    }),
  openSession: (db, sessionId) =>
    serializeSessionAction(async () => {
      set({ isSessionLoading: true });

      try {
        await publishOpenSession(db, sessionId, set);
      } catch (error) {
        if (
          !(error instanceof Error && error.message === "SESSION_COMPLETED")
        ) {
          await invalidateSession(db, sessionId);
        }

        set({
          currentSessionId: null,
          currentSessionSnapshot: null,
          homeActiveSessionSummary: null,
        });
        throw error;
      } finally {
        set({ isSessionLoading: false });
      }
    }),
  resumeActiveSession: (db) =>
    serializeSessionAction(async () => {
      const summary = get().homeActiveSessionSummary;
      const sessionId = summary?.sessionId ?? null;

      if (!summary) {
        const nextSummary = await readResumableHomeSummary(db);
        set({ homeActiveSessionSummary: nextSummary });

        if (!nextSummary) {
          return;
        }

        set({ isSessionLoading: true });
        try {
          await publishOpenSession(db, nextSummary.sessionId, set);
        } catch (error) {
          if (
            !(error instanceof Error && error.message === "SESSION_COMPLETED")
          ) {
            await invalidateSession(db, nextSummary.sessionId);
          }

          set({ homeActiveSessionSummary: null });
          throw error;
        } finally {
          set({ isSessionLoading: false });
        }
        return;
      }

      set({ isSessionLoading: true });
      try {
        await publishOpenSession(db, summary.sessionId, set);
      } catch (error) {
        if (
          sessionId &&
          !(error instanceof Error && error.message === "SESSION_COMPLETED")
        ) {
          await invalidateSession(db, sessionId);
        }

        set({ homeActiveSessionSummary: null });
        throw error;
      } finally {
        set({ isSessionLoading: false });
      }
    }),
  refreshCurrentSession: (db) =>
    serializeSessionAction(async () => {
      const sessionId = get().currentSessionId;

      if (!sessionId) {
        return null;
      }

      try {
        const snapshot = await readSessionSnapshot(db, sessionId);

        set({
          currentLevel: snapshot.preset.jlptLevel,
          currentSessionSnapshot: snapshot,
          homeActiveSessionSummary: toHomeActiveSessionSummary(snapshot),
        });

        return snapshot;
      } catch (error) {
        if (error instanceof Error && error.message === "SESSION_COMPLETED") {
          set({
            currentSessionId: null,
            currentSessionSnapshot: null,
            homeActiveSessionSummary: null,
          });
          return null;
        }

        await invalidateSession(db, sessionId);
        set({
          currentSessionId: null,
          currentSessionSnapshot: null,
          homeActiveSessionSummary: null,
        });
        throw error;
      }
    }),
  leaveStudy: (db) =>
    serializeSessionAction(async () => {
      const sessionId = get().currentSessionId;

      if (sessionId) {
        await pauseSessionTimer(db, sessionId);
      }

      set((state) => ({
        currentLevel:
          state.currentSessionSnapshot?.preset.jlptLevel ?? state.currentLevel,
        currentSessionId: null,
        currentSessionSnapshot: null,
      }));

      const summary = await readResumableHomeSummary(db);
      set({ homeActiveSessionSummary: summary });
    }),
  pauseCurrentSessionTimer: (db) =>
    serializeSessionAction(async () => {
      const sessionId = get().currentSessionId;

      if (!sessionId) {
        return;
      }

      await pauseSessionTimer(db, sessionId);

      try {
        const snapshot = await getSessionSnapshot(db, sessionId);
        set({
          currentSessionSnapshot: snapshot,
          homeActiveSessionSummary: toHomeActiveSessionSummary(snapshot),
        });
      } catch (error) {
        if (error instanceof Error && error.message === "SESSION_COMPLETED") {
          set({
            currentSessionId: null,
            currentSessionSnapshot: null,
            homeActiveSessionSummary: null,
          });
          return;
        }

        throw error;
      }
    }),
  resumeCurrentSessionTimer: (db) =>
    serializeSessionAction(async () => {
      const sessionId = get().currentSessionId;

      if (!sessionId) {
        return;
      }

      await resumeSessionTimer(db, sessionId);

      try {
        const snapshot = await getSessionSnapshot(db, sessionId);
        set({
          currentSessionSnapshot: snapshot,
          homeActiveSessionSummary: toHomeActiveSessionSummary(snapshot),
        });
      } catch (error) {
        if (error instanceof Error && error.message === "SESSION_COMPLETED") {
          set({
            currentSessionId: null,
            currentSessionSnapshot: null,
            homeActiveSessionSummary: null,
          });
          return;
        }

        throw error;
      }
    }),
  handleQueueAction: (db, action) =>
    serializeSessionAction(async () => {
      const sessionId = get().currentSessionId;
      const currentSnapshot = get().currentSessionSnapshot;

      if (!sessionId || !currentSnapshot) {
        return {
          completed: false,
          reshuffled: false,
        };
      }

      const result = await applyQueueAction(db, sessionId, action);

      if (result.completed) {
        set({
          currentSessionId: null,
          currentSessionSnapshot: null,
        });
        const summary = await readResumableHomeSummary(db);
        set({ homeActiveSessionSummary: summary });
        return result;
      }

      const nextSnapshot = applyIncrementalQueueActionResult(
        currentSnapshot,
        result,
      );

      if (nextSnapshot) {
        set({
          currentLevel: nextSnapshot.preset.jlptLevel,
          currentSessionSnapshot: nextSnapshot,
          homeActiveSessionSummary: toHomeActiveSessionSummary(nextSnapshot),
        });

        return result;
      }

      const refreshedSnapshot = await readSessionSnapshot(db, sessionId);
      set({
        currentLevel: refreshedSnapshot.preset.jlptLevel,
        currentSessionSnapshot: refreshedSnapshot,
        homeActiveSessionSummary: toHomeActiveSessionSummary(refreshedSnapshot),
      });

      return result;
    }),
}));
