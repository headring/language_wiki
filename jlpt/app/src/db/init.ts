import type { SQLiteDatabase } from "expo-sqlite";

import { APP_DATA_VERSION, PRESET_SEEDS, WORD_SEEDS } from "../data/seed";
import { SCHEMA_SQL } from "./schema";

const SCHEMA_VERSION = 3;
const WORD_PACK_VERSION = APP_DATA_VERSION;

async function resetContentTables(db: SQLiteDatabase) {
  await db.execAsync(`
    DELETE FROM study_round_records;
    DELETE FROM session_queue_items;
    DELETE FROM study_sessions;
    DELETE FROM study_progress;
    DELETE FROM round_presets;
    DELETE FROM words;
  `);
}

async function upsertPresetSeeds(db: SQLiteDatabase) {
  for (const preset of PRESET_SEEDS) {
    await db.runAsync(
      `
        INSERT INTO round_presets (
          jlpt_level, sequence_no, preset_code, label,
          round_type, range_start, range_end
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(jlpt_level, preset_code) DO UPDATE SET
          sequence_no = excluded.sequence_no,
          label = excluded.label,
          round_type = excluded.round_type,
          range_start = excluded.range_start,
          range_end = excluded.range_end
      `,
      preset.jlptLevel,
      preset.sequenceNo,
      preset.presetCode,
      preset.label,
      preset.roundType,
      preset.rangeStart,
      preset.rangeEnd,
    );
  }
}

async function getTableColumns(db: SQLiteDatabase, tableName: string) {
  const rows = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${tableName})`,
  );
  return new Set(rows.map((row) => row.name));
}

async function migrateSchema(db: SQLiteDatabase, schemaVersion: number) {
  if (schemaVersion >= SCHEMA_VERSION) {
    return;
  }

  const sessionColumns = await getTableColumns(db, "study_sessions");

  if (!sessionColumns.has("elapsed_seconds")) {
    await db.execAsync(
      "ALTER TABLE study_sessions ADD COLUMN elapsed_seconds INTEGER NOT NULL DEFAULT 0",
    );
  }

  if (!sessionColumns.has("elapsed_milliseconds")) {
    await db.execAsync(
      "ALTER TABLE study_sessions ADD COLUMN elapsed_milliseconds INTEGER NOT NULL DEFAULT 0",
    );
    await db.execAsync(
      "UPDATE study_sessions SET elapsed_milliseconds = elapsed_seconds * 1000 WHERE elapsed_milliseconds = 0",
    );
  }

  if (!sessionColumns.has("timer_started_at")) {
    await db.execAsync(
      "ALTER TABLE study_sessions ADD COLUMN timer_started_at TEXT",
    );
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS study_round_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      preset_id INTEGER NOT NULL,
      session_id TEXT NOT NULL UNIQUE,
      round_no INTEGER NOT NULL,
      elapsed_seconds INTEGER NOT NULL DEFAULT 0,
      elapsed_milliseconds INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (preset_id) REFERENCES round_presets(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES study_sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_round_records_preset_round
      ON study_round_records (preset_id, round_no);
  `);

  const roundRecordColumns = await getTableColumns(db, "study_round_records");

  if (!roundRecordColumns.has("elapsed_milliseconds")) {
    await db.execAsync(
      "ALTER TABLE study_round_records ADD COLUMN elapsed_milliseconds INTEGER NOT NULL DEFAULT 0",
    );
    await db.execAsync(
      "UPDATE study_round_records SET elapsed_milliseconds = elapsed_seconds * 1000 WHERE elapsed_milliseconds = 0",
    );
  }

  const completedSessions = await db.getAllAsync<{
    id: string;
    presetId: number;
    elapsedSeconds: number;
    elapsedMilliseconds: number;
    completedAt: string | null;
  }>(
    `
      SELECT
        id,
        preset_id as presetId,
        elapsed_seconds as elapsedSeconds,
        elapsed_milliseconds as elapsedMilliseconds,
        completed_at as completedAt
      FROM study_sessions
      WHERE is_completed = 1
        AND preset_id IS NOT NULL
      ORDER BY preset_id ASC, COALESCE(completed_at, started_at) ASC, started_at ASC
    `,
  );

  const roundCountByPreset = new Map<number, number>();

  for (const session of completedSessions) {
    const existing = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM study_round_records WHERE session_id = ?",
      session.id,
    );

    if (existing) {
      const current = roundCountByPreset.get(session.presetId) ?? 0;
      roundCountByPreset.set(session.presetId, current + 1);
      continue;
    }

    const nextRoundNo = (roundCountByPreset.get(session.presetId) ?? 0) + 1;
    roundCountByPreset.set(session.presetId, nextRoundNo);

    await db.runAsync(
      `
        INSERT INTO study_round_records (
          preset_id, session_id, round_no, elapsed_seconds, completed_at
          , elapsed_milliseconds
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      session.presetId,
      session.id,
      nextRoundNo,
      session.elapsedSeconds ?? 0,
      session.completedAt ?? new Date().toISOString(),
      session.elapsedMilliseconds ?? (session.elapsedSeconds ?? 0) * 1000,
    );
  }
}

export async function initializeDatabase(db: SQLiteDatabase) {
  await db.execAsync(SCHEMA_SQL);

  const existingVersion = await db.getFirstAsync<{
    schema_version: number;
    word_pack_version: string;
  }>(
    "SELECT schema_version, word_pack_version FROM content_versions WHERE id = 1",
  );

  if (existingVersion) {
    await migrateSchema(db, existingVersion.schema_version);
  }

  const shouldReset =
    !existingVersion || existingVersion.word_pack_version !== WORD_PACK_VERSION;

  if (!shouldReset) {
    const wordCount = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM words",
    );

    await db.runAsync(
      `
        UPDATE content_versions
        SET schema_version = ?, downloaded_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `,
      SCHEMA_VERSION,
    );

    if ((wordCount?.count ?? 0) > 0) {
      await upsertPresetSeeds(db);
      return;
    }
  }

  await db.withExclusiveTransactionAsync(async (txn) => {
    await resetContentTables(txn);

    for (const word of WORD_SEEDS) {
      await txn.runAsync(
        `
          INSERT INTO words (
            id, jlpt_level, sequence_in_level, kanji, kana,
            reading_hiragana, meaning_ko, part_of_speech,
            example_jp, example_ko, is_common_life
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        word.id,
        word.jlptLevel,
        word.sequenceInLevel,
        word.kanji,
        word.kana,
        word.readingHiragana,
        word.meaningKo,
        word.partOfSpeech || null,
        word.exampleJp || null,
        word.exampleKo || null,
        word.isCommonLife ? 1 : 0,
      );
    }

    await upsertPresetSeeds(txn);

    await txn.runAsync(
      `
        INSERT INTO content_versions (id, schema_version, word_pack_version)
        VALUES (1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          schema_version = excluded.schema_version,
          word_pack_version = excluded.word_pack_version,
          downloaded_at = CURRENT_TIMESTAMP
      `,
      SCHEMA_VERSION,
      WORD_PACK_VERSION,
    );
  });
}
