import type { SQLiteDatabase } from "expo-sqlite";

import { shuffleArray } from "../../lib/shuffle";
import type {
  CurrentCard,
  JlptLevel,
  PresetRow,
  SessionRow,
  SessionSnapshot,
  StudyRoundRecord,
} from "../../types/study";

function createSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type QueueItemRow = {
  position: number;
  wordId: string;
  cycleCount: number;
};

type PresetRowBase = Omit<PresetRow, "roundRecords">;

function diffSeconds(fromIso: string, toIso: string) {
  const fromMs = Date.parse(fromIso);
  const toMs = Date.parse(toIso);

  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
    return 0;
  }

  return Math.max(0, Math.floor((toMs - fromMs) / 1000));
}

function diffMilliseconds(fromIso: string, toIso: string) {
  const fromMs = Date.parse(fromIso);
  const toMs = Date.parse(toIso);

  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
    return 0;
  }

  return Math.max(0, toMs - fromMs);
}

function getElapsedSecondsAt(session: SessionRow, nowIso: string) {
  return Math.floor(getElapsedMillisecondsAt(session, nowIso) / 1000);
}

function getElapsedMillisecondsAt(session: SessionRow, nowIso: string) {
  if (!session.timerStartedAt) {
    return session.elapsedMilliseconds;
  }

  return session.elapsedMilliseconds + diffMilliseconds(session.timerStartedAt, nowIso);
}

export async function invalidateSession(
  db: SQLiteDatabase,
  sessionId: string,
) {
  await db.runAsync(
    `
      UPDATE study_sessions
      SET is_completed = 1, completed_at = CURRENT_TIMESTAMP, timer_started_at = NULL
      WHERE id = ?
    `,
    sessionId,
  );
}

async function getRoundRecordsByLevel(
  db: SQLiteDatabase,
  level: string,
): Promise<Map<number, StudyRoundRecord[]>> {
  const rows = await db.getAllAsync<StudyRoundRecord>(
    `
      SELECT
        srr.id,
        srr.preset_id as presetId,
        srr.session_id as sessionId,
        srr.round_no as roundNo,
        srr.elapsed_seconds as elapsedSeconds,
        srr.elapsed_milliseconds as elapsedMilliseconds,
        srr.completed_at as completedAt
      FROM study_round_records srr
      JOIN round_presets rp ON rp.id = srr.preset_id
      WHERE rp.jlpt_level = ?
      ORDER BY srr.preset_id ASC, srr.round_no ASC
    `,
    level,
  );

  const grouped = new Map<number, StudyRoundRecord[]>();

  for (const row of rows) {
    const current = grouped.get(row.presetId) ?? [];
    current.push(row);
    grouped.set(row.presetId, current);
  }

  return grouped;
}

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
  const [presetRows, roundRecordsByPreset] = await Promise.all([
    db.getAllAsync<PresetRowBase>(
    `
      SELECT
        id,
        jlpt_level as jlptLevel,
        sequence_no as sequenceNo,
        preset_code as presetCode,
        label,
        round_type as roundType,
        range_start as rangeStart,
        range_end as rangeEnd,
        (
          SELECT COUNT(*)
          FROM study_round_records srr
          WHERE srr.preset_id = round_presets.id
        ) as completedStudyCount
      FROM round_presets
      WHERE jlpt_level = ?
      ORDER BY sequence_no ASC
    `,
      level,
    ),
    getRoundRecordsByLevel(db, level),
  ]);

  return presetRows.map((preset) => ({
    ...preset,
    roundRecords: roundRecordsByPreset.get(preset.id) ?? [],
  }));
}

