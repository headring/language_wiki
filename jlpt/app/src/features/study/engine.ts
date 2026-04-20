import type { SQLiteDatabase } from "expo-sqlite";

import { shuffleArray } from "../../lib/shuffle";
import type {
  CurrentCard,
  JlptLevel,
  PresetRow,
  SessionRow,
  SessionSnapshot,
} from "../../types/study";

function createSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type QueueItemRow = {
  position: number;
  wordId: string;
  cycleCount: number;
};

export async function getLevels(db: SQLiteDatabase): Promise<JlptLevel[]> {
  return db.getAllAsync<JlptLevel>(
    `
      SELECT jlpt_level as jlptLevel, COUNT(*) as wordCount
      FROM words
      GROUP BY jlpt_level
      ORDER BY CASE jlpt_level
        WHEN 'N5' THEN 1
        WHEN 'N4' THEN 2
        WHEN 'N3' THEN 3
        WHEN 'N2' THEN 4
        WHEN 'N1' THEN 5
      END
    `,
  );
}

export async function getPresetsByLevel(
  db: SQLiteDatabase,
  level: string,
): Promise<PresetRow[]> {
  return db.getAllAsync<PresetRow>(
    `
      SELECT
        id,
        jlpt_level as jlptLevel,
        sequence_no as sequenceNo,
        preset_code as presetCode,
        label,
        round_type as roundType,
        range_start as rangeStart,
        range_end as rangeEnd
      FROM round_presets
      WHERE jlpt_level = ?
      ORDER BY sequence_no ASC
    `,
    level,
  );
}

async function getActiveSessionIdForPreset(
  db: SQLiteDatabase,
  presetId: number,
) {
  const active = await db.getFirstAsync<{ id: string }>(
    `
      SELECT id
      FROM study_sessions
      WHERE preset_id = ? AND is_completed = 0
      ORDER BY started_at DESC
      LIMIT 1
    `,
    presetId,
  );

  return active?.id ?? null;
}

export async function createSessionForPreset(
  db: SQLiteDatabase,
  presetId: number,
): Promise<string> {
  const preset = await db.getFirstAsync<PresetRow>(
    `
      SELECT
        id,
        jlpt_level as jlptLevel,
        sequence_no as sequenceNo,
        preset_code as presetCode,
        label,
        round_type as roundType,
        range_start as rangeStart,
        range_end as rangeEnd
      FROM round_presets
      WHERE id = ?
    `,
    presetId,
  );

  if (!preset) {
    throw new Error("Preset not found");
  }

  const existingActiveSessionId = await getActiveSessionIdForPreset(db, presetId);
  if (existingActiveSessionId) {
    return existingActiveSessionId;
  }

  const candidates = await db.getAllAsync<{ id: string }>(
    `
      SELECT w.id
      FROM words w
      WHERE w.jlpt_level = ?
        AND w.sequence_in_level > ?
        AND w.sequence_in_level <= ?
      ORDER BY w.sequence_in_level ASC
    `,
    preset.jlptLevel,
    preset.rangeStart,
    preset.rangeEnd,
  );

  if (candidates.length === 0) {
    throw new Error("EMPTY_SESSION");
  }

  const sessionId = createSessionId();
  const shuffled = shuffleArray(candidates);

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `
        INSERT INTO study_sessions (
          id, jlpt_level, preset_id, source_type, range_start,
          range_end, current_pass_no, total_words
        ) VALUES (?, ?, ?, 'preset', ?, ?, 1, ?)
      `,
      sessionId,
      preset.jlptLevel,
      preset.id,
      preset.rangeStart,
      preset.rangeEnd,
      shuffled.length,
    );

    for (let index = 0; index < shuffled.length; index += 1) {
      await txn.runAsync(
        `
          INSERT INTO session_queue_items (
            session_id, position, word_id, state, pass_no, seen_in_pass, cycle_count
          ) VALUES (?, ?, ?, 'pending', 1, 0, 0)
        `,
        sessionId,
        index,
        shuffled[index].id,
      );
    }
  });

  return sessionId;
}

