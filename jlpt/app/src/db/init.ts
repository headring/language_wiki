import type { SQLiteDatabase } from "expo-sqlite";

import { PRESET_SEEDS, WORD_SEEDS } from "../data/seed";
import { SCHEMA_SQL } from "./schema";

const SCHEMA_VERSION = 1;
const WORD_PACK_VERSION = "demo-1";

export async function initializeDatabase(db: SQLiteDatabase) {
  await db.execAsync(SCHEMA_SQL);

  const existingVersion = await db.getFirstAsync<{ schema_version: number }>(
    "SELECT schema_version FROM content_versions WHERE id = 1",
  );

  if (!existingVersion) {
    await db.runAsync(
      "INSERT INTO content_versions (id, schema_version, word_pack_version) VALUES (1, ?, ?)",
      SCHEMA_VERSION,
      WORD_PACK_VERSION,
    );
  }

  const wordCount = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM words",
  );

  if ((wordCount?.count ?? 0) > 0) {
    return;
  }

  await db.withExclusiveTransactionAsync(async (txn) => {
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
        word.partOfSpeech ?? null,
        word.exampleJp ?? null,
        word.exampleKo ?? null,
        word.isCommonLife ? 1 : 0,
      );
    }

    for (const preset of PRESET_SEEDS) {
      await txn.runAsync(
        `
          INSERT INTO round_presets (
            jlpt_level, sequence_no, preset_code, label,
            round_type, range_start, range_end
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
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
  });
}