async function getActiveSessionIdForPreset(
  db: SQLiteDatabase,
  presetId: number,
) {
  const active = await db.getFirstAsync<{ id: string }>(
    `
      SELECT ss.id
      FROM study_sessions ss
      WHERE ss.preset_id = ?
        AND ss.is_completed = 0
        AND EXISTS (
          SELECT 1
          FROM session_queue_items sqi
          WHERE sqi.session_id = ss.id
            AND sqi.state = 'pending'
        )
      ORDER BY ss.started_at DESC
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
        range_end as rangeEnd,
        (
          SELECT COUNT(*)
          FROM study_round_records srr
          WHERE srr.preset_id = round_presets.id
        ) as completedStudyCount
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
    try {
      await normalizeSessionQueue(db, existingActiveSessionId);
      await getSessionSnapshot(db, existingActiveSessionId);
      return existingActiveSessionId;
    } catch {
      await invalidateSession(db, existingActiveSessionId);
    }
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
        rp.range_end as rangeEnd,
        (
          SELECT COUNT(*)
          FROM study_round_records srr
          WHERE srr.preset_id = rp.id
        ) as completedStudyCount
      FROM study_sessions ss
      JOIN round_presets rp ON rp.id = ss.preset_id
      WHERE ss.id = ?
    `,
    sessionId,
  );

  if (!preset) {
    throw new Error("Preset not found for session");
  }

  return {
    ...preset,
    roundRecords: [],
  };
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
        study_words as studyWords,
        is_completed as isCompleted,
        elapsed_seconds as elapsedSeconds,
        elapsed_milliseconds as elapsedMilliseconds,
        timer_started_at as timerStartedAt
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

export async function normalizeSessionQueue(
  db: SQLiteDatabase,
  sessionId: string,
): Promise<void> {
  const session = await getSessionRow(db, sessionId);

  const pending = await db.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) as count
      FROM session_queue_items
      WHERE session_id = ?
        AND state = 'pending'
    `,
    sessionId,
  );

  if ((pending?.count ?? 0) === 0) {
    throw new Error("SESSION_COMPLETED");
  }

  const unseenInPass = await db.getFirstAsync<{ count: number }>(
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

  await db.withExclusiveTransactionAsync(async (txn) => {
    const latestSession = await getSessionRow(txn, sessionId);
    const latestUnseen = await txn.getFirstAsync<{ count: number }>(
      `
        SELECT COUNT(*) as count
        FROM session_queue_items
        WHERE session_id = ?
          AND state = 'pending'
          AND pass_no = ?
          AND seen_in_pass = 0
      `,
      sessionId,
      latestSession.currentPassNo,
    );

    if ((latestUnseen?.count ?? 0) > 0) {
      return;
    }

    const remaining = await txn.getAllAsync<QueueItemRow>(
      `
        SELECT position, word_id as wordId, cycle_count as cycleCount
        FROM session_queue_items
        WHERE session_id = ?
          AND state = 'pending'
      `,
      sessionId,
    );

    if (remaining.length === 0) {
      await txn.runAsync(
        `
          UPDATE study_sessions
          SET is_completed = 1, completed_at = CURRENT_TIMESTAMP, timer_started_at = NULL
          WHERE id = ?
        `,
        sessionId,
      );
      return;
    }

    const reshuffledQueue = shuffleArray(remaining);
    const nextPassNo = latestSession.currentPassNo + 1;

    await txn.runAsync(
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

export async function getLatestActiveSessionId(
  db: SQLiteDatabase,
): Promise<string | null> {
  const session = await db.getFirstAsync<{ id: string }>(
    `
      SELECT ss.id
      FROM study_sessions ss
      WHERE ss.is_completed = 0
        AND EXISTS (
          SELECT 1
          FROM session_queue_items sqi
          WHERE sqi.session_id = ss.id
            AND sqi.state = 'pending'
        )
      ORDER BY started_at DESC
      LIMIT 1
    `,
  );

  if (!session) {
    return null;
  }

  return session.id;
}

export async function resumeSessionTimer(
  db: SQLiteDatabase,
  sessionId: string,
  startedAt = new Date().toISOString(),
) {
  await db.withExclusiveTransactionAsync(async (txn) => {
    const session = await getSessionRow(txn, sessionId);

    if (session.isCompleted || session.timerStartedAt) {
      return;
    }

    await txn.runAsync(
      `
        UPDATE study_sessions
        SET timer_started_at = ?
        WHERE id = ?
      `,
      startedAt,
      sessionId,
    );
  });
}

export async function pauseSessionTimer(
  db: SQLiteDatabase,
  sessionId: string,
  pausedAt = new Date().toISOString(),
) {
  await db.withExclusiveTransactionAsync(async (txn) => {
    const session = await getSessionRow(txn, sessionId);

    if (session.isCompleted || !session.timerStartedAt) {
      return;
    }

    const elapsedMilliseconds = getElapsedMillisecondsAt(session, pausedAt);
    const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000);

    await txn.runAsync(
      `
        UPDATE study_sessions
        SET elapsed_seconds = ?, elapsed_milliseconds = ?, timer_started_at = NULL
        WHERE id = ?
      `,
      elapsedSeconds,
      elapsedMilliseconds,
      sessionId,
    );
  });
}

type ActionResult = {
  completed: boolean;
  reshuffled: boolean;
  nextCard: CurrentCard | null;
  nextPendingCount: number;
  nextUnseenCount: number;
  nextSession: Pick<
    SessionRow,
    | "currentPassNo"
    | "knownWords"
    | "studyWords"
    | "elapsedSeconds"
    | "elapsedMilliseconds"
    | "timerStartedAt"
  > | null;
};

export async function applyQueueAction(
  db: SQLiteDatabase,
  sessionId: string,
  action: "study" | "know",
  actionedAt = new Date().toISOString(),
): Promise<ActionResult> {
  let completed = false;
  let reshuffled = false;
  let nextCard: CurrentCard | null = null;
  let nextPendingCount = 0;
  let nextUnseenCount = 0;
  let nextSession: ActionResult["nextSession"] = null;

  await db.withExclusiveTransactionAsync(async (txn) => {
    let session = await getSessionRow(txn, sessionId);

    if (session.timerStartedAt) {
      const elapsedMilliseconds = getElapsedMillisecondsAt(session, actionedAt);
      const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000);

      await txn.runAsync(
        `
          UPDATE study_sessions
          SET elapsed_seconds = ?, elapsed_milliseconds = ?, timer_started_at = ?
          WHERE id = ?
        `,
        elapsedSeconds,
        elapsedMilliseconds,
        actionedAt,
        sessionId,
      );

      session = {
        ...session,
        elapsedSeconds,
        elapsedMilliseconds,
        timerStartedAt: actionedAt,
      };
    }

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

    const countsBeforeAction = await txn.getFirstAsync<{
      pendingCount: number;
      unseenCount: number;
    }>(
      `
        SELECT
          COUNT(CASE WHEN state = 'pending' THEN 1 END) as pendingCount,
          COUNT(
            CASE
              WHEN state = 'pending' AND pass_no = ? AND seen_in_pass = 0 THEN 1
            END
          ) as unseenCount
        FROM session_queue_items
        WHERE session_id = ?
      `,
      session.currentPassNo,
      sessionId,
    );

    const pendingBeforeAction = countsBeforeAction?.pendingCount ?? 0;
    const unseenBeforeAction = countsBeforeAction?.unseenCount ?? 0;

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

      session = {
        ...session,
        studyWords: session.studyWords + 1,
      };
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

      session = {
        ...session,
        knownWords: session.knownWords + 1,
      };
    }

    nextPendingCount =
      action === "know" ? pendingBeforeAction - 1 : pendingBeforeAction;
    nextUnseenCount = Math.max(0, unseenBeforeAction - 1);

    if (nextPendingCount === 0) {
      const finalElapsedSeconds = getElapsedSecondsAt(session, actionedAt);
      const finalElapsedMilliseconds = getElapsedMillisecondsAt(
        session,
        actionedAt,
      );
      const nextRound = await txn.getFirstAsync<{ count: number }>(
        `
          SELECT COUNT(*) as count
          FROM study_round_records
          WHERE preset_id = ?
        `,
        session.presetId,
      );

      await txn.runAsync(
        `
          UPDATE study_sessions
          SET
            is_completed = 1,
            completed_at = CURRENT_TIMESTAMP,
            elapsed_seconds = ?,
            elapsed_milliseconds = ?,
            timer_started_at = NULL
          WHERE id = ?
        `,
        finalElapsedSeconds,
        finalElapsedMilliseconds,
        sessionId,
      );

      if (session.presetId) {
        await txn.runAsync(
          `
            INSERT INTO study_round_records (
              preset_id, session_id, round_no, elapsed_seconds, completed_at
              , elapsed_milliseconds
            ) VALUES (?, ?, ?, ?, ?, ?)
          `,
          session.presetId,
          sessionId,
          (nextRound?.count ?? 0) + 1,
          finalElapsedSeconds,
          actionedAt,
          finalElapsedMilliseconds,
        );
      }

      completed = true;
      return;
    }

    if (nextUnseenCount > 0) {
      nextCard = await txn.getFirstAsync<CurrentCard>(
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

      nextSession = {
        currentPassNo: session.currentPassNo,
        knownWords: session.knownWords,
        studyWords: session.studyWords,
        elapsedSeconds: session.elapsedSeconds,
        elapsedMilliseconds: session.elapsedMilliseconds,
        timerStartedAt: session.timerStartedAt,
      };

      if (!nextCard) {
        throw new Error("Current card not found");
      }

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

  return {
    completed,
    reshuffled,
    nextCard,
    nextPendingCount,
    nextUnseenCount,
    nextSession,
  };
}