async function getPresetBySession(
  db: SQLiteDatabase,
  sessionId: string,
): Promise<PresetRow> {
  const preset = await db.getFirstAsync<PresetRow>(
    `
      SELECT
        rp.id,
        rp.jlpt_level as jlptLevel,
        rp.sequence_no as sequenceNo,
        rp.preset_code as presetCode,
        rp.label,
        rp.round_type as roundType,
        rp.range_start as rangeStart,
        rp.range_end as rangeEnd
      FROM study_sessions ss
      JOIN round_presets rp ON rp.id = ss.preset_id
      WHERE ss.id = ?
    `,
    sessionId,
  );

  if (!preset) {
    throw new Error("Preset not found for session");
  }

  return preset;
}

async function getSessionRow(
  db: SQLiteDatabase,
  sessionId: string,
): Promise<SessionRow> {
  const row = await db.getFirstAsync<SessionRow>(
    `
      SELECT
        id,
        jlpt_level as jlptLevel,
        current_pass_no as currentPassNo,
        preset_id as presetId,
        range_start as rangeStart,
        range_end as rangeEnd,
        total_words as totalWords,
        known_words as knownWords,
        study_words as studyWords
      FROM study_sessions
      WHERE id = ?
    `,
    sessionId,
  );

  if (!row) {
    throw new Error("Session not found");
  }

  return row;
}

async function getCurrentCardForSession(
  db: SQLiteDatabase,
  sessionId: string,
): Promise<CurrentCard> {
  const session = await getSessionRow(db, sessionId);
  const card = await db.getFirstAsync<CurrentCard>(
    `
      SELECT
        w.id as wordId,
        w.kanji,
        w.kana,
        w.reading_hiragana as readingHiragana,
        w.meaning_ko as meaningKo,
        w.part_of_speech as partOfSpeech,
        w.example_jp as exampleJp,
        w.example_ko as exampleKo
      FROM session_queue_items sqi
      JOIN words w ON w.id = sqi.word_id
      WHERE sqi.session_id = ?
        AND sqi.state = 'pending'
        AND sqi.pass_no = ?
        AND sqi.seen_in_pass = 0
      ORDER BY sqi.position ASC
      LIMIT 1
    `,
    sessionId,
    session.currentPassNo,
  );

  if (!card) {
    throw new Error("Current card not found");
  }

  return card;
}

