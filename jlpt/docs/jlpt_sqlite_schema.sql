PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_versions (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  schema_version INTEGER NOT NULL,
  word_pack_version TEXT NOT NULL,
  audio_pack_version TEXT,
  downloaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_checked_at TEXT
);

CREATE TABLE IF NOT EXISTS words (
  id TEXT PRIMARY KEY,
  jlpt_level TEXT NOT NULL CHECK (jlpt_level IN ('N5', 'N4', 'N3', 'N2', 'N1')),
  sequence_in_level INTEGER NOT NULL,
  block_index INTEGER NOT NULL,
  section_index INTEGER,
  chapter_label TEXT,
  kanji TEXT NOT NULL,
  kana TEXT,
  reading_hiragana TEXT,
  reading_katakana TEXT,
  meaning_ko TEXT NOT NULL,
  part_of_speech TEXT,
  example_jp TEXT,
  example_hiragana TEXT,
  example_ko TEXT,
  word_audio_uri TEXT,
  example_audio_uri TEXT,
  is_common_life INTEGER NOT NULL DEFAULT 0 CHECK (is_common_life IN (0, 1)),
  tags_json TEXT,
  source_version TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (jlpt_level, sequence_in_level)
);

CREATE TABLE IF NOT EXISTS round_presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jlpt_level TEXT NOT NULL CHECK (jlpt_level IN ('N5', 'N4', 'N3', 'N2', 'N1')),
  sequence_no INTEGER NOT NULL,
  preset_code TEXT NOT NULL,
  label TEXT NOT NULL,
  round_type TEXT NOT NULL CHECK (round_type IN ('micro', 'block', 'merge')),
  range_start INTEGER NOT NULL,
  range_end INTEGER NOT NULL,
  shuffle_on_start INTEGER NOT NULL DEFAULT 1 CHECK (shuffle_on_start IN (0, 1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (jlpt_level, sequence_no),
  UNIQUE (jlpt_level, preset_code)
);

CREATE TABLE IF NOT EXISTS study_progress (
  word_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'learning', 'known')),
  know_count INTEGER NOT NULL DEFAULT 0,
  study_count INTEGER NOT NULL DEFAULT 0,
  bookmark INTEGER NOT NULL DEFAULT 0 CHECK (bookmark IN (0, 1)),
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
  source_type TEXT NOT NULL CHECK (source_type IN ('preset', 'custom_wordbook', 'manual')),
  source_ref_id TEXT,
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
  FOREIGN KEY (preset_id) REFERENCES round_presets(id) ON DELETE SET NULL
);

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

CREATE TABLE IF NOT EXISTS custom_wordbooks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_wordbook_items (
  wordbook_id TEXT NOT NULL,
  word_id TEXT NOT NULL,
  added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (wordbook_id, word_id),
  FOREIGN KEY (wordbook_id) REFERENCES custom_wordbooks(id) ON DELETE CASCADE,
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_words_level_sequence
  ON words (jlpt_level, sequence_in_level);

CREATE INDEX IF NOT EXISTS idx_words_level_block
  ON words (jlpt_level, block_index, sequence_in_level);

CREATE INDEX IF NOT EXISTS idx_words_common_life
  ON words (jlpt_level, is_common_life, sequence_in_level);

CREATE INDEX IF NOT EXISTS idx_round_presets_level_sequence
  ON round_presets (jlpt_level, sequence_no);

CREATE INDEX IF NOT EXISTS idx_study_progress_status
  ON study_progress (status, updated_at);

CREATE INDEX IF NOT EXISTS idx_study_progress_bookmark
  ON study_progress (bookmark, updated_at);

CREATE INDEX IF NOT EXISTS idx_study_sessions_active
  ON study_sessions (is_completed, started_at);

CREATE INDEX IF NOT EXISTS idx_session_queue_items_session_position
  ON session_queue_items (session_id, position);

CREATE INDEX IF NOT EXISTS idx_session_queue_items_word
  ON session_queue_items (word_id);

CREATE INDEX IF NOT EXISTS idx_custom_wordbook_items_word
  ON custom_wordbook_items (word_id);
