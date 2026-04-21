export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS content_versions (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  schema_version INTEGER NOT NULL,
  word_pack_version TEXT NOT NULL,
  downloaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS words (
  id TEXT PRIMARY KEY,
  jlpt_level TEXT NOT NULL CHECK (jlpt_level IN ('N5', 'N4', 'N3', 'N2', 'N1')),
  sequence_in_level INTEGER NOT NULL,
  kanji TEXT NOT NULL,
  kana TEXT,
  reading_hiragana TEXT,
  meaning_ko TEXT NOT NULL,
  part_of_speech TEXT,
  example_jp TEXT,
  example_ko TEXT,
  is_common_life INTEGER NOT NULL DEFAULT 0 CHECK (is_common_life IN (0, 1))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_words_level_sequence
  ON words (jlpt_level, sequence_in_level);

CREATE TABLE IF NOT EXISTS round_presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jlpt_level TEXT NOT NULL CHECK (jlpt_level IN ('N5', 'N4', 'N3', 'N2', 'N1')),
  sequence_no INTEGER NOT NULL,
  preset_code TEXT NOT NULL,
  label TEXT NOT NULL,
  round_type TEXT NOT NULL CHECK (round_type IN ('micro', 'block', 'merge')),
  range_start INTEGER NOT NULL,
  range_end INTEGER NOT NULL,
  UNIQUE (jlpt_level, preset_code)
);

CREATE TABLE IF NOT EXISTS study_progress (
  word_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'learning', 'known')),
  know_count INTEGER NOT NULL DEFAULT 0,
  study_count INTEGER NOT NULL DEFAULT 0,
  wrong_streak INTEGER NOT NULL DEFAULT 0,
  last_result TEXT CHECK (last_result IN ('study', 'know')),
  last_seen_at TEXT,
  known_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY,
  jlpt_level TEXT NOT NULL CHECK (jlpt_level IN ('N5', 'N4', 'N3', 'N2', 'N1')),
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

CREATE TABLE IF NOT EXISTS session_queue_items (
  session_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  word_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'known')),
  pass_no INTEGER NOT NULL DEFAULT 1,
  seen_in_pass INTEGER NOT NULL DEFAULT 0 CHECK (seen_in_pass IN (0, 1)),
  cycle_count INTEGER NOT NULL DEFAULT 0,
  last_action TEXT CHECK (last_action IN ('study', 'know')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id, position),
  FOREIGN KEY (session_id) REFERENCES study_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_queue_pending
  ON session_queue_items (session_id, state, pass_no, seen_in_pass, position);
`;