export async function getSessionSnapshot(
  db: SQLiteDatabase,
  sessionId: string,
): Promise<SessionSnapshot> {
  const session = await getSessionRow(db, sessionId);
  const [preset, pending, unseen] = await Promise.all([
    getPresetBySession(db, sessionId),
    db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM session_queue_items WHERE session_id = ? AND state = 'pending'`,
      sessionId,
    ),
    db.getFirstAsync<{ count: number }>(
      `
        SELECT COUNT(*) as count
        FROM session_queue_items
        WHERE session_id = ?
          AND state = 'pending'
          AND pass_no = ?
          AND seen_in_pass = 0
      `,
      sessionId,
      session.currentPassNo,
    ),
  ]);

  if ((pending?.count ?? 0) === 0) {
    throw new Error("SESSION_COMPLETED");
  }

  const currentCard = await getCurrentCardForSession(db, sessionId);

  return {
    session,
    preset,
    currentCard,
    pendingCount: pending?.count ?? 0,
    unseenCount: unseen?.count ?? 0,
  };
}

export async function getActiveSession(
  db: SQLiteDatabase,
): Promise<SessionSnapshot | null> {
  const session = await db.getFirstAsync<{ id: string }>(
    `
      SELECT id
      FROM study_sessions
      WHERE is_completed = 0
      ORDER BY started_at DESC
      LIMIT 1
    `,
  );

  if (!session) {
    return null;
  }

  return getSessionSnapshot(db, session.id);
}

type ActionResult = {
  completed: boolean;
  reshuffled: boolean;
};

export async function applyQueueAction(
  db: SQLiteDatabase,
  sessionId: string,
  action: "study" | "know",
): Promise<ActionResult> {
  let completed = false;
  let reshuffled = false;

  await db.withExclusiveTransactionAsync(async (txn) => {
    const session = await getSessionRow(txn, sessionId);

    const currentQueueItem = await txn.getFirstAsync<{
      position: number;
      wordId: string;
    }>(
      `
        SELECT position, word_id as wordId
        FROM session_queue_items
        WHERE session_id = ?
          AND state = 'pending'
          AND pass_no = ?
          AND seen_in_pass = 0
        ORDER BY position ASC
        LIMIT 1
      `,
      sessionId,
      session.currentPassNo,
    );

    if (!currentQueueItem) {
      completed = true;
      return;
    }

    if (action === "study") {
      await txn.runAsync(
        `
          INSERT INTO study_progress (
            word_id, status, know_count, study_count, wrong_streak, last_result, last_seen_at
          ) VALUES (?, 'learning', 0, 1, 1, 'study', CURRENT_TIMESTAMP)
          ON CONFLICT(word_id) DO UPDATE SET
            status = 'learning',
            study_count = study_count + 1,
            wrong_streak = wrong_streak + 1,
            last_result = 'study',
            last_seen_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        `,
        currentQueueItem.wordId,
      );

      await txn.runAsync(
        `
          UPDATE study_sessions
          SET study_words = study_words + 1
          WHERE id = ?
        `,
        sessionId,
      );

      await txn.runAsync(
        `
          UPDATE session_queue_items
          SET seen_in_pass = 1, last_action = 'study', cycle_count = cycle_count + 1, updated_at = CURRENT_TIMESTAMP
          WHERE session_id = ? AND position = ?
        `,
        sessionId,
        currentQueueItem.position,
      );
    }

    if (action === "know") {
      await txn.runAsync(
        `
          INSERT INTO study_progress (
            word_id, status, know_count, study_count, wrong_streak, last_result, last_seen_at, known_at
          ) VALUES (?, 'known', 1, 0, 0, 'know', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(word_id) DO UPDATE SET
            status = 'known',
            know_count = know_count + 1,
            wrong_streak = 0,
            last_result = 'know',
            last_seen_at = CURRENT_TIMESTAMP,
            known_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        `,
        currentQueueItem.wordId,
      );

      await txn.runAsync(
        `
          UPDATE study_sessions
          SET known_words = known_words + 1
          WHERE id = ?
        `,
        sessionId,
      );

      await txn.runAsync(
        `
          UPDATE session_queue_items
          SET state = 'known', seen_in_pass = 1, last_action = 'know', updated_at = CURRENT_TIMESTAMP
          WHERE session_id = ? AND position = ?
        `,
        sessionId,
        currentQueueItem.position,
      );
    }

    const pending = await txn.getFirstAsync<{ count: number }>(
      `
        SELECT COUNT(*) as count
        FROM session_queue_items
        WHERE session_id = ? AND state = 'pending'
      `,
      sessionId,
    );

    if ((pending?.count ?? 0) === 0) {
      await txn.runAsync(
        `
          UPDATE study_sessions
          SET is_completed = 1, completed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        sessionId,
      );
      completed = true;
      return;
    }

    const unseenInPass = await txn.getFirstAsync<{ count: number }>(
      `
        SELECT COUNT(*) as count
        FROM session_queue_items
        WHERE session_id = ?
          AND state = 'pending'
          AND pass_no = ?
          AND seen_in_pass = 0
      `,
      sessionId,
      session.currentPassNo,
    );

    if ((unseenInPass?.count ?? 0) > 0) {
      return;
    }

    const remaining = await txn.getAllAsync<QueueItemRow>(
      `
        SELECT position, word_id as wordId, cycle_count as cycleCount
        FROM session_queue_items
        WHERE session_id = ? AND state = 'pending'
      `,
      sessionId,
    );

    const reshuffledQueue = shuffleArray(remaining);
    const nextPassNo = session.currentPassNo + 1;
    reshuffled = true;

    await txn.runAsync(
      // Rebuild the session queue from the remaining pending cards only.
      // Known rows still occupy prior `position` values, so deleting only
      // pending rows can collide with the `(session_id, position)` PK when
      // the next pass starts again from position 0.
      "DELETE FROM session_queue_items WHERE session_id = ?",
      sessionId,
    );

    for (let index = 0; index < reshuffledQueue.length; index += 1) {
      await txn.runAsync(
        `
          INSERT INTO session_queue_items (
            session_id, position, word_id, state, pass_no, seen_in_pass, cycle_count
          ) VALUES (?, ?, ?, 'pending', ?, 0, ?)
        `,
        sessionId,
        index,
        reshuffledQueue[index].wordId,
        nextPassNo,
        reshuffledQueue[index].cycleCount,
      );
    }

    await txn.runAsync(
      `
        UPDATE study_sessions
        SET current_pass_no = ?
        WHERE id = ?
      `,
      nextPassNo,
      sessionId,
    );
  });

  return { completed, reshuffled };
}
