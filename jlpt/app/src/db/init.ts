import type { SQLiteDatabase } from "expo-sqlite";

import { APP_DATA_VERSION, PRESET_SEEDS, WORD_SEEDS } from "../data/seed";
import { SCHEMA_SQL } from "./schema";

const SCHEMA_VERSION = 5;
const WORD_PACK_VERSION = APP_DATA_VERSION;

async function deleteStalePresetSeeds(db: SQLiteDatabase) {
  for (const level of ["N1", "N1-다락원"]) {
    const presetCodes = PRESET_SEEDS.filter(
      (preset) => preset.jlptLevel === level,
    ).map((preset) => preset.presetCode);

    if (presetCodes.length === 0) {
      continue;
    }

    const placeholders = presetCodes.map(() => "?").join(", ");

    await db.runAsync(
      `
        DELETE FROM round_presets
        WHERE jlpt_level = ?
          AND preset_code NOT IN (${placeholders})
      `,
      level,
      ...presetCodes,
    );
  }
}

async function upsertPresetSeeds(db: SQLiteDatabase) {
  await deleteStalePresetSeeds(db);

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

async function upsertWordSeeds(db: SQLiteDatabase) {
  for (const word of WORD_SEEDS) {
    await db.runAsync(
      `
        INSERT INTO words (
          id, jlpt_level, sequence_in_level, kanji, kana,
          reading_hiragana, meaning_ko, part_of_speech,
          example_jp, example_reading_hiragana, example_ko, is_common_life
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          jlpt_level = excluded.jlpt_level,
          sequence_in_level = excluded.sequence_in_level,
          kanji = excluded.kanji,
          kana = excluded.kana,
          reading_hiragana = excluded.reading_hiragana,
          meaning_ko = excluded.meaning_ko,
          part_of_speech = excluded.part_of_speech,
          example_jp = excluded.example_jp,
          example_reading_hiragana = excluded.example_reading_hiragana,
          example_ko = excluded.example_ko,
          is_common_life = excluded.is_common_life
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
      word.exampleReadingHiragana || null,
      word.exampleKo || null,
      word.isCommonLife ? 1 : 0,
    );
  }
}

async function getTableColumns(db: SQLiteDatabase, tableName: string) {
  const rows = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${tableName})`,
  );
  return new Set(rows.map((row) => row.name));
}

async function migrateJlptLevelConstraint(db: SQLiteDatabase) {
  await db.execAsync("PRAGMA foreign_keys = OFF");

  try {
    await db.execAsync(`
      BEGIN IMMEDIATE;

      DROP TABLE IF EXISTS words_v5;
      CREATE TABLE words_v5 (
        id TEXT PRIMARY KEY,
        jlpt_level TEXT NOT NULL CHECK (jlpt_level IN ('N5', 'N4', 'N3', 'N2', 'N1', 'N1-다락원')),
        sequence_in_level INTEGER NOT NULL,
        kanji TEXT NOT NULL,
        kana TEXT,
        reading_hiragana TEXT,
        meaning_ko TEXT NOT NULL,
        part_of_speech TEXT,
        example_jp TEXT,
        example_reading_hiragana TEXT,
        example_ko TEXT,
        is_common_life INTEGER NOT NULL DEFAULT 0 CHECK (is_common_life IN (0, 1))
      );
      INSERT INTO words_v5 (
        id, jlpt_level, sequence_in_level, kanji, kana,
        reading_hiragana, meaning_ko, part_of_speech,
        example_jp, example_reading_hiragana, example_ko, is_common_life
      )
      SELECT
        id, jlpt_level, sequence_in_level, kanji, kana,
        reading_hiragana, meaning_ko, part_of_speech,
        example_jp, example_reading_hiragana, example_ko, is_common_life
      FROM words;
      DROP TABLE words;
      ALTER TABLE words_v5 RENAME TO words;
      CREATE UNIQUE INDEX idx_words_level_sequence
        ON words (jlpt_level, sequence_in_level);

      DROP TABLE IF EXISTS round_presets_v5;
      CREATE TABLE round_presets_v5 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jlpt_level TEXT NOT NULL CHECK (jlpt_level IN ('N5', 'N4', 'N3', 'N2', 'N1', 'N1-다락원')),
        sequence_no INTEGER NOT NULL,
        preset_code TEXT NOT NULL,
        label TEXT NOT NULL,
        round_type TEXT NOT NULL CHECK (round_type IN ('micro', 'block', 'merge')),
        range_start INTEGER NOT NULL,
        range_end INTEGER NOT NULL,
        UNIQUE (jlpt_level, preset_code)
      );
      INSERT INTO round_presets_v5 (
        id, jlpt_level, sequence_no, preset_code, label,
        round_type, range_start, range_end
      )
      SELECT
        id, jlpt_level, sequence_no, preset_code, label,
        round_type, range_start, range_end
      FROM round_presets;
      DROP TABLE round_presets;
      ALTER TABLE round_presets_v5 RENAME TO round_presets;

      DROP TABLE IF EXISTS study_sessions_v5;
      CREATE TABLE study_sessions_v5 (
        id TEXT PRIMARY KEY,
        jlpt_level TEXT NOT NULL CHECK (jlpt_level IN ('N5', 'N4', 'N3', 'N2', 'N1', 'N1-다락원')),
        preset_id INTEGER,
        source_type TEXT NOT NULL CHECK (source_type IN ('preset')),
        range_start INTEGER,
        range_end INTEGER,
        current_pass_no INTEGER NOT NULL DEFAULT 1,
        started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT,
        is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1)),
        total_words INTEGER NOT NULL DEFAULT 0,
        known_words INTEGER NOT NULL DEFAULT 0,
        study_words INTEGER NOT NULL DEFAULT 0,
        elapsed_seconds INTEGER NOT NULL DEFAULT 0,
        elapsed_milliseconds INTEGER NOT NULL DEFAULT 0,
        timer_started_at TEXT,
        FOREIGN KEY (preset_id) REFERENCES round_presets(id) ON DELETE SET NULL
      );
      INSERT INTO study_sessions_v5 (
        id, jlpt_level, preset_id, source_type, range_start, range_end,
        current_pass_no, started_at, completed_at, is_completed,
        total_words, known_words, study_words, elapsed_seconds,
        elapsed_milliseconds, timer_started_at
      )
      SELECT
        id, jlpt_level, preset_id, source_type, range_start, range_end,
        current_pass_no, started_at, completed_at, is_completed,
        total_words, known_words, study_words, elapsed_seconds,
        elapsed_milliseconds, timer_started_at
      FROM study_sessions;
      DROP TABLE study_sessions;
      ALTER TABLE study_sessions_v5 RENAME TO study_sessions;

      COMMIT;
    `);
  } catch (error) {
    await db.execAsync("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await db.execAsync("PRAGMA foreign_keys = ON");
  }

  const violations = await db.getAllAsync("PRAGMA foreign_key_check");
  if (violations.length > 0) {
    throw new Error("Schema migration left invalid foreign keys");
  }
}

async function migrateSchema(db: SQLiteDatabase, schemaVersion: number) {
  if (schemaVersion >= SCHEMA_VERSION) {
    return;
  }

  const wordColumns = await getTableColumns(db, "words");

  if (!wordColumns.has("example_reading_hiragana")) {
    await db.execAsync("ALTER TABLE words ADD COLUMN example_reading_hiragana TEXT");
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

  if (schemaVersion < 5) {
    await migrateJlptLevelConstraint(db);
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

  const shouldSync =
    !existingVersion || existingVersion.word_pack_version !== WORD_PACK_VERSION;

  if (!shouldSync) {
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
    await upsertWordSeeds(txn);
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
